export default function(param) {
  let ret = null;
  location.hash.substr(1).split("&").some(function(pair) {
    let key = pair.split("=")[0];
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
