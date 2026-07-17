import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'

// Growth CTA: a floating circular button on the player app inviting drop-in
// players to open their own group — taps through to the host console (admin).
// The circle is the visual anchor (bobs + glows); the invite sentence lives in a
// proper rounded speech bubble that pops in periodically, so no bare text floats.
const HOST_URL =
  (import.meta.env.VITE_HOST_APP_URL as string | undefined) ||
  'https://d1r9u0ja59y4rv.cloudfront.net'

export function HostCta() {
  const { t } = useTranslation()
  const [showBubble, setShowBubble] = useState(true)

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
        <a
          href={HOST_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t('HostCta.aria')}
          className="relative flex h-16 w-16 flex-col items-center justify-center rounded-full
            bg-gradient-to-br from-pink-500 to-rose-500 text-white shadow-lg ring-4 ring-white
            active:scale-90 transition-transform"
        >
          <span className="text-2xl leading-none drop-shadow-sm">🏸</span>
          <span className="mt-0.5 text-[11px] font-extrabold [text-shadow:0_1px_2px_rgb(0_0_0_/_0.35)]">{t('HostCta.button')}</span>
        </a>
      </motion.div>
    </div>
  )
}
