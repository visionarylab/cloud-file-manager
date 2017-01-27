let {div, input, a, button} = React.DOM;

let ModalDialog = React.createFactory(require('./modal-dialog-view'));
import { CloudMetadata } from '../providers/provider-interface';

import tr from '../utils/translate';

export default React.createClass({

  displayName: 'DownloadDialogView',

  getInitialState() {
    let state;
    let filename = CloudMetadata.withExtension(this.props.filename || (tr("~MENUBAR.UNTITLED_DOCUMENT")), 'json');
    return state = {
      filename,
      trimmedFilename: this.trim(filename),
      includeShareInfo: false,
      shared: this.props.client.isShared()
    };
  },

  componentDidMount() {
    return this.refs.filename.focus();
  },

  updateFilename() {
    let filename = this.refs.filename.value;
    return this.setState({
      filename,
      trimmedFilename: this.trim(filename)
    });
  },

  updateIncludeShareInfo() {
    return this.setState({includeShareInfo: this.refs.includeShareInfo.checked});
  },

  trim(s) {
    return s.replace(/^\s+|\s+$/, '');
  },

  download(e, simulateClick) {
    if (!this.downloadDisabled()) {
      this.refs.download.setAttribute('href', this.props.client.getDownloadUrl(this.props.content, this.state.includeShareInfo));
      if (simulateClick) { this.refs.download.click(); }
      return this.props.close();
    } else {
      __guard__(e, x => x.preventDefault());
      return this.refs.filename.focus();
    }
  },

  downloadDisabled() {
    return this.state.trimmedFilename.length === 0;
  },

  watchForEnter(e) {
    if ((e.keyCode === 13) && !this.downloadDisabled()) {
      e.preventDefault();
      e.stopPropagation();
      return this.download(null, true);
    }
  },

  render() {
    return (ModalDialog({title: (tr('~DIALOG.DOWNLOAD')), close: this.props.close},
      (div({className: 'download-dialog'},
        (input({type: 'text', ref: 'filename', placeholder: 'Filename', value: this.state.filename, onChange: this.updateFilename, onKeyDown: this.watchForEnter})),
        this.state.shared ?
          (div({className: 'download-share'},
            (input({type: 'checkbox', ref: 'includeShareInfo', value: this.state.includeShareInfo, onChange: this.updateIncludeShareInfo})),
            (tr('~DOWNLOAD_DIALOG.INCLUDE_SHARE_INFO'))
          )) : undefined,
        (div({className: 'buttons'},
          (a({href: '#', ref: 'download', className: (this.downloadDisabled() ? 'disabled' : ''), download: this.state.trimmedFilename, onClick: this.download}, tr('~DOWNLOAD_DIALOG.DOWNLOAD'))),
          (button({onClick: this.props.close}, tr('~DOWNLOAD_DIALOG.CANCEL')))
        ))
      ))
    ));
  }
});

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}