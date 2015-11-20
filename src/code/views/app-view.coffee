MenuBar = React.createFactory require './menu-bar'

{div, iframe} = React.DOM

module.exports = React.createClass

  displayName: 'CloudFileManager'

  getInitialState: ->
    menuItems: @props.client._ui.menu?.items or []

  componentWillMount: ->
    @props.client.listen (event) =>
      switch event.type
        when 'connected'
          # when the client connects update the menu
          @setState
            menuItems: @props.client._ui.menu?.items or []

  render: ->
    (div {className: 'app'},
      (MenuBar {items: @state.menuItems})
      (iframe {
        width: "100%"
        height: "100%"
        src: @props.app
      })
    )
