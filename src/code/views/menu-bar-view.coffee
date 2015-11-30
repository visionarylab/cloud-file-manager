{div, i, span} = React.DOM

Dropdown = React.createFactory require './dropdown-view'

module.exports = React.createClass

  displayName: 'MenuBar'

  help: ->
    window.open @props.options.help, '_blank'

  render: ->
    (div {className: 'menu-bar'},
      (div {className: 'menu-bar-left'},
        (Dropdown {
          anchor: @props.filename
          items: @props.items
          className:'menu-bar-content-filename'})
      )
      (div {className: 'menu-bar-right'},
        if @props.options.help
          (i {style: {fontSize: "13px"}, className: 'clickable icon-help', onClick: @help})
      )
    )
