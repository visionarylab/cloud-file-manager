/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const {div, input, a, button} = ReactDOMFactories;

const ModalDialog = createReactFactory(require('./modal-dialog-view'));
const { CloudMetadata } = (require('../providers/provider-interface'));

const tr = require('../utils/translate');

module.exports = createReactClass({

  displayName: 'DownloadDialogView',

  getInitialState() {
    let state;
    const filename = CloudMetadata.withExtension(this.props.filename || (tr("~MENUBAR.UNTITLED_DOCUMENT")), 'json');
    return state = {
      filename,
      trimmedFilename: this.trim(filename),
      includeShareInfo: false,
      shared: this.props.client.isShared()
    };
  },

  componentDidMount() {
    return this.filenameRef.focus();
  },

  updateFilename() {
    const filename = this.filenameRef.value;
    return this.setState({
      filename,
      trimmedFilename: this.trim(filename)
    });
  },

  updateIncludeShareInfo() {
    return this.setState({includeShareInfo: this.includeShareInfoRef.checked});
  },

  trim(s) {
    return s.replace(/^\s+|\s+$/, '');
  },

  download(e, simulateClick) {
    if (!this.downloadDisabled()) {
      this.downloadRef.setAttribute('href', this.props.client.getDownloadUrl(this.props.content, this.state.includeShareInfo));
      if (simulateClick) { this.downloadRef.click(); }
      return this.props.close();
    } else {
      if (e != null) {
        e.preventDefault();
      }
      return this.filenameRef.focus();
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
        (input({type: 'text', ref: (elt => { return this.filenameRef = elt; }), placeholder: 'Filename', value: this.state.filename, onChange: this.updateFilename, onKeyDown: this.watchForEnter})),
        this.state.shared ?
          (div({className: 'download-share'},
            (input({type: 'checkbox', ref: (elt => { return this.includeShareInfoRef = elt; }), value: this.state.includeShareInfo, onChange: this.updateIncludeShareInfo})),
            (tr('~DOWNLOAD_DIALOG.INCLUDE_SHARE_INFO'))
          )) : undefined,
        (div({className: 'buttons'},
          (a({href: '#', ref: (elt => { return this.downloadRef = elt; }), className: (this.downloadDisabled() ? 'disabled' : ''), download: this.state.trimmedFilename, onClick: this.download}, tr('~DOWNLOAD_DIALOG.DOWNLOAD'))),
          (button({onClick: this.props.close}, tr('~DOWNLOAD_DIALOG.CANCEL')))
        ))
      ))
    ));
  }
});
