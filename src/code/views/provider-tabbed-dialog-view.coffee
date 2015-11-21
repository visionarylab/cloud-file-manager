ModalTabbedDialog = React.createFactory require './modal-tabbed-dialog-view'
TabbedPanel = require './tabbed-panel-view'

{div} = React.DOM

OpenFileDialogTab = React.createFactory React.createClass
  displayName: 'OpenFileDialogTab'
  render: -> (div {}, "OpenFileDialogTab: #{@props.provider.displayName}")

SaveFileDialogTab = React.createFactory React.createClass
  displayName: 'SaveFileDialogTab'
  render: -> (div {}, "SaveFileDialogTab: #{@props.provider.displayName}")

SelectProviderDialogTab = React.createFactory React.createClass
  displayName: 'SelectProviderDialogTab'
  render: -> (div {}, "SelectProviderDialogTab: #{@props.provider.displayName}")

tr = require '../utils/translate'
{div, img, i, span} = React.DOM

module.exports = React.createClass
  displayName: 'ProviderTabbedDialog'

  render:  ->
    [capability, TabComponent] = switch @props.dialog.action
      when 'openFile' then ['list', OpenFileDialogTab]
      when 'saveFile', 'saveFileAs' then ['save', SaveFileDialogTab]
      when 'selectProvider' then [null, SelectProviderDialogTab]

    tabs = []
    for provider, i in @props.client.state.availableProviders
      if not capability or provider.capabilities[capability]
        tabs.push TabbedPanel.Tab {key: i, label: (tr provider.displayName), component: (TabComponent {provider: provider, callback: @props.dialog.callback})}

    (ModalTabbedDialog {title: (tr @props.dialog.title), close: @props.close, tabs: tabs})
