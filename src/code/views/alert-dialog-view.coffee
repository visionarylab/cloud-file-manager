{div, button} = React.DOM

ModalDialog = React.createFactory require './modal-dialog-view'

tr = require '../utils/translate'

module.exports = React.createClass

  displayName: 'AlertDialogView'

  close: ->
    @props.close?()
    @props.callback?()

  render: ->
    (ModalDialog {title: @props.title or (tr '~ALERT_DIALOG.TITLE'), close: @close, zIndex: 500},
      (div {className: 'alert-dialog'},
        (div {className: 'alert-dialog-message'}, @props.message)
        (div {className: 'buttons'},
          (button {onClick: @close}, tr '~ALERT_DIALOG.CLOSE')
        )
      )
    )
