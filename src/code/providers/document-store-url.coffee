#
# This utility class simplifies working with document store URLs
#

# default document store URL if client doesn't provide one
defaultDocStoreUrl = "//document-store.concord.org"

class DocumentStoreUrl

  constructor: (docStoreUrl) ->
    @docStoreUrl = docStoreUrl or defaultDocStoreUrl

  addParams: (url, params) ->
    return url unless params
    kvp = []
    for key, value of params
      kvp.push [key, value].map(encodeURI).join "="
    return url + "?" + kvp.join "&"

  #
  # Version 1 API
  #
  authorize: (params) ->
    @addParams "#{@docStoreUrl}/user/authenticate", params

  checkLogin: (params) ->
    @addParams "#{@docStoreUrl}/user/info", params

  listDocuments: (params) ->
    @addParams "#{@docStoreUrl}/document/all", params

  loadDocument: (params) ->
    @addParams "#{@docStoreUrl}/document/open", params

  saveDocument: (params) ->
    @addParams "#{@docStoreUrl}/document/save", params

  patchDocument: (params) ->
    @addParams "#{@docStoreUrl}/document/patch", params

  deleteDocument: (params) ->
    @addParams "#{@docStoreUrl}/document/delete", params

  renameDocument: (params) ->
    @addParams "#{@docStoreUrl}/document/rename", params

module.exports = DocumentStoreUrl
