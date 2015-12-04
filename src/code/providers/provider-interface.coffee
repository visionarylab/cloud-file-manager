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

class BaseCloudContent
  constructor: (@_ = null) ->
    @dirty = false

  getContent: -> @_
  initContent: (content) -> @setContent content, {dirty: false}
  setContent: (content, options = {}) ->
    @_ = content
    @dirty = if options.hasOwnProperty('dirty') then options.dirty else true
    @

  getText: -> if isString(@_) then @_ else JSON.stringify @_
  initText: (text) -> @setText text, {dirty: false}
  setText: (text, options) -> @setContent text, options

  getJSON: -> if isString(@_) then JSON.parse @_ else @_
  initJSON: (json) -> @setJSON json, {dirty: false}
  setJSON: (json, options) -> @setContent (if isString(json) then json else JSON.stringify json), options

class CloudContent extends BaseCloudContent
  constructor: (content, options = {}) ->
    super content
    @relatedFiles = {}

  hasRelatedContent: ->
    if Object.keys?
      Object.keys(@relatedFiles).length > 0
    else
      for own relatedFile of @relatedFiles
        return true
      false

  getRelatedContent: (name) ->
    @relatedFiles[name]?.content or null
  initRelatedContent: (name, content, metadata) ->
    @setRelatedContent name, content, metadata, {dirty: false}
  setRelatedContent: (name, content, metadata = null, options = {}) ->
    if not @relatedFiles.hasOwnProperty name
      @relatedFiles[name] = new CloudFile
        content: new CloudRelatedContent null, {mainContent: @}
        metadata: metadata
    @relatedFiles[name].content.setContent content, options
    @

class CloudRelatedContent extends BaseCloudContent
  constructor: (content, options = {}) ->
    super content
    {@mainContent} = options

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

  _notImplemented: (methodName) ->
    alert "#{methodName} not implemented for #{@name} provider"

module.exports =
  CloudFile: CloudFile
  CloudMetadata: CloudMetadata
  BaseCloudContent: BaseCloudContent
  CloudContent: CloudContent
  CloudRelatedContent: CloudRelatedContent
  ProviderInterface: ProviderInterface
