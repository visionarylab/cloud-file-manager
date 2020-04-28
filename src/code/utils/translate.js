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
import enUs from './lang/en-US'
import es from './lang/es'
import he from './lang/he'
import nb from './lang/nb'
import nn from './lang/nn'
import tr from './lang/tr'
import zh from './lang/zh-TW'

const languageFiles = [
  {key: 'de',    contents: de},  // German
  {key: 'el',    contents: el},  // Greek
  {key: 'en-US', contents: enUs},// US English
  {key: 'es',    contents: es},  // Spanish
  {key: 'he',    contents: he},  // Hebrew
  {key: 'nb',    contents: nb},  // Norwegian Bokmål
  {key: 'nn',    contents: nn},  // Norwegian Nynorsk
  {key: 'tr',    contents: tr},  // Turkish
  {key: 'zh-TW', contents: zh}   // Chinese (Taiwan)
]

// returns baseLANG from baseLANG-REGION if REGION exists
const getBaseLanguage = function(langKey) {
  const dashLoc = langKey.indexOf('-')
  if (dashLoc !== -1) { return langKey.substring(0, dashLoc) }
  return undefined
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
  if (baseLang) { return translations[baseLang] = lang.contents }
})

const lang = urlParams.lang || getFirstBrowserLanguage()
const baseLang = getBaseLanguage(lang || '')
const defaultLang = lang && translations[lang] ? lang : baseLang && translations[baseLang] ? baseLang : "en"

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
