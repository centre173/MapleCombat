// Store 整合測試：黃金值情境經由 applySaveData 餵入 store，
// 驗證「持久化 → 衍生欄位（武器校正）→ 計算」整條管線與舊版一致。
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useCharacterStore } from '@/stores/character'
import { useBuffsStore } from '@/stores/buffs'
import { useUiStore } from '@/stores/ui'
import { useStateSlotsStore } from '@/stores/stateSlots'
import { fieldDefs } from '@/constants/fields'
import { calculateWeightedSummary, weightedPercentGain } from '@/core/weightedStates'
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
    expect(exported.version).toBe(2)
    expect(exported.selectedJob).toBe(s.selectedJob)
    expect(exported.selectedJobName).toBe(s.selectedJobName)
    expect(exported.effSelectedJob).toBe(s.effSelectedJob)
    expect(exported.workspace).toBeTruthy()

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

describe('compact 五狀態 workspace', () => {
  it('切換狀態時保留共用戰鬥力資料，切換實戰資料與靈魂寶珠', () => {
    const store = useCharacterStore()
    const buffs = useBuffsStore()

    store.setField('baseMain', '11111')
    store.setField('effBaseMain', '22222')
    buffs.setSoulOrbValue(77)

    store.activateWorkspaceSlot('state2')
    expect(store.fields.baseMain).toBe('11111')
    expect(store.fields.effBaseMain).not.toBe('22222')
    expect(buffs.soulOrb.value).toBe(0)

    store.setField('effBaseMain', '33333')
    buffs.setSoulOrbValue(88)

    store.activateWorkspaceSlot('state1')
    expect(store.fields.baseMain).toBe('11111')
    expect(store.fields.effBaseMain).toBe('22222')
    expect(buffs.soulOrb.value).toBe(77)

    store.activateWorkspaceSlot('state2')
    expect(store.fields.baseMain).toBe('11111')
    expect(store.fields.effBaseMain).toBe('33333')
    expect(buffs.soulOrb.value).toBe(88)
  })

  it('切換狀態時不清空裝備變更與數值換算的加權頁共用欄位', () => {
    const store = useCharacterStore()

    store.setField('eqOldAtk', '123')
    store.setField('eqNewAtk', '456')
    store.setField('effUnitAtk', '7')
    store.setField('effSelectedMetric1', 'atk')
    store.setField('effShowCombatGain', true)

    store.activateWorkspaceSlot('state2')
    expect(store.fields.eqOldAtk).toBe('123')
    expect(store.fields.eqNewAtk).toBe('456')
    expect(store.fields.effUnitAtk).toBe('7')
    expect(store.fields.effSelectedMetric1).toBe('atk')
    expect(store.fields.effShowCombatGain).toBe(true)

    store.activateWorkspaceSlot('state1')
    expect(store.fields.eqOldAtk).toBe('123')
    expect(store.fields.eqNewAtk).toBe('456')
    expect(store.fields.effUnitAtk).toBe('7')
    expect(store.fields.effSelectedMetric1).toBe('atk')
    expect(store.fields.effShowCombatGain).toBe(true)
  })

  it('套用其他狀態與重設目前狀態後可直接 reload 畫面資料', () => {
    const store = useCharacterStore()
    const buffs = useBuffsStore()
    const slots = useStateSlotsStore()

    store.setField('effBaseMain', '11111')
    buffs.setSoulOrbValue(77)

    store.activateWorkspaceSlot('state2')
    store.setField('effBaseMain', '22222')
    buffs.setSoulOrbValue(88)

    slots.copyState('state1', 'state2')
    store.reloadWorkspaceSlot('state2')
    expect(store.fields.effBaseMain).toBe('11111')
    expect(buffs.soulOrb.value).toBe(77)

    slots.resetState('state2')
    store.reloadWorkspaceSlot('state2')
    expect(store.fields.effBaseMain).toBe(slots.fieldDefault('effBaseMain'))
    expect(buffs.soulOrb.value).toBe(0)
  })

  it('狀態名稱限制與權重 fallback 資料可保存', () => {
    const store = useCharacterStore()
    const slots = useStateSlotsStore()

    slots.renameState('state1', '很長很長很長很長的狀態名稱')
    expect(slots.workspace.states[0].name.length).toBeLessThanOrEqual(12)

    slots.setWeight('state1', 0)
    slots.setWeight('state2', 0)
    slots.setWeight('state3', 0)
    slots.setWeight('state4', 0)
    slots.setWeight('state5', 0)

    const exported = store.collectSaveData()
    expect(exported.workspace?.weighted.weights.state1).toBe(0)
  })

  it('加權裝備變更實際增幅使用裝備變更基準，不誤用含 Buff 實際增幅', () => {
    const s = scenarios.find((x) => x.name === 'buffs-custom-hero')!
    const store = useCharacterStore()
    const buffs = useBuffsStore()
    const slots = useStateSlotsStore()

    store.applySaveData(toSaveData(s))
    fieldDefs
      .filter((def) => def.id.startsWith('eqOld') || def.id.startsWith('eqNew'))
      .forEach((def) => store.setField(def.id, ''))

    const summary = calculateWeightedSummary(slots.workspace, buffs.table)
    expect(summary.actualBuffGain).not.toBe(0)
    expect(summary.equipmentBattleGain).toBe(0)
    expect(summary.equipmentActualGain).toBe(0)
  })

  it('原輸出占比加權會先算各狀態增幅，不會先合併輸出再算總增幅', () => {
    const s = scenarios.find((x) => x.name === 'buffs-custom-hero')!
    const store = useCharacterStore()
    const buffs = useBuffsStore()
    const slots = useStateSlotsStore()

    store.applySaveData(toSaveData(s))
    slots.copyState('state1', 'state2')
    slots.setWeight('state1', 40)
    slots.setWeight('state2', 60)

    store.activateWorkspaceSlot('state2')
    store.setField('effAtk', '18000000')
    buffs.setSoulOrbValue(0)

    const summary = calculateWeightedSummary(slots.workspace, buffs.table)
    const activeSlots = summary.slots.filter((slot) => slot.weight > 0)
    const manual = activeSlots.reduce(
      (sum, slot) =>
        sum + (slot.weight / 100) * ((slot.effOutputWithBuff - slot.effOutputNoBuff) / slot.effOutputNoBuff) * 100,
      0,
    )
    const aggregateBefore = activeSlots.reduce(
      (sum, slot) => sum + (slot.weight / 100) * slot.effOutputNoBuff,
      0,
    )
    const aggregateAfter = activeSlots.reduce(
      (sum, slot) => sum + (slot.weight / 100) * slot.effOutputWithBuff,
      0,
    )
    const oldAggregateGain = ((aggregateAfter - aggregateBefore) / aggregateBefore) * 100

    expect(summary.effectiveWeights.state1).toBe(40)
    expect(summary.effectiveWeights.state2).toBe(60)
    expect(summary.actualBuffGain).toBeCloseTo(manual, 8)
    expect(summary.actualBuffGain).not.toBeCloseTo(oldAggregateGain, 6)
  })

  it('原輸出占比總和不是 100 時會正規化，全部為 0 時 fallback 到狀態1', () => {
    const s = scenarios.find((x) => x.name === 'buffs-custom-hero')!
    const store = useCharacterStore()
    const buffs = useBuffsStore()
    const slots = useStateSlotsStore()

    store.applySaveData(toSaveData(s))
    slots.setWeight('state1', 40)
    slots.setWeight('state2', 40)

    let summary = calculateWeightedSummary(slots.workspace, buffs.table)
    expect(summary.usedFallbackWeights).toBe(false)
    expect(summary.effectiveWeights.state1).toBe(50)
    expect(summary.effectiveWeights.state2).toBe(50)

    slots.setWeight('state1', 0)
    slots.setWeight('state2', 0)
    slots.setWeight('state3', 0)
    slots.setWeight('state4', 0)
    slots.setWeight('state5', 0)

    summary = calculateWeightedSummary(slots.workspace, buffs.table)
    expect(summary.usedFallbackWeights).toBe(true)
    expect(summary.effectiveWeights.state1).toBe(100)
    expect(summary.effectiveWeights.state2).toBe(0)
  })

  it('數值換算使用各狀態增幅的占比平均', () => {
    expect(
      weightedPercentGain([
        { share: 50, before: 100, after: 150 },
        { share: 50, before: 100, after: 133.33333333333331 },
      ]),
    ).toBeCloseTo(41.66666666666666, 10)
  })

  it('加權含 Buff 戰力副標使用正規化占比後的含 Buff 戰力', () => {
    const s = scenarios.find((x) => x.name === 'buffs-custom-hero')!
    const store = useCharacterStore()
    const buffs = useBuffsStore()
    const slots = useStateSlotsStore()

    store.applySaveData(toSaveData(s))
    slots.copyState('state1', 'state2')
    slots.setWeight('state1', 40)
    slots.setWeight('state2', 40)

    const summary = calculateWeightedSummary(slots.workspace, buffs.table)
    const expected = summary.slots.reduce(
      (sum, slot) => sum + (slot.weight / 100) * store.powerValue(slot.powerWithBuff),
      0,
    )
    expect(summary.effectiveWeights.state1).toBe(50)
    expect(summary.effectiveWeights.state2).toBe(50)
    expect(summary.combatBuffPower).toBeCloseTo(expected, 3)
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
