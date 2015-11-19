
MenuBar       = React.createFactory require './menu-bar'

{div, iframe} = React.DOM

module.exports = React.createClass

  displayName: 'CloudFileManager'

  render: ->
    (div {className: 'app'},
      (MenuBar {})
      (iframe {
        width: "100%"
        height: "100%"
        src: @props.app
      })
    )
