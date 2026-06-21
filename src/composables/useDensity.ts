/**
 * 桌面緊湊高密度：在 main.ts mount 前呼叫，
 * 設定 data-density 讓 compact CSS 變數覆寫在首繪前生效。
 * （compact-desktop.css / density.css 以 :root[data-density='compact'] 為選擇器。）
 */
export function applyDensity(): void {
  document.documentElement.dataset.density = 'compact'
}
