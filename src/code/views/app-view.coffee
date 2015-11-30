MenuBar = React.createFactory require './menu-bar-view'
ProviderTabbedDialog = React.createFactory require './provider-tabbed-dialog-view'

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

  getInitialState: ->
    filename: @getFilename()
    menuItems: @props.client._ui.menu?.items or []
    menuOptions: @props.menuBar or {}
    providerDialog: null
    dirty: false

  componentWillMount: ->
    @props.client.listen (event) =>
      fileStatus = if event.state.saving
        {message: 'Saving...', type: 'info'}
      else if event.state.saved
        {message: 'Saved', type: 'info'}
      else if event.state.dirty
        {message: 'Unsaved', type: 'alert'}
      else
        null
      @setState
        filename: @getFilename()
        fileStatus: fileStatus

      switch event.type
        when 'connected'
          @setState menuItems: @props.client._ui.menu?.items or []

    @props.client._ui.listen (event) =>
      switch event.type
        when 'showProviderDialog'
          @setState providerDialog: event.data
        when 'appendMenuItem'
          @state.menuItems.push event.data
          @setState menuItems: @state.menuItems
        when 'setMenuBarInfo'
          @state.menuOptions.info = event.data
          @setState menuOptions: @state.menuOptions

  closeProviderDialog: ->
    @setState providerDialog: null

  render: ->
    if @props.usingIframe
      (div {className: 'app'},
        (MenuBar {filename: @state.filename, fileStatus: @state.fileStatus, options: @state.menuOptions})
        (InnerApp {app: @props.app})
        if @state.providerDialog
          (ProviderTabbedDialog {client: @props.client, dialog: @state.providerDialog, close: @closeProviderDialog})
      )
    else
      if @state.providerDialog
        (div {className: 'app'},
          (ProviderTabbedDialog {client: @props.client, dialog: @state.providerDialog, close: @closeProviderDialog})
        )
      else
        null

module.exports = App
