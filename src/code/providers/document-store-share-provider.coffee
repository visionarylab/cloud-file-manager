CloudMetadata = (require './provider-interface').CloudMetadata
DocumentStoreUrl = require './document-store-url'
pako = require 'pako'

#
# A utility class for providing sharing functionality via the Concord Document Store.
# Originally, sharing was wrapped into the Provider interface, but since we have no
# plans to extend sharing support to arbitrary providers like Google Drive, it seems
# cleaner to break out the sharing functionality into its own class.
#
class DocumentStoreShareProvider

  constructor: (@client, @provider) ->
    @docStoreUrl = @provider.docStoreUrl

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

    # document ID is stored in masterContent
    documentID = masterContent.get('sharedDocumentId')

    # newer V2 documents have 'accessKeys'; legacy V1 documents have 'sharedEditKey's
    # which are actually V1 'runKey's under an assumed name (to protect their identity?)
    accessKeys = masterContent.get('accessKeys')
    runKey = masterContent.get('shareEditKey')

    accessKey = accessKeys?.readWrite or runKey

    params = {}
    if accessKey
      params.accessKey = 'RW::' + accessKey

    # if we already have a documentID and some form of accessKey,
    # then we must be updating an existing shared document
    if documentID and accessKey
      {method, url} = @docStoreUrl.v2SaveDocument(documentID, params)
      $.ajax
        dataType: 'json'
        type: method
        url: url
        contentType: 'application/json' # Document Store requires JSON currently
        data: pako.deflate sharedContent.getContentAsJSON()
        processData: false
        beforeSend: (xhr) ->
          xhr.setRequestHeader('Content-Encoding', 'deflate')
        context: @
        xhrFields:
          withCredentials: true
        success: (data) ->
          # on successful share/save, capture the sharedDocumentId and shareEditKey
          if runKey and not accessKeys?
            masterContent.addMetadata
              accessKeys: { readWrite: runKey }
          callback null, data.id
        error: (jqXHR) ->
          docName = metadata?.filename or 'document'
          callback "Unable to update shared '#{docName}'"

    # if we don't have a document ID and some form of accessKey,
    # then we must create a new shared document
    else
      params.shared = true
      {method, url} = @docStoreUrl.v2CreateDocument(params)
      $.ajax
        dataType: 'json'
        type: method
        url: url
        contentType: 'application/json' # Document Store requires JSON currently
        data: pako.deflate sharedContent.getContentAsJSON()
        processData: false
        beforeSend: (xhr) ->
          xhr.setRequestHeader('Content-Encoding', 'deflate')
        context: @
        xhrFields:
          withCredentials: true
        success: (data) ->
          # on successful share/save, capture the sharedDocumentId and accessKeys
          masterContent.addMetadata
            sharedDocumentId: data.id
            accessKeys: { readOnly: data.readAccessKey, readWrite: data.readWriteAccessKey }
          callback null, data.id
        error: (jqXHR) ->
          docName = metadata?.filename or 'document'
          callback "Unable to share '#{docName}'"

module.exports = DocumentStoreShareProvider
