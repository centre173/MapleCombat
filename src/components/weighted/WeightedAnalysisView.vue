<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ViewKey } from '@/stores/ui'
import { useStateSlotsStore, STATE_SLOT_IDS, type StateSlotId } from '@/stores/stateSlots'
import { useBuffsStore } from '@/stores/buffs'
import { useCharacterStore } from '@/stores/character'
import { useCheckboxField } from '@/composables/useField'
import EquipmentSidePanel from '@/components/equipment/EquipmentSidePanel.vue'
import {
  calculateWeightedSummary,
  buildWeightedMetrics,
  type WeightedMetricResult,
} from '@/core/weightedStates'
import {
  EFFICIENCY_PANEL_DEFAULTS,
  getVisibleMetricKeys,
  type EfficiencyMetric,
} from '@/core/efficiency'
import {
  formatActualPercentChange,
  formatEfficiencyEquivalent,
  formatEfficiencyUnitInput,
  formatPower,
} from '@/core/format'

defineProps<{ view: ViewKey }>()

const slots = useStateSlotsStore()
const buffs = useBuffsStore()
const store = useCharacterStore()

const showActualGain = useCheckboxField('effShowActualGain')
const showCombatGain = useCheckboxField('effShowCombatGain')
const openPickerIndex = ref(0)
const customPanelOpen = ref(false)

const summary = computed(() => calculateWeightedSummary(slots.workspace, buffs.table))
const metricResults = computed(() =>
  buildWeightedMetrics(slots.workspace, buffs.table, showCombatGain.value),
)
const visibleKeys = computed(() =>
  getVisibleMetricKeys(metricResults.value, 'common', String(store.fields.effCustomMetricKeys)),
)
const visibleResults = computed(() =>
  metricResults.value.filter((metric) => visibleKeys.value.has(metric.key)),
)
const customCheckedKeys = computed(() => {
  const available = new Set(metricResults.value.map((metric) => metric.key))
  const keys = String(store.fields.effCustomMetricKeys || '')
    .split(',')
    .map((key) => key.trim())
    .filter((key) => available.has(key))
  return new Set(keys.length ? keys : [...visibleKeys.value])
})
const panels = computed(() => {
  const byKey = new Map(metricResults.value.map((metric) => [metric.key, metric]))
  const fallbackKey = metricResults.value[0]?.key ?? ''
  return EFFICIENCY_PANEL_DEFAULTS.map((defaultKey, index) => {
    const panelIndex = index + 1
    const defaultMetricKey = byKey.has(defaultKey) ? defaultKey : fallbackKey
    let selectedKey = String(store.fields[`effSelectedMetric${panelIndex}`] || defaultMetricKey)
    if (!byKey.has(selectedKey)) selectedKey = defaultMetricKey
    return { index: panelIndex, metric: byKey.get(selectedKey)!, selectedKey }
  }).filter((panel) => panel.metric)
})

function activeWeightLabel() {
  const active = STATE_SLOT_IDS.filter((id) => summary.value.effectiveWeights[id] > 0)
  return active
    .map((id) => {
      const state = slots.workspace.states.find((entry) => entry.id === id)
      return `${state?.name || id} ${formatShare(summary.value.effectiveWeights[id])}%`
    })
    .join(' / ')
}

function formatShare(value: number): string {
  return Number(value.toFixed(2)).toString()
}

function weightValue(id: StateSlotId): string {
  return String(slots.workspace.weighted.weights[id] ?? 0)
}

function onWeightInput(id: StateSlotId, event: Event) {
  slots.setWeight(id, (event.target as HTMLInputElement).value)
}

const equipmentPowerDiff = computed(() => summary.value.equipmentChangedPower - store.powerValue(summary.value.currentPower))
const equipmentPowerDiffText = computed(() => {
  const diff = equipmentPowerDiff.value
  if (!Number.isFinite(diff) || diff === 0) return ''
  return diff > 0 ? `(+${powerText(diff)})` : `(-${powerText(-diff)})`
})

function choosePanelMetric(panelIndex: number, metricKey: string) {
  store.setField(`effSelectedMetric${panelIndex}`, metricKey)
  openPickerIndex.value = 0
}

function togglePicker(index: number) {
  openPickerIndex.value = openPickerIndex.value === index ? 0 : index
}

function onUnitInput(metric: EfficiencyMetric, event: Event) {
  const nextValue = Number((event.target as HTMLInputElement).value)
  if (Number.isFinite(nextValue) && nextValue > 0) {
    store.setField(metric.unitId, String(nextValue))
  }
}

function onUnitChange(metric: EfficiencyMetric, event: Event) {
  const el = event.target as HTMLInputElement
  const nextValue = Number(el.value)
  if (!Number.isFinite(nextValue) || nextValue <= 0) {
    el.value = '1'
    store.setField(metric.unitId, '1')
  } else {
    el.value = String(nextValue)
    store.setField(metric.unitId, String(nextValue))
  }
}

function onCustomKeyToggle(metricKey: string, event: Event) {
  const checkbox = event.target as HTMLInputElement
  const next = new Set(customCheckedKeys.value)
  if (checkbox.checked) next.add(metricKey)
  else next.delete(metricKey)
  if (!next.size) {
    checkbox.checked = true
    return
  }
  store.setField('effCustomMetricKeys', [...next].join(','))
}

function resultsFor(selectedKey: string) {
  return visibleResults.value.filter((metric) => metric.key !== selectedKey)
}

function equivalentText(target: WeightedMetricResult, base: WeightedMetricResult, kind: 'actual' | 'combat') {
  const targetGain = kind === 'actual' ? target.gain : target.combatGain
  const baseGain = kind === 'actual' ? base.gain : base.combatGain
  const value = targetGain > 0 ? (target.unit * baseGain) / targetGain : NaN
  return formatEfficiencyEquivalent(value, target.suffix, 3)
}

function powerText(value: number) {
  return formatPower(value)
}
</script>

<template>
  <div class="view-panel weighted-analysis-view active">
    <section class="weighted-card weighted-card--summary weighted-weight-panel">
      <div class="weighted-head">
        <div>
          <h2>
            原輸出占比
            <span class="buff-info weighted-info">
              <button type="button" class="buff-info-trigger" aria-label="原輸出占比說明"></button>
              <span class="buff-info-tooltip weighted-info-tooltip" role="tooltip">
                <span class="buff-info-lines">
                  <span class="buff-info-line">填入各狀態相對總輸出的占比進行加權計算</span>
                </span>
              </span>
            </span>
          </h2>
          <p>
            {{
              summary.usedFallbackWeights
                ? '原輸出占比未設定，暫用 狀態1 100%'
                : `正規化後：${activeWeightLabel()}`
            }}
          </p>
        </div>
      </div>

      <div class="weighted-weight-grid">
        <label v-for="state in slots.workspace.states" :key="state.id" class="weighted-weight-item">
          <span :title="`${state.name} 原輸出占比`">{{ state.name }}</span>
          <input
            type="number"
            min="0"
            max="100"
            :value="weightValue(state.id)"
            @input="onWeightInput(state.id, $event)"
          />
          <b>%</b>
        </label>
      </div>
    </section>

    <section v-if="view === 'characterInput'" class="weighted-card weighted-card--summary">
      <div class="weighted-summary-grid">
        <div class="weighted-summary-item">
          <span>當前戰鬥力</span>
          <strong>{{ formatPower(store.powerValue(summary.currentPower)) }}</strong>
          <small class="weighted-summary-subvalue" aria-hidden="true">&nbsp;</small>
        </div>
        <div class="weighted-summary-item">
          <span>加權含Buff戰力增幅</span>
          <strong>{{ formatActualPercentChange(summary.combatBuffGain) }}</strong>
          <small class="weighted-summary-subvalue">{{ powerText(summary.combatBuffPower) }}</small>
        </div>
        <div class="weighted-summary-item">
          <span>加權含Buff實際增幅</span>
          <strong>{{ formatActualPercentChange(summary.actualBuffGain) }}</strong>
          <small class="weighted-summary-subvalue" aria-hidden="true">&nbsp;</small>
        </div>
      </div>
    </section>

    <div v-else-if="view === 'equipmentChange'" class="weighted-equipment-view">
      <div class="equipment-change-result">
        <div class="equipment-result">
          <div class="equipment-result-card">
            <div class="equipment-result-rows">
              <div class="equipment-result-row">
                <span class="equipment-result-label">變更後戰鬥力</span>
                <div class="equipment-result-value">{{ powerText(summary.equipmentChangedPower) }}</div>
                <span
                  v-if="equipmentPowerDiffText"
                  class="equipment-result-diff"
                  :class="equipmentPowerDiff > 0 ? 'is-positive' : 'is-negative'"
                  >{{ equipmentPowerDiffText }}</span
                >
              </div>
            </div>
          </div>
          <div class="equipment-gain-summary">
            <span class="equipment-gain-badge equipment-battle-gain-badge">
              <span class="equipment-gain-label">戰鬥力</span>
              <span id="weightedEquipmentBattleGainValue" class="equipment-gain-value">
                {{ formatActualPercentChange(summary.equipmentBattleGain) }}
              </span>
            </span>
            <span class="equipment-gain-badge equipment-actual-gain-badge">
              <span class="equipment-gain-label">實際增幅</span>
              <span id="weightedEquipmentActualGainValue" class="equipment-gain-value">
                {{ formatActualPercentChange(summary.equipmentActualGain) }}
              </span>
            </span>
          </div>
        </div>

        <div class="equipment-grid">
          <EquipmentSidePanel side="old" />
          <EquipmentSidePanel side="new" />
        </div>
      </div>
    </div>

    <section v-else class="weighted-card">
      <div class="weighted-section-title">
        <span>數值換算加權結果</span>
      </div>
      <div class="equipment-efficiency-toolbar weighted-efficiency-toolbar">
        <label class="equipment-efficiency-combat-toggle">
          <input id="weightedEffShowActualGain" v-model="showActualGain" type="checkbox" />
          <span>依實際換算(綠)</span>
        </label>
        <label class="equipment-efficiency-combat-toggle">
          <input id="weightedEffShowCombatGain" v-model="showCombatGain" type="checkbox" />
          <span>依戰力換算(黃)</span>
        </label>
        <details
          id="weightedEffCustomPanel"
          class="equipment-efficiency-custom-panel"
          :open="customPanelOpen"
          @toggle="customPanelOpen = ($event.target as HTMLDetailsElement).open"
        >
          <summary>自訂顯示項目</summary>
        </details>
        <div v-show="customPanelOpen" id="weightedEffCustomMetricList" class="equipment-efficiency-custom-grid">
          <label
            v-for="metric in metricResults"
            :key="metric.key"
            class="equipment-efficiency-custom-option"
          >
            <input
              type="checkbox"
              :data-eff-custom-key="metric.key"
              :checked="customCheckedKeys.has(metric.key)"
              @change="onCustomKeyToggle(metric.key, $event)"
            />
            <span>{{ metric.label }}</span>
          </label>
        </div>
      </div>

      <div
        class="equipment-efficiency-table"
        :class="{ 'show-actual-gain': showActualGain, 'show-combat-gain': showCombatGain }"
      >
        <details
          v-for="panel in panels"
          :key="panel.index"
          class="equipment-efficiency-group equipment-efficiency-panel"
          open
          @click.prevent
        >
          <summary>
            <label class="equipment-efficiency-unit-control" @click.stop>
              <input
                type="text"
                inputmode="decimal"
                class="equipment-efficiency-unit-input"
                :value="formatEfficiencyUnitInput(panel.metric.unit)"
                autocomplete="off"
                @click.stop
                @input="onUnitInput(panel.metric, $event)"
                @change="onUnitChange(panel.metric, $event)"
                @keydown.enter="($event.target as HTMLInputElement).blur()"
              />
            </label>
            <div
              class="equipment-efficiency-metric-picker"
              :class="{ 'is-open': openPickerIndex === panel.index }"
              @click.stop
            >
              <button
                type="button"
                class="equipment-efficiency-metric-trigger"
                aria-haspopup="listbox"
                :aria-expanded="openPickerIndex === panel.index"
                @click="togglePicker(panel.index)"
              >
                <span class="equipment-efficiency-metric-trigger-text">{{ panel.metric.label }}</span>
              </button>
              <div class="equipment-efficiency-metric-menu" role="listbox">
                <button
                  v-for="metric in metricResults"
                  :key="metric.key"
                  type="button"
                  class="equipment-efficiency-metric-option"
                  :class="{ active: metric.key === panel.selectedKey }"
                  @click="choosePanelMetric(panel.index, metric.key)"
                >
                  {{ metric.label }}
                </button>
              </div>
            </div>
          </summary>
          <div class="equipment-equivalence-grid">
            <div
              v-for="target in resultsFor(panel.selectedKey)"
              :key="target.key"
              class="equipment-equivalence-row"
              :class="{ 'has-actual': showActualGain, 'has-combat': showCombatGain }"
            >
              <span class="equipment-equivalence-name">{{ target.label }}</span>
              <span class="equipment-equivalence-values">
                <span v-if="showActualGain" class="equipment-equivalence-value equiv-actual">
                  {{ equivalentText(target, panel.metric, 'actual') }}
                </span>
                <span v-if="showCombatGain" class="equipment-equivalence-value equiv-combat">
                  {{ equivalentText(target, panel.metric, 'combat') }}
                </span>
              </span>
            </div>
          </div>
        </details>
      </div>
    </section>
  </div>
</template>
