let Modal = React.createFactory(require('./modal-view'));
let {div, i} = React.DOM;

export default React.createClass({

  displayName: 'BlockingModal',

  close() {
    return __guardMethod__(this.props, 'close', o => o.close());
  },

  // used by CODAP to dismiss the startup dialog if a file is dropped on it
  drop(e) {
    return __guardMethod__(this.props, 'onDrop', o => o.onDrop(e));
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

function __guardMethod__(obj, methodName, transform) {
  if (typeof obj !== 'undefined' && obj !== null && typeof obj[methodName] === 'function') {
    return transform(obj, methodName);
  } else {
    return undefined;
  }
}