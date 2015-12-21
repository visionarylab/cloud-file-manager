{div} = React.DOM

isString = require '../utils/is-string'

class CloudFile
  constructor: (options) ->
    {@content, @metadata} = options

class CloudMetadata
  constructor: (options) ->
    {@name, @type, @provider = null, @parent = null, @providerData={}, @overwritable, @sharedContentId, @sharedContentSecretKey} = options
  @Folder: 'folder'
  @File: 'file'

  path: ->
    _path = []
    parent = @parent
    while parent isnt null
      _path.unshift parent
      parent = parent.parent
    _path

# singleton that can create CloudContent wrapped with global options
class CloudContentFactory
  constructor: ->
    @envelopeMetadata = {}

  # set initial envelopeMetadata or update individual properties
  setEnvelopeMetadata: (envelopeMetadata) ->
    for key of envelopeMetadata
      @envelopeMetadata[key] = envelopeMetadata[key]

  # returns new CloudContent containing enveloped data
  createEnvelopedCloudContent: (content) ->
    new CloudContent @envelopContent content

  # envelops content with metadata, returns an object.
  # If content was already an object (Object or JSON) with metadata,
  # any existing metadata will be retained.
  # Note: calling `envelopContent` may be safely called on something that
  # has already had `envelopContent` called on it, and will be a no-op.
  envelopContent: (content) ->
    envelopedCloudContent = @_wrapIfNeeded content
    for key of @envelopeMetadata
      envelopedCloudContent[key] ?= @envelopeMetadata[key]
    return envelopedCloudContent

  # envelops content in {content: content} if needed, returns an object
  _wrapIfNeeded: (content) ->
    if isString content
      try content = JSON.parse content
    if content.content?
      return content
    else
      return {content}

class CloudContent
  constructor: (@_ = {}) ->

  getContent: -> @_
  getContentAsJSON:  -> JSON.stringify @_

  clone: -> new CloudContent _.cloneDeep @_

  setText: (text) -> @_.content = text
  getText: -> if @_.content is null then '' else if isString(@_.content) then @_.content else JSON.stringify @_.content

  addMetadata: (metadata) -> @_[key] = metadata[key] for key of metadata
  get: (prop) -> @_[prop]

  copyMetadataTo: (to) ->
    metadata = {}
    for own key, value of @_
      if key isnt 'content'
        metadata[key] = value
    to.addMetadata metadata

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

  filterTabComponent: (capability, defaultComponent) ->
    defaultComponent

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

  close: (metadata, callback) ->
    @_notImplemented 'close'

  openSaved: (openSavedParams, callback) ->
    @_notImplemented 'openSaved'

  getOpenSavedParams: (metadata) ->
    @_notImplemented 'getOpenSavedParams'

  _notImplemented: (methodName) ->
    alert "#{methodName} not implemented for #{@name} provider"

module.exports =
  CloudFile: CloudFile
  CloudMetadata: CloudMetadata
  CloudContent: CloudContent
  cloudContentFactory: new CloudContentFactory()
  ProviderInterface: ProviderInterface
