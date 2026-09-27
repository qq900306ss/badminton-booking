import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { DeletionScope } from '../components/DeletionScope'

// 公開的隱私權政策頁(/privacy):Google Play 上架要一個不用登入就打得開的網址。
// 內容是照程式碼實際行為寫的(登入拿哪些欄位、存哪裡、TTL 多久),
// 改到資料流(新欄位、新第三方、新的保存期限)時這頁也要跟著改。
const SECTIONS = ['operator', 'collected', 'visibility', 'purpose', 'sharing', 'deletion', 'children', 'changes'] as const

function list(v: unknown): string[] {
  // 缺翻譯時 t() 會回字串,別讓 .map 炸掉
  return Array.isArray(v) ? (v as string[]) : []
}

export function PrivacyPage() {
  const { t } = useTranslation()
  return (
    <div className="min-h-screen bg-brand-bg px-4 pt-6 pb-24">
      <div className="max-w-2xl mx-auto space-y-4">
        <Link to="/" className="text-sm font-bold text-brand-pink">
          ← {t('PrivacyPage.backHome')}
        </Link>
        <header className="text-center space-y-1">
          <div className="text-4xl">🔒</div>
          <h1 className="text-2xl font-extrabold text-gray-800">{t('PrivacyPage.title')}</h1>
          <p className="text-xs text-gray-400">{t('PrivacyPage.effective')}</p>
        </header>
        <p className="text-sm text-gray-600">{t('PrivacyPage.intro')}</p>

        {SECTIONS.map((id, idx) => (
          <section key={id} className="card space-y-2">
            <h2 className="font-extrabold text-gray-800">
              {idx + 1}. {t(`PrivacyPage.sections.${id}.title`)}
            </h2>
            <ul className="space-y-1.5">
              {list(t(`PrivacyPage.sections.${id}.items`, { returnObjects: true })).map((it, i) => (
                <li key={i} className="text-sm text-gray-600 flex gap-2">
                  <span className="text-brand-pink">•</span>
                  <span>{it}</span>
                </li>
              ))}
            </ul>
            {id === 'deletion' && (
              <>
                <DeletionScope />
                <Link to="/account-deletion" className="btn-primary block text-center text-sm">
                  {t('PrivacyPage.goDelete')}
                </Link>
              </>
            )}
          </section>
        ))}
      </div>
    </div>
  )
}
