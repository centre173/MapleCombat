// Store 整合測試：黃金值情境經由 applySaveData 餵入 store，
// 驗證「持久化 → 衍生欄位（武器校正）→ 計算」整條管線與舊版一致。
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useCharacterStore } from '@/stores/character'
import { useBuffsStore } from '@/stores/buffs'
import { useUiStore } from '@/stores/ui'
import { parseImportedData, normalizeSavedData } from '@/services/saveData'
import golden from './fixtures/golden.json'

interface GoldenScenario {
  name: string
  selectedJob: string
  selectedJobName: string
  effSelectedJob: string
  inputs: Record<string, string | boolean>
  buffState: {
    master: boolean
    levels: Record<string, number>
    soulOrb: { value: number; stat: string }
  }
  outputs: Record<string, unknown>
}

const scenarios = golden.scenarios as unknown as GoldenScenario[]

function toSaveData(s: GoldenScenario) {
  return {
    app: 'maplecombat',
    version: 1,
    selectedJob: s.selectedJob,
    selectedJobName: s.selectedJobName,
    effSelectedJob: s.effSelectedJob,
    values: s.inputs,
    buffState: s.buffState,
  }
}

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
})

describe('character store 黃金值整合', () => {
  it.each(scenarios)('$name：store 計算結果與舊版一致', (s) => {
    const store = useCharacterStore()
    store.applySaveData(toSaveData(s))

    expect(store.powerNoBuff).toEqual(s.outputs.powerNoBuff)
    expect(store.powerWithBuff).toEqual(s.outputs.powerWithBuff)
    expect(store.effOutputWithBuff).toBe(s.outputs.effOutputWithBuff)
    expect(store.equipmentChangedPower).toEqual(s.outputs.powerWithEquipDelta)
    expect(store.weaponCorrection.correction).toBe(Number(s.outputs.adjWeaponAtk))
    expect(store.weaponCorrection.baseAtk).toBe(Number(s.outputs.baseAtk))
    expect(store.statLabels).toEqual(s.outputs.statLabels)
  })
})

describe('匯出/匯入 round-trip', () => {
  it('applySaveData → collectSaveData 保留全部欄位與 buff 狀態', () => {
    const s = scenarios.find((x) => x.name === 'buffs-custom-hero')!
    const store = useCharacterStore()
    store.applySaveData(toSaveData(s))

    const exported = store.collectSaveData()
    expect(exported.app).toBe('maplecombat')
    expect(exported.version).toBe(1)
    expect(exported.selectedJob).toBe(s.selectedJob)
    expect(exported.selectedJobName).toBe(s.selectedJobName)
    expect(exported.effSelectedJob).toBe(s.effSelectedJob)

    // 再匯入一次，計算結果不變
    localStorage.clear()
    setActivePinia(createPinia())
    const store2 = useCharacterStore()
    store2.applySaveData(exported)
    expect(store2.powerNoBuff).toEqual(s.outputs.powerNoBuff)
    expect(store2.powerWithBuff).toEqual(s.outputs.powerWithBuff)
    expect(useBuffsStore().collectState().levels).toEqual(exported.buffState!.levels)
  })

  it('v0 扁平格式可匯入', () => {
    const s = scenarios[0]
    const flat: Record<string, unknown> = {
      selectedJob: s.selectedJob,
      selectedJobName: s.selectedJobName,
      ...s.inputs,
    }
    const store = useCharacterStore()
    store.applySaveData(flat)
    expect(store.selectedJobName).toBe(s.selectedJobName)
    // v0 無 buffState：buff 維持預設，與黃金值 powerNoBuff（不含 buff）一致
    expect(store.powerNoBuff).toEqual(s.outputs.powerNoBuff)
  })
})

describe('parseImportedData / normalizeSavedData', () => {
  it('剝除 BOM 與 ```json 圍欄', () => {
    const json = '{"selectedJob":"normal","values":{"baseMain":"100"}}'
    expect(parseImportedData('﻿' + json)).toEqual(JSON.parse(json))
    expect(parseImportedData('```json\n' + json + '\n```')).toEqual(JSON.parse(json))
    expect(parseImportedData('前置雜訊 ' + json + ' 後置')).toEqual(JSON.parse(json))
  })

  it('無法解析時擲出錯誤', () => {
    expect(() => normalizeSavedData(null)).toThrow()
    expect(() => normalizeSavedData({ unknownKey: 1 })).toThrow()
  })

  it('select 匯入非法值會被忽略', () => {
    const store = useCharacterStore()
    const before = store.fields.weaponSet
    store.applySaveData({ selectedJob: 'normal', values: { weaponSet: 'bogus', baseMain: '5' } })
    expect(store.fields.weaponSet).toBe(before)
    expect(store.fields.baseMain).toBe('5')
  })
})

describe('per-key localStorage 持久化', () => {
  it('setField 寫入舊鍵名；重建 store 後還原', () => {
    const store = useCharacterStore()
    store.setField('baseMain', '12345')
    expect(localStorage.getItem('baseMain')).toBe('12345')

    setActivePinia(createPinia())
    const store2 = useCharacterStore()
    expect(store2.fields.baseMain).toBe('12345')
  })

  it('weaponSet 變更回填卷軸/星力預設並同步創世終傷', () => {
    const store = useCharacterStore()
    store.setField('weaponSet', 'arcane')
    expect(store.fields.scrollAtk).toBe('0')
    expect(store.fields.genesisFinalCheck).toBe(false)

    store.setField('weaponSet', 'genesis')
    expect(store.fields.scrollAtk).toBe('72')
    expect(store.fields.starCount).toBe('22')
    expect(store.fields.genesisFinalCheck).toBe(true)
  })

  it('migrateCorrectedDefaults：傑諾係數錯字修正與預設回填', () => {
    localStorage.setItem('adjXenonPowerCoefficient', '0.74735')
    localStorage.setItem('currentWeaponAtk', '0')
    localStorage.setItem('effMonsterDefense', '300')
    const store = useCharacterStore()
    expect(store.fields.adjXenonPowerCoefficient).toBe('0.74375')
    expect(store.fields.currentWeaponAtk).toBe('')
    expect(store.fields.effMonsterDefense).toBe('380')
    expect(store.fields.adjEmpressBless).toBe('30')
  })
})

describe('ui store', () => {
  it('視圖/模式持久化與舊 id 遷移', () => {
    localStorage.setItem('activeView', 'equipment')
    let ui = useUiStore()
    expect(ui.activeView).toBe('valueConversion')

    localStorage.setItem('activeView', 'apiImport')
    setActivePinia(createPinia())
    ui = useUiStore()
    expect(ui.activeView).toBe('characterInput')

    ui.activeView = 'equipmentChange'
    expect(localStorage.getItem('activeView')).toBe('equipmentChange')
  })
})

describe('跨模式複製', () => {
  it('copyCombatDataToEff 對應欄位複製', () => {
    const store = useCharacterStore()
    store.setField('baseMain', '777')
    store.setField('adjDAHP', '999')
    store.copyCombatDataToEff()
    expect(store.fields.effBaseMain).toBe('777')
    expect(store.fields.effBaseHP).toBe('999')
  })
})
