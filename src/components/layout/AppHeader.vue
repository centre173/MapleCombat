<script setup lang="ts">
// 頁首：標題 + 匯入/儲存 + 分頁切換（含滑動指示條）。
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useUiStore, type ViewKey } from '@/stores/ui'
import { useImportExport } from '@/composables/useImportExport'

const ui = useUiStore()
const { fileInput, onExport, onImportFileChange } = useImportExport()

const tabBar = ref<HTMLElement | null>(null)

const tabs: { view: ViewKey; label: string; shortLabel?: string }[] = [
  { view: 'characterInput', label: '角色資料', shortLabel: '角色資料' },
  { view: 'equipmentChange', label: '裝備變更' },
  { view: 'valueConversion', label: '數值換算' },
]

// ── 分頁指示條 ──
let transitionTimer = 0
function updateIndicator(animate: boolean) {
  const bar = tabBar.value
  if (!bar) return
  const activeTab =
    bar.querySelector<HTMLElement>('.view-tab.active') ||
    bar.querySelector<HTMLElement>('.view-tab')
  if (!activeTab) return

  if (!animate) {
    bar.classList.add('is-resizing')
    window.clearTimeout(transitionTimer)
  }
  const barRect = bar.getBoundingClientRect()
  const activeRect = activeTab.getBoundingClientRect()
  bar.style.setProperty('--tool-tab-x', `${activeRect.left - barRect.left}px`)
  bar.style.setProperty('--tool-tab-width', `${activeRect.width}px`)
  if (!animate) {
    transitionTimer = window.setTimeout(() => bar.classList.remove('is-resizing'), 80)
  }
}

let resizeObserver: ResizeObserver | null = null
const onWindowResize = () => updateIndicator(false)

onMounted(() => {
  nextTick(() => updateIndicator(false))
  window.addEventListener('resize', onWindowResize)
  if (typeof ResizeObserver === 'function' && tabBar.value) {
    resizeObserver = new ResizeObserver(() => updateIndicator(false))
    resizeObserver.observe(tabBar.value)
    tabBar.value.querySelectorAll('.view-tab').forEach((tab) => resizeObserver!.observe(tab))
  }
  if (document.fonts?.ready) {
    document.fonts.ready.then(() => updateIndicator(false)).catch(() => {})
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onWindowResize)
  resizeObserver?.disconnect()
})

watch(
  () => ui.activeView,
  () => nextTick(() => updateIndicator(true)),
)
</script>

<template>
  <div class="sticky-header">
    <div class="header-wrap">
      <div class="header-titles">
        <h1 class="header-title">新楓之谷戰鬥力工具</h1>
        <span class="header-subtitle">MapleStory Combat Power Tool</span>
      </div>

      <div class="header-actions">
        <button class="file-btn" title="匯入資料" aria-label="匯入資料" @click="fileInput?.click()">
          <span class="btn-icon" aria-hidden="true">
            <svg
              viewBox="0 0 16 16"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M8 10.5v-7" />
              <path d="M5 6l3-3 3 3" />
              <path d="M3 12.5h10" />
            </svg>
          </span>
          匯入
        </button>
        <button class="file-btn" title="儲存資料" aria-label="儲存資料" @click="onExport">
          <span class="btn-icon" aria-hidden="true">
            <svg
              viewBox="0 0 16 16"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M8 2.5v7" />
              <path d="M5 7l3 3 3-3" />
              <path d="M3 12.5h10" />
            </svg>
          </span>
          儲存
        </button>
        <input
          id="importFileInput"
          ref="fileInput"
          type="file"
          accept="application/json,.json"
          style="display: none"
          @change="onImportFileChange"
        />
      </div>
    </div>

    <div class="tool-tabs">
      <div ref="tabBar" class="tool-tabs-bar">
        <button
          v-for="tab in tabs"
          :key="tab.view"
          class="view-tab"
          :class="{ active: ui.activeView === tab.view }"
          :data-view="tab.view"
          @click="ui.activeView = tab.view"
        >
          <template v-if="tab.shortLabel">
            <span class="tab-label-full">{{ tab.label }}</span>
            <span class="tab-label-short">{{ tab.shortLabel }}</span>
          </template>
          <template v-else>{{ tab.label }}</template>
        </button>
      </div>
    </div>
  </div>
</template>
