{createReactClass, createReactFactory} = require '../utils/react'
{div, input, a, button} = require 'react-dom-factories'

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
    @refs.filename.focus()

  updateFilename: ->
    filename = @refs.filename.value
    @setState
      filename: filename
      trimmedFilename: @trim filename

  updateIncludeShareInfo: ->
    @setState includeShareInfo: @refs.includeShareInfo.checked

  trim: (s) ->
    s.replace /^\s+|\s+$/, ''

  download: (e, simulateClick) ->
    if not @downloadDisabled()
      @refs.download.setAttribute 'href', @props.client.getDownloadUrl(@props.content, @state.includeShareInfo)
      @refs.download.click() if simulateClick
      @props.close()
    else
      e?.preventDefault()
      @refs.filename.focus()

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
        (input {type: 'text', ref: 'filename', placeholder: 'Filename', value: @state.filename, onChange: @updateFilename, onKeyDown: @watchForEnter})
        if @state.shared
          (div {className: 'download-share'},
            (input {type: 'checkbox', ref: 'includeShareInfo', value: @state.includeShareInfo, onChange: @updateIncludeShareInfo})
            (tr '~DOWNLOAD_DIALOG.INCLUDE_SHARE_INFO')
          )
        (div {className: 'buttons'},
          (a {href: '#', ref: 'download', className: (if @downloadDisabled() then 'disabled' else ''), download: @state.trimmedFilename, onClick: @download}, tr '~DOWNLOAD_DIALOG.DOWNLOAD')
          (button {onClick: @props.close}, tr '~DOWNLOAD_DIALOG.CANCEL')
        )
      )
    )
