/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
module.exports = function(param) {
  let ret = null;
  location.hash.substr(1).split("&").some(function(pair) {
    const key = pair.split("=")[0];
    if (key === param) {
      let value = pair.split("=")[1];
      while (true) {
        value = decodeURIComponent(value);
        // deal with multiply-encoded values
        if (!/%20|%25/.test(value)) { break; }
      }
      return ret = value;
    }
  });
  return ret;
};
