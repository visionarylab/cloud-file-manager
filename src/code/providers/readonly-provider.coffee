tr = require '../utils/translate'
isString = require '../utils/is-string'

ProviderInterface = (require './provider-interface').ProviderInterface
CloudMetadata = (require './provider-interface').CloudMetadata

class ReadOnlyProvider extends ProviderInterface

  constructor: (@options = {}) ->
    super
      name: ReadOnlyProvider.Name
      displayName: @options.displayName or (tr '~PROVIDER.READ_ONLY')
      capabilities:
        save: false
        load: true
        list: true
    @tree = null

  @Name: 'readOnly'

  load: (metadata, callback) ->
    @_loadTree (err, tree) =>
      return callback err if err
      parent = @_findParent metadata
      if parent
        if parent[metadata.name]
          if parent[metadata.name].metadata.type is CloudMetadata.File
            callback null, parent[metadata.name].content
          else
            callback "#{metadata.name} is a folder"
        else
          callback "#{metadata.name} not found in folder"
      else
        callback "#{metadata.name} folder not found"

  list: (metadata, callback) ->
    @_loadTree (err, tree) =>
      return callback err if err
      parent = @_findParent metadata
      if parent
        list = []
        list.push file.metadata for own filename, file of parent
        callback null, list
      else if metadata
        callback "#{metadata.name} folder not found"

  _loadTree: (callback) ->
    if @tree isnt null
      callback null, @tree
    else if @options.json
      @tree = @_convertJSONToMetadataTree @options.json
      callback null, @tree
    else if @options.jsonCallback
      @options.jsonCallback (err, json) =>
        if err
          callback err
        else
          @tree = @_convertJSONToMetadataTree @options.json
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
      console.error? "No json or src option found for #{@displayName} provider"
      callback null, {}

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
      tree[filename] =
        content: json[filename]
        metadata: metadata
    tree

  _findParent: (metadata) ->
    if not metadata
      @tree
    else
      @tree

module.exports = ReadOnlyProvider
