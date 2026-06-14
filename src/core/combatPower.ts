import type { BuffDelta, FieldValues, JobCategory, PowerResult } from './types'
import { resolveFamMult } from './familiar'

export interface CombatPowerContext {
  /** 職業分類（localStorage selectedJob） */
  jobCategory: JobCategory
  /** 完整職業名稱（selectedJobName，用於 神之子/惡魔殺手 特判） */
  jobName: string
  /** 武器套裝選擇（weaponSet select 原始值） */
  weaponSet: string
  /** 創世武器 10% 終傷勾選 */
  genesisFinalChecked: boolean
  /** 是否計入 Buff（影響 adjEmpressBless 與海外創世攻擊校正交換） */
  useBuff: boolean
  /**
   * 海外職業 + 創世武器 + useBuff 時加到 adjWeaponAtk 的校正差值
   * （= calculateWeaponCorrectionValue('genesis') - calculateWeaponCorrectionValue(resolveWeaponDataKey())）
   */
  overseasGenesisAtkDelta: number
  /** 戰鬥力係數欄位原始字串（空字串 = 使用預設，係數 1） */
  xenonPowerCoefficientRaw: string
  daPowerCoefficientRaw: string
  /** 萌獸終傷逐條來源（已解析）；有值時直接以 float32 累加，不猜測組成。 */
  famFinalSources?: number[]
}

// 空字串回傳 1（未輸入 = 不調整），與 0 的語意不同
export function powerCoefficientFactor(rawValue: string, defaultValue: number): number {
  const trimmed = String(rawValue).trim()
  if (trimmed === '') return 1
  const value = Number(trimmed)
  return Number.isFinite(value) ? value / defaultValue : 1
}

export interface FormulaStatBreakdown {
  base: number
  percent: number
  noApply: number
  total: number
}

export interface CombatFormulaInputs {
  main: FormulaStatBreakdown
  sub: FormulaStatBreakdown
  subtwo: FormulaStatBreakdown | null
  attack: FormulaStatBreakdown
  damage: number
  bossDamage: number
  critDamage: number
  rawDmgSum: number
  rawCritSum: number
  finalMult: number
  equivalentMain: number
}

/** 戰鬥力公式實際採用的校正後數值，同時供數值預覽顯示。 */
export function resolveCombatFormulaInputs(
  fields: FieldValues,
  ctx: CombatPowerContext,
  delta: FieldValues = {},
  buffDelta: BuffDelta = {},
): CombatFormulaInputs {
  const getVal = (id: string) => (fields[id] || 0) + (delta[id] || 0) + (buffDelta[id] || 0)
  const currentJob = ctx.jobCategory

  const adjEventAtk = getVal('adjEventAtk')
  const adjEventAllStat = getVal('adjEventAllStat')
  const adjEventBossDmg = getVal('adjEventBossDmg')
  const adjEventHP = getVal('adjEventHP')
  const adjMentorAtk = getVal('adjMentorAtk')
  const adjMentorBossDmg = getVal('adjMentorBossDmg')
  let adjWeaponAtk = getVal('adjWeaponAtk')
  // 海外職業：女皇祝福不計入戰鬥力（無 Buff 與含 Buff 皆 0），
  // 使「含Buff戰力增幅」在未選任何 Buff 時為 0。
  const adjEmpressBless = currentJob === 'overseas' ? 0 : getVal('adjEmpressBless')
  const adjPetAtk = getVal('adjPetAtk')

  if (currentJob === 'overseas' && ctx.useBuff && ctx.weaponSet === 'genesis') {
    adjWeaponAtk += ctx.overseasGenesisAtkDelta
  }

  const xenonStarBonus = currentJob === 'xenon' ? getVal('adjXenonStar') : 0
  const daStarBonus = currentJob === 'da' ? getVal('adjDASpStar') : 0
  const includeSecondSub = currentJob === 'xenon' || currentJob === 'dual'

  const mainPercent = getVal('percentMain') - getVal('skillPercentMain')
  const mainNoApply = getVal('noApplyMain')
  let mainBase = 0
  let mainTotal = 0
  let equivalentMain = 0

  if (currentJob === 'da') {
    const effectiveBaseMain = getVal('baseMain') + adjEventHP
    mainBase = effectiveBaseMain - getVal('skillBaseMain') + daStarBonus
    const roundedMain = Math.floor(mainBase * (1 + mainPercent / 100))
    mainTotal = roundedMain + mainNoApply
    const baseHP = getVal('adjDAHP')
    equivalentMain = baseHP / 3.5 + ((mainTotal - baseHP) / 3.5) * 0.8
  } else {
    mainBase = getVal('baseMain') + xenonStarBonus + adjEventAllStat - getVal('skillBaseMain')
    mainTotal = Math.floor(mainBase * (1 + mainPercent / 100)) + mainNoApply
    equivalentMain = mainTotal
  }

  const subBase = getVal('baseSub') + adjEventAllStat - getVal('skillBaseSub') + xenonStarBonus
  const subPercent = getVal('percentSub') - getVal('skillPercentSub')
  const subNoApply = getVal('noApplySub')
  const subTotal = Math.floor(subBase * (1 + subPercent / 100)) + subNoApply

  let subtwo: FormulaStatBreakdown | null = null
  if (includeSecondSub) {
    const base = getVal('baseSubtwo') + adjEventAllStat - getVal('skillBaseSubtwo') + xenonStarBonus
    const percent = getVal('percentSubtwo') - getVal('skillPercentSubtwo')
    const noApply = getVal('noApplySubtwo')
    subtwo = { base, percent, noApply, total: Math.floor(base * (1 + percent / 100)) + noApply }
  }

  const attackBase =
    getVal('atk') +
    adjWeaponAtk +
    adjEmpressBless +
    adjPetAtk +
    adjEventAtk -
    getVal('skillAtk') -
    adjMentorAtk
  const attackPercent = getVal('percentAtk') - getVal('skillPercentAtk')
  const attackNoApply = getVal('noApplyAtk')
  const attackTotal = Math.floor(attackBase * (1 + attackPercent / 100)) + attackNoApply

  const zeroBossDmgPenalty = ctx.jobName === '神之子' ? getVal('adjZeroWeaponFlameBossDmg') : 0
  const damage = getVal('dmg') - getVal('skillDmg')
  const bossDamage =
    getVal('bossDmg') +
    adjEventBossDmg -
    adjMentorBossDmg -
    zeroBossDmgPenalty -
    getVal('skillBossDmg')
  const critDamage = getVal('critDmg') - getVal('skillCritDmg')
  const rawDmgSum = 1 + (damage + bossDamage) / 100
  const rawCritSum = 1.35 + critDamage / 100

  const genesisMult = ctx.genesisFinalChecked ? 1.1 : 1.0
  const ruinMult =
    currentJob === 'da' || ctx.jobName === '惡魔殺手' ? 1 + getVal('ruinFinal') / 100 : 1
  const famMult = resolveFamMult(ctx.famFinalSources, getVal('famFinal'))

  return {
    main: { base: mainBase, percent: mainPercent, noApply: mainNoApply, total: mainTotal },
    sub: { base: subBase, percent: subPercent, noApply: subNoApply, total: subTotal },
    subtwo,
    attack: {
      base: attackBase,
      percent: attackPercent,
      noApply: attackNoApply,
      total: attackTotal,
    },
    damage,
    bossDamage,
    critDamage,
    rawDmgSum,
    rawCritSum,
    finalMult: genesisMult * famMult * ruinMult,
    equivalentMain,
  }
}

/**
 * 戰鬥力主公式。
 * fields/delta/buffDelta 三者為獨立加項（getVal = fields + delta + buffDelta）。
 */
export function calculatePower(
  fields: FieldValues,
  ctx: CombatPowerContext,
  delta: FieldValues = {},
  buffDelta: BuffDelta = {},
): PowerResult {
  const currentJob = ctx.jobCategory
  const resolved = resolveCombatFormulaInputs(fields, ctx, delta, buffDelta)
  const combatSubtwo = resolved.subtwo?.total || 0
  const commonMultiplier =
    (resolved.attack.total * resolved.rawDmgSum * resolved.rawCritSum * resolved.finalMult) / 100

  if (currentJob === 'xenon') {
    const baseStatSum = resolved.main.total + resolved.sub.total + combatSubtwo
    const factor = powerCoefficientFactor(ctx.xenonPowerCoefficientRaw, 0.74375)
    const powerHigh = Math.floor(2.625 * baseStatSum * commonMultiplier * factor)
    const powerLow = Math.floor(2.975 * baseStatSum * commonMultiplier * factor)

    return { type: 'range', high: powerHigh, low: powerLow }
  } else if (currentJob === 'da') {
    const factor = powerCoefficientFactor(ctx.daPowerCoefficientRaw, 0.75)
    const powerHigh = Math.floor(
      0.85 *
        (resolved.equivalentMain + resolved.sub.total + combatSubtwo) *
        commonMultiplier *
        factor,
    )
    const powerLow = Math.floor(
      0.75 *
        (resolved.equivalentMain + resolved.sub.total + combatSubtwo) *
        commonMultiplier *
        factor,
    )

    return { type: 'range', high: powerHigh, low: powerLow }
  } else {
    const powerNormal = Math.floor(
      (4 * resolved.main.total + resolved.sub.total + combatSubtwo) * commonMultiplier,
    )
    return { type: 'single', value: powerNormal }
  }
}

/** 從戰鬥力結果取單一代表值（range 職業取低戰力） */
export function powerValue(result: PowerResult | null | undefined): number {
  if (!result) return 0
  return result.type === 'range' ? result.low : result.value
}
