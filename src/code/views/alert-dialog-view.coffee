{div, button} = React.DOM

ModalDialog = React.createFactory require './modal-dialog-view'

tr = require '../utils/translate'

module.exports = React.createClass

  displayName: 'AlertDialogView'

  render: ->
    (ModalDialog {title: @props.title or (tr '~ALERT_DIALOG.TITLE'), close: @props.close, zIndex: 100},
      (div {className: 'alert-dialog'},
        (div {className: 'alert-dialog-message'}, @props.message)
        (div {className: 'buttons'},
          (button {onClick: @props.close}, tr '~ALERT_DIALOG.CLOSE')
        )
      )
    )
