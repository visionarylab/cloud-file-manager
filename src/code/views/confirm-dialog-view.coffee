{div, button} = React.DOM

ModalDialog = React.createFactory require './modal-dialog-view'

tr = require '../utils/translate'

module.exports = React.createClass

  displayName: 'ConfirmDialogView'

  confirm: ->
    @props.callback?()
    @props.close()

  render: ->
    (ModalDialog {title: tr '~CONFIRM_DIALOG.TITLE', close: @props.close, zIndex: 100},
      (div {className: 'confirm-dialog'},
        (div {className: 'confirm-dialog-message'}, @props.message)
        (div {className: 'buttons'},
          (button {onClick: @confirm}, tr '~CONFIRM_DIALOG.YES')
          (button {onClick: @props.close}, tr '~CONFIRM_DIALOG.NO')
        )
      )
    )
