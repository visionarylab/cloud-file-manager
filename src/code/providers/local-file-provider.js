import tr  from '../utils/translate'

import { ProviderInterface }  from './provider-interface'
import { cloudContentFactory }  from './provider-interface'
import localFileTabListView from '../views/local-file-tab-list-view'
import localFileTabSaveView from '../views/local-file-tab-save-view'

const LocalFileListTab = createReactFactory(localFileTabListView)
const LocalFileSaveTab = createReactFactory(localFileTabSaveView)

class LocalFileProvider extends ProviderInterface {
  constructor(options, client) {
    const opts = options || {}
    super({
      name: LocalFileProvider.Name,
      displayName: opts.displayName || (tr('~PROVIDER.LOCAL_FILE')),
      capabilities: {
        save: true,
        resave: false,
        "export": true,
        load: true,
        list: true,
        remove: false,
        rename: false,
        close: false
      }
    })
    this.options = opts
    this.client = client
  }

  filterTabComponent(capability, defaultComponent) {
    if (capability === 'list') {
      return LocalFileListTab
    } else if ((capability === 'save') || (capability === 'export')) {
      return LocalFileSaveTab
    } else {
      return defaultComponent
    }
  }

  list(metadata, callback) {}
    // not really implemented - we flag it as implemented so we show in the list dialog

  save(content, metadata, callback) {
    // not really implemented - we flag it as implemented so we can add the download button to the save dialog
    return (typeof callback === 'function' ? callback(null) : undefined)
  }

  load(metadata, callback) {
    const reader = new FileReader()
    reader.onload = loaded => callback(null, cloudContentFactory.createEnvelopedCloudContent(loaded.target.result))
    return reader.readAsText(metadata.providerData.file)
  }

  canOpenSaved() {
    // this prevents the hash to be updated
    return false
  }
}
LocalFileProvider.Name = 'localFile'

export default LocalFileProvider
