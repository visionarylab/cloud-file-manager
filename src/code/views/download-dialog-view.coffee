{div, input, a, button} = React.DOM

ModalDialog = React.createFactory require './modal-dialog-view'

tr = require '../utils/translate'

module.exports = React.createClass

  displayName: 'DownloadDialogView'

  getInitialState: ->
    filename = "#{@props.filename or (tr "~MENUBAR.UNTITLED_DOCUMENT")}.json"
    state =
      filename: filename
      trimmedFilename: @trim filename

  componentDidMount: ->
    @filename = React.findDOMNode @refs.filename
    @filename.focus()

  updateFilename: ->
    filename = @filename.value
    @setState
      filename: filename
      trimmedFilename: @trim filename

  trim: (s) ->
    s.replace /^\s+|\s+$/, ''

  download: (e) ->
    if @state.trimmedFilename.length > 0
      e.target.setAttribute 'href', "data:application/json,#{encodeURIComponent(@props.content.getContentAsJSON())}"
      @props.close()
    else
      e.preventDefault()
      @filename.focus()

  render: ->
    (ModalDialog {title: (tr '~DIALOG.DOWNLOAD'), close: @props.close},
      (div {className: 'download-dialog'},
        (input {ref: 'filename', placeholder: 'Filename', value: @state.filename, onChange: @updateFilename})
        (div {className: 'buttons'},
          (a {href: '#', className: (if @state.trimmedFilename.length is 0 then 'disabled' else ''), download: @state.trimmedFilename, onClick: @download}, tr '~DOWNLOAD_DIALOG.DOWNLOAD')
          (button {onClick: @props.close}, tr '~DOWNLOAD_DIALOG.CANCEL')
        )
      )
    )
