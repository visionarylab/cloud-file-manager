const { replacementStrings } = require('./build-opts.js')

// Adds dynamic build-time strings from build-opts
const stringReplacement = (content, path) => {
  let contentString = content.toString()
  // Only process html files for now...
  if (path.match(/\.html$/)) {
    replacementStrings.forEach(replacement => {
      contentString = contentString.replace(replacement.pattern, replacement.value)
    })
  }
  return contentString
}

module.exports = stringReplacement
