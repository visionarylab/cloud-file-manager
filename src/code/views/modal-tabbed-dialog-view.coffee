{createReactClass, createReactFactory} = require '../utils/react'

ModalDialog = createReactFactory require './modal-dialog-view'
TabbedPanel = createReactFactory require './tabbed-panel-view'

module.exports = createReactClass

  displayName: 'ModalTabbedDialogView'

  render: ->
    (ModalDialog {title: @props.title, close: @props.close},
      (TabbedPanel {tabs: @props.tabs, selectedTabIndex: @props.selectedTabIndex})
    )
