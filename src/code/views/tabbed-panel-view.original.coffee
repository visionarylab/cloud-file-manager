{div, ul, li, a} = ReactDOMFactories

class TabInfo
  constructor: (settings={}) ->
    {@label, @component, @capability, @onSelected} = settings

Tab = createReactClassFactory

  displayName: 'TabbedPanelTab'

  clicked: (e) ->
    e.preventDefault()
    @props.onSelected @props.index

  render: ->
    classname = if @props.selected then 'tab-selected' else ''
    (li {className: classname, onClick: @clicked}, @props.label)

module.exports = createReactClass

  displayName: 'TabbedPanelView'

  getInitialState: ->
    selectedTabIndex: @props.selectedTabIndex or 0

  componentDidMount: ->
    @props.tabs[@state.selectedTabIndex].onSelected?(@props.tabs[@state.selectedTabIndex].capability)

  statics:
    Tab: (settings) -> new TabInfo settings

  selectedTab: (index) ->
    @props.tabs[index].onSelected?(@props.tabs[index].capability)
    @setState selectedTabIndex: index

  renderTab: (tab, index) ->
    (Tab
      label: tab.label
      key: index
      index: index
      selected: (index is @state.selectedTabIndex)
      onSelected: @selectedTab
    )

  renderTabs: ->
    (div {className: 'workspace-tabs'},
      (ul {key: index}, @renderTab(tab, index) for tab, index in @props.tabs)
    )

  renderSelectedPanel: ->
    (div {className: 'workspace-tab-component'},
      for tab, index in @props.tabs
        (div {
          key: index
          style:
            display: if index is @state.selectedTabIndex then 'block' else 'none'
          },
          tab.component
        )
    )

  render: ->
    (div {className: "tabbed-panel"},
      @renderTabs()
      @renderSelectedPanel()
    )
