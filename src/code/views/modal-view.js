// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const {div} = ReactDOMFactories;

module.exports = createReactClass({

  displayName: 'Modal',

  watchForEscape(e) {
    if (e.keyCode === 27) {
      return (typeof this.props.close === 'function' ? this.props.close() : undefined);
    }
  },

  // shadow the entire viewport behind the dialog
  getDimensions() {
    return {
      width: '100vw',
      height: '100vh'
    };
  },

  getInitialState() {
    let initialState;
    const dimensions = this.getDimensions();
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
    const dimensions = this.getDimensions();
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
