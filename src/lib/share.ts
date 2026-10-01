import { isIOSApp, native } from './native'

// 原生分享:手機上呼叫系統分享面板(LINE/IG/簡訊都在裡面),桌機或不支援
// 時退回複製到剪貼簿。回傳結果讓呼叫端決定要不要提示「已複製」。
export async function shareContent(data: {
  title: string
  text: string
  url: string
}): Promise<'shared' | 'copied' | 'failed'> {
  // iOS App:直接叫 UIKit 的分享面板(WKWebView 的 navigator.share 不一定有)
  if (isIOSApp) {
    try {
      await native.share(data)
      return 'shared'
    } catch {
      // 原生面板叫不起來 → 退回下面的網頁做法
    }
  }
  if (navigator.share) {
    try {
      await navigator.share(data)
      return 'shared'
    } catch (e) {
      // 使用者自己按取消不算失敗,也不要再跳剪貼簿打擾他
      if ((e as Error).name === 'AbortError') return 'shared'
    }
  }
  try {
    await navigator.clipboard.writeText(`${data.text}\n${data.url}`)
    return 'copied'
  } catch {
    return 'failed'
  }
}
