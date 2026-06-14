<script setup lang="ts">
// 桌面緊湊版細工具列：分頁切換 + 匯入/儲存 + 主題切換（取代網頁版大頁首）。
import { useUiStore, type ViewKey } from '@/stores/ui'
import { useImportExport } from '@/composables/useImportExport'
import { useCompactTheme } from '@/composables/useTheme'

const ui = useUiStore()
const { fileInput, onExport, onImportFileChange } = useImportExport()
const { theme, toggle } = useCompactTheme()

const tabs: { view: ViewKey; label: string }[] = [
  { view: 'characterInput', label: '角色資料' },
  { view: 'equipmentChange', label: '裝備變更' },
  { view: 'valueConversion', label: '數值換算' },
]
</script>

<template>
  <div class="compact-toolbar">
    <div class="ct-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.view"
        type="button"
        class="ct-tab"
        :class="{ active: ui.activeView === tab.view }"
        @click="ui.activeView = tab.view"
      >
        {{ tab.label }}
      </button>
    </div>
    <div class="ct-actions">
      <button type="button" class="ct-btn" title="匯入資料" @click="fileInput?.click()">
        匯入
      </button>
      <button type="button" class="ct-btn" title="儲存資料" @click="onExport">儲存</button>
      <button
        type="button"
        class="ct-btn ct-theme-btn"
        :title="theme === 'dark' ? '切換為亮色主題' : '切換為暗色主題'"
        @click="toggle"
      >
        {{ theme === 'dark' ? '◐' : '◑' }}
      </button>
      <input
        ref="fileInput"
        type="file"
        accept="application/json,.json"
        style="display: none"
        @change="onImportFileChange"
      />
    </div>
  </div>
</template>
