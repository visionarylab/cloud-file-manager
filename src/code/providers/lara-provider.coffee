ProviderInterface = (require './provider-interface').ProviderInterface
cloudContentFactory = (require './provider-interface').cloudContentFactory
CloudMetadata = (require './provider-interface').CloudMetadata
DocumentStoreUrl = require './document-store-url'
PatchableContent = require './patchable-content'
getQueryParam = require '../utils/get-query-param'
base64 = (require 'js-base64').Base64

# This provider supports the lara:... protocol used for documents launched
# from LARA. It looks up the document ID and access keys from the LARA
# interactive run state and then uses the V2 DocStore API to read/write
# documents from the Concord Document Store. It does not support arbitrary
# opening/saving of documents and so should not appear in the list of
# places users can choose to open/save files like Google Drive does.

class LaraProvider extends ProviderInterface

  @Name: 'lara'

  constructor: (@options = {}, @client) ->
    super
      name: LaraProvider.Name
      capabilities:
        save: true
        load: true
        list: false
        remove: false
        rename: false
        close: false

    @urlParams = {
      documentServer: getQueryParam "documentServer"
      launchFromLara: getQueryParam "launchFromLara"
    }
    @removableQueryParams = ['launchFromLara', 'runAsGuest']
    if @urlParams.launchFromLara
      @laraParams = @decodeParams @urlParams.launchFromLara

    @docStoreUrl = new DocumentStoreUrl @urlParams.documentServer

    @savedContent = new PatchableContent(@options.patchObjectHash)

  encodeParams: (params) ->
    base64.encodeURI(JSON.stringify(params))

  decodeParams: (params) ->
    try
      decoded = JSON.parse(base64.decode(params))
    catch e
      decoded = null
    decoded

  canHandleUrlParams: ->
    if @laraParams and @laraParams.docStore
      return { providerName: @name, providerParams: @laraParams.docStore }
    null

  # don't show in provider open/save dialogs
  filterTabComponent: (capability, defaultComponent) ->
    null

  load: (metadata, callback) ->
    {method, url} = @docStoreUrl.v2LoadDocument(metadata.providerData?.recordid)

    if metadata.providerData?.accessKeys?.readOnly
      accessKey = 'RO::' + metadata.providerData.accessKeys.readOnly
    else if metadata.providerData?.accessKeys?.readWrite
      accessKey = 'RW::' + metadata.providerData.accessKeys.readWrite

    $.ajax
      type: method
      url: url
      dataType: 'json'
      data:
        accessKey: accessKey
      context: @

      success: (data) ->
        content = cloudContentFactory.createEnvelopedCloudContent data

        # for documents loaded by id or other means (besides name),
        # capture the name for use in the CFM interface.
        # 'docName' at the top level for CFM-wrapped documents
        # 'name' at the top level for unwrapped documents (e.g. CODAP)
        # 'name' at the top level of 'content' for wrapped CODAP documents
        metadata.rename metadata.name or data.docName or data.name or data.content?.name
        if metadata.name
          content.addMetadata docName: metadata.filename

        callback null, content

      error: (jqXHR) ->
        callback "Unable to load #{metadata.name or metadata.providerData?.recordid or 'file'}"

  save: (cloudContent, metadata, callback) ->
    content = cloudContent.getContent()

    # See if we can patch
    patchResults = @savedContent.createPatch(content, @options.patch and metadata.overwritable)

    if patchResults.shouldPatch and not patchResults.diffLength
      # no reason to patch if there are no diffs
      callback null # no error indicates success
      return

    params = {}
    if not patchResults.shouldPatch and metadata.filename
      params.recordname = metadata.filename

    if (metadata?.providerData?.accessKeys?.readWrite?)
      params.accessKey = 'RW::' + metadata.providerData.accessKeys.readWrite

    {method, url} = if patchResults.shouldPatch \
                      then @docStoreUrl.v2PatchDocument(metadata.providerData.recordid, params) \
                      else @docStoreUrl.v2SaveDocument(metadata.providerData.recordid, params)

    $.ajax
      dataType: 'json'
      type: method
      url: url
      data: pako.deflate patchResults.sendContent
      contentType: patchResults.mimeType
      processData: false
      beforeSend: (xhr) ->
        xhr.setRequestHeader('Content-Encoding', 'deflate')
      context: @
      success: (data) ->
        @savedContent.updateContent(if @options.patch then _.cloneDeep(content) else null)
        if data.recordid then metadata.providerData.recordid = data.recordid

        callback null, data

      error: (jqXHR) ->
        try
          responseJson = JSON.parse jqXHR.responseText
          if responseJson.message is 'error.duplicate'
            callback "Unable to create #{metadata.name}. File already exists."
          else
            callback "Unable to save #{metadata.name}: [#{responseJson.message}]"
        catch
          callback "Unable to save #{metadata.name}"

  canOpenSaved: -> true

  openSaved: (openSavedParams, callback) ->
    metadata = new CloudMetadata
      type: CloudMetadata.File
      provider: @

    if typeof openSavedParams is "string"
      openSavedParams = @decodeParams openSavedParams

    if openSavedParams and openSavedParams.recordid
      metadata.providerData = openSavedParams
      @load metadata, (err, content) ->
        @client.removeQueryParams @removableQueryParams
        callback err, content, metadata
      return

    if openSavedParams and openSavedParams.url
      # Retrieve the document ID and access keys from the LARA interactive run state
      $.ajax({
        type: 'GET'
        url: openSavedParams.url
        dataType: 'json'
        success: (response) =>
          # retrieve the metadata from the interactive run state
          if (response?.raw_data?.docStore?.recordid? and response?.raw_data?.docStore?.accessKeys?)
            metadata.providerData = response.raw_data.docStore

          @load metadata, (err, content) ->
            @client.removeQueryParams @removableQueryParams
            callback err, content, metadata

        error: (jqXHR) ->
          authCallback(false)
      })
      return

    callback "Cannot open the specified document"

  getOpenSavedParams: (metadata) ->
    @encodeParams metadata.providerData

module.exports = LaraProvider
