import { googleLoginUrl, lineLoginUrl, setAuth } from './playerAuth'
import { isIOSApp, isNativeCancel, native } from './native'

// 登入按鈕共用的流程。網頁版:整頁導去 Google / LINE 授權頁(跟以前一樣)。
// iOS App:Google 不准在 WebView 裡登入(disallowed_useragent),所以改在系統登入視窗跑,
// 視窗收到回跳後把站內路徑交回來,這裡再讓 WebView 自己開回跳頁換 token ——
// redirect_uri、state nonce 驗證都跟網頁版同一套,後端不用分 app / 網頁。
// 使用者取消時 resolve(不算錯);真的失敗才 reject,讓按鈕那邊顯示錯誤。
export async function startOAuthLogin(provider: 'google' | 'line'): Promise<void> {
  const url = provider === 'google' ? googleLoginUrl() : lineLoginUrl()
  if (!isIOSApp) {
    window.location.href = url
    return
  }
  try {
    const { path } = await native.oauth(url)
    window.location.assign(path)
  } catch (e) {
    if (!isNativeCancel(e)) throw e
  }
}

// 「使用 Apple 登入」:App Store 規定 app 有 Google / LINE 登入就要同時提供 Apple 登入(只在 iOS App 裡出現)
export async function appleLogin(): Promise<void> {
  let cred
  try {
    cred = await native.appleSignIn()
  } catch (e) {
    if (isNativeCancel(e)) return
    throw e
  }
  // 動態載入:登入畫面在首包裡,別為了這顆只在 app 出現的按鈕把 axios 拖進首包
  const { playerApi } = await import('../api/client')
  const r = await playerApi.apple(cred.identityToken, cred.authorizationCode, cred.name)
  setAuth(r.data.data.token, r.data.data.player)
  // 跟 OAuth 回來一樣回到原本那頁;整頁重載讓登入閘、HostCta 這些都拿到新的登入態
  window.location.replace(window.location.pathname + window.location.search)
}
