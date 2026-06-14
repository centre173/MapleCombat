// Buff 互斥規則測試：互斥群組單選、傳授技能啟用上限、匯入清理。
import { beforeEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { useBuffsStore } from '@/stores/buffs'
import { PASS_SKILL_MAX } from '@/core/buffs/delta'

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
})

describe('buff 互斥群組', () => {
  it('非常駐 Buff 預設皆不啟用', () => {
    const buffs = useBuffsStore()
    expect(buffs.state['skill:無雙之力']).toBe(0)
    expect(buffs.state['skill:妖精密語']).toBe(0)
    expect(buffs.state['skill:規範戒指']).toBe(0)
  })

  it('紅/藍星星藥水互斥：啟用藍會取消紅', () => {
    const buffs = useBuffsStore()
    expect(buffs.state['pot:閃閃發亮的紅色星星藥水']).toBe(1)
    buffs.toggle('pot:閃閃發亮的藍色星星藥水')
    expect(buffs.state['pot:閃閃發亮的藍色星星藥水']).toBe(1)
    expect(buffs.state['pot:閃閃發亮的紅色星星藥水']).toBe(0)
  })

  it('VIP 力量券互斥', () => {
    const buffs = useBuffsStore()
    expect(buffs.state['pot:VIP超級力量券']).toBe(1)
    buffs.toggle('pot:VIP終極力量券')
    expect(buffs.state['pot:VIP終極力量券']).toBe(1)
    expect(buffs.state['pot:VIP超級力量券']).toBe(0)
  })

  it('地圖天氣/鮮奶油蛋糕/瑪瑙蘋果三者互斥', () => {
    const buffs = useBuffsStore()
    expect(buffs.state['pot:地圖天氣']).toBe(1)
    buffs.toggle('pot:一片鮮奶油蛋糕')
    expect(buffs.state['pot:一片鮮奶油蛋糕']).toBe(1)
    expect(buffs.state['pot:地圖天氣']).toBe(0)
    buffs.toggle('pot:瑪瑙蘋果')
    expect(buffs.state['pot:瑪瑙蘋果']).toBe(1)
    expect(buffs.state['pot:一片鮮奶油蛋糕']).toBe(0)
    expect(buffs.state['pot:地圖天氣']).toBe(0)
  })

  it('無雙之力/妖精密語互斥', () => {
    const buffs = useBuffsStore()
    buffs.toggle('skill:無雙之力')
    expect(buffs.state['skill:無雙之力']).toBe(1)
    buffs.toggle('skill:妖精密語')
    expect(buffs.state['skill:妖精密語']).toBe(1)
    expect(buffs.state['skill:無雙之力']).toBe(0)
  })

  it('取消互斥項不影響其他項', () => {
    const buffs = useBuffsStore()
    buffs.toggle('pot:地圖天氣') // 1 -> 0
    expect(buffs.state['pot:地圖天氣']).toBe(0)
    expect(buffs.state['pot:一片鮮奶油蛋糕']).toBe(0)
  })
})

describe('Buff 等級偏好', () => {
  it('第一次使用規範戒指預設 Lv.4', () => {
    const buffs = useBuffsStore()
    expect(buffs.preferredLevel('skill:規範戒指')).toBe(4)
  })

  it('全部清除只停用 Buff，仍保留使用者選過的等級', async () => {
    let buffs = useBuffsStore()
    buffs.setLevel('skill:規範戒指', 5)
    buffs.clearAll()

    expect(buffs.state['skill:規範戒指']).toBe(0)
    expect(buffs.preferredLevel('skill:規範戒指')).toBe(5)

    await nextTick() // 等 watch 把偏好等級寫入 localStorage 後，再以新 store 還原
    setActivePinia(createPinia())
    buffs = useBuffsStore()
    expect(buffs.preferredLevel('skill:規範戒指')).toBe(5)
  })
})

describe('傳授技能啟用上限', () => {
  function passIds(buffs: ReturnType<typeof useBuffsStore>): string[] {
    const cat = buffs.table.categories.find((c) => c.key === 'pass')!
    return cat.buffs.map((b) => b.id)
  }

  it(`同時啟用不得超過 ${PASS_SKILL_MAX} 個：第 14 個被拒`, () => {
    const buffs = useBuffsStore()
    const ids = passIds(buffs)
    const inactive = ids.filter((id) => (buffs.state[id] || 0) <= 0)
    const activeCount = ids.length - inactive.length
    expect(activeCount).toBe(12) // 預設 12 個非零

    buffs.setLevel(inactive[0], 2) // 第 13 個：允許（levelKeys 自 2 起跳）
    expect(buffs.state[inactive[0]]).toBeGreaterThan(0)

    buffs.setLevel(inactive[1], 2) // 第 14 個：拒絕
    expect(buffs.state[inactive[1]]).toBe(0)

    // 已啟用項調整等級不受上限影響
    buffs.setLevel(inactive[0], 3)
    expect(buffs.state[inactive[0]]).toBe(3)
  })

  it('toggle 路徑同樣阻擋第 14 個傳授技能', () => {
    const buffs = useBuffsStore()
    const inactive = passIds(buffs).filter((id) => (buffs.state[id] || 0) <= 0)

    buffs.toggle(inactive[0])
    expect(buffs.state[inactive[0]]).toBe(1)

    buffs.toggle(inactive[1])
    expect(buffs.state[inactive[1]]).toBe(0)
  })
})

describe('匯入/還原清理', () => {
  it('匯入互斥同開時保留表序最先者', () => {
    const buffs = useBuffsStore()
    buffs.applyState({
      levels: { 'pot:地圖天氣': 1, 'pot:一片鮮奶油蛋糕': 1, 'pot:瑪瑙蘋果': 1 },
    })
    expect(buffs.state['pot:地圖天氣']).toBe(1)
    expect(buffs.state['pot:一片鮮奶油蛋糕']).toBe(0)
    expect(buffs.state['pot:瑪瑙蘋果']).toBe(0)
  })

  it('localStorage 還原互斥同開時自動清理', () => {
    localStorage.setItem('buffState', JSON.stringify({ 'skill:無雙之力': 1, 'skill:妖精密語': 1 }))
    const buffs = useBuffsStore()
    expect(buffs.state['skill:無雙之力']).toBe(1)
    expect(buffs.state['skill:妖精密語']).toBe(0)
  })

  it(`匯入超過 ${PASS_SKILL_MAX} 個傳授技能時依表序保留前 ${PASS_SKILL_MAX} 個`, () => {
    const buffs = useBuffsStore()
    const passBuffs = buffs.table.categories.find((c) => c.key === 'pass')!.buffs
    const ids = passBuffs.map((buff) => buff.id)
    buffs.applyState({
      levels: Object.fromEntries(passBuffs.map((buff) => [buff.id, buff.maxLevel])),
    })

    expect(ids.filter((id) => (buffs.state[id] || 0) > 0)).toEqual(ids.slice(0, PASS_SKILL_MAX))
  })
})
