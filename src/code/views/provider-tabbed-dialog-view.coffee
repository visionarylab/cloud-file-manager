ModalTabbedDialog = React.createFactory require './modal-tabbed-dialog-view'
TabbedPanel = require './tabbed-panel-view'

tr = require '../utils/translate'
{div, img, i, span} = React.DOM

module.exports = React.createClass
  displayName: 'ProviderTabbedDialog'

  render:  ->
    tabs = []
    props =
      dialog: @props.dialog
    for provider, i in @props.client.state.availableProviders
      tabs.push TabbedPanel.Tab {key: i, label: (tr provider.displayName), component: (provider.dialog props)}

    (ModalTabbedDialog {title: (tr @props.dialog.title), close: @props.close, tabs: tabs})
