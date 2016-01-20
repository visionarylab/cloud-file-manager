{div} = React.DOM

module.exports = React.createClass

  displayName: 'Modal'

  watchForEscape: (e) ->
    if e.keyCode is 27
      @props.close?()

  # shadow the entire viewport behind the dialog
  getDimensions: ->
    return { width: $(window).width() + 'px', height: $(window).height() + 'px'}

  getInitialState: ->
    return { dimensions: @getDimensions() }

  # update dimensions in state on resize
  updateDimensions: ->
    @setState { dimensions: @getDimensions() }

  # use bind/unbind for clients using older versions of jQuery
  componentDidMount: ->
    $(window).bind 'keyup', @watchForEscape
    $(window).bind 'resize', @updateDimensions

  componentWillUnmount: ->
    $(window).unbind 'keyup', @watchForEscape
    $(window).unbind 'resize', @updateDimensions

  render: ->
    (div {className: 'modal'},
      (div {className: 'modal-background', style: @state.dimensions})
      (div {className: 'modal-content'}, @props.children)
    )
