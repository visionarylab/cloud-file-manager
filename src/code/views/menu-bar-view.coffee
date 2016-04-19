{div, i, span, input} = React.DOM

Dropdown = React.createFactory require './dropdown-view'
tr = require '../utils/translate'

module.exports = React.createClass

  displayName: 'MenuBar'

  getFilename: (props) ->
    if props.filename?.length > 0 then props.filename else (tr "~MENUBAR.UNTITLED_DOCUMENT")

  getEditableFilename: (props) ->
    if props.filename?.length > 0 then props.filename else (tr "~MENUBAR.UNTITLED_DOCUMENT")

  getInitialState: ->
    state =
      editingFilename: false
      filename: @getFilename @props
      editableFilename: @getEditableFilename @props
      initialEditableFilename: @getEditableFilename @props

  componentWillReceiveProps: (nextProps) ->
    @setState
      filename: @getFilename nextProps
      editableFilename: @getEditableFilename nextProps
      provider: nextProps.provider

  filenameClicked: (e) ->
    e.preventDefault()
    e.stopPropagation()
    @setState editingFilename: true
    setTimeout (=> @focusFilename()), 10

  filenameChanged: ->
    @setState
      editableFilename: @filename().value

  filenameBlurred: ->
    @rename()

  filename: ->
    ReactDOM.findDOMNode(@refs.filename)

  focusFilename: ->
    el = @filename()
    el.focus()
    el.select()

  cancelEdit: ->
    @setState
      editingFilename: false
      editableFilename: if @state.filename?.length > 0 then @state.filename else @state.initialEditableFilename

  rename: ->
    filename = @state.editableFilename.replace /^\s+|\s+$/, ''
    if filename.length > 0
      @props.client.rename @props.client.state.metadata, filename
      @setState
        editingFilename: false
        filename: filename
        editableFilename: filename
    else
      @cancelEdit()

  watchForEnter: (e) ->
    if e.keyCode is 13
      @rename()
    else if e.keyCode is 27
      @cancelEdit()

  help: ->
    window.open @props.options.help, '_blank'

  render: ->
    (div {className: 'menu-bar'},
      (div {className: 'menu-bar-left'},
        (Dropdown {items: @props.items})
        if @state.editingFilename
          (div {className:'menu-bar-content-filename'},
            (input {ref: 'filename', value: @state.editableFilename, onChange: @filenameChanged, onBlur: @filenameBlurred, onKeyDown: @watchForEnter})
          )
        else
          (div {className:'menu-bar-content-filename', onClick: @filenameClicked}, @state.filename)
        if @props.fileStatus
          (span {className: "menu-bar-file-status-#{@props.fileStatus.type}"}, @props.fileStatus.message)
      )
      (div {className: 'menu-bar-right'},
        if @props.options.info
          (span {className: 'menu-bar-info'}, @props.options.info)
        if @props.provider?.authorized()
          @props.provider.renderUser()
        if @props.options.help
          (i {style: {fontSize: "13px"}, className: 'clickable icon-help', onClick: @help})
      )
    )
