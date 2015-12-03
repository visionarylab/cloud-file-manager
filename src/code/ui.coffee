tr = require './utils/translate'
isString = require './utils/is-string'

class CloudFileManagerUIEvent

  constructor: (@type, @data = {}) ->

class CloudFileManagerUIMenu

  @DefaultMenu: ['newFileDialog', 'openFileDialog', 'reopenDialog', 'separator', 'save', 'saveFileAsDialog', 'downloadDialog', 'renameDialog']
  @AutoSaveMenu: ['newFileDialog', 'openFileDialog', 'reopenDialog', 'separator', 'saveCopyDialog', 'downloadDialog', 'renameDialog']

  constructor: (options, client) ->
    setAction = (action) ->
      client[action]?.bind(client) or (-> alert "No #{action} action is available in the client")

    setEnabled = (action) ->
      switch action
        when 'reopenDialog'
          -> client.state.metadata?.provider.can 'load'
        when 'renameDialog'
          -> client.state.metadata?.provider.can 'rename'
        when 'saveCopyDialog'
          -> client.state.metadata?
        else
          true

    names =
      newFileDialog: tr "~MENU.NEW"
      openFileDialog: tr "~MENU.OPEN"
      reopenDialog: tr "~MENU.REOPEN"
      save: tr "~MENU.SAVE"
      saveFileAsDialog: tr "~MENU.SAVE_AS"
      saveCopyDialog: tr "~MENU.SAVE_COPY"
      downloadDialog: tr "~MENU.DOWNLOAD"
      renameDialog: tr "~MENU.RENAME"

    @items = []
    for item in options.menu
      menuItem = if item is 'separator'
        separator: true
      else if isString item
        name: options.menuNames?[item] or names[item] or "Unknown item: #{item}"
        enabled: setEnabled item
        action: setAction item
      else
        # clients can pass in custom {name:..., action:...} menu items where the action can be a client function name or otherwise it is assumed action is a function
        if isString item.action
          item.enabled = setEnabled item.action
          item.action = setAction item.action
        else
          item.enabled or= true
        item
      if menuItem
        @items.push menuItem

class CloudFileManagerUI

  constructor: (@client)->
    @menu = null

  init: (options) ->
    options = options or {}
    # skip the menu if explicity set to null (meaning no menu)
    if options.menu isnt null
      if typeof options.menu is 'undefined'
        options.menu = CloudFileManagerUIMenu.DefaultMenu
      @menu = new CloudFileManagerUIMenu options, @client

  # for React to listen for dialog changes
  listen: (@listenerCallback) ->

  appendMenuItem: (item) ->
    @listenerCallback new CloudFileManagerUIEvent 'appendMenuItem', item

  setMenuBarInfo: (info) ->
    @listenerCallback new CloudFileManagerUIEvent 'setMenuBarInfo', info

  saveFileDialog: (callback) ->
    @_showProviderDialog 'saveFile', (tr '~DIALOG.SAVE'), callback

  saveFileAsDialog: (callback) ->
    @_showProviderDialog 'saveFileAs', (tr '~DIALOG.SAVE_AS'), callback

  saveCopyDialog: (callback) ->
    @_showProviderDialog 'saveFileCopy', (tr '~DIALOG.SAVE_COPY'), callback

  openFileDialog: (callback) ->
    @_showProviderDialog 'openFile', (tr '~DIALOG.OPEN'), callback

  downloadDialog: (filename, content, callback) ->
    @listenerCallback new CloudFileManagerUIEvent 'showDownloadDialog',
      filename: filename
      content: content
      callback: callback

  renameDialog: (filename, callback) ->
    @listenerCallback new CloudFileManagerUIEvent 'showRenameDialog',
      filename: filename
      callback: callback

  _showProviderDialog: (action, title, callback) ->
    @listenerCallback new CloudFileManagerUIEvent 'showProviderDialog',
      action: action
      title: title
      callback: callback

module.exports =
  CloudFileManagerUIEvent: CloudFileManagerUIEvent
  CloudFileManagerUI: CloudFileManagerUI
  CloudFileManagerUIMenu: CloudFileManagerUIMenu
