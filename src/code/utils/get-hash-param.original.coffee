module.exports = (param) ->
  ret = null
  location.hash.substr(1).split("&").some (pair) ->
    key = pair.split("=")[0]
    if key is param
      value = pair.split("=")[1]
      loop
        value = decodeURIComponent(value)
        # deal with multiply-encoded values
        break unless /%20|%25/.test(value)
      ret = value
  ret
