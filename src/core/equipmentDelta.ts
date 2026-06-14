import type { FieldValues, JobCategory } from './types'

// 裝備變更欄位對照（target 欄位 ← eqNew/eqOld 後綴）
const EQUIPMENT_DELTA_FIELDS: ReadonlyArray<readonly [string, string]> = [
  ['baseMain', 'BaseMain'],
  ['percentMain', 'PercentMain'],
  ['noApplyMain', 'NoApplyMain'],
  ['baseSub', 'BaseSub'],
  ['percentSub', 'PercentSub'],
  ['noApplySub', 'NoApplySub'],
  ['baseSubtwo', 'BaseSubtwo'],
  ['percentSubtwo', 'PercentSubtwo'],
  ['noApplySubtwo', 'NoApplySubtwo'],
  ['atk', 'Atk'],
  ['percentAtk', 'PercentAtk'],
  ['dmg', 'Dmg'],
  ['bossDmg', 'BossDmg'],
  ['critDmg', 'CritDmg'],
  ['famFinal', 'FamFinal'],
]

/** 裝備 delta：eqNew* - eqOld* 差值，全屬依職業分配 */
export function getEquipmentDelta(fields: FieldValues, jobCategory: JobCategory): FieldValues {
  const getVal = (id: string) => fields[id] || 0
  const delta: FieldValues = {}
  EQUIPMENT_DELTA_FIELDS.forEach(([target, suffix]) => {
    delta[target] = getVal(`eqNew${suffix}`) - getVal(`eqOld${suffix}`)
  })

  // 全屬 / 全屬%：惡魔復仇者只視為副屬；其餘職業併入主屬與副屬。
  const isDA = jobCategory === 'da'
  const includeSecondSub = jobCategory === 'xenon' || jobCategory === 'dual'
  const allStatDelta = getVal('eqNewAllStat') - getVal('eqOldAllStat')
  const allStatPercentDelta = getVal('eqNewAllStatPercent') - getVal('eqOldAllStatPercent')
  if (!isDA) {
    delta.baseMain += allStatDelta
    delta.percentMain += allStatPercentDelta
  }
  delta.baseSub += allStatDelta
  delta.percentSub += allStatPercentDelta
  if (includeSecondSub) {
    delta.baseSubtwo += allStatDelta
    delta.percentSubtwo += allStatPercentDelta
  }

  return delta
}

/** 轉成 eff* 欄位 delta，並計算裝備無視防禦乘法因子 */
export function getEquipmentActualDelta(
  fields: FieldValues,
  jobCategory: JobCategory,
): FieldValues {
  const equipmentDelta = getEquipmentDelta(fields, jobCategory)
  const getVal = (id: string) => fields[id] || 0
  // 無視防禦對戰鬥力無影響，僅影響實戰輸出，故只在此併入。
  // 無視防禦率為乘法堆疊（非加總）：殘存防禦透過率 ×= (1-新)/(1-舊)。
  // 例：基礎99% 換上 +20% 裝備 → 1-(1-99%)×(1-20%)=99.2%，而非 99%+20%。
  const eqOldIgnore = getVal('eqOldIgnoreDefense')
  const eqNewIgnore = getVal('eqNewIgnoreDefense')
  const oldResidual = 1 - eqOldIgnore / 100
  const eqIgnoreResidualFactor = oldResidual !== 0 ? (1 - eqNewIgnore / 100) / oldResidual : 0
  return {
    effBaseMain: equipmentDelta.baseMain || 0,
    effPercentMain: equipmentDelta.percentMain || 0,
    effNoApplyMain: equipmentDelta.noApplyMain || 0,
    effBaseSub: equipmentDelta.baseSub || 0,
    effPercentSub: equipmentDelta.percentSub || 0,
    effNoApplySub: equipmentDelta.noApplySub || 0,
    effBaseSubtwo: equipmentDelta.baseSubtwo || 0,
    effPercentSubtwo: equipmentDelta.percentSubtwo || 0,
    effNoApplySubtwo: equipmentDelta.noApplySubtwo || 0,
    effAtk: equipmentDelta.atk || 0,
    effPercentAtk: equipmentDelta.percentAtk || 0,
    effDmg: equipmentDelta.dmg || 0,
    effBossDmg: equipmentDelta.bossDmg || 0,
    effCritDmg: equipmentDelta.critDmg || 0,
    effFamFinal: equipmentDelta.famFinal || 0,
    __eqIgnoreResidualFactor: eqIgnoreResidualFactor,
  }
}

/** 將實戰資料欄位 id 轉成戰鬥力公式的 delta key（effBaseMain -> baseMain） */
export function effFieldToCombatKey(effFieldId: string): string {
  const stripped = String(effFieldId).replace(/^eff/, '')
  return stripped.charAt(0).toLowerCase() + stripped.slice(1)
}
