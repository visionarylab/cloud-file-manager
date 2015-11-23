ModalTabbedDialog = React.createFactory require './modal-tabbed-dialog-view'
TabbedPanel = require './tabbed-panel-view'
CloudMetadata = (require '../providers/provider-interface').CloudMetadata

tr = require '../utils/translate'
{div, img, i, span, input, button} = React.DOM

AuthorizeMixin =
  render: ->
    @props.provider.authorized (authorized) =>
      if authorized
        @renderWhenAuthorized()
      else
        (@props.provider.authorizationDialog {provider: @props.provider})

FileListFile = React.createFactory React.createClass
  displayName: 'FileListFile'
  fileSelected: ->
    @props.fileSelected @props.metadata
  render: ->
    (div {title: @props.metadata.path, onClick: @fileSelected}, @props.metadata.name)

FileList = React.createFactory React.createClass
  displayName: 'FileList'
  getInitialState: ->
    loading: true
    list: []
  componentDidMount: ->
    @load()
  load: ->
    @props.provider.list @props.metadata, (err, list) =>
      return alert(err) if err
      @setState
        loading: false
        list: list
  render: ->
    (div {},
      if @state.loading
        'Loading...'
      else
        for metadata in @state.list
          (FileListFile {metadata: metadata, fileSelected: @props.fileSelected})
    )

FileDialogTab = React.createFactory React.createClass
  displayName: 'FileDialogTab'
  mixins: [AuthorizeMixin]
  getInitialState: ->
    metadata: @props.client.state.metadata
    filename: @props.client.state.metadata?.name or ''
  filenameChanged: (e) ->
    @setState filename: e.target.value
  fileSelected: (metadata) ->
    if metadata?.type = CloudMetadata.File
      @setState filename: metadata.name
    @setState metadata: metadata
  open: ->
    @props.dialog.callback @state.metadata
    @props.close()
  cancel: ->
    @props.close()
  renderWhenAuthorized: ->
    (div {className: 'dialogTab'},
      (input {type: 'text', value: @state.filename, placeholder: 'Filename', onChange: @filenameChanged})
      (FileList {provider: @props.provider, metadata: @state.metadata, fileSelected: @fileSelected})
      (div {className: 'buttons'},
        (button {onClick: @open}, 'Open')
        (button {onClick: @cancel}, 'Cancel')
      )
    )

SaveFileDialogTab = React.createFactory React.createClass
  displayName: 'SaveFileDialogTab'
  render: -> (div {}, "TODO: SaveFileDialogTab: #{@props.provider.displayName}")

SelectProviderDialogTab = React.createFactory React.createClass
  displayName: 'SelectProviderDialogTab'
  render: -> (div {}, "TODO: SelectProviderDialogTab: #{@props.provider.displayName}")

module.exports = React.createClass
  displayName: 'ProviderTabbedDialog'

  render:  ->
    [capability, TabComponent] = switch @props.dialog.action
      when 'openFile' then ['list', FileDialogTab]
      when 'saveFile', 'saveFileAs' then ['save', FileDialogTab]
      when 'selectProvider' then [null, SelectProviderDialogTab]

    tabs = []
    for provider, i in @props.client.state.availableProviders
      if not capability or provider.capabilities[capability]
        component = TabComponent
          client: @props.client
          dialog: @props.dialog
          close: @props.close
          provider: provider
        tabs.push TabbedPanel.Tab {key: i, label: (tr provider.displayName), component: component}

    (ModalTabbedDialog {title: (tr @props.dialog.title), close: @props.close, tabs: tabs})
