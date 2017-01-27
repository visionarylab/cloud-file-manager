let {div, ul, li, a} = React.DOM;

class TabInfo {
  constructor(settings) {
    if (settings == null) { settings = {}; }
    ({label: this.label, component: this.component, capability: this.capability, onSelected: this.onSelected} = settings);
  }
}

let Tab = React.createFactory(React.createClass({

  displayName: 'TabbedPanelTab',

  clicked(e) {
    e.preventDefault();
    return this.props.onSelected(this.props.index);
  },

  render() {
    let classname = this.props.selected ? 'tab-selected' : '';
    return (li({className: classname, onClick: this.clicked}, this.props.label));
  }
})
);

export default React.createClass({

  displayName: 'TabbedPanelView',

  getInitialState() {
    return {selectedTabIndex: this.props.selectedTabIndex || 0};
  },

  componentDidMount() {
    return __guardMethod__(this.props.tabs[this.state.selectedTabIndex], 'onSelected', o => o.onSelected(this.props.tabs[this.state.selectedTabIndex].capability));
  },

  statics: {
    Tab(settings) { return new TabInfo(settings); }
  },

  selectedTab(index) {
    __guardMethod__(this.props.tabs[index], 'onSelected', o => o.onSelected(this.props.tabs[index].capability));
    return this.setState({selectedTabIndex: index});
  },

  renderTab(tab, index) {
    return (Tab({
      label: tab.label,
      key: index,
      index,
      selected: (index === this.state.selectedTabIndex),
      onSelected: this.selectedTab
    }));
  },

  renderTabs() {
    return (div({className: 'workspace-tabs'},
      (Array.from(this.props.tabs).map((tab, index) => ul({key: index}, this.renderTab(tab, index))))
    ));
  },

  renderSelectedPanel() {
    return (div({className: 'workspace-tab-component'},
      Array.from(this.props.tabs).map((tab, index) =>
        (div({
          key: index,
          style: {
            display: index === this.state.selectedTabIndex ? 'block' : 'none'
          }
          },
          tab.component
        )))
    ));
  },

  render() {
    return (div({className: "tabbed-panel"},
      this.renderTabs(),
      this.renderSelectedPanel()
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