{div, input, a, button} = React.DOM

ModalDialog = React.createFactory require './modal-dialog-view'
CloudMetadata = (require '../providers/provider-interface').CloudMetadata

tr = require '../utils/translate'

module.exports = React.createClass

  displayName: 'DownloadDialogView'

  getInitialState: ->
    filename = CloudMetadata.withExtension(@props.filename or (tr "~MENUBAR.UNTITLED_DOCUMENT"), 'json')
    includeShareInfo = false
    state =
      filename: filename
      trimmedFilename: @trim filename

  componentDidMount: ->
    @filename = ReactDOM.findDOMNode @refs.filename
    @filename.focus()
    @includeShareInfo = ReactDOM.findDOMNode @refs.includeShareInfo

  updateFilename: ->
    filename = @filename.value
    @setState
      filename: filename
      trimmedFilename: @trim filename

  updateIncludeShareInfo: ->
    @setState includeShareInfo: @includeShareInfo.checked

  trim: (s) ->
    s.replace /^\s+|\s+$/, ''

  download: (e) ->
    makeBlobURL = (msg) ->
      wURL = window.URL or window.webkitURL
      blob = new Blob([msg], {type: 'text/plain'})
      if (wURL)
        wURL.createObjectURL(blob)

    if @state.trimmedFilename.length > 0
      json = @props.content.getContent()
      if json and not @state.includeShareInfo
        delete json.sharedDocumentId
        delete json.shareEditKey
        delete json.isUnshared
        # CODAP moves the keys into its own namespace
        delete json.metadata.shared if json.metadata?.shared?
      e.target.setAttribute 'href', makeBlobURL(JSON.stringify(json))
      @props.close()
    else
      e.preventDefault()
      @filename.focus()

  render: ->
    (ModalDialog {title: (tr '~DIALOG.DOWNLOAD'), close: @props.close},
      (div {className: 'download-dialog'},
        (input {type: 'text', ref: 'filename', placeholder: 'Filename', value: @state.filename, onChange: @updateFilename})
        if @props.shared
          (div {className: 'download-share'},
            (input {type: 'checkbox', ref: 'includeShareInfo', value: @state.includeShareInfo, onChange: @updateIncludeShareInfo}, tr '~DOWNLOAD_DIALOG.INCLUDE_SHARE_INFO')
          )
        (div {className: 'buttons'},
          (a {href: '#', className: (if @state.trimmedFilename.length is 0 then 'disabled' else ''), download: @state.trimmedFilename, onClick: @download}, tr '~DOWNLOAD_DIALOG.DOWNLOAD')
          (button {onClick: @props.close}, tr '~DOWNLOAD_DIALOG.CANCEL')
        )
      )
    )
