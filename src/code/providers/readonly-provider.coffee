ProviderInterface = (require './provider-interface').ProviderInterface

class ReadOnlyProvider extends ProviderInterface

  constructor: (options = {}) ->
    super
      name: 'readonly'
      displayName: 'Read Only'
      capabilities:
        save: false
        load: true
        list: true
    @src = options.src
    @json = null

  dialog: (props) ->

  load: (metadata, callback) ->
    parent = @_findParent metadata.path
    callback null, parent[metadata.name]

  list: (metadata, callback) ->
    list = []
    callback null, list

  _loadSrc: (callback) ->
    json = {}
    callback json

  _findParent: (path) ->
    json

module.exports = ReadOnlyProvider
