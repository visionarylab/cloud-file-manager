require './provider-interface'

class LocalStorageProvider extends ProviderInterface

  constructor: (options) ->
    @localStorage = window.localStorage
    super
      name: 'local-storage'
      displayName: 'Local Storage'
      capabilities:
        auth: false
        save: true
        load: true
        list: true

  @Available: ->
    try
      test = 'LocalStorageProvider::auth'
      @localStorage.setItem(test, test)
      @localStorage.removeItem(test)
      true
    catch
      false

  save: (content, metadata, callback) ->
    try
      callback null, @localStorage.setItem @_getKey(metadata.name), content
    catch
      callback 'Unable to save'

  load: (metadata, callback) ->
    try
      callback null,  @localStorage.getItem @_getKey metadata.name
    catch
      callback 'Unable to load'

  list: (metadata, callback) ->
    list = []
    prefix = @_getKey path
    for own key of @localStorage
      if key.substr(0, prefix.length) is prefix
        [name, remainder...] = key.substr(prefix.length).split('/')
        list.push new Metadata
          name: key.substr(prefix.length)
          path: "#{path}/#{name}"
          type: if remainder.length > 0 then Metadata.Folder else Metadata.File
    callback null, list

  _getKey: (name = '') ->
    "cfm::#{name}"
