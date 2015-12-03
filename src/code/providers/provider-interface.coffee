{div} = React.DOM

class CloudFile
  contructor: (options) ->
    {@content, @metadata} = options

class CloudMetadata
  constructor: (options) ->
    {@name, @path, @type, @provider, @providerData={}, @overwritable} = options
  @Folder: 'folder'
  @File: 'file'

AuthorizationNotImplementedDialog = React.createFactory React.createClass
  displayName: 'AuthorizationNotImplementedDialog'
  render: ->
    (div {}, "Authorization dialog not yet implemented for #{@props.provider.displayName}")

class ProviderInterface

  constructor: (options) ->
    {@name, @displayName, @capabilities} = options

  @Available: -> true

  can: (capability) ->
    @capabilities[capability]

  authorized: (callback) ->
    if callback
      callback true
    else
      true

  renderAuthorizationDialog: ->
    (AuthorizationNotImplementedDialog {provider: @})

  renderUser: ->
    null

  dialog: (callback) ->
    @_notImplemented 'dialog'

  save: (content, metadata, callback) ->
    @_notImplemented 'save'

  load: (callback) ->
    @_notImplemented 'load'

  list: (metadata, callback) ->
    @_notImplemented 'list'

  remove: (metadata, callback) ->
    @_notImplemented 'remove'

  rename: (metadata, newName, callback) ->
    @_notImplemented 'rename'

  patch: (metadata, newName, callback) ->
    @_notImplemented 'patch'

  _notImplemented: (methodName) ->
    alert "#{methodName} not implemented for #{@name} provider"

module.exports =
  CloudFile: CloudFile
  CloudMetadata: CloudMetadata
  ProviderInterface: ProviderInterface
