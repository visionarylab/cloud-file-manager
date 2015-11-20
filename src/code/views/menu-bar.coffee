{div, i, span} = React.DOM
tr = require '../utils/translate'

Dropdown = React.createFactory require './dropdown-view'

module.exports = React.createClass

  displayName: 'MenuBar'

  render: ->
    (div {className: 'menu-bar'},
      (div {},
        (Dropdown {
          anchor: @props.filename
          items: @props.items
          className:'menu-bar-content-filename'})
      )
    )
