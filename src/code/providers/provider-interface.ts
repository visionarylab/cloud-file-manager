let {div} = React.DOM;

import isString from '../utils/is-string';

class CloudFile {
  constructor(options) {
    ({content: this.content, metadata: this.metadata} = options);
  }
}

class CloudMetadata {
  static initClass() {
  
    this.Folder = 'folder';
    this.File = 'file';
    this.Label = 'label';
  
    this.Extension = null;
  }
  constructor(options) {
    let val, val1, val2;
    this.name = options.name,
      this.type = options.type,
      this.description = options.description,
      this.content = options.content,
      this.url = options.url,
      val = options.provider,
      this.provider = val != null ? val : null,
      val1 = options.parent,
      this.parent = val1 != null ? val1 : null,
      val2 = options.providerData,
      this.providerData = val2 != null ? val2 : {},
      this.overwritable = options.overwritable,
      this.sharedContentId = options.sharedContentId,
      this.sharedContentSecretKey = options.sharedContentSecretKey,
      this.mimeType = options.mimeType;
    this._updateFilename();
  }

  static mapTypeToCloudMetadataType(iType) {
    // for now mapping is 1-to-1 defaulting to 'file'
    return iType || this.File;
  }

  static withExtension(name, defaultExtension, keepOriginalExtension) {
    if (keepOriginalExtension && ~name.indexOf(".")) {
      return name;
    }
    let extension = CloudMetadata.Extension || defaultExtension;
    if (extension) {
      return this.newExtension(name, extension);
    } else {
      return name;
    }
  }

  static newExtension(name, extension) {
    // drop last extension, if there is one
    name = name.substr(0, name.lastIndexOf('.')) || name;
    return name + "." + extension;
  }

  path() {
    let _path = [];
    let { parent } = this;
    while (parent !== null) {
      _path.unshift(parent);
      ({ parent } = parent);
    }
    return _path;
  }

  rename(newName) {
    this.name = newName;
    return this._updateFilename();
  }

  _updateFilename() {
    this.filename = this.name;
    if ((__guard__(this.name, x => x.substr) != null) && (CloudMetadata.Extension != null) && (this.type === CloudMetadata.File)) {
      let extLen = CloudMetadata.Extension.length;
      if (this.name.substr(-extLen+1) === `.${CloudMetadata.Extension}`) { this.name = this.name.substr(0, this.name.length - (extLen+1)); }
      return this.filename = CloudMetadata.withExtension(this.name, null, true);
    }
  }
}
CloudMetadata.initClass();

// singleton that can create CloudContent wrapped with global options
class CloudContentFactory {
  constructor() {
    this.envelopeMetadata = {};
  }

  // set initial envelopeMetadata or update individual properties
  setEnvelopeMetadata(envelopeMetadata) {
    return (() => {
      let result = [];
      for (let key in envelopeMetadata) {
        result.push(this.envelopeMetadata[key] = envelopeMetadata[key]);
      }
      return result;
    })();
  }

  // returns new CloudContent containing enveloped data
  createEnvelopedCloudContent(content) {
    return new CloudContent((this.envelopContent(content)), (this._identifyContentFormat(content)));
  }

  // envelops content with metadata, returns an object.
  // If content was already an object (Object or JSON) with metadata,
  // any existing metadata will be retained.
  // Note: calling `envelopContent` may be safely called on something that
  // has already had `envelopContent` called on it, and will be a no-op.
  envelopContent(content) {
    let envelopedCloudContent = this._wrapIfNeeded(content);
    for (let key in this.envelopeMetadata) {
      if (envelopedCloudContent[key] == null) { envelopedCloudContent[key] = this.envelopeMetadata[key]; }
    }
    return envelopedCloudContent;
  }

  _identifyContentFormat(content) {
    if (content == null) { return; }
    let result = { isCfmWrapped: false, isPreCfmFormat: false };
    if (isString(content)) {
      try { content = JSON.parse(content); } catch (error) {}
    }
    // Currently, we assume 'metadata' is top-level property in
    // non-CFM-wrapped documents. Could put in a client callback
    // that would identify whether the document required
    // conversion to eliminate this assumption from the CFM.
    if (content.metadata) {
      return result;
    }
    if ((content.cfmVersion != null) || (content.content != null)) {
      result.isCfmWrapped = true;
    } else {
      result.isPreCfmFormat = true;
    }
    return result;
  }

  // envelops content in {content: content} if needed, returns an object
  _wrapIfNeeded(content) {
    if (isString(content)) {
      try { content = JSON.parse(content); } catch (error) {}
    }
    if (content.content != null) {
      return content;
    } else {
      return {content};
    }
  }
}

class CloudContent {
  static initClass() {
    // wrapping defaults to true but can be overridden by client via appOptions
    this.wrapFileContent = true;
  }

  constructor(_, _contentFormat) {
    if (_ == null) { _ = {}; }
    this._ = _;
    this._contentFormat = _contentFormat;
  }

  // getContent and getContentAsJSON return the file content as stored on disk
  getContent() {
    if (CloudContent.wrapFileContent) { return this._; } else { return this._.content; }
  }
  getContentAsJSON() {
    return JSON.stringify(CloudContent.wrapFileContent ? this._ : this._.content);
  }

  // returns the client-visible content (excluding wrapper for wrapped clients)
  getClientContent() {
    return this._.content;
  }

  requiresConversion() {
    return (CloudContent.wrapFileContent !== __guard__(this._contentFormat, x => x.isCfmWrapped)) || __guard__(this._contentFormat, x1 => x1.isPreCfmFormat);
  }

  clone() { return new CloudContent((_.cloneDeep(this._)), (_.cloneDeep(this._contentFormat))); }

  setText(text) { return this._.content = text; }
  getText() { if (this._.content === null) { return ''; } else if (isString(this._.content)) { return this._.content; } else { return JSON.stringify(this._.content); } }

  addMetadata(metadata) { return (() => {
    let result = [];
    for (let key in metadata) {
      result.push(this._[key] = metadata[key]);
    }
    return result;
  })(); }
  get(prop) { return this._[prop]; }
  set(prop, value) { return this._[prop] = value; }
  remove(prop) { return delete this._[prop]; }

  getSharedMetadata() {
    // only include necessary fields
    let shared = {};
    if (this._._permissions != null) { shared._permissions = this._._permissions; }
    if (this._.shareEditKey != null) { shared.shareEditKey = this._.shareEditKey; }
    if (this._.sharedDocumentId != null) { shared.sharedDocumentId = this._.sharedDocumentId; }
    if (this._.accessKeys != null) { shared.accessKeys = this._.accessKeys; }
    return shared;
  }

  copyMetadataTo(to) {
    let metadata = {};
    for (let key of Object.keys(this._ || {})) {
      let value = this._[key];
      if (key !== 'content') {
        metadata[key] = value;
      }
    }
    return to.addMetadata(metadata);
  }
}
CloudContent.initClass();

class ProviderInterface {

  constructor(options) {
    ({name: this.name, displayName: this.displayName, urlDisplayName: this.urlDisplayName, capabilities: this.capabilities} = options);
  }

  static Available() { return true; }

  can(capability) {
    return this.capabilities[capability];
  }

  isAuthorizationRequired() {
    return false;
  }

  authorized(callback) {
    if (callback) {
      return callback(true);
    } else {
      return true;
    }
  }

  renderAuthorizationDialog() {
    return (AuthorizationNotImplementedDialog({provider: this}));
  }

  renderUser() {
    return null;
  }

  filterTabComponent(capability, defaultComponent) {
    return defaultComponent;
  }

  matchesExtension(name) {
    if (!name) { return false; }
    if ((CloudMetadata.ReadableExtensions != null) && (CloudMetadata.ReadableExtensions.length > 0)) {
      for (let extension of Array.from(CloudMetadata.ReadableExtensions)) {
        if (name.substr(-extension.length) === extension) { return true; }
        if (extension === "") {
          if (!~name.indexOf(".")) { return true; }
        }
      }
      return false;
    } else {
      // may seem weird but it means that without an extension specified all files match
      return true;
    }
  }

  handleUrlParams() {
    return false; // by default, no additional URL handling
  }

  dialog(callback) {
    return this._notImplemented('dialog');
  }

  save(content, metadata, callback) {
    return this._notImplemented('save');
  }

  load(callback) {
    return this._notImplemented('load');
  }

  list(metadata, callback) {
    return this._notImplemented('list');
  }

  remove(metadata, callback) {
    return this._notImplemented('remove');
  }

  rename(metadata, newName, callback) {
    return this._notImplemented('rename');
  }

  close(metadata, callback) {
    return this._notImplemented('close');
  }

  setFolder(metadata) {
    return this._notImplemented('setFolder');
  }

  canOpenSaved() { return false; }

  openSaved(openSavedParams, callback) {
    return this._notImplemented('openSaved');
  }

  getOpenSavedParams(metadata) {
    return this._notImplemented('getOpenSavedParams');
  }

  fileOpened() {}
    // do nothing by default

  _notImplemented(methodName) {
    // this uses a browser alert instead of client.alert because this is just here for debugging
    return alert(`${methodName} not implemented for ${this.name} provider`);
  }
}

export default {
  CloudFile,
  CloudMetadata,
  CloudContent,
  cloudContentFactory: new CloudContentFactory(),
  ProviderInterface
};

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}