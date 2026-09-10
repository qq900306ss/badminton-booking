// Chrome / Edge / Samsung 的 `beforeinstallprompt` 在頁面載入很早就發,常常比
// React 元件 mount 還早;元件自己掛 listener 會錯過。這個模組在 main.tsx 載入時
// 就先接住事件存起來,元件之後用 getInstallPrompt() 拿、subscribe 等它出現。
export type BIPEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: BIPEvent | null = null
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

// 跳原生安裝框。事件用過一次就作廢(Chrome 不會馬上再發),使用者按取消後
// 呼叫端要退回「手動加到主畫面」的說明。
export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const e = deferred
  if (!e) return 'unavailable'
  deferred = null
  notify()
  await e.prompt()
  const { outcome } = await e.userChoice
  return outcome
}
