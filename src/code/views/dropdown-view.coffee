{div, i, span, ul, li, svg, g, rect} = React.DOM

DropdownItem = React.createFactory React.createClass

  displayName: 'DropdownItem'

  clicked: ->
    if @props.item.items
      @showSubMenu()
    else
      @props.select @props.item

  mouseEnter: ->
    @showSubMenu()

  showSubMenu: ->
    if @props.item.items
      menuItem = $ ReactDOM.findDOMNode @refs.item
      menu = menuItem.parent().parent()

      @props.setSubMenu
        style:
          position: 'absolute'
          left: menu.width()
          top: menuItem.position().top - parseInt(menuItem.css('padding-top'))
        items: @props.item.items
    else
      @props.setSubMenu? null

  render: ->
    enabled = if @props.item.hasOwnProperty 'enabled'
      if typeof @props.item.enabled is 'function'
        @props.item.enabled()
      else
        @props.item.enabled
    else
      true

    classes = ['menuItem']
    if @props.item.separator
      classes.push 'separator'
      (li {className: classes.join(' ')}, '')
    else
      classes.push 'disabled' if not enabled or not (@props.item.action or @props.item.items)
      name = @props.item.name or @props.item
      (li {ref: 'item', className: classes.join(' '), onClick: @clicked, onMouseEnter: @mouseEnter },
        if @props.item.items
          (i {className: 'icon-inspectorArrow-collapse'})
        name
      )

cfmMenuClass = 'cfm-menu dg-wants-touch'

DropDown = React.createClass

  displayName: 'Dropdown'

  getInitialState: ->
    showingMenu: false
    subMenu: null

  componentWillMount: ->
    if window.addEventListener
      window.addEventListener 'mousedown', @checkClose, true
      window.addEventListener 'touchstart', @checkClose, true

  componentWillUnmount: ->
    if window.removeEventListener
      window.removeEventListener 'mousedown', @checkClose, true
      window.removeEventListener 'touchstart', @checkClose, true

  checkClose: (evt) ->
    # no need to walk the DOM if the menu isn't open
    return if not @state.showingMenu
    # if the click is on the menu, let the menu handle it
    elt = evt.target
    while elt?
      return if typeof elt.className is "string" and elt.className.indexOf(cfmMenuClass) >= 0
      elt = elt.parentNode
    # otherwise, close the menu
    @setState {showingMenu: false, subMenu: false}

  setSubMenu: (subMenu) ->
    @setState subMenu: subMenu

  select: (item) ->
    return if item?.items
    nextState = (not @state.showingMenu)
    @setState {showingMenu: nextState}
    return unless item
    item.action?()

  render: ->
    menuClass = "#{cfmMenuClass} #{if @state.showingMenu then 'menu-showing' else 'menu-hidden'}"
    select = (item) =>
      ( => @select(item))
    (div {className: 'menu'},
      if @props.items?.length > 0
        (div {},
          (div {className: "#{cfmMenuClass} menu-anchor", onClick: => @select(null)},
            (svg {version: '1.1', width: 16, height: 16, viewBox: '0 0 16 16', enableBackground: 'new 0 0 16 16'},
              (g {},
                (rect {y: 2, width: 16, height: 2})
                (rect {y: 7, width: 16, height: 2})
                (rect {y: 12, width: 16, height: 2})
              )
            )
          )
          (div {className: menuClass},
            (ul {},
              (DropdownItem {key: index, item: item, select: @select, setSubMenu: @setSubMenu}) for item, index in @props.items
            )
            if @state.subMenu
              (div {className: menuClass, style: @state.subMenu.style},
                (ul {},
                  (DropdownItem {key: index, item: item, select: @select}) for item, index in @state.subMenu.items
                )
              )
          )
      )
    )

module.exports = DropDown
