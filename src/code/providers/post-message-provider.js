// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
/*
 * decaffeinate suggestions:
 * DS001: Remove Babel/TypeScript constructor workaround
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const { ProviderInterface } = (require('./provider-interface'))
const getQueryParam = require('../utils/get-query-param')

class PostMessageProvider extends ProviderInterface {
  static initClass() {
  
    this.Name = 'postMessage'
  }

  constructor(options, client) {
    const opts = options || {}
    super({
      capabilities: {
        save: false,
        resave: false,
        "export": getQueryParam("saveSecondaryFileViaPostMessage") ? 'auto' : false,
        load: false,
        list: false,
        remove: false,
        rename: false,
        close: false
      }
    })
    this.client = client
    this.options = opts
  }

  canOpenSaved() { return false }

  saveAsExport(content, metadata, callback) {
    window.parent.postMessage({
      action: "saveSecondaryFile",
      extension: metadata.extension,
      mimeType: metadata.mimeType,
      content
    }, "*")
    return (typeof callback === 'function' ? callback(null) : undefined)
  }
}
PostMessageProvider.initClass()

module.exports = PostMessageProvider
