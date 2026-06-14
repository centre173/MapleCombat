<script setup lang="ts">
// Buff 選擇面板（combat = 全部；eff = 僅含主動效果的 Buff）。
import { computed, ref, type CSSProperties } from 'vue'
import { useBuffsStore } from '@/stores/buffs'
import { useUiStore } from '@/stores/ui'
import { isCompactDensity } from '@/composables/useDensity'
import { SOUL_ORB_STATS } from '@/core/buffs/delta'
import type { BuffCategory, BuffDefinition } from '@/core/buffs/parse'
import BuffItem from './BuffItem.vue'
import CustomSelect from '@/components/character/shared/CustomSelect.vue'

const props = withDefaults(
  defineProps<{
    mode: 'combat' | 'eff'
    embedded?: boolean
    panelId?: string
  }>(),
  { embedded: false, panelId: '' },
)
const buffs = useBuffsStore()
const ui = useUiStore()

const isCompact = isCompactDensity()

interface BuffSection {
  key: string
  title: string
  category: BuffCategory
  buffs: BuffDefinition[]
  nonPermanent?: boolean
}

const visibleSections = computed<BuffSection[]>(() => {
  const sections: BuffSection[] = []
  const embeddedNonPermanentSections: BuffSection[] = []
  buffs.table.categories.forEach((category) => {
    let list =
      props.mode === 'eff' ? category.buffs.filter((buff) => buff.hasActive) : category.buffs
    if (isCompact) {
      list = [...list].sort(
        (left, right) => (left.type === 'level' ? 0 : 1) - (right.type === 'level' ? 0 : 1),
      )
    }

    const regular = list.filter((buff) => !buff.nonPermanent)
    const nonPermanent = list.filter((buff) => buff.nonPermanent)
    if (regular.length) {
      sections.push({ key: category.key, title: category.title, category, buffs: regular })
    }
    if (nonPermanent.length) {
      const section = {
        key: `${category.key}-non-permanent`,
        title: category.key === 'skill' ? '非常駐技能' : `${category.title}・非常駐`,
        category,
        buffs: nonPermanent,
        nonPermanent: true,
      }
      if (props.embedded) embeddedNonPermanentSections.push(section)
      else sections.push(section)
    }
  })
  return props.embedded ? [...embeddedNonPermanentSections, ...sections] : sections
})

// 桌面緊湊版：整個面板一鍵收合，標題列常駐顯示已選數量
const selectedCount = computed(() =>
  visibleSections.value.reduce(
    (n, section) => n + section.buffs.filter((buff) => (buffs.state[buff.id] || 0) > 0).length,
    0,
  ),
)
const bodyVisible = computed(() => props.embedded || !isCompact || ui.buffPanelOpen)
const panelId = computed(
  () => props.panelId || (props.mode === 'combat' ? 'buffPanelCombat' : 'buffPanelEff'),
)
const buffInfoStyle = ref<CSSProperties>({})

function positionBuffInfo(event: Event) {
  if (!isCompact) return

  const anchor = event.currentTarget as HTMLElement
  const container =
    anchor.closest<HTMLElement>('.buff-section-title') || anchor.closest<HTMLElement>('.buff-head')
  if (!container) return

  const rect = container.getBoundingClientRect()
  const viewportPadding = 12
  const gap = 8
  const belowTop = rect.bottom + gap
  const belowSpace = window.innerHeight - belowTop - viewportPadding
  const aboveSpace = rect.top - gap - viewportPadding
  const openAbove = belowSpace < 220 && aboveSpace > belowSpace
  const availableHeight = Math.max(120, openAbove ? aboveSpace : belowSpace)
  const pageZoom = Number.parseFloat(getComputedStyle(document.documentElement).zoom) || 1

  buffInfoStyle.value = {
    position: 'absolute',
    left: '0',
    right: 'auto',
    width: 'min(300px, calc(100vw - 24px))',
    maxWidth: 'calc(100vw - 24px)',
    maxHeight: `${Math.min(340, availableHeight / pageZoom)}px`,
    top: openAbove ? 'auto' : 'calc(100% + 8px)',
    bottom: openAbove ? 'calc(100% + 8px)' : 'auto',
  }
}

function onSoulOrbValueInput(event: Event) {
  buffs.setSoulOrbValue(Number((event.target as HTMLInputElement).value))
}

const soulOrbStatOptions = computed(() =>
  SOUL_ORB_STATS.map(([value, label]) => ({ value, label })),
)
</script>

<template>
  <div :id="panelId" class="buff-panel" :class="{ 'buff-panel--embedded': embedded }">
    <div v-if="!embedded" class="buff-head">
      <span v-if="!embedded" class="buff-head-title">選擇Buff</span>
      <span class="buff-master-actions">
        <button
          type="button"
          class="buff-master-btn"
          :disabled="buffs.matchesDefault"
          @click="buffs.resetDefaults"
        >
          套用預設
        </button>
        <button type="button" class="buff-master-btn" @click="buffs.clearAll">全部清除</button>
      </span>
      <span v-if="isCompact && !embedded" class="buff-head-count">已選 {{ selectedCount }}</span>
      <button
        v-if="isCompact && !embedded"
        type="button"
        class="buff-collapse-toggle"
        :aria-expanded="ui.buffPanelOpen"
        @click="ui.buffPanelOpen = !ui.buffPanelOpen"
      >
        <span
          class="buff-collapse-chevron"
          :class="{ 'is-expanded': ui.buffPanelOpen }"
          aria-hidden="true"
        ></span>
        <span>{{ ui.buffPanelOpen ? '收合' : '展開' }}</span>
      </button>
    </div>

    <div
      v-for="section in visibleSections"
      v-show="bodyVisible"
      :key="section.key"
      class="buff-section"
      :class="{ 'buff-section--non-permanent': section.nonPermanent }"
    >
      <div class="buff-section-title">
        {{ section.title }}
        <span
          v-if="section.category.key === 'pass'"
          class="buff-info buff-pass-info"
          @mouseenter="positionBuffInfo"
          @focusin="positionBuffInfo"
        >
          <button
            type="button"
            class="buff-info-trigger"
            aria-label="傳授技能等效數值說明"
          ></button>
          <span class="buff-info-tooltip" role="tooltip" :style="buffInfoStyle">
            <span class="buff-info-title">非常駐傳授技能占比換算</span>
            <span class="buff-info-summary"
              >靈魂契約依占比60%換算，其餘依「持續時間/冷卻時間」為占比換算。</span
            >
          </span>
        </span>
      </div>
      <div class="buff-grid">
        <BuffItem
          v-for="buff in section.buffs"
          :key="buff.id"
          :buff="buff"
          :category="section.category"
        />
      </div>
    </div>

    <div v-show="bodyVisible" class="buff-section buff-section--soul-orb">
      <div class="buff-section-title">靈魂寶珠</div>
      <div class="buff-soul-orb-control">
        <input
          class="buff-soul-orb-value"
          type="number"
          min="0"
          :value="buffs.soulOrb.value || ''"
          inputmode="decimal"
          aria-label="靈魂寶珠數值"
          @input="onSoulOrbValueInput"
        />
        <CustomSelect
          select-class="soul-orb-select"
          :model-value="buffs.soulOrb.stat"
          :options="soulOrbStatOptions"
          @update:model-value="buffs.setSoulOrbStat"
        />
      </div>
    </div>
  </div>
</template>
