{div} = React.DOM

module.exports = React.createClass

  displayName: 'Modal'

  watchForEscape: (e) ->
    if e.keyCode is 27
      @props.close?()

  # shadow the entire viewport behind the dialog
  getDimensions: ->
    width: $(window).width() + 'px'
    height: $(window).height() + 'px'

  getInitialState: ->
    dimensions = @getDimensions()
    initialState =
      backgroundStyle: @getBackgroundStyle dimensions
      contentStyle: @getContentStyle dimensions

  getBackgroundStyle: (dimensions) ->
    if @props.zIndex
      { zIndex: @props.zIndex, width: dimensions.width, height: dimensions.height }
    else
      dimensions

  getContentStyle: (dimensions) ->
    if @props.zIndex
      { zIndex: @props.zIndex + 1, width: dimensions.width, height: dimensions.height }
    else
      dimensions

  updateStyles: ->
    dimensions = @getDimensions()
    @setState
      backgroundStyle: @getBackgroundStyle dimensions
      contentStyle: @getContentStyle dimensions

  # use bind/unbind for clients using older versions of jQuery
  componentDidMount: ->
    $(window).bind 'keyup', @watchForEscape
    $(window).bind 'resize', @updateStyles

  componentWillUnmount: ->
    $(window).unbind 'keyup', @watchForEscape
    $(window).unbind 'resize', @updateStyles

  render: ->
    (div {className: 'modal'},
      (div {className: 'modal-background', style: @state.backgroundStyle})
      (div {className: 'modal-content', style: @state.contentStyle}, @props.children)
    )
