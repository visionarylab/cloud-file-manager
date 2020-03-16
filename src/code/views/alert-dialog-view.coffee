{createReactClass, createReactFactory} = require '../utils/react'
{div, button} = require 'react-dom-factories'

ModalDialog = createReactFactory require './modal-dialog-view'

tr = require '../utils/translate'

module.exports = createReactClass

  displayName: 'AlertDialogView'

  close: ->
    @props.close?()
    @props.callback?()

  render: ->
    (ModalDialog {title: @props.title or (tr '~ALERT_DIALOG.TITLE'), close: @close, zIndex: 500},
      (div {className: 'alert-dialog'},
        (div {className: 'alert-dialog-message', dangerouslySetInnerHTML: {__html: @props.message}})
        (div {className: 'buttons'},
          (button {onClick: @close}, tr '~ALERT_DIALOG.CLOSE')
        )
      )
    )
