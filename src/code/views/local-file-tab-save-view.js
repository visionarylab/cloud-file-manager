// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const {div, input, button, a} = ReactDOMFactories;
const tr = require('../utils/translate');
const { CloudMetadata } = (require('../providers/provider-interface'));
const { cloudContentFactory } = (require('../providers/provider-interface'));
const FileSaver = require('../lib/file-saver');

module.exports = createReactClass({

  displayName: 'LocalFileSaveTab',

  getInitialState() {
    // If the dialog has the content to save, which occurs when saving secondary content
    // like CSV files, then use that instead of the document content and make sure that
    // it doesn't get modified by (for instance) trying to remove sharing metadata. To
    // do so, we specify that we want to include the share info, which tells the client
    // to leave the content alone.
    let state;
    const hasPropsContent = ((this.props.dialog.data != null ? this.props.dialog.data.content : undefined) != null);
    const filename = (this.props.client.state.metadata != null ? this.props.client.state.metadata.name : undefined) || (tr("~MENUBAR.UNTITLED_DOCUMENT"));
    const extension = hasPropsContent && this.props.dialog.data.extension 
                  ? this.props.dialog.data.extension : 'json';
    return state = {
      filename,
      supportsDownloadAttribute: document.createElement('a').download !== undefined,
      downloadFilename: this.getDownloadFilename(hasPropsContent, filename, extension),
      extension,
      mimeType: hasPropsContent && (this.props.dialog.data.mimeType != null) 
                  ? this.props.dialog.data.mimeType : 'text/plain',
      shared: this.props.client.isShared(),
      hasPropsContent,
      includeShareInfo: hasPropsContent,
      gotContent: hasPropsContent,
      content: (this.props.dialog.data != null ? this.props.dialog.data.content : undefined)
    };
  },

  componentDidMount() {
    if (!this.state.hasPropsContent) {
      this.props.client._event('getContent', { shared: this.props.client._sharedMetadata() }, content => {
        const envelopedContent = cloudContentFactory.createEnvelopedCloudContent(content);
        __guard__(this.props.client.state != null ? this.props.client.state.currentContent : undefined, x => x.copyMetadataTo(envelopedContent));
        return this.setState({
          gotContent: true,
          content: envelopedContent
        });
      });
    }

    // Using the React onClick handler for the download button yielded odd behaviors
    // in which the onClick handler got triggered multiple times and the default
    // handler could not be prevented, presumably due to React's SyntheticEvent system.
    // The solution here is to use standard browser event handlers.
    return this.downloadRef.addEventListener('click', this.confirm);
  },

  componentWillUnmount() {
    return this.downloadRef.removeEventListener('click', this.confirm);
  },

  filenameChanged() {
    const filename = this.filenameRef.value;
    return this.setState({
      filename,
      downloadFilename: this.getDownloadFilename(this.state.hasPropsContent, filename, this.state.extension)
    });
  },

  includeShareInfoChanged() {
    return this.setState({includeShareInfo: this.includeShareInfoRef.checked});
  },

  getDownloadFilename(hasPropsContent, filename, extension) {
    const newName = filename.replace(/^\s+|\s+$/, '');
    if (hasPropsContent) { 
      return CloudMetadata.newExtension(newName, extension); 
      } else { return CloudMetadata.withExtension(newName, extension); }
  },

  confirm(e, simulateClick) {
    if (!this.confirmDisabled()) {
      if (this.state.supportsDownloadAttribute) {
        this.downloadRef.href = this.props.client.getDownloadUrl(this.state.content, this.state.includeShareInfo, this.state.mimeType);
        if (simulateClick) { this.downloadRef.click(); }
      } else {
        const blob = this.props.client.getDownloadBlob(this.state.content, this.state.includeShareInfo, this.state.mimeType);
        FileSaver.saveAs(blob, this.state.downloadFilename, true);
        if (e != null) {
          e.preventDefault();
        }
      }

      const metadata = new CloudMetadata({
        name: this.state.downloadFilename.split('.')[0],
        type: CloudMetadata.File,
        parent: null,
        provider: this.props.provider
      });
      this.props.dialog.callback(metadata);
      this.props.close();

      // return value indicates whether to trigger href
      return this.state.supportsDownloadAttribute;
    } else {
      if (e != null) {
        e.preventDefault();
      }
    }
  },

  contextMenu(e) {
    this.downloadRef.href = this.props.client.getDownloadUrl(this.state.content, this.state.includeShareInfo, this.state.mimeType);
  },

  cancel() {
    this.props.close();
  },

  watchForEnter(e) {
    if ((e.keyCode === 13) && !this.confirmDisabled()) {
      e.preventDefault();
      e.stopPropagation();
      this.confirm(null, true);
    }
  },

  confirmDisabled() {
    return (this.state.downloadFilename.length === 0) || !this.state.gotContent;
  },

  render() {
    const confirmDisabled = this.confirmDisabled();

    // for modern browsers
    const downloadAnchor = (a({
      href: '#',
      ref: elt => { return this.downloadRef = elt; },
      className: (confirmDisabled ? 'disabled' : ''),
      download: this.state.downloadFilename,
      onContextMenu: this.contextMenu
    }, tr('~FILE_DIALOG.DOWNLOAD')));

    // for Safari (or other non-modern browsers)
    const downloadButton = (button({
      ref: elt => { return this.downloadRef = elt; },
      className: (confirmDisabled ? 'disabled' : '')
    }, tr('~FILE_DIALOG.DOWNLOAD')));

    return (div({className: 'dialogTab localFileSave'},
      (input({type: 'text', ref: (elt => { return this.filenameRef = elt; }), value: this.state.filename, placeholder: (tr("~FILE_DIALOG.FILENAME")), onChange: this.filenameChanged, onKeyDown: this.watchForEnter})),
      (div({className: 'saveArea'},
        this.state.shared && !this.state.hasPropsContent ?
          (div({className: 'shareCheckbox'},
            (input({type: 'checkbox', ref: (elt => { return this.includeShareInfoRef = elt; }), value: this.state.includeShareInfo, onChange: this.includeShareInfoChanged})),
            (tr('~DOWNLOAD_DIALOG.INCLUDE_SHARE_INFO'))
          )) : undefined
      )),
      (div({className: 'buttons'},
        this.state.supportsDownloadAttribute ? downloadAnchor : downloadButton,
        (button({onClick: this.cancel}, (tr("~FILE_DIALOG.CANCEL"))))
      ))
    ));
  }
});
function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}