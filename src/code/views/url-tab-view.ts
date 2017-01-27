let {div, input, button} = React.DOM;
import tr from '../utils/translate';

export default React.createClass({

  displayName: 'UrlTab',

  getInitialState() {
    return {hover: false};
  },

  importUrl(url, via) {
    __guardMethod__(this.props.dialog, 'callback', o => o.callback(url, via));
    return this.props.close();
  },

  import() {
    let url = $.trim(ReactDOM.findDOMNode(this.refs.url).value);
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
      let droppedUrls = (e.dataTransfer.getData('url') || e.dataTransfer.getData('text/uri-list') || '').split('\n');
      if (droppedUrls.length > 1) {
        return this.props.client.alert(tr("~IMPORT_URL.MULTIPLE_URLS_DROPPED"));
      } else if (droppedUrls.length === 1) {
        return this.importUrl(droppedUrls[0], 'drop');
      }
    }
  },

  render() {
    let dropClass = `urlDropArea${this.state.hover ? ' dropHover' : ''}`;
    return (div({className: 'dialogTab urlImport'},
      (div({className: dropClass, onDragEnter: this.dragEnter, onDragLeave: this.dragLeave, onDrop: this.drop},
        (tr("~URL_TAB.DROP_URL_HERE"))
      )),
      (input({ref: 'url', placeholder: 'URL'})),
      (div({className: 'buttons'},
        (button({onClick: this.import}, (tr("~URL_TAB.IMPORT")))),
        (button({onClick: this.cancel}, (tr("~FILE_DIALOG.CANCEL"))))
      ))
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