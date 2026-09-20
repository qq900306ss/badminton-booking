import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useInstallPrompt, promptInstall } from '../lib/installPrompt'

const CLS = `block w-full text-center bg-white border-2 border-brand-pink text-brand-pink font-bold
  py-2.5 rounded-2xl shadow-sm active:scale-95 transition-transform`

// 大廳 / 場內的「安裝到桌面」入口。
//   有原生安裝框(Android 真 Chrome 才會發)→ 一鍵直接裝,這是最短路徑
//   其他(iPhone、LINE/FB 內建瀏覽器、安裝框沒出現)→ 導去 /install,那頁會依平台分流
//     (漫畫教學、LINE 跳外部瀏覽器、Chrome intent…),以前這裡自帶的說明彈窗已移除,避免兩份文案漂移
export function InstallButton({ label }: { label?: string }) {
  const { t } = useTranslation()
  const { hasPrompt, installed } = useInstallPrompt()
  const text = label ?? t('InstallButton.installLabel')

  if (installed) return null

  if (hasPrompt) {
    return (
      <button onClick={() => promptInstall()} className={CLS}>
        {text}
      </button>
    )
  }
  return (
    <Link to="/install" className={CLS}>
      {text}
    </Link>
  )
}
