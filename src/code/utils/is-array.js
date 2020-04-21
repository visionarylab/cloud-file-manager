// https://coffeescript-cookbook.github.io/chapters/arrays/check-type-is-array
module.exports = value => Array.isArray(value || {}.toString.call(value === '[object Array]'));
