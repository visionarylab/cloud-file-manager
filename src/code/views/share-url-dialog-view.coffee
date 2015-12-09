{div, input, a, button} = React.DOM

ModalDialog = React.createFactory require './modal-dialog-view'

tr = require '../utils/translate'

module.exports = React.createClass

  displayName: 'ShareUrlDialogView'

  componentDidMount: ->
    React.findDOMNode(@refs.url)?.select()

  view: ->
    window.open @props.url

  # adapted from https://github.com/sudodoki/copy-to-clipboard/blob/master/index.js
  copy: ->
    copied = true
    try
      mark = document.createElement 'mark'
      mark.innerHTML = @props.url
      document.body.appendChild mark

      selection = document.getSelection()
      selection.removeAllRanges()

      range = document.createRange()
      range.selectNode mark
      selection.addRange range

      copied = document.execCommand 'copy'
    catch
      try
        window.clipboardData.setData 'text', @props.url
      catch
        copied = false
    finally
      if selection
        if typeof selection.removeRange is 'function'
          selection.removeRange range
        else
          selection.removeAllRanges()
      if mark
        document.body.removeChild mark
      alert tr (if copied then "~SHARE_DIALOG.COPY_SUCCESS" else "~SHARE_DIALOG.COPY_ERROR")

  render: ->
    (ModalDialog {title: (tr '~DIALOG.SHARED'), close: @props.close},
      (div {className: 'share-dialog'},
        (input {ref: 'url', value: @props.url, readOnly: true})
        (div {className: 'buttons'},
          if document.execCommand or window.clipboardData
            (button {onClick: @copy}, tr '~SHARE_DIALOG.COPY')
          (button {onClick: @view}, tr '~SHARE_DIALOG.VIEW')
          (button {onClick: @props.close}, tr '~SHARE_DIALOG.CLOSE')
        )
      )
    )
