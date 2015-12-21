ModalTabbedDialog = React.createFactory require './modal-tabbed-dialog-view'
TabbedPanel = require './tabbed-panel-view'
CloudMetadata = (require '../providers/provider-interface').CloudMetadata
FileDialogTab = React.createFactory require './file-dialog-tab-view'
SelectProviderDialogTab = React.createFactory require './select-provider-dialog-tab-view'

tr = require '../utils/translate'

module.exports = React.createClass
  displayName: 'ProviderTabbedDialog'

  render:  ->
    [capability, TabComponent] = switch @props.dialog.action
      when 'openFile' then ['list', FileDialogTab]
      when 'saveFile', 'saveFileAs' then ['save', FileDialogTab]
      when 'saveFileCopy', 'saveFileCopy' then ['save', FileDialogTab]
      when 'saveFileAs', 'saveFileAs' then ['save', FileDialogTab]
      when 'selectProvider' then [null, SelectProviderDialogTab]

    tabs = []
    selectedTabIndex = 0
    for provider, i in @props.client.state.availableProviders
      if not capability or provider.capabilities[capability]
        filteredTabComponent = provider.filterTabComponent capability, TabComponent
        component = filteredTabComponent
          client: @props.client
          dialog: @props.dialog
          close: @props.close
          provider: provider
        tabs.push TabbedPanel.Tab {key: i, label: (tr provider.displayName), component: component}
        if provider.name is @props.client.state.metadata?.provider?.name
          selectedTabIndex = tabs.length - 1

    (ModalTabbedDialog {title: (tr @props.dialog.title), close: @props.close, tabs: tabs, selectedTabIndex: selectedTabIndex})
