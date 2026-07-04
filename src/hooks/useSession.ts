import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { sessionApi } from '../api/client'
import type { SessionView, PlayerSlot } from '../api/client'
import { useToast, errMsg } from '../components/Toast'

// 推送求快、輪詢對帳:WS 活著時資料由伺服器主動推,輪詢降到 60 秒只做
// 「對帳」(萬一哪則推播漏了,最多慢一分鐘自己追平);WS 斷線時回到 30 秒。
const reconcileMs = (live: boolean) => (live ? 60000 : 30000)

export function useSessionView(sessionId: string, live = false) {
  return useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => sessionApi.getView(sessionId).then((r) => r.data.data),
    refetchInterval: reconcileMs(live),
    enabled: !!sessionId,
  })
}

export function useSessionPlayers(sessionId: string, poll = false, live = false) {
  return useQuery({
    queryKey: ['session-players', sessionId],
    queryFn: () => sessionApi.getPlayers(sessionId).then((r) => r.data.data),
    enabled: !!sessionId,
    refetchInterval: poll ? reconcileMs(live) : false,
  })
}

const emptySlot = (): PlayerSlot => ({ player_id: '', display_name: '', level: 0, games: 0 })

export function useCourtActions(sessionId: string) {
  const qc = useQueryClient()
  const toast = useToast()
  const key = ['session', sessionId]
  const invalidate = () => qc.invalidateQueries({ queryKey: key })

  const myId = () => localStorage.getItem('player_id') || ''
  const meSlot = (): PlayerSlot => ({
    player_id: myId(),
    display_name: localStorage.getItem('display_name') || '',
    level: 0,
    games: 0,
  })

  // optimistic update wrapper: edit the cached view immediately, roll back on error
  function optimistic<V>(apply: (draft: SessionView, vars: V) => void) {
    return {
      onMutate: async (vars: V) => {
        await qc.cancelQueries({ queryKey: key })
        const prev = qc.getQueryData<SessionView>(key)
        if (prev) {
          const next = structuredClone(prev) as SessionView
          apply(next, vars)
          qc.setQueryData(key, next)
        }
        return { prev }
      },
      onError: (e: unknown, _v: V, ctx: { prev?: SessionView } | undefined) => {
        if (ctx?.prev) qc.setQueryData(key, ctx.prev)
        toast(errMsg(e))
        invalidate() // 回滾後跟伺服器對一次帳
      },
      // 成功不再 invalidate:WS 會推最新 view 過來(自己也收得到),省一次重抓
    }
  }

  const joinPlaying = useMutation({
    mutationFn: (v: { courtId: string; position: number; asPlayer?: string }) =>
      sessionApi.joinPlaying(sessionId, v.courtId, v.position, v.asPlayer),
    ...optimistic<{ courtId: string; position: number; asPlayer?: string }>((draft, v) => {
      if (v.asPlayer) return // family action: skip optimistic, rely on WS/refetch
      const id = myId()
      draft.courts.forEach((c) => {
        c.playing = c.playing.map((p) => (p.player_id === id ? emptySlot() : p))
        c.queue = c.queue.filter((p) => p.player_id !== id)
      })
      const c = draft.courts.find((cc) => cc.court_id === v.courtId)
      if (c && !c.playing[v.position]?.player_id) c.playing[v.position] = meSlot()
    }),
  })

  const leavePlaying = useMutation({
    mutationFn: (v: { courtId: string; asPlayer?: string }) =>
      sessionApi.leavePlaying(sessionId, v.courtId, v.asPlayer),
    ...optimistic<{ courtId: string; asPlayer?: string }>((draft, v) => {
      if (v.asPlayer) return
      const id = myId()
      const c = draft.courts.find((cc) => cc.court_id === v.courtId)
      if (c) c.playing = c.playing.map((p) => (p.player_id === id ? emptySlot() : p))
    }),
  })

  const leaveQueue = useMutation({
    mutationFn: (v: { courtId: string; asPlayer?: string }) =>
      sessionApi.leaveQueue(sessionId, v.courtId, v.asPlayer),
    ...optimistic<{ courtId: string; asPlayer?: string }>((draft, v) => {
      if (v.asPlayer) return
      const id = myId()
      const c = draft.courts.find((cc) => cc.court_id === v.courtId)
      if (c) c.queue = c.queue.filter((p) => p.player_id !== id)
    }),
  })

  const joinQueue = useMutation({
    mutationFn: (v: { courtId: string; asPlayer?: string }) =>
      sessionApi.joinQueue(sessionId, v.courtId, v.asPlayer),
    ...optimistic<{ courtId: string; asPlayer?: string }>((draft, v) => {
      if (v.asPlayer) return // family action: skip optimistic, rely on WS
      const id = myId()
      draft.courts.forEach((c) => {
        c.playing = c.playing.map((p) => (p.player_id === id ? emptySlot() : p))
        c.queue = c.queue.filter((p) => p.player_id !== id)
      })
      const c = draft.courts.find((cc) => cc.court_id === v.courtId)
      if (c && c.queue.length < 4) c.queue.push(meSlot())
    }),
  })

  const voteEnd = useMutation({
    mutationFn: (v: { courtId: string; asPlayer?: string }) =>
      sessionApi.voteEnd(sessionId, v.courtId, v.asPlayer),
    onSuccess: (r) => {
      invalidate()
      if (r.data.data.ended) toast('這場結束了,換下一組!', 'info')
    },
    onError: (e: unknown) => toast(errMsg(e)),
  })

  const addFamily = useMutation({
    mutationFn: (v: { name: string; level: number; avatar: string }) =>
      sessionApi.addFamily(sessionId, v.name, v.level, v.avatar),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['session-players', sessionId] })
      toast('已送出,等團主核准就能幫他排囉', 'info')
    },
    onError: (e: unknown) => toast(errMsg(e)),
  })

  const removeFamily = useMutation({
    mutationFn: (playerId: string) => sessionApi.removeFamily(sessionId, playerId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['session-players', sessionId] }),
    onError: (e: unknown) => toast(errMsg(e)),
  })

  return { joinPlaying, joinQueue, leaveQueue, leavePlaying, voteEnd, addFamily, removeFamily }
}
