# 新楓之谷戰鬥力計算機（MapleCombat）

新楓之谷戰鬥力計算機，適用於 Windows 10 / 11。

以 Vue 3、Vite、TypeScript 與 Tauri 2 開發。

## 下載

到 [Releases](../../releases) 下載：

- 可攜版 `MapleCombat-1.0.0.exe`：免安裝直接執行
- 安裝檔 `*-setup.exe`（NSIS）：建立開始選單捷徑、可由控制台移除

## 從原始碼建置

需求:Node.js 22+、Rust(stable);Windows 另需 MSVC build tools 與 WebView2。

```bash
npm ci
npm run tauri build   # 產出可攜 .exe 與 NSIS 安裝檔於 src-tauri/target/release/
npm run tauri dev     # 桌面版開發
npm run test          # 測試
```

## 授權

程式碼採 [MIT](LICENSE)。

遊戲名稱與圖像版權均歸 © NEXON Korea Corporation；本工具為非官方開發工具，僅作為非營利學習用途。
