{div, input, button} = React.DOM
tr = require '../utils/translate'
CloudMetadata = (require '../providers/provider-interface').CloudMetadata

module.exports = React.createClass

  displayName: 'LocalFileListTab'

  getInitialState: ->
    hover: false

  changed: (e) ->
    files = e.target.files
    if files.length > 1
      @props.client.alert tr "~LOCAL_FILE_DIALOG.MULTIPLE_FILES_SELECTED"
    else if files.length is 1
      @openFile files[0]

  openFile: (file) ->
    metadata = new CloudMetadata
      name: file.name.split('.')[0]
      type: CloudMetadata.File
      parent: null
      provider: @props.provider
      providerData:
        file: file
    @props.dialog.callback? metadata
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
    droppedFiles = if e.dataTransfer then e.dataTransfer.files else e.target.files
    if droppedFiles.length > 1
      @props.client.alert tr "~LOCAL_FILE_DIALOG.MULTIPLE_FILES_DROPPED"
    else if droppedFiles.length is 1
      @openFile droppedFiles[0]

  render: ->
    dropClass = "dropArea#{if @state.hover then ' dropHover' else ''}"
    (div {className: 'dialogTab localFileLoad'},
      (div {className: dropClass, onDragEnter: @dragEnter, onDragLeave: @dragLeave, onDrop: @drop},
        (tr "~LOCAL_FILE_DIALOG.DROP_FILE_HERE")
        (input {type: 'file', onChange: @changed})
      )
      (div {className: 'buttons'},
        (button {onClick: @cancel}, (tr "~FILE_DIALOG.CANCEL"))
      )
    )
