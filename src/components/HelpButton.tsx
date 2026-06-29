import { useState } from 'react'

// 臨打人使用教學 — step-by-step illustrated guide (text + emoji), always available
// in-app. No video needed.
const STEPS: { icon: string; title: string; body: string }[] = [
  { icon: '🔑', title: '登入', body: '用 Google 或 LINE 登入,第一次會幫你建立資料(名字、頭像、程度)。' },
  { icon: '🏸', title: '進入球場', body: '從首頁點要去的開團,或掃團主給的 QR;輸入團主給的進場密碼就進場。' },
  { icon: '✋', title: '上場 / 排隊', body: '點球場上的空位「＋」就上場;人滿 4 位時點「排隊」候補。湊滿四人才開始計時。' },
  { icon: '🔔', title: '輪到你了', body: '輪到你上場會跳通知(把 App 裝到桌面還能收手機推播)。右上鈴鐺看本場通知。' },
  { icon: '👪', title: '帶家人', body: '上方「＋帶家人」可幫沒帶手機的家人加入(填名字、選可愛頭像、程度);團主核准後就能幫他一起排。' },
  { icon: '🗳️', title: '投票結束', body: '四人都在場上時,點「投票結束這場」;滿 3 票就自動結束、換下一組。' },
  { icon: '⚙️', title: '改自己的資料', body: '右上「設定」可改名字、預設程度、換頭像(可選可愛圖案)。' },
]

export function HelpButton({ className = '' }: { className?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)} className={className || 'text-xs text-gray-400'}>
        ❓ 使用教學
      </button>
      {open && (
        <div
          className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-5"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-3xl p-5 w-full max-w-sm max-h-[82vh] overflow-y-auto space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-gray-800">🏸 臨打人使用教學</span>
              <button onClick={() => setOpen(false)} className="text-gray-400 font-bold">✕</button>
            </div>
            {STEPS.map((s, i) => (
              <div key={i} className="flex gap-3 items-start bg-gray-50 rounded-2xl px-3 py-2.5">
                <span className="text-2xl shrink-0">{s.icon}</span>
                <div>
                  <p className="text-sm font-bold text-gray-700">
                    {i + 1}. {s.title}
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5">{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
