{div, i, span, input} = React.DOM

Dropdown = React.createFactory require './dropdown-view'

module.exports = React.createClass

  displayName: 'MenuBar'

  getInitialState: ->
    editingFilename: false
    filename: @props.filename

  componentWillReceiveProps: (nextProps) ->
    @setState filename: nextProps.filename

  filenameClicked: (e) ->
    e.preventDefault()
    e.stopPropagation()
    now = (new Date()).getTime()
    if now - @lastClick <= 250
      if @props.client.state.metadata?.provider?.can 'rename'
        @setState editingFilename: true
        setTimeout (=> @focusFilename()), 10
      else
        @props.client.saveFileDialog()
    @lastClick = now

  filenameChanged: ->
    @setState filename: @filename().value

  filenameBlurred: ->
    @rename()

  filename: ->
    React.findDOMNode(@refs.filename)

  focusFilename: ->
    el = @filename()
    el.focus()
    if typeof el.selectionStart is 'number'
      el.selectionStart = el.selectionEnd = el.value.length
    else if typeof el.createTextRange isnt 'undefined'
      range = el.createTextRange()
      range.collapse false
      range.select()

  rename: ->
    filename = @state.filename.replace /^\s+|\s+$/, ''
    if filename.length > 0
      @props.client.rename @props.client.state.metadata, filename
    @setState editingFilename: false

  watchForEnter: (e) ->
    if e.keyCode is 13
      @rename()
    else if e.keyCode is 27
      @setState
        filename: @props.filename
        editingFilename: false

  help: ->
    window.open @props.options.help, '_blank'

  render: ->
    (div {className: 'menu-bar'},
      (div {className: 'menu-bar-left'},
        (Dropdown {items: @props.items})
        if @state.editingFilename
          (div {className:'menu-bar-content-filename'},
            (input {ref: 'filename', value: @state.filename, onChange: @filenameChanged, onBlur: @filenameBlurred, onKeyDown: @watchForEnter})
          )
        else
          (div {className:'menu-bar-content-filename', onClick: @filenameClicked}, @state.filename)
        if @props.fileStatus
          (span {className: "menu-bar-file-status-#{@props.fileStatus.type}"}, @props.fileStatus.message)
      )
      (div {className: 'menu-bar-right'},
        if @props.options.info
          (span {className: 'menu-bar-info'}, @props.options.info)
        if @props.provider and @props.provider.authorized()
          @props.provider.renderUser()
        if @props.options.help
          (i {style: {fontSize: "13px"}, className: 'clickable icon-help', onClick: @help})
      )
    )
