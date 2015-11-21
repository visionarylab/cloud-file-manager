tr = require './utils/translate'
AppView = React.createFactory require './views/app-view'

LocalStorageProvider = require './providers/localstorage-provider'
ReadOnlyProvider = require './providers/readonly-provider'

# helpers that don't need to live in the classes
isString = (param) -> Object.prototype.toString.call(param) is '[object String]'

class CloudFileManagerUIEvent

  constructor: (@type, @data = {}) ->

class CloudFileManagerUI

  constructor: (@client)->
    @menu = null

  init: (@options) ->
    # skip the menu if explicity set to null (meaning no menu)
    if @options.menu isnt null
      if typeof @options.menu is 'undefined'
        @options.menu = CloudFileManager.DefaultMenu
      @menu = new CloudFileManagerUIMenu @options, @client

  # for React to listen for dialog changes
  listen: (@listenerCallback) ->

  saveFileDialog: (callback) ->
    @_showProviderDialog 'saveFile', (tr '~DIALOG.SAVE'), callback

  saveFileAsDialog: (callback) ->
    @_showProviderDialog 'saveFileAs', (tr '~DIALOG.SAVE_AS'), callback

  openFileDialog: (callback) ->
    @_showProviderDialog 'openFile', (tr '~DIALOG.OPEN'), callback

  selectProviderDialog: (callback) ->
    @_showProviderDialog 'selectProvider', (tr '~DIALOG.SELECT_PROVIDER'), callback

  _showProviderDialog: (action, title, callback) ->
    @listenerCallback new CloudFileManagerUIEvent 'showProviderDialog',
      action: action
      title: title
      callback: callback

class CloudFileManagerUIMenu

  @DefaultMenu: ['newFileDialog', 'openFileDialog', 'saveFileDialog', 'saveFileAsDialog']

  constructor: (options, client) ->
    setAction = (action) ->
      client[action]?.bind(client) or (-> alert "No #{action} action is available in the client")

    @items = []
    for item in options.menu
      menuItem = if isString item
        name = options.menuNames?[item]
        menuItem = switch item
          when 'newFileDialog'
            name: name or tr "~MENU.NEW"
          when 'openFileDialog'
            name: name or tr "~MENU.OPEN"
          when 'saveFileDialog'
            name: name or tr "~MENU.SAVE"
          when 'saveFileAsDialog'
            name: name or tr "~MENU.SAVE_AS"
          else
            name: "Unknown item: #{item}"
        menuItem.action = setAction item
        menuItem
      else
        # clients can pass in custom {name:..., action:...} menu items where the action can be a client function name or it is assugmed it is a function
        if isString item.action
          item.action = setAction item.action
        item
      if menuItem
        @items.push menuItem

class CloudFileManagerClientEvent

  constructor: (@type, @data = {}, @callback = null, @state = {}) ->

class CloudFileManagerClient

  constructor: ->
    @_initState()
    @_ui = new CloudFileManagerUI @

  # single client - used by the client app to register and receive callback events
  connect: (@options, @eventCallback) ->
    @_initState @options
    @_ui.init @options
    @_event 'connected', {client: @}

  # single listener - used by the React menu via to watch client state changes
  listen: (@listenerCallback) ->

  newFile: (callback = null) ->
    @state.content = null
    @state.metadata = null
    @_event 'newedFile'

  newFileDialog: (callback = null) ->
    # for now just call new - later we can add change notification from the client so we can prompt for "Are you sure?"
    @newFile()

  openFile: (metadata, callback = null) ->
    @_ensureProviderCan 'load', (provider) =>
      provider.load metadata, (err, content) =>
        return @_error(err) if err
        @_fileChanged 'openedFile', content, metadata
        callback? content, metadata

  openFileDialog: (callback = null) ->
    @_ui.openFileDialog (metadata) =>
      @openFile metadata, callback

  saveContent: (content, callback = null) ->
    if @state.metadata
      @saveFile content, @state.metadata, callback
    else
      @saveFileDialog content, callback

  saveFile: (content, metadata, callback = null) ->
    @_ensureProviderCan 'save', (provider) =>
      provider.save content, metadata, (err) =>
        return @_error(err) if err
        @_fileChanged 'savedFile', content, metadata
        callback? content, metadata

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

  _ensureProviderCan: (capability, callback) ->
    if @state.currentProvider and @state.currentProvider.capabilities[capability]
      callback @state.currentProvider
    else
      @_ui.selectProviderDialog (err, provider) ->
        if not err
          callback provider

  _initState: (options = {})->
    @state =
      content: null
      metadata: null
      availableProviders: []
      currentProvider: null

    # flter for available providers
    allProviders = {}
    for Provider in [ReadOnlyProvider, LocalStorageProvider]
      if Provider.Available()
        allProviders[Provider.Name] = Provider

    # default to all providers if non specified
    if not options.providers
      options.providers = []
      for own providerName of allProviders
        options.providers.push providerName

    # check the providers
    for provider in options.providers
      [providerName, providerOptions] = if isString provider then [provider, {}] else [provider.name, provider]
      if not providerName
        @_error "Invalid provider spec - must either be string or object with name property"
      else
        if allProviders[providerName]
          Provider = allProviders[providerName]
          @state.availableProviders.push new Provider providerOptions
        else
          @_error "Unknown provider: #{providerName}"

class CloudFileManager

  @DefaultMenu: CloudFileManagerUIMenu.DefaultMenu

  constructor: ->
    @client = new CloudFileManagerClient

  createFrame: (appCptions, elemId) ->
    appCptions.client = @client
    React.render (AppView appCptions), document.getElementById(elemId)

  clientConnect: (clientOptions, eventCallback) ->
    @client.connect  clientOptions, eventCallback

module.exports = new CloudFileManager()
