let {div, button} = React.DOM;

let ModalDialog = React.createFactory(require('./modal-dialog-view'));

import tr from '../utils/translate';

export default React.createClass({

  displayName: 'AlertDialogView',

  close() {
    __guardMethod__(this.props, 'close', o => o.close());
    return __guardMethod__(this.props, 'callback', o1 => o1.callback());
  },

  render() {
    return (ModalDialog({title: this.props.title || (tr('~ALERT_DIALOG.TITLE')), close: this.close, zIndex: 500},
      (div({className: 'alert-dialog'},
        (div({className: 'alert-dialog-message', dangerouslySetInnerHTML: {__html: this.props.message}})),
        (div({className: 'buttons'},
          (button({onClick: this.close}, tr('~ALERT_DIALOG.CLOSE')))
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