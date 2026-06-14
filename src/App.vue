<script setup lang="ts">
import { useUiStore } from '@/stores/ui'
import { isCompactDensity } from '@/composables/useDensity'
import AppHeader from '@/components/layout/AppHeader.vue'
import CompactToolbar from '@/components/layout/CompactToolbar.vue'
import CharacterInputView from '@/components/character/CharacterInputView.vue'
import EquipmentChangeView from '@/components/equipment/EquipmentChangeView.vue'
import ValueConversionView from '@/components/conversion/ValueConversionView.vue'

const ui = useUiStore()
const isCompact = isCompactDensity()
</script>

<template>
  <CompactToolbar v-if="isCompact" />
  <AppHeader v-else />
  <div class="container">
    <CharacterInputView v-show="ui.activeView === 'characterInput'" />
    <EquipmentChangeView v-show="ui.activeView === 'equipmentChange'" />
    <ValueConversionView v-show="ui.activeView === 'valueConversion'" />
  </div>
</template>
