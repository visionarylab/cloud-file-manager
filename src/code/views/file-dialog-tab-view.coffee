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

  componentDidMount: ->
    @load()

  load: ->
    @props.provider.list @props.folder, (err, list) =>
      return alert(err) if err
      @setState
        loading: false
      @props.listLoaded list

  render: ->
    (div {className: 'filelist'},
      if @state.loading
        tr "~FILE_DIALOG.LOADING"
      else
        for metadata in @props.list
          (FileListFile {metadata: metadata, fileSelected: @props.fileSelected})
    )

FileDialogTab = React.createClass
  displayName: 'FileDialogTab'

  mixins: [AuthorizeMixin]

  getInitialState: ->
    folder: @props.client.state.metadata?.parent or null
    metadata: @props.client.state.metadata
    filename: @props.client.state.metadata?.name or ''
    list: []

  componentWillMount: ->
    @isOpen = @props.dialog.action is 'openFile'

  filenameChanged: (e) ->
    filename = e.target.value
    metadata = @findMetadata filename
    @setState
      filename: filename
      metadata: metadata

  listLoaded: (list) ->
    @setState list: list

  fileSelected: (metadata) ->
    if metadata?.type is CloudMetadata.File
      @setState filename: metadata.name
    @setState metadata: metadata

  confirm: ->
    if not @state.metadata
      filename = $.trim @state.filename
      @state.metadata = @findMetadata filename
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

  remove: ->
    if @state.metadata and @state.metadata.type isnt CloudMetadata.Folder
      @props.provider.remove @state.metadata, (err) =>
        if not err
          list = @state.list.slice 0
          index = list.indexOf @state.metadata
          list.splice index, 1
          @setState
            list: list
            metadata: null
            filename: ''

  cancel: ->
    @props.close()

  findMetadata: (filename) ->
    for metadata in @state.list
      if metadata.name is filename
        return metadata
    null

  renderWhenAuthorized: ->
    confirmDisabled = (@state.filename.length is 0) or (@isOpen and not @state.metadata)
    removeDisabled = (@state.metadata is null) or (@state.metadata.type is CloudMetadata.Folder)

    (div {className: 'dialogTab'},
      (input {type: 'text', value: @state.filename, placeholder: (tr "~FILE_DIALOG.FILENAME"), onChange: @filenameChanged})
      (FileList {provider: @props.provider, folder: @state.folder, fileSelected: @fileSelected, list: @state.list, listLoaded: @listLoaded})
      (div {className: 'buttons'},
        (button {onClick: @confirm, disabled: confirmDisabled, className: if confirmDisabled then 'disabled' else ''}, if @isOpen then (tr "~FILE_DIALOG.OPEN") else (tr "~FILE_DIALOG.SAVE"))
        if @props.provider.can 'remove'
          (button {onClick: @remove, disabled: removeDisabled, className: if removeDisabled then 'disabled' else ''}, (tr "~FILE_DIALOG.REMOVE"))
        (button {onClick: @cancel}, (tr "~FILE_DIALOG.CANCEL"))
      )
    )

module.exports = FileDialogTab
