import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import ja from './locales/ja.json'
import en from './locales/en.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { ja: { translation: ja }, en: { translation: en } },
    fallbackLng: 'ja',
    interpolation: { escapeValue: false },
    detection: { order: ['localStorage', 'navigator'], caches: ['localStorage'], lookupLocalStorage: 'tascal_language' },
  })

// 言語切り替え時に <html lang> を同期してスクリーンリーダーに正しい言語を伝える
i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng
})

export default i18n
