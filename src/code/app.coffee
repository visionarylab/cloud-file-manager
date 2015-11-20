tr = require './utils/translate'
AppView = React.createFactory require './views/app-view'

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
    alert 'saveFileDialog'

  saveFileAsDialog: (callback) ->
    alert 'saveFileAsDialog'

  openFileDialog: (callback) ->
    alert 'openFileDialog'

  selectProviderDialog: (callback) ->
    alert 'selectProviderDialog'

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
    @_initState()
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
    @_ensureProvider (provider) ->
      provider.load metadata, (err, content) =>
        return @_error(err) if err
        @_event 'openedFile', {content: content, metadata: metadata}

  openFileDialog: (callback = null) ->
    @_ui.openFileDialog (metadata) =>
      @openFile metadata, callback

  saveContent: (content, callback = null) ->
    if @state.metadata
      @saveFile content, @state.metadata, callback
    else
      @saveFileDialog content, callback

  saveFile: (content, metadata, callback = null) ->
    @_ensureProvider (provider) ->
      provider.save content, metadata, (err) =>
        return @_error(err) if err
        @_event 'savedFile', {content: content, metadata: metadata}

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
      providers: []
      currentProvider: null

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
