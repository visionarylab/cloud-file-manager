/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const {div, input, button} = ReactDOMFactories;
const tr = require('../utils/translate');

module.exports = createReactClass({

  displayName: 'UrlTab',

  getInitialState() {
    return {hover: false};
  },

  importUrl(url, via) {
    if (typeof this.props.dialog.callback === 'function') {
      this.props.dialog.callback(url, via);
    }
    return this.props.close();
  },

  import() {
    const url = $.trim(ReactDOM.findDOMNode(this.urlRef).value);
    if (url.length === 0) {
      return this.props.client.alert(tr("~IMPORT_URL.PLEASE_ENTER_URL"));
    } else {
      return this.importUrl(url, 'select');
    }
  },

  cancel() {
    return this.props.close();
  },

  dragEnter(e) {
    e.preventDefault();
    return this.setState({hover: true});
  },

  dragLeave(e) {
    e.preventDefault();
    return this.setState({hover: false});
  },

  drop(e) {
    e.preventDefault();
    if (e.dataTransfer) {
      const droppedUrls = (e.dataTransfer.getData('url') || e.dataTransfer.getData('text/uri-list') || '').split('\n');
      if (droppedUrls.length > 1) {
        return this.props.client.alert(tr("~IMPORT_URL.MULTIPLE_URLS_DROPPED"));
      } else if (droppedUrls.length === 1) {
        return this.importUrl(droppedUrls[0], 'drop');
      }
    }
  },

  render() {
    const dropClass = `urlDropArea${this.state.hover ? ' dropHover' : ''}`;
    return (div({className: 'dialogTab urlImport'},
      (div({className: dropClass, onDragEnter: this.dragEnter, onDragLeave: this.dragLeave, onDrop: this.drop},
        (tr("~URL_TAB.DROP_URL_HERE"))
      )),
      (input({ref: (elt => { return this.urlRef = elt; }), placeholder: 'URL'})),
      (div({className: 'buttons'},
        (button({onClick: this.import}, (tr("~URL_TAB.IMPORT")))),
        (button({onClick: this.cancel}, (tr("~FILE_DIALOG.CANCEL"))))
      ))
    ));
  }
});
