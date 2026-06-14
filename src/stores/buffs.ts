import { defineStore } from 'pinia'
import { computed, reactive, watch } from 'vue'
import { parseBuffTable } from '@/core/buffs/parse'
import {
  EXCLUSIVE_BUFF_GROUPS,
  PASS_SKILL_MAX,
  SOUL_ORB_STATS,
  clampBuffLevel,
  defaultBuffState,
  emptyBuffState,
  type BuffState,
  type SoulOrbState,
} from '@/core/buffs/delta'
import { buffTableText } from '@/data/buffSource'

export interface BuffExportState {
  master: boolean
  levels: BuffState
  soulOrb: SoulOrbState
}

const PREFERRED_LEVELS_KEY = 'buffPreferredLevels'

function isValidSoulOrbStat(stat: unknown): stat is string {
  return SOUL_ORB_STATS.some(([key]) => key === stat)
}

export const useBuffsStore = defineStore('buffs', () => {
  const table = parseBuffTable(buffTableText)

  // 還原狀態：預設 → 套用 localStorage
  const state = reactive<BuffState>(defaultBuffState(table))
  try {
    const raw = localStorage.getItem('buffState')
    if (raw) {
      const saved = JSON.parse(raw) as Record<string, unknown>
      for (const id in saved) {
        if (Object.prototype.hasOwnProperty.call(state, id)) {
          state[id] = clampBuffLevel(table.buffIndex[id], saved[id])
        }
      }
    }
  } catch {
    /* ignore */
  }

  /** 互斥規則：changedId 啟用時，同組其他項全部取消 */
  function enforceExclusive(changedId: string): void {
    if ((state[changedId] || 0) <= 0) return
    const group = EXCLUSIVE_BUFF_GROUPS.find((g) => g.includes(changedId))
    if (!group) return
    group.forEach((id) => {
      if (id !== changedId && (state[id] || 0) > 0) state[id] = 0
    })
  }

  /** 傳授技能上限：id 由 0 轉啟用且已達上限時拒絕（回傳 true = 超限） */
  function exceedsPassLimit(id: string, next: number): boolean {
    if (!id.startsWith('pass:') || next <= 0 || (state[id] || 0) > 0) return false
    let count = 0
    for (const key in state) {
      if (key !== id && key.startsWith('pass:') && (state[key] || 0) > 0) count++
    }
    return count >= PASS_SKILL_MAX
  }

  /** 還原/匯入後清理：互斥組保留表序最先者；傳授技能依表序保留前 13 個 */
  function sanitizeState(): void {
    EXCLUSIVE_BUFF_GROUPS.forEach((group) => {
      let kept = false
      group.forEach((id) => {
        if ((state[id] || 0) > 0) {
          if (kept) state[id] = 0
          else kept = true
        }
      })
    })
    let passCount = 0
    table.categories.forEach((cat) =>
      cat.buffs.forEach((buff) => {
        if (!buff.id.startsWith('pass:') || (state[buff.id] || 0) <= 0) return
        passCount++
        if (passCount > PASS_SKILL_MAX) state[buff.id] = 0
      }),
    )
  }
  sanitizeState()

  // 等級偏好與啟用狀態分開保存；「全部清除」只關閉 Buff，不忘記使用者選過的等級。
  const preferredLevels = reactive<BuffState>({})
  let savedPreferredLevels: Record<string, unknown> = {}
  try {
    savedPreferredLevels = JSON.parse(localStorage.getItem(PREFERRED_LEVELS_KEY) || '{}') as Record<
      string,
      unknown
    >
  } catch {
    /* ignore */
  }
  table.categories.forEach((category) =>
    category.buffs.forEach((buff) => {
      if (buff.type !== 'level') return
      const legacyQuickLevel = Number(localStorage.getItem(`quickBuffLevel:${buff.id}`))
      const fallbackLevel = Math.min(4, buff.maxLevel || 1)
      const candidates = [
        Number(savedPreferredLevels[buff.id]),
        legacyQuickLevel,
        state[buff.id],
        buff.defaultLevel,
        fallbackLevel,
      ]
      preferredLevels[buff.id] =
        candidates.find((level) => level > 0 && buff.levelKeys.includes(level)) ?? buff.minLevel
    }),
  )

  const soulOrb = reactive<SoulOrbState>({ value: 0, stat: 'percentStr' })
  try {
    const saved = JSON.parse(localStorage.getItem('buffSoulOrb') || '{}') as Partial<SoulOrbState>
    soulOrb.value = Math.max(0, Number(saved.value) || 0)
    soulOrb.stat = isValidSoulOrbStat(saved.stat) ? saved.stat : 'percentStr'
  } catch {
    /* ignore */
  }

  watch(state, () => localStorage.setItem('buffState', JSON.stringify(state)), { deep: true })
  watch(
    preferredLevels,
    () => localStorage.setItem(PREFERRED_LEVELS_KEY, JSON.stringify(preferredLevels)),
    { deep: true },
  )
  watch(soulOrb, () => localStorage.setItem('buffSoulOrb', JSON.stringify(soulOrb)), { deep: true })

  const matchesDefault = computed(() => {
    const defaults = defaultBuffState(table)
    for (const id in defaults) {
      if ((state[id] || 0) !== defaults[id]) return false
    }
    return true
  })

  function rememberPreferredLevel(id: string, level: number): void {
    const buff = table.buffIndex[id]
    if (buff?.type === 'level' && level > 0 && buff.levelKeys.includes(level)) {
      preferredLevels[id] = level
    }
  }

  function preferredLevel(id: string): number {
    const activeLevel = state[id] || 0
    return activeLevel > 0 ? activeLevel : preferredLevels[id] || 0
  }

  function setLevel(id: string, raw: unknown): void {
    const next = clampBuffLevel(table.buffIndex[id], raw)
    state[id] = exceedsPassLimit(id, next) ? 0 : next
    rememberPreferredLevel(id, state[id])
    enforceExclusive(id)
  }

  function setLevelUnclamped(id: string, raw: number): void {
    // 輸入途中允許暫時值（blur 時再 clamp），但仍夾在 0~max
    const buff = table.buffIndex[id]
    if (!buff) return
    const next = Math.max(0, Math.min(buff.maxLevel, raw))
    state[id] = exceedsPassLimit(id, next) ? 0 : next
    rememberPreferredLevel(id, state[id])
    enforceExclusive(id)
  }

  function toggle(id: string): void {
    const next = (state[id] || 0) > 0 ? 0 : 1
    state[id] = exceedsPassLimit(id, next) ? 0 : next
    enforceExclusive(id)
  }

  function resetDefaults(): void {
    Object.assign(state, defaultBuffState(table))
    for (const id in state) rememberPreferredLevel(id, state[id])
  }

  function clearAll(): void {
    Object.assign(state, emptyBuffState(table))
  }

  function setSoulOrbValue(value: number): void {
    soulOrb.value = Number.isFinite(value) ? Math.max(0, value) : 0
  }

  function setSoulOrbStat(stat: string): void {
    soulOrb.stat = isValidSoulOrbStat(stat) ? stat : 'percentStr'
  }

  /** 匯出用狀態 */
  function collectState(): BuffExportState {
    return { master: true, levels: { ...state }, soulOrb: { ...soulOrb } }
  }

  /** 匯入用還原 */
  function applyState(data: unknown): void {
    if (!data || typeof data !== 'object') return
    const obj = data as Record<string, unknown>
    const lv = (obj.levels && typeof obj.levels === 'object' ? obj.levels : obj) as Record<
      string,
      unknown
    >
    if (obj.soulOrb && typeof obj.soulOrb === 'object') {
      const orb = obj.soulOrb as Partial<SoulOrbState>
      soulOrb.value = Math.max(0, Number(orb.value) || 0)
      soulOrb.stat = isValidSoulOrbStat(orb.stat) ? orb.stat : 'percentStr'
    }
    if (lv && typeof lv === 'object') {
      for (const id in lv) {
        if (Object.prototype.hasOwnProperty.call(state, id)) {
          state[id] = clampBuffLevel(table.buffIndex[id], lv[id])
        }
      }
      sanitizeState()
      for (const id in state) rememberPreferredLevel(id, state[id])
    }
  }

  return {
    table,
    state,
    soulOrb,
    matchesDefault,
    preferredLevel,
    rememberPreferredLevel,
    setLevel,
    setLevelUnclamped,
    toggle,
    resetDefaults,
    clearAll,
    setSoulOrbValue,
    setSoulOrbStat,
    collectState,
    applyState,
  }
})
