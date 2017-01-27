let {div, input, a, button} = React.DOM;

let ModalDialog = React.createFactory(require('./modal-dialog-view'));

import tr from '../utils/translate';

export default React.createClass({

  displayName: 'RenameDialogView',

  getInitialState() {
    let state;
    let filename = this.props.filename || '';
    return state = {
      filename,
      trimmedFilename: this.trim(filename)
    };
  },

  componentDidMount() {
    this.filename = ReactDOM.findDOMNode(this.refs.filename);
    return this.filename.focus();
  },

  updateFilename() {
    let filename = this.filename.value;
    return this.setState({
      filename,
      trimmedFilename: this.trim(filename)
    });
  },

  trim(s) {
    return s.replace(/^\s+|\s+$/, '');
  },

  rename(e) {
    if (this.state.trimmedFilename.length > 0) {
      __guardMethod__(this.props, 'callback', o => o.callback(this.state.filename));
      return this.props.close();
    } else {
      e.preventDefault();
      return this.filename.focus();
    }
  },

  render() {
    return (ModalDialog({title: (tr('~DIALOG.RENAME')), close: this.props.close},
      (div({className: 'rename-dialog'},
        (input({ref: 'filename', placeholder: 'Filename', value: this.state.filename, onChange: this.updateFilename})),
        (div({className: 'buttons'},
          (button({className: (this.state.trimmedFilename.length === 0 ? 'disabled' : ''), onClick: this.rename}, tr('~RENAME_DIALOG.RENAME'))),
          (button({onClick: this.props.close}, tr('~RENAME_DIALOG.CANCEL')))
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