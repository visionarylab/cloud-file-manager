{createReactClass, createReactFactory} = require '../utils/react'
{div, i, span, input} = React.DOM

Dropdown = createReactFactory require './dropdown-view'
{TriangleOnlyAnchor} = require "./dropdown-anchors"
tr = require '../utils/translate'

module.exports = createReactClass

  displayName: 'MenuBar'

  componentWillMount: ->
    # need to use direct DOM events because the event needs to be captured
    if window.addEventListener
      window.addEventListener 'mousedown', @checkBlur, true
      window.addEventListener 'touchstart', @checkBlur, true

    @props.client._ui.listen (event) =>
      switch event.type
        when 'editInitialFilename'
          @setState
            editingFilename: true
            editingInitialFilename: true
          setTimeout (=> @focusFilename()), 10

  componentWillUnmount: ->
    if window.removeEventListener
      window.removeEventListener 'mousedown', @checkBlur, true
      window.removeEventListener 'touchstart', @checkBlur, true

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
      editingInitialFilename: false

  componentWillReceiveProps: (nextProps) ->
    @setState
      filename: @getFilename nextProps
      editableFilename: @getEditableFilename nextProps
      provider: nextProps.provider

  filenameClicked: (e) ->
    e.preventDefault()
    e.stopPropagation()
    @setState
      editingFilename: true
      editingInitialFilename: false
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
      if @state.editingInitialFilename
        @props.client.setInitialFilename filename
      else
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

  infoClicked: ->
    @props.options.onInfoClicked?(@props.client)

  # CODAP eats the click events in the main workspace which causes the blur event not to fire so we need to check for a non-bubbling global click event when editing
  checkBlur: (e) ->
    @filenameBlurred() if @state.editingFilename and e.target isnt @filename()

  langChanged: (langCode) ->
    {client, options} = @props
    {onLangChanged} = options.languageMenu
    if onLangChanged?
      client.changeLanguage langCode, onLangChanged

  renderLanguageMenu: ->
    langMenu = @props.options.languageMenu
    items = langMenu.options
      # Do not show current language in the menu.
      .filter((option) -> option.langCode isnt langMenu.currentLang)
      .map((option) =>
        label = option.label or option.langCode.toUpperCase()
        className = "flag flag-#{option.flag}" if option.flag
        {
          content: (span {className: 'lang-option'}, (div {className}), label)
          action: => @langChanged(option.langCode)
        }
      )

    hasFlags = langMenu.options.filter((option) -> option.flag?).length > 0
    currentOption = langMenu.options.filter((option) -> option.langCode is langMenu.currentLang)[0]
    defaultOption = if hasFlags then {flag: "us"} else {label: "English"}
    {flag, label} = currentOption or defaultOption
    menuAnchor = if flag
      (div {className: "flag flag-#{flag}"})
    else
      (div {className: "lang-menu with-border"},
        (span {className: "lang-label"}, label or defaultOption.label),
        TriangleOnlyAnchor
      )

    (Dropdown {
      className: "lang-menu",
      menuAnchorClassName: "menu-anchor-right",
      items,
      menuAnchor
    })

  render: ->
    (div {className: 'menu-bar'},
      (div {className: 'menu-bar-left'},
        (Dropdown {items: @props.items})
        if @state.editingFilename
          (div {className: 'menu-bar-content-filename'},
            (input {ref: 'filename', value: @state.editableFilename, onChange: @filenameChanged, onKeyDown: @watchForEnter})
          )
        else
          (div {className: 'menu-bar-content-filename', onClick: @filenameClicked}, @state.filename)
        if @props.fileStatus
          (span {className: "menu-bar-file-status-#{@props.fileStatus.type}"}, @props.fileStatus.message)
      )
      (div {className: 'menu-bar-right'},
        if @props.options.info
          (span {className: 'menu-bar-info', onClick: @infoClicked}, @props.options.info)
        if @props.provider?.authorized()
          @props.provider.renderUser()
        if @props.options.help
          (i {style: {fontSize: "13px"}, className: 'clickable icon-help', onClick: @help})
        if @props.options.languageMenu
          @renderLanguageMenu()
      )
    )
