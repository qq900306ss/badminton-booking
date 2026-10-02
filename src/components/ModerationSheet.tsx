import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { moderationApi, type ReportReason } from '../api/client'
import { useBlockActions, useBlocked, useBlockPending, playerBlockRef, type BlockTarget } from '../hooks/useBlocks'
import { isPhotoUrl, DEFAULT_ORG_AVATAR } from '../lib/avatar'
import { useToast, errMsg } from './Toast'

const REASONS: ReportReason[] = ['inappropriate', 'harassment', 'spam', 'other']
const DETAIL_MAX = 500

// 檢舉 / 封鎖的底部 sheet(App Store 1.2):點場上別的球友,或團的「⋯」打開。
// 同一個 sheet 走三步:選單 → 檢舉(理由+說明)/ 封鎖確認。
// 用 portal 掛到 body:場地卡、排隊頭像有 transform / z-index,會建 stacking context,關在裡面會被蓋住。
// z-[80] 跟 HostCta 的 sheet 同層(高於語言鈕 / toast 60、連線橫幅 70,低於更新提示 95)。
export function ModerationSheet({
  target,
  onClose,
  onBlocked,
}: {
  target: BlockTarget
  onClose: () => void
  onBlocked?: () => void // 封鎖送出後(例如場內封鎖團主要切到「已封鎖」畫面)
}) {
  const { t } = useTranslation()
  const toast = useToast()
  const { block, unblock } = useBlockActions()
  const { isPlayerBlocked, isOrgBlocked } = useBlocked()
  const blockPending = useBlockPending()
  const [step, setStep] = useState<'menu' | 'report' | 'block'>('menu')
  const [reason, setReason] = useState<ReportReason | null>(null)
  const [detail, setDetail] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const isPlayer = target.type === 'player'
  const blocked = isPlayer
    ? isPlayerBlocked({ player_id: target.playerId, account_ref: target.accountRef })
    : isOrgBlocked(target.orgId)
  // 已封鎖的人連 sheet 頭上也不顯示原本的名字頭像
  const shownName = blocked ? t(isPlayer ? 'useBlocks.blockedPlayer' : 'useBlocks.blockedOrg') : target.name
  const ns = isPlayer ? 'player' : 'org'

  async function sendReport() {
    if (!reason) return
    setSending(true)
    setError('')
    try {
      await moderationApi.report({
        targetType: isPlayer ? 'player' : 'session',
        sessionId: target.sessionId,
        playerId: target.type === 'player' ? target.playerId : undefined,
        reason,
        detail: detail.trim(),
      })
      onClose()
      toast(t('ModerationSheet.reportSent'), 'success')
    } catch (e: unknown) {
      setError(errMsg(e, t('ModerationSheet.reportFailed')))
    } finally {
      setSending(false)
    }
  }

  function confirmBlock() {
    block.mutate(target)
    onClose()
    onBlocked?.()
  }

  function doUnblock() {
    const ref =
      target.type === 'player'
        ? playerBlockRef({ player_id: target.playerId, account_ref: target.accountRef })
        : target.orgId
    if (ref) unblock.mutate({ type: target.type, ref })
    onClose()
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[80] bg-black/40 flex items-end sm:items-center justify-center p-3
        pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl w-full max-w-md p-5 space-y-4 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* 對象:頭像 + 名字(已封鎖的換成中性 🚫) */}
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 overflow-hidden ${
              blocked ? 'bg-gray-200' : isPlayer ? 'bg-brand-pink/30' : 'bg-brand-pink/15'
            }`}
          >
            {blocked ? (
              <span className="text-2xl grayscale">🚫</span>
            ) : isPhotoUrl(target.avatarUrl) ? (
              <img src={target.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl">
                {target.avatarUrl || (isPlayer ? [...target.name][0]?.toUpperCase() || '🏸' : DEFAULT_ORG_AVATAR)}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className={`font-extrabold truncate ${blocked ? 'text-gray-400' : 'text-gray-800'}`}>{shownName}</p>
            <p className="text-xs text-gray-400">{t(`ModerationSheet.${ns}.subtitle`)}</p>
          </div>
          <button onClick={onClose} className="text-sm font-bold text-gray-400 px-1 self-start" aria-label={t('ModerationSheet.close')}>
            ✕
          </button>
        </div>

        {step === 'menu' && (
          <div className="space-y-2">
            <button
              onClick={() => setStep('report')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-gray-50 text-left font-bold text-gray-700
                active:scale-[0.98] transition-transform"
            >
              <span className="text-xl">🚩</span>
              <span>{t(`ModerationSheet.${ns}.report`)}</span>
            </button>
            {blocked ? (
              <button
                onClick={doUnblock}
                disabled={blockPending}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-gray-50 text-left font-bold text-gray-700
                  active:scale-[0.98] transition-transform disabled:opacity-40"
              >
                <span className="text-xl">↩️</span>
                <span>{t('ModerationSheet.unblock')}</span>
              </button>
            ) : (
              <button
                onClick={() => setStep('block')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-rose-50 text-left font-bold text-rose-600
                  active:scale-[0.98] transition-transform"
              >
                <span className="text-xl">🚫</span>
                <span>{t(`ModerationSheet.${ns}.block`)}</span>
              </button>
            )}
            <button onClick={onClose} className="w-full py-2.5 text-sm font-semibold text-gray-400">
              {t('ModerationSheet.cancel')}
            </button>
          </div>
        )}

        {step === 'report' && (
          <div className="space-y-3">
            <p className="font-bold text-gray-700">🚩 {t(`ModerationSheet.${ns}.reportTitle`)}</p>
            <div className="space-y-1.5" role="radiogroup">
              {REASONS.map((r) => (
                <button
                  key={r}
                  role="radio"
                  aria-checked={reason === r}
                  onClick={() => setReason(r)}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl text-left text-sm font-semibold border-2 transition-colors ${
                    reason === r ? 'border-brand-pink bg-brand-pink/10 text-gray-800' : 'border-gray-100 bg-white text-gray-600'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full border-2 shrink-0 ${
                      reason === r ? 'border-pink-400 bg-pink-400 ring-2 ring-white ring-inset' : 'border-gray-300'
                    }`}
                  />
                  {t(`ModerationSheet.reasons.${r}`)}
                </button>
              ))}
            </div>
            <div>
              <textarea
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                maxLength={DETAIL_MAX}
                rows={3}
                placeholder={t('ModerationSheet.detailPlaceholder')}
                className="w-full border-2 border-gray-200 rounded-2xl px-3 py-2 text-sm resize-none
                  focus:outline-none focus:border-brand-pink"
              />
              <p className="text-right text-[11px] text-gray-300">
                {detail.length}/{DETAIL_MAX}
              </p>
            </div>
            <p className="text-xs text-gray-400">{t('ModerationSheet.reportNote')}</p>
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            <div className="flex gap-2">
              <button onClick={() => { setStep('menu'); setError('') }} className="btn-secondary flex-1 text-sm">
                {t('ModerationSheet.back')}
              </button>
              <button onClick={sendReport} disabled={!reason || sending} className="btn-primary flex-1 text-sm disabled:opacity-40">
                {sending ? t('ModerationSheet.sending') : t('ModerationSheet.submitReport')}
              </button>
            </div>
          </div>
        )}

        {step === 'block' && (
          <div className="space-y-3">
            <p className="font-bold text-gray-700">🚫 {t(`ModerationSheet.${ns}.blockTitle`)}</p>
            <p className="text-sm text-gray-500 leading-relaxed">{t(`ModerationSheet.${ns}.blockBody`)}</p>
            <p className="text-xs text-gray-400">{t('ModerationSheet.blockUndoHint')}</p>
            <div className="flex gap-2">
              <button onClick={() => setStep('menu')} className="btn-secondary flex-1 text-sm">
                {t('ModerationSheet.cancel')}
              </button>
              <button
                onClick={confirmBlock}
                className="flex-1 text-sm font-bold py-3 px-6 rounded-2xl bg-rose-500 text-white shadow-md
                  active:scale-95 transition-transform"
              >
                {t('ModerationSheet.confirmBlock')}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>,
    document.body
  )
}
