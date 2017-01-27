let Modal = React.createFactory(require('./modal-view'));
let {div, i} = React.DOM;

export default React.createClass({

  displayName: 'ModalDialog',

  close() {
    return __guardMethod__(this.props, 'close', o => o.close());
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

function __guardMethod__(obj, methodName, transform) {
  if (typeof obj !== 'undefined' && obj !== null && typeof obj[methodName] === 'function') {
    return transform(obj, methodName);
  } else {
    return undefined;
  }
}