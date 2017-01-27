let ModalTabbedDialog = React.createFactory(require('./modal-tabbed-dialog-view'));
import TabbedPanel from './tabbed-panel-view';
import { CloudMetadata } from '../providers/provider-interface';
let FileDialogTab = React.createFactory(require('./file-dialog-tab-view'));
let SelectProviderDialogTab = React.createFactory(require('./select-provider-dialog-tab-view'));

import tr from '../utils/translate';

export default React.createClass({
  displayName: 'ProviderTabbedDialog',

  render() {
    let [capability, TabComponent] = Array.from((() => { switch (this.props.dialog.action) {
      case 'openFile': return ['list', FileDialogTab];
      case 'saveFile': case 'saveFileAs': return ['save', FileDialogTab];
      case 'saveSecondaryFileAs': return ['export', FileDialogTab];
      case 'createCopy': return ['save', FileDialogTab];
      case 'selectProvider': return [null, SelectProviderDialogTab];
    } })());

    let tabs = [];
    let selectedTabIndex = 0;
    for (let i = 0; i < this.props.client.state.availableProviders.length; i++) {
      let provider = this.props.client.state.availableProviders[i];
      if (!capability || provider.capabilities[capability]) {
        let filteredTabComponent = provider.filterTabComponent(capability, TabComponent);
        if (filteredTabComponent) {
          let component = filteredTabComponent({
            client: this.props.client,
            dialog: this.props.dialog,
            close: this.props.close,
            provider
          });
          let onSelected = provider.onProviderTabSelected ? provider.onProviderTabSelected.bind(provider) : null;
          tabs.push(TabbedPanel.Tab({key: i, label: (tr(provider.displayName)), component, capability, onSelected}));
          if (provider.name === __guard__(__guard__(this.props.client.state.metadata, x1 => x1.provider), x => x.name)) {
            selectedTabIndex = tabs.length - 1;
          }
        }
      }
    }

    return (ModalTabbedDialog({title: (tr(this.props.dialog.title)), close: this.props.close, tabs, selectedTabIndex}));
  }
});

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}