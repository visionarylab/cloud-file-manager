// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const {div, button} = ReactDOMFactories

const ModalDialog = createReactFactory(require('./modal-dialog-view'))

const tr = require('../utils/translate')

module.exports = createReactClass({

  displayName: 'AlertDialogView',

  close() {
    if (typeof this.props.close === 'function') {
      this.props.close()
    }
    return (typeof this.props.callback === 'function' ? this.props.callback() : undefined)
  },

  render() {
    return (ModalDialog({title: this.props.title || (tr('~ALERT_DIALOG.TITLE')), close: this.close, zIndex: 500},
      (div({className: 'alert-dialog'},
        (div({className: 'alert-dialog-message', dangerouslySetInnerHTML: {__html: this.props.message}})),
        (div({className: 'buttons'},
          (button({onClick: this.close}, tr('~ALERT_DIALOG.CLOSE')))
        ))
      ))
    ))
  }
})
