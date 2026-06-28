import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { sessionApi } from '../api/client'
import type { SessionView, PlayerSlot } from '../api/client'
import { useToast, errMsg } from '../components/Toast'

export function useSessionView(sessionId: string) {
  return useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => sessionApi.getView(sessionId).then((r) => r.data.data),
    // CourtPage connects a WebSocket that invalidates this on every change;
    // this slow interval is only a fallback for a dropped socket.
    refetchInterval: 30000,
    enabled: !!sessionId,
  })
}

export function useSessionPlayers(sessionId: string, poll = false) {
  return useQuery({
    queryKey: ['session-players', sessionId],
    queryFn: () => sessionApi.getPlayers(sessionId).then((r) => r.data.data),
    enabled: !!sessionId,
    refetchInterval: poll ? 30000 : false, // WS-driven; slow fallback only
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
      },
      onSettled: () => invalidate(),
    }
  }

  const joinPlaying = useMutation({
    mutationFn: (v: { courtId: string; position: number }) =>
      sessionApi.joinPlaying(sessionId, v.courtId, v.position),
    ...optimistic<{ courtId: string; position: number }>((draft, v) => {
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
    mutationFn: (courtId: string) => sessionApi.leavePlaying(sessionId, courtId),
    ...optimistic<string>((draft, courtId) => {
      const id = myId()
      const c = draft.courts.find((cc) => cc.court_id === courtId)
      if (c) c.playing = c.playing.map((p) => (p.player_id === id ? emptySlot() : p))
    }),
  })

  const leaveQueue = useMutation({
    mutationFn: (courtId: string) => sessionApi.leaveQueue(sessionId, courtId),
    ...optimistic<string>((draft, courtId) => {
      const id = myId()
      const c = draft.courts.find((cc) => cc.court_id === courtId)
      if (c) c.queue = c.queue.filter((p) => p.player_id !== id)
    }),
  })

  const joinQueue = useMutation({
    mutationFn: (courtId: string) => sessionApi.joinQueue(sessionId, courtId),
    onSuccess: invalidate,
    onError: (e: unknown) => toast(errMsg(e)),
  })

  const voteEnd = useMutation({
    mutationFn: (courtId: string) => sessionApi.voteEnd(sessionId, courtId),
    onSuccess: (r) => {
      invalidate()
      if (r.data.data.ended) toast('這場結束了,換下一組!', 'info')
    },
    onError: (e: unknown) => toast(errMsg(e)),
  })

  return { joinPlaying, joinQueue, leaveQueue, leavePlaying, voteEnd }
}
