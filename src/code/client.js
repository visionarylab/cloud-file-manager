// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__
 * DS203: Remove `|| {}` from converted for-own loops
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import tr  from './utils/translate'
import isString  from './utils/is-string'
import base64Array  from 'base64-js' // https://github.com/beatgammit/base64-js
import getQueryParam  from './utils/get-query-param'

import { CloudFileManagerUI }  from './ui'

import LocalStorageProvider  from './providers/localstorage-provider'
import ReadOnlyProvider  from './providers/readonly-provider'
import GoogleDriveProvider  from './providers/google-drive-provider'
import LaraProvider  from './providers/lara-provider'
import DocumentStoreProvider  from './providers/document-store-provider'
import DocumentStoreShareProvider  from './providers/document-store-share-provider'
import LocalFileProvider  from './providers/local-file-provider'
import PostMessageProvider  from './providers/post-message-provider'
import URLProvider  from './providers/url-provider'

import { ProviderInterface }  from './providers/provider-interface'
import { cloudContentFactory }  from './providers/provider-interface'
import { CloudContent }  from './providers/provider-interface'
import { CloudMetadata }  from './providers/provider-interface'
import { reportError } from "./utils/report-error"


let CLOUDFILEMANAGER_EVENT_ID =0
const CLOUDFILEMANAGER_EVENTS ={}

class CloudFileManagerClientEvent {
  constructor(type, data, callback = null, state) {
    this.type = type
    if (data == null) { data = {} }
    this.data = data
    this.callback = callback
    if (state == null) { state = {} }
    this.state = state
    CLOUDFILEMANAGER_EVENT_ID++
    /** @type {number} */
    this.id = CLOUDFILEMANAGER_EVENT_ID
  }

  postMessage(iframe) {
    if (this.callback) {
      CLOUDFILEMANAGER_EVENTS[this.id] = this
    }
    // remove client from data to avoid structured clone error in postMessage
    const eventData = _.clone(this.data)
    delete eventData.client
    const message = {type: "cfm::event", eventId: this.id, eventType: this.type, eventData}
    return iframe.postMessage(message, "*")
  }
}

class CloudFileManagerClient {
  constructor(options) {
    this.shouldAutoSave = this.shouldAutoSave.bind(this)
    this.state =
      {availableProviders: []}
    this._listeners = []
    this._resetState()
    this._ui = new CloudFileManagerUI(this)
    this.providers = {}
    this.urlProvider = new URLProvider()
  }

  setAppOptions(appOptions){

    let providerName
    let Provider
    if (appOptions == null) { appOptions = {} }
    this.appOptions = appOptions
    if (this.appOptions.wrapFileContent == null) { this.appOptions.wrapFileContent = true }
    CloudContent.wrapFileContent = this.appOptions.wrapFileContent

    // Determine the available providers. Note that order in the list can
    // be significant in provider searches (e.g. @autoProvider).
    const allProviders = {}
    const providerList = [
      LocalStorageProvider,
      ReadOnlyProvider,
      GoogleDriveProvider,
      LaraProvider,
      DocumentStoreProvider,
      LocalFileProvider,
      PostMessageProvider
    ]
    for (Provider of Array.from(providerList)) {
      if (Provider.Available()) {
        allProviders[Provider.Name] = Provider
      }
    }

    // default to all providers if non specified
    if (!this.appOptions.providers) {
      this.appOptions.providers = []
      for (providerName of Object.keys(allProviders || {})) {
        appOptions.providers.push(providerName)
      }
    }

    // preset the extension if Available
    CloudMetadata.Extension = this.appOptions.extension
    CloudMetadata.ReadableExtensions = this.appOptions.readableExtensions || []
    if (CloudMetadata.Extension) { CloudMetadata.ReadableExtensions.push(CloudMetadata.Extension) }

    const readableMimetypes = this.appOptions.readableMimeTypes || []
    readableMimetypes.push(this.appOptions.mimeType)

    // check the providers
    const requestedProviders = this.appOptions.providers.slice()
    if (getQueryParam("saveSecondaryFileViaPostMessage")) {
      requestedProviders.push('postMessage')
    }
    const availableProviders = []
    let shareProvider = null
    for (let providerSpec of Array.from(requestedProviders)) {
      let providerOptions;
      [providerName, providerOptions] = Array.from(isString(providerSpec) 
                                          ? [providerSpec, {}] 
                                          : [providerSpec.name, providerSpec])
      // merge in other options as needed
      if (providerOptions.mimeType == null) { providerOptions.mimeType = this.appOptions.mimeType }
      providerOptions.readableMimetypes = readableMimetypes
      if (!providerName) {
        this.alert("Invalid provider spec - must either be string or object with name property")
      } else {
        if (providerSpec.createProvider) {
          allProviders[providerName] = providerSpec.createProvider(ProviderInterface)
        }
        if (allProviders[providerName]) {
          Provider = allProviders[providerName]
          const provider = new Provider(providerOptions, this)
          this.providers[providerName] = provider
          // if we're using the DocumentStoreProvider, instantiate the ShareProvider
          if (providerName === DocumentStoreProvider.Name) {
            shareProvider = new DocumentStoreShareProvider(this, provider)
          }
          if (provider.urlDisplayName) {        // also add to here in providers list so we can look it up when parsing url hash
            this.providers[provider.urlDisplayName] = provider
          }
          availableProviders.push(provider)
        } else {
          this.alert(`Unknown provider: ${providerName}`)
        }
      }
    }
    this._setState({
      availableProviders,
      shareProvider
    })

    if (!this.appOptions.ui) { this.appOptions.ui = {} }
    if (!this.appOptions.ui.windowTitleSuffix) { this.appOptions.ui.windowTitleSuffix = document.title }
    if (!this.appOptions.ui.windowTitleSeparator) { this.appOptions.ui.windowTitleSeparator = ' - ' }
    this._setWindowTitle()

    this._ui.init(this.appOptions.ui)

    // check for autosave
    if (this.appOptions.autoSaveInterval) {
      this.autoSave(this.appOptions.autoSaveInterval)
    }

    // initialize the cloudContentFactory with all data we want in the envelope
    cloudContentFactory.setEnvelopeMetadata({
      cfmVersion: '__PACKAGE_VERSION__', // replaced by version number at build time
      appName: this.appOptions.appName || "",
      appVersion: this.appOptions.appVersion || "",
      appBuildNum: this.appOptions.appBuildNum || ""
    })

    this.newFileOpensInNewTab = (this.appOptions.ui != null ? this.appOptions.ui.hasOwnProperty('newFileOpensInNewTab') : undefined) ? this.appOptions.ui.newFileOpensInNewTab : true
    this.newFileAddsNewToQuery = this.appOptions.ui != null ? this.appOptions.ui.newFileAddsNewToQuery : undefined

    if (this.appOptions.ui != null ? this.appOptions.ui.confirmCloseIfDirty : undefined) {
      this._setupConfirmOnClose()
    }

    return this._startPostMessageListener()
  }

  setProviderOptions(name, newOptions) {
    const result = []
    for (let provider of Array.from(this.state.availableProviders)) {
      if (provider.name === name) {
        if (provider.options == null) { provider.options = {} }
        for (let key in newOptions) {
          provider.options[key] = newOptions[key]
        }
        break
      } else {
        result.push(undefined)
      }
    }
    return result
  }

  connect() {
    return this._event('connected', {client: this})
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
    let providerName
    const { hashParams } = this.appOptions
    if (hashParams.sharedContentId) {
      return this.openSharedContent(hashParams.sharedContentId)
    } else if (hashParams.fileParams) {
      if (hashParams.fileParams.indexOf("http") === 0) {
        return this.openUrlFile(hashParams.fileParams)
      } else {
        let providerParams;
        [providerName, providerParams] = Array.from(hashParams.fileParams.split(':'))
        return this.openProviderFile(providerName, providerParams)
      }
    } else if (hashParams.copyParams) {
      return this.openCopiedFile(hashParams.copyParams)
    } else if (hashParams.newInFolderParams) {
      let folder;
      [providerName, folder] = Array.from(hashParams.newInFolderParams.split(':'))
      return this.createNewInFolder(providerName, folder)
    } else if (this.haveTempFile()) {
      return this.openAndClearTempFile()
    } else {
      // give providers a chance to process url params
      for (let provider of Array.from(this.state.availableProviders)) {
        if (provider.handleUrlParams()) { return }
      }

      // if no providers handled it, then just signal ready()
      return this.ready()
    }
  }

  ready() {
    return this._event('ready')
  }

  rendered() {
    return this._event('rendered', {client: this})
  }

  listen(listener) {
    if (listener) {
      return this._listeners.push(listener)
    }
  }

  log(event, eventData) {
    this._event('log', {logEvent: event, logEventData: eventData})
    if (this.appOptions.log) {
      return this.appOptions.log(event, eventData)
    }
  }

  autoProvider(capability) {
    for (let provider of Array.from(this.state.availableProviders)) {
      if (provider.canAuto(capability)) { return provider }
    }
  }

  appendMenuItem(item) {
    this._ui.appendMenuItem(item); return this
  }

  prependMenuItem(item) {
    this._ui.prependMenuItem(item); return this
  }

  replaceMenuItem(key, item) {
    this._ui.replaceMenuItem(key, item); return this
  }

  insertMenuItemBefore(key, item) {
    this._ui.insertMenuItemBefore(key, item); return this
  }

  insertMenuItemAfter(key, item) {
    this._ui.insertMenuItemAfter(key, item); return this
  }

  setMenuBarInfo(info) {
    return this._ui.setMenuBarInfo(info)
  }

  newFile(callback = null) {
    this._closeCurrentFile()
    this._resetState()
    window.location.hash = ""
    return this._event('newedFile', {content: ""})
  }

  newFileDialog(callback = null) {
    if (this.newFileOpensInNewTab) {
      return window.open(this.getCurrentUrl(this.newFileAddsNewToQuery ? "#new" : null), '_blank')
    } else if (this.state.dirty) {
      if (this._autoSaveInterval && this.state.metadata) {
        this.save()
        return this.newFile()
      } else {
        return this.confirm(tr('~CONFIRM.NEW_FILE'), () => this.newFile())
      }
    } else {
      return this.newFile()
    }
  }

  openFile(metadata, callback = null) {
    if (__guard__(metadata != null ? metadata.provider : undefined, x => x.can('load', metadata))) {
      this._event('willOpenFile', {op: "openFile"})
      return metadata.provider.load(metadata, (err, content) => {
        if (err) { return this.alert(err, () => this.ready()) }
        // should wait to close current file until client signals open is complete
        this._closeCurrentFile()
        this._fileOpened(content, metadata, {openedContent: content.clone()}, this._getHashParams(metadata))
        if (typeof callback === 'function') {
          callback(content, metadata)
        }
        return metadata.provider.fileOpened(content, metadata)
      })
    } else {
      return this.openFileDialog(callback)
    }
  }

  openFileDialog(callback = null) {
    const showDialog = () => {
      return this._ui.openFileDialog(metadata => {
        return this.openFile(metadata, callback)
      })
    }
    if (!this.state.dirty) {
      return showDialog()
    } else {
      return this.confirm(tr('~CONFIRM.OPEN_FILE'), showDialog)
    }
  }

  closeFile(callback = null) {
    this._closeCurrentFile()
    this._resetState()
    window.location.hash = ""
    this._event('closedFile', {content: ""})
    return (typeof callback === 'function' ? callback() : undefined)
  }

  closeFileDialog(callback = null) {
    if (!this.state.dirty) {
      return this.closeFile(callback)
    } else {
      return this.confirm(tr('~CONFIRM.CLOSE_FILE'), () => this.closeFile(callback))
    }
  }

  importData(data, callback = null) {
    this._event('importedData', data)
    return (typeof callback === 'function' ? callback(data) : undefined)
  }

  importDataDialog(callback = null) {
    return this._ui.importDataDialog(data => {
      return this.importData(data, callback)
    })
  }

  readLocalFile(file, callback=null) {
    const reader = new FileReader()
    reader.onload = loaded => typeof callback === 'function' ? callback({name: file.name, content: loaded.target.result}) : undefined
    return reader.readAsText(file)
  }

  openLocalFile(file, callback=null) {
    this._event('willOpenFile', {op: "openLocalFile"})
    return this.readLocalFile(file, data => {
      const content = cloudContentFactory.createEnvelopedCloudContent(data.content)
      const metadata = new CloudMetadata({
        name: data.name,
        type: CloudMetadata.File
      })
      this._fileOpened(content, metadata, {openedContent: content.clone()})
      return (typeof callback === 'function' ? callback(content, metadata) : undefined)
    })
  }

  importLocalFile(file, callback=null) {
    return this.readLocalFile(file, data => {
      return this.importData(data, callback)
    })
  }

  openSharedContent(id) {
    this._event('willOpenFile', {op: "openSharedContent"})
    return (this.state.shareProvider != null ? this.state.shareProvider.loadSharedContent(id, (err, content, metadata) => {
      if (err) { return this.alert(err, () => this.ready()) }
      return this._fileOpened(content, metadata, {overwritable: false, openedContent: content.clone()})
  }) : undefined)
  }

  // must be called as a result of user action (e.g. click) to avoid popup blockers
  parseUrlAuthorizeAndOpen() {
    if ((this.appOptions.hashParams != null ? this.appOptions.hashParams.fileParams : undefined) != null) {
      const [providerName, providerParams] = Array.from(this.appOptions.hashParams.fileParams.split(':'))
      const provider = this.providers[providerName]
      if (provider) {
        return provider.authorize(() => {
          return this.openProviderFile(providerName(providerParams))
        })
      }
    }
  }

  confirmAuthorizeAndOpen(provider, providerParams) {
    // trigger authorize() from confirmation dialog to avoid popup blockers
    return this.confirm(tr("~CONFIRM.AUTHORIZE_OPEN"), () => {
      return provider.authorize(() => {
        this._event('willOpenFile', {op: "confirmAuthorizeAndOpen"})
        return provider.openSaved(providerParams, (err, content, metadata) => {
          if (err) { return this.alert(err) }
          this._fileOpened(content, metadata, {openedContent: content.clone()}, this._getHashParams(metadata))
          return provider.fileOpened(content, metadata)
        })
      })
    })
  }

  openProviderFile(providerName, providerParams) {
    const provider = this.providers[providerName]
    if (provider) {
      return provider.authorized(authorized => {
        // we can open the document without authorization in some cases
        if (authorized || !provider.isAuthorizationRequired()) {
          this._event('willOpenFile', {op: "openProviderFile"})
          return provider.openSaved(providerParams, (err, content, metadata) => {
            if (err) { return this.alert(err, () => this.ready()) }
            this._fileOpened(content, metadata, {openedContent: content.clone()}, this._getHashParams(metadata))
            return provider.fileOpened(content, metadata)
          })
        } else {
          return this.confirmAuthorizeAndOpen(provider, providerParams)
        }
      })
    } else {
      return this.alert(tr("~ALERT.NO_PROVIDER"), () => this.ready())
    }
  }

  openUrlFile(url) {
    return this.urlProvider.openFileFromUrl(url, (err, content, metadata) => {
      this._event('willOpenFile', {op: "openUrlFile"})
      if (err) { return this.alert(err, () => this.ready()) }
      return this._fileOpened(content, metadata, {openedContent: content.clone()}, this._getHashParams(metadata))
    })
  }

  createNewInFolder(providerName, folder) {
    const provider = this.providers[providerName]
    if (provider && provider.can('setFolder', this.state.metadata)) {
      if ((this.state.metadata == null)) {
        this.state.metadata = new CloudMetadata({
          type: CloudMetadata.File,
          provider
        })
      }

      this.state.metadata.parent = new CloudMetadata({
        type: CloudMetadata.Folder,
        providerData: {
          id: folder
        }
      })

      this._ui.editInitialFilename()
    }
    return this._event('newedFile', {content: ""})
  }

  setInitialFilename(filename) {
    this.state.metadata.rename(filename)
    return this.save()
  }

  isSaveInProgress() {
    return (this.state.saving != null)
  }

  confirmAuthorizeAndSave(stringContent, callback) {
    // trigger authorize() from confirmation dialog to avoid popup blockers
    return this.confirm(tr("~CONFIRM.AUTHORIZE_SAVE"), () => {
      return this.state.metadata.provider.authorize(() => {
        return this.saveFile(stringContent, this.state.metadata, callback)
      })
    })
  }

  save(callback = null) {
    return this._event('getContent', { shared: this._sharedMetadata() }, stringContent => {
      return this.saveContent(stringContent, callback)
    })
  }

  saveContent(stringContent, callback = null) {
    const provider = (this.state.metadata != null ? this.state.metadata.provider : undefined) || this.autoProvider('save')
    if (provider != null) {
      return provider.authorized(isAuthorized => {
        // we can save the document without authorization in some cases
        if (isAuthorized || !provider.isAuthorizationRequired()) {
          return this.saveFile(stringContent, this.state.metadata, callback)
        } else {
          return this.confirmAuthorizeAndSave(stringContent, callback)
        }
      })
    } else {
      return this.saveFileDialog(stringContent, callback)
    }
  }

  saveFile(stringContent, metadata, callback = null) {
    // must be able to 'resave' to save silently, i.e. without save dialog
    if (__guard__(metadata != null ? metadata.provider : undefined, x => x.can('resave', metadata))) {
      return this.saveFileNoDialog(stringContent, metadata, callback)
    } else {
      return this.saveFileDialog(stringContent, callback)
    }
  }

  saveFileNoDialog(stringContent, metadata, callback = null) {
    this._setState({
      saving: metadata})
    const currentContent = this._createOrUpdateCurrentContent(stringContent, metadata)
    return metadata.provider.save(currentContent, metadata, (err, statusCode) => {
      if (err) {
        // disable autosave on save failure; clear "Saving..." message
        metadata.autoSaveDisabled = true
        this._setState({ metadata, saving: null })
        if (statusCode === 403) {
          return this.confirmAuthorizeAndSave(stringContent, callback)
        } else {
          return this.alert(err)
        }
      }
      if (this.state.metadata !== metadata) {
        this._closeCurrentFile()
      }
      // reenable autosave on save success if this isn't a local file save
      if (metadata.autoSaveDisabled != null) { delete metadata.autoSaveDisabled }
      this._fileChanged('savedFile', currentContent, metadata, {saved: true}, this._getHashParams(metadata))
      return (typeof callback === 'function' ? callback(currentContent, metadata) : undefined)
    })
  }

  saveFileDialog(stringContent = null, callback = null) {
    return this._ui.saveFileDialog(metadata => {
      return this._dialogSave(stringContent, metadata, callback)
    })
  }

  saveFileAsDialog(stringContent = null, callback = null) {
    return this._ui.saveFileAsDialog(metadata => {
      return this._dialogSave(stringContent, metadata, callback)
    })
  }

  createCopy(stringContent = null, callback = null) {
    const saveAndOpenCopy = stringContent => {
      return this.saveCopiedFile(stringContent, this.state.metadata != null ? this.state.metadata.name : undefined, (err, copyParams) => {
        if (err) { return (typeof callback === 'function' ? callback(err) : undefined) }
        window.open(this.getCurrentUrl(`#copy=${copyParams}`))
        return (typeof callback === 'function' ? callback(copyParams) : undefined)
      })
    }
    if (stringContent === null) {
      return this._event('getContent', {}, stringContent => saveAndOpenCopy(stringContent))
    } else {
      return saveAndOpenCopy(stringContent)
    }
  }

  saveCopiedFile(stringContent, name, callback) {
    try {
      const prefix = 'cfm-copy::'
      let maxCopyNumber = 0
      for (let key of Object.keys(window.localStorage || {})) {
        if (key.substr(0, prefix.length) === prefix) {
          const copyNumber = parseInt(key.substr(prefix.length), 10)
          maxCopyNumber = Math.max(maxCopyNumber, copyNumber)
        }
      }
      maxCopyNumber++
      const value = JSON.stringify({
        name: (name != null ? name.length : undefined) > 0 ? `Copy of ${name}` : "Copy of Untitled Document",
        stringContent
      })
      window.localStorage.setItem(`${prefix}${maxCopyNumber}`, value)
      return (typeof callback === 'function' ? callback(null, maxCopyNumber) : undefined)
    } catch (e) {
      return callback("Unable to temporarily save copied file")
    }
  }

  openCopiedFile(copyParams) {
    this._event('willOpenFile', {op: "openCopiedFile"})
    try {
      const key = `cfm-copy::${copyParams}`
      const copied = JSON.parse(window.localStorage.getItem(key))
      const content = cloudContentFactory.createEnvelopedCloudContent(copied.stringContent)
      const metadata = new CloudMetadata({
        name: copied.name,
        type: CloudMetadata.File
      })
      window.location.hash = ""
      this._fileOpened(content, metadata, {dirty: true, openedContent: content.clone()})
      return window.localStorage.removeItem(key)
    } catch (e) {
      reportError("Unable to load copied file")
    }
  }

  haveTempFile() {
    try {
      const key = "cfm-tempfile"
      return !!(JSON.parse(window.localStorage.getItem(key)))
    } catch (e) {
      return false
    }
  }

  saveTempFile(callback) {
    return this._event('getContent', { shared: this._sharedMetadata() }, stringContent => {
      const currentContent = this._createOrUpdateCurrentContent(stringContent)
      try {
        const key = "cfm-tempfile"
        const value = JSON.stringify({
          stringContent})
        window.localStorage.setItem(key, value)
        const metadata = new CloudMetadata({
          name: currentContent.name,
          type: CloudMetadata.File
        })
        this._fileChanged('savedFile', currentContent, metadata, {saved: true}, "")
        return (typeof callback === 'function' ? callback(null) : undefined)
      } catch (e) {
        return callback("Unable to temporarily save copied file")
      }
    })
  }

  openAndClearTempFile() {
    this._event('willOpenFile', {op: "openAndClearTempFile"})
    try {
      const key = "cfm-tempfile"
      const tempFile = JSON.parse(window.localStorage.getItem(key))
      const content = cloudContentFactory.createEnvelopedCloudContent(tempFile.stringContent)
      const metadata = new CloudMetadata({
        name: tempFile.name,
        type: CloudMetadata.File
      })
      this._fileOpened(content, metadata, {dirty: true, openedContent: content.clone()})
      return window.localStorage.removeItem(key)
    } catch (e) {
      reportError("Unable to load temp file")
    }
  }

  _sharedMetadata() {
    return (this.state.currentContent != null ? this.state.currentContent.getSharedMetadata() : undefined) || {}
  }

  shareGetLink() {
    return this._ui.shareDialog(this)
  }

  shareUpdate() {
    return this.share(() => this.alert((tr("~SHARE_UPDATE.MESSAGE")), (tr("~SHARE_UPDATE.TITLE"))))
  }

  toggleShare(callback) {
    if (this.isShared()) {
      return this.unshare(callback)
    } else {
      return this.share(callback)
    }
  }

  isShared() {
    return (this.state.currentContent != null ? this.state.currentContent.get("sharedDocumentId") : undefined) && !(this.state.currentContent != null ? this.state.currentContent.get("isUnshared") : undefined)
  }

  canEditShared() {
    const accessKeys = (this.state.currentContent != null ? this.state.currentContent.get("accessKeys") : undefined) || {}
    const shareEditKey = this.state.currentContent != null ? this.state.currentContent.get("shareEditKey") : undefined
    return (shareEditKey || accessKeys.readWrite) && !(this.state.currentContent != null ? this.state.currentContent.get("isUnshared") : undefined)
  }

  setShareState(shared, callback) {
    if (this.state.shareProvider) {
      const sharingMetadata = this.state.shareProvider.getSharingMetadata(shared)
      return this._event('getContent', { shared: sharingMetadata }, stringContent => {
        this._setState({
          sharing: shared})
        const sharedContent = cloudContentFactory.createEnvelopedCloudContent(stringContent)
        sharedContent.addMetadata(sharingMetadata)
        const currentContent = this._createOrUpdateCurrentContent(stringContent, this.state.metadata)
        sharedContent.set('docName', currentContent.get('docName'))
        if (shared) {
          currentContent.remove('isUnshared')
        } else {
          currentContent.set('isUnshared', true)
        }
        return this.state.shareProvider.share(shared, currentContent, sharedContent, this.state.metadata, (err, sharedContentId) => {
          if (err) { return this.alert(err) }
          return (typeof callback === 'function' ? callback(null, sharedContentId, currentContent) : undefined)
        })
      })
    }
  }

  share(callback) {
    return this.setShareState(true, (err, sharedContentId, currentContent) => {
      this._fileChanged('sharedFile', currentContent, this.state.metadata)
      return (typeof callback === 'function' ? callback(null, sharedContentId) : undefined)
    })
  }

  unshare(callback) {
    return this.setShareState(false, (err, sharedContentId, currentContent) => {
      this._fileChanged('unsharedFile', currentContent, this.state.metadata)
      return (typeof callback === 'function' ? callback(null) : undefined)
    })
  }

  revertToShared(callback = null) {
    const id = this.state.currentContent != null ? this.state.currentContent.get("sharedDocumentId") : undefined
    if (id && (this.state.shareProvider != null)) {
      return this.state.shareProvider.loadSharedContent(id, (err, content, metadata) => {
        let docName
        if (err) { return this.alert(err) }
        this.state.currentContent.copyMetadataTo(content)
        if (!metadata.name && (docName = content.get('docName'))) {
          metadata.name = docName
        }
        this._fileOpened(content, metadata, {dirty: true, openedContent: content.clone()})
        return (typeof callback === 'function' ? callback(null) : undefined)
      })
    }
  }

  revertToSharedDialog(callback = null) {
    if ((this.state.currentContent != null ? this.state.currentContent.get("sharedDocumentId") : undefined) && (this.state.shareProvider != null)) {
      return this.confirm(tr("~CONFIRM.REVERT_TO_SHARED_VIEW"), () => this.revertToShared(callback))
    }
  }

  downloadDialog(callback = null) {
    // should share metadata be included in downloaded local files?
    return this._event('getContent', { shared: this._sharedMetadata() }, content => {
      const envelopedContent = cloudContentFactory.createEnvelopedCloudContent(content)
      if (this.state.currentContent != null) {
        this.state.currentContent.copyMetadataTo(envelopedContent)
      }
      return this._ui.downloadDialog(this.state.metadata != null ? this.state.metadata.name : undefined, envelopedContent, callback)
    })
  }

  getDownloadBlob(content, includeShareInfo, mimeType) {
    let contentToSave
    if (mimeType == null) { mimeType = 'text/plain' }
    if (typeof content === "string") {
      if (mimeType.indexOf("image") >= 0) {
        contentToSave = base64Array.toByteArray(content)
      } else {
        contentToSave = content
      }

    } else if (includeShareInfo) {
      contentToSave = JSON.stringify(content.getContent())

    } else { // not includeShareInfo
      // clone the document so we can delete the share info and not affect the original
      const json = content.clone().getContent()
      delete json.sharedDocumentId
      delete json.shareEditKey
      delete json.isUnshared
      delete json.accessKeys
      // CODAP moves the keys into its own namespace
      if ((json.metadata != null ? json.metadata.shared : undefined) != null) { delete json.metadata.shared }
      contentToSave = JSON.stringify(json)
    }

    return new Blob([contentToSave], {type: mimeType})
  }

  getDownloadUrl(content, includeShareInfo, mimeType) {
    if (mimeType == null) { mimeType = 'text/plain' }
    const wURL = window.URL || window.webkitURL
    if (wURL) { return wURL.createObjectURL(this.getDownloadBlob(content, includeShareInfo, mimeType)) }
  }

  rename(metadata, newName, callback) {
    const { dirty } = this.state
    const _rename = metadata => {
      if (this.state.currentContent != null) {
        this.state.currentContent.addMetadata({docName: metadata.name})
      }
      this._fileChanged('renamedFile', this.state.currentContent, metadata, {dirty}, this._getHashParams(metadata))
      return (typeof callback === 'function' ? callback(newName) : undefined)
    }
    if (newName !== (this.state.metadata != null ? this.state.metadata.name : undefined)) {
      if (__guard__(this.state.metadata != null ? this.state.metadata.provider : undefined, x => x.can('rename', metadata))) {
        return this.state.metadata.provider.rename(this.state.metadata, newName, (err, metadata) => {
          if (err) { return this.alert(err) }
          return _rename(metadata)
        })
      } else {
        if (metadata) {
          metadata.name = newName
          metadata.filename = newName
        } else {
          metadata = new CloudMetadata({
            name: newName,
            type: CloudMetadata.File
          })
        }
        return _rename(metadata)
      }
    }
  }

  renameDialog(callback = null) {
    return this._ui.renameDialog(this.state.metadata != null ? this.state.metadata.name : undefined, newName => {
      return this.rename(this.state.metadata, newName, callback)
    })
  }

  revertToLastOpened(callback = null) {
    this._event('willOpenFile', {op: "revertToLastOpened"})
    if ((this.state.openedContent != null) && this.state.metadata) {
      return this._fileOpened(this.state.openedContent, this.state.metadata, {openedContent: this.state.openedContent.clone()})
    }
  }

  revertToLastOpenedDialog(callback = null) {
    if ((this.state.openedContent != null) && this.state.metadata) {
      return this.confirm(tr('~CONFIRM.REVERT_TO_LAST_OPENED'), () => this.revertToLastOpened(callback))
    } else {
      return (typeof callback === 'function' ? callback('No initial opened version was found for the currently active file') : undefined)
    }
  }

  saveSecondaryFileAsDialog(stringContent, extension, mimeType, callback) {
    const provider = this.autoProvider('export')
    if (provider) {
      const metadata = { provider, extension, mimeType }
      return this.saveSecondaryFile(stringContent, metadata, callback)
    } else {
      const data = { content: stringContent, extension, mimeType }
      return this._ui.saveSecondaryFileAsDialog(data, metadata => {
        // replace defaults
        if (extension) {
          metadata.filename = CloudMetadata.newExtension(metadata.filename, extension)
        }
        if (mimeType) {
          metadata.mimeType = mimeType
        }

        return this.saveSecondaryFile(stringContent, metadata, callback)
      })
    }
  }

  // Saves a file to backend, but does not update current metadata.
  // Used e.g. when exporting .csv files from CODAP
  saveSecondaryFile(stringContent, metadata, callback = null) {
    if (__guard__(metadata != null ? metadata.provider : undefined, x => x.can('export', metadata))) {
      return metadata.provider.saveAsExport(stringContent, metadata, (err, statusCode) => {
        if (err) {
          return this.alert(err)
        }
        return (typeof callback === 'function' ? callback(stringContent, metadata) : undefined)
      })
    }
  }

  dirty(isDirty){
    if (isDirty == null) { isDirty = true }
    this._setState({
      dirty: isDirty,
      saved: this.state.saved && !isDirty
    })
    if (window.self !== window.top) {
      // post to parent and not top window (not a bug even though we test for self inst top above)
      return window.parent.postMessage({type: "cfm::setDirty", isDirty}, "*")
    }
  }

  shouldAutoSave() {
    return this.state.dirty &&
      !(this.state.metadata != null ? this.state.metadata.autoSaveDisabled : undefined) &&
      !this.isSaveInProgress() &&
      __guard__(this.state.metadata != null ? this.state.metadata.provider : undefined, x => x.can('resave', this.state.metadata))
  }

  autoSave(interval) {
    if (this._autoSaveInterval) {
      clearInterval(this._autoSaveInterval)
    }

    // in case the caller uses milliseconds
    if (interval > 1000) {
      interval = Math.round(interval / 1000)
    }
    if (interval > 0) {
      return this._autoSaveInterval = setInterval((() => { if (this.shouldAutoSave()) { return this.save() } }), (interval * 1000))
    }
  }

  isAutoSaving() {
    return (this._autoSaveInterval != null)
  }

  changeLanguage(newLangCode, callback) {
    if (callback) {
      if (!this.state.dirty) {
        return callback(newLangCode)
      } else {
        const postSave = err => {
          if (err) {
            this.alert(err)
            return this.confirm(tr('~CONFIRM.CHANGE_LANGUAGE'), () => callback(newLangCode))
          } else {
            return callback(newLangCode)
          }
        }
        if ((this.state.metadata != null ? this.state.metadata.provider : undefined) || this.autoProvider('save')) {
          return this.save(err => postSave())
        } else {
          return this.saveTempFile(postSave)
        }
      }
    }
  }

  showBlockingModal(modalProps) {
    return this._ui.showBlockingModal(modalProps)
  }

  hideBlockingModal() {
    return this._ui.hideBlockingModal()
  }

  getCurrentUrl(queryString = null) {
    const suffix = (queryString != null) ? `?${queryString}` : ""
    // Check browser support for document.location.origin (& window.location.origin)
    return `${document.location.origin}${document.location.pathname}${suffix}`
  }

  // Takes an array of strings representing url parameters to be removed from the URL.
  // Removes the specified parameters from the URL and then uses the history API's
  // pushState() method to update the URL without reloading the page.
  // Adapted from http://stackoverflow.com/a/11654436.
  removeQueryParams(params) {
    let url = window.location.href
    const hash = url.split('#')

    for (let key of Array.from(params)) {
      const re = new RegExp(`([?&])${key}=.*?(&|#|$)(.*)`, "g")

      if (re.test(url)) {
        hash[0] = hash[0].replace(re, '$1$3').replace(/(&|\?)$/, '')
      }
    }

    url = hash[0] + ((hash[1] != null) ? `#${hash[1]}` : '')

    if (url !== window.location.href) {
      return history.pushState({ originalUrl: window.location.href }, '', url)
    }
  }

  confirm(message, callback) {
    return this.confirmDialog({ message, callback })
  }

  confirmDialog(params) {
    return this._ui.confirmDialog(params)
  }

  alert(message, titleOrCallback, callback) {
    if (_.isFunction(titleOrCallback)) {
      callback = titleOrCallback
      titleOrCallback = null
    }
    return this._ui.alertDialog(message, (titleOrCallback || tr("~CLIENT_ERROR.TITLE")), callback)
  }

  _dialogSave(stringContent, metadata, callback) {
    if (stringContent !== null) {
      return this.saveFileNoDialog(stringContent, metadata, callback)
    } else {
      return this._event('getContent', { shared: this._sharedMetadata() }, stringContent => {
        return this.saveFileNoDialog(stringContent, metadata, callback)
      })
    }
  }
  // Will mutate metadata:
  _updateMetaDataOverwritable(metadata) {
    if (metadata != null) {
      metadata.overwritable = (metadata.overwritable != null)
        ? metadata.overwritable
        : true
    }
  }

  _fileChanged(type, content, metadata, additionalState, hashParams=null) {
    if (additionalState == null) { additionalState = {} }
    this._updateMetaDataOverwritable(metadata)
    this._updateState(content, metadata, additionalState, hashParams)
    return this._event(type, { content: (content != null ? content.getClientContent() : undefined), shared: this._sharedMetadata() })
  }

  _fileOpened(content, metadata, additionalState, hashParams=null) {
    if (additionalState == null) { additionalState = {} }
    const eventData = { content: (content != null ? content.getClientContent() : undefined) }
    // update state before sending 'openedFile' events so that 'openedFile' listeners that
    // reference state have the updated state values
    this._updateState(content, metadata, additionalState, hashParams)
    // add metadata contentType to event for CODAP to load via postmessage API (for SageModeler standalone)
    const contentType = metadata.mimeType || metadata.contentType
    if (contentType) { eventData.metadata = {contentType} }
    return this._event('openedFile', eventData, (iError, iSharedMetadata) => {
      if (iError) { return this.alert(iError, () => this.ready()) }

      this._updateMetaDataOverwritable(metadata)
      if (!this.appOptions.wrapFileContent) {
        content.addMetadata(iSharedMetadata)
      }
      // and then update state again for the metadata and content changes
      this._updateState(content, metadata, additionalState, hashParams)
      return this.ready()
    })
  }

  _updateState(content, metadata, additionalState, hashParams=null) {
    if (additionalState == null) { additionalState = {} }
    const state = {
      currentContent: content,
      metadata,
      saving: null,
      saved: false,
      dirty: !additionalState.saved && (content != null ? content.requiresConversion() : undefined)
    }
    for (let key of Object.keys(additionalState || {})) {
      const value = additionalState[key]
      state[key] = value
    }
    this._setWindowTitle(metadata != null ? metadata.name : undefined)
    if (hashParams !== null) {
      window.location.hash = hashParams
    }
    return this._setState(state)
  }

  _event(type, data, eventCallback = null) {
    if (data == null) { data = {} }
    const event = new CloudFileManagerClientEvent(type, data, eventCallback, this.state)
    for (let listener of Array.from(this._listeners)) {
      listener(event)
    }
    // Workaround to fix https://www.pivotaltracker.com/story/show/162392580
    // CODAP will fail on the renamedFile message because we don't send the state with
    // the postMessage events and CODAP examines the state to get the new name.
    // I tried sending the state but that causes CODAP to replace its state which breaks other things.
    // A permanent fix for this would be to send the new filename outside of the state metadata.
    const skipPostMessage = type === "renamedFile"
    if ((this.appOptions != null ? this.appOptions.sendPostMessageClientEvents : undefined) && this.iframe && !skipPostMessage) {
      return event.postMessage(this.iframe.contentWindow)
    }
  }

  _setState(options) {
    for (let key of Object.keys(options || {})) {
      const value = options[key]
      this.state[key] = value
    }
    return this._event('stateChanged')
  }

  _resetState() {
    return this._setState({
      openedContent: null,
      currentContent: null,
      metadata: null,
      dirty: false,
      saving: null,
      saved: false
    })
  }

  _closeCurrentFile() {
    if (__guard__(this.state.metadata != null ? this.state.metadata.provider : undefined, x => x.can('close', this.state.metadata))) {
      return this.state.metadata.provider.close(this.state.metadata)
    }
  }

  _createOrUpdateCurrentContent(stringContent, metadata = null) {
    let currentContent
    if (this.state.currentContent != null) {
      ({ currentContent } = this.state)
      currentContent.setText(stringContent)
    } else {
      currentContent = cloudContentFactory.createEnvelopedCloudContent(stringContent)
    }
    if (metadata != null) {
      currentContent.addMetadata({docName: metadata.name})
    }
    return currentContent
  }

  _setWindowTitle(name) {
    if (!this.appOptions.appSetsWindowTitle && __guard__(this.appOptions != null ? this.appOptions.ui : undefined, x => x.windowTitleSuffix)) {
      return document.title = `${(name != null ? name.length : undefined) > 0 ? name : (tr("~MENUBAR.UNTITLED_DOCUMENT"))}${this.appOptions.ui.windowTitleSeparator}${this.appOptions.ui.windowTitleSuffix}`
    }
  }

  _getHashParams(metadata) {
    let openSavedParams
    if (__guard__(metadata != null ? metadata.provider : undefined, x => x.canOpenSaved()) && ((openSavedParams = __guard__(metadata != null ? metadata.provider : undefined, x1 => x1.getOpenSavedParams(metadata))) != null)) {
      return `#file=${metadata.provider.urlDisplayName || metadata.provider.name}:${encodeURIComponent(openSavedParams)}`
    } else if ((metadata != null ? metadata.provider : undefined) instanceof URLProvider &&
        (window.location.hash.indexOf("#file=http") === 0)) {
      return window.location.hash    // leave it alone
    } else { return "" }
  }

  _startPostMessageListener() {
    return $(window).on('message', e => {
      const oe = e.originalEvent
      const data = oe.data || {}
      const reply = function(type, params) {
        if (params == null) { params = {} }
        const message = _.merge({}, params, {type})
        return oe.source.postMessage(message, oe.origin)
      }
      switch ((oe.data != null ? oe.data.type : undefined)) {
        case 'cfm::getCommands':
          return reply('cfm::commands', {commands: ['cfm::autosave', 'cfm::event', 'cfm::event:reply', 'cfm::setDirty', 'cfm::iframedClientConnected']})
        case 'cfm::autosave':
          if (this.shouldAutoSave()) {
            return this.save(() => reply('cfm::autosaved', {saved: true}))
          } else {
            return reply('cfm::autosaved', {saved: false})
          }
        case 'cfm::event':
          return this._event(data.eventType, data.eventData, function() {
            const callbackArgs = JSON.stringify(Array.prototype.slice.call(arguments))
            return reply('cfm::event:reply', {eventId: data.eventId, callbackArgs})
        })
        case 'cfm::event:reply':
          var event = CLOUDFILEMANAGER_EVENTS[data.eventId]
          return __guard__(event != null ? event.callback : undefined, x => x.apply(this, JSON.parse(data.callbackArgs)))
        case 'cfm::setDirty':
          return this.dirty(data.isDirty)
        case 'cfm::iframedClientConnected':
          return this.processUrlParams()
      }
    })
  }

  _setupConfirmOnClose() {
    return $(window).on('beforeunload', e => {
      if (this.state.dirty) {
        // different browsers trigger the confirm in different ways
        e.preventDefault()
        return e.returnValue = true
      }
    })
  }
}

export {
  CloudFileManagerClientEvent,
  CloudFileManagerClient
}

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined
}