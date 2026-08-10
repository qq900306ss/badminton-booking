import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'

// Growth CTA: a floating circular button on the player app inviting drop-in
// players to open their own group. Tapping opens a sheet with the host-console
// URL to COPY (a direct link is easy to lose — they'd never find their way back
// next time) plus how to install it as an app, incl. the iPhone/Safari dance.
// The circle is the visual anchor (bobs + glows); the invite sentence lives in a
// proper rounded speech bubble that pops in periodically, so no bare text floats.
const HOST_URL =
  (import.meta.env.VITE_HOST_APP_URL as string | undefined) ||
  'https://d1r9u0ja59y4rv.cloudfront.net'

function HostSheet({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(HOST_URL)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard blocked (rare) — the URL is selectable right above */
    }
  }

  return (
    <div className="pointer-events-auto fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl w-full max-w-md p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <span className="font-extrabold text-gray-800 text-lg">🏸 {t('HostCta.sheetTitle')}</span>
          <button onClick={onClose} className="text-sm font-bold text-gray-400 px-1">✕</button>
        </div>
        <p className="text-sm text-gray-500">{t('HostCta.sheetDesc')}</p>

        {/* 網址 + 複製:留著網址,下次才找得回來 */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={HOST_URL}
              onFocus={(e) => e.target.select()}
              className="flex-1 min-w-0 text-xs bg-gray-50 rounded-xl px-3 py-2.5 text-gray-500"
            />
            <button
              onClick={copy}
              className={`shrink-0 px-3 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                copied ? 'bg-emerald-500 text-white' : 'bg-gradient-to-br from-pink-500 to-rose-500 text-white'
              }`}
            >
              {copied ? `✓ ${t('HostCta.copied')}` : t('HostCta.copyUrl')}
            </button>
          </div>
          <p className="text-[11px] text-gray-400">{t('HostCta.copyHint')}</p>
        </div>

        <a
          href={HOST_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full text-center rounded-2xl py-3 text-sm font-bold text-white
            bg-gradient-to-br from-pink-500 to-rose-500 active:scale-95 transition-transform"
        >
          {t('HostCta.openSite')} ↗
        </a>

        {/* 可以裝成 App —— iPhone 沒有安裝鈕,要教 Safari 加入主畫面 */}
        <div className="rounded-2xl bg-gray-50 p-3 space-y-1.5">
          <p className="text-xs font-bold text-gray-600">💡 {t('HostCta.installTitle')}</p>
          <p className="text-xs text-gray-500">🤖 {t('HostCta.installAndroid')}</p>
          <p className="text-xs text-gray-500">🍎 {t('HostCta.installIos')}</p>
          <p className="text-[11px] text-gray-400">{t('HostCta.installInApp')}</p>
        </div>
      </motion.div>
    </div>
  )
}

export function HostCta() {
  const { t } = useTranslation()
  const [showBubble, setShowBubble] = useState(true)
  const [sheet, setSheet] = useState(false)

  // Show the bubble briefly on mount, then re-tease it every ~30s. Gentle enough
  // not to nag, present enough to keep the invite discoverable.
  useEffect(() => {
    const hide0 = setTimeout(() => setShowBubble(false), 6000)
    const cycle = setInterval(() => {
      setShowBubble(true)
      setTimeout(() => setShowBubble(false), 6000)
    }, 30000)
    return () => {
      clearTimeout(hide0)
      clearInterval(cycle)
    }
  }, [])

  return (
    <div className="fixed bottom-6 right-5 z-40 flex flex-col items-end gap-2 pointer-events-none">
      <AnimatePresence>
        {showBubble && (
          <motion.div
            key="bubble"
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 380, damping: 24 }}
            className="pointer-events-auto relative mr-1 max-w-[13rem] rounded-2xl bg-white px-3 py-2
              shadow-lg ring-1 ring-black/5"
          >
            <p className="text-sm font-bold text-gray-700 pr-4">{t('HostCta.bubble')}</p>
            <button
              onClick={() => setShowBubble(false)}
              aria-label={t('HostCta.dismiss')}
              className="absolute top-1 right-1.5 text-gray-400 hover:text-gray-600 text-xs font-bold leading-none"
            >
              ✕
            </button>
            {/* tail pointing down toward the circle (right-6 lines the tip up with the circle centre) */}
            <span className="absolute -bottom-1 right-6 w-3 h-3 bg-white rotate-45 ring-1 ring-black/5" />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
        className="pointer-events-auto relative"
      >
        {/* soft breathing glow behind the circle */}
        <motion.span
          aria-hidden
          animate={{ scale: [1, 1.25, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
          className="absolute inset-0 rounded-full bg-rose-500 blur-md"
        />
        <button
          onClick={() => setSheet(true)}
          aria-label={t('HostCta.aria')}
          className="relative flex h-16 w-16 flex-col items-center justify-center rounded-full
            bg-gradient-to-br from-pink-500 to-rose-500 text-white shadow-lg ring-4 ring-white
            active:scale-90 transition-transform"
        >
          <span className="text-2xl leading-none drop-shadow-sm">🏸</span>
          <span className="mt-0.5 text-[11px] font-extrabold [text-shadow:0_1px_2px_rgb(0_0_0_/_0.35)]">{t('HostCta.button')}</span>
        </button>
      </motion.div>

      <AnimatePresence>
        {sheet && <HostSheet onClose={() => setSheet(false)} />}
      </AnimatePresence>
    </div>
  )
}
