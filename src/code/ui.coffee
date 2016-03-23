tr = require './utils/translate'
isString = require './utils/is-string'

class CloudFileManagerUIEvent

  constructor: (@type, @data = {}) ->

class CloudFileManagerUIMenu

  @DefaultMenu: ['newFileDialog', 'openFileDialog', 'revertSubMenu', 'separator', 'save', 'createCopy', 'shareSubMenu', 'downloadDialog', 'renameDialog']

  constructor: (options, client) ->
    @options = options
    @items = @parseMenuItems options.menu, client

  parseMenuItems: (menuItems, client) ->
    setAction = (action) ->
      client[action]?.bind(client) or (-> client.alert "No #{action} action is available in the client")

    setEnabled = (action) ->
      switch action
        when 'revertSubMenu'
          # revert sub-menu state depends on presence of shareEditKey
          -> (client.state.openedContent? and client.state.metadata?) or client.canEditShared()
        when 'revertToLastOpenedDialog'
          -> client.state.openedContent? and client.state.metadata?
        when 'shareGetLink', 'shareSubMenu'
          -> client.state.shareProvider?
        when 'revertToSharedDialog'
          # revert to shared menu item state depends on sharedDocumentId
          -> client.isShared()
        when 'shareUpdate'
          # shareUpdate menu item state depends on presence of shareEditKey
          -> client.canEditShared()
        else
          true

    getItems = (subMenuItems) =>
      if subMenuItems
        @parseMenuItems subMenuItems, client
      else
        null

    names =
      newFileDialog: tr "~MENU.NEW"
      openFileDialog: tr "~MENU.OPEN"
      closeFileDialog: tr "~MENU.CLOSE"
      revertToLastOpenedDialog: tr "~MENU.REVERT_TO_LAST_OPENED"
      revertToSharedDialog: tr "~MENU.REVERT_TO_SHARED_VIEW"
      save: tr "~MENU.SAVE"
      saveFileAsDialog: tr "~MENU.SAVE_AS"
      createCopy: tr "~MENU.CREATE_COPY"
      shareGetLink: tr "~MENU.SHARE_GET_LINK"
      shareUpdate: tr "~MENU.SHARE_UPDATE"
      downloadDialog: tr "~MENU.DOWNLOAD"
      renameDialog: tr "~MENU.RENAME"
      revertSubMenu: tr "~MENU.REVERT_TO"
      shareSubMenu: tr "~MENU.SHARE"

    subMenus =
      revertSubMenu: ['revertToLastOpenedDialog', 'revertToSharedDialog']
      shareSubMenu: ['shareGetLink', 'shareUpdate']

    items = []
    for item, i in menuItems
      if item is 'separator'
        menuItem =
          key: "seperator#{i}"
          separator: true
      else if isString item
        menuItem =
          key: item
          name: @options.menuNames?[item] or names[item] or "Unknown item: #{item}"
          enabled: setEnabled item
          items: getItems subMenus[item]
          action: setAction item
      else
        menuItem = item
          # clients can pass in custom {name:..., action:...} menu items where the action can be a client function name or otherwise it is assumed action is a function
        if isString item.action
          menuItem.key = item.action
          menuItem.enabled = setEnabled item.action
          menuItem.action = setAction item.action
        else
          menuItem.enabled or= true
        menuItem.items = item.items or getItems item.name
      items.push menuItem
    items

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

  prependMenuItem: (item) ->
    @listenerCallback new CloudFileManagerUIEvent 'prependMenuItem', item

  replaceMenuItem: (key, item) ->
    @listenerCallback new CloudFileManagerUIEvent 'replaceMenuItem',
      key: key
      item: item

  insertMenuItemBefore: (key, item) ->
    @listenerCallback new CloudFileManagerUIEvent 'insertMenuItemBefore',
      key: key
      item: item

  insertMenuItemAfter: (key, item) ->
    @listenerCallback new CloudFileManagerUIEvent 'insertMenuItemAfter',
      key: key
      item: item

  setMenuBarInfo: (info) ->
    @listenerCallback new CloudFileManagerUIEvent 'setMenuBarInfo', info

  saveFileDialog: (callback) ->
    @_showProviderDialog 'saveFile', (tr '~DIALOG.SAVE'), callback

  saveFileAsDialog: (callback) ->
    @_showProviderDialog 'saveFileAs', (tr '~DIALOG.SAVE_AS'), callback

  openFileDialog: (callback) ->
    @_showProviderDialog 'openFile', (tr '~DIALOG.OPEN'), callback

  importDataDialog: (callback) ->
    @listenerCallback new CloudFileManagerUIEvent 'showImportDialog',
      callback: callback

  downloadDialog: (filename, content, callback) ->
    @listenerCallback new CloudFileManagerUIEvent 'showDownloadDialog',
      filename: filename
      content: content
      callback: callback

  renameDialog: (filename, callback) ->
    @listenerCallback new CloudFileManagerUIEvent 'showRenameDialog',
      filename: filename
      callback: callback

  shareDialog: (client, enableLaraSharing=false) ->
    @listenerCallback new CloudFileManagerUIEvent 'showShareDialog',
      client: client
      enableLaraSharing: enableLaraSharing

  showBlockingModal: (modalProps) ->
    @listenerCallback new CloudFileManagerUIEvent 'showBlockingModal', modalProps

  hideBlockingModal: ->
    @listenerCallback new CloudFileManagerUIEvent 'hideBlockingModal'

  alertDialog: (message, title, callback) ->
    @listenerCallback new CloudFileManagerUIEvent 'showAlertDialog',
      title: title
      message: message
      callback: callback

  confirmDialog: (message, callback) ->
    @listenerCallback new CloudFileManagerUIEvent 'showConfirmDialog',
      message: message
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
