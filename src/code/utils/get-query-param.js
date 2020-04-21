// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
module.exports = function(param) {
  param = param.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]")
  const regexS = `[\\?&]${param}=([^&#]*)`
  const regex = new RegExp(regexS)
  const results = regex.exec(window.location.href)
  if ((results != null ? results.length : undefined) > 1) {
    return decodeURIComponent(results[1])
  } else {
    return null
  }
}
