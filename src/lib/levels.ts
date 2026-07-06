// 台灣羽球推廣協會 羽球程度分級制度 (1-18)

import i18n from '../i18n'

export interface LevelTier {
  name: string
  min: number
  max: number
  note: string // 球齡 / 對應零打團程度
  avatarBg: string // full Tailwind classes (literal, so JIT keeps them)
  chip: string
}

// name/note are lazy getters so they re-read the current language on each access
export const TIERS: LevelTier[] = [
  { get name() { return i18n.t('levels.tier1Name') }, min: 1, max: 3, get note() { return i18n.t('levels.tier1Note') }, avatarBg: 'bg-rose-300', chip: 'bg-rose-100 text-rose-600' },
  { get name() { return i18n.t('levels.tier2Name') }, min: 4, max: 5, get note() { return i18n.t('levels.tier2Note') }, avatarBg: 'bg-emerald-300', chip: 'bg-emerald-100 text-emerald-700' },
  { get name() { return i18n.t('levels.tier3Name') }, min: 6, max: 7, get note() { return i18n.t('levels.tier3Note') }, avatarBg: 'bg-teal-300', chip: 'bg-teal-100 text-teal-700' },
  { get name() { return i18n.t('levels.tier4Name') }, min: 8, max: 9, get note() { return i18n.t('levels.tier4Note') }, avatarBg: 'bg-amber-300', chip: 'bg-amber-100 text-amber-700' },
  { get name() { return i18n.t('levels.tier5Name') }, min: 10, max: 12, get note() { return i18n.t('levels.tier5Note') }, avatarBg: 'bg-sky-300', chip: 'bg-sky-100 text-sky-700' },
  { get name() { return i18n.t('levels.tier6Name') }, min: 13, max: 15, get note() { return i18n.t('levels.tier6Note') }, avatarBg: 'bg-slate-400', chip: 'bg-slate-100 text-slate-700' },
  { get name() { return i18n.t('levels.tier7Name') }, min: 16, max: 18, get note() { return i18n.t('levels.tier7Note') }, avatarBg: 'bg-violet-400', chip: 'bg-violet-100 text-violet-700' },
]

export function tierOf(level: number): LevelTier | null {
  if (!level) return null
  return TIERS.find((t) => level >= t.min && level <= t.max) ?? null
}

// per-level skill description (從分級表轉錄) — lazy getters keyed by level
export const LEVEL_DESC: Record<number, string> = {
  get 1() { return i18n.t('levels.desc1') },
  get 2() { return i18n.t('levels.desc2') },
  get 3() { return i18n.t('levels.desc3') },
  get 4() { return i18n.t('levels.desc4') },
  get 5() { return i18n.t('levels.desc5') },
  get 6() { return i18n.t('levels.desc6') },
  get 7() { return i18n.t('levels.desc7') },
  get 8() { return i18n.t('levels.desc8') },
  get 9() { return i18n.t('levels.desc9') },
  get 10() { return i18n.t('levels.desc10') },
  get 11() { return i18n.t('levels.desc11') },
  get 12() { return i18n.t('levels.desc12') },
  get 13() { return i18n.t('levels.desc13') },
  get 14() { return i18n.t('levels.desc14') },
  get 15() { return i18n.t('levels.desc15') },
  get 16() { return i18n.t('levels.desc16') },
  get 17() { return i18n.t('levels.desc17') },
  get 18() { return i18n.t('levels.desc18') },
}
