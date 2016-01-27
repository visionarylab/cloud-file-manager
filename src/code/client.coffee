tr = require './utils/translate'
isString = require './utils/is-string'

CloudFileManagerUI = (require './ui').CloudFileManagerUI

LocalStorageProvider = require './providers/localstorage-provider'
ReadOnlyProvider = require './providers/readonly-provider'
GoogleDriveProvider = require './providers/google-drive-provider'
DocumentStoreProvider = require './providers/document-store-provider'
LocalFileProvider = require './providers/local-file-provider'

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

    # check the providers
    availableProviders = []
    for provider in @appOptions.providers
      [providerName, providerOptions] = if isString provider then [provider, {}] else [provider.name, provider]
      # merge in other options as needed
      providerOptions.mimeType ?= @appOptions.mimeType
      if not providerName
        @_error "Invalid provider spec - must either be string or object with name property"
      else
        if allProviders[providerName]
          Provider = allProviders[providerName]
          provider = new Provider providerOptions, @
          @providers[providerName] = provider
          availableProviders.push provider
        else
          @_error "Unknown provider: #{providerName}"
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
      else if confirm tr '~CONFIRM.NEW_FILE'
        @newFile()
    else
      @newFile()

  openFile: (metadata, callback = null) ->
    if metadata?.provider?.can 'load'
      metadata.provider.load metadata, (err, content) =>
        return @_error(err) if err
        @_closeCurrentFile()
        @_fileChanged 'openedFile', content, metadata, {openedContent: content.clone()}, @_getHashParams metadata
        callback? content, metadata
    else
      @openFileDialog callback

  openFileDialog: (callback = null) ->
    if (not @state.dirty) or (confirm tr '~CONFIRM.OPEN_FILE')
      @_ui.openFileDialog (metadata) =>
        @openFile metadata, callback

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
      @_fileChanged 'openedFile', content, metadata, {openedContent: content.clone()}
      callback? content, metadata

  importLocalFile: (file, callback=null) ->
    @readLocalFile file, (data) =>
      @importData data, callback

  openSharedContent: (id) ->
    @state.shareProvider?.loadSharedContent id, (err, content, metadata) =>
      return @_error(err) if err
      @_fileChanged 'openedFile', content, metadata, {overwritable: false, openedContent: content.clone()}

  openProviderFile: (providerName, providerParams) ->
    provider = @providers[providerName]
    if provider
      provider.authorized (authorized) =>
        if authorized
          provider.openSaved providerParams, (err, content, metadata) =>
            return @_error(err) if err
            @_fileChanged 'openedFile', content, metadata, {openedContent: content.clone()}, @_getHashParams metadata

  save: (callback = null) ->
    @_event 'getContent', {}, (stringContent) =>
      @saveContent stringContent, callback

  saveContent: (stringContent, callback = null) ->
    if @state.metadata
      @saveFile stringContent, @state.metadata, callback
    else
      @saveFileDialog stringContent, callback

  saveFile: (stringContent, metadata, callback = null) ->
    if metadata?.provider?.can 'save'
      @_setState
        saving: metadata
      currentContent = @_createOrUpdateCurrentContent stringContent, metadata
      metadata.provider.save currentContent, metadata, (err) =>
        if err
          # disable autosave on save failure; clear "saving..." message
          metadata.autoSaveDisabled = true
          @_setState { metadata: metadata, saving: null }
          return @_error(err)
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
      @_fileChanged 'openedFile', content, metadata, {dirty: true, openedContent: content.clone()}
      window.location.hash = ""
      window.localStorage.removeItem key
    catch e
      callback "Unable to load copied file"

  shareGetLink: ->
    @_ui.shareDialog @

  shareUpdate: ->
    @share()

  toggleShare: (callback) ->
    if @state.currentContent?.get "sharedDocumentId"
      @state.currentContent?.remove "_permissions"
      @state.currentContent?.remove "shareEditKey"
      @state.currentContent?.remove "sharedDocumentId"
      @_fileChanged 'unsharedFile', @state.currentContent, @state.metadata, {sharing: false}
      callback? false
    else
      @share callback

  share: (callback) ->
    if @state.shareProvider
      @_event 'getContent', {}, (stringContent) =>
        @_setState
          sharing: true
        currentContent = @_createOrUpdateCurrentContent stringContent
        @state.shareProvider.share currentContent, @state.metadata, (err, sharedContentId) =>
          return @_error(err) if err
          @_fileChanged 'sharedFile', currentContent, @state.metadata
          callback? sharedContentId

  revertToShared: (callback = null) ->
    id = @state.currentContent?.get("sharedDocumentId")
    if id and @state.shareProvider?
      @state.shareProvider.loadSharedContent id, (err, content, metadata) =>
        return @_error(err) if err
        @state.currentContent.copyMetadataTo content
        @_fileChanged 'openedFile', content, metadata, {openedContent: content.clone()}
        callback? null

  revertToSharedDialog: (callback = null) ->
    if @state.currentContent?.get("sharedDocumentId") and @state.shareProvider? and confirm tr "~CONFIRM.REVERT_TO_SHARED_VIEW"
      @revertToShared callback

  downloadDialog: (callback = null) ->
    @_event 'getContent', {}, (content) =>
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
          return @_error(err) if err
          _rename metadata
      else
        if metadata
          metadata.name = newName
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
      @_fileChanged 'openedFile', @state.openedContent, @state.metadata, {openedContent: @state.openedContent.clone()}

  revertToLastOpenedDialog: (callback = null) ->
    if @state.openedContent? and @state.metadata
      if confirm tr '~CONFIRM.REVERT_TO_LAST_OPENED'
        @revertToLastOpened callback
    else
      callback? 'No initial opened version was found for the currently active file'

  dirty: (isDirty = true)->
    @_setState
      dirty: isDirty
      saved: false if isDirty

  autoSave: (interval) ->
    if @_autoSaveInterval
      clearInterval @_autoSaveInterval

    # in case the caller uses milliseconds
    if interval > 1000
      interval = Math.round(interval / 1000)
    if interval > 0
      @_autoSaveInterval = setInterval (=> @save() if @state.dirty and not @state.metadata?.autoSaveDisabled and @state.metadata?.provider?.can 'save'), (interval * 1000)

  isAutoSaving: ->
    @_autoSaveInterval?

  showBlockingModal: (modalProps) ->
    @_ui.blockingModal modalProps

  getCurrentUrl: (queryString = null) ->
    suffix = if queryString? then "?#{queryString}" else ""
    "#{document.location.origin}#{document.location.pathname}#{suffix}"

  _dialogSave: (stringContent, metadata, callback) ->
    if stringContent isnt null
      @saveFile stringContent, metadata, callback
    else
      @_event 'getContent', {}, (stringContent) =>
        @saveFile stringContent, metadata, callback

  _error: (message) ->
    # for now an alert
    alert message

  _fileChanged: (type, content, metadata, additionalState={}, hashParams=null) ->
    metadata?.overwritable ?= true
    state =
      currentContent: content
      metadata: metadata
      saving: null
      saved: false
      dirty: false
    for own key, value of additionalState
      state[key] = value
    @_setWindowTitle metadata?.name
    if hashParams isnt null
      window.location.hash = hashParams
    @_setState state
    @_event type, {content: content?.getText()}

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
    if metadata?.provider?.canOpenSaved() then "#file=#{metadata.provider.name}:#{encodeURIComponent metadata.provider.getOpenSavedParams metadata}" else ""

module.exports =
  CloudFileManagerClientEvent: CloudFileManagerClientEvent
  CloudFileManagerClient: CloudFileManagerClient
