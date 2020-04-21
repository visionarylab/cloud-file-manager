/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const {div, i} = ReactDOMFactories;

const Modal = createReactFactory(require('./modal-view'));

module.exports = createReactClass({

  displayName: 'ModalDialog',

  close() {
    return (typeof this.props.close === 'function' ? this.props.close() : undefined);
  },

  render() {
    return (Modal({close: this.close, zIndex: this.props.zIndex},
      (div({className: 'modal-dialog'},
        (div({className: 'modal-dialog-wrapper'},
          (div({className: 'modal-dialog-title'},
            (i({className: "modal-dialog-title-close icon-ex", onClick: this.close})),
            this.props.title || 'Untitled Dialog'
          )),
          (div({className: 'modal-dialog-workspace'}, this.props.children))
        ))
      ))
    ));
  }
});
