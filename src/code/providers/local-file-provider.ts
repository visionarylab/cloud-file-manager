let {div, input, button} = React.DOM;
import tr from '../utils/translate';

import { ProviderInterface } from './provider-interface';
import { cloudContentFactory } from './provider-interface';
let LocalFileListTab = React.createFactory(require('../views/local-file-tab-list-view'));
let LocalFileSaveTab = React.createFactory(require('../views/local-file-tab-save-view'));

class LocalFileProvider extends ProviderInterface {
  static initClass() {
  
    this.Name = 'localFile';
  }

  constructor(options, client) {
    if (options == null) { options = {}; }
    super({
      name: LocalFileProvider.Name,
      displayName: options.displayName || (tr('~PROVIDER.LOCAL_FILE')),
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
    this.options = options;
    this.client = client;
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
    return __guardFunc__(callback, f => f(null));
  }

  load(metadata, callback) {
    let reader = new FileReader();
    reader.onload = loaded => callback(null, cloudContentFactory.createEnvelopedCloudContent(loaded.target.result));
    return reader.readAsText(metadata.providerData.file);
  }

  canOpenSaved() {
    // this prevents the hash to be updated
    return false;
  }
}
LocalFileProvider.initClass();

export default LocalFileProvider;

function __guardFunc__(func, transform) {
  return typeof func === 'function' ? transform(func) : undefined;
}