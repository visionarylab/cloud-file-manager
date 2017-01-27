let {div} = React.DOM;

export default React.createClass({

  displayName: 'Modal',

  watchForEscape(e) {
    if (e.keyCode === 27) {
      return __guardMethod__(this.props, 'close', o => o.close());
    }
  },

  // shadow the entire viewport behind the dialog
  getDimensions() {
    return {
      width: $(window).width() + 'px',
      height: $(window).height() + 'px'
    };
  },

  getInitialState() {
    let initialState;
    let dimensions = this.getDimensions();
    return initialState = {
      backgroundStyle: this.getBackgroundStyle(dimensions),
      contentStyle: this.getContentStyle(dimensions)
    };
  },

  getBackgroundStyle(dimensions) {
    if (this.props.zIndex) {
      return { zIndex: this.props.zIndex, width: dimensions.width, height: dimensions.height };
    } else {
      return dimensions;
    }
  },

  getContentStyle(dimensions) {
    if (this.props.zIndex) {
      return { zIndex: this.props.zIndex + 1, width: dimensions.width, height: dimensions.height };
    } else {
      return dimensions;
    }
  },

  updateStyles() {
    let dimensions = this.getDimensions();
    return this.setState({
      backgroundStyle: this.getBackgroundStyle(dimensions),
      contentStyle: this.getContentStyle(dimensions)
    });
  },

  // use bind/unbind for clients using older versions of jQuery
  componentDidMount() {
    $(window).bind('keyup', this.watchForEscape);
    return $(window).bind('resize', this.updateStyles);
  },

  componentWillUnmount() {
    $(window).unbind('keyup', this.watchForEscape);
    return $(window).unbind('resize', this.updateStyles);
  },

  render() {
    return (div({className: 'modal'},
      (div({className: 'modal-background', style: this.state.backgroundStyle})),
      (div({className: 'modal-content', style: this.state.contentStyle}, this.props.children))
    ));
  }
});

function __guardMethod__(obj, methodName, transform) {
  if (typeof obj !== 'undefined' && obj !== null && typeof obj[methodName] === 'function') {
    return transform(obj, methodName);
  } else {
    return undefined;
  }
}