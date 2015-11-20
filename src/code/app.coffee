tr = require './utils/translate'
AppView = React.createFactory require './views/app-view'
LocalStorageProvider = require './providers/localstorage-provider'
CloudFile = (require './providers/provider-interface').CloudFile
CloudMetadata = (require './providers/provider-interface').CloudMetadata

# helpers that don't need to live in the classes
isString = (param) -> Object.prototype.toString.call(param) is '[object String]'

class CloudFileManagerUI

  constructor: (@client)->
    @menu = null

  init: (@options) ->
    # skip the menu if explicity set to null (meaning no menu)
    if @options.menu isnt null
      if typeof @options.menu is 'undefined'
        @options.menu = CloudFileManager.DefaultMenu
      @menu = new CloudFileManagerUIMenu @options, @client

  saveFileDialog: (callback) ->
    @_promptForFile 'Save File', callback

  saveFileAsDialog: (callback) ->
    @_promptForFile 'Save File As', callback

  openFileDialog: (callback) ->
    @_promptForFile 'Open File', callback

  selectProviderDialog: (callback) ->
    alert 'selectProviderDialog'

  _promptForFile: (promptText, callback) ->
    filename = prompt(promptText)
    if filename isnt null
      callback new CloudMetadata
        name: filename
        path: filename
        type: CloudMetadata.File
        provider: @client.state.currentProvider


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
    @allProviders = {}
    if LocalStorageProvider.Available()
      provider = new LocalStorageProvider()
      @allProviders[provider.name] = provider

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
    @_ensureProvider (provider) =>
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
    @_ensureProvider (provider) =>
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

  _ensureProvider: (callback) ->
    if @state.currentProvider
      callback @state.currentProvider
    else
      @_ui.selectProviderDialog (err, provider) ->
        if not err
          callback provider

  _initState: (options = {})->
    @state =
      content: null
      metadata: null
      allProviders: @allProviders
      availableProviders: []
      currentProvider: null

    # default to all providers if non specified
    if not options.providers
      options.providers = []
      for own providerName of @allProviders
        options.providers.push providerName

    # check the providers
    for providerName in options.providers
      if @allProviders[providerName]
        @state.availableProviders.push @allProviders[providerName]
      else
        @_error "Unknown provider: #{providerName}"

    # auto select a provider if only one given
    if @state.availableProviders.length is 1
      @state.currentProvider = @state.availableProviders[0]

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
