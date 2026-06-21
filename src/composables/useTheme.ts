// 桌面緊湊版亮/暗主題切換，設定 data-theme。
import { ref } from 'vue'

export type CompactTheme = 'dark' | 'light'

const STORAGE_KEY = 'compactTheme'

function restoreTheme(): CompactTheme {
  // 預設粉彩玻璃視覺語言；dark 為深藍玻璃變體
  return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light'
}

const theme = ref<CompactTheme>(restoreTheme())

/** main.ts 於 mount 前呼叫，避免主題閃爍。 */
export function applyCompactTheme(): void {
  document.documentElement.dataset.theme = theme.value
}

export function useCompactTheme() {
  function toggle() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
    localStorage.setItem(STORAGE_KEY, theme.value)
    applyCompactTheme()
  }
  return { theme, toggle }
}
