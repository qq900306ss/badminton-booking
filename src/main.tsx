import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import App from './App.tsx'
import { CURRENT_BUILD } from './lib/appUpdate'
// 靜態匯入:一啟動就接住 beforeinstallprompt(它比任何 lazy 頁面都早發,
// 停在登入頁時就會來;只靠頁面間接匯入會漏接)
import './lib/installPrompt'
// 同理:TWA 的 ?source=twa / referrer 只在第一次載入看得到,一啟動就判斷來源平台
import './lib/clientSource'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// register the service worker (PWA / installable). The ?v=<build> query makes the
// browser see a new SW each deploy → it reinstalls and re-caches a fresh app
// shell, so installed PWAs don't keep serving a stale index.html offline.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`/sw.js?v=${CURRENT_BUILD}`).catch(() => {})
  })
}
