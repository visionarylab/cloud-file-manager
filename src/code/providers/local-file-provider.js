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
const {div, input, button} = ReactDOMFactories;
const tr = require('../utils/translate');

const { ProviderInterface } = (require('./provider-interface'));
const { cloudContentFactory } = (require('./provider-interface'));
const LocalFileListTab = createReactFactory(require('../views/local-file-tab-list-view'));
const LocalFileSaveTab = createReactFactory(require('../views/local-file-tab-save-view'));

class LocalFileProvider extends ProviderInterface {
  static initClass() {
  
    this.Name = 'localFile';
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
      name: LocalFileProvider.Name,
      displayName: this.options.displayName || (tr('~PROVIDER.LOCAL_FILE')),
      capabilities: {
        save: true,
        resave: false,
        export: true,
        load: true,
        list: true,
        remove: false,
        rename: false,
        close: false
      }
    });
  }

  filterTabComponent(capability, defaultComponent) {
    if (capability === 'list') {
      return LocalFileListTab;
    } else if ((capability === 'save') || (capability === 'export')) {
      return LocalFileSaveTab;
    } else {
      return defaultComponent;
    }
  }

  list(metadata, callback) {}
    // not really implemented - we flag it as implemented so we show in the list dialog

  save(content, metadata, callback) {
    // not really implemented - we flag it as implemented so we can add the download button to the save dialog
    return (typeof callback === 'function' ? callback(null) : undefined);
  }

  load(metadata, callback) {
    const reader = new FileReader();
    reader.onload = loaded => callback(null, cloudContentFactory.createEnvelopedCloudContent(loaded.target.result));
    return reader.readAsText(metadata.providerData.file);
  }

  canOpenSaved() {
    // this prevents the hash to be updated
    return false;
  }
}
LocalFileProvider.initClass();

module.exports = LocalFileProvider;
