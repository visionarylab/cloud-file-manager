{div} = ReactDOMFactories

Modal = createReactFactory require './modal-view'

module.exports = createReactClass

  displayName: 'BlockingModal'

  close: ->
    @props.close?()

  # used by CODAP to dismiss the startup dialog if a file is dropped on it
  drop: (e) ->
    @props.onDrop? e

  render: ->
    (Modal {close: @props.close},
      (div {className: 'modal-dialog', onDrop: @drop},
        (div {className: 'modal-dialog-wrapper'},
          (div {className: 'modal-dialog-title'},
            @props.title or 'Untitled Dialog'
          )
          (div {className: 'modal-dialog-workspace'},
            (div {className: 'modal-dialog-blocking-message'}, @props.message)
          )
        )
      )
    )
