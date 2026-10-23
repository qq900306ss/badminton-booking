import { tierOf } from './levels'

// 帳號預設程度 -1 = 選了「不透露」(場上不顯示、之後加入不再問);0 = 還沒選過
export const LEVEL_PRIVATE = -1

// 一行摘要:「Lv6・初中階」「不透露」;沒選過回空字串
export function levelSummary(level: number, t: (k: string, o?: Record<string, unknown>) => string): string {
  if (level === LEVEL_PRIVATE) return t('GuidedLevel.private')
  const tr = tierOf(level)
  return tr ? `Lv${level}・${tr.name}` : ''
}
