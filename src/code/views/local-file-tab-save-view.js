let {div, input, button, a} = React.DOM;
import tr from '../utils/translate';
import { CloudMetadata } from '../providers/provider-interface';
import { cloudContentFactory } from '../providers/provider-interface';
import FileSaver from '../lib/file-saver';

export default React.createClass({

  displayName: 'LocalFileSaveTab',

  getInitialState() {
    // If the dialog has the content to save, which occurs when saving secondary content
    // like CSV files, then use that instead of the document content and make sure that
    // it doesn't get modified by (for instance) trying to remove sharing metadata. To
    // do so, we specify that we want to include the share info, which tells the client
    // to leave the content alone.
    let state;
    let hasPropsContent = (__guard__(this.props.dialog.data, x => x.content) != null);
    let filename = __guard__(this.props.client.state.metadata, x1 => x1.name) || (tr("~MENUBAR.UNTITLED_DOCUMENT"));
    let extension = hasPropsContent && this.props.dialog.data.extension 
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
      content: __guard__(this.props.dialog.data, x2 => x2.content)
    };
  },

  componentDidMount() {
    if (!this.state.hasPropsContent) {
      this.props.client._event('getContent', { shared: this.props.client._sharedMetadata() }, content => {
        let envelopedContent = cloudContentFactory.createEnvelopedCloudContent(content);
        __guard__(__guard__(this.props.client.state, x1 => x1.currentContent), x => x.copyMetadataTo(envelopedContent));
        return this.setState({
          gotContent: true,
          content: envelopedContent
        });
      }
      );
    }

    // Using the React onClick handler for the download button yielded odd behaviors
    // in which the onClick handler got triggered multiple times and the default
    // handler could not be prevented, presumably due to React's SyntheticEvent system.
    // The solution here is to use standard browser event handlers.
    return this.refs.download.addEventListener('click', this.confirm);
  },

  componentWillUnmount() {
    return this.refs.download.removeEventListener('click', this.confirm);
  },

  filenameChanged() {
    let filename = this.refs.filename.value;
    return this.setState({
      filename,
      downloadFilename: this.getDownloadFilename(this.state.hasPropsContent, filename, this.state.extension)
    });
  },

  includeShareInfoChanged() {
    return this.setState({includeShareInfo: this.refs.includeShareInfo.checked});
  },

  getDownloadFilename(hasPropsContent, filename, extension) {
    let newName = filename.replace(/^\s+|\s+$/, '');
    if (hasPropsContent) { 
      return CloudMetadata.newExtension(newName, extension); 
      } else { return CloudMetadata.withExtension(newName, extension); }
  },

  confirm(e, simulateClick) {
    if (!this.confirmDisabled()) {
      if (this.state.supportsDownloadAttribute) {
        this.refs.download.href = this.props.client.getDownloadUrl(this.state.content, this.state.includeShareInfo, this.state.mimeType);
        if (simulateClick) { this.refs.download.click(); }
      } else {
        let blob = this.props.client.getDownloadBlob(this.state.content, this.state.includeShareInfo, this.state.mimeType);
        FileSaver.saveAs(blob, this.state.downloadFilename, true);
        __guard__(e, x => x.preventDefault());
      }

      let metadata = new CloudMetadata({
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
      __guard__(e, x1 => x1.preventDefault());
    }
  },

  contextMenu(e) {
    this.refs.download.href = this.props.client.getDownloadUrl(this.state.content, this.state.includeShareInfo, this.state.mimeType);
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
    let confirmDisabled = this.confirmDisabled();

    // for modern browsers
    let downloadAnchor = (a({
      href: '#',
      ref: 'download',
      className: (confirmDisabled ? 'disabled' : ''),
      download: this.state.downloadFilename,
      onContextMenu: this.contextMenu
    }, tr('~FILE_DIALOG.DOWNLOAD')));

    // for Safari (or other non-modern browsers)
    let downloadButton = (button({
      ref: 'download',
      className: (confirmDisabled ? 'disabled' : '')
    }, tr('~FILE_DIALOG.DOWNLOAD')));

    return (div({className: 'dialogTab localFileSave'},
      (input({type: 'text', ref: 'filename', value: this.state.filename, placeholder: (tr("~FILE_DIALOG.FILENAME")), onChange: this.filenameChanged, onKeyDown: this.watchForEnter})),
      (div({className: 'saveArea'},
        this.state.shared && !this.state.hasPropsContent ?
          (div({className: 'shareCheckbox'},
            (input({type: 'checkbox', ref: 'includeShareInfo', value: this.state.includeShareInfo, onChange: this.includeShareInfoChanged})),
            (tr('~DOWNLOAD_DIALOG.INCLUDE_SHARE_INFO'))
          )) : undefined
      )),
      div({className: 'note'}, tr('~FILE_DIALOG.DOWNLOAD_NOTE', {download: tr('~FILE_DIALOG.DOWNLOAD')})),
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