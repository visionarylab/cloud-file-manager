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
    @promises = []

  @Name: 'readOnly'

  load: (metadata, callback) ->
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
      else if metadata?.name?
        callback "Unable to load '#{metadata.name}'"
    else
      callback "Unable to load specified content"

  list: (metadata, callback) ->
    @_loadTree (err, tree) =>
      return callback err if err
      items = if metadata?.type is CloudMetadata.Folder then metadata.providerData.children else @tree
      # clone the metadata items so that any changes made to the filename or content in the edit is not cached
      callback null, _.map items, (metadataItem) -> new CloudMetadata metadataItem

  canOpenSaved: -> false

  _loadTree: (callback) ->
    # wait for all promises to be resolved before proceeding
    complete = (iTree) =>
      Promise.all(@promises)
        .then (->
          if iTree?
            callback null, iTree
          else
            # an empty folder is unusual but not necessarily an error
            console.error? "No contents found for #{@displayName} provider"
            callback null, {}
        ),
        # if a promise was rejected, then there was an error
        (-> callback "No contents found for #{@displayName} provider")

    if @tree isnt null
      complete @tree
    else if @options.json
      @tree = @_convertJSONToMetadataTree @options.json
      complete @tree
    else if @options.jsonCallback
      @options.jsonCallback (err, json) =>
        if err
          callback err
        else
          @tree = @_convertJSONToMetadataTree @options.json
          complete @tree
    else if @options.src
      $.ajax
        dataType: 'json'
        url: @options.src
        success: (iResponse) =>
          @tree = @_convertJSONToMetadataTree iResponse
          # alphabetize remotely loaded folder contents if requested
          if @options.alphabetize
            @tree.sort (iMeta1, iMeta2) ->
              return -1 if iMeta1.name < iMeta2.name
              return  1 if iMeta1.name > iMeta2.name
              return  0
          complete @tree
        error: (jqXHR, textStatus, errorThrown) =>
          errorMetadata = @_createErrorMetadata null
          @tree = [ errorMetadata ]
          complete @tree
    else
      complete null

  _convertJSONToMetadataTree: (json, parent = null) ->
    tree = []

    if isArray json
      # parse array format:
      # [{ name: "...", content: "..."}, { name: "...", type: 'folder', children: [...] }]
      for item in json
        type = CloudMetadata.mapTypeToCloudMetadataType item.type
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
          newFolderPromise = (iItem, iMetadata) =>
            return new Promise (resolve, reject) =>
              if iItem.children?
                iMetadata.providerData.children = @_convertJSONToMetadataTree iItem.children, iMetadata
                resolve iMetadata
              else if iItem.url?
                $.ajax
                  dataType: 'json'
                  url: iItem.url,
                  success: (iResponse) =>
                    iMetadata.providerData.children = @_convertJSONToMetadataTree iResponse, iMetadata
                    # alphabetize remotely loaded folder contents if requested
                    if @options.alphabetize or iItem.alphabetize
                      iMetadata.providerData.children.sort (iMeta1, iMeta2) ->
                        return -1 if iMeta1.name < iMeta2.name
                        return  1 if iMeta1.name > iMeta2.name
                        return  0
                    resolve iMetadata
                  error: (jqXHR, textStatus, errorThrown) =>
                    errorMetadata = @_createErrorMetadata iMetadata
                    iMetadata.providerData.children = [ errorMetadata ]
                    resolve iMetadata
          @promises.push newFolderPromise item, metadata

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

  # Remote folder contents are likely to be loaded as part of
  # sample document hierarchies. The inability to load one subfolder
  # of examples shouldn't necessarily be treated as a fatal error.
  # Therefore, we put an item in the returned results which indicates
  # the error and which is non-selectable, but resolve the promise
  # so that the open can proceed without the missing folder contents.
  _createErrorMetadata: (iParent) ->
    new CloudMetadata
      name: tr "~FILE_DIALOG.LOAD_FOLDER_ERROR"
      type: CloudMetadata.Label
      content: ""
      parent: iParent
      provider: @
      providerData:
        children: null

module.exports = ReadOnlyProvider
