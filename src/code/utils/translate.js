// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import urlParams  from './url-params'
import de from './lang/de'
import el from './lang/el'
import enUS from './lang/en-US'
import es from './lang/es'
import he from './lang/he'
import ja from './lang/ja'
import nb from './lang/nb'
import nn from './lang/nn'
import tr from './lang/tr'
import zhHans from './lang/zh-Hans'
import zhTW from './lang/zh-TW'

const languageFiles = [
  {key: 'de',    contents: de},     // German
  {key: 'el',    contents: el},     // Greek
  {key: 'en-US', contents: enUS},   // US English
  {key: 'es',    contents: es},     // Spanish
  {key: 'he',    contents: he},     // Hebrew
  {key: 'ja' ,   contents: ja},     // Japanese
  {key: 'nb',    contents: nb},     // Norwegian Bokmål
  {key: 'nn',    contents: nn},     // Norwegian Nynorsk
  {key: 'tr',    contents: tr},     // Turkish
  {key: 'zh',    contents: zhHans}, // Simplified Chinese
  {key: 'zh-TW', contents: zhTW}    // Traditional Chinese (Taiwan)
]

// returns baseLANG from baseLANG-REGION if REGION exists
const getBaseLanguage = function(langKey) {
  return langKey.split("-")[0]
}

// use language of page, which is used by CODAP, with separate build for each language
const getPageLanguage = function() {
  const pageLang = document.documentElement.lang
  return pageLang && (pageLang !== "unknown")
          ? pageLang
          : undefined
}

const getFirstBrowserLanguage = function() {
  const nav = window.navigator
  const languages = nav ? (nav.languages || []).concat([nav.language, nav.browserLanguage, nav.systemLanguage, nav.userLanguage]) : []
  for (let language of Array.from(languages)) {
    if (language) { return language }
  }
  return undefined
}

const translations =  {}
languageFiles.forEach(function(lang) {
  translations[lang.key] = lang.contents
  // accept full key with region code or just the language code
  const baseLang = getBaseLanguage(lang.key)
  if (baseLang && !translations[baseLang]) {
    translations[baseLang] = lang.contents
  }
})

const lang = urlParams.lang || getPageLanguage() || getFirstBrowserLanguage()
const baseLang = getBaseLanguage(lang || '')
const defaultLang = lang && translations[lang] ? lang : baseLang && translations[baseLang] ? baseLang : "en"

console.log(`CFM: using ${defaultLang} for translation (lang is "${urlParams.lang}" || "${getFirstBrowserLanguage()}")`);

const varRegExp = /%\{\s*([^}\s]*)\s*\}/g

const translate = function(key, vars, lang) {
  if (vars == null) { vars = {} }
  if (lang == null) { lang = defaultLang }
  let translation = translations[lang] != null ? translations[lang][key] : undefined
  if ((translation == null)) { translation = key }
  return translation.replace(varRegExp, function(match, key) {
    if (vars.hasOwnProperty(key)) { return vars[key] } else { return `'** UKNOWN KEY: ${key} **` }
  })
}

export default translate
