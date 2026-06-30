// User-facing changelog shown in the「更新資訊」modal. Newest first. Keep entries
// short and in plain language (player audience).
export const CHANGELOG: { date: string; items: string[] }[] = [
  {
    date: '2026/06/30',
    items: [
      '修復 LINE 登入問題,現在可以正常用 LINE 登入了',
    ],
  },
  {
    date: '2026/06/29',
    items: [
      '每個團會顯示團主頭像,更好認(團主沒設就用預設 🐰)',
      '首頁可用「星期」快速篩選球局,地區篩選改成收合更清爽',
      '團主有放連結時,球局卡片可一鍵「聯繫團主」',
      '可以帶家人一起打(需團主核准)',
      '場上湊滿四人後可投票結束這場',
      '可選可愛頭像、設定預設名稱與程度',
      '球場狀態即時同步、更省流量',
      '有新版本會自動提醒更新',
    ],
  },
]
