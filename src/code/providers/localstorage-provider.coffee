tr = require '../utils/translate'

ProviderInterface = (require './provider-interface').ProviderInterface
cloudContentFactory = (require './provider-interface').cloudContentFactory
CloudMetadata = (require './provider-interface').CloudMetadata

class LocalStorageProvider extends ProviderInterface

  constructor: (@options = {}, @client) ->
    super
      name: LocalStorageProvider.Name
      displayName: @options.displayName or (tr '~PROVIDER.LOCAL_STORAGE')
      capabilities:
        save: true
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
      fileKey = @_getKey(metadata.name)
      window.localStorage.setItem fileKey, content.getContentAsJSON()
      callback? null
    catch e
      callback "Unable to save: #{e.message}"

  load: (metadata, callback) ->
    try
      callback null, cloudContentFactory.createEnvelopedCloudContent window.localStorage.getItem @_getKey metadata.name
    catch e
      callback "Unable to load: #{e.message}"

  list: (metadata, callback) ->
    list = []
    prefix = @_getKey (metadata?.path() or []).join '/'
    for own key of window.localStorage
      if key.substr(0, prefix.length) is prefix
        [filename, remainder...] = key.substr(prefix.length).split('/')
        name = key.substr(prefix.length)
        list.push new CloudMetadata
          name: name
          type: if remainder.length > 0 then CloudMetadata.Folder else CloudMetadata.File
          parent: metadata
          provider: @
    callback null, list

  remove: (metadata, callback) ->
    try
      window.localStorage.removeItem @_getKey(metadata.name)
      callback? null
    catch
      callback? 'Unable to delete'

  rename: (metadata, newName, callback) ->
    try
      content = window.localStorage.getItem @_getKey metadata.name
      window.localStorage.setItem @_getKey(newName), content
      window.localStorage.removeItem @_getKey(metadata.name)
      metadata.name = newName
      callback null, metadata
    catch
      callback? 'Unable to rename'

  openSaved: (openSavedParams, callback) ->
    metadata = new CloudMetadata
      name: openSavedParams
      type: CloudMetadata.File
      parent: null
      provider: @
    @load metadata, (err, content) ->
      callback err, content, metadata

  getOpenSavedParams: (clientMetadata, savedMetadata) ->
    savedMetadata.name

  _getKey: (name = '') ->
    "cfm::#{name.replace /\t/g, ' '}"

module.exports = LocalStorageProvider
