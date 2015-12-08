tr = require '../utils/translate'
isString = require '../utils/is-string'

ProviderInterface = (require './provider-interface').ProviderInterface
cloudContentFactory = (require './provider-interface').cloudContentFactory
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
        remove: false
        rename: false
        close: false
    @tree = null

  @Name: 'readOnly'

  load: (metadata, callback) ->
    @_loadTree (err, tree) =>
      return callback err if err
      subTree = @_findSubTree metadata
      if subTree
        if subTree[metadata.name]
          if subTree[metadata.name].metadata.type is CloudMetadata.File
            callback null, subTree[metadata.name].content
          else
            callback "#{metadata.name} is a folder"
        else
          callback "#{metadata.name} not found in folder"
      else
        callback "#{metadata.name} folder not found"

  list: (metadata, callback) ->
    @_loadTree (err, tree) =>
      return callback err if err
      list = []
      subTree = @_findSubTree metadata
      if subTree
        list.push file.metadata for own filename, file of subTree
      callback null, list

  _findSubTree: (metadata) ->
    if metadata?.type is CloudMetadata.Folder
      metadata.providerData.children
    else if metadata?.parent
      metadata.parent.providerData.children
    else
      @tree

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

  _convertJSONToMetadataTree: (json, parent = null) ->
    tree = {}
    for own filename of json
      type = if isString json[filename] then CloudMetadata.File else CloudMetadata.Folder
      metadata = new CloudMetadata
        name: filename
        type: type
        parent: parent
        provider: @
        providerData:
          children: null
      if type is CloudMetadata.Folder
        metadata.providerData.children = @_convertJSONToMetadataTree json[filename], metadata
      content = cloudContentFactory.createEnvelopedCloudContent json[filename]
      tree[filename] =
        content: content
        metadata: metadata
    tree

module.exports = ReadOnlyProvider
