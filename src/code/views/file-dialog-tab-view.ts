import AuthorizeMixin from './authorize-mixin';
import { CloudMetadata } from '../providers/provider-interface';

import tr from '../utils/translate';

let {div, img, i, span, input, button} = React.DOM;

let FileListFile = React.createFactory(React.createClass({
  displayName: 'FileListFile',

  componentWillMount() {
    return this.lastClick = 0;
  },

  fileSelected(e) {
    e.preventDefault();
    e.stopPropagation();
    let now = (new Date()).getTime();
    this.props.fileSelected(this.props.metadata);
    if ((now - this.lastClick) <= 250) {
      this.props.fileConfirmed();
    }
    return this.lastClick = now;
  },

  render() {
    let selectableClass = this.props.metadata.type !== CloudMetadata.Label ? 'selectable' : '';
    let selectedClass = this.props.selected ? 'selected' : '';
    let subFolderClass = this.props.isSubFolder ? 'subfolder' : '';
    return (div({className: `${selectableClass} ${selectedClass} ${subFolderClass}`
          , title: this.props.metadata.description || undefined
          , onClick: this.props.metadata.type !== CloudMetadata.Label ? this.fileSelected : undefined },
      (React.DOM.i({className: (() => {
        if (this.props.metadata.type === CloudMetadata.Folder) { return 'icon-inspectorArrow-collapse'; } else if (this.props.metadata.type === CloudMetadata.File) { return 'icon-noteTool'; }
      })()})),
      this.props.metadata.name
    ));
  }
})
);

let FileList = React.createFactory(React.createClass({
  displayName: 'FileList',

  getInitialState() {
    return {loading: true};
  },

  componentDidMount() {
    this._isMounted = true;
    return this.load(this.props.folder);
  },

  componentWillReceiveProps(nextProps) {
    if (nextProps.folder !== this.props.folder) {
      return this.load(nextProps.folder);
    }
  },

  componentWillUnmount() {
    return this._isMounted = false;
  },

  load(folder) {
    return this.props.provider.list(folder, (err, list) => {
      if (err) { return this.props.client.alert(err); }
      // asynchronous callback may be called after dialog has been dismissed
      if (this._isMounted) {
        this.setState({
          loading: false});
      }
      return this.props.listLoaded(list);
    }
    );
  },

  parentSelected(e) {
    return this.props.fileSelected(__guard__(this.props.folder, x => x.parent));
  },

  render() {
    let list = [];
    let isSubFolder = (this.props.folder != null);
    if (isSubFolder) {
      list.push((div({key: 'parent', className: 'selectable', onClick: this.parentSelected}, (React.DOM.i({className: 'icon-paletteArrow-collapse'})), this.props.folder.name)));
    }
    for (i = 0; i < this.props.list.length; i++) {
      let metadata = this.props.list[i];
      list.push((FileListFile({key: i, metadata, selected: this.props.selectedFile === metadata, fileSelected: this.props.fileSelected, fileConfirmed: this.props.fileConfirmed, isSubFolder})));
    }

    return (div({className: 'filelist'},
      this.state.loading ?
        tr("~FILE_DIALOG.LOADING")
      :
        list
    ));
  }
})
);

let FileDialogTab = React.createClass({
  displayName: 'FileDialogTab',

  mixins: [AuthorizeMixin],

  getInitialState() {
    let initialState = this.getStateForFolder(__guard__(this.props.client.state.metadata, x => x.parent), true) || null;
    initialState.filename = __guard__(initialState.metadata, x1 => x1.name) || '';
    return initialState;
  },

  componentDidMount() {
    return this._isMounted = true;
  },

  componentWillUnmount() {
    return this._isMounted = false;
  },

  isOpen() {
    return this.props.dialog.action === 'openFile';
  },

  filenameChanged(e) {
    let filename = e.target.value;
    return this.setState({
      filename,
      metadata: this.findMetadata(filename, this.state.list)
    });
  },

  listLoaded(list) {
    // asynchronous callback may be called after dialog has been dismissed
    if (this._isMounted) {
      return this.setState({list});
    }
  },

  getSaveMetadata() {
    // The save metadata for a file that may have been opened from another
    // provider must be cloned, but without cloning the provider field.
    // Furthermore, if the provider has changed, the provider and providerData
    // fields should be cleared.
    let saveMetadata = this.props.client.state.metadata ? _.clone(this.props.client.state.metadata) : null;
    if (saveMetadata) {
      if (this.props.provider === saveMetadata.provider) {
        saveMetadata.providerData = _.cloneDeep(saveMetadata.providerData);
      } else {
        saveMetadata.provider = null;
        saveMetadata.providerData = null;
        saveMetadata.forceSaveDialog = false;
      }
    }
    return saveMetadata;
  },

  getStateForFolder(folder, initialFolder) {
    let metadata = this.isOpen() ? __guard__(this.state, x => x.metadata) || null : this.getSaveMetadata();

    if (initialFolder && (__guard__(this.props.client.state.metadata, x1 => x1.provider) !== this.props.provider)) {
      folder = null;
    } else {
      __guard__(metadata, x2 => x2.parent = folder);
    }

    return {
      folder,
      metadata,
      list: []
    };
  },

  fileSelected(metadata) {
    if (__guard__(metadata, x => x.type) === CloudMetadata.Folder) {
      return this.setState(this.getStateForFolder(metadata));
    } else if (__guard__(metadata, x1 => x1.type) === CloudMetadata.File) {
      return this.setState({
        filename: metadata.name,
        metadata
      });
    } else {
      return this.setState(this.getStateForFolder(null));
    }
  },

  confirm() {
    let confirmed = metadata => {
      // ensure the metadata provider is the currently-showing tab
      this.state.metadata = metadata;
      if (this.state.metadata.provider !== this.props.provider) {
        this.state.metadata.provider = this.props.provider;
        // if switching provider, then clear providerData
        this.state.metadata.providerData = {};
      }
      __guardMethod__(this.props.dialog, 'callback', o => o.callback(this.state.metadata));
      return this.props.close();
    };

    let filename = $.trim(this.state.filename);
    let existingMetadata = this.findMetadata(filename, this.state.list);
    let metadata = this.state.metadata || existingMetadata;

    if (metadata) {
      if (this.isOpen()) {
        return confirmed(metadata);
      } else if (existingMetadata) {
        return this.props.client.confirm(`Are you sure you want to overwrite ${existingMetadata.name}?`, () => confirmed(existingMetadata));
      } else {
        return confirmed(metadata);
      }
    } else if (this.isOpen()) {
      return this.props.client.alert(`${filename} not found`);
    } else {
      return confirmed(new CloudMetadata({
        name: filename,
        type: CloudMetadata.File,
        parent: this.state.folder || null,
        provider: this.props.provider
      })
      );
    }
  },

  remove() {
    if (this.state.metadata && (this.state.metadata.type !== CloudMetadata.Folder)) {
      return this.props.client.confirm(tr("~FILE_DIALOG.REMOVE_CONFIRM", {filename: this.state.metadata.name}), () => {
        return this.props.provider.remove(this.state.metadata, err => {
          if (!err) {
            this.props.client.alert(tr("~FILE_DIALOG.REMOVED_MESSAGE", {filename: this.state.metadata.name}), tr("~FILE_DIALOG.REMOVED_TITLE"));
            let list = this.state.list.slice(0);
            let index = list.indexOf(this.state.metadata);
            list.splice(index, 1);
            return this.setState({
              list,
              metadata: null,
              filename: ''
            });
          }
        }
        );
      }
      );
    }
  },

  cancel() {
    return this.props.close();
  },

  findMetadata(filename, list) {
    for (let metadata of Array.from(list)) {
      if (metadata.name === filename) {
        return metadata;
      }
    }
    return null;
  },

  watchForEnter(e) {
    if ((e.keyCode === 13) && !this.confirmDisabled()) {
      return this.confirm();
    }
  },

  confirmDisabled() {
    return (this.state.filename.length === 0) || (this.isOpen() && !this.state.metadata);
  },

  renderWhenAuthorized() {
    let confirmDisabled = this.confirmDisabled();
    let removeDisabled = (this.state.metadata === null) || (this.state.metadata.type === CloudMetadata.Folder);

    return (div({className: 'dialogTab'},
      (input({type: 'text', value: this.state.filename, placeholder: (tr("~FILE_DIALOG.FILENAME")), onChange: this.filenameChanged, onKeyDown: this.watchForEnter})),
      (FileList({provider: this.props.provider, folder: this.state.folder, selectedFile: this.state.metadata, fileSelected: this.fileSelected, fileConfirmed: this.confirm, list: this.state.list, listLoaded: this.listLoaded, client: this.props.client})),
      (div({className: 'buttons'},
        (button({onClick: this.confirm, disabled: confirmDisabled, className: confirmDisabled ? 'disabled' : ''}, this.isOpen() ? (tr("~FILE_DIALOG.OPEN")) : (tr("~FILE_DIALOG.SAVE")))),
        this.props.provider.can('remove') ?
          (button({onClick: this.remove, disabled: removeDisabled, className: removeDisabled ? 'disabled' : ''}, (tr("~FILE_DIALOG.REMOVE")))) : undefined,
        (button({onClick: this.cancel}, (tr("~FILE_DIALOG.CANCEL"))))
      ))
    ));
  }
});

export default FileDialogTab;

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}
function __guardMethod__(obj, methodName, transform) {
  if (typeof obj !== 'undefined' && obj !== null && typeof obj[methodName] === 'function') {
    return transform(obj, methodName);
  } else {
    return undefined;
  }
}