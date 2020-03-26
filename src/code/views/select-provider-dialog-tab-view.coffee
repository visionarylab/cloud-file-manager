{createReactClassFactory} = require '../utils/react'
{div} = require 'react-dom-factories'

SelectProviderDialogTab = createReactClassFactory
  displayName: 'SelectProviderDialogTab'
  render: -> (div {}, "TODO: SelectProviderDialogTab: #{@props.provider.displayName}")

module.exports = SelectProviderDialogTab
