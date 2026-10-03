import type { PlayerSlot, SessionPlayer, SessionView } from '../api/client'

// WS v2 推播省流量:球場畫面裡場上 / 排隊的人只帶 player_id,名字、程度、場數、頭像、
// 帳號識別碼都從球員名單補回來(名單本來就有同一份資料,不必每次推播重送)。
// 補回來的格子跟 REST / v1 推播的 PlayerSlot 一模一樣,畫面元件完全不用知道有兩種格式。
// 名單裡找不到某個人(例如剛加入、名單還沒同步)→ 回傳 null,呼叫端改走重抓完整資料。
// 收到的若本來就是完整格子(v1 / 後端還沒更新)也照樣能補,結果相同。
const BLANK: PlayerSlot = { player_id: '', display_name: '', level: 0, games: 0 }

export function hydrateView(view: SessionView, players: SessionPlayer[] | undefined): SessionView | null {
  if (!players) return null
  const byId = new Map(players.map((p) => [p.player_id, p]))
  let missing = false
  const fill = (slot: Pick<PlayerSlot, 'player_id'>): PlayerSlot => {
    if (!slot.player_id) return BLANK
    const p = byId.get(slot.player_id)
    if (!p) {
      missing = true
      return BLANK
    }
    return {
      player_id: p.player_id,
      display_name: p.display_name,
      level: p.level,
      games: p.games ?? 0,
      avatar_url: p.avatar_url,
      account_ref: p.account_ref,
    }
  }
  const courts = view.courts.map((c) => ({ ...c, playing: c.playing.map(fill), queue: c.queue.map(fill) }))
  return missing ? null : { ...view, courts }
}
