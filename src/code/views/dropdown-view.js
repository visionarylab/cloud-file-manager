// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const {div, i, ul, li} = ReactDOMFactories

import { DefaultAnchor } from './dropdown-anchors'
const DropdownItem = createReactClassFactory({
  displayName: 'DropdownItem',

  clicked() {
    if (this.props.item.items) {
      return this.showSubMenu()
    } else {
      return this.props.select(this.props.item)
    }
  },

  mouseEnter() {
    return this.showSubMenu()
  },

  showSubMenu() {
    if (this.props.item.items) {
      const menuItem = $(ReactDOM.findDOMNode(this.itemRef))
      const menu = menuItem.parent().parent()

      return this.props.setSubMenu({
        style: {
          position: 'absolute',
          left: menu.width(),
          top: menuItem.position().top - parseInt(menuItem.css('padding-top'))
        },
        items: this.props.item.items
      })
    } else {
      return (typeof this.props.setSubMenu === 'function' ? this.props.setSubMenu(null) : undefined)
    }
  },

  render() {
    const enabled = this.props.item.hasOwnProperty('enabled') ?
      typeof this.props.item.enabled === 'function' ?
        this.props.item.enabled()
      :
        this.props.item.enabled
    :
      true

    const classes = ['menuItem']
    if (this.props.item.separator) {
      classes.push('separator')
      return (li({className: classes.join(' ')}, ''))
    } else {
      if (!enabled || !(this.props.item.action || this.props.item.items)) { classes.push('disabled') }
      const content = this.props.item.name || this.props.item.content || this.props.item
      return (li({ref: (elt => { return this.itemRef = elt }), className: classes.join(' '), onClick: this.clicked, onMouseEnter: this.mouseEnter },
        this.props.item.items ?
          (i({className: 'icon-inspectorArrow-collapse'})) : undefined,
        content
      ))
    }
  }
})

const cfmMenuClass = 'cfm-menu dg-wants-touch'

const DropDown = createReactClass({

  displayName: 'Dropdown',

  getInitialState() {
    return {
      showingMenu: false,
      subMenu: null
    }
  },

  componentDidMount() {
    if (window.addEventListener) {
      window.addEventListener('mousedown', this.checkClose, true)
      return window.addEventListener('touchstart', this.checkClose, true)
    }
  },

  componentWillUnmount() {
    if (window.removeEventListener) {
      window.removeEventListener('mousedown', this.checkClose, true)
      return window.removeEventListener('touchstart', this.checkClose, true)
    }
  },

  checkClose(evt) {
    // no need to walk the DOM if the menu isn't open
    if (!this.state.showingMenu) { return }
    // if the click is on the menu, let the menu handle it
    let elt = evt.target
    while (elt != null) {
      if ((typeof elt.className === "string") && (elt.className.indexOf(cfmMenuClass) >= 0)) { return }
      elt = elt.parentNode
    }
    // otherwise, close the menu
    return this.setState({showingMenu: false, subMenu: false})
  },

  setSubMenu(subMenu) {
    return this.setState({subMenu})
  },

  select(item) {
    if (item != null ? item.items : undefined) { return }
    const nextState = (!this.state.showingMenu)
    this.setState({showingMenu: nextState})
    if (!item) { return }
    return (typeof item.action === 'function' ? item.action() : undefined)
  },

  render() {
    let index, item
    const menuClass = `${cfmMenuClass} ${this.state.showingMenu ? 'menu-showing' : 'menu-hidden'}`
    const dropdownClass = `menu ${this.props.className ? this.props.className : ''}`
    const menuAnchorClass = `menu-anchor ${this.props.menuAnchorClassName ? this.props.menuAnchorClassName : ''}`
    return (div({className: dropdownClass},
      (this.props.items != null ? this.props.items.length : undefined) > 0 ?
        (div({},
          (div({className: `${cfmMenuClass} ${menuAnchorClass}`, onClick: () => this.select(null)},
            this.props.menuAnchor ?
              this.props.menuAnchor
            :
              DefaultAnchor
          )),
          (div({className: menuClass},
            (ul({},
              (() => {
              const result = []
              for (index = 0; index < this.props.items.length; index++) {
                item = this.props.items[index]
                result.push((DropdownItem({key: index, item, select: this.select, setSubMenu: this.setSubMenu})))
              }
              return result
            })()
            )),
            this.state.subMenu ?
              (div({className: menuClass, style: this.state.subMenu.style},
                (ul({},
                  (() => {
                  const result1 = []
                  for (index = 0; index < this.state.subMenu.items.length; index++) {
                    item = this.state.subMenu.items[index]
                    result1.push((DropdownItem({key: index, item, select: this.select})))
                  }
                  return result1
                })()
                ))
              )) : undefined
          ))
      )) : undefined
    ))
  }
})

export default DropDown
