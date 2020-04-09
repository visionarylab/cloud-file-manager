{div, input, a, button} = ReactDOMFactories

ModalDialog = createReactFactory require './modal-dialog-view'
CloudMetadata = (require '../providers/provider-interface').CloudMetadata

tr = require '../utils/translate'

module.exports = createReactClass

  displayName: 'DownloadDialogView'

  getInitialState: ->
    filename = CloudMetadata.withExtension(@props.filename or (tr "~MENUBAR.UNTITLED_DOCUMENT"), 'json')
    state =
      filename: filename
      trimmedFilename: @trim filename
      includeShareInfo: false
      shared: @props.client.isShared()

  componentDidMount: ->
    @filenameRef.focus()

  updateFilename: ->
    filename = @filenameRef.value
    @setState
      filename: filename
      trimmedFilename: @trim filename

  updateIncludeShareInfo: ->
    @setState includeShareInfo: @includeShareInfoRef.checked

  trim: (s) ->
    s.replace /^\s+|\s+$/, ''

  download: (e, simulateClick) ->
    if not @downloadDisabled()
      @downloadRef.setAttribute 'href', @props.client.getDownloadUrl(@props.content, @state.includeShareInfo)
      @downloadRef.click() if simulateClick
      @props.close()
    else
      e?.preventDefault()
      @filenameRef.focus()

  downloadDisabled: ->
    @state.trimmedFilename.length is 0

  watchForEnter: (e) ->
    if e.keyCode is 13 and not @downloadDisabled()
      e.preventDefault()
      e.stopPropagation()
      @download(null, true)

  render: ->
    (ModalDialog {title: (tr '~DIALOG.DOWNLOAD'), close: @props.close},
      (div {className: 'download-dialog'},
        (input {type: 'text', ref: ((elt) => @filenameRef = elt), placeholder: 'Filename', value: @state.filename, onChange: @updateFilename, onKeyDown: @watchForEnter})
        if @state.shared
          (div {className: 'download-share'},
            (input {type: 'checkbox', ref: ((elt) => @includeShareInfoRef = elt), value: @state.includeShareInfo, onChange: @updateIncludeShareInfo})
            (tr '~DOWNLOAD_DIALOG.INCLUDE_SHARE_INFO')
          )
        (div {className: 'buttons'},
          (a {href: '#', ref: ((elt) => @downloadRef = elt), className: (if @downloadDisabled() then 'disabled' else ''), download: @state.trimmedFilename, onClick: @download}, tr '~DOWNLOAD_DIALOG.DOWNLOAD')
          (button {onClick: @props.close}, tr '~DOWNLOAD_DIALOG.CANCEL')
        )
      )
    )
