{div} = React.DOM

isString = require '../utils/is-string'

class CloudFile
  constructor: (options) ->
    {@content, @metadata} = options

class CloudMetadata
  constructor: (options) ->
    {@name, @type, @provider, @parent = null, @providerData={}, @overwritable} = options
  @Folder: 'folder'
  @File: 'file'

  path: ->
    _path = []
    parent = @parent
    while parent isnt null
      _path.unshift parent
      parent = parent.parent
    _path

class CloudContent
  constructor: (@_ = null, options = {}) ->
    @dirty = false

  getContent: -> @_
  initContent: (content) -> @setContent content, {dirty: false}
  setContent: (content, options = {}) ->
    @_ = content
    @dirty = if options.hasOwnProperty('dirty') then options.dirty else true
    @

  getText: -> if @_ is null then '' else if isString(@_) then @_ else JSON.stringify @_
  initText: (text) -> @setText text, {dirty: false}
  setText: (text, options) -> @setContent text, options

  getJSON: -> if isString(@_) then JSON.parse @_ else @_
  initJSON: (json) -> @setJSON json, {dirty: false}
  setJSON: (json, options) -> @setContent (if isString(json) then json else JSON.stringify json), options

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

  _notImplemented: (methodName) ->
    alert "#{methodName} not implemented for #{@name} provider"

module.exports =
  CloudFile: CloudFile
  CloudMetadata: CloudMetadata
  CloudContent: CloudContent
  ProviderInterface: ProviderInterface
