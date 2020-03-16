{createReactClass, createReactClassFactory, createReactFactory} = require '../utils/react'

ModalTabbedDialog = createReactFactory require './modal-tabbed-dialog-view'
TabbedPanel = require './tabbed-panel-view'
LocalFileTab = createReactFactory require './local-file-tab-list-view'
UrlTab = createReactFactory require './url-tab-view'

tr = require '../utils/translate'

LocalFileImportTab = createReactClassFactory

module.exports = createReactClass
  displayName: 'ImportTabbedDialog'

  importFile: (metadata, via) ->
    switch metadata.provider
      when 'localFile'
        reader = new FileReader()
        reader.onload = (loaded) =>
          data =
            file:
              name: metadata.providerData.file.name,
              content: loaded.target.result
              object: metadata.providerData.file
            via: via
          @props.dialog.callback? data
        reader.readAsText metadata.providerData.file

  importUrl: (url, via) ->
    @props.dialog.callback? {url: url, via: via}

  render:  ->
    tabs = [
      TabbedPanel.Tab
        key: 0
        label: (tr "~IMPORT.LOCAL_FILE")
        component: LocalFileTab
          client: @props.client
          dialog:
            callback: @importFile
          provider: 'localFile' # we are faking the provider here so we can reuse the local file tab
          close: @props.close
      TabbedPanel.Tab
        key: 1
        label: (tr "~IMPORT.URL")
        component: UrlTab
          client: @props.client
          dialog:
            callback: @importUrl
          close: @props.close
    ]
    (ModalTabbedDialog {title: (tr "~DIALOG.IMPORT_DATA"), close: @props.close, tabs: tabs, selectedTabIndex: 0})
