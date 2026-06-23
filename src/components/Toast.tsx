import { createContext, useContext, useCallback, useState, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type ToastType = 'error' | 'success' | 'info'
interface ToastItem {
  id: number
  msg: string
  type: ToastType
}

const ToastCtx = createContext<(msg: string, type?: ToastType) => void>(() => {})
export const useToast = () => useContext(ToastCtx)

let nextId = 1

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const show = useCallback((msg: string, type: ToastType = 'error') => {
    const id = nextId++
    setToasts((t) => [...t, { id, msg, type }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600)
  }, [])

  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div className="fixed bottom-6 inset-x-0 z-[60] flex flex-col items-center gap-2 px-4 pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`px-4 py-2.5 rounded-2xl shadow-lg text-sm font-bold text-white max-w-xs text-center ${
                t.type === 'error'
                  ? 'bg-red-400'
                  : t.type === 'success'
                    ? 'bg-emerald-500'
                    : 'bg-gray-700'
              }`}
            >
              {t.msg}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  )
}

// pull a human message out of an axios error
export function errMsg(e: unknown, fallback = '操作失敗'): string {
  return (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? fallback
}
