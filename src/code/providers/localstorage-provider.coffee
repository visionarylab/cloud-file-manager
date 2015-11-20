ProviderInterface = (require './provider-interface').ProviderInterface

class LocalStorageProvider extends ProviderInterface

  constructor: (options) ->
    super
      name: 'localStorage'
      displayName: 'Local Storage'
      capabilities:
        auth: false
        save: true
        load: true
        list: true

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
      window.localStorage.setItem @_getKey(metadata.name), content
      callback null
    catch
      callback 'Unable to save'

  load: (metadata, callback) ->
    try
      callback null,  window.localStorage.getItem @_getKey metadata.name
    catch
      callback 'Unable to load'

  list: (metadata, callback) ->
    list = []
    prefix = @_getKey path
    for own key of window.localStorage
      if key.substr(0, prefix.length) is prefix
        [name, remainder...] = key.substr(prefix.length).split('/')
        list.push new CloudMetadata
          name: key.substr(prefix.length)
          path: "#{path}/#{name}"
          type: if remainder.length > 0 then Metadata.Folder else Metadata.File
    callback null, list

  _getKey: (name = '') ->
    "cfm::#{name}"

module.exports = LocalStorageProvider
