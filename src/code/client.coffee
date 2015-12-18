tr = require './utils/translate'
isString = require './utils/is-string'

CloudFileManagerUI = (require './ui').CloudFileManagerUI

LocalStorageProvider = require './providers/localstorage-provider'
ReadOnlyProvider = require './providers/readonly-provider'
GoogleDriveProvider = require './providers/google-drive-provider'
DocumentStoreProvider = require './providers/document-store-provider'

cloudContentFactory = (require './providers/provider-interface').cloudContentFactory
CloudContent = (require './providers/provider-interface').CloudContent

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
    for Provider in [ReadOnlyProvider, LocalStorageProvider, GoogleDriveProvider, DocumentStoreProvider]
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
    @saveCopyOpensInNewTab = if @appOptions.ui?.hasOwnProperty('saveCopyOpensInNewTab') then @appOptions.ui.saveCopyOpensInNewTab else true

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
    @_event 'newedFile', {content: ""}

  newFileDialog: (callback = null) ->
    if @newFileOpensInNewTab
      window.open @_getCurrentUrl(), '_blank'
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
        @_fileChanged 'openedFile', content, metadata, {openedContent: content.clone()}
        callback? content, metadata
    else
      @openFileDialog callback

  openFileDialog: (callback = null) ->
    if (not @state.dirty) or (confirm tr '~CONFIRM.OPEN_FILE')
      @_ui.openFileDialog (metadata) =>
        @openFile metadata, callback

  openSharedContent: (id) ->
    @state.shareProvider?.loadSharedContent id, (err, content, metadata) =>
      return @_error(err) if err
      @_fileChanged 'openedFile', content, metadata, {overwritable: false, openedContent: content.clone()}

  openSaved: (params) ->
    [providerName, providerParams] = params.split ':'
    provider = @providers[providerName]
    if provider
      provider.authorized (authorized) =>
        if authorized
          provider.openSaved providerParams, (err, content, metadata) =>
            return @_error(err) if err
            @_fileChanged 'openedFile', content, metadata, {openedContent: content.clone()}

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
        return @_error(err) if err
        if @state.metadata isnt metadata
          @_closeCurrentFile()
        @_fileChanged 'savedFile', currentContent, metadata, {saved: true}
        callback? currentContent, metadata
    else
      @saveFileDialog stringContent, callback

  saveFileDialog: (stringContent = null, callback = null) ->
    @_ui.saveFileDialog (metadata) =>
      @_dialogSave stringContent, metadata, callback

  saveFileAsDialog: (stringContent = null, callback = null) ->
    @_ui.saveFileAsDialog (metadata) =>
      @_dialogSave stringContent, metadata, callback

  saveCopyDialog: (stringContent = null, callback = null) ->
    saveCopy = (stringContent, metadata) =>
      content = cloudContentFactory.createEnvelopedCloudContent stringContent
      metadata.provider.save content, metadata, (err) =>
        return @_error(err) if err
        if @saveCopyOpensInNewTab
          window.open @_getCurrentUrl "openSaved=#{metadata.provider.name}:#{encodeURIComponent metadata.provider.getOpenSavedParams metadata}"
        callback? content, metadata
    @_ui.saveCopyDialog (metadata) =>
      if stringContent is null
        @_event 'getContent', {}, (stringContent) ->
          saveCopy stringContent, metadata
      else
        saveCopy stringContent, metadata

  shareGetLink: ->
    showShareDialog = (sharedDocumentId) =>
      @_ui.shareUrlDialog @_getCurrentUrl "openShared=#{sharedDocumentId}"

    sharedDocumentId = @state.currentContent?.get "sharedDocumentId"
    if sharedDocumentId
      showShareDialog sharedDocumentId
    else
      @share (sharedDocumentId) =>
        @dirty()
        showShareDialog sharedDocumentId

  shareUpdate: ->
    @share()

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
      @_ui.downloadDialog @state.metadata?.name, (cloudContentFactory.createEnvelopedCloudContent content), callback

  rename: (metadata, newName, callback) ->
    if newName isnt @state.metadata.name
      dirty = @state.dirty
      @state.metadata.provider.rename @state.metadata, newName, (err, metadata) =>
        return @_error(err) if err
        @state.currentContent?.addMetadata docName: metadata.name
        @_fileChanged 'renamedFile', @state.currentContent, metadata, {dirty: dirty}
        callback? newName

  renameDialog: (callback = null) ->
    if @state.metadata
      @_ui.renameDialog @state.metadata.name, (newName) =>
        @rename @state.metadata, newName, callback
    else
      callback? 'No currently active file'

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
      @_autoSaveInterval = setInterval (=> @save() if @state.dirty and @state.metadata?.provider?.can 'save'), (interval * 1000)

  isAutoSaving: ->
    @_autoSaveInterval?

  showBlockingModal: (modalProps) ->
    @_ui.blockingModal modalProps

  _dialogSave: (stringContent, metadata, callback) ->
    if stringContent isnt null
      @saveFile stringContent, metadata, callback
    else
      @_event 'getContent', {}, (stringContent) =>
        @saveFile stringContent, metadata, callback

  _error: (message) ->
    # for now an alert
    alert message

  _fileChanged: (type, content, metadata, additionalState={}) ->
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
    @_setState state
    @_event type, {content: content.getText()}

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

  _getCurrentUrl: (queryString = null) ->
    suffix = if queryString? then "?#{queryString}" else ""
    "#{document.location.origin}#{document.location.pathname}#{suffix}"

  _setWindowTitle: (name) ->
    if @appOptions?.ui?.windowTitleSuffix
      document.title = "#{if name?.length > 0 then name else (tr "~MENUBAR.UNTITLED_DOCUMENT")}#{@appOptions.ui.windowTitleSeparator}#{@appOptions.ui.windowTitleSuffix}"

module.exports =
  CloudFileManagerClientEvent: CloudFileManagerClientEvent
  CloudFileManagerClient: CloudFileManagerClient
