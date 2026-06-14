import type { JobCategory, WeaponDatabase, WeaponSetKey } from './types'
import { weaponDatabase, zeroWeaponDatabase } from '@/data/weapons'

export interface WeaponCorrectionInput {
  /** 武器套裝選擇（weaponSet select 的值） */
  weaponSet: string
  /** 火花等級 0~7（flameLevel select 的值） */
  flameLevel: number
  /** 卷軸攻擊力（scrollAtk input） */
  scrollAtk: number
  /** 目標星力 0~25（starCount input） */
  starCount: number
  /** 當前武器攻擊力（currentWeaponAtk input） */
  currentWeaponAtk: number
  jobCategory: JobCategory
  /** 是否為神之子（使用 ZeroweaponDatabase） */
  isZeroJob: boolean
}

export function getWeaponCorrectionDatabase(isZeroJob: boolean): WeaponDatabase {
  return isZeroJob ? zeroWeaponDatabase : weaponDatabase
}

// 攻擊校正所使用的武器資料 key。
// 海外職業遊戲 Bug：創世武器的「攻擊校正」會以神秘武器(arcane)基準計算
// （劍豪 / 陰陽師 / 琳恩 / 墨玄 皆同；星力/星火等級/卷軸/總攻仍沿用使用者輸入，
//  創世 10% 終傷由 genesisFinalCheck 另外套用）。
export function resolveWeaponDataKey(input: {
  weaponSet: string
  jobCategory: JobCategory
  isZeroJob: boolean
}): WeaponSetKey {
  const db = getWeaponCorrectionDatabase(input.isZeroJob)
  const setKey = (db[input.weaponSet as WeaponSetKey] ? input.weaponSet : 'fortune') as WeaponSetKey
  if (input.jobCategory === 'overseas' && setKey === 'genesis') return 'arcane'
  return setKey
}

/** 武器攻擊校正值（= 校正後總攻 - 當前武器攻擊） */
export function calculateWeaponCorrectionValue(
  setKey: WeaponSetKey,
  input: WeaponCorrectionInput,
): number {
  const setData = getWeaponCorrectionDatabase(input.isZeroJob)[setKey]
  if (!setData) return 0
  const fLevel = input.flameLevel || 0
  const flameAtk = setData.flames[fLevel] || 0
  const baseAtk = setData.base || 0
  const scrollAtk = input.scrollAtk || 0
  const targetStar = input.starCount || 0

  let currentAtk = baseAtk + scrollAtk + flameAtk
  const initialAtk = currentAtk
  let starAtkBonus = 0

  for (let star = 1; star <= 25; star++) {
    let gain = 0
    if (star <= 15) {
      const calcBase = currentAtk - flameAtk
      gain = Math.floor(calcBase / 50) + 1
    } else {
      gain = (star <= 24 ? setData.stars16_24[star - 16] : setData.stars16_24[8]) || 0
    }
    currentAtk += gain
    if (star <= targetStar) starAtkBonus += gain
  }

  return initialAtk + starAtkBonus - (input.currentWeaponAtk || 0)
}

export interface WeaponCorrectionResult {
  /** 套裝基礎攻擊（回填 baseAtk 欄位） */
  baseAtk: number
  /** 校正後武器總攻（提示框顯示用） */
  totalAtk: number
  /** 攻擊校正值（回填 adjWeaponAtk 欄位） */
  correction: number
}

/** 武器校正的純計算部分（DOM 回寫由 store 處理） */
export function runWeaponCorrection(input: WeaponCorrectionInput): WeaponCorrectionResult {
  const setKey = resolveWeaponDataKey(input)
  const setData = getWeaponCorrectionDatabase(input.isZeroJob)[setKey]
  const correction = calculateWeaponCorrectionValue(setKey, input)
  const totalAtk = correction + (input.currentWeaponAtk || 0)
  return { baseAtk: setData.base || 0, totalAtk, correction }
}
