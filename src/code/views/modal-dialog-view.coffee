{createReactClass, createReactFactory} = require '../utils/react'
{div, i} = require 'react-dom-factories'

Modal = createReactFactory require './modal-view'

module.exports = createReactClass

  displayName: 'ModalDialog'

  close: ->
    @props.close?()

  render: ->
    (Modal {close: @close, zIndex: @props.zIndex},
      (div {className: 'modal-dialog'},
        (div {className: 'modal-dialog-wrapper'},
          (div {className: 'modal-dialog-title'},
            (i {className: "modal-dialog-title-close icon-ex", onClick: @close})
            @props.title or 'Untitled Dialog'
          )
          (div {className: 'modal-dialog-workspace'}, @props.children)
        )
      )
    )
