<script setup lang="ts">
// 角色資料分頁：模式切換（戰鬥力資料/實戰資料）+ 職業選擇 + 雙向複製。
import { ref } from 'vue'
import { useUiStore, type CalculatorMode } from '@/stores/ui'
import { useCharacterStore } from '@/stores/character'
import { isCompactDensity } from '@/composables/useDensity'
import JobCombobox from './JobCombobox.vue'
import CharacterDataHead from './CharacterDataHead.vue'
import CombatPowerSummary from './CombatPowerSummary.vue'
import BuffGainSummary from './BuffGainSummary.vue'
import CombatStatsPanel from './CombatStatsPanel.vue'
import EffStatsPanel from './EffStatsPanel.vue'

const ui = useUiStore()
const store = useCharacterStore()
const isCompact = isCompactDensity()

const copiedButton = ref<'eff' | 'combat' | null>(null)
let copyResetTimer = 0

function showCopied(which: 'eff' | 'combat') {
  copiedButton.value = which
  window.clearTimeout(copyResetTimer)
  copyResetTimer = window.setTimeout(() => {
    copiedButton.value = null
  }, 1500)
}

function copyEffToCombat() {
  store.copyEffDataToCombat()
  showCopied('eff')
}

function copyCombatToEff() {
  store.copyCombatDataToEff()
  showCopied('combat')
}

function switchMode(mode: CalculatorMode) {
  ui.calculatorMode = mode
}
</script>

<template>
  <div class="view-panel character-input-view active">
    <!-- 桌面緊湊版：結果列常駐頂端（條件式搬移，避免重複 DOM id） -->
    <div v-if="isCompact" class="compact-result-bar">
      <CombatPowerSummary />
      <BuffGainSummary :mode="ui.calculatorMode === 'calculator' ? 'combat' : 'eff'" />
    </div>
    <!-- 緊湊版：此區塊改由 CharacterDataHead 併入主要能力值卡片內 -->
    <div v-if="!isCompact" class="character-data-summary">
      <div class="character-data-summary-head">
        <div class="mode-tabs">
          <button
            class="mode-tab"
            :class="{ active: ui.calculatorMode === 'calculator' }"
            data-mode="calculator"
            @click="switchMode('calculator')"
          >
            戰鬥力資料
          </button>
          <button
            class="mode-tab"
            :class="{ active: ui.calculatorMode === 'effStats' }"
            data-mode="effStats"
            @click="switchMode('effStats')"
          >
            實戰資料
          </button>
        </div>
        <div class="character-data-controls">
          <JobCombobox />
          <button
            v-show="ui.calculatorMode === 'calculator'"
            id="copyEffToCombatBtn"
            type="button"
            class="data-copy-btn eff-copy-combat-btn"
            :class="{ copied: copiedButton === 'eff' }"
            title="將實戰資料的數值複製到戰鬥力資料對應欄位"
            @click="copyEffToCombat"
          >
            {{ copiedButton === 'eff' ? '已複製 ✓' : '套用實戰資料' }}
          </button>
          <button
            v-show="ui.calculatorMode === 'effStats'"
            id="copyCombatToEffBtn"
            type="button"
            class="data-copy-btn eff-copy-combat-btn"
            :class="{ copied: copiedButton === 'combat' }"
            title="將戰鬥力資料的數值複製到實戰資料對應欄位"
            @click="copyCombatToEff"
          >
            {{ copiedButton === 'combat' ? '已複製 ✓' : '套用戰鬥力資料' }}
          </button>
        </div>
      </div>
    </div>
    <CombatPowerSummary v-if="!isCompact" />
    <div
      id="calculatorMode"
      class="mode-panel"
      :class="{ active: ui.calculatorMode === 'calculator' }"
    >
      <CombatStatsPanel>
        <template #head>
          <!-- v-if 保證 jobSearchInput / 複製按鈕 id 全頁唯一（僅渲染於目前模式的面板） -->
          <CharacterDataHead v-if="isCompact && ui.calculatorMode === 'calculator'" />
        </template>
      </CombatStatsPanel>
    </div>
    <div id="effStatsMode" class="mode-panel" :class="{ active: ui.calculatorMode === 'effStats' }">
      <EffStatsPanel>
        <template #head>
          <CharacterDataHead v-if="isCompact && ui.calculatorMode === 'effStats'" />
        </template>
      </EffStatsPanel>
    </div>
  </div>
</template>
