{div, input, a, button} = React.DOM

ModalDialog = React.createFactory require './modal-dialog-view'

tr = require '../utils/translate'

module.exports = React.createClass

  displayName: 'RenameDialogView'

  getInitialState: ->
    filename = @props.filename or ''
    state =
      filename: filename
      trimmedFilename: @trim filename

  componentDidMount: ->
    @filename = ReactDOM.findDOMNode @refs.filename
    @filename.focus()

  updateFilename: ->
    filename = @filename.value
    @setState
      filename: filename
      trimmedFilename: @trim filename

  trim: (s) ->
    s.replace /^\s+|\s+$/, ''

  rename: (e) ->
    if @state.trimmedFilename.length > 0
      @props.callback? @state.filename
      @props.close()
    else
      e.preventDefault()
      @filename.focus()

  render: ->
    (ModalDialog {title: (tr '~DIALOG.RENAME'), close: @props.close},
      (div {className: 'rename-dialog'},
        (input {ref: 'filename', placeholder: 'Filename', value: @state.filename, onChange: @updateFilename})
        (div {className: 'buttons'},
          (button {className: (if @state.trimmedFilename.length is 0 then 'disabled' else ''), onClick: @rename}, tr '~RENAME_DIALOG.RENAME')
          (button {onClick: @props.close}, tr '~RENAME_DIALOG.CANCEL')
        )
      )
    )
