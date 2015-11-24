AuthorizeMixin =
  getInitialState: ->
    authorized: false

  componentWillMount: ->
    @props.provider.authorized (authorized) =>
      @setState authorized: authorized

  render: ->
    if @state.authorized
      @renderWhenAuthorized()
    else
      (@props.provider.authorizationDialog {provider: @props.provider})

module.exports = AuthorizeMixin
