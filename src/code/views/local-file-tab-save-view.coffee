{div, input, button, a} = React.DOM
tr = require '../utils/translate'
CloudMetadata = (require '../providers/provider-interface').CloudMetadata
cloudContentFactory = (require '../providers/provider-interface').cloudContentFactory

module.exports = React.createClass

  displayName: 'LocalFileSaveTab'

  getInitialState: ->
    filename = CloudMetadata.withExtension(@props.client.state.metadata?.name or (tr "~MENUBAR.UNTITLED_DOCUMENT"), 'json')
    state =
      filename: filename
      trimmedFilename: @trim filename
      shared: @props.client.isShared()
      includeShareInfo: false
      gotContent: false
      content: null

  componentDidMount: ->
    @props.client._event 'getContent', { shared: @props.client._sharedMetadata() }, (content) =>
      debugger
      envelopedContent = cloudContentFactory.createEnvelopedCloudContent content
      @props.client.state?.currentContent?.copyMetadataTo envelopedContent
      @setState
        gotContent: true
        content: envelopedContent

  filenameChanged: ->
    filename = @refs.filename.value
    @setState
      filename: filename
      trimmedFilename: @trim filename

  includeShareInfoChanged: ->
    @setState includeShareInfo: @refs.includeShareInfo.checked

  trim: (s) ->
    s.replace /^\s+|\s+$/, ''

  confirm: (e, simulateClick) ->
    if not @confirmDisabled()
      @refs.download.href = @props.client.getDownloadUrl(@state.content, @state.includeShareInfo)
      @refs.download.click() if simulateClick
      metadata = new CloudMetadata
        name: @state.trimmedFilename.split('.')[0]
        type: CloudMetadata.File
        parent: null
        provider: @props.provider
      @props.dialog.callback metadata
      @props.close()
    else
      e?.preventDefault()

  cancel: ->
    @props.close()

  watchForEnter: (e) ->
    if e.keyCode is 13 and not @confirmDisabled()
      e.preventDefault()
      e.stopPropagation()
      @confirm(null, true)

  confirmDisabled: ->
    (@state.trimmedFilename.length is 0) or not @state.gotContent

  render: ->
    confirmDisabled = @confirmDisabled()

    (div {className: 'dialogTab localFileSave'},
      (input {type: 'text', ref: 'filename', value: @state.filename, placeholder: (tr "~FILE_DIALOG.FILENAME"), onChange: @filenameChanged, onKeyDown: @watchForEnter}),
      (div {className: 'saveArea'},
        if @state.shared
          (div {className: 'shareCheckbox'},
            (input {type: 'checkbox', ref: 'includeShareInfo', value: @state.includeShareInfo, onChange: @includeShareInfoChanged})
            (tr '~DOWNLOAD_DIALOG.INCLUDE_SHARE_INFO')
          )
      )
      div({className: 'note'}, tr('~FILE_DIALOG.DOWNLOAD_NOTE', {download: tr('~FILE_DIALOG.DOWNLOAD')}))
      (div {className: 'buttons'},
        (a {href: '#', ref: 'download', className: (if confirmDisabled then 'disabled' else ''), download: @state.trimmedFilename, onClick: @confirm}, tr '~FILE_DIALOG.DOWNLOAD')
        (button {onClick: @cancel}, (tr "~FILE_DIALOG.CANCEL"))
      )
    )