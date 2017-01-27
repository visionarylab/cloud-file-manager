let {div, input, button} = React.DOM;
import tr from '../utils/translate';
import { CloudMetadata } from '../providers/provider-interface';

export default React.createClass({

  displayName: 'LocalFileListTab',

  // Standard React 'drop' event handlers are triggered after client 'drop' event handlers.
  // By explicitly installing DOM event handlers we get first crack at the 'drop' event.
  componentDidMount() {
    this.refs.dropZone.addEventListener('drop', this.drop);
  },

  componentWillUnmount() {
    this.refs.dropZone.removeEventListener('drop', this.drop);
  },

  getInitialState() {
    return {hover: false};
  },

  changed(e) {
    let { files } = e.target;
    if (files.length > 1) {
      return this.props.client.alert(tr("~LOCAL_FILE_DIALOG.MULTIPLE_FILES_SELECTED"));
    } else if (files.length === 1) {
      return this.openFile(files[0], 'select');
    }
  },

  openFile(file, via) {
    let metadata = new CloudMetadata({
      name: file.name.split('.')[0],
      type: CloudMetadata.File,
      parent: null,
      provider: this.props.provider,
      providerData: {
        file
      }
    });
    __guardMethod__(this.props.dialog, 'callback', o => o.callback(metadata, via));
    return this.props.close();
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
    e.stopPropagation();
    let droppedFiles = e.dataTransfer ? e.dataTransfer.files : e.target.files;
    if (droppedFiles.length > 1) {
      this.props.client.alert(tr("~LOCAL_FILE_DIALOG.MULTIPLE_FILES_DROPPED"));
    } else if (droppedFiles.length === 1) {
      this.openFile(droppedFiles[0], 'drop');
    }
  },

  render() {
    let dropClass = `dropArea${this.state.hover ? ' dropHover' : ''}`;
    return (div({className: 'dialogTab localFileLoad'},
      // 'drop' event handler installed as DOM event handler in componentDidMount()
      (div({ref: 'dropZone', className: dropClass, onDragEnter: this.dragEnter, onDragLeave: this.dragLeave},
        (tr("~LOCAL_FILE_DIALOG.DROP_FILE_HERE")),
        (input({type: 'file', onChange: this.changed}))
      )),
      (div({className: 'buttons'},
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