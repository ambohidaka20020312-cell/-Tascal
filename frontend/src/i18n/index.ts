import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import ja from './locales/ja.json'
import en from './locales/en.json'
import ko from './locales/ko.json'
import zhCN from './locales/zh-CN.json'
import zhTW from './locales/zh-TW.json'
import es from './locales/es.json'
import fr from './locales/fr.json'
import de from './locales/de.json'
import pt from './locales/pt.json'
import ar from './locales/ar.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { ja: { translation: ja }, en: { translation: en }, ko: { translation: ko }, 'zh-CN': { translation: zhCN }, 'zh-TW': { translation: zhTW }, es: { translation: es }, fr: { translation: fr }, de: { translation: de }, pt: { translation: pt }, ar: { translation: ar } },
    fallbackLng: 'ja',
    interpolation: { escapeValue: false },
    detection: { order: ['localStorage', 'navigator'], caches: ['localStorage'], lookupLocalStorage: 'tascal_language' },
  })

export default i18n
