/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const urlParams = require('./url-params');

const languageFiles = [
  {key: 'de',    contents: require('./lang/de')},      // German
  {key: 'el',    contents: require('./lang/el')},      // Greek
  {key: 'en-US', contents: require('./lang/en-US')},   // US English
  {key: 'es',    contents: require('./lang/es')},      // Spanish
  {key: 'he',    contents: require('./lang/he')},      // Hebrew
  {key: 'nb',    contents: require('./lang/nb.json')}, // Norwegian Bokmål
  {key: 'nn',    contents: require('./lang/nn.json')}, // Norwegian Nynorsk
  {key: 'tr',    contents: require('./lang/tr')},      // Turkish
  {key: 'zh-TW', contents: require('./lang/zh-TW')}   // Chinese (Taiwan)
];

// returns baseLANG from baseLANG-REGION if REGION exists
const getBaseLanguage = function(langKey) {
  const dashLoc = langKey.indexOf('-');
  if (dashLoc !== -1) { return langKey.substring(0, dashLoc); }
  return undefined;
};

const getFirstBrowserLanguage = function() {
  const nav = window.navigator;
  const languages = nav ? (nav.languages || []).concat([nav.language, nav.browserLanguage, nav.systemLanguage, nav.userLanguage]) : [];
  for (let language of Array.from(languages)) {
    if (language) { return language; }
  }
  return undefined;
};

const translations =  {};
languageFiles.forEach(function(lang) {
  translations[lang.key] = lang.contents;
  // accept full key with region code or just the language code
  const baseLang = getBaseLanguage(lang.key);
  if (baseLang) { return translations[baseLang] = lang.contents; }
});

const lang = urlParams.lang || getFirstBrowserLanguage();
const baseLang = getBaseLanguage(lang || '');
const defaultLang = lang && translations[lang] ? lang : baseLang && translations[baseLang] ? baseLang : "en";

const varRegExp = /%\{\s*([^}\s]*)\s*\}/g;

const translate = function(key, vars, lang) {
  if (vars == null) { vars = {}; }
  if (lang == null) { lang = defaultLang; }
  let translation = translations[lang] != null ? translations[lang][key] : undefined;
  if ((translation == null)) { translation = key; }
  return translation.replace(varRegExp, function(match, key) {
    if (vars.hasOwnProperty(key)) { return vars[key]; } else { return `'** UKNOWN KEY: ${key} **`; }
  });
};

module.exports = translate;
