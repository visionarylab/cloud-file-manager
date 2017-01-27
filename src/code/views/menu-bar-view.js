let {div, i, span, input} = React.DOM;

let Dropdown = React.createFactory(require('./dropdown-view'));
import tr from '../utils/translate';

export default React.createClass({

  displayName: 'MenuBar',

  componentWillMount() {
    // need to use direct DOM events because the event needs to be captured
    if (window.addEventListener) {
      window.addEventListener('mousedown', this.checkBlur, true);
    }

    return this.props.client._ui.listen(event => {
      switch (event.type) {
        case 'editInitialFilename':
          this.setState({
            editingFilename: true,
            editingInitialFilename: true
          });
          return setTimeout((() => this.focusFilename()), 10);
      }
    }
    );
  },

  componentWillUnmount() {
    if (window.removeEventListener) {
      return window.removeEventListener('mousedown', this.checkBlur, true);
    }
  },

  getFilename(props) {
    if (__guard__(props.filename, x => x.length) > 0) { return props.filename; } else { return (tr("~MENUBAR.UNTITLED_DOCUMENT")); }
  },

  getEditableFilename(props) {
    if (__guard__(props.filename, x => x.length) > 0) { return props.filename; } else { return (tr("~MENUBAR.UNTITLED_DOCUMENT")); }
  },

  getInitialState() {
    let state;
    return state = {
      editingFilename: false,
      filename: this.getFilename(this.props),
      editableFilename: this.getEditableFilename(this.props),
      initialEditableFilename: this.getEditableFilename(this.props),
      editingInitialFilename: false
    };
  },

  componentWillReceiveProps(nextProps) {
    return this.setState({
      filename: this.getFilename(nextProps),
      editableFilename: this.getEditableFilename(nextProps),
      provider: nextProps.provider
    });
  },

  filenameClicked(e) {
    e.preventDefault();
    e.stopPropagation();
    this.setState({
      editingFilename: true,
      editingInitialFilename: false
    });
    return setTimeout((() => this.focusFilename()), 10);
  },

  filenameChanged() {
    return this.setState({
      editableFilename: this.filename().value});
  },

  filenameBlurred() {
    return this.rename();
  },

  filename() {
    return ReactDOM.findDOMNode(this.refs.filename);
  },

  focusFilename() {
    let el = this.filename();
    el.focus();
    return el.select();
  },

  cancelEdit() {
    return this.setState({
      editingFilename: false,
      editableFilename: __guard__(this.state.filename, x => x.length) > 0 ? this.state.filename : this.state.initialEditableFilename
    });
  },

  rename() {
    let filename = this.state.editableFilename.replace(/^\s+|\s+$/, '');
    if (filename.length > 0) {
      if (this.state.editingInitialFilename) {
        this.props.client.setInitialFilename(filename);
      } else {
        this.props.client.rename(this.props.client.state.metadata, filename);
      }
      return this.setState({
        editingFilename: false,
        filename,
        editableFilename: filename
      });
    } else {
      return this.cancelEdit();
    }
  },

  watchForEnter(e) {
    if (e.keyCode === 13) {
      return this.rename();
    } else if (e.keyCode === 27) {
      return this.cancelEdit();
    }
  },

  help() {
    return window.open(this.props.options.help, '_blank');
  },

  // CODAP eats the click events in the main workspace which causes the blur event not to fire so we need to check for a non-bubbling global click event when editing
  checkBlur(e) {
    if (this.state.editingFilename && (e.target !== this.filename())) { return this.filenameBlurred(); }
  },

  render() {
    return (div({className: 'menu-bar'},
      (div({className: 'menu-bar-left'},
        (Dropdown({items: this.props.items})),
        this.state.editingFilename ?
          (div({className:'menu-bar-content-filename'},
            (input({ref: 'filename', value: this.state.editableFilename, onChange: this.filenameChanged, onKeyDown: this.watchForEnter}))
          ))
        :
          (div({className:'menu-bar-content-filename', onClick: this.filenameClicked}, this.state.filename)),
        this.props.fileStatus ?
          (span({className: `menu-bar-file-status-${this.props.fileStatus.type}`}, this.props.fileStatus.message)) : undefined
      )),
      (div({className: 'menu-bar-right'},
        this.props.options.info ?
          (span({className: 'menu-bar-info'}, this.props.options.info)) : undefined,
        __guard__(this.props.provider, x => x.authorized()) ?
          this.props.provider.renderUser() : undefined,
        this.props.options.help ?
          (i({style: {fontSize: "13px"}, className: 'clickable icon-help', onClick: this.help})) : undefined
      ))
    ));
  }
});

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}