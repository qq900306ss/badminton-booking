import { useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient, useIsMutating } from '@tanstack/react-query'
import { moderationApi, playerApi, sessionApi, type Block } from '../api/client'
import { isLoggedIn, getAccount } from '../lib/playerAuth'
import { useToast, errMsg } from '../components/Toast'
import i18n from '../i18n'

// 封鎖名單:全站共用一份 react-query 快取(['my-blocks']),場地板、大廳、進場頁、設定都讀這裡,
// 封鎖/解除時直接改快取 → 每個畫面「立即」生效,不等重抓。未登入視為空名單。
export const BLOCKS_KEY = ['my-blocks']

// 球友的封鎖 ref:有帳號用 account_ref(跨場次有效);團主手動加的名字/臨時加的人沒有帳號,
// 後端改用 "s:" + 那場的 player_id(只在那場有效)
export function playerBlockRef(p: { player_id: string; account_ref?: string }): string {
  return p.account_ref || `s:${p.player_id}`
}

// 上次成功的封鎖名單也存一份在裝置上:重開 App 時名單 API 剛好失敗,
// 不能退成空名單讓已封鎖的人又冒出來 → 先用裝置上的那份,背景持續重試。
// key 用 badminton_ 前綴:刪帳號的 clearAccountData 會一起清掉
function storedBlocksKey(): string | null {
  const id = getAccount()?.player_id
  return id ? `badminton_blocks_${id}` : null
}
function readStoredBlocks(): Block[] | undefined {
  try {
    const k = storedBlocksKey()
    const raw = k ? localStorage.getItem(k) : null
    return raw ? (JSON.parse(raw) as Block[]) : undefined
  } catch {
    return undefined
  }
}
function writeStoredBlocks(list: Block[]) {
  try {
    const k = storedBlocksKey()
    if (k) localStorage.setItem(k, JSON.stringify(list))
  } catch {
    /* 隱私模式 / 空間滿:只是少了離線備份 */
  }
}

export function useBlockList() {
  const loggedIn = isLoggedIn()
  const q = useQuery({
    queryKey: BLOCKS_KEY,
    queryFn: () => moderationApi.blocks().then((r) => r.data.data ?? []),
    enabled: loggedIn,
    staleTime: 5 * 60_000, // 只有自己會改(改的時候直接寫快取),不用常常重抓
    retry: 3,
    refetchInterval: (query) => (query.state.status === 'error' ? 30_000 : false), // 抓不到就一直重試,別停在沒名單
  })
  useEffect(() => {
    if (q.data) writeStoredBlocks(q.data)
  }, [q.data])
  const blocks = loggedIn ? (q.data ?? readStoredBlocks() ?? []) : []
  return { blocks, isLoading: loggedIn && q.isLoading }
}

// 判斷某個球友 / 團主是否已封鎖。比對規則照契約:account_ref 在名單內,或 "s:"+player_id 在名單內
export function useBlocked() {
  const { blocks } = useBlockList()
  return useMemo(() => {
    const players = new Set<string>()
    const orgs = new Set<string>()
    for (const b of blocks) (b.type === 'org' ? orgs : players).add(b.ref)
    return {
      isPlayerBlocked: (p: { player_id: string; account_ref?: string }) =>
        (!!p.account_ref && players.has(p.account_ref)) || players.has(`s:${p.player_id}`),
      isOrgBlocked: (orgId?: string) => !!orgId && orgs.has(orgId),
    }
  }, [blocks])
}

// 自己的 account_ref:場上同一個帳號的 slot 不給檢舉/封鎖自己。
// 登入回應 / PUT /players/me 的 Player 都帶 account_ref,快取的帳號有就直接用;
// 舊登入(上線前登入、快取裡沒有)才補打一次 GET /players/me
export function useMyAccountRef(): string | undefined {
  const cached = getAccount()?.account_ref
  const { data } = useQuery({
    queryKey: ['players-me'],
    queryFn: () => playerApi.me().then((r) => r.data.data),
    enabled: isLoggedIn() && !cached,
    staleTime: Infinity,
    retry: 1,
  })
  return cached || data?.account_ref || undefined
}

// 某場是哪個團主開的:SessionView 帶的 org_id(REST 與 WS 的 view 都有)。
// 保底:view 載到了卻沒有 org_id(舊版 API)才去大廳列表對(公開、開放中場次都有 org_id);
// 跟大廳共用 ['open-sessions'] 快取,從大廳點進來不會多打一次
export function useSessionOrgId(sessionId: string, view?: { org_id?: string }): string | undefined {
  const viewOrgId = view?.org_id
  const { data } = useQuery({
    queryKey: ['open-sessions'],
    queryFn: () => sessionApi.listOpen().then((r) => r.data.data),
    enabled: !!sessionId && !!view && !viewOrgId && isLoggedIn(),
    staleTime: 60_000,
  })
  return viewOrgId || data?.find((s) => s.session_id === sessionId)?.org_id || undefined
}

export type BlockTarget =
  | {
      type: 'player'
      sessionId: string
      playerId: string
      accountRef?: string
      name: string
      avatarUrl?: string
    }
  | { type: 'org'; sessionId: string; orgId?: string; name: string; avatarUrl?: string }

type Ctx = { prev?: Block[]; optimisticRef?: string }

// 封鎖送出中(還沒回來)就按解除,DELETE 會先到、POST 後到 → 伺服器又變回封鎖。
// 解除鈕在有封鎖送出中時先 disable(各處的 useBlockActions 是不同實例,用 mutationKey 跨元件看)
const BLOCK_MUTATION_KEY = ['block']
export function useBlockPending(): boolean {
  return useIsMutating({ mutationKey: BLOCK_MUTATION_KEY }) > 0
}

export function useBlockActions() {
  const qc = useQueryClient()
  const toast = useToast()

  const block = useMutation({
    mutationKey: BLOCK_MUTATION_KEY,
    mutationFn: (v: BlockTarget) =>
      moderationApi
        .block(
          v.type === 'player'
            ? { type: 'player', sessionId: v.sessionId, playerId: v.playerId }
            : { type: 'org', sessionId: v.sessionId }
        )
        .then((r) => r.data.data),
    // 樂觀更新:按下去那一刻就把對方從畫面上換掉(App Store 要求「立即」);
    // 團主那種要等後端回 org_id 才知道 ref(大廳/進場頁通常已知 orgId,一樣能先套)
    onMutate: async (v: BlockTarget): Promise<Ctx> => {
      await qc.cancelQueries({ queryKey: BLOCKS_KEY })
      const prev = qc.getQueryData<Block[]>(BLOCKS_KEY)
      const ref =
        v.type === 'player' ? playerBlockRef({ player_id: v.playerId, account_ref: v.accountRef }) : v.orgId
      if (!ref) return { prev }
      const optimistic: Block = {
        type: v.type,
        ref,
        name: v.name,
        avatar_url: v.avatarUrl,
        created_at: new Date().toISOString(),
      }
      qc.setQueryData<Block[]>(BLOCKS_KEY, (list = []) => [
        optimistic,
        ...list.filter((b) => !(b.type === v.type && b.ref === ref)),
      ])
      return { prev, optimisticRef: ref }
    },
    onSuccess: (b, v, ctx) => {
      // 換成伺服器那筆(冪等:已封鎖過回原本那筆)
      qc.setQueryData<Block[]>(BLOCKS_KEY, (list = []) => [
        b,
        ...list.filter((x) => !(x.type === v.type && (x.ref === b.ref || x.ref === ctx?.optimisticRef))),
      ])
      // 名單還沒載完就封鎖(上面 cancel 掉了那次抓取)→ 補抓一次完整名單
      if (!ctx?.prev) qc.invalidateQueries({ queryKey: BLOCKS_KEY })
      toast(i18n.t(v.type === 'org' ? 'useBlocks.blockedOrgToast' : 'useBlocks.blocked'), 'success')
    },
    onError: (e: unknown, v, ctx) => {
      // 只回滾這一筆(不整份換回 prev:同時送出的另一筆封鎖可能已經成功,不能被一起抹掉),再補抓對帳
      const ref = ctx?.optimisticRef
      if (ref) {
        const before = ctx?.prev?.find((x) => x.type === v.type && x.ref === ref) // 本來就封鎖過 → 放回原本那筆
        qc.setQueryData<Block[]>(BLOCKS_KEY, (list = []) => {
          const rest = list.filter((x) => !(x.type === v.type && x.ref === ref))
          return before ? [before, ...rest] : rest
        })
      }
      qc.invalidateQueries({ queryKey: BLOCKS_KEY })
      toast(errMsg(e))
    },
  })

  const unblock = useMutation({
    mutationFn: (b: Pick<Block, 'type' | 'ref'>) => moderationApi.unblock(b.type, b.ref),
    onMutate: async (b): Promise<Ctx> => {
      await qc.cancelQueries({ queryKey: BLOCKS_KEY })
      const prev = qc.getQueryData<Block[]>(BLOCKS_KEY)
      qc.setQueryData<Block[]>(BLOCKS_KEY, (list = []) =>
        list.filter((x) => !(x.type === b.type && x.ref === b.ref))
      )
      return { prev }
    },
    onSuccess: () => toast(i18n.t('useBlocks.unblocked'), 'info'),
    onError: (e: unknown, b, ctx) => {
      // 只放回這一筆(理由同封鎖的回滾),再補抓對帳
      const removed = ctx?.prev?.find((x) => x.type === b.type && x.ref === b.ref)
      if (removed)
        qc.setQueryData<Block[]>(BLOCKS_KEY, (list = []) => [
          removed,
          ...list.filter((x) => !(x.type === b.type && x.ref === b.ref)),
        ])
      qc.invalidateQueries({ queryKey: BLOCKS_KEY })
      toast(errMsg(e))
    },
  })

  return { block, unblock }
}
