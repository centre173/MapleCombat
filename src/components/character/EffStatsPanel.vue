<script setup lang="ts">
// 實戰資料模式面板。
import { computed } from 'vue'
import { useCharacterStore } from '@/stores/character'
import StatInput from './shared/StatInput.vue'
import SpecialStatsEff from './SpecialStatsEff.vue'
import BuffPanel from '@/components/buffs/BuffPanel.vue'
import guideImage from '@/assets/images/數值輸入說明.png'

const store = useCharacterStore()
const labels = computed(() => store.statLabels)
const effJob = computed(() => store.effSelectedJob)
const includeSecondSub = computed(() => effJob.value === 'xenon' || effJob.value === 'dual')
</script>

<template>
  <div class="calc-layout">
    <div class="calc-main">
      <!-- 表格1：主要能力值（緊湊版：標題列改為資料切換/職業列，由父層 head slot 傳入） -->
      <div class="section stat-table-card">
        <slot name="head" />
        <div class="stat-table stat-table--effmain">
          <div class="st-row st-row--head">
            <span class="st-rowhead compact-main-stat-guide-cell">
              <span class="buff-info main-stat-guide compact-main-stat-guide">
                <button
                  type="button"
                  class="buff-info-trigger"
                  aria-label="主要能力值輸入指南"
                ></button>
                <span class="buff-info-tooltip main-stat-guide-tooltip" role="tooltip">
                  <img class="main-stat-guide-image" :src="guideImage" alt="主要能力值輸入指南" />
                </span>
              </span>
            </span>
            <span class="st-colhead">基本數值</span>
            <span class="st-colhead">% 數值</span>
            <span class="st-colhead">%未套用數值</span>
          </div>
          <div class="st-row">
            <span id="effMainSectionTitle" class="st-rowhead">{{ labels.main }}</span>
            <div class="st-cell">
              <span class="st-cell-label">基本數值</span><StatInput id="effBaseMain" restrict />
            </div>
            <div class="st-cell">
              <span class="st-cell-label">% 數值</span><StatInput id="effPercentMain" restrict />
            </div>
            <div class="st-cell">
              <span class="st-cell-label">%未套用數值</span
              ><StatInput id="effNoApplyMain" restrict />
            </div>
          </div>
          <div class="st-row">
            <span id="effSubSectionTitle" class="st-rowhead">{{ labels.sub }}</span>
            <div class="st-cell">
              <span class="st-cell-label">基本數值</span><StatInput id="effBaseSub" restrict />
            </div>
            <div class="st-cell">
              <span class="st-cell-label">% 數值</span><StatInput id="effPercentSub" restrict />
            </div>
            <div class="st-cell">
              <span class="st-cell-label">%未套用數值</span
              ><StatInput id="effNoApplySub" restrict />
            </div>
          </div>
          <div v-show="includeSecondSub" id="effSecondSubRow" class="st-row">
            <div class="st-rowhead st-rowhead--check">
              <span id="effSecondSubSectionTitle">{{ labels.secondSub || '副屬性2' }}</span>
            </div>
            <div class="st-cell">
              <span class="st-cell-label">基本數值</span><StatInput id="effBaseSubtwo" restrict />
            </div>
            <div class="st-cell">
              <span class="st-cell-label">% 數值</span><StatInput id="effPercentSubtwo" restrict />
            </div>
            <div class="st-cell">
              <span class="st-cell-label">%未套用數值</span
              ><StatInput id="effNoApplySubtwo" restrict />
            </div>
          </div>
          <div class="st-row">
            <span class="st-rowhead">攻擊力</span>
            <div class="st-cell">
              <span class="st-cell-label">基本數值</span><StatInput id="effAtk" restrict />
            </div>
            <div class="st-cell">
              <span class="st-cell-label">% 數值</span><StatInput id="effPercentAtk" restrict />
            </div>
            <div class="st-cell">
              <span class="st-cell-label">%未套用數值</span
              ><StatInput id="effNoApplyAtk" restrict />
            </div>
          </div>
        </div>
        <SpecialStatsEff />
        <template v-if="effJob === 'da'">
          <span class="compact-subtitle">職業特殊項目</span>
          <div class="bonus-extra-grid bonus-extra-grid--special">
            <div class="input-group">
              <label>基本HP</label><StatInput id="effBaseHP" restrict />
            </div>
          </div>
        </template>
      </div>
    </div>

    <div class="calc-side">
      <BuffPanel mode="eff" />
    </div>
  </div>
</template>
