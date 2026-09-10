// Detect Meta / LINE / WeChat in-app webviews (Threads, IG, FB, Messenger, LINE…).
// Google OAuth refuses to run in these ("disallowed_useragent", 403), so we warn
// the user to reopen the page in a real browser (Safari / Chrome) before login.
export function isInAppBrowser(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  return /FBAN|FBAV|FB_IAB|Instagram|Threads|Barcelona|Line\/|Messenger|MicroMessenger/i.test(ua)
}

// LINE 內建瀏覽器獨立認:它是唯一支援「帶參數就自動改用外部瀏覽器」的。
export function isLineInApp(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Line\//i.test(navigator.userAgent || '')
}

// LINE 官方機制:網址帶 openExternalBrowser=1,LINE 內開啟時會改用系統瀏覽器。
// iOS / Android 的 LINE 都吃;其他瀏覽器會無視這個參數。
export function lineExternalBrowserUrl(url: string = window.location.href): string {
  const u = new URL(url)
  u.searchParams.set('openExternalBrowser', '1')
  return u.toString()
}

// Android 的 FB / IG webview 沒有 LINE 那種參數,但 Chrome intent 連結大多能把
// 目前頁面丟給 Chrome 開;開不了就 fallback 回原網址(等於沒事)。
export function androidChromeIntentUrl(url: string = window.location.href): string {
  const u = new URL(url)
  return `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(url)};end`
}
