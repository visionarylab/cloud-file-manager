#
# This utility class simplifies working with document store URLs
#

jiff = require 'jiff'

class PatchableContent

  constructor: (@patchObjectHash, @savedContent) ->

  createPatch: (content, canPatch) ->
    diff = if canPatch and @savedContent then @_createDiff @savedContent, content
    result =
      shouldPatch: false
      mimeType: 'application/json'
      contentJson: JSON.stringify content
      diffLength: diff and diff.length
      diffJson: diff and JSON.stringify diff

    # only patch if the diff is smaller than saving the entire file
    # e.g. when large numbers of cases are deleted the diff can be larger
    if canPatch and result.diffJson? and result.diffJson.length < result.contentJson.length
      result.shouldPatch = true
      result.sendContent = result.diffJson
      result.mimeType = 'application/json-patch+json'
    else
      result.sendContent = result.contentJson

    result

  updateContent: (content) ->
    @savedContent = content

  _createDiff: (obj1, obj2) ->
    try
      opts = {
        hash: @patchObjectHash if typeof @patchObjectHash is "function"
        invertible: false # smaller patches are worth more than invertibility
      }
      # clean objects before diffing
      cleanedObj1 = JSON.parse JSON.stringify obj1
      cleanedObj2 = JSON.parse JSON.stringify obj2
      diff = jiff.diff(cleanedObj1, cleanedObj2, opts)
      return diff
    catch
      return null
    
module.exports = PatchableContent
