import { isTauri } from '@/services/tauri'

export type Density = 'comfortable' | 'compact'

/**
 * 桌面板（Tauri）預設緊湊高密度；網頁版維持舒適密度。
 * 在 main.ts mount 前呼叫，讓 CSS 變數覆寫在首繪前生效。
 */
export function applyDensity(override?: Density): Density {
  let density: Density | undefined = override
  // dev-only：?density=compact 讓瀏覽器可預覽桌面緊湊版（production 建置會移除此分支）
  if (!density && import.meta.env.DEV) {
    const param = new URLSearchParams(window.location.search).get('density')
    if (param === 'compact' || param === 'comfortable') density = param
  }
  const resolved: Density = density ?? (isTauri() ? 'compact' : 'comfortable')
  document.documentElement.dataset.density = resolved
  return resolved
}

/** 密度於 mount 前決定且執行期不變，模板閘控可安全使用非響應式結果。 */
export function isCompactDensity(): boolean {
  return document.documentElement.dataset.density === 'compact'
}
