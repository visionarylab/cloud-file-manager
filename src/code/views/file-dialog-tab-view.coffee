AuthorizeMixin = require './authorize-mixin'
CloudMetadata = (require '../providers/provider-interface').CloudMetadata

tr = require '../utils/translate'

{div, img, i, span, input, button} = React.DOM

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
        tr "~FILE_DIALOG.LOADING"
      else
        for metadata in @state.list
          (FileListFile {metadata: metadata, fileSelected: @props.fileSelected})
    )

FileDialogTab = React.createClass
  displayName: 'FileDialogTab'

  mixins: [AuthorizeMixin]

  getInitialState: ->
    isOpen: @props.dialog.action is 'openFile'
    metadata: @props.client.state.metadata
    filename: @props.client.state.metadata?.name or ''

  filenameChanged: (e) ->
    @setState filename: e.target.value

  fileSelected: (metadata) ->
    if metadata?.type = CloudMetadata.File
      @setState filename: metadata.name
    @setState metadata: metadata

  confirm: ->
    @props.dialog.callback @state.metadata
    @props.close()

  cancel: ->
    @props.close()

  renderWhenAuthorized: ->
    (div {className: 'dialogTab'},
      (input {type: 'text', value: @state.filename, placeholder: (tr "~FILE_DIALOG.FILENAME"), onChange: @filenameChanged})
      (FileList {provider: @props.provider, metadata: @state.metadata, fileSelected: @fileSelected})
      (div {className: 'buttons'},
        (button {onClick: @confirm}, if @state.isOpen then (tr "~FILE_DIALOG.OPEN") else (tr "~FILE_DIALOG.SAVE"))
        (button {onClick: @cancel}, (tr "~FILE_DIALOG.CANCEL"))
      )
    )

module.exports = FileDialogTab
