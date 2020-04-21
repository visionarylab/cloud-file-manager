/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const AuthorizeMixin = require('./authorize-mixin');
const { CloudMetadata } = (require('../providers/provider-interface'));

const tr = require('../utils/translate');

let {div, img, i, span, input, button} = ReactDOMFactories;
const italic = i;

const FileListFile = createReactClassFactory({
  displayName: 'FileListFile',

  componentDidMount() {
    return this.lastClick = 0;
  },

  fileSelected(e) {
    e.preventDefault();
    e.stopPropagation();
    const now = (new Date()).getTime();
    this.props.fileSelected(this.props.metadata);
    if ((now - this.lastClick) <= 250) {
      this.props.fileConfirmed();
    }
    return this.lastClick = now;
  },

  render() {
    const selectableClass = this.props.metadata.type !== CloudMetadata.Label ? 'selectable' : '';
    const selectedClass = this.props.selected ? 'selected' : '';
    const subFolderClass = this.props.isSubFolder ? 'subfolder' : '';
    return (div({className: `${selectableClass} ${selectedClass} ${subFolderClass}`
          , title: this.props.metadata.description || undefined
          , onClick: this.props.metadata.type !== CloudMetadata.Label ? this.fileSelected : undefined },
      (italic({className: (() => {
        if (this.props.metadata.type === CloudMetadata.Folder) { return 'icon-inspectorArrow-collapse'; } else if (this.props.metadata.type === CloudMetadata.File) { return 'icon-noteTool'; }
      })()})),
      this.props.metadata.name
    ));
  }
});

const FileList = createReactClassFactory({
  displayName: 'FileList',

  getInitialState() {
    return {loading: true};
  },

  componentDidMount() {
    this._isMounted = true;
    return this.load(this.props.folder);
  },

  UNSAFE_componentWillReceiveProps(nextProps) {
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
    });
  },

  parentSelected(e) {
    return this.props.fileSelected(this.props.folder != null ? this.props.folder.parent : undefined);
  },

  render() {
    const list = [];
    const isSubFolder = (this.props.folder != null);
    if (isSubFolder) {
      list.push((div({key: 'parent', className: 'selectable', onClick: this.parentSelected}, (italic({className: 'icon-paletteArrow-collapse'})), this.props.folder.name)));
    }
    for (i = 0; i < this.props.list.length; i++) {
      const metadata = this.props.list[i];
      list.push((FileListFile({key: i, metadata, selected: this.props.selectedFile === metadata, fileSelected: this.props.fileSelected, fileConfirmed: this.props.fileConfirmed, isSubFolder})));
    }

    return (div({className: 'filelist'},
      this.state.loading ?
        tr("~FILE_DIALOG.LOADING")
      :
        list
    ));
  }
});

const FileDialogTab = createReactClass({
  displayName: 'FileDialogTab',

  mixins: [AuthorizeMixin],

  getInitialState() {
    this._isMounted = true;
    const initialState = this.getStateForFolder(this.props.client.state.metadata != null ? this.props.client.state.metadata.parent : undefined, true) || null;
    initialState.filename = (initialState.metadata != null ? initialState.metadata.name : undefined) || '';
    return initialState;
  },

//  componentDidMount: ->
//    @_isMounted = true

  componentWillUnmount() {
    return this._isMounted = false;
  },

  isOpen() {
    return this.props.dialog.action === 'openFile';
  },

  filenameChanged(e) {
    const filename = e.target.value;
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
    const saveMetadata = this.props.client.state.metadata ? _.clone(this.props.client.state.metadata) : null;
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
    const metadata = this.isOpen() ? (this.state != null ? this.state.metadata : undefined) || null : this.getSaveMetadata();

    if (initialFolder && ((this.props.client.state.metadata != null ? this.props.client.state.metadata.provider : undefined) !== this.props.provider)) {
      folder = null;
    } else {
      if (metadata != null) {
        metadata.parent = folder;
      }
    }

    return {
      folder,
      metadata,
      list: []
    };
  },

  fileSelected(metadata) {
    if ((metadata != null ? metadata.type : undefined) === CloudMetadata.Folder) {
      return this.setState(this.getStateForFolder(metadata));
    } else if ((metadata != null ? metadata.type : undefined) === CloudMetadata.File) {
      return this.setState({
        filename: metadata.name,
        metadata
      });
    } else {
      return this.setState(this.getStateForFolder(null));
    }
  },

  confirm() {
    const confirmed = metadata => {
      // ensure the metadata provider is the currently-showing tab
      this.state.metadata = metadata;
      if (this.state.metadata.provider !== this.props.provider) {
        this.state.metadata.provider = this.props.provider;
        // if switching provider, then clear providerData
        this.state.metadata.providerData = {};
      }
      if (typeof this.props.dialog.callback === 'function') {
        this.props.dialog.callback(this.state.metadata);
      }
      return this.props.close();
    };

    const filename = $.trim(this.state.filename);
    const existingMetadata = this.findMetadata(filename, this.state.list);
    const metadata = this.state.metadata || existingMetadata;

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
            const list = this.state.list.slice(0);
            const index = list.indexOf(this.state.metadata);
            list.splice(index, 1);
            return this.setState({
              list,
              metadata: null,
              filename: ''
            });
          }
        });
      });
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
    const confirmDisabled = this.confirmDisabled();
    const removeDisabled = (this.state.metadata === null) || (this.state.metadata.type === CloudMetadata.Folder);

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

module.exports = FileDialogTab;
