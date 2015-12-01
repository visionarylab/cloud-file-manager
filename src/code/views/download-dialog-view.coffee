{div, input, a, button} = React.DOM

ModalDialog = React.createFactory require './modal-dialog-view'

tr = require '../utils/translate'

module.exports = React.createClass

  displayName: 'DownloadDialogView'

  getInitialState: ->
    filename: @trim(@props.filename or '')

  componentDidMount: ->
    @filename = React.findDOMNode @refs.filename
    @filename.focus()

  updateFilename: ->
    @setState filename: @trim(@filename.value)

  trim: (s) ->
    s.replace /^\s+|\s+$/, ''

  download: (e) ->
    if @state.filename.length > 0
      e.target.setAttribute 'href', "data:text/plain,#{encodeURIComponent(@props.content)}"
      @props.close()
    else
      e.preventDefault()
      @filename.focus()

  render: ->
    (ModalDialog {title: (tr '~DIALOG.DOWNLOAD'), close: @props.close},
      (div {className: 'download-dialog'},
        (input {ref: 'filename', placeholder: 'Filename', value: @state.filename, onChange: @updateFilename})
        (div {className: 'buttons'},
          (a {href: '#', className: (if @state.filename.length is 0 then 'disabled' else ''), download: @state.filename, onClick: @download}, 'Download')
          (button {onClick: @props.close}, 'Cancel')
        )
      )
    )
