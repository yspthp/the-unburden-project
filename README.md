# 苦澀烘焙室｜鬆綁 The Unburden Project

互動式沉思與感官體驗網站——透過 WebGL 水彩紙張滲染、液面漣漪與 2D Canvas 香氣微塵粒子，引導參與者在品嚐一口苦飲（冷萃咖啡或涼茶）的過程中經歷八幕沉思與「鬆綁」。

## 線上預覽 (GitHub Pages)

- **網址**：https://yspthp.github.io/the-unburden-project/

## 目錄架構

```text
the-unburden-project/
├── css/
│   ├── fonts.css           # 字型定義（Brew Serif 內嵌 WOFF2 子集 / Noto Serif HK 備援）
│   └── style.css           # 紙張質感、排版、提示卡、進度記號與減動態無障礙樣式
├── js/
│   ├── content.js          # 八幕文案配置 (SCREENS)、紙張與苦飲視覺狀態 (LOOK) 與經文節點 (CUES)
│   ├── shaders.js          # WebGL GLSL 著色器 (VS, COMMON, FIELD, MAIN)
│   ├── brew.js             # WebGL 苦飲滲染、杯底咖啡環與液面漣漪渲染器
│   ├── aroma.js            # 2D Canvas 香氣煙縷與光中微塵粒子系統
│   └── app.js              # 畫面推進控制、逐字顯影與「我喝下了」互動流程
├── tools/
│   └── embed_font.py       # 字型子集化工具：掃描文案字元並將 Noto Serif HK 嵌入 css/fonts.css
├── .gitignore              # Git 忽略規則
├── .nojekyll               # 停用 Jekyll 處理，直接提供靜態資源
├── index.html              # 主頁面語義化結構與 SVG 水彩濾鏡定義
└── README.md               # 專案說明文件
```

## 修改文案與重新嵌入字型

1. **編輯文案**：所有八幕文字與節奏設定集中於 [`js/content.js`](js/content.js) 的 `SCREENS` 陣列中。
2. **重新嵌入字型子集**（選用）：
   將 `NotoSerifHK.ttf` 放置於 `tools/NotoSerifHK.ttf`，安裝依賴後執行：
   ```bash
   pip install fonttools brotli
   python tools/embed_font.py
   ```
   腳本會自動掃描 `index.html` 與 `js/content.js` 中使用的所有字元，擷取 `300–600` 字重可變字型子集並轉為 Base64 WOFF2 寫入 `css/fonts.css`。

## 本地預覽

直接使用瀏覽器開啟 `index.html`，或啟動任意靜態伺服器：

```bash
python3 -m http.server 8000
```
接著於瀏覽器造訪 `http://localhost:8000`。
