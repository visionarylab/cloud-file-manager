ModalTabbedDialog = createReactFactory require './modal-tabbed-dialog-view'
TabbedPanel = require './tabbed-panel-view'
CloudMetadata = (require '../providers/provider-interface').CloudMetadata
FileDialogTab = createReactFactory require './file-dialog-tab-view'
SelectProviderDialogTab = createReactFactory require './select-provider-dialog-tab-view'

tr = require '../utils/translate'

module.exports = createReactClass
  displayName: 'ProviderTabbedDialog'

  render:  ->
    [capability, TabComponent] = switch @props.dialog.action
      when 'openFile' then ['list', FileDialogTab]
      when 'saveFile', 'saveFileAs' then ['save', FileDialogTab]
      when 'saveSecondaryFileAs' then ['export', FileDialogTab]
      when 'createCopy' then ['save', FileDialogTab]
      when 'selectProvider' then [null, SelectProviderDialogTab]

    tabs = []
    selectedTabIndex = 0
    for provider, i in @props.client.state.availableProviders
      if not capability or provider.capabilities[capability]
        filteredTabComponent = provider.filterTabComponent capability, TabComponent
        if filteredTabComponent
          component = filteredTabComponent
            client: @props.client
            dialog: @props.dialog
            close: @props.close
            provider: provider
          onSelected = if provider.onProviderTabSelected then provider.onProviderTabSelected.bind(provider) else null
          tabs.push TabbedPanel.Tab {key: i, label: (tr provider.displayName), component: component, capability: capability, onSelected: onSelected}
          if provider.name is @props.client.state.metadata?.provider?.name
            selectedTabIndex = tabs.length - 1

    (ModalTabbedDialog {title: (tr @props.dialog.title), close: @props.close, tabs: tabs, selectedTabIndex: selectedTabIndex})
