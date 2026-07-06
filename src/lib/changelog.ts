// User-facing changelog shown in the「更新資訊」modal. Newest first. Keep entries
// short and in plain language (player audience).
import i18n from '../i18n'

// Dates are data (not translated); the bullet items live in the changelog
// locale fragments keyed by date and are read lazily at call time.
const DATES = ['2026/07/06', '2026/07/05', '2026/07/03', '2026/07/01', '2026/06/30', '2026/06/29']

export function getChangelog(): { date: string; items: string[] }[] {
  return DATES.map((date) => ({
    date,
    items: i18n.t(`changelog.${date}`, { returnObjects: true }) as unknown as string[],
  }))
}
