module.exports = (param) ->
  param = param.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]")
  regexS = "[\\?&]" + param + "=([^&#]*)"
  regex = new RegExp regexS
  results = regex.exec window.location.href
  if results?.length > 1
    return decodeURIComponent results[1]
  else
    return null
