<script setup lang="ts">
// 裝備變更分頁：變更後戰鬥力 + 戰鬥力/實際增幅。
import { computed } from 'vue'
import { useCharacterStore } from '@/stores/character'
import { formatActualPercentChange, formatPercentChange, formatPower } from '@/core/format'
import EquipmentSidePanel from './EquipmentSidePanel.vue'
import BuffSummaryBar from '@/components/buffs/BuffSummaryBar.vue'

const store = useCharacterStore()

const changedPowerText = computed(() => {
  const changed = store.equipmentChangedPower
  return formatPower(changed.type === 'range' ? changed.low : changed.value)
})

// 變更後戰鬥力 − 當前戰鬥力（與上方「當前戰鬥力」同樣取代表值）
const changedPowerDiff = computed(
  () => store.powerValue(store.equipmentChangedPower) - store.powerValue(store.powerNoBuff),
)
const changedPowerDiffText = computed(() => {
  const diff = changedPowerDiff.value
  if (!Number.isFinite(diff) || diff === 0) return ''
  return diff > 0 ? `(+${formatPower(diff)})` : `(-${formatPower(-diff)})`
})

// 高/低戰力公式僅差係數，增幅相同，統一取單一代表值
const battleGainText = computed(() =>
  formatPercentChange(
    store.powerValue(store.powerNoBuff),
    store.powerValue(store.equipmentChangedPower),
  ),
)

const actualGainText = computed(() => formatActualPercentChange(store.equipmentActualGain))
</script>

<template>
  <div class="view-panel active">
    <BuffSummaryBar view="equipmentChange" />
    <div class="equipment-change-result">
      <div class="equipment-result">
        <div class="equipment-result-card">
          <div class="equipment-result-rows">
            <div class="equipment-result-row">
              <span class="equipment-result-label">變更後戰鬥力</span>
              <div class="equipment-result-value">{{ changedPowerText }}</div>
              <span
                v-if="changedPowerDiffText"
                class="equipment-result-diff"
                :class="changedPowerDiff > 0 ? 'is-positive' : 'is-negative'"
                >{{ changedPowerDiffText }}</span
              >
            </div>
          </div>
        </div>
        <div class="equipment-gain-summary">
          <span class="equipment-gain-badge equipment-battle-gain-badge">
            <span class="equipment-gain-label">戰鬥力</span>
            <span id="equipmentBattleGainValue" class="equipment-gain-value">{{
              battleGainText
            }}</span>
          </span>
          <span class="equipment-gain-badge equipment-actual-gain-badge">
            <span class="equipment-gain-label">
              實際增幅
            </span>
            <span id="equipmentActualGainValue" class="equipment-gain-value">{{
              actualGainText
            }}</span>
          </span>
        </div>
      </div>

      <div class="equipment-grid">
        <EquipmentSidePanel side="old" />
        <EquipmentSidePanel side="new" />
      </div>
    </div>
  </div>
</template>
