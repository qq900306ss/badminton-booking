# 更新日誌(玩家端 booking)

## 2026-09-10 — 公開安裝頁 `/install` + 自訂網域 badminton-tw.fyi

- 新增 `/install`(不用登入,宣傳貼這個):依平台導到「那個平台真的能裝」的路 —
  Android Chrome 一鍵原生安裝框;iPhone/iPad 圖解 Safari 分享 → 加入主畫面(非 Safari 先複製網址);
  LINE 內建瀏覽器一鍵帶 `openExternalBrowser=1` 跳系統瀏覽器;FB/IG/Threads 說明 + Android Chrome intent 直開;
  桌機顯示 QR code 給手機掃。已從桌面開的顯示「已裝好」
- `lib/installPrompt.ts`:`beforeinstallprompt` 在 app 啟動就接住(它常比元件 mount 早,以前 `InstallButton` 會錯過);
  `InstallButton` 改共用這份
- 「推薦給朋友」分享連結改指安裝頁,固定帶 `openExternalBrowser=1`(LINE 點開直接系統瀏覽器)
- PNG 圖示:192/512 + maskable + `apple-touch-icon` 180 滿版(iOS 不吃 SVG、透明角會變黑);manifest 改列 PNG
- `index.html` 補 description + `og:*` 預覽卡(`og-image.png` 1200×630),LINE/FB 貼連結有圖有標題;網址指新網域
- 網域 `badminton-tw.fyi`(Cloudflare Registrar,DNS 也在 Cloudflare;玩家端=apex、後台=`host.`、API=`api.` 走 Fly)

## 2026-09-03 — 大廳「進行中/尚未開始」標籤、分鐘單位

- 大廳球局卡片新增狀態標籤:開打時間已到 →「🏸 進行中」(薄荷綠);還沒到 →「⏰ 尚未開始」(薰衣草紫)
- 「已打 X 分」補上單位 → 「已打 X 分鐘」(zh-TW 文案)
- (人數顯示只在團主後台,前台大廳不顯示——依產品決定)

## 2026-07-18 — 「開團」宣傳入口(成長)

- 新增 app 級漂浮元件 `HostCta`:右下角圓形「🏸 開團」鈕 + 對話泡泡「你也想自己開團嗎?」,點擊在新分頁開啟開團後台(admin),邀請臨打人自己揪團
- 出現在所有玩家端頁面(大廳 / 加入頁 / 場內);圓鈕上下漂浮 + 光暈呼吸(framer-motion),泡泡進頁先冒 6 秒、之後每 30 秒再冒,可按 ✕ 收起
- 導向網址走環境變數 `VITE_HOST_APP_URL`,未設則 fallback 到 CloudFront,換網域只改 env(不動程式)
- 視覺:pink-500→rose-500 漸層 + 白字文字陰影達 WCAG AA 對比;三語系文案(繁中/EN/日,`HostCta.*.json`)
