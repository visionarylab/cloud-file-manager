{div} = React.DOM

isString = require '../utils/is-string'

class CloudFile
  constructor: (options) ->
    {@content, @metadata} = options

class CloudMetadata
  constructor: (options) ->
    {@name, @path, @type, @provider, @providerData={}, @overwritable} = options
  @Folder: 'folder'
  @File: 'file'

class BaseCloudContent
  constructor: (@_ = null) ->
    @dirty = false

  getContent: -> @_
  initContent: (content) -> @setContent content, {dirty: false}
  setContent: (content, options = {}) ->
    @_ = content
    @dirty = if options.hasOwnProperty('dirty') then options.dirty else true
    @_

  getText: -> if isString(@_) then @_ else JSON.stringify @_
  initText: (text) -> @setText text, {dirty: false}
  setText: (text, options) -> @setContent text, options

  getJSON: -> if isString(@_) then JSON.parse @_ else @_
  initJSON: (json) -> @setJSON json, {dirty: false}
  setJSON: (json, options) -> @setContent (if isString(json) then json else JSON.stringify json), options

class CloudContent extends BaseCloudContent
  constructor: (content, options = {}) ->
    super content
    {@relatedContent} = options
    @relatedContent or= {}
    @dirtyRelatedContent = {}

  getRelatedContent: (name) ->
    @relatedContent[name]
  setRelatedContent: (name, relatedContent) ->
    relatedContent = if relatedContent instanceof CloudRelatedContent
      relatedContent
    else
      new CloudRelatedContent relatedContent, {mainContent: @}
    @relatedContent[name] = relatedContent
    @dirtyRelatedContent[name] = true
    relatedContent

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
