let {div, button} = React.DOM;

let ModalDialog = React.createFactory(require('./modal-dialog-view'));

import tr from '../utils/translate';

export default React.createClass({

  displayName: 'ConfirmDialogView',

  confirm() {
    __guardMethod__(this.props, 'callback', o => o.callback());
    return __guardMethod__(this.props, 'close', o1 => o1.close());
  },

  reject() {
    __guardMethod__(this.props, 'rejectCallback', o => o.rejectCallback());
    return __guardMethod__(this.props, 'close', o1 => o1.close());
  },

  render() {
    return (ModalDialog({title: (this.props.title || tr('~CONFIRM_DIALOG.TITLE')), close: this.reject, zIndex: 500},
      (div({className: 'confirm-dialog'},
        (div({className: 'confirm-dialog-message', dangerouslySetInnerHTML: {__html: this.props.message}})),
        (div({className: 'buttons'},
          (button({onClick: this.confirm}, this.props.yesTitle || tr('~CONFIRM_DIALOG.YES'))),
          (!this.props.hideNoButton ? (button({onClick: this.reject}, this.props.noTitle || tr('~CONFIRM_DIALOG.NO'))) : undefined)
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