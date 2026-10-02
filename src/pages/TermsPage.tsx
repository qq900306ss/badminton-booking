import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

// 公開的使用條款頁(/terms):App Store Guideline 1.2 要求有 UGC 的 app 要有使用條款,
// 明示對不當內容與濫用者「零容忍」,並說明檢舉 / 封鎖怎麼用、多久處理。結構照 /privacy。
// 檢舉 / 封鎖的入口或處理時效改了,這頁的 reporting 段也要跟著改。
const SECTIONS = ['service', 'account', 'conduct', 'reporting', 'hosts', 'safety', 'changes', 'contact'] as const

function list(v: unknown): string[] {
  // 缺翻譯時 t() 會回字串,別讓 .map 炸掉
  return Array.isArray(v) ? (v as string[]) : []
}

export function TermsPage() {
  const { t } = useTranslation()
  return (
    <div className="min-h-screen bg-brand-bg px-4 pt-6 pb-24">
      <div className="max-w-2xl mx-auto space-y-4">
        <Link to="/" className="text-sm font-bold text-brand-pink">
          ← {t('TermsPage.backHome')}
        </Link>
        <header className="text-center space-y-1">
          <div className="text-4xl">📜</div>
          <h1 className="text-2xl font-extrabold text-gray-800">{t('TermsPage.title')}</h1>
          <p className="text-xs text-gray-400">{t('TermsPage.effective')}</p>
        </header>
        <p className="text-sm text-gray-600">{t('TermsPage.intro')}</p>

        {SECTIONS.map((id, idx) => (
          <section key={id} className={`card space-y-2 ${id === 'conduct' ? 'ring-2 ring-rose-200' : ''}`}>
            <h2 className="font-extrabold text-gray-800">
              {idx + 1}. {t(`TermsPage.sections.${id}.title`)}
            </h2>
            <ul className="space-y-1.5">
              {list(t(`TermsPage.sections.${id}.items`, { returnObjects: true })).map((it, i) => (
                <li key={i} className="text-sm text-gray-600 flex gap-2">
                  <span className="text-brand-pink">•</span>
                  <span>{it}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <Link to="/privacy" className="btn-secondary block text-center text-sm">
          🔒 {t('TermsPage.goPrivacy')}
        </Link>
      </div>
    </div>
  )
}
