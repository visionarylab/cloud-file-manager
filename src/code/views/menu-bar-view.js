// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import DropDownView from "./dropdown-view"
import DropDownAnchor from "./dropdown-view"
import tr  from '../utils/translate'



const {div, i, span, input} = ReactDOMFactories
const Dropdown = createReactFactory(DropDownView)
const {TriangleOnlyAnchor} = DropDownAnchor


export default createReactClass({

  displayName: 'MenuBar',

  componentDidMount() {
    // need to use direct DOM events because the event needs to be captured
    if (window.addEventListener) {
      window.addEventListener('mousedown', this.checkBlur, true)
      window.addEventListener('touchstart', this.checkBlur, true)
    }

    return this.props.client._ui.listen(event => {
      switch (event.type) {
        case 'editInitialFilename':
          this.setState({
            editingFilename: true,
            editingInitialFilename: true
          })
          return setTimeout((() => this.focusFilename()), 10)
      }
    })
  },

  componentWillUnmount() {
    if (window.removeEventListener) {
      window.removeEventListener('mousedown', this.checkBlur, true)
      return window.removeEventListener('touchstart', this.checkBlur, true)
    }
  },

  getFilename(props) {
    if ((props.filename != null ? props.filename.length : undefined) > 0) { return props.filename } else { return (tr("~MENUBAR.UNTITLED_DOCUMENT")) }
  },

  getEditableFilename(props) {
    if ((props.filename != null ? props.filename.length : undefined) > 0) { return props.filename } else { return (tr("~MENUBAR.UNTITLED_DOCUMENT")) }
  },

  getInitialState() {
    return {
      editingFilename: false,
      filename: this.getFilename(this.props),
      editableFilename: this.getEditableFilename(this.props),
      initialEditableFilename: this.getEditableFilename(this.props),
      editingInitialFilename: false
    }
  },

  UNSAFE_componentWillReceiveProps(nextProps) {
    return this.setState({
      filename: this.getFilename(nextProps),
      editableFilename: this.getEditableFilename(nextProps),
      provider: nextProps.provider
    })
  },

  filenameClicked(e) {
    e.preventDefault()
    e.stopPropagation()
    this.setState({
      editingFilename: true,
      editingInitialFilename: false
    })
    return setTimeout((() => this.focusFilename()), 10)
  },

  filenameChanged() {
    return this.setState({
      editableFilename: this.filename().value})
  },

  filenameBlurred() {
    return this.rename()
  },

  filename() {
    return ReactDOM.findDOMNode(this.filenameRef)
  },

  focusFilename() {
    const el = this.filename()
    el.focus()
    return el.select()
  },

  cancelEdit() {
    return this.setState({
      editingFilename: false,
      editableFilename: (this.state.filename != null ? this.state.filename.length : undefined) > 0 ? this.state.filename : this.state.initialEditableFilename
    })
  },

  rename() {
    const filename = this.state.editableFilename.replace(/^\s+|\s+$/, '')
    if (filename.length > 0) {
      if (this.state.editingInitialFilename) {
        this.props.client.setInitialFilename(filename)
      } else {
        this.props.client.rename(this.props.client.state.metadata, filename)
      }
      return this.setState({
        editingFilename: false,
        filename,
        editableFilename: filename
      })
    } else {
      return this.cancelEdit()
    }
  },

  watchForEnter(e) {
    if (e.keyCode === 13) {
      return this.rename()
    } else if (e.keyCode === 27) {
      return this.cancelEdit()
    }
  },

  help() {
    return window.open(this.props.options.help, '_blank')
  },

  infoClicked() {
    return (typeof this.props.options.onInfoClicked === 'function' ? this.props.options.onInfoClicked(this.props.client) : undefined)
  },

  // CODAP eats the click events in the main workspace which causes the blur event not to fire so we need to check for a non-bubbling global click event when editing
  checkBlur(e) {
    if (this.state.editingFilename && (e.target !== this.filename())) { return this.filenameBlurred() }
  },

  langChanged(langCode) {
    const {client, options} = this.props
    const {onLangChanged} = options.languageMenu
    if (onLangChanged != null) {
      return client.changeLanguage(langCode, onLangChanged)
    }
  },

  renderLanguageMenu() {
    const langMenu = this.props.options.languageMenu
    const items = langMenu.options
      // Do not show current language in the menu.
      .filter(option => option.langCode !== langMenu.currentLang)
      .map(option => {
        let className
        const label = option.label || option.langCode.toUpperCase()
        if (option.flag) { className = `flag flag-${option.flag}` }
        return {
          content: (span({className: 'lang-option'}, (div({className})), label)),
          action: () => this.langChanged(option.langCode)
        }
      })

    const hasFlags = langMenu.options.filter(option => option.flag != null).length > 0
    const currentOption = langMenu.options.filter(option => option.langCode === langMenu.currentLang)[0]
    const defaultOption = hasFlags ? {flag: "us"} : {label: "English"}
    const {flag, label} = currentOption || defaultOption
    const menuAnchor = flag ?
      (div({className: `flag flag-${flag}`}))
    :
      (div({className: "lang-menu with-border"},
        (span({className: "lang-label"}, label || defaultOption.label)),
        TriangleOnlyAnchor
      ))

    return (Dropdown({
      className: "lang-menu",
      menuAnchorClassName: "menu-anchor-right",
      items,
      menuAnchor
    }))
  },

  render() {
    return (div({className: 'menu-bar'},
      (div({className: 'menu-bar-left'},
        (Dropdown({items: this.props.items})),
        this.state.editingFilename ?
          (div({className: 'menu-bar-content-filename'},
            (input({ref: (elt => { return this.filenameRef = elt }), value: this.state.editableFilename, onChange: this.filenameChanged, onKeyDown: this.watchForEnter}))
          ))
        :
          (div({className: 'menu-bar-content-filename', onClick: this.filenameClicked}, this.state.filename)),
        this.props.fileStatus ?
          (span({className: `menu-bar-file-status-${this.props.fileStatus.type}`}, this.props.fileStatus.message)) : undefined
      )),
      (div({className: 'menu-bar-right'},
        this.props.options.info ?
          (span({className: 'menu-bar-info', onClick: this.infoClicked}, this.props.options.info)) : undefined,
        (this.props.provider != null ? this.props.provider.authorized() : undefined) ?
          this.props.provider.renderUser() : undefined,
        this.props.options.help ?
          (i({style: {fontSize: "13px"}, className: 'clickable icon-help', onClick: this.help})) : undefined,
        this.props.options.languageMenu ?
          this.renderLanguageMenu() : undefined
      ))
    ))
  }
})
