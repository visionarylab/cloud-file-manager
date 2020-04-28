// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
// https://coffeescript-cookbook.github.io/chapters/arrays/check-type-is-array
export default value => Array.isArray(value || {}.toString.call(value === '[object Array]'))
