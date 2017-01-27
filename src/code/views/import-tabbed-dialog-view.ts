let ModalTabbedDialog = React.createFactory(require('./modal-tabbed-dialog-view'));
import TabbedPanel from './tabbed-panel-view';
let LocalFileTab = React.createFactory(require('./local-file-tab-list-view'));
let UrlTab = React.createFactory(require('./url-tab-view'));

import tr from '../utils/translate';

let LocalFileImportTab = React.createFactory(React.createClass);

export default React.createClass({
  displayName: 'ImportTabbedDialog',

  importFile(metadata, via) {
    switch (metadata.provider) {
      case 'localFile':
        let reader = new FileReader();
        reader.onload = loaded => {
          let data = {
            file: {
              name: metadata.providerData.file.name,
              content: loaded.target.result,
              object: metadata.providerData.file
            },
            via
          };
          return __guardMethod__(this.props.dialog, 'callback', o => o.callback(data));
        };
        return reader.readAsText(metadata.providerData.file);
    }
  },

  importUrl(url, via) {
    return __guardMethod__(this.props.dialog, 'callback', o => o.callback({url, via}));
  },

  render() {
    let tabs = [
      TabbedPanel.Tab({
        key: 0,
        label: (tr("~IMPORT.LOCAL_FILE")),
        component: LocalFileTab({
          client: this.props.client,
          dialog: {
            callback: this.importFile
          },
          provider: 'localFile', // we are faking the provider here so we can reuse the local file tab
          close: this.props.close
        })
      }),
      TabbedPanel.Tab({
        key: 1,
        label: (tr("~IMPORT.URL")),
        component: UrlTab({
          client: this.props.client,
          dialog: {
            callback: this.importUrl
          },
          close: this.props.close
        })
      })
    ];
    return (ModalTabbedDialog({title: (tr("~DIALOG.IMPORT_DATA")), close: this.props.close, tabs, selectedTabIndex: 0}));
  }
});

function __guardMethod__(obj, methodName, transform) {
  if (typeof obj !== 'undefined' && obj !== null && typeof obj[methodName] === 'function') {
    return transform(obj, methodName);
  } else {
    return undefined;
  }
}