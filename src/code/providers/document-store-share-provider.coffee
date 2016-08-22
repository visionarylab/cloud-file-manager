CloudMetadata = (require './provider-interface').CloudMetadata
DocumentStoreUrl = require './document-store-url'

#
# A utility class for providing sharing functionality via the Concord Document Store.
# Originally, sharing was wrapped into the Provider interface, but since we have no
# plans to extend sharing support to arbitrary providers like Google Drive, it seems
# cleaner to break out the sharing functionality into its own class.
#
class DocumentStoreShareProvider

  constructor: (@client, @provider) ->
    @docStoreUrl = new DocumentStoreUrl @client.appOptions.hashParams.documentServer

  loadSharedContent: (id, callback) ->
    sharedMetadata = new CloudMetadata
      sharedContentId: id
      type: CloudMetadata.File
      overwritable: false
    @provider.load sharedMetadata, (err, content) ->
      callback err, content, sharedMetadata

  getSharingMetadata: (shared) ->
    { _permissions: if shared then 1 else 0 }

  share: (masterContent, sharedContent, metadata, callback) ->
    # generate runKey if it doesn't already exist as 'shareEditKey'
    runKey = masterContent.get("shareEditKey") or Math.random().toString(16).substring(2)

    params =
      runKey: runKey

    # pass sharedDocumentId as 'recordid' query param
    if masterContent.get("sharedDocumentId")
      params.recordid = masterContent.get("sharedDocumentId")

    mimeType = 'application/json' # Document Store requires JSON currently

    $.ajax
      dataType: 'json'
      type: 'POST'
      url: @docStoreUrl.saveDocument(params)
      contentType: mimeType
      data: pako.deflate sharedContent.getContentAsJSON()
      processData: false
      beforeSend: (xhr) ->
        xhr.setRequestHeader('Content-Encoding', 'deflate')
      context: @
      xhrFields:
        withCredentials: false
      success: (data) ->
        # on successful share/save, capture the sharedDocumentId and shareEditKey
        masterContent.addMetadata
          sharedDocumentId: data.id
          shareEditKey: runKey
        callback null, data.id
      error: (jqXHR) ->
        docName = metadata?.filename or 'document'
        callback "Unable to share '#{docName}'"

module.exports = DocumentStoreShareProvider
