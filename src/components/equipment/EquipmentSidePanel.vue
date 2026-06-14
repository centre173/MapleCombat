<script setup lang="ts">
// 裝備欄位面板（原裝備 / 變更後裝備），標籤依職業主副屬連動。
import { computed } from 'vue'
import { useCharacterStore } from '@/stores/character'
import StatInput from '@/components/character/shared/StatInput.vue'

const props = defineProps<{ side: 'old' | 'new' }>()
const store = useCharacterStore()

const prefix = computed(() => (props.side === 'old' ? 'eqOld' : 'eqNew'))
const title = computed(() => (props.side === 'old' ? '原裝備' : '變更後裝備'))
const labels = computed(() => store.statLabels)
const secondSubLabel = computed(() => labels.value.secondSub || '副屬2')
const showSecondSub = computed(() => store.includeSecondSub)
</script>

<template>
  <div class="section">
    <span class="section-title">{{ title }}</span>
    <div class="input-group">
      <label>{{ labels.main }}</label
      ><StatInput :id="`${prefix}BaseMain`" input-class="equipment-input" />
    </div>
    <div class="input-group">
      <label>{{ labels.main }}%</label
      ><StatInput :id="`${prefix}PercentMain`" input-class="equipment-input" />
    </div>
    <div class="input-group">
      <label>未套用%{{ labels.main }}</label
      ><StatInput :id="`${prefix}NoApplyMain`" input-class="equipment-input" />
    </div>
    <div class="input-group">
      <label>{{ labels.sub }}</label
      ><StatInput :id="`${prefix}BaseSub`" input-class="equipment-input" />
    </div>
    <div class="input-group">
      <label>{{ labels.sub }}%</label
      ><StatInput :id="`${prefix}PercentSub`" input-class="equipment-input" />
    </div>
    <div class="input-group">
      <label>未套用%{{ labels.sub }}</label
      ><StatInput :id="`${prefix}NoApplySub`" input-class="equipment-input" />
    </div>
    <div v-show="showSecondSub" class="input-group equipment-second-sub-field">
      <label>{{ secondSubLabel }}</label
      ><StatInput :id="`${prefix}BaseSubtwo`" input-class="equipment-input" />
    </div>
    <div v-show="showSecondSub" class="input-group equipment-second-sub-field">
      <label>{{ secondSubLabel }}%</label
      ><StatInput :id="`${prefix}PercentSubtwo`" input-class="equipment-input" />
    </div>
    <div v-show="showSecondSub" class="input-group equipment-second-sub-field">
      <label>未套用%{{ secondSubLabel }}</label
      ><StatInput :id="`${prefix}NoApplySubtwo`" input-class="equipment-input" />
    </div>
    <div class="input-group">
      <label>全屬</label><StatInput :id="`${prefix}AllStat`" input-class="equipment-input" />
    </div>
    <div class="input-group">
      <label>全屬%</label
      ><StatInput :id="`${prefix}AllStatPercent`" input-class="equipment-input" />
    </div>
    <div class="input-group">
      <label>攻擊力</label><StatInput :id="`${prefix}Atk`" input-class="equipment-input" />
    </div>
    <div class="input-group">
      <label>攻擊力%</label><StatInput :id="`${prefix}PercentAtk`" input-class="equipment-input" />
    </div>
    <div class="input-group">
      <label>傷害</label><StatInput :id="`${prefix}Dmg`" input-class="equipment-input" />
    </div>
    <div class="input-group">
      <label>Boss傷害</label><StatInput :id="`${prefix}BossDmg`" input-class="equipment-input" />
    </div>
    <div class="input-group">
      <label>爆擊傷害</label><StatInput :id="`${prefix}CritDmg`" input-class="equipment-input" />
    </div>
    <div class="input-group has-input-unit">
      <label>無視防禦率</label>
      <span class="equipment-input-wrap">
        <StatInput
          :id="`${prefix}IgnoreDefense`"
          input-class="equipment-input"
          min="0"
          :max="side === 'old' ? '99.999' : '100'"
        />
        <span class="equipment-input-unit">%</span>
      </span>
    </div>
  </div>
</template>
