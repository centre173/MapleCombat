import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { applyDensity } from '@/composables/useDensity'
import { applyCompactTheme } from '@/composables/useTheme'
import { setupAutoZoom } from '@/composables/useAutoZoom'
import { setupDesktopWindow } from '@/services/desktopWindow'

// 樣式載入順序固定（影響 CSS 覆寫優先級）
import '@/styles/base.css'
import '@/styles/layout.css'
import '@/styles/equipment.css'
import '@/styles/calculator.css'
import '@/styles/buffs.css'
import '@/styles/theme-web.css'
import '@/styles/density.css'
// 桌面緊湊版主題（必須最後載入，覆寫上方所有 :root 變數）
import '@/styles/compact-desktop.css'

applyDensity()
applyCompactTheme()

async function bootstrap(): Promise<void> {
  await setupDesktopWindow()
  setupAutoZoom()

  const app = createApp(App)
  app.use(createPinia())
  app.mount('#app')
}

void bootstrap()
