<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useCharacterStore } from '@/stores/character'
import type { CalculatorMode } from '@/stores/ui'
import type { FormulaStatBreakdown, CombatFormulaInputs } from '@/core/combatPower'
import type { ActualFormulaInputs } from '@/core/actualDamage'

const props = defineProps<{ initialMode: CalculatorMode }>()
const emit = defineEmits<{ close: [] }>()
const store = useCharacterStore()
const previewMode = ref<CalculatorMode>(props.initialMode)

type PreviewInputs = CombatFormulaInputs | ActualFormulaInputs
interface PreviewItem {
  key: string
  label: string
  value: number
  suffix?: string
  detail?: FormulaStatBreakdown
}

const snapshots = computed(() =>
  previewMode.value === 'calculator'
    ? [
        { title: '原始', data: store.combatPreviewNoBuff },
        { title: '含 Buff', data: store.combatPreviewWithBuff },
      ]
    : [
        { title: '原始', data: store.effPreviewNoBuff },
        { title: '含 Buff', data: store.effPreviewWithBuff },
      ],
)

function formatValue(value: number, suffix = ''): string {
  if (!Number.isFinite(value)) return '-'
  const factor = Math.abs(value) >= 100 ? 1 : 1000
  const floored = Math.floor(value * factor) / factor
  return `${floored.toLocaleString('zh-TW')}${suffix}`
}

function previewItems(data: PreviewInputs): PreviewItem[] {
  const items: PreviewItem[] = [
    { key: 'main', label: store.statLabels.main, value: data.main.total, detail: data.main },
    { key: 'sub', label: store.statLabels.sub, value: data.sub.total, detail: data.sub },
  ]
  if (data.subtwo && store.statLabels.secondSub) {
    items.push({
      key: 'subtwo',
      label: store.statLabels.secondSub,
      value: data.subtwo.total,
      detail: data.subtwo,
    })
  }
  items.push(
    { key: 'attack', label: '攻擊力', value: data.attack.total, detail: data.attack },
    { key: 'attackPercent', label: '攻擊力%', value: data.attack.percent, suffix: '%' },
    { key: 'damage', label: '傷害', value: data.damage, suffix: '%' },
    { key: 'bossDamage', label: 'Boss 傷害', value: data.bossDamage, suffix: '%' },
    { key: 'critDamage', label: '爆擊傷害', value: data.critDamage, suffix: '%' },
  )
  return items
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('close')
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <div class="stat-preview-backdrop" role="presentation" @mousedown.self="emit('close')">
      <section class="stat-preview-dialog" role="dialog" aria-modal="true" aria-label="數值預覽">
        <header class="stat-preview-head">
          <div>
            <span class="stat-preview-kicker">公式帶入前確認</span>
            <h2>數值總覽</h2>
          </div>
          <button
            type="button"
            class="stat-preview-close"
            aria-label="關閉數值預覽"
            @click="emit('close')"
          >
            ×
          </button>
        </header>

        <div class="stat-preview-tabs">
          <button
            type="button"
            :class="{ active: previewMode === 'calculator' }"
            @click="previewMode = 'calculator'"
          >
            戰鬥力資料
          </button>
          <button
            type="button"
            :class="{ active: previewMode === 'effStats' }"
            @click="previewMode = 'effStats'"
          >
            實戰資料
          </button>
        </div>

        <p class="stat-preview-note">
          戰鬥力資料為扣除技能消耗、經校正過後的值；實戰資料直接採用目前輸入值。
          <span>主屬、副屬與攻擊力可移入查看組成。</span>
        </p>

        <div class="stat-preview-columns">
          <article
            v-for="(snapshot, snapshotIndex) in snapshots"
            :key="snapshot.title"
            class="stat-preview-panel"
          >
            <h3>{{ snapshot.title }}</h3>
            <div class="stat-preview-grid">
              <div
                v-for="item in previewItems(snapshot.data)"
                :key="item.key"
                class="stat-preview-item"
                :class="{ 'has-detail': item.detail }"
                :tabindex="item.detail ? 0 : undefined"
                :aria-describedby="
                  item.detail ? `stat-preview-detail-${snapshotIndex}-${item.key}` : undefined
                "
              >
                <span>{{ item.label }}</span>
                <strong>{{ formatValue(item.value, item.suffix) }}</strong>
                <div
                  v-if="item.detail"
                  :id="`stat-preview-detail-${snapshotIndex}-${item.key}`"
                  class="stat-preview-tooltip"
                  role="tooltip"
                >
                  <div>
                    <span>基本數值</span><b>{{ formatValue(item.detail.base) }}</b>
                  </div>
                  <div>
                    <span>% 數值</span><b>{{ formatValue(item.detail.percent, '%') }}</b>
                  </div>
                  <div>
                    <span>%未套用數值</span><b>{{ formatValue(item.detail.noApply) }}</b>
                  </div>
                </div>
              </div>
            </div>
          </article>
        </div>
      </section>
    </div>
  </Teleport>
</template>
