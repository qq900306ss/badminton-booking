import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { QRCodeSVG } from 'qrcode.react'
import { isInAppBrowser, isLineInApp, lineExternalBrowserUrl, androidChromeIntentUrl } from '../lib/inAppBrowser'
import { useInstallPrompt, promptInstall } from '../lib/installPrompt'

// 公開的「安裝頁」:宣傳時貼這一頁的網址,不用登入就能看。
// 每個平台能做的事不一樣,這頁的工作就是把人導到「那個平台上真的能裝」的路:
//   Android Chrome → 一鍵原生安裝框
//   iPhone / iPad  → 沒有安裝 API,只能圖解 Safari「分享 → 加入主畫面」
//   LINE 內建瀏覽器 → 帶 openExternalBrowser=1 重開,LINE 會改用系統瀏覽器
//   FB / IG / Threads → 說明 + 複製網址(Android 另給 Chrome intent 直開)
//   桌機            → QR code 給手機掃
const HOST_URL =
  (import.meta.env.VITE_HOST_APP_URL as string | undefined) ||
  'https://host.badminton-tw.fyi'

type Platform = 'installed' | 'line' | 'inapp' | 'ios' | 'android' | 'desktop'

// 只看 UA;「已安裝」由 useInstallPrompt 決定(standalone 或本分頁剛裝完)
function detectPlatform(): Exclude<Platform, 'installed'> {
  const ua = navigator.userAgent || ''
  if (isLineInApp()) return 'line'
  if (isInAppBrowser()) return 'inapp'
  // iPadOS 13+ 的 Safari 會偽裝成 Mac,靠 touch points 認
  const isIos =
    /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  if (isIos) return 'ios'
  if (/android/i.test(ua)) return 'android'
  return 'desktop'
}

function isIosSafari(): boolean {
  const ua = navigator.userAgent || ''
  return /safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo/i.test(ua)
}

function useCopy(text: string) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard 被擋(很少見),網址就在旁邊可以自己選 */
    }
  }
  return { copied, copy }
}

// 貼出去給人的網址:固定帶 openExternalBrowser=1,LINE 點開會直接用系統瀏覽器,
// 省掉「先跳出 LINE」那一步(其他瀏覽器會無視這個參數)。
export function installShareUrl(): string {
  return `${window.location.origin}/install?openExternalBrowser=1`
}

export function InstallPage() {
  const { t } = useTranslation()
  const [detected] = useState(() => detectPlatform())
  const { hasPrompt, installed } = useInstallPrompt()
  const platform: Platform = installed ? 'installed' : detected
  const [promptWaited, setPromptWaited] = useState(false)
  const [installing, setInstalling] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const shareUrl = installShareUrl()
  const { copied, copy } = useCopy(shareUrl)

  useEffect(() => {
    // Chrome 會晚一點才發 beforeinstallprompt;等 2 秒還沒來就先顯示手動說明
    const timer = setTimeout(() => setPromptWaited(true), 2000)
    return () => clearTimeout(timer)
  }, [])

  async function onInstall() {
    setInstalling(true)
    const r = await promptInstall() // accepted → store 標 installed → 畫面切「已裝好」
    setInstalling(false)
    if (r !== 'accepted') setDismissed(true)
  }

  return (
    <div className="min-h-screen bg-brand-bg">
      {/* 底部多留空,最後一張卡才不會被 fixed 的語言鈕蓋住 */}
      <div className="max-w-md mx-auto px-5 pt-10 pb-28 space-y-6">
        {/* 頭:圖示 + 名字 + 一句話 */}
        <div className="text-center space-y-3">
          <img
            src="/icon-192.png"
            alt=""
            width={96}
            height={96}
            className="mx-auto rounded-[22px] shadow-lg shadow-pink-200"
          />
          <h1 className="text-3xl font-extrabold text-gray-800">{t('InstallPage.title')}</h1>
          <p className="text-gray-500">{t('InstallPage.tagline')}</p>
          <div className="flex flex-wrap justify-center gap-2 text-xs font-bold">
            <span className="bg-brand-mint text-emerald-800 px-3 py-1 rounded-full">{t('InstallPage.chips.free')}</span>
            <span className="bg-brand-yellow text-amber-800 px-3 py-1 rounded-full">{t('InstallPage.chips.noStore')}</span>
            <span className="bg-brand-lavender text-violet-800 px-3 py-1 rounded-full">{t('InstallPage.chips.login')}</span>
          </div>
        </div>

        {/* 主 CTA:依平台換內容 */}
        <div className="card space-y-4">
          {platform === 'installed' && (
            <>
              <p className="font-extrabold text-gray-800 text-lg">{t('InstallPage.installedTitle')}</p>
              <p className="text-sm text-gray-500">{t('InstallPage.installedBody')}</p>
              <a href="/" className="btn-primary block text-center">{t('InstallPage.openApp')}</a>
            </>
          )}

          {platform === 'line' && (
            <>
              <p className="font-extrabold text-gray-800 text-lg">{t('InstallPage.line.title')}</p>
              <p className="text-sm text-gray-500">{t('InstallPage.line.body')}</p>
              <img src="/install/line-1.jpg" alt="" width={640} height={640} className="w-44 mx-auto rounded-2xl" />
              <a href={lineExternalBrowserUrl()} className="btn-primary block text-center">
                {t('InstallPage.line.button')}
              </a>
            </>
          )}

          {platform === 'inapp' && (
            <>
              <p className="font-extrabold text-gray-800 text-lg">{t('InstallPage.inapp.title')}</p>
              <p className="text-sm text-gray-500">{t('InstallPage.inapp.body')}</p>
              {/android/i.test(navigator.userAgent) && (
                <a href={androidChromeIntentUrl()} className="btn-primary block text-center">
                  {t('InstallPage.inapp.chromeButton')}
                </a>
              )}
              <CopyRow url={shareUrl} copied={copied} onCopy={copy} />
            </>
          )}

          {platform === 'ios' && (
            <>
              <p className="font-extrabold text-gray-800 text-lg">{t('InstallPage.ios.title')}</p>
              <p className="text-sm text-gray-500">{t('InstallPage.ios.body')}</p>
              {!isIosSafari() && (
                <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-3 space-y-2">
                  <p className="text-xs font-bold text-amber-700">{t('InstallPage.ios.notSafari')}</p>
                  <CopyRow url={shareUrl} copied={copied} onCopy={copy} />
                </div>
              )}
              {/* 三格漫畫(astra 畫的吉祥物教學),文字步驟在下面補細節 */}
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="relative">
                    <img
                      src={`/install/ios-${n}.jpg`}
                      alt=""
                      width={640}
                      height={640}
                      loading="lazy"
                      className="w-full rounded-2xl bg-brand-bg"
                    />
                    <span className="absolute -top-1.5 -left-1.5 w-6 h-6 rounded-full bg-brand-pink text-white text-xs font-extrabold flex items-center justify-center shadow">
                      {n}
                    </span>
                  </div>
                ))}
              </div>
              <ol className="space-y-3">
                <Step n={1} icon={<span className="text-xl">🧭</span>} text={t('InstallPage.ios.step1')} />
                <Step n={2} icon={<ShareIcon />} text={t('InstallPage.ios.step2')} />
                <Step n={3} icon={<PlusBoxIcon />} text={t('InstallPage.ios.step3')} />
              </ol>
            </>
          )}

          {platform === 'android' && (
            <>
              <p className="font-extrabold text-gray-800 text-lg">{t('InstallPage.android.title')}</p>
              <p className="text-sm text-gray-500">{t('InstallPage.android.body')}</p>
              <img src="/install/android-1.jpg" alt="" width={640} height={640} className="w-44 mx-auto rounded-2xl" />
              {hasPrompt ? (
                <button onClick={onInstall} disabled={installing} className="btn-primary w-full text-lg disabled:opacity-60">
                  {installing ? t('InstallPage.android.installing') : t('InstallPage.android.button')}
                </button>
              ) : promptWaited || dismissed ? (
                <div className="bg-gray-50 rounded-2xl p-3 space-y-1">
                  <p className="text-sm font-bold text-gray-700">{t('InstallPage.android.fallbackTitle')}</p>
                  <p className="text-sm text-gray-500">{t('InstallPage.android.fallbackBody')}</p>
                </div>
              ) : (
                <button disabled className="btn-primary w-full text-lg opacity-60">
                  {t('InstallPage.android.button')}
                </button>
              )}
            </>
          )}

          {platform === 'desktop' && (
            <>
              <p className="font-extrabold text-gray-800 text-lg">{t('InstallPage.desktop.title')}</p>
              <p className="text-sm text-gray-500">{t('InstallPage.desktop.body')}</p>
              <div className="bg-white border-2 border-brand-pink rounded-2xl p-4 w-fit mx-auto">
                <QRCodeSVG value={shareUrl} size={180} fgColor="#1F2937" />
              </div>
              {hasPrompt && (
                <button onClick={onInstall} disabled={installing} className="btn-secondary w-full text-sm">
                  {t('InstallPage.desktop.installHere')}
                </button>
              )}
              <p className="text-xs text-gray-400">{t('InstallPage.desktop.orOpen')}</p>
              <CopyRow url={shareUrl} copied={copied} onCopy={copy} />
            </>
          )}

          {platform !== 'installed' && (
            <a href="/" className="block text-center text-sm font-bold text-brand-pink underline underline-offset-2">
              {t('InstallPage.useInBrowser')}
            </a>
          )}
        </div>

        {/* 為什麼要裝 */}
        <div className="card space-y-3">
          <p className="font-extrabold text-gray-800">{t('InstallPage.whyTitle')}</p>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex gap-2"><span>📌</span><span>{t('InstallPage.why1')}</span></li>
            <li className="flex gap-2"><span>🔔</span><span>{t('InstallPage.why2')}</span></li>
            <li className="flex gap-2"><span>⚡</span><span>{t('InstallPage.why3')}</span></li>
          </ul>
        </div>

        {/* 團主入口 */}
        <div className="card space-y-3 bg-gradient-to-br from-violet-50 to-white">
          <p className="font-extrabold text-gray-800">{t('InstallPage.hostTitle')}</p>
          <p className="text-sm text-gray-500">{t('InstallPage.hostBody')}</p>
          <a
            href={HOST_URL}
            className="block text-center font-bold py-3 rounded-2xl text-white bg-gradient-to-br from-violet-500 to-purple-600 shadow-md active:scale-95 transition-transform"
          >
            {t('InstallPage.hostButton')}
          </a>
        </div>
      </div>
    </div>
  )
}

function CopyRow({ url, copied, onCopy }: { url: string; copied: boolean; onCopy: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center gap-2">
      <input
        readOnly
        value={url}
        onFocus={(e) => e.target.select()}
        className="flex-1 min-w-0 text-xs bg-gray-50 rounded-xl px-3 py-2.5 text-gray-500"
      />
      <button
        onClick={onCopy}
        className={`shrink-0 px-3 py-2.5 rounded-xl text-xs font-bold transition-colors ${
          copied ? 'bg-emerald-500 text-white' : 'bg-brand-pink text-white'
        }`}
      >
        {copied ? `✓ ${t('InstallPage.copied')}` : t('InstallPage.copyLink')}
      </button>
    </div>
  )
}

function Step({ n, icon, text }: { n: number; icon: React.ReactNode; text: string }) {
  return (
    <li className="flex items-center gap-3">
      <span className="shrink-0 w-7 h-7 rounded-full bg-brand-pink text-white text-sm font-extrabold flex items-center justify-center">
        {n}
      </span>
      <span className="shrink-0 w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-700">
        {icon}
      </span>
      <span className="text-sm text-gray-700">{text}</span>
    </li>
  )
}

// iOS 分享鈕(方框 + 向上箭頭)— 畫出來比用文字形容清楚
function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v12" />
      <path d="M8 7l4-4 4 4" />
      <path d="M5 11v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8" />
    </svg>
  )
}

// iOS「加入主畫面」的方框加號
function PlusBoxIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  )
}
