// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const {div} = ReactDOMFactories;

const Modal = createReactFactory(require('./modal-view'));

module.exports = createReactClass({

  displayName: 'BlockingModal',

  close() {
    return (typeof this.props.close === 'function' ? this.props.close() : undefined);
  },

  // used by CODAP to dismiss the startup dialog if a file is dropped on it
  drop(e) {
    return (typeof this.props.onDrop === 'function' ? this.props.onDrop(e) : undefined);
  },

  render() {
    return (Modal({close: this.props.close},
      (div({className: 'modal-dialog', onDrop: this.drop},
        (div({className: 'modal-dialog-wrapper'},
          (div({className: 'modal-dialog-title'},
            this.props.title || 'Untitled Dialog'
          )),
          (div({className: 'modal-dialog-workspace'},
            (div({className: 'modal-dialog-blocking-message'}, this.props.message))
          ))
        ))
      ))
    ));
  }
});
