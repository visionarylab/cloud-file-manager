{div, input, button} = React.DOM
tr = require '../utils/translate'
CloudMetadata = (require '../providers/provider-interface').CloudMetadata

module.exports = React.createClass

  displayName: 'LocalFileListTab'

  # Standard React 'drop' event handlers are triggered after client 'drop' event handlers.
  # By explicitly installing DOM event handlers we get first crack at the 'drop' event.
  componentDidMount: ->
    @refs.dropZone.addEventListener 'drop', @drop
    return

  componentWillUnmount: ->
    @refs.dropZone.removeEventListener 'drop', @drop
    return

  getInitialState: ->
    hover: false

  changed: (e) ->
    files = e.target.files
    if files.length > 1
      @props.client.alert tr "~LOCAL_FILE_DIALOG.MULTIPLE_FILES_SELECTED"
    else if files.length is 1
      @openFile files[0], 'select'

  openFile: (file, via) ->
    metadata = new CloudMetadata
      name: file.name.split('.')[0]
      type: CloudMetadata.File
      parent: null
      provider: @props.provider
      providerData:
        file: file
    @props.dialog.callback? metadata, via
    @props.close()

  cancel: ->
    @props.close()

  dragEnter: (e) ->
    e.preventDefault()
    @setState hover: true

  dragLeave: (e) ->
    e.preventDefault()
    @setState hover: false

  drop: (e) ->
    e.preventDefault()
    e.stopPropagation()
    droppedFiles = if e.dataTransfer then e.dataTransfer.files else e.target.files
    if droppedFiles.length > 1
      @props.client.alert tr "~LOCAL_FILE_DIALOG.MULTIPLE_FILES_DROPPED"
    else if droppedFiles.length is 1
      @openFile droppedFiles[0], 'drop'
    return

  render: ->
    dropClass = "dropArea#{if @state.hover then ' dropHover' else ''}"
    (div {className: 'dialogTab localFileLoad'},
      # 'drop' event handler installed as DOM event handler in componentDidMount()
      (div {ref: 'dropZone', className: dropClass, onDragEnter: @dragEnter, onDragLeave: @dragLeave},
        (tr "~LOCAL_FILE_DIALOG.DROP_FILE_HERE")
        (input {type: 'file', onChange: @changed})
      )
      (div {className: 'buttons'},
        (button {onClick: @cancel}, (tr "~FILE_DIALOG.CANCEL"))
      )
    )
