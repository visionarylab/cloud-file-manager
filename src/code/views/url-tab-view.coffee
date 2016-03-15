{div, input, button} = React.DOM
tr = require '../utils/translate'

module.exports = React.createClass

  displayName: 'UrlTab'

  getInitialState: ->
    hover: false

  importUrl: (url, via) ->
    @props.dialog.callback? url, via
    @props.close()

  import: ->
    url = $.trim React.findDOMNode(@refs.url).value
    if url.length is 0
      @props.client.alert tr "~IMPORT_URL.PLEASE_ENTER_URL"
    else
      @importUrl url, 'select'

  cancel: ->
    @props.close()

  dragEnter: (e) ->
    e.preventDefault()
    @setState hover: true

  dragLeave: (e) ->
    e.preventDefault()
    @setState hover: false

  drop: (e) ->
    e.preventDefault()
    if e.dataTransfer
      droppedUrls = (e.dataTransfer.getData('url') or dataTransfer.getData('text/uri-list') or '').split '\n'
      if droppedUrls.length > 1
        @props.client.alert tr "~IMPORT_URL.MULTIPLE_URLS_DROPPED"
      else if droppedUrls.length is 1
        @importUrl droppedUrls[0], 'drop'

  render: ->
    dropClass = "urlDropArea#{if @state.hover then ' dropHover' else ''}"
    (div {className: 'dialogTab urlImport'},
      (div {className: dropClass, onDragEnter: @dragEnter, onDragLeave: @dragLeave, onDrop: @drop},
        (tr "~URL_TAB.DROP_URL_HERE")
      )
      (input {ref: 'url', placeholder: 'URL'})
      (div {className: 'buttons'},
        (button {onClick: @import}, (tr "~URL_TAB.IMPORT"))
        (button {onClick: @cancel}, (tr "~FILE_DIALOG.CANCEL"))
      )
    )
