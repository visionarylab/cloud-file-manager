tr = require './utils/translate'
isString = require './utils/is-string'

CloudFileManagerUI = (require './ui').CloudFileManagerUI

LocalStorageProvider = require './providers/localstorage-provider'
ReadOnlyProvider = require './providers/readonly-provider'
GoogleDriveProvider = require './providers/google-drive-provider'
DocumentStoreProvider = require './providers/document-store-provider'

class CloudFileManagerClientEvent

  constructor: (@type, @data = {}, @callback = null, @state = {}) ->

class CloudFileManagerClient

  constructor: (options) ->
    @state =
      content: null
      metadata: null
      availableProviders: []
    @_ui = new CloudFileManagerUI @

  setAppOptions: (appOptions = {})->
    # flter for available providers
    allProviders = {}
    for Provider in [ReadOnlyProvider, LocalStorageProvider, GoogleDriveProvider, DocumentStoreProvider]
      if Provider.Available()
        allProviders[Provider.Name] = Provider

    # default to all providers if non specified
    if not appOptions.providers
      appOptions.providers = []
      for own providerName of allProviders
        appOptions.providers.push providerName

    # check the providers
    for provider in appOptions.providers
      [providerName, providerOptions] = if isString provider then [provider, {}] else [provider.name, provider]
      if not providerName
        @_error "Invalid provider spec - must either be string or object with name property"
      else
        if allProviders[providerName]
          Provider = allProviders[providerName]
          @state.availableProviders.push new Provider providerOptions
        else
          @_error "Unknown provider: #{providerName}"

    @_ui.init appOptions.ui

  # single client - used by the client app to register and receive callback events
  connect: (@eventCallback) ->
    @_event 'connected', {client: @}

  # single listener - used by the React menu via to watch client state changes
  listen: (@listenerCallback) ->

  appendMenuItem: (item) ->
    @_ui.appendMenuItem item

  newFile: (callback = null) ->
    @state.content = null
    @state.metadata = null
    @_event 'newedFile'

  newFileDialog: (callback = null) ->
    # for now just call new - later we can add change notification from the client so we can prompt for "Are you sure?"
    @newFile()

  openFile: (metadata, callback = null) ->
    if metadata?.provider?.can 'load'
      metadata.provider.load metadata, (err, content) =>
        return @_error(err) if err
        @_fileChanged 'openedFile', content, metadata
        callback? content, metadata
    else
      @openFileDialog callback

  openFileDialog: (callback = null) ->
    @_ui.openFileDialog (metadata) =>
      @openFile metadata, callback

  save: (callback = null) ->
    @_event 'getContent', {}, (content) =>
      @saveContent content, callback

  saveContent: (content, callback = null) ->
    if @state.metadata
      @saveFile content, @state.metadata, callback
    else
      @saveFileDialog content, callback

  saveFile: (content, metadata, callback = null) ->
    if metadata?.provider?.can 'save'
      metadata.provider.save content, metadata, (err) =>
        return @_error(err) if err
        @_fileChanged 'savedFile', content, metadata
        callback? content, metadata
    else
      @saveFileDialog content, callback

  saveFileDialog: (content = null, callback = null) ->
    @_ui.saveFileDialog (metadata) =>
      @_dialogSave content, metadata, callback

  saveFileAsDialog: (content = null, callback = null) ->
    @_ui.saveFileAsDialog (metadata) =>
      @_dialogSave content, metadata, callback

  _dialogSave: (content, metadata, callback) ->
    if content isnt null
      @saveFile content, metadata, callback
    else
      @_event 'getContent', {}, (content) =>
        @saveFile content, metadata, callback

  _error: (message) ->
    # for now an alert
    alert message

  _fileChanged: (type, content, metadata) ->
    @state.content = content
    @state.metadata = metadata
    @_event type, {content: content, metadata: metadata}

  _event: (type, data = {}, eventCallback = null) ->
    event = new CloudFileManagerClientEvent type, data, eventCallback, @state
    @eventCallback? event
    @listenerCallback? event

module.exports =
  CloudFileManagerClientEvent: CloudFileManagerClientEvent
  CloudFileManagerClient: CloudFileManagerClient
