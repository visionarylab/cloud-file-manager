tr = require '../utils/translate'
isString = require '../utils/is-string'
isArray = require '../utils/is-array'

ProviderInterface = (require './provider-interface').ProviderInterface
cloudContentFactory = (require './provider-interface').cloudContentFactory
CloudMetadata = (require './provider-interface').CloudMetadata

class ReadOnlyProvider extends ProviderInterface

  constructor: (@options = {}, @client) ->
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
    @_loadTree (err, tree) ->
      return callback err if err
      if metadata and not isArray metadata and metadata.type is CloudMetadata.File
        if metadata.content?
          callback null, metadata.content
          return
        else if metadata.url?
          $.ajax
            dataType: 'json'
            url: metadata.url
            success: (data) ->
              callback null, cloudContentFactory.createEnvelopedCloudContent data
            error: -> callback "Unable to load '#{metadata.name}'"
          return
      if metadata?.name?
        callback "Unable to load '#{metadata.name}'"
      else
        callback "Unable to load specified content"

  list: (metadata, callback) ->
    @_loadTree (err, tree) =>
      return callback err if err
      callback null, if metadata?.type is CloudMetadata.Folder then metadata.providerData.children else @tree

  canOpenSaved: -> false

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
    tree = []

    if isArray json
      # parse array format:
      # [{ name: "...", content: "..."}, { name: "...", type: 'folder', children: [...] }]
      for item in json
        type = if item.type is "folder" then CloudMetadata.Folder else CloudMetadata.File
        metadata = new CloudMetadata
          name: item.name
          type: type
          description: item.description
          content: if item.content? then cloudContentFactory.createEnvelopedCloudContent item.content else undefined
          url: item.url or item.location
          parent: parent
          provider: @
          providerData:
            children: null
        if type is CloudMetadata.Folder
          metadata.providerData.children = @_convertJSONToMetadataTree item.children, metadata
        tree.push metadata
    else
      # parse original format:
      # { filename: "file contents", folderName: {... contents ...} }
      for own filename of json
        itemContent = json[filename]
        type = if isString itemContent then CloudMetadata.File else CloudMetadata.Folder
        metadata = new CloudMetadata
          name: filename
          type: type
          content: cloudContentFactory.createEnvelopedCloudContent itemContent
          parent: parent
          provider: @
          providerData:
            children: null
        if type is CloudMetadata.Folder
          metadata.providerData.children = @_convertJSONToMetadataTree itemContent, metadata
        tree.push metadata
    tree

module.exports = ReadOnlyProvider
