import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'

type BIPEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: string }>
}

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

type Help = null | 'ios' | 'inapp' | 'generic'

export function InstallButton({ label }: { label?: string }) {
  const { t } = useTranslation()
  const displayLabel = label ?? t('InstallButton.installLabel')
  const [deferred, setDeferred] = useState<BIPEvent | null>(null)
  const [help, setHelp] = useState<Help>(null)
  const [installed, setInstalled] = useState(false)
  const [copied, setCopied] = useState(false)

  const ua = navigator.userAgent || ''
  const isIos = /iphone|ipad|ipod/i.test(ua)
  // in-app browsers (FB / Messenger / IG / LINE / WeChat …) can't install PWAs
  const isInApp = /FBAN|FBAV|FB_IAB|Instagram|Line\/|Messenger|MicroMessenger|Twitter|musical_ly|Snapchat/i.test(ua)

  useEffect(() => {
    if (isStandalone()) setInstalled(true)
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BIPEvent)
    }
    const onInstalled = () => setInstalled(true)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (installed) return null

  async function onClick() {
    if (deferred) {
      await deferred.prompt()
      setDeferred(null)
      return
    }
    setHelp(isInApp ? 'inapp' : isIos ? 'ios' : 'generic')
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* ignore */
    }
  }

  return (
    <>
      <button
        onClick={onClick}
        className="w-full bg-white border-2 border-brand-pink text-brand-pink font-bold
          py-2.5 rounded-2xl shadow-sm active:scale-95 transition-transform"
      >
        {displayLabel}
      </button>

      <AnimatePresence>
        {help && (
          <motion.div
            className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setHelp(null)}
          >
            <motion.div
              className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl p-6 space-y-3"
              initial={{ y: 40 }}
              animate={{ y: 0 }}
              exit={{ y: 40 }}
              onClick={(e) => e.stopPropagation()}
            >
              {help === 'inapp' && (
                <>
                  <p className="font-extrabold text-gray-800 text-lg">{t('InstallButton.inapp.title')} 🏸</p>
                  <p className="text-gray-600 text-sm">
                    {t('InstallButton.inapp.body')}{' '}
                    {t('InstallButton.inapp.useInstead')}<b>Chrome</b>{t('InstallButton.inapp.or')}<b>Safari</b>{t('InstallButton.inapp.openSuffix')}
                  </p>
                  <ol className="text-gray-600 text-sm space-y-1.5 list-decimal list-inside">
                    <li>{t('InstallButton.inapp.step1Prefix')}<b>⋯</b>{t('InstallButton.inapp.step1Suffix')}</li>
                    <li>{t('InstallButton.inapp.step2Prefix')}<b>{t('InstallButton.inapp.step2Bold')}</b>{t('InstallButton.inapp.step2Suffix')}</li>
                    <li>{t('InstallButton.inapp.step3')}</li>
                  </ol>
                  <button onClick={copyLink} className="btn-secondary w-full text-sm">
                    {copied ? `✓ ${t('InstallButton.copied')}` : t('InstallButton.copyLink')}
                  </button>
                </>
              )}

              {help === 'ios' && (
                <>
                  <p className="font-extrabold text-gray-800 text-lg">{t('InstallButton.ios.title')} 🏸</p>
                  <ol className="text-gray-600 text-sm space-y-2 list-decimal list-inside">
                    <li>{t('InstallButton.ios.step1Prefix')}<b>Safari</b>{t('InstallButton.ios.step1Suffix')}</li>
                    <li>{t('InstallButton.ios.step2Prefix')}<b>{t('InstallButton.ios.step2Bold')}</b>{t('InstallButton.ios.step2Suffix')}</li>
                    <li>{t('InstallButton.ios.step3Prefix')}<b>{t('InstallButton.ios.step3Bold')}</b>{t('InstallButton.ios.step3Suffix')}</li>
                    <li>{t('InstallButton.ios.step4Prefix')}<b>{t('InstallButton.ios.step4Bold')}</b>{t('InstallButton.ios.step4Suffix')}</li>
                  </ol>
                </>
              )}

              {help === 'generic' && (
                <>
                  <p className="font-extrabold text-gray-800 text-lg">{t('InstallButton.generic.title')} 🏸</p>
                  <p className="text-gray-600 text-sm">
                    {t('InstallButton.generic.part1')}<b>⋮</b>{t('InstallButton.generic.part2')}<b>{t('InstallButton.generic.bold1')}</b>{t('InstallButton.generic.mid')}<b>{t('InstallButton.generic.bold2')}</b>{t('InstallButton.generic.part3')}
                  </p>
                </>
              )}

              <button onClick={() => setHelp(null)} className="btn-primary w-full">{t('InstallButton.gotIt')}</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
