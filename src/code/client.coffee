tr = require './utils/translate'
isString = require './utils/is-string'

CloudFileManagerUI = (require './ui').CloudFileManagerUI

LocalStorageProvider = require './providers/localstorage-provider'
ReadOnlyProvider = require './providers/readonly-provider'
GoogleDriveProvider = require './providers/google-drive-provider'
DocumentStoreProvider = require './providers/document-store-provider'
LocalFileProvider = require './providers/local-file-provider'
URLProvider = require './providers/url-provider'

cloudContentFactory = (require './providers/provider-interface').cloudContentFactory
CloudContent = (require './providers/provider-interface').CloudContent
CloudMetadata = (require './providers/provider-interface').CloudMetadata

class CloudFileManagerClientEvent

  constructor: (@type, @data = {}, @callback = null, @state = {}) ->

class CloudFileManagerClient

  constructor: (options) ->
    @state =
      availableProviders: []
    @_listeners = []
    @_resetState()
    @_ui = new CloudFileManagerUI @
    @providers = {}

  setAppOptions: (@appOptions = {})->

    @appOptions.wrapFileContent ?= true
    CloudContent.wrapFileContent = @appOptions.wrapFileContent

    # flter for available providers
    allProviders = {}
    for Provider in [ReadOnlyProvider, LocalStorageProvider, GoogleDriveProvider, DocumentStoreProvider, LocalFileProvider]
      if Provider.Available()
        allProviders[Provider.Name] = Provider

    # default to all providers if non specified
    if not @appOptions.providers
      @appOptions.providers = []
      for own providerName of allProviders
        appOptions.providers.push providerName

    # preset the extension if Available
    CloudMetadata.Extension = @appOptions.extension

    # check the providers
    availableProviders = []
    for provider in @appOptions.providers
      [providerName, providerOptions] = if isString provider then [provider, {}] else [provider.name, provider]
      # merge in other options as needed
      providerOptions.mimeType ?= @appOptions.mimeType
      if not providerName
        @alert "Invalid provider spec - must either be string or object with name property"
      else
        if allProviders[providerName]
          Provider = allProviders[providerName]
          provider = new Provider providerOptions, @
          @providers[providerName] = provider
          availableProviders.push provider
        else
          @alert "Unknown provider: #{providerName}"
    @_setState availableProviders: availableProviders

    # add singleton shareProvider, if it exists
    for provider in @state.availableProviders
      if provider.can 'share'
        @_setState shareProvider: provider
        break

    @appOptions.ui or= {}
    @appOptions.ui.windowTitleSuffix or= document.title
    @appOptions.ui.windowTitleSeparator or= ' - '
    @_setWindowTitle()

    @_ui.init @appOptions.ui

    # check for autosave
    if @appOptions.autoSaveInterval
      @autoSave @appOptions.autoSaveInterval

    # initialize the cloudContentFactory with all data we want in the envelope
    cloudContentFactory.setEnvelopeMetadata
      cfmVersion: '__PACKAGE_VERSION__' # replaced by version number at build time
      appName: @appOptions.appName or ""
      appVersion: @appOptions.appVersion or ""
      appBuildNum: @appOptions.appBuildNum or ""

    @newFileOpensInNewTab = if @appOptions.ui?.hasOwnProperty('newFileOpensInNewTab') then @appOptions.ui.newFileOpensInNewTab else true

  setProviderOptions: (name, newOptions) ->
    for provider in @state.availableProviders
      if provider.name is name
        provider.options ?= {}
        for key of newOptions
          provider.options[key] = newOptions[key]
        break

  connect: ->
    @_event 'connected', {client: @}

  ready: ->
    @_event 'ready'

  listen: (listener) ->
    if listener
      @_listeners.push listener

  appendMenuItem: (item) ->
    @_ui.appendMenuItem item; @

  prependMenuItem: (item) ->
    @_ui.prependMenuItem item; @

  replaceMenuItem: (key, item) ->
    @_ui.replaceMenuItem key, item; @

  insertMenuItemBefore: (key, item) ->
    @_ui.insertMenuItemBefore key, item; @

  insertMenuItemAfter: (key, item) ->
    @_ui.insertMenuItemAfter key, item; @

  setMenuBarInfo: (info) ->
    @_ui.setMenuBarInfo info

  newFile: (callback = null) ->
    @_closeCurrentFile()
    @_resetState()
    window.location.hash = ""
    @_event 'newedFile', {content: ""}

  newFileDialog: (callback = null) ->
    if @newFileOpensInNewTab
      window.open @getCurrentUrl(), '_blank'
    else if @state.dirty
      if @_autoSaveInterval and @state.metadata
        @save()
        @newFile()
      else
        @confirm tr('~CONFIRM.NEW_FILE'), => @newFile()
    else
      @newFile()

  openFile: (metadata, callback = null) ->
    if metadata?.provider?.can 'load'
      metadata.provider.load metadata, (err, content) =>
        return @alert(err) if err
        # should wait to close current file until client signals open is complete
        @_closeCurrentFile()
        @_fileOpened content, metadata, {openedContent: content.clone()}, @_getHashParams metadata
        callback? content, metadata
    else
      @openFileDialog callback

  openFileDialog: (callback = null) ->
    showDialog = =>
      @_ui.openFileDialog (metadata) =>
        @openFile metadata, callback
    if not @state.dirty
      showDialog()
    else
      @confirm tr('~CONFIRM.OPEN_FILE'), showDialog

  closeFile: (callback = null) ->
    @_closeCurrentFile()
    @_resetState()
    window.location.hash = ""
    @_event 'closedFile', {content: ""}
    callback?()

  closeFileDialog: (callback = null) ->
    if not @state.dirty
      @closeFile callback
    else
      @confirm tr('~CONFIRM.CLOSE_FILE'), => @closeFile callback

  importData: (data, callback = null) ->
    @_event 'importedData', data
    callback? data

  importDataDialog: (callback = null) ->
    @_ui.importDataDialog (data) =>
      @importData data, callback

  readLocalFile: (file, callback=null) ->
    reader = new FileReader()
    reader.onload = (loaded) ->
      callback? {name: file.name, content: loaded.target.result}
    reader.readAsText file

  openLocalFile: (file, callback=null) ->
    @readLocalFile file, (data) =>
      content = cloudContentFactory.createEnvelopedCloudContent data.content
      metadata = new CloudMetadata
        name: data.name
        type: CloudMetadata.File
      @_fileOpened content, metadata, {openedContent: content.clone()}
      callback? content, metadata

  importLocalFile: (file, callback=null) ->
    @readLocalFile file, (data) =>
      @importData data, callback

  openSharedContent: (id) ->
    @state.shareProvider?.loadSharedContent id, (err, content, metadata) =>
      return @alert(err) if err
      @_fileOpened content, metadata, {overwritable: false, openedContent: content.clone()}

  # must be called as a result of user action (e.g. click) to avoid popup blockers
  parseUrlAuthorizeAndOpen: ->
    if @appOptions.hashParams?.fileParams?
      [providerName, providerParams] = @appOptions.hashParams.fileParams.split ':'
      provider = @providers[providerName]
      if provider
        provider.authorize =>
          @openProviderFile providerName providerParams

  openProviderFile: (providerName, providerParams) ->
    provider = @providers[providerName]
    if provider
      provider.authorized (authorized) =>
        # we can open the document without authorization in some cases
        if authorized or not provider.isAuthorizationRequired()
          provider.openSaved providerParams, (err, content, metadata) =>
            return @alert(err) if err
            @_fileOpened content, metadata, {openedContent: content.clone()}, @_getHashParams metadata

  openUrlFile: (url) ->
    urlProvider = new URLProvider()
    urlProvider.openFileFromUrl url, (err, content, metadata) =>
      return @alert(err) if err
      @_fileOpened content, metadata, {openedContent: content.clone()}, @_getHashParams metadata

  isSaveInProgress: ->
    @state.saving?

  confirmAuthorizeAndSave: (stringContent, callback) ->
    # trigger authorize() from confirmation dialog to avoid popup blockers
    @confirm tr("~CONFIRM.AUTHORIZE_SAVE"), =>
      @state.metadata.provider.authorize =>
        @saveFile stringContent, @state.metadata, callback

  save: (callback = null) ->
    @_event 'getContent', { shared: @_sharedMetadata() }, (stringContent) =>
      @saveContent stringContent, callback

  saveContent: (stringContent, callback = null) ->
    provider = @state.metadata?.provider
    if provider?
      provider.authorized (isAuthorized) =>
        # we can save the document without authorization in some cases
        if isAuthorized or not provider.isAuthorizationRequired()
          @saveFile stringContent, @state.metadata, callback
        else
          @confirmAuthorizeAndSave stringContent, callback
    else
      @saveFileDialog stringContent, callback

  saveFile: (stringContent, metadata, callback = null) ->
    if metadata?.provider?.can 'save'
      @_setState
        saving: metadata
      currentContent = @_createOrUpdateCurrentContent stringContent, metadata
      metadata.provider.save currentContent, metadata, (err, statusCode) =>
        if err
          # disable autosave on save failure; clear "Saving..." message
          metadata.autoSaveDisabled = true
          @_setState { metadata: metadata, saving: null }
          if statusCode is 403
            return @confirmAuthorizeAndSave stringContent, callback
          else
            return @alert(err)
        if @state.metadata isnt metadata
          @_closeCurrentFile()
        # reenable autosave on save success
        metadata.autoSaveDisabled = false
        @_fileChanged 'savedFile', currentContent, metadata, {saved: true}, @_getHashParams metadata
        callback? currentContent, metadata
    else
      @saveFileDialog stringContent, callback

  saveFileDialog: (stringContent = null, callback = null) ->
    @_ui.saveFileDialog (metadata) =>
      @_dialogSave stringContent, metadata, callback

  saveFileAsDialog: (stringContent = null, callback = null) ->
    @_ui.saveFileAsDialog (metadata) =>
      @_dialogSave stringContent, metadata, callback

  createCopy: (stringContent = null, callback = null) ->
    saveAndOpenCopy = (stringContent) =>
      @saveCopiedFile stringContent, @state.metadata?.name, (err, copyParams) =>
        return callback? err if err
        window.open @getCurrentUrl "#copy=#{copyParams}"
        callback? copyParams
    if stringContent is null
      @_event 'getContent', {}, (stringContent) ->
        saveAndOpenCopy stringContent
    else
      saveAndOpenCopy stringContent

  saveCopiedFile: (stringContent, name, callback) ->
    try
      prefix = 'cfm-copy::'
      maxCopyNumber = 0
      for own key of window.localStorage
        if key.substr(0, prefix.length) is prefix
          copyNumber = parseInt(key.substr(prefix.length), 10)
          maxCopyNumber = Math.max(maxCopyNumber, copyNumber)
      maxCopyNumber++
      value = JSON.stringify
        name: if name?.length > 0 then "Copy of #{name}" else "Copy of Untitled Document"
        stringContent: stringContent
      window.localStorage.setItem "#{prefix}#{maxCopyNumber}", value
      callback? null, maxCopyNumber
    catch e
      callback "Unable to temporarily save copied file"

  openCopiedFile: (copyParams) ->
    try
      key = "cfm-copy::#{copyParams}"
      copied = JSON.parse window.localStorage.getItem key
      content = cloudContentFactory.createEnvelopedCloudContent copied.stringContent
      metadata = new CloudMetadata
        name: copied.name
        type: CloudMetadata.File
      window.location.hash = ""
      @_fileOpened content, metadata, {dirty: true, openedContent: content.clone()}
      window.localStorage.removeItem key
    catch e
      callback "Unable to load copied file"

  _sharedMetadata: ->
    @state.currentContent?.getSharedMetadata() or {}

  shareGetLink: ->
    @_ui.shareDialog @

  shareUpdate: ->
    @share => @alert (tr "~SHARE_UPDATE.MESSAGE"), (tr "~SHARE_UPDATE.TITLE")

  toggleShare: (callback) ->
    if @isShared()
      @unshare callback
    else
      @share callback

  isShared: ->
    @state.currentContent?.get("sharedDocumentId") and not @state.currentContent?.get("isUnshared")

  canEditShared: ->
    @state.currentContent?.get("shareEditKey") and not @state.currentContent?.get("isUnshared")

  setShareState: (shared, callback) ->
    if @state.shareProvider
      sharingMetadata = @state.shareProvider.getSharingMetadata shared
      @_event 'getContent', { shared: sharingMetadata }, (stringContent) =>
        @_setState
          sharing: shared
        sharedContent = cloudContentFactory.createEnvelopedCloudContent stringContent
        sharedContent.addMetadata sharingMetadata
        currentContent = @_createOrUpdateCurrentContent stringContent, @state.metadata
        if shared
          currentContent.remove 'isUnshared'
        else
          currentContent.set 'isUnshared', true
        @state.shareProvider.share currentContent, sharedContent, @state.metadata, (err, sharedContentId) =>
          return @alert(err) if err
          callback? null, sharedContentId, currentContent

  share: (callback) ->
    @setShareState true, (err, sharedContentId, currentContent) =>
      @_fileChanged 'sharedFile', currentContent, @state.metadata
      callback? null, sharedContentId

  unshare: (callback) ->
    @setShareState false, (err, sharedContentId, currentContent) =>
      @_fileChanged 'unsharedFile', currentContent, @state.metadata
      callback? null

  revertToShared: (callback = null) ->
    id = @state.currentContent?.get("sharedDocumentId")
    if id and @state.shareProvider?
      @state.shareProvider.loadSharedContent id, (err, content, metadata) =>
        return @alert(err) if err
        @state.currentContent.copyMetadataTo content
        if not metadata.name and docName = content.get('docName')
          metadata.name = docName
        @_fileOpened content, metadata, {dirty: true, openedContent: content.clone()}
        callback? null

  revertToSharedDialog: (callback = null) ->
    if @state.currentContent?.get("sharedDocumentId") and @state.shareProvider?
      @confirm tr("~CONFIRM.REVERT_TO_SHARED_VIEW"), => @revertToShared callback

  downloadDialog: (callback = null) ->
    # should share metadata be included in downloaded local files?
    @_event 'getContent', { shared: @_sharedMetadata() }, (content) =>
      envelopedContent = cloudContentFactory.createEnvelopedCloudContent content
      @state.currentContent?.copyMetadataTo envelopedContent
      @_ui.downloadDialog @state.metadata?.name, envelopedContent, callback

  rename: (metadata, newName, callback) ->
    dirty = @state.dirty
    _rename = (metadata) =>
      @state.currentContent?.addMetadata docName: metadata.name
      @_fileChanged 'renamedFile', @state.currentContent, metadata, {dirty: dirty}, @_getHashParams metadata
      callback? newName
    if newName isnt @state.metadata?.name
      if @state.metadata?.provider?.can 'rename'
        @state.metadata.provider.rename @state.metadata, newName, (err, metadata) =>
          return @alert(err) if err
          _rename metadata
      else
        if metadata
          metadata.name = newName
          metadata.filename = newName
        else
          metadata = new CloudMetadata
            name: newName
            type: CloudMetadata.File
        _rename metadata

  renameDialog: (callback = null) ->
    @_ui.renameDialog @state.metadata?.name, (newName) =>
      @rename @state.metadata, newName, callback

  revertToLastOpened: (callback = null) ->
    if @state.openedContent? and @state.metadata
      @_fileOpened @state.openedContent, @state.metadata, {openedContent: @state.openedContent.clone()}

  revertToLastOpenedDialog: (callback = null) ->
    if @state.openedContent? and @state.metadata
      @confirm tr('~CONFIRM.REVERT_TO_LAST_OPENED'), => @revertToLastOpened callback
    else
      callback? 'No initial opened version was found for the currently active file'

  dirty: (isDirty = true)->
    @_setState
      dirty: isDirty
      saved: @state.saved and not isDirty

  autoSave: (interval) ->
    if @_autoSaveInterval
      clearInterval @_autoSaveInterval

    shouldAutoSave = =>
      @state.dirty and
        not @state.metadata?.autoSaveDisabled and
        not @isSaveInProgress() and
        @state.metadata?.provider?.can 'save'

    # in case the caller uses milliseconds
    if interval > 1000
      interval = Math.round(interval / 1000)
    if interval > 0
      @_autoSaveInterval = setInterval (=> @save() if shouldAutoSave()), (interval * 1000)

  isAutoSaving: ->
    @_autoSaveInterval?

  showBlockingModal: (modalProps) ->
    @_ui.showBlockingModal modalProps

  hideBlockingModal: ->
    @_ui.hideBlockingModal()

  getCurrentUrl: (queryString = null) ->
    suffix = if queryString? then "?#{queryString}" else ""
    # Check browser support for document.location.origin (& window.location.origin)
    "#{document.location.origin}#{document.location.pathname}#{suffix}"

  confirm: (message, callback) ->
    @_ui.confirmDialog message, callback

  alert: (message, title=null) ->
    @_ui.alertDialog message, (title or tr "~CLIENT_ERROR.TITLE")

  _dialogSave: (stringContent, metadata, callback) ->
    if stringContent isnt null
      @saveFile stringContent, metadata, callback
    else
      @_event 'getContent', { shared: @_sharedMetadata() }, (stringContent) =>
        @saveFile stringContent, metadata, callback

  _fileChanged: (type, content, metadata, additionalState={}, hashParams=null) ->
    metadata?.overwritable ?= true
    @_updateState content, metadata, additionalState, hashParams
    @_event type, { content: content?.getClientContent(), shared: @_sharedMetadata() }

  _fileOpened: (content, metadata, additionalState={}, hashParams=null) ->
    @_event 'openedFile', { content: content?.getClientContent() }, (iError, iSharedMetadata) =>
      if iError
        @alert iError
      else
        metadata?.overwritable ?= true
        if not @appOptions.wrapFileContent
          content.addMetadata iSharedMetadata
        @_updateState content, metadata, additionalState, hashParams
        @ready()

  _updateState: (content, metadata, additionalState={}, hashParams=null) ->
    state =
      currentContent: content
      metadata: metadata
      saving: null
      saved: false
      dirty: not additionalState.saved and content?.requiresConversion()
    for own key, value of additionalState
      state[key] = value
    @_setWindowTitle metadata?.name
    if hashParams isnt null
      window.location.hash = hashParams
    @_setState state

  _event: (type, data = {}, eventCallback = null) ->
    event = new CloudFileManagerClientEvent type, data, eventCallback, @state
    for listener in @_listeners
      listener event

  _setState: (options) ->
    for own key, value of options
      @state[key] = value
    @_event 'stateChanged'

  _resetState: ->
    @_setState
      openedContent: null
      currentContent: null
      metadata: null
      dirty: false
      saving: null
      saved: false

  _closeCurrentFile: ->
    if @state.metadata?.provider?.can 'close'
      @state.metadata.provider.close @state.metadata

  _createOrUpdateCurrentContent: (stringContent, metadata = null) ->
    if @state.currentContent?
      currentContent = @state.currentContent
      currentContent.setText stringContent
    else
      currentContent = cloudContentFactory.createEnvelopedCloudContent stringContent
    if metadata?
      currentContent.addMetadata docName: metadata.name
    currentContent

  _setWindowTitle: (name) ->
    if @appOptions?.ui?.windowTitleSuffix
      document.title = "#{if name?.length > 0 then name else (tr "~MENUBAR.UNTITLED_DOCUMENT")}#{@appOptions.ui.windowTitleSeparator}#{@appOptions.ui.windowTitleSuffix}"

  _getHashParams: (metadata) ->
    if metadata?.provider?.canOpenSaved()
      "#file=#{metadata.provider.name}:#{encodeURIComponent metadata.provider.getOpenSavedParams metadata}"
    else if metadata?.provider instanceof URLProvider and
        window.location.hash.indexOf("#file=http") is 0
      window.location.hash    # leave it alone
    else ""

module.exports =
  CloudFileManagerClientEvent: CloudFileManagerClientEvent
  CloudFileManagerClient: CloudFileManagerClient
