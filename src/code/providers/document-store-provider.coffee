{div} = React.DOM

tr = require '../utils/translate'
isString = require '../utils/is-string'

ProviderInterface = (require './provider-interface').ProviderInterface
CloudMetadata = (require './provider-interface').CloudMetadata

DocumentStoreAuthorizationDialog = React.createFactory React.createClass
  displayName: 'DocumentStoreAuthorizationDialog'
  render: ->
    (div {}, "TODO: DocumentStoreAuthorizationDialog")

class DocumentStoreProvider extends ProviderInterface

  constructor: (@options = {}) ->
    super
      name: DocumentStoreProvider.Name
      displayName: @options.displayName or (tr '~PROVIDER.DOCUMENT_STORE')
      capabilities:
        save: true
        load: true
        list: true

  @Name: 'documentStore'

  authorized: (@authCallback) ->

  renderAuthorizationDialog: ->
    (DocumentStoreAuthorizationDialog {provider: @, authCallback: @authCallback})

module.exports = DocumentStoreProvider
