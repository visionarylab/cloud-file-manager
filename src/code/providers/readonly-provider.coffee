tr = require '../utils/translate'

ProviderInterface = (require './provider-interface').ProviderInterface
CloudMetadata = (require './provider-interface').CloudMetadata

# helpers that don't need to live in the classes
isString = (param) -> Object.prototype.toString.call(param) is '[object String]'

class ReadOnlyProvider extends ProviderInterface

  constructor: (@options = {}) ->
    super
      name: ReadOnlyProvider.Name
      displayName: @options.displayName or (tr '~PROVIDER.READ_ONLY')
      capabilities:
        save: false
        load: true
        list: true
    @tree = if @options.json then @_convertJSONToMetadataTree(@options.json) else null

  @Name: 'readOnly'

  load: (metadata, callback) ->
    @_loadTree (err, tree) ->
      return callback err if err
      parent = @_findParent metadata
      if parent
        if parent[metadata.name]
          if parent[metadata.name].type is CloudMetadata.File
            callback null, parent[metadata.name]
          else
            callback "#{metadata.name} is a folder"
        else
          callback "#{metadata.name} not found in folder"
      else
        callback "#{metadata.name} folder not found"

  list: (metadata, callback) ->
    @_loadTree (err, tree) ->
      return callback err if err
      parent = @_findParent metadata
      if parent
        list = []
        list.push metadata for own metadata of parent
        callback null, list
      else if metadata
        callback "#{metadata.name} folder not found"
      else
        callback "Folder not found"

  _loadTree: (callback) ->
    if @tree isnt null
      callback null, @tree
    else if @options.src
      $.ajax
        dataType: 'json'
        url: @options.src
        success: (data) =>
          @tree = @_convertJSONToMetadataTree data
          callback null, @tree
        error: -> callback "Unable to load json for #{@displayName} provider"
    else
      callback "No json or src option found for #{@displayName} provider"

  _convertJSONToMetadataTree: (json, pathPrefix = '/') ->
    tree = {}
    for own filename of json
      type = if isString json[filename] then CloudMetadata.File else CloudMetadata.Folder
      metadata = new CloudMetadata
        name: filename
        path: pathPrefix + filename
        type: type
        provider: @
        children: null
      if type is CloudMetadata.Folder
        metadata.children = _convertJSONToMetadataTree json[filename], pathPrefix + filename + '/'
      tree[filename] = metadata
    tree

  _findParent: (metadata) ->
    if not metadata
      @tree
    else

    json

module.exports = ReadOnlyProvider
