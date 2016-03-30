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
    subFolderClass = if @props.isSubFolder then 'subfolder' else ''
    (div {key: @props.key
          , className: "#{selectableClass} #{selectedClass} #{subFolderClass}"
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
      return @props.client.alert(err) if err
      @setState
        loading: false
      @props.listLoaded list

  parentSelected: (e) ->
    @props.fileSelected @props.folder?.parent

  render: ->
    list = []
    isSubFolder = @props.folder isnt null
    if isSubFolder
      list.push (div {key: 'parent', className: 'selectable', onClick: @parentSelected}, (React.DOM.i {className: 'icon-paletteArrow-collapse'}), @props.folder.name)
    for metadata, i in @props.list
      list.push (FileListFile {key: i, metadata: metadata, selected: @props.selectedFile is metadata, fileSelected: @props.fileSelected, fileConfirmed: @props.fileConfirmed, isSubFolder: isSubFolder})

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
    initialState = @getStateForFolder @props.client.state.metadata?.parent or null
    initialState.filename = initialState.metadata?.name or ''
    initialState

  isOpen: ->
    @props.dialog.action is 'openFile'

  filenameChanged: (e) ->
    filename = e.target.value
    @setState
      filename: filename
      metadata: @findMetadata filename, @state.list

  listLoaded: (list) ->
    @setState list: list

  getStateForFolder: (folder) ->
    metadata = if @isOpen() then @state?.metadata or null else @props.client.state.metadata
    folder: folder
    metadata: metadata
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
    confirmed = (metadata) =>
      # ensure the metadata provider is the currently-showing tab
      @state.metadata = metadata
      @state.metadata.provider = @props.provider
      @props.dialog.callback? @state.metadata
      @props.close()

    filename = $.trim @state.filename
    existingMetadata = @findMetadata filename, @state.list
    metadata = @state.metadata or existingMetadata

    if metadata
      if @isOpen()
        confirmed metadata
      else if existingMetadata
        @props.client.confirm "Are you sure you want to overwrite #{existingMetadata.name}?", -> confirmed existingMetadata
      else
        confirmed metadata
    else if @isOpen()
      @props.client.alert "#{filename} not found"
    else
      confirmed new CloudMetadata
        name: filename
        type: CloudMetadata.File
        parent: @state.folder or null
        provider: @props.provider

  remove: ->
    if @state.metadata and @state.metadata.type isnt CloudMetadata.Folder
      @props.client.confirm tr("~FILE_DIALOG.REMOVE_CONFIRM", {filename: @state.metadata.name}), =>
        @props.provider.remove @state.metadata, (err) =>
          if not err
            @props.client.alert tr("~FILE_DIALOG.REMOVED_MESSAGE", {filename: @state.metadata.name}), tr("~FILE_DIALOG.REMOVED_TITLE")
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
    (@state.filename.length is 0) or (@isOpen() and not @state.metadata)

  renderWhenAuthorized: ->
    confirmDisabled = @confirmDisabled()
    removeDisabled = (@state.metadata is null) or (@state.metadata.type is CloudMetadata.Folder)

    (div {className: 'dialogTab'},
      (input {type: 'text', value: @state.filename, placeholder: (tr "~FILE_DIALOG.FILENAME"), onChange: @filenameChanged, onKeyDown: @watchForEnter})
      (FileList {provider: @props.provider, folder: @state.folder, selectedFile: @state.metadata, fileSelected: @fileSelected, fileConfirmed: @confirm, list: @state.list, listLoaded: @listLoaded, client: @props.client})
      (div {className: 'buttons'},
        (button {onClick: @confirm, disabled: confirmDisabled, className: if confirmDisabled then 'disabled' else ''}, if @isOpen() then (tr "~FILE_DIALOG.OPEN") else (tr "~FILE_DIALOG.SAVE"))
        if @props.provider.can 'remove'
          (button {onClick: @remove, disabled: removeDisabled, className: if removeDisabled then 'disabled' else ''}, (tr "~FILE_DIALOG.REMOVE"))
        (button {onClick: @cancel}, (tr "~FILE_DIALOG.CANCEL"))
      )
    )

module.exports = FileDialogTab
