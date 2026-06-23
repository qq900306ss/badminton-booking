import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { sessionApi, type SessionSummary } from '../api/client'
import { InstallButton } from '../components/InstallButton'

function fmtRange(s: SessionSummary): string {
  if (!s.start_at) return ''
  const start = new Date(s.start_at)
  const hm = (d: Date) =>
    d.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false })
  const day = `${start.getMonth() + 1}/${start.getDate()}`
  const tail = s.end_at ? `–${hm(new Date(s.end_at))}` : ''
  return `${day} ${hm(start)}${tail}`
}

function Intro({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2600)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center
        bg-gradient-to-br from-brand-pink via-brand-peach to-brand-yellow"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* floating sparkles */}
      {['✨', '🏸', '⭐️', '🎉'].map((e, i) => (
        <motion.span
          key={i}
          className="absolute text-3xl"
          style={{ left: `${15 + i * 22}%`, top: `${20 + (i % 2) * 50}%` }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: [0, 1, 0], y: [-10, -40] }}
          transition={{ duration: 2, delay: i * 0.25, repeat: Infinity }}
        >
          {e}
        </motion.span>
      ))}

      <motion.div
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 12 }}
        className="text-7xl mb-4 drop-shadow"
      >
        🏸
      </motion.div>
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-4xl font-extrabold text-white drop-shadow-md"
      >
        羽球揪團
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-white/90 font-semibold mt-2"
      >
        找場、排隊、上場 一指搞定
      </motion.p>

      <button
        onClick={onDone}
        className="absolute bottom-10 bg-white/90 text-gray-700 font-bold
          px-6 py-2.5 rounded-2xl shadow-lg active:scale-95 transition-transform"
      >
        跳過 →
      </button>
    </motion.div>
  )
}

export function LobbyPage() {
  const nav = useNavigate()
  const [showIntro, setShowIntro] = useState(
    () => sessionStorage.getItem('intro_seen') !== '1'
  )

  function dismissIntro() {
    sessionStorage.setItem('intro_seen', '1')
    setShowIntro(false)
  }

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['open-sessions'],
    queryFn: () => sessionApi.listOpen().then((r) => r.data.data),
    refetchInterval: 10000,
  })

  const list = (sessions ?? []).slice().sort((a, b) =>
    (a.start_at || a.opened_at).localeCompare(b.start_at || b.opened_at)
  )

  return (
    <div className="min-h-screen bg-brand-bg">
      <AnimatePresence>{showIntro && <Intro onDone={dismissIntro} />}</AnimatePresence>

      <header className="px-4 pt-8 pb-4 text-center">
        <div className="text-5xl mb-2">🏸</div>
        <h1 className="text-2xl font-extrabold text-gray-800">今天打哪場?</h1>
        <p className="text-gray-400 text-sm mt-1">選一個正在開放的球局加入</p>
      </header>

      <div className="max-w-md mx-auto p-4 space-y-3">
        <InstallButton />

        {isLoading && (
          <div className="text-center py-10">
            <div className="text-3xl animate-bounce">🏸</div>
          </div>
        )}

        {!isLoading && list.length === 0 && (
          <div className="card text-center py-10 space-y-2">
            <div className="text-4xl">😴</div>
            <p className="font-bold text-gray-600">目前沒有開放中的球局</p>
            <p className="text-sm text-gray-400">等團主開團,或直接掃 QR Code 進場</p>
          </div>
        )}

        {list.map((s) => (
          <motion.button
            key={s.session_id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => nav(`/?s=${s.session_id}`)}
            className="card w-full text-left flex items-center justify-between
              active:scale-[0.98] transition-transform"
          >
            <div>
              <p className="font-extrabold text-gray-800 text-lg">{s.title || '羽球團'}</p>
              <p className="text-sm text-gray-400 mt-0.5">
                {fmtRange(s) && <span>{fmtRange(s)} · </span>}
                {s.num_courts} 個球場
              </p>
            </div>
            <span className="bg-brand-pink text-white font-bold px-4 py-2 rounded-2xl text-sm">
              加入 →
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  )
}
