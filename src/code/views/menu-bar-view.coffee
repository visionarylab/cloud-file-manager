{div, i, span} = React.DOM

Dropdown = React.createFactory require './dropdown-view'

module.exports = React.createClass

  displayName: 'MenuBar'

  getInitialState: ->
    rightSideLayout: @props.options.rightSideLayout or ['info', 'help']

  help: ->
    window.open @props.options.help, '_blank'

  render: ->
    (div {className: 'menu-bar'},
      (div {className: 'menu-bar-left'},
        (Dropdown {
          anchor: @props.filename
          items: @props.items
          className:'menu-bar-content-filename'})
        if @props.fileStatus
          (span {className: "menu-bar-file-status menu-bar-file-status-#{@props.fileStatus.type}"}, @props.fileStatus.message)
      )
      (div {className: 'menu-bar-right'},
        for item in @state.rightSideLayout
          if @props.options[item]
            switch item
              when 'info'
                (span {className: 'menu-bar-info'}, @props.options.info)
              when 'help'
                (i {style: {fontSize: "13px"}, className: 'clickable icon-help', onClick: @help})
      )
    )
