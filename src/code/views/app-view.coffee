MenuBar = React.createFactory require './menu-bar-view'
ProviderTabbedDialog = React.createFactory require './provider-tabbed-dialog-view'
DownloadDialog = React.createFactory require './download-dialog-view'
RenameDialog = React.createFactory require './rename-dialog-view'
ShareDialog = React.createFactory require './share-dialog-view'
BlockingModal = React.createFactory require './blocking-modal-view'
ImportTabbedDialog = React.createFactory require './import-tabbed-dialog-view'

tr = require '../utils/translate'
isString = require '../utils/is-string'

{div, iframe} = React.DOM

InnerApp = React.createFactory React.createClass

  displayName: 'CloudFileManagerInnerApp'

  shouldComponentUpdate: (nextProps) ->
    nextProps.app isnt @props.app

  render: ->
    (div {className: 'innerApp'},
      (iframe {src: @props.app})
    )

App = React.createClass

  displayName: 'CloudFileManager'

  getFilename: (metadata) ->
    if metadata?.hasOwnProperty("name") and metadata.name?.length > 0 then metadata.name else null

  getInitialState: ->
    filename: @getFilename @props.client.state.metadata
    provider: @props.client.state.metadata?.provider
    menuItems: @props.client._ui.menu?.items or []
    menuOptions: @props.ui?.menuBar or {}
    providerDialog: null
    downloadDialog: null
    renameDialog: null
    shareDialog: null
    dirty: false

  componentWillMount: ->
    @props.client.listen (event) =>
      fileStatus = if event.state.saving
        {message: "Saving...", type: 'info'}
      else if event.state.saved
        {message: "All changes saved to #{event.state.metadata.provider.displayName}", type: 'info'}
      else if event.state.dirty
        {message: 'Unsaved', type: 'alert'}
      else
        null
      @setState
        filename: @getFilename event.state.metadata
        provider: event.state.metadata?.provider
        fileStatus: fileStatus

      switch event.type
        when 'connected'
          @setState menuItems: @props.client._ui.menu?.items or []

    @props.client._ui.listen (event) =>
      switch event.type
        when 'showProviderDialog'
          @setState providerDialog: event.data
        when 'showDownloadDialog'
          @setState downloadDialog: event.data
        when 'showRenameDialog'
          @setState renameDialog: event.data
        when 'showImportDialog'
          @setState importDialog: event.data
        when 'showShareDialog'
          @setState shareDialog: event.data
        when 'showBlockingModal'
          @setState blockingModalProps: event.data
        when 'appendMenuItem'
          @state.menuItems.push event.data
          @setState menuItems: @state.menuItems
        when 'prependMenuItem'
          @state.menuItems.unshift event.data
          @setState menuItems: @state.menuItems
        when 'replaceMenuItem'
          index = @_getMenuItemIndex event.data.key
          if index isnt -1
            @state.menuItems[index] = event.data.item
            @setState menuItems: @state.menuItems
        when 'insertMenuItemBefore'
          index = @_getMenuItemIndex event.data.key
          if index isnt -1
            if index is 0
              @state.menuItems.unshift event.data.item
            else
              @state.menuItems.splice index, 0, event.data.item
            @setState menuItems: @state.menuItems
        when 'insertMenuItemAfter'
          index = @_getMenuItemIndex event.data.key
          if index isnt -1
            if index is @state.menuItems.length - 1
              @state.menuItems.push event.data.item
            else
              @state.menuItems.splice index + 1, 0, event.data.item
            @setState menuItems: @state.menuItems
        when 'setMenuBarInfo'
          @state.menuOptions.info = event.data
          @setState menuOptions: @state.menuOptions

  _getMenuItemIndex: (key) ->
    if isString key
      for item, index in @state.menuItems
        return index if item.key is key
      -1
    else
      index = parseInt key, 10
      if isNaN(index) or index < 0 or index > @state.menuItems.length - 1
        -1
      else
        index

  closeDialogs: ->
    @setState
      providerDialog: null
      downloadDialog: null
      renameDialog: null
      shareDialog: null
      importDialog: null

  renderDialogs: ->
    if @state.blockingModalProps
      (BlockingModal @state.blockingModalProps)
    else if @state.providerDialog
      (ProviderTabbedDialog {client: @props.client, dialog: @state.providerDialog, close: @closeDialogs})
    else if @state.downloadDialog
      (DownloadDialog {filename: @state.downloadDialog.filename, mimeType: @state.downloadDialog.mimeType, content: @state.downloadDialog.content, close: @closeDialogs})
    else if @state.renameDialog
      (RenameDialog {filename: @state.renameDialog.filename, callback: @state.renameDialog.callback, close: @closeDialogs})
    else if @state.importDialog
      (ImportTabbedDialog {client: @props.client, dialog: @state.importDialog, close: @closeDialogs})
    else if @state.shareDialog
      (ShareDialog {client: @props.client, close: @closeDialogs})

  render: ->
    if @props.appOrMenuElemId
      # CSS class depends on whether we're in app (iframe) or view (menubar-only) mode
      (div {className: if @props.usingIframe then 'app' else 'view' },
        (MenuBar {client: @props.client, filename: @state.filename, provider: @state.provider, fileStatus: @state.fileStatus, items: @state.menuItems, options: @state.menuOptions})
        # only render the wrapped client app in app (iframe) mode
        if @props.usingIframe
          (InnerApp {app: @props.app})
        @renderDialogs()
      )
    else if @state.providerDialog or @state.downloadDialog
      (div {className: 'app'},
        @renderDialogs()
      )
    else
      null

module.exports = App
