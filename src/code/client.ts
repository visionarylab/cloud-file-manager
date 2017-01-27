import tr from './utils/translate';
import isString from './utils/is-string';
import base64Array from 'base64-js'; // https://github.com/beatgammit/base64-js

import { CloudFileManagerUI } from './ui';

import LocalStorageProvider from './providers/localstorage-provider';
import ReadOnlyProvider from './providers/readonly-provider';
import GoogleDriveProvider from './providers/google-drive-provider';
import LaraProvider from './providers/lara-provider';
import DocumentStoreProvider from './providers/document-store-provider';
import DocumentStoreShareProvider from './providers/document-store-share-provider';
import LocalFileProvider from './providers/local-file-provider';
import URLProvider from './providers/url-provider';

import { cloudContentFactory } from './providers/provider-interface';
import { CloudContent } from './providers/provider-interface';
import { CloudMetadata } from './providers/provider-interface';

class CloudFileManagerClientEvent {

  constructor(type, data, callback, state) {
    this.type = type;
    if (data == null) { data = {}; }
    this.data = data;
    if (callback == null) { callback = null; }
    this.callback = callback;
    if (state == null) { state = {}; }
    this.state = state;
  }
}

class CloudFileManagerClient {

  constructor(options) {
    this.state =
      {availableProviders: []};
    this._listeners = [];
    this._resetState();
    this._ui = new CloudFileManagerUI(this);
    this.providers = {};
    this.urlProvider = new URLProvider();
  }

  setAppOptions(appOptions){

    let providerName;
    if (appOptions == null) { appOptions = {}; }
    this.appOptions = appOptions;
    if (this.appOptions.wrapFileContent == null) { this.appOptions.wrapFileContent = true; }
    CloudContent.wrapFileContent = this.appOptions.wrapFileContent;

    // filter for available providers
    let allProviders = {};
    for (var Provider of [ReadOnlyProvider, LocalStorageProvider, GoogleDriveProvider, LaraProvider, DocumentStoreProvider, LocalFileProvider]) {
      if (Provider.Available()) {
        allProviders[Provider.Name] = Provider;
      }
    }

    // default to all providers if non specified
    if (!this.appOptions.providers) {
      this.appOptions.providers = [];
      for (providerName of Object.keys(allProviders || {})) {
        appOptions.providers.push(providerName);
      }
    }

    // preset the extension if Available
    CloudMetadata.Extension = this.appOptions.extension;
    CloudMetadata.ReadableExtensions = this.appOptions.readableExtensions || [];
    if (CloudMetadata.Extension) { CloudMetadata.ReadableExtensions.push(CloudMetadata.Extension); }

    let readableMimetypes = this.appOptions.readableMimeTypes || [];
    readableMimetypes.push(this.appOptions.mimeType);

    // check the providers
    let availableProviders = [];
    for (let provider of Array.from(this.appOptions.providers)) {
      let providerOptions;
      [providerName, providerOptions] = Array.from(isString(provider) ? [provider, {}] : [provider.name, provider]);
      // merge in other options as needed
      if (providerOptions.mimeType == null) { providerOptions.mimeType = this.appOptions.mimeType; }
      providerOptions.readableMimetypes = readableMimetypes;
      if (!providerName) {
        this.alert("Invalid provider spec - must either be string or object with name property");
      } else {
        if (allProviders[providerName]) {
          Provider = allProviders[providerName];
          provider = new Provider(providerOptions, this);
          this.providers[providerName] = provider;
          if (provider.urlDisplayName) {        // also add to here in providers list so we can look it up when parsing url hash
            this.providers[provider.urlDisplayName] = provider;
          }
          availableProviders.push(provider);
        } else {
          this.alert(`Unknown provider: ${providerName}`);
        }
      }
    }
    this._setState({
      availableProviders,
      shareProvider: new DocumentStoreShareProvider(this, this.providers[DocumentStoreProvider.Name])
    });

    if (!this.appOptions.ui) { this.appOptions.ui = {}; }
    if (!this.appOptions.ui.windowTitleSuffix) { this.appOptions.ui.windowTitleSuffix = document.title; }
    if (!this.appOptions.ui.windowTitleSeparator) { this.appOptions.ui.windowTitleSeparator = ' - '; }
    this._setWindowTitle();

    this._ui.init(this.appOptions.ui);

    // check for autosave
    if (this.appOptions.autoSaveInterval) {
      this.autoSave(this.appOptions.autoSaveInterval);
    }

    // initialize the cloudContentFactory with all data we want in the envelope
    cloudContentFactory.setEnvelopeMetadata({
      cfmVersion: '__PACKAGE_VERSION__', // replaced by version number at build time
      appName: this.appOptions.appName || "",
      appVersion: this.appOptions.appVersion || "",
      appBuildNum: this.appOptions.appBuildNum || ""
    });

    return this.newFileOpensInNewTab = __guard__(this.appOptions.ui, x => x.hasOwnProperty('newFileOpensInNewTab')) ? this.appOptions.ui.newFileOpensInNewTab : true;
  }

  setProviderOptions(name, newOptions) {
    return (() => {
      let result = [];
      for (let provider of Array.from(this.state.availableProviders)) {
        let item;
        if (provider.name === name) {
          if (provider.options == null) { provider.options = {}; }
          for (let key in newOptions) {
            provider.options[key] = newOptions[key];
          }
          break;
        }
        result.push(item);
      }
      return result;
    })();
  }

  connect() {
    return this._event('connected', {client: this});
  }

  //
  // Called from CloudFileManager.clientConnect to process the URL parameters
  // and initiate opening any document specified by URL parameters. The CFM
  // hash params are processed here after which providers are given a chance
  // to process any provider-specific URL parameters. Calls ready() if no
  // initial document opening occurs.
  //
  processUrlParams() {
    // process the hash params
    let providerName;
    let { hashParams } = this.appOptions;
    if (hashParams.sharedContentId) {
      return this.openSharedContent(hashParams.sharedContentId);
    } else if (hashParams.fileParams) {
      if (hashParams.fileParams.indexOf("http") === 0) {
        return this.openUrlFile(hashParams.fileParams);
      } else {
        let providerParams;
        [providerName, providerParams] = Array.from(hashParams.fileParams.split(':'));
        return this.openProviderFile(providerName, providerParams);
      }
    } else if (hashParams.copyParams) {
      return this.openCopiedFile(hashParams.copyParams);
    } else if (hashParams.newInFolderParams) {
      let folder;
      [providerName, folder] = Array.from(hashParams.newInFolderParams.split(':'));
      return this.createNewInFolder(providerName, folder);
    } else {
      // give providers a chance to process url params
      for (let provider of Array.from(this.state.availableProviders)) {
        if (provider.handleUrlParams()) { return; }
      }

      // if no providers handled it, then just signal ready()
      return this.ready();
    }
  }

  ready() {
    return this._event('ready');
  }

  listen(listener) {
    if (listener) {
      return this._listeners.push(listener);
    }
  }

  appendMenuItem(item) {
    this._ui.appendMenuItem(item); return this;
  }

  prependMenuItem(item) {
    this._ui.prependMenuItem(item); return this;
  }

  replaceMenuItem(key, item) {
    this._ui.replaceMenuItem(key, item); return this;
  }

  insertMenuItemBefore(key, item) {
    this._ui.insertMenuItemBefore(key, item); return this;
  }

  insertMenuItemAfter(key, item) {
    this._ui.insertMenuItemAfter(key, item); return this;
  }

  setMenuBarInfo(info) {
    return this._ui.setMenuBarInfo(info);
  }

  newFile(callback) {
    if (callback == null) { callback = null; }
    this._closeCurrentFile();
    this._resetState();
    window.location.hash = "";
    return this._event('newedFile', {content: ""});
  }

  newFileDialog(callback) {
    if (callback == null) { callback = null; }
    if (this.newFileOpensInNewTab) {
      return window.open(this.getCurrentUrl(), '_blank');
    } else if (this.state.dirty) {
      if (this._autoSaveInterval && this.state.metadata) {
        this.save();
        return this.newFile();
      } else {
        return this.confirm(tr('~CONFIRM.NEW_FILE'), () => this.newFile());
      }
    } else {
      return this.newFile();
    }
  }

  openFile(metadata, callback) {
    if (callback == null) { callback = null; }
    if (__guard__(__guard__(metadata, x1 => x1.provider), x => x.can('load', metadata))) {
      return metadata.provider.load(metadata, (err, content) => {
        if (err) { return this.alert(err, () => this.ready()); }
        // should wait to close current file until client signals open is complete
        this._closeCurrentFile();
        this._fileOpened(content, metadata, {openedContent: content.clone()}, this._getHashParams(metadata));
        __guardFunc__(callback, f => f(content, metadata));
        return metadata.provider.fileOpened(content, metadata);
      }
      );
    } else {
      return this.openFileDialog(callback);
    }
  }

  openFileDialog(callback) {
    if (callback == null) { callback = null; }
    let showDialog = () => {
      return this._ui.openFileDialog(metadata => {
        return this.openFile(metadata, callback);
      }
      );
    };
    if (!this.state.dirty) {
      return showDialog();
    } else {
      return this.confirm(tr('~CONFIRM.OPEN_FILE'), showDialog);
    }
  }

  closeFile(callback) {
    if (callback == null) { callback = null; }
    this._closeCurrentFile();
    this._resetState();
    window.location.hash = "";
    this._event('closedFile', {content: ""});
    return __guardFunc__(callback, f => f());
  }

  closeFileDialog(callback) {
    if (callback == null) { callback = null; }
    if (!this.state.dirty) {
      return this.closeFile(callback);
    } else {
      return this.confirm(tr('~CONFIRM.CLOSE_FILE'), () => this.closeFile(callback));
    }
  }

  importData(data, callback) {
    if (callback == null) { callback = null; }
    this._event('importedData', data);
    return __guardFunc__(callback, f => f(data));
  }

  importDataDialog(callback) {
    if (callback == null) { callback = null; }
    return this._ui.importDataDialog(data => {
      return this.importData(data, callback);
    }
    );
  }

  readLocalFile(file, callback) {
    if (callback == null) { callback = null; }
    let reader = new FileReader();
    reader.onload = loaded => __guardFunc__(callback, f => f({name: file.name, content: loaded.target.result}));
    return reader.readAsText(file);
  }

  openLocalFile(file, callback) {
    if (callback == null) { callback = null; }
    return this.readLocalFile(file, data => {
      let content = cloudContentFactory.createEnvelopedCloudContent(data.content);
      let metadata = new CloudMetadata({
        name: data.name,
        type: CloudMetadata.File
      });
      this._fileOpened(content, metadata, {openedContent: content.clone()});
      return __guardFunc__(callback, f => f(content, metadata));
    }
    );
  }

  importLocalFile(file, callback) {
    if (callback == null) { callback = null; }
    return this.readLocalFile(file, data => {
      return this.importData(data, callback);
    }
    );
  }

  openSharedContent(id) {
    return __guard__(this.state.shareProvider, x => x.loadSharedContent(id, (err, content, metadata) => {
      if (err) { return this.alert(err, () => this.ready()); }
      return this._fileOpened(content, metadata, {overwritable: false, openedContent: content.clone()});
    }));
  }

  // must be called as a result of user action (e.g. click) to avoid popup blockers
  parseUrlAuthorizeAndOpen() {
    if (__guard__(this.appOptions.hashParams, x => x.fileParams) != null) {
      let [providerName, providerParams] = Array.from(this.appOptions.hashParams.fileParams.split(':'));
      let provider = this.providers[providerName];
      if (provider) {
        return provider.authorize(() => {
          return this.openProviderFile(providerName(providerParams));
        }
        );
      }
    }
  }

  confirmAuthorizeAndOpen(provider, providerParams) {
    // trigger authorize() from confirmation dialog to avoid popup blockers
    return this.confirm(tr("~CONFIRM.AUTHORIZE_OPEN"), () => {
      return provider.authorize(() => {
        return provider.openSaved(providerParams, (err, content, metadata) => {
          if (err) { return this.alert(err); }
          this._fileOpened(content, metadata, {openedContent: content.clone()}, this._getHashParams(metadata));
          return provider.fileOpened(content, metadata);
        }
        );
      }
      );
    }
    );
  }

  openProviderFile(providerName, providerParams) {
    let provider = this.providers[providerName];
    if (provider) {
      return provider.authorized(authorized => {
        // we can open the document without authorization in some cases
        if (authorized || !provider.isAuthorizationRequired()) {
          return provider.openSaved(providerParams, (err, content, metadata) => {
            if (err) { return this.alert(err, () => this.ready()); }
            this._fileOpened(content, metadata, {openedContent: content.clone()}, this._getHashParams(metadata));
            return provider.fileOpened(content, metadata);
          }
          );
        } else {
          return this.confirmAuthorizeAndOpen(provider, providerParams);
        }
      }
      );
    } else {
      return this.alert(tr("~ALERT.NO_PROVIDER"), () => this.ready());
    }
  }

  openUrlFile(url) {
    return this.urlProvider.openFileFromUrl(url, (err, content, metadata) => {
      if (err) { return this.alert(err, () => this.ready()); }
      return this._fileOpened(content, metadata, {openedContent: content.clone()}, this._getHashParams(metadata));
    }
    );
  }

  createNewInFolder(providerName, folder) {
    let provider = this.providers[providerName];
    if (provider && provider.can('setFolder', this.state.metadata)) {
      if (this.state.metadata == null) {
        this.state.metadata = new CloudMetadata({
          type: CloudMetadata.File,
          provider
        });
      }

      this.state.metadata.parent = new CloudMetadata({
        type: CloudMetadata.Folder,
        providerData: {
          id: folder
        }
      });

      this._ui.editInitialFilename();
    }
    return this._event('newedFile', {content: ""});
  }

  setInitialFilename(filename) {
    this.state.metadata.rename(filename);
    return this.save();
  }

  isSaveInProgress() {
    return (this.state.saving != null);
  }

  confirmAuthorizeAndSave(stringContent, callback) {
    // trigger authorize() from confirmation dialog to avoid popup blockers
    return this.confirm(tr("~CONFIRM.AUTHORIZE_SAVE"), () => {
      return this.state.metadata.provider.authorize(() => {
        return this.saveFile(stringContent, this.state.metadata, callback);
      }
      );
    }
    );
  }

  save(callback) {
    if (callback == null) { callback = null; }
    return this._event('getContent', { shared: this._sharedMetadata() }, stringContent => {
      return this.saveContent(stringContent, callback);
    }
    );
  }

  saveContent(stringContent, callback) {
    if (callback == null) { callback = null; }
    let provider = __guard__(this.state.metadata, x => x.provider);
    if (provider != null) {
      return provider.authorized(isAuthorized => {
        // we can save the document without authorization in some cases
        if (isAuthorized || !provider.isAuthorizationRequired()) {
          return this.saveFile(stringContent, this.state.metadata, callback);
        } else {
          return this.confirmAuthorizeAndSave(stringContent, callback);
        }
      }
      );
    } else {
      return this.saveFileDialog(stringContent, callback);
    }
  }

  saveFile(stringContent, metadata, callback) {
    // must be able to 'resave' to save silently, i.e. without save dialog
    if (callback == null) { callback = null; }
    if (__guard__(__guard__(metadata, x1 => x1.provider), x => x.can('resave', metadata))) {
      return this.saveFileNoDialog(stringContent, metadata, callback);
    } else {
      return this.saveFileDialog(stringContent, callback);
    }
  }

  saveFileNoDialog(stringContent, metadata, callback) {
    if (callback == null) { callback = null; }
    this._setState({
      saving: metadata});
    let currentContent = this._createOrUpdateCurrentContent(stringContent, metadata);
    return metadata.provider.save(currentContent, metadata, (err, statusCode) => {
      if (err) {
        // disable autosave on save failure; clear "Saving..." message
        metadata.autoSaveDisabled = true;
        this._setState({ metadata, saving: null });
        if (statusCode === 403) {
          return this.confirmAuthorizeAndSave(stringContent, callback);
        } else {
          return this.alert(err);
        }
      }
      if (this.state.metadata !== metadata) {
        this._closeCurrentFile();
      }
      // reenable autosave on save success if this isn't a local file save
      if (metadata.autoSaveDisabled != null) { delete metadata.autoSaveDisabled; }
      this._fileChanged('savedFile', currentContent, metadata, {saved: true}, this._getHashParams(metadata));
      return __guardFunc__(callback, f => f(currentContent, metadata));
    }
    );
  }

  saveFileDialog(stringContent, callback) {
    if (stringContent == null) { stringContent = null; }
    if (callback == null) { callback = null; }
    return this._ui.saveFileDialog(metadata => {
      return this._dialogSave(stringContent, metadata, callback);
    }
    );
  }

  saveFileAsDialog(stringContent, callback) {
    if (stringContent == null) { stringContent = null; }
    if (callback == null) { callback = null; }
    return this._ui.saveFileAsDialog(metadata => {
      return this._dialogSave(stringContent, metadata, callback);
    }
    );
  }

  createCopy(stringContent, callback) {
    if (stringContent == null) { stringContent = null; }
    if (callback == null) { callback = null; }
    let saveAndOpenCopy = stringContent => {
      return this.saveCopiedFile(stringContent, __guard__(this.state.metadata, x => x.name), (err, copyParams) => {
        if (err) { return __guardFunc__(callback, f => f(err)); }
        window.open(this.getCurrentUrl(`#copy=${copyParams}`));
        return __guardFunc__(callback, f1 => f1(copyParams));
      }
      );
    };
    if (stringContent === null) {
      return this._event('getContent', {}, stringContent => saveAndOpenCopy(stringContent));
    } else {
      return saveAndOpenCopy(stringContent);
    }
  }

  saveCopiedFile(stringContent, name, callback) {
    try {
      let prefix = 'cfm-copy::';
      let maxCopyNumber = 0;
      for (let key of Object.keys(window.localStorage || {})) {
        if (key.substr(0, prefix.length) === prefix) {
          let copyNumber = parseInt(key.substr(prefix.length), 10);
          maxCopyNumber = Math.max(maxCopyNumber, copyNumber);
        }
      }
      maxCopyNumber++;
      let value = JSON.stringify({
        name: __guard__(name, x => x.length) > 0 ? `Copy of ${name}` : "Copy of Untitled Document",
        stringContent
      });
      window.localStorage.setItem(`${prefix}${maxCopyNumber}`, value);
      return __guardFunc__(callback, f => f(null, maxCopyNumber));
    } catch (e) {
      return callback("Unable to temporarily save copied file");
    }
  }

  openCopiedFile(copyParams) {
    try {
      let key = `cfm-copy::${copyParams}`;
      let copied = JSON.parse(window.localStorage.getItem(key));
      let content = cloudContentFactory.createEnvelopedCloudContent(copied.stringContent);
      let metadata = new CloudMetadata({
        name: copied.name,
        type: CloudMetadata.File
      });
      window.location.hash = "";
      this._fileOpened(content, metadata, {dirty: true, openedContent: content.clone()});
      return window.localStorage.removeItem(key);
    } catch (e) {
      return callback("Unable to load copied file");
    }
  }

  _sharedMetadata() {
    return __guard__(this.state.currentContent, x => x.getSharedMetadata()) || {};
  }

  shareGetLink() {
    return this._ui.shareDialog(this);
  }

  shareUpdate() {
    return this.share(() => this.alert((tr("~SHARE_UPDATE.MESSAGE")), (tr("~SHARE_UPDATE.TITLE"))));
  }

  toggleShare(callback) {
    if (this.isShared()) {
      return this.unshare(callback);
    } else {
      return this.share(callback);
    }
  }

  isShared() {
    return __guard__(this.state.currentContent, x => x.get("sharedDocumentId")) && !__guard__(this.state.currentContent, x1 => x1.get("isUnshared"));
  }

  canEditShared() {
    let accessKeys = __guard__(this.state.currentContent, x => x.get("accessKeys")) || {};
    let shareEditKey = __guard__(this.state.currentContent, x1 => x1.get("shareEditKey"));
    return (shareEditKey || accessKeys.readWrite) && !__guard__(this.state.currentContent, x2 => x2.get("isUnshared"));
  }

  setShareState(shared, callback) {
    if (this.state.shareProvider) {
      let sharingMetadata = this.state.shareProvider.getSharingMetadata(shared);
      return this._event('getContent', { shared: sharingMetadata }, stringContent => {
        this._setState({
          sharing: shared});
        let sharedContent = cloudContentFactory.createEnvelopedCloudContent(stringContent);
        sharedContent.addMetadata(sharingMetadata);
        let currentContent = this._createOrUpdateCurrentContent(stringContent, this.state.metadata);
        sharedContent.set('docName', currentContent.get('docName'));
        if (shared) {
          currentContent.remove('isUnshared');
        } else {
          currentContent.set('isUnshared', true);
        }
        return this.state.shareProvider.share(shared, currentContent, sharedContent, this.state.metadata, (err, sharedContentId) => {
          if (err) { return this.alert(err); }
          return __guardFunc__(callback, f => f(null, sharedContentId, currentContent));
        }
        );
      }
      );
    }
  }

  share(callback) {
    return this.setShareState(true, (err, sharedContentId, currentContent) => {
      this._fileChanged('sharedFile', currentContent, this.state.metadata);
      return __guardFunc__(callback, f => f(null, sharedContentId));
    }
    );
  }

  unshare(callback) {
    return this.setShareState(false, (err, sharedContentId, currentContent) => {
      this._fileChanged('unsharedFile', currentContent, this.state.metadata);
      return __guardFunc__(callback, f => f(null));
    }
    );
  }

  revertToShared(callback) {
    if (callback == null) { callback = null; }
    let id = __guard__(this.state.currentContent, x => x.get("sharedDocumentId"));
    if (id && (this.state.shareProvider != null)) {
      return this.state.shareProvider.loadSharedContent(id, (err, content, metadata) => {
        let docName;
        if (err) { return this.alert(err); }
        this.state.currentContent.copyMetadataTo(content);
        if (!metadata.name && (docName = content.get('docName'))) {
          metadata.name = docName;
        }
        this._fileOpened(content, metadata, {dirty: true, openedContent: content.clone()});
        return __guardFunc__(callback, f => f(null));
      }
      );
    }
  }

  revertToSharedDialog(callback) {
    if (callback == null) { callback = null; }
    if (__guard__(this.state.currentContent, x => x.get("sharedDocumentId")) && (this.state.shareProvider != null)) {
      return this.confirm(tr("~CONFIRM.REVERT_TO_SHARED_VIEW"), () => this.revertToShared(callback));
    }
  }

  downloadDialog(callback) {
    // should share metadata be included in downloaded local files?
    if (callback == null) { callback = null; }
    return this._event('getContent', { shared: this._sharedMetadata() }, content => {
      let envelopedContent = cloudContentFactory.createEnvelopedCloudContent(content);
      __guard__(this.state.currentContent, x => x.copyMetadataTo(envelopedContent));
      return this._ui.downloadDialog(__guard__(this.state.metadata, x1 => x1.name), envelopedContent, callback);
    }
    );
  }

  getDownloadBlob(content, includeShareInfo, mimeType) {
    let contentToSave;
    if (mimeType == null) { mimeType = 'text/plain'; }
    if (typeof content === "string") {
      if (mimeType.indexOf("image") >= 0) {
        contentToSave = base64Array.toByteArray(content);
      } else {
        contentToSave = content;
      }

    } else if (includeShareInfo) {
      contentToSave = JSON.stringify(content.getContent());

    } else { // not includeShareInfo
      // clone the document so we can delete the share info and not affect the original
      let json = content.clone().getContent();
      delete json.sharedDocumentId;
      delete json.shareEditKey;
      delete json.isUnshared;
      delete json.accessKeys;
      // CODAP moves the keys into its own namespace
      if (__guard__(json.metadata, x => x.shared) != null) { delete json.metadata.shared; }
      contentToSave = JSON.stringify(json);
    }

    return new Blob([contentToSave], {type: mimeType});
  }

  getDownloadUrl(content, includeShareInfo, mimeType) {
    if (mimeType == null) { mimeType = 'text/plain'; }
    let wURL = window.URL || window.webkitURL;
    if (wURL) { return wURL.createObjectURL(this.getDownloadBlob(content, includeShareInfo, mimeType)); }
  }

  rename(metadata, newName, callback) {
    let { dirty } = this.state;
    let _rename = metadata => {
      __guard__(this.state.currentContent, x => x.addMetadata({docName: metadata.name}));
      this._fileChanged('renamedFile', this.state.currentContent, metadata, {dirty}, this._getHashParams(metadata));
      return __guardFunc__(callback, f => f(newName));
    };
    if (newName !== __guard__(this.state.metadata, x => x.name)) {
      if (__guard__(__guard__(this.state.metadata, x2 => x2.provider), x1 => x1.can('rename', metadata))) {
        return this.state.metadata.provider.rename(this.state.metadata, newName, (err, metadata) => {
          if (err) { return this.alert(err); }
          return _rename(metadata);
        }
        );
      } else {
        if (metadata) {
          metadata.name = newName;
          metadata.filename = newName;
        } else {
          metadata = new CloudMetadata({
            name: newName,
            type: CloudMetadata.File
          });
        }
        return _rename(metadata);
      }
    }
  }

  renameDialog(callback) {
    if (callback == null) { callback = null; }
    return this._ui.renameDialog(__guard__(this.state.metadata, x => x.name), newName => {
      return this.rename(this.state.metadata, newName, callback);
    }
    );
  }

  revertToLastOpened(callback) {
    if (callback == null) { callback = null; }
    if ((this.state.openedContent != null) && this.state.metadata) {
      return this._fileOpened(this.state.openedContent, this.state.metadata, {openedContent: this.state.openedContent.clone()});
    }
  }

  revertToLastOpenedDialog(callback) {
    if (callback == null) { callback = null; }
    if ((this.state.openedContent != null) && this.state.metadata) {
      return this.confirm(tr('~CONFIRM.REVERT_TO_LAST_OPENED'), () => this.revertToLastOpened(callback));
    } else {
      return __guardFunc__(callback, f => f('No initial opened version was found for the currently active file'));
    }
  }

  saveSecondaryFileAsDialog(stringContent, extension, mimeType, callback) {
    let data = { content: stringContent, extension, mimeType };
    return this._ui.saveSecondaryFileAsDialog(data, metadata => {
      // replace defaults
      if (extension) {
        metadata.filename = CloudMetadata.newExtension(metadata.filename, extension);
      }
      if (mimeType) {
        metadata.mimeType = mimeType;
      }

      return this.saveSecondaryFile(stringContent, metadata, callback);
    }
    );
  }

  // Saves a file to backend, but does not update current metadata.
  // Used e.g. when exporting .csv files from CODAP
  saveSecondaryFile(stringContent, metadata, callback) {
    if (callback == null) { callback = null; }
    if (__guard__(__guard__(metadata, x1 => x1.provider), x => x.can('save', metadata))) {
      this._setState({
        saving: metadata});
      return metadata.provider.save(stringContent, metadata, (err, statusCode) => {
        if (err) {
          return this.alert(err);
        }
        this._setState({
          saving: null});
        return __guardFunc__(callback, f => f(currentContent, metadata));
      }
      );
    }
  }

  dirty(isDirty){
    if (isDirty == null) { isDirty = true; }
    return this._setState({
      dirty: isDirty,
      saved: this.state.saved && !isDirty
    });
  }

  autoSave(interval) {
    if (this._autoSaveInterval) {
      clearInterval(this._autoSaveInterval);
    }

    let shouldAutoSave = () => {
      return this.state.dirty &&
        !__guard__(this.state.metadata, x => x.autoSaveDisabled) &&
        !this.isSaveInProgress() &&
        __guard__(__guard__(this.state.metadata, x2 => x2.provider), x1 => x1.can('resave', this.state.metadata));
    };

    // in case the caller uses milliseconds
    if (interval > 1000) {
      interval = Math.round(interval / 1000);
    }
    if (interval > 0) {
      return this._autoSaveInterval = setInterval((() => { if (shouldAutoSave()) { return this.save(); } }), (interval * 1000));
    }
  }

  isAutoSaving() {
    return (this._autoSaveInterval != null);
  }

  showBlockingModal(modalProps) {
    return this._ui.showBlockingModal(modalProps);
  }

  hideBlockingModal() {
    return this._ui.hideBlockingModal();
  }

  getCurrentUrl(queryString) {
    if (queryString == null) { queryString = null; }
    let suffix = (queryString != null) ? `?${queryString}` : "";
    // Check browser support for document.location.origin (& window.location.origin)
    return `${document.location.origin}${document.location.pathname}${suffix}`;
  }

  // Takes an array of strings representing url parameters to be removed from the URL.
  // Removes the specified parameters from the URL and then uses the history API's
  // pushState() method to update the URL without reloading the page.
  // Adapted from http://stackoverflow.com/a/11654436.
  removeQueryParams(params) {
    let url = window.location.href;
    let hash = url.split('#');

    for (let key of Array.from(params)) {
      let re = new RegExp(`([?&])${key}=.*?(&|#|$)(.*)`, "g");

      if (re.test(url)) {
        hash[0] = hash[0].replace(re, '$1$3').replace(/(&|\?)$/, '');
      }
    }

    url = hash[0] + ((hash[1] != null) ? `#${hash[1]}` : '');

    if (url !== window.location.href) {
      return history.pushState({ originalUrl: window.location.href }, '', url);
    }
  }

  confirm(message, callback) {
    return this.confirmDialog({ message, callback });
  }

  confirmDialog(params) {
    return this._ui.confirmDialog(params);
  }

  alert(message, titleOrCallback, callback) {
    if (_.isFunction(titleOrCallback)) {
      callback = titleOrCallback;
      titleOrCallback = null;
    }
    return this._ui.alertDialog(message, (titleOrCallback || tr("~CLIENT_ERROR.TITLE")), callback);
  }

  _dialogSave(stringContent, metadata, callback) {
    if (stringContent !== null) {
      return this.saveFileNoDialog(stringContent, metadata, callback);
    } else {
      return this._event('getContent', { shared: this._sharedMetadata() }, stringContent => {
        return this.saveFileNoDialog(stringContent, metadata, callback);
      }
      );
    }
  }

  _fileChanged(type, content, metadata, additionalState, hashParams) {
    if (additionalState == null) { additionalState = {}; }
    if (hashParams == null) { hashParams = null; }
    __guard__(metadata, x => x.overwritable != null ? metadata.overwritable : (metadata.overwritable = true));
    this._updateState(content, metadata, additionalState, hashParams);
    return this._event(type, { content: __guard__(content, x1 => x1.getClientContent()), shared: this._sharedMetadata() });
  }

  _fileOpened(content, metadata, additionalState, hashParams) {
    if (additionalState == null) { additionalState = {}; }
    if (hashParams == null) { hashParams = null; }
    return this._event('openedFile', { content: __guard__(content, x => x.getClientContent()) }, (iError, iSharedMetadata) => {
      if (iError) { return this.alert(iError, () => this.ready()); }

      __guard__(metadata, x1 => x1.overwritable != null ? metadata.overwritable : (metadata.overwritable = true));
      if (!this.appOptions.wrapFileContent) {
        content.addMetadata(iSharedMetadata);
      }
      this._updateState(content, metadata, additionalState, hashParams);
      return this.ready();
    }
    );
  }

  _updateState(content, metadata, additionalState, hashParams) {
    if (additionalState == null) { additionalState = {}; }
    if (hashParams == null) { hashParams = null; }
    let state = {
      currentContent: content,
      metadata,
      saving: null,
      saved: false,
      dirty: !additionalState.saved && __guard__(content, x => x.requiresConversion())
    };
    for (let key of Object.keys(additionalState || {})) {
      let value = additionalState[key];
      state[key] = value;
    }
    this._setWindowTitle(__guard__(metadata, x1 => x1.name));
    if (hashParams !== null) {
      window.location.hash = hashParams;
    }
    return this._setState(state);
  }

  _event(type, data, eventCallback) {
    if (data == null) { data = {}; }
    if (eventCallback == null) { eventCallback = null; }
    let event = new CloudFileManagerClientEvent(type, data, eventCallback, this.state);
    return Array.from(this._listeners).map((listener) =>
      listener(event));
  }

  _setState(options) {
    for (let key of Object.keys(options || {})) {
      let value = options[key];
      this.state[key] = value;
    }
    return this._event('stateChanged');
  }

  _resetState() {
    return this._setState({
      openedContent: null,
      currentContent: null,
      metadata: null,
      dirty: false,
      saving: null,
      saved: false
    });
  }

  _closeCurrentFile() {
    if (__guard__(__guard__(this.state.metadata, x1 => x1.provider), x => x.can('close', this.state.metadata))) {
      return this.state.metadata.provider.close(this.state.metadata);
    }
  }

  _createOrUpdateCurrentContent(stringContent, metadata) {
    let currentContent;
    if (metadata == null) { metadata = null; }
    if (this.state.currentContent != null) {
      ({ currentContent } = this.state);
      currentContent.setText(stringContent);
    } else {
      currentContent = cloudContentFactory.createEnvelopedCloudContent(stringContent);
    }
    if (metadata != null) {
      currentContent.addMetadata({docName: metadata.name});
    }
    return currentContent;
  }

  _setWindowTitle(name) {
    if (__guard__(__guard__(this.appOptions, x1 => x1.ui), x => x.windowTitleSuffix)) {
      return document.title = `${__guard__(name, x2 => x2.length) > 0 ? name : (tr("~MENUBAR.UNTITLED_DOCUMENT"))}${this.appOptions.ui.windowTitleSeparator}${this.appOptions.ui.windowTitleSuffix}`;
    }
  }

  _getHashParams(metadata) {
    let openSavedParams;
    if (__guard__(__guard__(metadata, x1 => x1.provider), x => x.canOpenSaved()) && ((openSavedParams = __guard__(__guard__(metadata, x3 => x3.provider), x2 => x2.getOpenSavedParams(metadata))) != null)) {
      return `#file=${metadata.provider.urlDisplayName || metadata.provider.name}:${encodeURIComponent(openSavedParams)}`;
    } else if (__guard__(metadata, x4 => x4.provider) instanceof URLProvider &&
        (window.location.hash.indexOf("#file=http") === 0)) {
      return window.location.hash;    // leave it alone
    } else { return ""; }
  }
}

export { CloudFileManagerClientEvent, CloudFileManagerClient };

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}
function __guardFunc__(func, transform) {
  return typeof func === 'function' ? transform(func) : undefined;
}