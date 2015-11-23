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
    @props.provider.list @props.folder, (err, list) =>
      return alert(err) if err
      @setState
        loading: false
        list: list
      @props.listLoaded list

  render: ->
    (div {className: 'filelist'},
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
    folder: @props.client.state.metadata?.parent or null
    metadata: @props.client.state.metadata
    filename: @props.client.state.metadata?.name or ''

  componentWillMount: ->
    @isOpen = @props.dialog.action is 'openFile'
    @list = []

  filenameChanged: (e) ->
    filename = e.target.value
    metadata = null
    @setState
      filename: filename
      metadata: metadata

  listLoaded: (list) ->
    @list = list

  fileSelected: (metadata) ->
    if metadata?.type is CloudMetadata.File
      @setState filename: metadata.name
    @setState metadata: metadata

  confirm: ->
    # if filename changed find the file in the list
    filename = $.trim @state.filename
    if not @state.metadata
      for metadata in @list
        if metadata.name is filename
          @state.metadata = metadata
          break
      if not @state.metadata
        if @isOpen
          alert "#{@state.filename} not found"
        else
          @state.metadata = new CloudMetadata
            name: filename
            path: "/#{filename}" # TODO: Fix path
            type: CloudMetadata.File
            provider: @props.provider
    if @state.metadata
      @props.dialog.callback @state.metadata
      @props.close()

  cancel: ->
    @props.close()

  renderWhenAuthorized: ->
    (div {className: 'dialogTab'},
      (input {type: 'text', value: @state.filename, placeholder: (tr "~FILE_DIALOG.FILENAME"), onChange: @filenameChanged})
      (FileList {provider: @props.provider, folder: @state.folder, fileSelected: @fileSelected, listLoaded: @listLoaded})
      (div {className: 'buttons'},
        (button {onClick: @confirm, disabled: @state.filename.length is 0}, if @isOpen then (tr "~FILE_DIALOG.OPEN") else (tr "~FILE_DIALOG.SAVE"))
        (button {onClick: @cancel}, (tr "~FILE_DIALOG.CANCEL"))
      )
    )

module.exports = FileDialogTab
