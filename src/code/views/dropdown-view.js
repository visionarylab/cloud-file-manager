let {div, i, span, ul, li, svg, g, rect} = React.DOM;

let DropdownItem = React.createFactory(React.createClass({

  displayName: 'DropdownItem',

  clicked() {
    return this.props.select(this.props.item);
  },

  mouseEnter() {
    if (this.props.item.items) {
      let menuItem = $(ReactDOM.findDOMNode(this.refs.item));
      let menu = menuItem.parent().parent();

      return this.props.setSubMenu({
        style: {
          position: 'absolute',
          left: menu.width(),
          top: menuItem.position().top - parseInt(menuItem.css('padding-top'))
        },
        items: this.props.item.items
      });
    } else {
      return __guardMethod__(this.props, 'setSubMenu', o => o.setSubMenu(null));
    }
  },

  render() {
    let enabled = this.props.item.hasOwnProperty('enabled') ?
      typeof this.props.item.enabled === 'function' ?
        this.props.item.enabled()
      :
        this.props.item.enabled
    :
      true;

    let classes = ['menuItem'];
    if (this.props.item.separator) {
      classes.push('separator');
      return (li({className: classes.join(' ')}, ''));
    } else {
      if (!enabled || !(this.props.item.action || this.props.item.items)) { classes.push('disabled'); }
      let name = this.props.item.name || this.props.item;
      return (li({ref: 'item', className: classes.join(' '), onClick: this.clicked, onMouseEnter: this.mouseEnter },
        this.props.item.items ?
          (i({className: 'icon-inspectorArrow-collapse'})) : undefined,
        name
      ));
    }
  }
})
);

let DropDown = React.createClass({

  displayName: 'Dropdown',

  getInitialState() {
    return {
      showingMenu: false,
      timeout: null,
      subMenu: null
    };
  },

  blur() {
    this.unblur();
    let timeout = setTimeout(( () => this.setState({showingMenu: false, subMenu: false}) ), 500);
    return this.setState({timeout});
  },

  unblur() {
    if (this.state.timeout) {
      clearTimeout(this.state.timeout);
    }
    return this.setState({timeout: null});
  },

  setSubMenu(subMenu) {
    return this.setState({subMenu});
  },

  select(item) {
    if (__guard__(item, x => x.items)) { return; }
    let nextState = (!this.state.showingMenu);
    this.setState({showingMenu: nextState});
    if (!item) { return; }
    return __guardMethod__(item, 'action', o => o.action());
  },

  render() {
    let index, item;
    let menuClass = this.state.showingMenu ? 'menu-showing' : 'menu-hidden';
    let select = item => {
      return ( () => this.select(item));
    };
    return (div({className: 'menu'},
      __guard__(this.props.items, x => x.length) > 0 ?
        (div({},
          (div({className: 'menu-anchor', onClick: () => this.select(null)},
            (svg({version: '1.1', width: 16, height: 16, viewBox: '0 0 16 16', enableBackground: 'new 0 0 16 16'},
              (g({},
                (rect({y: 2, width: 16, height: 2})),
                (rect({y: 7, width: 16, height: 2})),
                (rect({y: 12, width: 16, height: 2}))
              ))
            ))
          )),
          (div({className: menuClass, onMouseLeave: this.blur, onMouseEnter: this.unblur},
            (ul({},
              (() => {
              let result = [];
              for (index = 0; index < this.props.items.length; index++) {
                item = this.props.items[index];
                result.push((DropdownItem({key: index, item, select: this.select, setSubMenu: this.setSubMenu})));
              }
              return result;
            })()
            )),
            this.state.subMenu ?
              (div({className: menuClass, style: this.state.subMenu.style},
                (ul({},
                  (() => {
                  let result1 = [];
                  for (index = 0; index < this.state.subMenu.items.length; index++) {
                    item = this.state.subMenu.items[index];
                    result1.push((DropdownItem({key: index, item, select: this.select})));
                  }
                  return result1;
                })()
                ))
              )) : undefined
          ))
      )) : undefined
    ));
  }
});

export default DropDown;

function __guardMethod__(obj, methodName, transform) {
  if (typeof obj !== 'undefined' && obj !== null && typeof obj[methodName] === 'function') {
    return transform(obj, methodName);
  } else {
    return undefined;
  }
}
function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}