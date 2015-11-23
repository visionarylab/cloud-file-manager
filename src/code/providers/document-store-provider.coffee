{div} = React.DOM

tr = require '../utils/translate'

ProviderInterface = (require './provider-interface').ProviderInterface
CloudMetadata = (require './provider-interface').CloudMetadata

# helpers that don't need to live in the classes
isString = (param) -> Object.prototype.toString.call(param) is '[object String]'

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

  authorized: (callback) ->
    callback false

  authorizationDialog: DocumentStoreAuthorizationDialog

module.exports = DocumentStoreProvider
