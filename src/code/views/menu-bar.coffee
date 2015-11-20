{div, i, span} = React.DOM
tr = require '../utils/translate'

Dropdown = React.createFactory require './dropdown-view'

module.exports = React.createClass

  displayName: 'MenuBar'

  render: ->
    filename = @props.filename or "Untitled Document"
    options = [
      name: tr "~MENU.OPEN"
      action: null
    ,
      name: tr "~MENU.SAVE"
      action: null
    ]

    (div {className: 'menu-bar'},
      (div {},
        (Dropdown {
          anchor: filename
          items: options
          className:'menu-bar-content-filename'})
      )
    )
