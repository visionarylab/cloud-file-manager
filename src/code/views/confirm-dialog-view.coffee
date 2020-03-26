{createReactClass, createReactFactory} = require '../utils/react'
{div, button} = require 'react-dom-factories'

ModalDialog = createReactFactory require './modal-dialog-view'

tr = require '../utils/translate'

module.exports = createReactClass

  displayName: 'ConfirmDialogView'

  confirm: ->
    @props.callback?()
    @props.close?()

  reject: ->
    @props.rejectCallback?()
    @props.close?()

  render: ->
    (ModalDialog {title: (@props.title or tr '~CONFIRM_DIALOG.TITLE'), close: @reject, zIndex: 500},
      (div {className: 'confirm-dialog'},
        (div {className: 'confirm-dialog-message', dangerouslySetInnerHTML: {__html: @props.message}})
        (div {className: 'buttons'},
          (button {onClick: @confirm}, @props.yesTitle or tr '~CONFIRM_DIALOG.YES')
          ((button {onClick: @reject}, @props.noTitle or tr '~CONFIRM_DIALOG.NO') if not @props.hideNoButton)
        )
      )
    )
