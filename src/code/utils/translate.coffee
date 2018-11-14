urlParams = require './url-params'

languageFiles = [
  {key: 'de' ,   contents: require './lang/de'}
  {key: 'en-US', contents: require './lang/en-US'}
  {key: 'es' ,   contents: require './lang/es'}
  {key: 'he' ,   contents: require './lang/he'}
  {key: 'tr' ,   contents: require './lang/tr'}
  {key: 'zh-TW', contents: require './lang/zh-TW'}
]

translations =  {}
languageFiles.forEach (lang) ->
  translations[lang.key] = lang.contents
  # accept full key with region code or just the language code
  if (dashLoc = lang.key.indexOf('-')) > 0
    translations[lang.key.substring(0, dashLoc)] = lang.contents

defaultLang = null
# default to English unless the user expresses another preference (via URL param for now)
defaultLang = urlParams.lang if urlParams.lang and translations[urlParams.lang]
# use language of page, which is used by CODAP, with separate build for each language
if (not defaultLang?) and document.documentElement.lang and (document.documentElement.lang isnt "unknown")
  defaultLang = document.documentElement.lang
defaultLang = 'en' if not defaultLang?

varRegExp = /%\{\s*([^}\s]*)\s*\}/g

translate = (key, vars={}, lang=defaultLang) ->
  translation = translations[lang]?[key]
  translation = key if not translation?
  translation.replace varRegExp, (match, key) ->
    if vars.hasOwnProperty key then vars[key] else "'** UKNOWN KEY: #{key} **"

module.exports = translate
