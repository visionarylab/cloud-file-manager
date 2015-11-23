AuthorizeMixin =
  render: ->
    @props.provider.authorized (authorized) =>
      if authorized
        @renderWhenAuthorized()
      else
        (@props.provider.authorizationDialog {provider: @props.provider})

module.exports = AuthorizeMixin
