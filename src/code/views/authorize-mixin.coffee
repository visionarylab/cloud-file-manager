AuthorizeMixin =
  getInitialState: ->
    _isAuthorized = false
    authorized: false

  # The constraints here are somewhat subtle. We want to try to
  # determine whether the user is authorized before the first render,
  # because authorization status can affect rendering. Thus, we want
  # to perform the check in componentWillMount(). Some providers
  # can/will respond immediately, either because they don't require
  # authorization or because they are already authorized. Unfortunately,
  # setState() can't be called in componentWillMount(), so if we get
  # an immediate response, we need to store it in an instance variable.
  # Then in componentDidMount(), we can propagate the instance variable
  # to the state via a call to setState(). Some providers will need to
  # make an asynchronous call to determine authorization status. This
  # call may complete before or after the first render, i.e. before or
  # after the componentDidMount() method. Once the component is mounted,
  # the call to setState() is required to set the state and trigger a
  # re-render. In the end we need to maintain both the instance variable
  # and the state to track the authorization status, render the appropriate
  # authorization status, and re-render when authorization status changes.

  componentWillMount: ->
    # Check for authorization before the first render. Providers that
    # don't require authorization or are already authorized will respond
    # immediately, but since the component isn't mounted yet we can't
    # call setState, so we set an instance variable and update state
    # in componentDidMount(). Providers that require asynchronous checks
    # for authorization may return before or after the first render, so
    # code should be prepared for either eventuality.
    @props.provider.authorized (authorized) =>
      # always set the instance variable
      @_isAuthorized = authorized
      # set the state if we can
      if @_isMounted
        @setState authorized: authorized

  componentDidMount: ->
    @_isMounted = true
    # synchronize state if necessary
    if @state.authorized isnt @_isAuthorized
      @setState authorized: @_isAuthorized

  componentWillUnmount: ->
    @_isMounted = false

  render: ->
    if @_isAuthorized or @state.authorized
      @renderWhenAuthorized()
    else
      @props.provider.renderAuthorizationDialog()

module.exports = AuthorizeMixin
