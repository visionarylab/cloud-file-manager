/*
 * decaffeinate suggestions:
 * DS001: Remove Babel/TypeScript constructor workaround
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const { ProviderInterface } = (require('./provider-interface'));
const getQueryParam = require('../utils/get-query-param');

class PostMessageProvider extends ProviderInterface {
  static initClass() {
  
    this.Name = 'postMessage';
  }

  constructor(options, client) {
    {
      // Hack: trick Babel/TypeScript into allowing this before super.
      if (false) { super(); }
      let thisFn = (() => { return this; }).toString();
      let thisName = thisFn.slice(thisFn.indexOf('return') + 6 + 1, thisFn.indexOf(';')).trim();
      eval(`${thisName} = this;`);
    }
    if (options == null) { options = {}; }
    this.options = options;
    this.client = client;
    super({
      capabilities: {
        save: false,
        resave: false,
        export: getQueryParam("saveSecondaryFileViaPostMessage") ? 'auto' : false,
        load: false,
        list: false,
        remove: false,
        rename: false,
        close: false
      }
    });
  }

  canOpenSaved() { return false; }

  saveAsExport(content, metadata, callback) {
    window.parent.postMessage({
      action: "saveSecondaryFile",
      extension: metadata.extension,
      mimeType: metadata.mimeType,
      content
    }, "*");
    return (typeof callback === 'function' ? callback(null) : undefined);
  }
}
PostMessageProvider.initClass();

module.exports = PostMessageProvider;
