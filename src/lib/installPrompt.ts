import { useSyncExternalStore } from 'react'

// Chrome / Edge / Samsung 的 `beforeinstallprompt` 在頁面載入很早就發,常常比
// React 元件 mount 還早;元件自己掛 listener 會錯過。這個模組由 main.tsx 靜態
// 匯入,app 一啟動就接住事件存起來;元件用 useInstallPrompt() 訂閱狀態。
export type BIPEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export type InstallState = {
  hasPrompt: boolean // 原生安裝框可用(可以呼叫 promptInstall)
  installed: boolean // 已裝好:從桌面開的(standalone)或本分頁剛裝完(appinstalled)
}

let deferred: BIPEvent | null = null
// appinstalled 跟 display-mode 是兩個不同訊號:從瀏覽器選單裝完,這個分頁仍是
// browser 模式,只能靠 appinstalled 知道「已經裝了」
let installedHere = false
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as BIPEvent
    notify()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    installedHere = true
    notify()
  })
}

export function getInstallPrompt(): BIPEvent | null {
  return deferred
}

export function subscribeInstallPrompt(fn: () => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

// 已經是從桌面圖示開的(PWA standalone)— iOS 用 navigator.standalone
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

// useSyncExternalStore 要求快照物件穩定(內容沒變就回同一個 reference)
let snapshot: InstallState = { hasPrompt: false, installed: false }
function getSnapshot(): InstallState {
  const next = { hasPrompt: deferred !== null, installed: installedHere || isStandalone() }
  if (next.hasPrompt !== snapshot.hasPrompt || next.installed !== snapshot.installed) snapshot = next
  return snapshot
}

// 訂閱安裝狀態;用 useSyncExternalStore 而不是 useState+useEffect,
// 免得「先讀快照、再訂閱」中間漏掉事件(notify 時還沒訂閱者)
export function useInstallPrompt(): InstallState {
  return useSyncExternalStore(subscribeInstallPrompt, getSnapshot, getSnapshot)
}

// 跳原生安裝框。事件用過一次就作廢(Chrome 不會馬上再發),使用者按取消後
// 呼叫端要退回「手動加到主畫面」的說明。
export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const e = deferred
  if (!e) return 'unavailable'
  deferred = null
  notify()
  await e.prompt()
  const { outcome } = await e.userChoice
  if (outcome === 'accepted') {
    installedHere = true
    notify()
  }
  return outcome
}
