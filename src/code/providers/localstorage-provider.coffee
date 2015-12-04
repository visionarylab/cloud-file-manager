tr = require '../utils/translate'

ProviderInterface = (require './provider-interface').ProviderInterface
CloudContent = (require './provider-interface').CloudContent
CloudRelatedContent = (require './provider-interface').CloudRelatedContent
CloudMetadata = (require './provider-interface').CloudMetadata

class LocalStorageProvider extends ProviderInterface

  constructor: (@options = {}) ->
    super
      name: LocalStorageProvider.Name
      displayName: @options.displayName or (tr '~PROVIDER.LOCAL_STORAGE')
      capabilities:
        save: true
        load: true
        list: true
        remove: true
        rename: true

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
      window.localStorage.setItem fileKey, content.getText()
      for own name, relatedFile of content.relatedFiles
        window.localStorage.setItem [fileKey, name].join('\t'), relatedFile.content.getText()
      callback? null
    catch
      callback "Unable to save: #{e.message}"

  load: (metadata, callback) ->
    try
      fileKey = @_getKey metadata.name
      content = new CloudContent window.localStorage.getItem fileKey
      for own key, value of window.localStorage
        if (key.substr(0, fileKey.length) is fileKey) and key isnt fileKey
          name = key.substr(fileKey.length).replace /\t/g, ''
          relatedContent = window.localStorage.getItem key
          content.initRelatedContent name, relatedContent
      callback null, content
    catch e
      callback "Unable to load: #{e.message}"

  list: (metadata, callback) ->
    list = []
    prefix = @_getKey (metadata?.path() or []).join '/'
    for own key of window.localStorage
      if key.substr(0, prefix.length) is prefix
        [filename, remainder...] = key.substr(prefix.length).split('/')
        name = key.substr(prefix.length)
        # we use tab to denote related files
        if name.indexOf('\t') is -1
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

  _getKey: (name = '') ->
    "cfm::#{name.replace /\t/g, ' '}"

module.exports = LocalStorageProvider
