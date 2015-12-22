ModalTabbedDialog = React.createFactory require './modal-tabbed-dialog-view'
TabbedPanel = require './tabbed-panel-view'
LocalFileTab = React.createFactory require './local-file-tab-view'

tr = require '../utils/translate'

LocalFileImportTab = React.createFactory React.createClass

module.exports = React.createClass
  displayName: 'ImportTabbedDialog'

  importFile: (metadata) ->
    switch metadata.provider
      when 'localFile'
        reader = new FileReader()
        reader.onload = (loaded) =>
          data =
            name: metadata.providerData.file.name,
            content: loaded.target.result
          @props.dialog.callback? data
        reader.readAsText metadata.providerData.file

  render:  ->
    tabs = [
      TabbedPanel.Tab
        key: 0
        label: (tr "~IMPORT.LOCAL_FILE")
        component: LocalFileTab
          dialog:
            callback: @importFile
          provider: 'localFile' # we are faking the provider here so we can reuse the local file tab
          close: @props.close
    ]
    (ModalTabbedDialog {title: (tr "~DIALOG.IMPORT_DATA"), close: @props.close, tabs: tabs, selectedTabIndex: 0})
