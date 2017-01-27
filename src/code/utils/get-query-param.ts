export default function(param) {
  param = param.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
  let regexS = `[\\?&]${param}=([^&#]*)`;
  let regex = new RegExp(regexS);
  let results = regex.exec(window.location.href);
  if (__guard__(results, x => x.length) > 1) {
    return decodeURIComponent(results[1]);
  } else {
    return null;
  }
};

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}