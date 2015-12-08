{div, i, span, ul, li, svg, g, rect} = React.DOM

DropdownItem = React.createFactory React.createClass

  displayName: 'DropdownItem'

  clicked: ->
    @props.select @props.item

  mouseEnter: ->
    if @props.item.items
      menuItem = $ React.findDOMNode @refs.item
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
        name
        if @props.item.items
          (i {className: 'icon-inspectorArrow-collapse'})
      )

DropDown = React.createClass

  displayName: 'Dropdown'

  getInitialState: ->
    showingMenu: false
    timeout: null
    subMenu: null

  blur: ->
    @unblur()
    timeout = setTimeout ( => @setState {showingMenu: false, subMenu: false} ), 500
    @setState {timeout: timeout}

  unblur: ->
    if @state.timeout
      clearTimeout(@state.timeout)
    @setState {timeout: null}

  setSubMenu: (subMenu) ->
    @setState subMenu: subMenu

  select: (item) ->
    return if item?.items
    nextState = (not @state.showingMenu)
    @setState {showingMenu: nextState}
    return unless item
    item.action?()

  render: ->
    menuClass = if @state.showingMenu then 'menu-showing' else 'menu-hidden'
    select = (item) =>
      ( => @select(item))
    (div {className: 'menu'},
      (div {className: 'menu-anchor', onClick: => @select(null)},
        (svg {version: '1.1', width: 16, height: 16, viewBox: '0 0 16 16', enableBackground: 'new 0 0 16 16'},
          (g {},
            (rect {y: 2, width: 16, height: 2})
            (rect {y: 7, width: 16, height: 2})
            (rect {y: 12, width: 16, height: 2})
          )
        )
      )
      if @props.items?.length > 0
        (div {className: menuClass, onMouseLeave: @blur, onMouseEnter: @unblur},
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

module.exports = DropDown
