// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import tr  from '../utils/translate'

import { ProviderInterface }  from './provider-interface'
import { cloudContentFactory }  from './provider-interface'
import { CloudMetadata }  from './provider-interface'

class LocalStorageProvider extends ProviderInterface {
  constructor(options, client) {
    const opts = options || {}
    super({
      name: LocalStorageProvider.Name,
      displayName: opts.displayName || (tr('~PROVIDER.LOCAL_STORAGE')),
      urlDisplayName: opts.urlDisplayName,
      capabilities: {
        save: true,
        resave: true,
        "export": true,
        load: true,
        list: true,
        remove: true,
        rename: true,
        close: false
      }
    })
    this.options = opts
    this.client = client
  }
  static Available() {
    try {
      const test = 'LocalStorageProvider::auth'
      window.localStorage.setItem(test, test)
      window.localStorage.removeItem(test)
      return true
    } catch (error) {
      return false
    }
  }

  save(content, metadata, callback) {
    try {
      const fileKey = this._getKey(metadata.filename)
      window.localStorage.setItem(fileKey, ((typeof content.getContentAsJSON === 'function' ? content.getContentAsJSON() : undefined) || content))
      return (typeof callback === 'function' ? callback(null) : undefined)
    } catch (e) {
      return callback(`Unable to save: ${e.message}`)
    }
  }

  load(metadata, callback) {
    try {
      const content = window.localStorage.getItem(this._getKey(metadata.filename))
      return callback(null, cloudContentFactory.createEnvelopedCloudContent(content))
    } catch (e) {
      return callback(`Unable to load '${metadata.name}': ${e.message}`)
    }
  }

  list(metadata, callback) {
    const list = []
    const prefix = this._getKey(((metadata != null ? metadata.path() : undefined) || []).join('/'))
    for (let key of Object.keys(window.localStorage || {})) {
      if (key.substr(0, prefix.length) === prefix) {
        // eslint-disable-next-line no-unused-vars
        const [filename, ...remainder] = key.substr(prefix.length).split('/')
        const name = key.substr(prefix.length)
        if (this.matchesExtension(name)) {
          list.push(new CloudMetadata({
            name,
            type: remainder.length > 0 ? CloudMetadata.Folder : CloudMetadata.File,
            parent: metadata,
            provider: this
          })
          )
        }
      }
    }
    return callback(null, list)
  }

  remove(metadata, callback) {
    try {
      window.localStorage.removeItem(this._getKey(metadata.filename))
      return (typeof callback === 'function' ? callback(null) : undefined)
    } catch (error) {
      return (typeof callback === 'function' ? callback('Unable to delete') : undefined)
    }
  }

  rename(metadata, newName, callback) {
    try {
      const content = window.localStorage.getItem(this._getKey(metadata.filename))
      window.localStorage.setItem(this._getKey(CloudMetadata.withExtension(newName)), content)
      window.localStorage.removeItem(this._getKey(metadata.filename))
      metadata.rename(newName)
      return callback(null, metadata)
    } catch (error) {
      return (typeof callback === 'function' ? callback('Unable to rename') : undefined)
    }
  }

  canOpenSaved() { return true }

  openSaved(openSavedParams, callback) {
    const metadata = new CloudMetadata({
      name: openSavedParams,
      type: CloudMetadata.File,
      parent: null,
      provider: this
    })
    return this.load(metadata, (err, content) => callback(err, content, metadata))
  }

  getOpenSavedParams(metadata) {
    return metadata.name
  }

  _getKey(name) {
    if (name == null) { name = '' }
    return `cfm::${name.replace(/\t/g, ' ')}`
  }
}

LocalStorageProvider.Name='localStorage'
export default LocalStorageProvider
