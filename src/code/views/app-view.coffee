MenuBar = React.createFactory require './menu-bar'

{div, iframe} = React.DOM

module.exports = React.createClass

  displayName: 'CloudFileManager'

  getFilename: ->
    if @props.client.state.metadata?.hasOwnProperty('name') then @props.client.state.metadata.name else "Untitled Document"

  getInitialState: ->
    filename: @getFilename()
    menuItems: @props.client._ui.menu?.items or []

  componentWillMount: ->
    @props.client.listen (event) =>
      @setState filename: @getFilename()

      switch event.type
        when 'connected'
          @setState menuItems: @props.client._ui.menu?.items or []

  render: ->
    (div {className: 'app'},
      (MenuBar {filename: @state.filename, items: @state.menuItems})
      (iframe {
        width: "100%"
        height: "100%"
        src: @props.app
      })
    )
