tr = require '../utils/translate'

ProviderInterface = (require './provider-interface').ProviderInterface
cloudContentFactory = (require './provider-interface').cloudContentFactory
CloudMetadata = (require './provider-interface').CloudMetadata

class LocalStorageProvider extends ProviderInterface

  constructor: (@options = {}, @client) ->
    super
      name: LocalStorageProvider.Name
      displayName: @options.displayName or (tr '~PROVIDER.LOCAL_STORAGE')
      urlDisplayName: @options.urlDisplayName
      capabilities:
        save: true
        resave: true
        export: true
        load: true
        list: true
        remove: true
        rename: true
        close: false

  @Name: 'localStorage'
  @Available: ->
    result = try
      test = 'LocalStorageProvider::auth'
      window.localStorage.setItem(test, test)
      window.localStorage.removeItem(test)
      true
    catch
      false

  save: (content, metadata, callback) ->
    try
      fileKey = @_getKey(metadata.filename)
      window.localStorage.setItem fileKey, (content.getContentAsJSON?() or content)
      callback? null
    catch e
      callback "Unable to save: #{e.message}"

  load: (metadata, callback) ->
    try
      content = window.localStorage.getItem @_getKey metadata.filename
      callback null, cloudContentFactory.createEnvelopedCloudContent content
    catch e
      callback "Unable to load '#{metadata.name}': #{e.message}"

  list: (metadata, callback) ->
    list = []
    prefix = @_getKey (metadata?.path() or []).join '/'
    for own key of window.localStorage
      if key.substr(0, prefix.length) is prefix
        [filename, remainder...] = key.substr(prefix.length).split('/')
        name = key.substr(prefix.length)
        if @matchesExtension name
          list.push new CloudMetadata
            name: name
            type: if remainder.length > 0 then CloudMetadata.Folder else CloudMetadata.File
            parent: metadata
            provider: @
    callback null, list

  remove: (metadata, callback) ->
    try
      window.localStorage.removeItem @_getKey(metadata.filename)
      callback? null
    catch
      callback? 'Unable to delete'

  rename: (metadata, newName, callback) ->
    try
      content = window.localStorage.getItem @_getKey metadata.filename
      window.localStorage.setItem @_getKey(CloudMetadata.withExtension newName), content
      window.localStorage.removeItem @_getKey(metadata.filename)
      metadata.rename newName
      callback null, metadata
    catch
      callback? 'Unable to rename'

  canOpenSaved: -> true

  openSaved: (openSavedParams, callback) ->
    metadata = new CloudMetadata
      name: openSavedParams
      type: CloudMetadata.File
      parent: null
      provider: @
    @load metadata, (err, content) ->
      callback err, content, metadata

  getOpenSavedParams: (metadata) ->
    metadata.name

  _getKey: (name = '') ->
    "cfm::#{name.replace /\t/g, ' '}"

module.exports = LocalStorageProvider
