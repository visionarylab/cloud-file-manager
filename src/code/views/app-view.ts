let MenuBar = React.createFactory(require('./menu-bar-view'));
let ProviderTabbedDialog = React.createFactory(require('./provider-tabbed-dialog-view'));
let DownloadDialog = React.createFactory(require('./download-dialog-view'));
let RenameDialog = React.createFactory(require('./rename-dialog-view'));
let ShareDialog = React.createFactory(require('./share-dialog-view'));
let BlockingModal = React.createFactory(require('./blocking-modal-view'));
let AlertDialog = React.createFactory(require('./alert-dialog-view'));
let ConfirmDialog = React.createFactory(require('./confirm-dialog-view'));
let ImportTabbedDialog = React.createFactory(require('./import-tabbed-dialog-view'));

import tr from '../utils/translate';
import isString from '../utils/is-string';

let {div, iframe} = React.DOM;

let InnerApp = React.createFactory(React.createClass({

  displayName: 'CloudFileManagerInnerApp',

  shouldComponentUpdate(nextProps) {
    return nextProps.app !== this.props.app;
  },

  render() {
    return (div({className: 'innerApp'},
      (iframe({src: this.props.app}))
    ));
  }
})
);

let App = React.createClass({

  displayName: 'CloudFileManager',

  getFilename(metadata) {
    if (__guard__(metadata, x => x.hasOwnProperty("name")) && (__guard__(metadata.name, x1 => x1.length) > 0)) { return metadata.name; } else { return null; }
  },

  getInitialState() {
    return {
      filename: this.getFilename(this.props.client.state.metadata),
      provider: __guard__(this.props.client.state.metadata, x => x.provider),
      menuItems: __guard__(this.props.client._ui.menu, x1 => x1.items) || [],
      menuOptions: __guard__(this.props.ui, x2 => x2.menuBar) || {},
      providerDialog: null,
      downloadDialog: null,
      renameDialog: null,
      shareDialog: null,
      alertDialog: null,
      confirmDialog: null,
      dirty: false
    };
  },

  componentWillMount() {
    this.props.client.listen(event => {
      let message, providerName;
      let fileStatus = event.state.saving ?
        {message: tr('~FILE_STATUS.SAVING'), type: 'info'}
      : event.state.saved ?
        (providerName = __guard__(event.state.metadata.provider, x => x.displayName),
        message = providerName 
                    ? tr('~FILE_STATUS.SAVED_TO_PROVIDER', { providerName }) 
                    : tr('~FILE_STATUS.SAVED'),
        {message, type: 'info'})
      : event.state.dirty ?
        {message: tr('~FILE_STATUS.UNSAVED'), type: 'alert'}
      :
        null;
      this.setState({
        filename: this.getFilename(event.state.metadata),
        provider: __guard__(event.state.metadata, x1 => x1.provider),
        fileStatus
      });

      switch (event.type) {
        case 'connected':
          return this.setState({menuItems: __guard__(this.props.client._ui.menu, x2 => x2.items) || []});
      }
    });

    return this.props.client._ui.listen(event => {
      switch (event.type) {
        case 'showProviderDialog':
          return this.setState({providerDialog: event.data});
        case 'showDownloadDialog':
          return this.setState({downloadDialog: event.data});
        case 'showRenameDialog':
          return this.setState({renameDialog: event.data});
        case 'showImportDialog':
          return this.setState({importDialog: event.data});
        case 'showShareDialog':
          return this.setState({shareDialog: event.data});
        case 'showBlockingModal':
          return this.setState({blockingModalProps: event.data});
        case 'hideBlockingModal':
          return this.setState({blockingModalProps: null});
        case 'showAlertDialog':
          return this.setState({alertDialog: event.data});
        case 'showConfirmDialog':
          return this.setState({confirmDialog: event.data});
        case 'appendMenuItem':
          this.state.menuItems.push(event.data);
          return this.setState({menuItems: this.state.menuItems});
        case 'prependMenuItem':
          this.state.menuItems.unshift(event.data);
          return this.setState({menuItems: this.state.menuItems});
        case 'replaceMenuItem':
          let index = this._getMenuItemIndex(event.data.key);
          if (index !== -1) {
            this.state.menuItems[index] = event.data.item;
            return this.setState({menuItems: this.state.menuItems});
          }
          break;
        case 'insertMenuItemBefore':
          index = this._getMenuItemIndex(event.data.key);
          if (index !== -1) {
            if (index === 0) {
              this.state.menuItems.unshift(event.data.item);
            } else {
              this.state.menuItems.splice(index, 0, event.data.item);
            }
            return this.setState({menuItems: this.state.menuItems});
          }
          break;
        case 'insertMenuItemAfter':
          index = this._getMenuItemIndex(event.data.key);
          if (index !== -1) {
            if (index === (this.state.menuItems.length - 1)) {
              this.state.menuItems.push(event.data.item);
            } else {
              this.state.menuItems.splice(index + 1, 0, event.data.item);
            }
            return this.setState({menuItems: this.state.menuItems});
          }
          break;
        case 'setMenuBarInfo':
          this.state.menuOptions.info = event.data;
          return this.setState({menuOptions: this.state.menuOptions});
      }
    }
    );
  },

  _getMenuItemIndex(key) {
    let index;
    if (isString(key)) {
      for (index = 0; index < this.state.menuItems.length; index++) {
        let item = this.state.menuItems[index];
        if (item.key === key) { return index; }
      }
      return -1;
    } else {
      index = parseInt(key, 10);
      if (isNaN(index) || (index < 0) || (index > (this.state.menuItems.length - 1))) {
        return -1;
      } else {
        return index;
      }
    }
  },

  closeDialogs() {
    return this.setState({
      providerDialog: null,
      downloadDialog: null,
      renameDialog: null,
      shareDialog: null,
      importDialog: null
    });
  },

  closeAlert() {
    return this.setState({alertDialog: null});
  },

  closeConfirm() {
    return this.setState({confirmDialog: null});
  },

  renderDialogs() {
    return (div({},
      (() => {
      if (this.state.blockingModalProps) {
        return (BlockingModal(this.state.blockingModalProps));
      } else if (this.state.providerDialog) {
        return (ProviderTabbedDialog({client: this.props.client, dialog: this.state.providerDialog, close: this.closeDialogs}));
      } else if (this.state.downloadDialog) {
        return (DownloadDialog({client: this.props.client, filename: this.state.downloadDialog.filename, mimeType: this.state.downloadDialog.mimeType, content: this.state.downloadDialog.content, close: this.closeDialogs}));
      } else if (this.state.renameDialog) {
        return (RenameDialog({filename: this.state.renameDialog.filename, callback: this.state.renameDialog.callback, close: this.closeDialogs}));
      } else if (this.state.importDialog) {
        return (ImportTabbedDialog({client: this.props.client, dialog: this.state.importDialog, close: this.closeDialogs}));
      } else if (this.state.shareDialog) {
        return (ShareDialog({client: this.props.client, enableLaraSharing: this.props.enableLaraSharing, close: this.closeDialogs}));
      }
    })(),

      // alert and confirm dialogs can be overlayed on other dialogs
      this.state.alertDialog ?
        (AlertDialog({title: this.state.alertDialog.title, message: this.state.alertDialog.message, callback: this.state.alertDialog.callback, close: this.closeAlert})) : undefined,
      this.state.confirmDialog ?
        (ConfirmDialog(_.merge({}, this.state.confirmDialog, { close: this.closeConfirm }))) : undefined
    ));
  },

  render() {
    let menuItems = !this.props.hideMenuBar ? this.state.menuItems : [];
    if (this.props.appOrMenuElemId) {
      // CSS class depends on whether we're in app (iframe) or view (menubar-only) mode
      return (div({className: this.props.usingIframe ? 'app' : 'view' },
        (MenuBar({client: this.props.client, filename: this.state.filename, provider: this.state.provider, fileStatus: this.state.fileStatus, items: menuItems, options: this.state.menuOptions})),
        // only render the wrapped client app in app (iframe) mode
        this.props.usingIframe ?
          (InnerApp({app: this.props.app})) : undefined,
        this.renderDialogs()
      ));
    } else if (this.state.providerDialog || this.state.downloadDialog) {
      return (div({className: 'app'},
        this.renderDialogs()
      ));
    } else {
      return null;
    }
  }
});

export default App;

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}