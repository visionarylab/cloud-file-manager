AuthorizeMixin = require './authorize-mixin'
CloudMetadata = (require '../providers/provider-interface').CloudMetadata

tr = require '../utils/translate'

{div, img, i, span, input, button} = React.DOM

FileListFile = React.createFactory React.createClass
  displayName: 'FileListFile'

  componentWillMount: ->
    @lastClick = 0

  fileSelected:  (e) ->
    e.preventDefault()
    e.stopPropagation()
    now = (new Date()).getTime()
    @props.fileSelected @props.metadata
    if now - @lastClick <= 250
      @props.fileConfirmed()
    @lastClick = now

  render: ->
    selectableClass = if @props.metadata.type isnt CloudMetadata.Label then 'selectable' else ''
    selectedClass = if @props.selected then 'selected' else ''
    (div {key: @props.key
          , className: "#{selectableClass} #{selectedClass}"
          , title: @props.metadata.description or undefined
          , onClick: if @props.metadata.type isnt CloudMetadata.Label then @fileSelected else undefined },
      (React.DOM.i {className: if @props.metadata.type is CloudMetadata.Folder then 'icon-inspectorArrow-collapse' else if @props.metadata.type is CloudMetadata.File then 'icon-noteTool'})
      @props.metadata.name
    )

FileList = React.createFactory React.createClass
  displayName: 'FileList'

  getInitialState: ->
    loading: true

  componentDidMount: ->
    @load @props.folder

  componentWillReceiveProps: (nextProps) ->
    if nextProps.folder isnt @props.folder
      @load nextProps.folder

  load: (folder) ->
    @props.provider.list folder, (err, list) =>
      return alert(err) if err
      @setState
        loading: false
      @props.listLoaded list

  parentSelected: (e) ->
    @props.fileSelected @props.folder?.parent

  render: ->
    list = []
    if @props.folder isnt null
      list.push (div {key: 'parent', className: 'selectable', onClick: @parentSelected}, (React.DOM.i {className: 'icon-paletteArrow-collapse'}), 'Parent Folder')
    for metadata, i in @props.list
      list.push (FileListFile {key: i, metadata: metadata, selected: @props.selectedFile is metadata, fileSelected: @props.fileSelected, fileConfirmed: @props.fileConfirmed})

    (div {className: 'filelist'},
      if @state.loading
        tr "~FILE_DIALOG.LOADING"
      else
        list
    )

FileDialogTab = React.createClass
  displayName: 'FileDialogTab'

  mixins: [AuthorizeMixin]

  getInitialState: ->
    @getStateForFolder @props.client.state.metadata?.parent or null

  componentWillMount: ->
    @isOpen = @props.dialog.action is 'openFile'

  filenameChanged: (e) ->
    filename = e.target.value
    metadata = @findMetadata filename, @state.list
    @setState
      filename: filename
      metadata: metadata

  listLoaded: (list) ->
    @setState
      list: list
      metadata: @findMetadata $.trim(@state.filename), list

  getStateForFolder: (folder) ->
    folder: folder
    metadata: @props.client.state.metadata
    filename: @props.client.state.metadata?.name or ''
    list: []

  fileSelected: (metadata) ->
    if metadata?.type is CloudMetadata.Folder
      @setState @getStateForFolder metadata
    else if metadata?.type is CloudMetadata.File
      @setState
        filename: metadata.name
        metadata: metadata
    else
      @setState @getStateForFolder null

  confirm: ->
    if not @state.metadata
      filename = $.trim @state.filename
      @state.metadata = @findMetadata filename, @state.list
      if not @state.metadata
        if @isOpen
          alert "#{@state.filename} not found"
        else
          @state.metadata = new CloudMetadata
            name: filename
            type: CloudMetadata.File
            parent: @state.folder or null
            provider: @props.provider
    if @state.metadata
      # ensure the metadata provider is the currently-showing tab
      @state.metadata.provider = @props.provider
      @props.dialog.callback? @state.metadata
      @props.close()

  remove: ->
    if @state.metadata and @state.metadata.type isnt CloudMetadata.Folder and confirm(tr("~FILE_DIALOG.REMOVE_CONFIRM", {filename: @state.metadata.name}))
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

  findMetadata: (filename, list) ->
    for metadata in list
      if metadata.name is filename
        return metadata
    null

  watchForEnter: (e) ->
    if e.keyCode is 13 and not @confirmDisabled()
      @confirm()

  confirmDisabled: ->
    (@state.filename.length is 0) or (@isOpen and not @state.metadata)

  renderWhenAuthorized: ->
    confirmDisabled = @confirmDisabled()
    removeDisabled = (@state.metadata is null) or (@state.metadata.type is CloudMetadata.Folder)

    (div {className: 'dialogTab'},
      (input {type: 'text', value: @state.filename, placeholder: (tr "~FILE_DIALOG.FILENAME"), onChange: @filenameChanged, onKeyDown: @watchForEnter})
      (FileList {provider: @props.provider, folder: @state.folder, selectedFile: @state.metadata, fileSelected: @fileSelected, fileConfirmed: @confirm, list: @state.list, listLoaded: @listLoaded})
      (div {className: 'buttons'},
        (button {onClick: @confirm, disabled: confirmDisabled, className: if confirmDisabled then 'disabled' else ''}, if @isOpen then (tr "~FILE_DIALOG.OPEN") else (tr "~FILE_DIALOG.SAVE"))
        if @props.provider.can 'remove'
          (button {onClick: @remove, disabled: removeDisabled, className: if removeDisabled then 'disabled' else ''}, (tr "~FILE_DIALOG.REMOVE"))
        (button {onClick: @cancel}, (tr "~FILE_DIALOG.CANCEL"))
      )
    )

module.exports = FileDialogTab
