module.exports = (param) ->
  ret = null
  location.hash.substr(1).split("&").some (pair) ->
    pair.split("=")[0] is param and (ret = pair.split("=")[1])
  ret
