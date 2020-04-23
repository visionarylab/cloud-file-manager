// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
export default function(param) {
  let ret = null
  //eslint-disable-next-line array-callback-return
  location.hash.substr(1).split("&").some(function(pair) {
    const key = pair.split("=")[0]
    if (key === param) {
      let value = pair.split("=")[1]
      // eslint-disable-next-line no-constant-condition
      while (true) {
        value = decodeURIComponent(value)
        // deal with multiply-encoded values
        if (!/%20|%25/.test(value)) { break }
      }
      return ret = value
    }
  })
  return ret
}
