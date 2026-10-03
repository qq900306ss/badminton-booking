// 告訴後端這個請求從哪個平台來(API 請求的 X-Client 標頭):超管後台看得到各平台的使用者,
// 意見回饋 / 檢舉也知道是哪個平台送的;之後要「某些東西只在某平台顯示」也有依據。
//   ios-app/<版本>(<build>)  App Store 的 iOS app(原生外殼注入 window.BadmintonNative)
//   android-app              Google Play 的 TWA(啟動網址帶 ?source=twa、referrer 是 android-app://)
//   pwa                      從瀏覽器「加入主畫面」打開
//   web                      一般瀏覽器
// main.tsx 靜態匯入:TWA 的 ?source=twa / referrer 只在第一次載入看得到,換頁後就沒了,要一啟動就判斷。
import { isIOSApp } from './native'

const TWA_PACKAGE = 'fyi.badmintontw.app'
// sessionStorage 不用 localStorage:TWA 跟手機上的 Chrome 共用同一份 localStorage,
// 記在 localStorage 會讓之後直接用 Chrome 開網站也被當成 app;sessionStorage 只跟著這個分頁
const TWA_KEY = 'client_source_twa'

function isTWA(): boolean {
  try {
    if (sessionStorage.getItem(TWA_KEY) === '1') return true
    const fromTWA =
      new URLSearchParams(window.location.search).get('source') === 'twa' ||
      document.referrer.startsWith(`android-app://${TWA_PACKAGE}`)
    if (fromTWA) sessionStorage.setItem(TWA_KEY, '1')
    return fromTWA
  } catch {
    return false // 隱私模式 / storage 被擋:當成一般網頁
  }
}

function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

// 後端只收 [0-9A-Za-z.()_-],其他字元一律換掉,免得整個標頭被當成無效
function clean(v: string): string {
  return v.replace(/[^0-9A-Za-z._-]/g, '').slice(0, 12) || '0'
}

function detect(): string {
  if (typeof window === 'undefined') return 'web'
  if (isIOSApp && window.BadmintonNative) {
    const { version, build } = window.BadmintonNative
    return `ios-app/${clean(version)}(${clean(build)})`
  }
  if (isTWA()) return 'android-app'
  if (isStandalone()) return 'pwa'
  return 'web'
}

export const CLIENT_SOURCE = detect()
