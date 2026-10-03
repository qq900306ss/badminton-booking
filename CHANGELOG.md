# 更新日誌(玩家端 booking)

## 2026-10-03 — 省流量:WS v2 精簡快照

- `lib/realtime.ts` 連 `…/ws?v=2`:後端對 v2 連線推的球場畫面,場上 / 排隊的人只帶 `player_id`(22 人的團 7.2KB → 2.4KB,再加上 WS 壓縮)
- `lib/slimView.ts` `hydrateView`:用球員名單把格子補回跟 REST 一樣的 PlayerSlot,畫面元件不用改;名單缺人 → 回 null,CourtPage 改成重抓完整資料
- 收到完整格式(舊後端 / v1)也照樣補,所以前後端誰先上都不會壞;團主後台維持 v1
- 用正式站真實快照驗證過:精簡 → 補回結果與原本完全相同

## 2026-10-03 — API 請求帶來源平台(X-Client)

- `lib/clientSource.ts`:判斷這次是從哪個平台開的 —— `ios-app/<版本>(<build>)`(iOS app 注入的 `window.BadmintonNative`)、`android-app`(TWA:啟動網址 `?source=twa` 或 referrer `android-app://fyi.badmintontw.app`,記在 sessionStorage,因為 TWA 跟手機 Chrome 共用 localStorage)、`pwa`(standalone)、`web`
- `main.tsx` 靜態匯入:TWA 的參數 / referrer 只在第一次載入看得到
- axios 攔截器每個請求帶 `X-Client`;頭像直傳 S3 走 fetch,刻意不帶(S3 CORS 不認)
- ⚠️ 部署順序:後端要先上(CORS 允許 `X-Client`),不然瀏覽器 preflight 會擋掉所有 API

## 2026-10-01 — iOS App(原生外殼)支援:Apple 登入、APNs 推播、系統登入視窗

iOS App 在 `../ios-app`:原生外殼載入正式站(跟 Android TWA 同一個思路),網頁照常部署。這次是網頁這邊的配合:

- `lib/native.ts`:外殼在 documentStart 注入 `window.BadmintonNative` + message handler `badmintonNative`(postMessage 回 promise);`isIOSApp` 為 false 時(瀏覽器 / TWA)一切照舊
- 登入按鈕抽成 `LoginButtons`(登入畫面、刪除帳號頁共用)。iOS App 裡多「使用 Apple 登入」(App Store 4.8:有第三方登入就要有 Apple 登入),打新的 `POST /api/auth/player/apple`
- Google / LINE 在 App 裡改走系統登入視窗(Google 擋 WebView 內 OAuth):state 多帶 `a:1`;`/auth/*callback` 在系統視窗裡看到它就原封不動轉跳 `badmintontw://oauth/<路徑>?code&state`,App 在自己的 WebView 重開回跳頁,nonce 驗證、換 token 跟網頁版同一套(redirect_uri 不變,後端不用分)
- 推播:WKWebView 沒有 Web Push → App 裡 `subscribePush` / `requestNotify` 改叫原生拿 APNs token,打新的 `POST /api/push/apns`(跟 Web Push 訂閱並存)
- 分享走 UIKit 分享面板、`vibrate()` 改原生震動回饋;App 裡安裝鈕/安裝頁當成已安裝
- `appleLogin` 動態載入 api client:登入畫面在首包,不為了只在 App 出現的按鈕把 axios 拖進首包
- 隱私權政策(三語)補上 iOS App、Apple 登入(含刪帳號時撤銷 Apple 授權)、APNs;生效日改 2026-10-01;聯絡方式直接列 email(App Store 支援網址要看得到聯絡方式)
- `public/.well-known/apple-app-site-association`:universal links(Team `U2235K4N7Y`;掃場館 QR 直接開 App,`/auth/*` 排除);deploy 另外把它設成 `application/json`
- 玩家看的「更新資訊」(changelog.*.json)等 App 真的上架再加

## 2026-09-28 — 隱私權政策 `/privacy` + 刪除帳號 `/account-deletion`(Google Play 上架要求)

- 新增公開頁 `/privacy`、`/account-deletion`(不用登入):登入閘只在 `Home`(`/`),其他 Route 本來就不經過它,直接掛上即公開;`HostCta` 在這兩頁隱藏
- 隱私權政策照程式碼實際行為寫(Google 拿 email、LINE 不拿;頭像上傳 S3 東京;無第三方分析/追蹤;操作紀錄 90 天 TTL);「刪什麼 / 留什麼」抽成 `DeletionScope` 兩頁共用
- 刪除帳號:`DELETE /api/players/me`(204),確認走第二顆明確按鈕(不用 `window.confirm`);成功後 `clearAccountData()`(logout + 清 `badminton_*`、`announce_closed_*`、`oauth_state`,瀏覽器推播退訂)→ 清 react-query 快取 → 回 `/` + toast。沒登入時顯示 LINE/Google 登入,OAuth 回來會回到這頁
- `api` 加 401 response interceptor:有帶 token 且訊息是「請先登入 / 帳號已刪除,請重新登入」→ 清登入態、回首頁(`wrong password` 的 401 不動;公開頁與 OAuth callback 不跳轉)
- 設定彈窗加「🔒 隱私權政策」「🗑️ 刪除帳號」;更新資訊加 2026/09/28 一筆

## 2026-09-20 — 「安裝到手機桌面」改導去安裝頁

- 大廳 / 場內的安裝鈕:有原生安裝框(Android Chrome)維持一鍵直接裝;其他情況(iPhone、LINE/FB 內建瀏覽器、安裝框沒出現)改成導去 `/install`,由那頁依平台分流
- 移除按鈕自帶的說明彈窗與三語說明文案(`InstallButton.*.json` 只留 `installLabel`),說明只留 `/install` 一份,避免兩邊文案漂移
- 評估過上架 Google Play / App Store(Android TWA 已能 build),因成本先擱置;`/.well-known/assetlinks.json` 為該次評估留下的檔案

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
- `MovedNotice`:舊 `*.cloudfront.net` / `www.` 網址開到 → 瀏覽器直接跳新網域同路徑;已安裝的 PWA(standalone)不能偷跳(會出 scope 降級),改全螢幕「網址搬家請到新網址重裝」提醒,可稍後(session 內不再吵)
- 安裝頁隱藏 HostCta 漂浮鈕(用 `useMatch` 跟路由同規則);`HostCta` / 安裝頁的後台 fallback 網址改 `host.badminton-tw.fyi`

## 2026-09-03 — 大廳「進行中/尚未開始」標籤、分鐘單位

- 大廳球局卡片新增狀態標籤:開打時間已到 →「🏸 進行中」(薄荷綠);還沒到 →「⏰ 尚未開始」(薰衣草紫)
- 「已打 X 分」補上單位 → 「已打 X 分鐘」(zh-TW 文案)
- (人數顯示只在團主後台,前台大廳不顯示——依產品決定)

## 2026-07-18 — 「開團」宣傳入口(成長)

- 新增 app 級漂浮元件 `HostCta`:右下角圓形「🏸 開團」鈕 + 對話泡泡「你也想自己開團嗎?」,點擊在新分頁開啟開團後台(admin),邀請臨打人自己揪團
- 出現在所有玩家端頁面(大廳 / 加入頁 / 場內);圓鈕上下漂浮 + 光暈呼吸(framer-motion),泡泡進頁先冒 6 秒、之後每 30 秒再冒,可按 ✕ 收起
- 導向網址走環境變數 `VITE_HOST_APP_URL`,未設則 fallback 到 CloudFront,換網域只改 env(不動程式)
- 視覺:pink-500→rose-500 漸層 + 白字文字陰影達 WCAG AA 對比;三語系文案(繁中/EN/日,`HostCta.*.json`)
