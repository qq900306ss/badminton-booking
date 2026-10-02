import { useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient, useIsMutating, type QueryClient } from '@tanstack/react-query'
import { moderationApi, playerApi, sessionApi, type Block } from '../api/client'
import { isLoggedIn, getAccount } from '../lib/playerAuth'
import { useToast, errMsg } from '../components/Toast'
import i18n from '../i18n'

// 封鎖名單:全站共用一份 react-query 快取(['my-blocks', 帳號 id]),場地板、大廳、進場頁、設定都讀這裡,
// 封鎖/解除時直接改快取 → 每個畫面「立即」生效,不等重抓。未登入視為空名單。
// key 綁帳號:另一個分頁換了帳號,舊帳號晚到的回應不會寫進新帳號的名單/裝置備份
function blocksKey(accountId: string) {
  return ['my-blocks', accountId]
}
function currentAccountId(): string | undefined {
  if (!isLoggedIn()) return undefined
  return getAccount()?.player_id || 'me' // 舊登入沒快取帳號:照樣抓,只是不存裝置備份
}

// 球友的封鎖 ref:有帳號用 account_ref(跨場次有效);團主手動加的名字/臨時加的人沒有帳號,
// 後端改用 "s:" + 那場的 player_id(只在那場有效)
export function playerBlockRef(p: { player_id: string; account_ref?: string }): string {
  return p.account_ref || `s:${p.player_id}`
}

// 上次的封鎖名單也存一份在裝置上,當成快取的初始值:重開 App 時名單 API 剛好失敗,
// 不能退成空名單讓已封鎖的人又冒出來 → 先用裝置上的那份,背景持續重試。
// key 用 badminton_ 前綴:刪帳號的 clearAccountData 會一起清掉
function storageKey(accountId: string): string | null {
  return accountId === 'me' ? null : `badminton_blocks_${accountId}`
}
function readStoredBlocks(accountId: string): Block[] | undefined {
  try {
    const k = storageKey(accountId)
    const raw = k ? localStorage.getItem(k) : null
    return raw ? (JSON.parse(raw) as Block[]) : undefined
  } catch {
    return undefined
  }
}
function writeStoredBlocks(accountId: string, list: Block[]) {
  try {
    const k = storageKey(accountId)
    if (k) localStorage.setItem(k, JSON.stringify(list))
  } catch {
    /* 隱私模式 / 空間滿:只是少了離線備份 */
  }
}

// 封鎖送出中(還沒回來)就按解除,DELETE 會先到、POST 後到 → 伺服器又變回封鎖。
// 解除鈕在有封鎖送出中時先 disable(各處的 useBlockActions 是不同實例,用 mutationKey 跨元件看)
const BLOCK_MUTATION_KEY = ['block']
const UNBLOCK_MUTATION_KEY = ['unblock']
export function useBlockPending(): boolean {
  return useIsMutating({ mutationKey: BLOCK_MUTATION_KEY }) > 0
}
// 封鎖/解除進行中時不重抓名單:較早送出的 GET 晚回來會蓋掉剛成功的那筆。
// 只算同一個帳號的(還沒跑完 onMutate、不知道 key 的也算進去,寧可晚點對帳)
function pendingWrites(qc: QueryClient, key: readonly unknown[]): number {
  const want = JSON.stringify(key)
  return qc.isMutating({
    predicate: (m) => {
      const mk = m.options.mutationKey?.[0]
      if (mk !== BLOCK_MUTATION_KEY[0] && mk !== UNBLOCK_MUTATION_KEY[0]) return false
      const ck = (m.state.context as Ctx | undefined)?.key
      return !ck || JSON.stringify(ck) === want
    },
  })
}

// 對帳規則只有一條:每次封鎖/解除結束,等它的狀態落定(下一個 macrotask)後,
// 若已經沒有任何封鎖/解除在路上,就重抓一次名單 —— 這時伺服器已套用所有寫入,GET 的結果一定是新的;
// 之後才開始的封鎖會在 onMutate cancel 掉這次 GET,不會被它蓋掉。
function reconcileWhenIdle(qc: QueryClient, key: readonly unknown[]) {
  setTimeout(() => {
    if (pendingWrites(qc, key) === 0) qc.invalidateQueries({ queryKey: key })
  }, 0)
}

export function useBlockList() {
  const qc = useQueryClient()
  const accountId = currentAccountId()
  const q = useQuery({
    queryKey: blocksKey(accountId ?? ''),
    // token 是全站共用的那一個:另一個分頁換了帳號,這個 key 的抓取就會拿到別人的名單 → 前後都對一下帳號,不符就丟掉
    queryFn: async () => {
      const own = () => currentAccountId() === accountId
      if (!own()) throw new Error('account switched')
      const list = (await moderationApi.blocks()).data.data ?? []
      if (!own()) throw new Error('account switched')
      return list
    },
    enabled: !!accountId,
    initialData: () => (accountId ? readStoredBlocks(accountId) : undefined),
    initialDataUpdatedAt: 0, // 裝置備份一律當過期 → 掛上就去抓最新
    staleTime: 5 * 60_000, // 只有自己會改(改的時候直接寫快取),不用常常重抓
    retry: 3,
    // 抓不到就一直重試,別停在舊名單;有封鎖/解除進行中先不抓
    refetchInterval: (query) =>
      query.state.status === 'error' && pendingWrites(qc, query.queryKey) === 0 ? 30_000 : false,
  })
  useEffect(() => {
    if (accountId && q.data) writeStoredBlocks(accountId, q.data)
  }, [accountId, q.data])
  return { blocks: accountId ? (q.data ?? []) : [], isLoading: !!accountId && q.isLoading }
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

// key 在送出那一刻就綁定(別用 render 時的 key:等回應期間另一個分頁換了帳號,
// react-query 會換成新 render 的 callback,回滾就會寫進別人的名單)
type Ctx = { key: readonly unknown[]; prev?: Block[]; optimisticRef?: string }

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
      const key = blocksKey(currentAccountId() ?? '')
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData<Block[]>(key)
      const ref =
        v.type === 'player' ? playerBlockRef({ player_id: v.playerId, account_ref: v.accountRef }) : v.orgId
      if (!ref) return { key, prev }
      const optimistic: Block = {
        type: v.type,
        ref,
        name: v.name,
        avatar_url: v.avatarUrl,
        created_at: new Date().toISOString(),
      }
      qc.setQueryData<Block[]>(key, (list = []) => [
        optimistic,
        ...list.filter((b) => !(b.type === v.type && b.ref === ref)),
      ])
      return { key, prev, optimisticRef: ref }
    },
    onSuccess: (b, v, ctx) => {
      if (!ctx) return
      // 換成伺服器那筆(冪等:已封鎖過回原本那筆)
      qc.setQueryData<Block[]>(ctx.key, (list = []) => [
        b,
        ...list.filter((x) => !(x.type === v.type && (x.ref === b.ref || x.ref === ctx.optimisticRef))),
      ])
      toast(i18n.t(v.type === 'org' ? 'useBlocks.blockedOrgToast' : 'useBlocks.blocked'), 'success')
    },
    onError: (e: unknown, v, ctx) => {
      // 只回滾這一筆(不整份換回 prev:同時送出的另一筆封鎖可能已經成功,不能被一起抹掉)
      const ref = ctx?.optimisticRef
      if (ctx && ref) {
        const before = ctx.prev?.find((x) => x.type === v.type && x.ref === ref) // 本來就封鎖過 → 放回原本那筆
        qc.setQueryData<Block[]>(ctx.key, (list = []) => {
          const rest = list.filter((x) => !(x.type === v.type && x.ref === ref))
          return before ? [before, ...rest] : rest
        })
      }
      toast(errMsg(e))
    },
    onSettled: (_d, _e, _v, ctx) => {
      if (ctx) reconcileWhenIdle(qc, ctx.key)
    },
  })

  const unblock = useMutation({
    mutationKey: UNBLOCK_MUTATION_KEY,
    mutationFn: (b: Pick<Block, 'type' | 'ref'>) => moderationApi.unblock(b.type, b.ref),
    onMutate: async (b): Promise<Ctx> => {
      const key = blocksKey(currentAccountId() ?? '')
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData<Block[]>(key)
      qc.setQueryData<Block[]>(key, (list = []) =>
        list.filter((x) => !(x.type === b.type && x.ref === b.ref))
      )
      return { key, prev }
    },
    onSuccess: () => toast(i18n.t('useBlocks.unblocked'), 'info'),
    onError: (e: unknown, b, ctx) => {
      // 只放回這一筆(理由同封鎖的回滾)
      const removed = ctx?.prev?.find((x) => x.type === b.type && x.ref === b.ref)
      if (ctx && removed)
        qc.setQueryData<Block[]>(ctx.key, (list = []) => [
          removed,
          ...list.filter((x) => !(x.type === b.type && x.ref === b.ref)),
        ])
      toast(errMsg(e))
    },
    onSettled: (_d, _e, _b, ctx) => {
      if (ctx) reconcileWhenIdle(qc, ctx.key)
    },
  })

  return { block, unblock }
}
