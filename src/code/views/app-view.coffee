{createReactClass, createReactClassFactory, createReactFactory} = require '../utils/react'

MenuBar = createReactFactory require './menu-bar-view'
ProviderTabbedDialog = createReactFactory require './provider-tabbed-dialog-view'
DownloadDialog = createReactFactory require './download-dialog-view'
RenameDialog = createReactFactory require './rename-dialog-view'
ShareDialog = createReactFactory require './share-dialog-view'
BlockingModal = createReactFactory require './blocking-modal-view'
AlertDialog = createReactFactory require './alert-dialog-view'
ConfirmDialog = createReactFactory require './confirm-dialog-view'
ImportTabbedDialog = createReactFactory require './import-tabbed-dialog-view'

tr = require '../utils/translate'
isString = require '../utils/is-string'

{div, iframe} = React.DOM

InnerApp = createReactClassFactory

  displayName: 'CloudFileManagerInnerApp'

  shouldComponentUpdate: (nextProps) ->
    nextProps.app isnt @props.app

  render: ->
    (div {className: 'innerApp'},
      (iframe {src: @props.app})
    )

App = createReactClass

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
    alertDialog: null
    confirmDialog: null
    dirty: false

  componentWillMount: ->
    @props.client.listen (event) =>
      fileStatus = if event.state.saving
        {message: tr('~FILE_STATUS.SAVING'), type: 'info'}
      else if event.state.saved
        providerName = event.state.metadata.provider?.displayName
        message = if providerName \
                    then tr('~FILE_STATUS.SAVED_TO_PROVIDER', { providerName: providerName }) \
                    else tr('~FILE_STATUS.SAVED')
        {message: message, type: 'info'}
      else if event.state.dirty
        {message: tr('~FILE_STATUS.UNSAVED'), type: 'alert'}
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
        when 'hideBlockingModal'
          @setState blockingModalProps: null
        when 'showAlertDialog'
          @setState alertDialog: event.data
        when 'showConfirmDialog'
          @setState confirmDialog: event.data
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

  closeAlert: ->
    @setState alertDialog: null

  closeConfirm: ->
    @setState confirmDialog: null

  renderDialogs: ->
    (div {},
      if @state.blockingModalProps
        (BlockingModal @state.blockingModalProps)
      else if @state.providerDialog
        (ProviderTabbedDialog {client: @props.client, dialog: @state.providerDialog, close: @closeDialogs})
      else if @state.downloadDialog
        (DownloadDialog {client: @props.client, filename: @state.downloadDialog.filename, mimeType: @state.downloadDialog.mimeType, content: @state.downloadDialog.content, close: @closeDialogs})
      else if @state.renameDialog
        (RenameDialog {filename: @state.renameDialog.filename, callback: @state.renameDialog.callback, close: @closeDialogs})
      else if @state.importDialog
        (ImportTabbedDialog {client: @props.client, dialog: @state.importDialog, close: @closeDialogs})
      else if @state.shareDialog
        (ShareDialog {client: @props.client, enableLaraSharing: @props.enableLaraSharing, close: @closeDialogs, settings: @props.ui?.shareDialog or {}})

      # alert and confirm dialogs can be overlayed on other dialogs
      if @state.alertDialog
        (AlertDialog {title: @state.alertDialog.title, message: @state.alertDialog.message, callback: @state.alertDialog.callback, close: @closeAlert})
      if @state.confirmDialog
        (ConfirmDialog _.merge {}, @state.confirmDialog, { close: @closeConfirm })
    )

  render: ->
    menuItems = unless @props.hideMenuBar then @state.menuItems else []
    if @props.appOrMenuElemId
      # CSS class depends on whether we're in app (iframe) or view (menubar-only) mode
      (div {className: if @props.usingIframe then 'app' else 'view' },
        (MenuBar {client: @props.client, filename: @state.filename, provider: @state.provider, fileStatus: @state.fileStatus, items: menuItems, options: @state.menuOptions})
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
