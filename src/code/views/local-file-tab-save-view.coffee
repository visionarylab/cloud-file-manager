{div, input, button, a} = React.DOM
tr = require '../utils/translate'
CloudMetadata = (require '../providers/provider-interface').CloudMetadata
cloudContentFactory = (require '../providers/provider-interface').cloudContentFactory
FileSaver = require('../lib/file-saver')

module.exports = React.createClass

  displayName: 'LocalFileSaveTab'

  getInitialState: ->
    # If the dialog has the content to save, which occurs when saving secondary content
    # like CSV files, then use that instead of the document content and make sure that
    # it doesn't get modified by (for instance) trying to remove sharing metadata. To
    # do so, we specify that we want to include the share info, which tells the client
    # to leave the content alone.
    hasPropsContent = @props.dialog.data?.content?
    filename = @props.client.state.metadata?.name or (tr "~MENUBAR.UNTITLED_DOCUMENT")
    extension = if hasPropsContent and @props.dialog.data.extension \
                  then @props.dialog.data.extension else 'json'
    state =
      filename: filename
      supportsDownloadAttribute: document.createElement('a').download isnt undefined
      downloadFilename: @getDownloadFilename hasPropsContent, filename, extension
      extension: extension
      mimeType: if hasPropsContent and @props.dialog.data.mimeType? \
                  then @props.dialog.data.mimeType else 'text/plain',
      shared: @props.client.isShared()
      hasPropsContent: hasPropsContent
      includeShareInfo: hasPropsContent
      gotContent: hasPropsContent
      content: @props.dialog.data?.content

  componentDidMount: ->
    if not @state.hasPropsContent
      @props.client._event 'getContent', { shared: @props.client._sharedMetadata() }, (content) =>
        envelopedContent = cloudContentFactory.createEnvelopedCloudContent content
        @props.client.state?.currentContent?.copyMetadataTo envelopedContent
        @setState
          gotContent: true
          content: envelopedContent

  filenameChanged: ->
    filename = @refs.filename.value
    @setState
      filename: filename
      downloadFilename: @getDownloadFilename @state.hasPropsContent, filename, @state.extension

  includeShareInfoChanged: ->
    @setState includeShareInfo: @refs.includeShareInfo.checked

  getDownloadFilename: (hasPropsContent, filename, extension) ->
    newName = filename.replace /^\s+|\s+$/, ''
    if hasPropsContent \
      then CloudMetadata.newExtension(newName, extension) \
      else CloudMetadata.withExtension(newName, extension)

  confirm: (e, simulateClick) ->
    if not @confirmDisabled()
      if @state.supportsDownloadAttribute
        @refs.download.href = @props.client.getDownloadUrl(@state.content, @state.includeShareInfo, @state.mimeType)
        @refs.download.click() if simulateClick
      else
        blob = @props.client.getDownloadBlob(@state.content, @state.includeShareInfo, @state.mimeType)
        FileSaver.saveAs(blob, @state.downloadFilename, true)
        e?.preventDefault()

      metadata = new CloudMetadata
        name: @state.downloadFilename.split('.')[0]
        type: CloudMetadata.File
        parent: null
        provider: @props.provider
      @props.dialog.callback metadata
      @props.close()
    else
      e?.preventDefault()
    return

  contextMenu: (e) ->
    @refs.download.href = @props.client.getDownloadUrl(@state.content, @state.includeShareInfo, @state.mimeType)
    return

  cancel: ->
    @props.close()
    return

  watchForEnter: (e) ->
    if e.keyCode is 13 and not @confirmDisabled()
      e.preventDefault()
      e.stopPropagation()
      @confirm(null, true)
    return

  confirmDisabled: ->
    (@state.downloadFilename.length is 0) or not @state.gotContent

  render: ->
    confirmDisabled = @confirmDisabled()

    (div {className: 'dialogTab localFileSave'},
      (input {type: 'text', ref: 'filename', value: @state.filename, placeholder: (tr "~FILE_DIALOG.FILENAME"), onChange: @filenameChanged, onKeyDown: @watchForEnter}),
      (div {className: 'saveArea'},
        if @state.shared and not @state.hasPropsContent
          (div {className: 'shareCheckbox'},
            (input {type: 'checkbox', ref: 'includeShareInfo', value: @state.includeShareInfo, onChange: @includeShareInfoChanged})
            (tr '~DOWNLOAD_DIALOG.INCLUDE_SHARE_INFO')
          )
      )
      div({className: 'note'}, tr('~FILE_DIALOG.DOWNLOAD_NOTE', {download: tr('~FILE_DIALOG.DOWNLOAD')}))
      (div {className: 'buttons'},
        (a {
          href: '#'
          ref: 'download'
          className: (if confirmDisabled then 'disabled' else '')
          download: @state.downloadFilename
          onClick: @confirm
          onContextMenu: @contextMenu
        }, tr '~FILE_DIALOG.DOWNLOAD')
        (button {onClick: @cancel}, (tr "~FILE_DIALOG.CANCEL"))
      )
    )