// iOS App(../ios-app,原生外殼載入這個網站)提供的原生功能。
// 外殼在 documentStart 注入 window.BadmintonNative,並掛一個 message handler;
// postMessage 直接回 promise,原生那邊回錯誤時 promise 會 reject,Error.message 就是錯誤字串
// ("canceled" = 使用者自己取消)。瀏覽器 / Android TWA 裡 isIOSApp = false,全部照網頁原本的路走。

interface NativeHandler {
  postMessage(msg: unknown): Promise<unknown>
}

declare global {
  interface Window {
    BadmintonNative?: { platform: 'ios'; version: string; build: string }
    webkit?: { messageHandlers?: Record<string, NativeHandler | undefined> }
  }
}

const handler: NativeHandler | undefined =
  typeof window !== 'undefined' ? window.webkit?.messageHandlers?.badmintonNative : undefined

export const isIOSApp = typeof window !== 'undefined' && !!window.BadmintonNative && !!handler

function call<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  if (!handler) return Promise.reject(new Error('not in app'))
  return handler.postMessage({ action, ...payload }) as Promise<T>
}

// 使用者自己按取消(關掉登入視窗、Apple 登入按取消)不用跳錯誤
export function isNativeCancel(e: unknown): boolean {
  return (e as Error | undefined)?.message === 'canceled'
}

export interface AppleCredential {
  identityToken: string
  authorizationCode: string
  name: string // 只有第一次授權時 Apple 才給
  email: string
}

export const native = {
  appleSignIn: () => call<AppleCredential>('appleSignIn'),
  // 在系統登入視窗跑 Google / LINE OAuth;回傳回跳頁的站內路徑("/auth/…?code=…&state=…")
  oauth: (url: string) => call<{ path: string }>('oauth', { url }),
  // 要通知權限 + 註冊 APNs;拒絕時 reject("denied")
  registerPush: () => call<{ token: string; sandbox: boolean }>('registerPush'),
  share: (data: { title: string; text: string; url: string }) => call<{ completed: boolean }>('share', data),
  haptic: (style: 'success' | 'warning' | 'error' | 'light' | 'medium' = 'light') =>
    call<null>('haptic', { style }).catch(() => null),
}
