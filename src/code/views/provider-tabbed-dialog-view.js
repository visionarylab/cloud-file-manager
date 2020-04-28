// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import tr  from '../utils/translate'
import TabbedPanel  from './tabbed-panel-view'
import modalTabbedDialogView from './modal-tabbed-dialog-view'
import fileDialogTabView from './file-dialog-tab-view'
import selectProviderDialogTabView from './select-provider-dialog-tab-view'

const ModalTabbedDialog = createReactFactory(modalTabbedDialogView)
const FileDialogTab = createReactFactory(fileDialogTabView)
const SelectProviderDialogTab = createReactFactory(selectProviderDialogTabView)


export default createReactClass({
  displayName: 'ProviderTabbedDialog',

  render() {
    const [capability, TabComponent] = Array.from((() => { switch (this.props.dialog.action) {
      case 'openFile': return ['list', FileDialogTab]
      case 'saveFile': case 'saveFileAs': return ['save', FileDialogTab]
      case 'saveSecondaryFileAs': return ['export', FileDialogTab]
      case 'createCopy': return ['save', FileDialogTab]
      case 'selectProvider': return [null, SelectProviderDialogTab]
    } })())

    const tabs = []
    let selectedTabIndex = 0
    for (let i = 0; i < this.props.client.state.availableProviders.length; i++) {
      const provider = this.props.client.state.availableProviders[i]
      if (!capability || provider.capabilities[capability]) {
        const filteredTabComponent = provider.filterTabComponent(capability, TabComponent)
        if (filteredTabComponent) {
          const component = filteredTabComponent({
            client: this.props.client,
            dialog: this.props.dialog,
            close: this.props.close,
            provider
          })
          const onSelected = provider.onProviderTabSelected ? provider.onProviderTabSelected.bind(provider) : null
          tabs.push(TabbedPanel.Tab({key: i, label: (tr(provider.displayName)), component, capability, onSelected}))
          if (provider.name === __guard__(this.props.client.state.metadata != null ? this.props.client.state.metadata.provider : undefined, x => x.name)) {
            selectedTabIndex = tabs.length - 1
          }
        }
      }
    }

    return (ModalTabbedDialog({title: (tr(this.props.dialog.title)), close: this.props.close, tabs, selectedTabIndex}))
  }
})

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined
}