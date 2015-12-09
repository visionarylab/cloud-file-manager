MenuBar = React.createFactory require './menu-bar-view'
ProviderTabbedDialog = React.createFactory require './provider-tabbed-dialog-view'
DownloadDialog = React.createFactory require './download-dialog-view'
RenameDialog = React.createFactory require './rename-dialog-view'
ShareUrlDialog = React.createFactory require './share-url-dialog-view'

tr = require '../utils/translate'
isString = require '../utils/is-string'

{div, iframe} = React.DOM

InnerApp = React.createFactory React.createClass

  displayName: 'CloudFileManagerInnerApp'

  shouldComponentUpdate: (nextProps) ->
    nextProps.app isnt @props.app

  render: ->
    (div {className: 'innerApp'},
      (iframe {src: @props.app})
    )

App = React.createClass

  displayName: 'CloudFileManager'

  getFilename: ->
    if @props.client.state.metadata?.hasOwnProperty('name') and @props.client.state.metadata.name.length > 0
      @props.client.state.metadata.name
    else
      (tr "~MENUBAR.UNTITLED_DOCUMENT")

  getProvider: ->
    @props.client.state.metadata?.provider

  getInitialState: ->
    filename: @getFilename()
    provider: @getProvider()
    menuItems: @props.client._ui.menu?.items or []
    menuOptions: @props.ui?.menuBar or {}
    providerDialog: null
    downloadDialog: null
    renameDialog: null
    shareUrlDialog: null
    dirty: false

  componentWillMount: ->
    @props.client.listen (event) =>
      fileStatus = if event.state.saving
        {message: "Saving...", type: 'info'}
      else if event.state.saved
        {message: "All changes saved to #{event.state.metadata.provider.displayName}", type: 'info'}
      else if event.state.dirty
        {message: 'Unsaved', type: 'alert'}
      else
        null
      @setState
        filename: @getFilename()
        provider: @getProvider()
        fileStatus: fileStatus

      switch event.type
        when 'connected'
          @setState menuItems: @props.client._ui.menu?.items or []

    @props.client._ui.listen (event) =>
      switch event.type
        when 'showProviderDialog'
          @setState providerDialog: event.data
        when 'showDownloadDialog'
          @setState downloadDialog: event.data
        when 'showRenameDialog'
          @setState renameDialog: event.data
        when 'showShareUrlDialog'
          @setState shareUrlDialog: event.data
        when 'appendMenuItem'
          @state.menuItems.push event.data
          @setState menuItems: @state.menuItems
        when 'prependMenuItem'
          @state.menuItems.unshift event.data
          @setState menuItems: @state.menuItems
        when 'replaceMenuItem'
          index = @_getMenuItemIndex event.data.key
          if index isnt -1
            @state.menuItems[index] = event.data.item
            @setState menuItems: @state.menuItems
        when 'insertMenuItemBefore'
          index = @_getMenuItemIndex event.data.key
          if index isnt -1
            if index is 0
              @state.menuItems.unshift event.data.item
            else
              @state.menuItems.splice index, 0, event.data.item
            @setState menuItems: @state.menuItems
        when 'insertMenuItemAfter'
          index = @_getMenuItemIndex event.data.key
          if index isnt -1
            if index is @state.menuItems.length - 1
              @state.menuItems.push event.data.item
            else
              @state.menuItems.splice index + 1, 0, event.data.item
            @setState menuItems: @state.menuItems
        when 'setMenuBarInfo'
          @state.menuOptions.info = event.data
          @setState menuOptions: @state.menuOptions

  _getMenuItemIndex: (key) ->
    if isString key
      for item, index in @state.menuItems
        return index if item.key is key
      -1
    else
      index = parseInt key, 10
      if isNaN(index) or index < 0 or index > @state.menuItems.length - 1
        -1
      else
        index

  closeDialogs: ->
    @setState
      providerDialog: null
      downloadDialog: null
      renameDialog: null
      shareUrlDialog: null

  renderDialogs: ->
    if @state.providerDialog
      (ProviderTabbedDialog {client: @props.client, dialog: @state.providerDialog, close: @closeDialogs})
    else if @state.downloadDialog
      (DownloadDialog {filename: @state.downloadDialog.filename, mimeType: @state.downloadDialog.mimeType, content: @state.downloadDialog.content, close: @closeDialogs})
    else if @state.renameDialog
      (RenameDialog {filename: @state.renameDialog.filename, callback: @state.renameDialog.callback, close: @closeDialogs})
    else if @state.shareUrlDialog
      (ShareUrlDialog {url: @state.shareUrlDialog.url, close: @closeDialogs})

  render: ->
    if @props.usingIframe
      (div {className: 'app'},
        (MenuBar {client: @props.client, filename: @state.filename, provider: @state.provider, fileStatus: @state.fileStatus, items: @state.menuItems, options: @state.menuOptions})
        (InnerApp {app: @props.app})
        @renderDialogs()
      )
    else if @state.providerDialog or @state.downloadDialog
      (div {className: 'app'},
        @renderDialogs()
      )
    else
      null

module.exports = App
