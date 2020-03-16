{createReactClassFactory} = require '../utils/react'
{div} = React.DOM

SelectProviderDialogTab = createReactClassFactory
  displayName: 'SelectProviderDialogTab'
  render: -> (div {}, "TODO: SelectProviderDialogTab: #{@props.provider.displayName}")

module.exports = SelectProviderDialogTab
