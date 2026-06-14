<script setup lang="ts">
// 戰鬥力資料的特殊能力值表格（傷害/B傷/爆傷 + 技能.消耗）。
// 抽成元件供雙位置渲染：網頁版在獨立「特殊能力值」卡片內，
// 桌面緊湊版併入「主要能力值」卡片下方（省一張卡的高度）。
import StatInput from './shared/StatInput.vue'
</script>

<template>
  <div class="stat-table stat-table--dmg">
    <div class="st-row">
      <div class="st-cell st-cell--info">
        <span class="st-cell-label"
          >傷害<span class="buff-info dmg-bug-info">
            <button type="button" class="buff-info-trigger" aria-label="傷害欄位說明"></button>
            <span class="buff-info-tooltip" role="tooltip">
              [技能]傷害目前有不計入貴族傳授的Bug，如1人情形須將「[技能.消耗]傷害」欄位+2
            </span> </span
        ></span>
        <StatInput id="dmg" restrict />
      </div>
      <div class="st-cell">
        <span class="st-cell-label"><span class="label-tag">技能.消耗</span>傷害</span
        ><StatInput id="skillDmg" restrict />
      </div>
      <div class="st-cell">
        <span class="st-cell-label">B傷</span><StatInput id="bossDmg" restrict />
      </div>
      <div class="st-cell">
        <span class="st-cell-label"><span class="label-tag">技能.消耗</span>B傷</span
        ><StatInput id="skillBossDmg" restrict />
      </div>
      <div class="st-cell">
        <span class="st-cell-label">爆傷</span><StatInput id="critDmg" restrict />
      </div>
      <div class="st-cell">
        <span class="st-cell-label"><span class="label-tag">技能.消耗</span>爆傷</span
        ><StatInput id="skillCritDmg" restrict />
      </div>
    </div>
  </div>
</template>
