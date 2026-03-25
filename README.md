# 中國象棋 AI 對弈 ♟

進階 AI 引擎搭載 Minimax + Alpha-Beta 剪枝 + 置換表 + 靜態搜索

## 功能特色

- **四級 AI 難度**：入門 / 業餘 / 棋手 / 大師
- **三種對弈模式**：AI vs AI（觀賞）、人類 vs AI、人類 vs 人類
- **進階 AI 技術**：
  - 迭代加深搜索 (Iterative Deepening)
  - Zobrist 雜湊置換表 (Transposition Table)
  - 靜態搜索 (Quiescence Search)
  - 殺手啟發式 (Killer Move Heuristic)
  - 歷史啟發式 (History Heuristic)
  - 將軍延伸 (Check Extension)
  - MVV-LVA 走步排序
- **精緻視覺**：木紋棋盤、立體棋子、動畫特效
- **完整功能**：棋譜記錄、AI 思考資訊、將軍警告、勝負判定
- **響應式設計**：手機與電腦都能玩

## 本地開發

```bash
# 安裝依賴
npm install

# 啟動開發伺服器
npm run dev

# 打包生產版本
npm run build

# 預覽生產版本
npm run preview
```

## 部署到 Vercel（最簡單）

### 方法一：直接拖曳部署
1. 執行 `npm run build`
2. 前往 [vercel.com](https://vercel.com)
3. 將 `dist` 資料夾拖曳到 Vercel 頁面上
4. 完成！

### 方法二：Git 整合部署
1. 將此專案推送到 GitHub
2. 前往 [vercel.com/new](https://vercel.com/new)
3. 匯入你的 GitHub repo
4. Vercel 會自動偵測 Vite 設定，直接點 Deploy
5. 每次 push 到 main 分支都會自動重新部署

### 方法三：Vercel CLI
```bash
npm i -g vercel
vercel
```

## 部署到 Netlify

```bash
npm run build
# 前往 netlify.com，拖曳 dist 資料夾上傳
```

## 部署到 GitHub Pages

```bash
# 在 vite.config.js 中加入 base: '/你的repo名/'
npm run build
# 將 dist 資料夾的內容推送到 gh-pages 分支
```

## 技術架構

- **框架**：React 18 + Vite 6
- **渲染**：SVG（棋盤與棋子）
- **AI 引擎**：純前端 JavaScript，無需後端
- **部署**：靜態網站，任何靜態託管服務都能用

## 授權

MIT License
