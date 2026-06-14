// per-key localStorage 持久化：鍵名 = 欄位 id（== storage key），
// 讓同網域舊資料直接沿用，匯出 values 天然相容。
import type { FieldDef } from '@/constants/fields'

/** 一次性預設修正/遷移 */
export function runStorageMigrations(): void {
  // 效率面板預設（V2）
  if (localStorage.getItem('effDefaultPanelsV2') !== 'true') {
    localStorage.setItem(
      'effCustomMetricKeys',
      'baseMain,percentMain,allStatPercent,atk,percentAtk,dmg,critDmg',
    )
    localStorage.setItem('effMetricPanelOpen1', 'true')
    localStorage.setItem('effMetricPanelOpen2', 'true')
    localStorage.setItem('effMetricPanelOpen3', 'true')
    localStorage.setItem('effDefaultPanelsV2', 'true')
  }

  // 傑諾戰鬥力係數錯字修正
  if (localStorage.getItem('adjXenonPowerCoefficient') === '0.74735') {
    localStorage.setItem('adjXenonPowerCoefficient', '0.74375')
  }
  const defaultSavedValues: Record<string, string> = {
    adjEmpressBless: '30',
    adjXenonStar: '70',
    adjMentorBossDmg: '10',
    adjMentorAtk: '10',
    adjPetAtk: '0',
  }
  Object.entries(defaultSavedValues).forEach(([id, value]) => {
    const savedValue = localStorage.getItem(id)
    if (savedValue === null || savedValue === '') {
      localStorage.setItem(id, value)
    }
  })
  if (localStorage.getItem('currentWeaponAtk') === '0') {
    localStorage.setItem('currentWeaponAtk', '')
  }
  const savedMonsterDefense = localStorage.getItem('effMonsterDefense')
  if (savedMonsterDefense === null || savedMonsterDefense === '' || savedMonsterDefense === '300') {
    localStorage.setItem('effMonsterDefense', '380')
  }
}

/** 自 localStorage 還原單一欄位值（無存檔則用預設） */
export function hydrateField(def: FieldDef): string | boolean {
  const saved = localStorage.getItem(def.id)
  if (saved === null) return def.default
  if (def.kind === 'checkbox') return saved === 'true'
  if (def.kind === 'select' && def.options && !def.options.includes(saved)) return def.default
  return saved
}

export function persistField(id: string, value: string | boolean): void {
  localStorage.setItem(id, String(value))
}

export function getStoredString(key: string, fallback: string): string {
  const saved = localStorage.getItem(key)
  return saved === null ? fallback : saved
}
