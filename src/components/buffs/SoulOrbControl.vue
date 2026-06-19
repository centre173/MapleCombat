<script setup lang="ts">
import { computed } from 'vue'
import { useBuffsStore } from '@/stores/buffs'
import { SOUL_ORB_STATS } from '@/core/buffs/delta'
import CustomSelect from '@/components/character/shared/CustomSelect.vue'

const buffs = useBuffsStore()

const soulOrbStatOptions = computed(() =>
  SOUL_ORB_STATS.map(([value, label]) => ({ value, label })),
)

function onSoulOrbValueInput(event: Event) {
  buffs.setSoulOrbValue(Number((event.target as HTMLInputElement).value))
}
</script>

<template>
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
</template>
