# https://coffeescript-cookbook.github.io/chapters/arrays/check-type-is-array
module.exports = (value) -> Array.isArray value or {}.toString.call value is '[object Array]'
