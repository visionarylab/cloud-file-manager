{div, input, a, button} = React.DOM

ModalDialog = React.createFactory require './modal-dialog-view'

tr = require '../utils/translate'

module.exports = React.createClass

  displayName: 'ShareUrlDialogView'

  componentDidMount: ->
    React.findDOMNode(@refs.url)?.select()

  render: ->
    (ModalDialog {title: (tr '~DIALOG.SHARED'), close: @props.close},
      (div {className: 'share-dialog'},
        (input {ref: 'url', value: @props.url})
        (div {className: 'buttons'},
          (button {onClick: @props.close}, tr '~SHARE_DIALOG.CLOSE')
        )
      )
    )
