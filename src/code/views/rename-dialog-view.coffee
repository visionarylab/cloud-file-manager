{div, input, a, button} = React.DOM

ModalDialog = React.createFactory require './modal-dialog-view'

tr = require '../utils/translate'

module.exports = React.createClass

  displayName: 'RenameDialogView'

  getInitialState: ->
    filename: @trim(@props.filename or '')

  componentDidMount: ->
    @filename = React.findDOMNode @refs.filename
    @filename.focus()

  updateFilename: ->
    @setState filename: @trim(@filename.value)

  trim: (s) ->
    s.replace /^\s+|\s+$/, ''

  rename: (e) ->
    if @state.filename.length > 0
      @props.callback? @state.filename
      @props.close()
    else
      e.preventDefault()
      @filename.focus()

  render: ->
    (ModalDialog {title: (tr '~DIALOG.DOWNLOAD'), close: @props.close},
      (div {className: 'rename-dialog'},
        (input {ref: 'filename', placeholder: 'Filename', value: @state.filename, onChange: @updateFilename})
        (div {className: 'buttons'},
          (button {className: (if @state.filename.length is 0 then 'disabled' else ''), onClick: @rename}, tr '~RENAME_DIALOG.RENAME')
          (button {onClick: @props.close}, tr '~RENAME_DIALOG.CANCEL')
        )
      )
    )
