MenuBar = React.createFactory require './menu-bar-view'
ProviderTabbedDialog = React.createFactory require './provider-tabbed-dialog-view'
DownloadDialog = React.createFactory require './download-dialog-view'
RenameDialog = React.createFactory require './rename-dialog-view'

tr = require '../utils/translate'

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
    if @props.client.state.metadata?.hasOwnProperty('name') then @props.client.state.metadata.name else (tr "~MENUBAR.UNTITLE_DOCUMENT")

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
        when 'appendMenuItem'
          @state.menuItems.push event.data
          @setState menuItems: @state.menuItems
        when 'setMenuBarInfo'
          @state.menuOptions.info = event.data
          @setState menuOptions: @state.menuOptions

  closeDialogs: ->
    @setState
      providerDialog: null
      downloadDialog: null
      renameDialog: null

  renderDialogs: ->
    if @state.providerDialog
      (ProviderTabbedDialog {client: @props.client, dialog: @state.providerDialog, close: @closeDialogs})
    else if @state.downloadDialog
      (DownloadDialog {filename: @state.downloadDialog.filename, mimeType: @state.downloadDialog.mimeType, content: @state.downloadDialog.content, close: @closeDialogs})
    else if @state.renameDialog
      (RenameDialog {filename: @state.renameDialog.filename, callback: @state.renameDialog.callback, close: @closeDialogs})

  render: ->
    if @props.usingIframe
      (div {className: 'app'},
        (MenuBar {filename: @state.filename, provider: @state.provider, fileStatus: @state.fileStatus, items: @state.menuItems, options: @state.menuOptions})
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
