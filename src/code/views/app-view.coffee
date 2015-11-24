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
    providerDialog: null

  componentWillMount: ->
    @props.client.listen (event) =>
      @setState filename: @getFilename()

      switch event.type
        when 'connected'
          @setState menuItems: @props.client._ui.menu?.items or []

    @props.client._ui.listen (event) =>
      if event.type is 'showProviderDialog'
        @setState providerDialog: event.data

  closeProviderDialog: ->
    @setState providerDialog: null

  render: ->
    if not @props.headless
      menu = MenuBar {filename: @state.filename, items: @state.menuItems}
      app = InnerApp (app: @props.app)
    (div {className: 'app'},
      menu
      app
      if @state.providerDialog
        (ProviderTabbedDialog {client: @props.client, dialog: @state.providerDialog, close: @closeProviderDialog})
    )

module.exports = App
