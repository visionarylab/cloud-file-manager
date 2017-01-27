import tr from '../utils/translate';

import { ProviderInterface } from './provider-interface';
import { cloudContentFactory } from './provider-interface';
import { CloudMetadata } from './provider-interface';

class LocalStorageProvider extends ProviderInterface {
  static initClass() {
  
    this.Name = 'localStorage';
  }

  constructor(options, client) {
    if (options == null) { options = {}; }
    super({
      name: LocalStorageProvider.Name,
      displayName: options.displayName || (tr('~PROVIDER.LOCAL_STORAGE')),
      urlDisplayName: options.urlDisplayName,
      capabilities: {
        save: true,
        resave: true,
        export: true,
        load: true,
        list: true,
        remove: true,
        rename: true,
        close: false
      }
    });
    this.options = options;
    this.client = client;
  }
  static Available() {
    let result;
    return result = (() => { try {
      let test = 'LocalStorageProvider::auth';
      window.localStorage.setItem(test, test);
      window.localStorage.removeItem(test);
      return true;
    } catch (error) {
      return false;
    } })();
  }

  save(content, metadata, callback) {
    try {
      let fileKey = this._getKey(metadata.filename);
      window.localStorage.setItem(fileKey, (__guardMethod__(content, 'getContentAsJSON', o => o.getContentAsJSON()) || content));
      return __guardFunc__(callback, f => f(null));
    } catch (e) {
      return callback(`Unable to save: ${e.message}`);
    }
  }

  load(metadata, callback) {
    try {
      let content = window.localStorage.getItem(this._getKey(metadata.filename));
      return callback(null, cloudContentFactory.createEnvelopedCloudContent(content));
    } catch (e) {
      return callback(`Unable to load '${metadata.name}': ${e.message}`);
    }
  }

  list(metadata, callback) {
    let list = [];
    let prefix = this._getKey((__guard__(metadata, x => x.path()) || []).join('/'));
    for (let key of Object.keys(window.localStorage || {})) {
      if (key.substr(0, prefix.length) === prefix) {
        let [filename, ...remainder] = Array.from(key.substr(prefix.length).split('/'));
        let name = key.substr(prefix.length);
        if (this.matchesExtension(name)) {
          list.push(new CloudMetadata({
            name,
            type: remainder.length > 0 ? CloudMetadata.Folder : CloudMetadata.File,
            parent: metadata,
            provider: this
          })
          );
        }
      }
    }
    return callback(null, list);
  }

  remove(metadata, callback) {
    try {
      window.localStorage.removeItem(this._getKey(metadata.filename));
      return __guardFunc__(callback, f => f(null));
    } catch (error) {
      return __guardFunc__(callback, f1 => f1('Unable to delete'));
    }
  }

  rename(metadata, newName, callback) {
    try {
      let content = window.localStorage.getItem(this._getKey(metadata.filename));
      window.localStorage.setItem(this._getKey(CloudMetadata.withExtension(newName)), content);
      window.localStorage.removeItem(this._getKey(metadata.filename));
      metadata.rename(newName);
      return callback(null, metadata);
    } catch (error) {
      return __guardFunc__(callback, f => f('Unable to rename'));
    }
  }

  canOpenSaved() { return true; }

  openSaved(openSavedParams, callback) {
    let metadata = new CloudMetadata({
      name: openSavedParams,
      type: CloudMetadata.File,
      parent: null,
      provider: this
    });
    return this.load(metadata, (err, content) => callback(err, content, metadata));
  }

  getOpenSavedParams(metadata) {
    return metadata.name;
  }

  _getKey(name) {
    if (name == null) { name = ''; }
    return `cfm::${name.replace(/\t/g, ' ')}`;
  }
}
LocalStorageProvider.initClass();

export default LocalStorageProvider;

function __guardMethod__(obj, methodName, transform) {
  if (typeof obj !== 'undefined' && obj !== null && typeof obj[methodName] === 'function') {
    return transform(obj, methodName);
  } else {
    return undefined;
  }
}
function __guardFunc__(func, transform) {
  return typeof func === 'function' ? transform(func) : undefined;
}
function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}