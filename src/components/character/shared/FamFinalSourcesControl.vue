<script setup lang="ts">
// 萌獸終傷「逐條來源」控制：% 輸入框 + 齒輪 → 彈出面板逐條輸入各來源。
// 啟用逐條時 % 欄位唯讀顯示加總值，計算改由 resolveFamMult 直接以 float32 累加來源
//（不猜測組成）。來源以逗號字串存於 `${fieldId}Sources` 隱藏欄位（持久化 + 匯出）。
import { ref, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useCharacterStore } from '@/stores/character'
import StatInput from './StatInput.vue'

const props = withDefaults(
  defineProps<{
    fieldId: string
    inputClass?: string
    restrict?: boolean
  }>(),
  { inputClass: '', restrict: false },
)

const store = useCharacterStore()
const sourcesKey = computed(() => `${props.fieldId}Sources`)
const itemized = computed(() => String(store.fields[sourcesKey.value] ?? '').trim().length > 0)

const open = ref(false)
const openUp = ref(false)
const panelShiftX = ref(0)
const rows = ref<{ val: string | number }[]>([])
const rootEl = ref<HTMLElement | null>(null)
const panelEl = ref<HTMLElement | null>(null)

function loadRows() {
  const raw = String(store.fields[sourcesKey.value] ?? '').trim()
  rows.value = raw
    ? raw.split(',').map((v) => ({ val: v }))
    : [{ val: '' }, { val: '' }, { val: '' }]
}

// 開啟時依視窗可用空間決定上下翻轉與水平位移，避免面板被視窗邊緣裁切。
// 注意：useAutoZoom 對 <html> 設了 zoom，getBoundingClientRect/innerWidth 為視覺座標，
// 而 transform/位移屬版面座標（會再被 zoom 放大），故位移量需除以 zoom。
async function updatePlacement() {
  await nextTick()
  const anchor = rootEl.value
  const panel = panelEl.value
  if (!anchor || !panel) return
  const zoom = Number.parseFloat(getComputedStyle(document.documentElement).zoom) || 1
  const aRect = anchor.getBoundingClientRect()
  const pRect = panel.getBoundingClientRect()
  const pad = 8 * zoom

  // 垂直：下方空間不足且上方較寬 → 向上翻
  const spaceBelow = window.innerHeight - aRect.bottom
  openUp.value = spaceBelow < pRect.height + pad && aRect.top > spaceBelow

  // 水平：面板預設靠右展開（向左），左緣若溢出視窗就往右推；夾在視窗內
  const maxLeft = window.innerWidth - pad - pRect.width
  const targetLeft = Math.min(Math.max(pRect.left, pad), Math.max(pad, maxLeft))
  panelShiftX.value = (targetLeft - pRect.left) / zoom
}

function toggle() {
  if (!open.value) {
    loadRows()
    openUp.value = false
    panelShiftX.value = 0
    open.value = true
    updatePlacement()
    return
  }
  open.value = false
}

// 手動修改主欄位 → 清空逐條來源，讓手填值成為唯一權威值。
function onMainUserEdit() {
  if (itemized.value) store.setField(sourcesKey.value, '')
}

function addRow() {
  rows.value.push({ val: '' })
}

function removeRow(i: number) {
  rows.value.splice(i, 1)
}

const cleanSources = computed(() =>
  rows.value.map((r) => String(r.val).trim()).filter((r) => r !== '' && !Number.isNaN(Number(r))),
)

const sum = computed(() => cleanSources.value.reduce((a, r) => a + Number(r), 0))

function confirm() {
  if (cleanSources.value.length === 0) {
    clearItemized()
    return
  }
  store.setField(props.fieldId, String(sum.value))
  store.setField(sourcesKey.value, cleanSources.value.join(','))
  open.value = false
}

function clearItemized() {
  store.setField(sourcesKey.value, '')
  open.value = false
}

function onDocumentPointerDown(event: PointerEvent) {
  if (rootEl.value && !event.composedPath().includes(rootEl.value)) open.value = false
}

onMounted(() => document.addEventListener('pointerdown', onDocumentPointerDown))
onBeforeUnmount(() => document.removeEventListener('pointerdown', onDocumentPointerDown))
</script>

<template>
  <span ref="rootEl" class="fam-src-wrap" :class="{ 'is-open': open }">
    <StatInput
      :id="fieldId"
      :input-class="inputClass"
      :restrict="restrict"
      placeholder="0"
      @user-edit="onMainUserEdit"
    />
    <button
      type="button"
      class="fam-src-gear"
      :class="{ 'is-active': itemized }"
      :aria-expanded="open"
      title="逐條輸入萌獸終傷來源"
      @click.stop="toggle"
    >
      <svg
        viewBox="0 0 24 24"
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="3.2" />
        <path
          d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
        />
      </svg>
    </button>

    <div
      v-if="open"
      ref="panelEl"
      class="fam-src-panel"
      :class="{ 'is-up': openUp }"
      :style="{ transform: panelShiftX ? `translateX(${panelShiftX}px)` : undefined }"
      @pointerdown.stop
      @click.stop
      @keydown.esc.stop="open = false"
    >
      <div class="fam-src-head">萌獸終傷來源（逐條）</div>
      <div class="fam-src-list">
        <div v-for="(row, i) in rows" :key="i" class="fam-src-row">
          <span class="fam-src-row-label">來源 {{ i + 1 }}</span>
          <input v-model="row.val" type="number" step="any" class="fam-src-input" />
          <span class="fam-src-unit">%</span>
          <button type="button" class="fam-src-del" title="刪除這條" @click="removeRow(i)">
            ✕
          </button>
        </div>
      </div>
      <button type="button" class="fam-src-add" @click="addRow">＋ 新增一條</button>
      <div class="fam-src-foot">
        <span class="fam-src-sum">加總 {{ sum }}%</span>
        <span class="fam-src-btns">
          <button v-if="itemized" type="button" class="fam-src-clear" @click="clearItemized">
            清除逐條
          </button>
          <button type="button" class="fam-src-confirm" @click="confirm">確定</button>
        </span>
      </div>
    </div>
  </span>
</template>

<style scoped>
.fam-src-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

/* 開啟時抬到很高：要贏過同列其他欄位的下拉（.custom-select 開啟為 z-index 20/200）。 */
.fam-src-wrap.is-open {
  z-index: 680;
}

/* 向上展開時會蓋到同卡的其他儲存格與鄰近卡片：
   抬升所在儲存格（贏過同卡兄弟）與整張卡（贏過鄰卡 z 530~570）。
   Cards use backdrop-filter, so each card is its own stacking context. */
:global(.st-cell:has(.fam-src-wrap.is-open)),
:global(.input-group:has(.fam-src-wrap.is-open)) {
  position: relative;
  z-index: 680;
}

:global(.section:has(.fam-src-wrap.is-open)) {
  z-index: 680;
}

.fam-src-gear {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 22px;
  height: 22px;
  padding: 0;
  border: 1px solid rgba(218, 230, 250, 0.24);
  border-radius: 7px;
  background: rgba(69, 78, 119, 0.42);
  color: rgba(226, 235, 252, 0.85);
  cursor: pointer;
  transition:
    color 0.15s,
    border-color 0.15s,
    background 0.15s;
}

.fam-src-gear:hover {
  color: #fff;
  border-color: rgba(220, 232, 255, 0.4);
}

.fam-src-gear.is-active {
  color: #f6edff;
  border-color: rgba(218, 194, 255, 0.55);
  background: linear-gradient(135deg, rgba(132, 112, 196, 0.82), rgba(91, 151, 210, 0.76));
}

.fam-src-panel {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 300;
  width: 232px;
  padding: 10px;
  border: 1px solid rgba(210, 230, 255, 0.24);
  border-radius: 10px;
  background: linear-gradient(180deg, rgba(67, 75, 116, 0.98), rgba(51, 59, 98, 0.98));
  box-shadow:
    0 18px 34px rgba(4, 11, 24, 0.34),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
}

.fam-src-panel.is-up {
  top: auto;
  bottom: calc(100% + 6px);
}

.fam-src-head {
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 800;
  color: #eaf2ff;
}

.fam-src-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 220px;
  overflow-y: auto;
}

.fam-src-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.fam-src-row-label {
  flex: 0 0 auto;
  width: 48px;
  font-size: 12px;
  color: rgba(214, 226, 246, 0.82);
}

.fam-src-input {
  flex: 1 1 auto;
  min-width: 0;
  width: 100%;
  min-height: 26px;
  padding: 2px 8px;
  border: 1px solid rgba(220, 235, 255, 0.22);
  border-radius: 6px;
  background: rgba(28, 40, 62, 0.55);
  color: #edf5ff;
  font-size: 13px;
}

.fam-src-input:focus {
  outline: none;
  border-color: rgba(255, 255, 255, 0.5);
}

.fam-src-unit {
  flex: 0 0 auto;
  font-size: 12px;
  color: rgba(214, 226, 246, 0.7);
}

.fam-src-del {
  flex: 0 0 auto;
  width: 20px;
  height: 20px;
  padding: 0;
  border: 1px solid rgba(255, 150, 150, 0.4);
  border-radius: 6px;
  background: rgba(255, 100, 100, 0.14);
  color: #ffc2c2;
  font-size: 11px;
  line-height: 1;
  cursor: pointer;
}

.fam-src-del:hover {
  background: rgba(255, 100, 100, 0.26);
}

.fam-src-add {
  width: 100%;
  margin-top: 8px;
  min-height: 26px;
  padding: 3px 10px;
  border: 1px dashed rgba(218, 230, 250, 0.34);
  border-radius: 999px;
  background: rgba(69, 78, 119, 0.32);
  color: rgba(234, 242, 255, 0.9);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.fam-src-add:hover {
  border-color: rgba(220, 232, 255, 0.5);
  background: rgba(69, 78, 119, 0.5);
}

.fam-src-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 10px;
}

.fam-src-sum {
  font-size: 12px;
  font-weight: 800;
  color: var(--web-cyan, #8fe2ff);
}

.fam-src-btns {
  display: inline-flex;
  gap: 6px;
}

.fam-src-clear {
  min-height: 26px;
  padding: 3px 10px;
  border: 1px solid rgba(218, 230, 250, 0.23);
  border-radius: 999px;
  background: rgba(69, 78, 119, 0.38);
  color: rgba(234, 242, 255, 0.85);
  font-size: 12px;
  cursor: pointer;
}

.fam-src-confirm {
  min-height: 26px;
  padding: 3px 14px;
  border: 1px solid rgba(218, 194, 255, 0.5);
  border-radius: 999px;
  background: linear-gradient(135deg, rgba(132, 112, 196, 0.9), rgba(91, 151, 210, 0.85));
  color: #fff;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}

.fam-src-confirm:hover {
  filter: brightness(1.08);
}
</style>
