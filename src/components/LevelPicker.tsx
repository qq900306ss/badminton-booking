import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TIERS, LEVEL_DESC, tierOf } from '../lib/levels'

export function LevelReference({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-white w-full sm:max-w-md max-h-[85vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-5"
        initial={{ y: 40 }}
        animate={{ y: 0 }}
        exit={{ y: 40 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-extrabold text-gray-800 text-lg">羽球程度分級</h3>
          <button onClick={onClose} className="text-gray-400 text-xl">✕</button>
        </div>
        <p className="text-xs text-gray-400 mb-4">台灣羽球推廣協會 分級制度,挑一個最接近自己的</p>
        <div className="space-y-4">
          {TIERS.map((t) => (
            <div key={t.name}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${t.chip}`}>
                  {t.name} · {t.min}–{t.max}
                </span>
                <span className="text-xs text-gray-400">{t.note}</span>
              </div>
              <div className="space-y-1 pl-1">
                {Array.from({ length: t.max - t.min + 1 }, (_, i) => t.min + i).map((lv) => (
                  <div key={lv} className="flex gap-2 text-sm">
                    <span className="font-bold text-gray-500 w-5 shrink-0">{lv}</span>
                    <span className="text-gray-600">{LEVEL_DESC[lv]}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}

interface Props {
  value: number
  onChange: (level: number) => void
}

export function LevelPicker({ value, onChange }: Props) {
  const [showRef, setShowRef] = useState(false)
  const tier = tierOf(value)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-gray-600">你的羽球程度</span>
        <button
          type="button"
          onClick={() => setShowRef(true)}
          className="text-xs text-brand-pink font-semibold"
        >
          ❓ 看分級說明
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {TIERS.flatMap((t) =>
          Array.from({ length: t.max - t.min + 1 }, (_, i) => t.min + i).map((lv) => {
            const selected = value === lv
            return (
              <button
                type="button"
                key={lv}
                onClick={() => onChange(selected ? 0 : lv)}
                className={`w-9 h-9 rounded-xl font-bold text-sm transition-all ${t.chip}
                  ${selected ? 'ring-2 ring-offset-1 ring-gray-700 scale-110' : 'opacity-80'}`}
              >
                {lv}
              </button>
            )
          })
        )}
      </div>

      <p className="text-xs text-gray-400 h-4">
        {tier ? `${tier.name} · 第 ${value} 級` : '不確定就先填 3,團主之後可再幫你調整 👍'}
      </p>

      <AnimatePresence>
        {showRef && <LevelReference onClose={() => setShowRef(false)} />}
      </AnimatePresence>
    </div>
  )
}
