let translations =  {};
translations['en'] = require('./lang/en-us');
let defaultLang = 'en';
let varRegExp = /%\{\s*([^}\s]*)\s*\}/g;

let translate = function(key, vars, lang) {
  if (vars == null) { vars = {}; }
  if (lang == null) { lang = defaultLang; }
  let translation = __guard__(translations[lang], x => x[key]) || key;
  if (translation) {
    return translation.replace(varRegExp, function(match, key) {
      if (vars.hasOwnProperty(key)) { return vars[key]; } else { return `'** UKNOWN KEY: ${key} **`; }
    });
  }
};

export default translate;

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}