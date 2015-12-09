Modal = React.createFactory require './modal-view'
{div, i} = React.DOM

module.exports = React.createClass

  displayName: 'BlockingModal'

  close: ->
    @props.close?()

  render: ->
    (Modal {close: @props.close},
      (div {className: 'modal-dialog'},
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
