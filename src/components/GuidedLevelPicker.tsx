import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TIERS, LEVEL_DESC, tierOf } from '../lib/levels'
import { LEVEL_PRIVATE } from '../lib/levelChoice'

// 引導式選程度:先選「大概是哪一段」(7 段,各有白話說明),再在那一段的 2-3 個等級裡看描述挑一個。
// 不用從 18 個數字裡猜,選出來還是精確的 1-18。也可以選「不透露」(-1:場上不顯示、帳號記住、之後不再問)。


export function GuidedLevelPicker({ value, onChange }: { value: number; onChange: (level: number) => void }) {
  const { t } = useTranslation()
  const current = tierOf(value)
  // 已經選過某一級 → 直接打開那一段;否則從第一步開始
  const [tierIdx, setTierIdx] = useState<number | null>(() => (current ? TIERS.indexOf(current) : null))
  const tier = tierIdx !== null ? TIERS[tierIdx] : null

  if (!tier) {
    return (
      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-400">{t('GuidedLevel.step1')}</p>
        <div className="space-y-1.5">
          {TIERS.map((tr, i) => (
            <button
              key={tr.min}
              type="button"
              onClick={() => setTierIdx(i)}
              className="w-full text-left flex items-center gap-3 rounded-2xl bg-white border-2 border-gray-100 px-3 py-2.5 active:scale-[0.99] transition-transform hover:border-brand-pink/60"
            >
              <span className={`shrink-0 text-[11px] font-extrabold px-2 py-1 rounded-full ${tr.chip}`}>
                {tr.min}–{tr.max}
              </span>
              <span className="min-w-0">
                <span className="block font-extrabold text-gray-700 text-sm">{tr.name}</span>
                <span className="block text-xs text-gray-400">{tr.note}</span>
              </span>
            </button>
          ))}
        </div>
        <PrivateLink value={value} onChange={onChange} />
      </div>
    )
  }

  const levels = Array.from({ length: tier.max - tier.min + 1 }, (_, i) => tier.min + i)
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-400">{t('GuidedLevel.step2', { tier: tier.name })}</p>
        <button type="button" onClick={() => setTierIdx(null)} className="text-xs font-bold text-brand-pink">
          ‹ {t('GuidedLevel.backToTiers')}
        </button>
      </div>
      <div className="space-y-1.5">
        {levels.map((lv) => {
          const selected = value === lv
          return (
            <button
              key={lv}
              type="button"
              onClick={() => onChange(lv)}
              className={`w-full text-left flex items-start gap-3 rounded-2xl border-2 px-3 py-2.5 transition-colors ${
                selected ? 'border-brand-pink bg-brand-pink/10' : 'border-gray-100 bg-white'
              }`}
            >
              <span className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-lg font-extrabold ${tier.chip}`}>{lv}</span>
              <span className="text-sm text-gray-600 leading-snug pt-0.5">{LEVEL_DESC[lv]}</span>
              {selected && <span className="shrink-0 ml-auto text-brand-pink font-extrabold">✓</span>}
            </button>
          )
        })}
      </div>
      <PrivateLink value={value} onChange={onChange} />
    </div>
  )
}

// 不透露:放成不起眼的小字(大部分人都會選等級)
function PrivateLink({ value, onChange }: { value: number; onChange: (level: number) => void }) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      onClick={() => onChange(value === LEVEL_PRIVATE ? 0 : LEVEL_PRIVATE)}
      className={`block mx-auto text-xs font-semibold pt-1 ${value === LEVEL_PRIVATE ? 'text-gray-700 underline' : 'text-gray-400'}`}
    >
      {value === LEVEL_PRIVATE ? `✓ ${t('GuidedLevel.private')}` : t('GuidedLevel.preferNot')}
    </button>
  )
}
