import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { sessionApi } from '../api/client'
import { useToast, errMsg } from '../components/Toast'

export function useSessionView(sessionId: string) {
  return useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => sessionApi.getView(sessionId).then((r) => r.data.data),
    refetchInterval: 3000,
    enabled: !!sessionId,
  })
}

export function useSessionPlayers(sessionId: string) {
  return useQuery({
    queryKey: ['session-players', sessionId],
    queryFn: () => sessionApi.getPlayers(sessionId).then((r) => r.data.data),
    enabled: !!sessionId,
  })
}

export function useCourtActions(sessionId: string) {
  const qc = useQueryClient()
  const toast = useToast()
  const invalidate = () => qc.invalidateQueries({ queryKey: ['session', sessionId] })
  const onError = (e: unknown) => toast(errMsg(e))

  const joinPlaying = useMutation({
    mutationFn: (v: { courtId: string; position: number }) =>
      sessionApi.joinPlaying(sessionId, v.courtId, v.position),
    onSuccess: invalidate,
    onError,
  })
  const joinQueue = useMutation({
    mutationFn: (courtId: string) => sessionApi.joinQueue(sessionId, courtId),
    onSuccess: invalidate,
    onError,
  })
  const leaveQueue = useMutation({
    mutationFn: (courtId: string) => sessionApi.leaveQueue(sessionId, courtId),
    onSuccess: invalidate,
    onError,
  })
  const leavePlaying = useMutation({
    mutationFn: (courtId: string) => sessionApi.leavePlaying(sessionId, courtId),
    onSuccess: invalidate,
    onError,
  })

  return { joinPlaying, joinQueue, leaveQueue, leavePlaying }
}
