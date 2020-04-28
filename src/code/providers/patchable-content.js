// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
//
// This utility class simplifies working with document store URLs
//

import jiff  from 'jiff'

class PatchableContent {

  constructor(patchObjectHash, savedContent) {
    this.patchObjectHash = patchObjectHash
    this.savedContent = savedContent
  }

  createPatch(content, canPatch) {
    const diff = canPatch && this.savedContent ? this._createDiff(this.savedContent, content) : undefined
    const result = {
      shouldPatch: false,
      mimeType: 'application/json',
      contentJson: JSON.stringify(content),
      diffLength: diff && diff.length,
      diffJson: diff && JSON.stringify(diff)
    }

    // only patch if the diff is smaller than saving the entire file
    // e.g. when large numbers of cases are deleted the diff can be larger
    if (canPatch && (result.diffJson != null) && (result.diffJson.length < result.contentJson.length)) {
      result.shouldPatch = true
      result.sendContent = result.diffJson
      result.mimeType = 'application/json-patch+json'
    } else {
      result.sendContent = result.contentJson
    }

    return result
  }

  updateContent(content) {
    return this.savedContent = content
  }

  _createDiff(obj1, obj2) {
    try {
      const opts = {
        hash: typeof this.patchObjectHash === "function" ? this.patchObjectHash : undefined,
        invertible: false // smaller patches are worth more than invertibility
      }
      // clean objects before diffing
      const cleanedObj1 = JSON.parse(JSON.stringify(obj1))
      const cleanedObj2 = JSON.parse(JSON.stringify(obj2))
      const diff = jiff.diff(cleanedObj1, cleanedObj2, opts)
      return diff
    } catch (error) {
      return null
    }
  }
}
    
export default PatchableContent
