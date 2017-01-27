// https://coffeescript-cookbook.github.io/chapters/arrays/check-type-is-array
export default function(value) { return Array.isArray(value || {}.toString.call(value === '[object Array]')); };
