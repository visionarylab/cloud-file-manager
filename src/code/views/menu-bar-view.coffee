{div, i, span} = React.DOM

Dropdown = React.createFactory require './dropdown-view'

module.exports = React.createClass

  displayName: 'MenuBar'

  filenameClicked: (e) ->
    e.preventDefault()
    e.stopPropagation()
    now = (new Date()).getTime()
    if now - @lastClick <= 250
      if @props.client.state.metadata?.provider?.can 'rename'
        @props.client.renameDialog()
      else
        @props.client.saveFileDialog()
    @lastClick = now

  help: ->
    window.open @props.options.help, '_blank'

  render: ->
    (div {className: 'menu-bar'},
      (div {className: 'menu-bar-left'},
        (Dropdown {items: @props.items})
        (div {className:'menu-bar-content-filename', onClick: @filenameClicked}, @props.filename)
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
