//
// This utility class simplifies working with document store URLs
//

// default document store URL if client doesn't provide one
const defaultDocStoreUrl = "//document-store.concord.org"

class DocumentStoreUrl {

  constructor(docStoreUrl) {
    this.docStoreUrl = docStoreUrl || defaultDocStoreUrl
    // eliminate trailing slashes
    this.docStoreUrl = this.docStoreUrl.replace(/\/+$/, '')
  }

  addParams(url, params) {
    if (!params) { return url }
    const kvp = []
    for (let key in params) {
      const value = params[key]
      kvp.push([key, value].map(encodeURI).join("="))
    }
    return url + "?" + kvp.join("&")
  }

  //
  // Version 1 API
  //
  authorize(params) {
    return this.addParams(`${this.docStoreUrl}/user/authenticate`, params)
  }

  checkLogin(params) {
    return this.addParams(`${this.docStoreUrl}/user/info`, params)
  }

  listDocuments(params) {
    return this.addParams(`${this.docStoreUrl}/document/all`, params)
  }

  loadDocument(params) {
    return this.addParams(`${this.docStoreUrl}/document/open`, params)
  }

  saveDocument(params) {
    return this.addParams(`${this.docStoreUrl}/document/save`, params)
  }

  patchDocument(params) {
    return this.addParams(`${this.docStoreUrl}/document/patch`, params)
  }

  deleteDocument(params) {
    return this.addParams(`${this.docStoreUrl}/document/delete`, params)
  }

  renameDocument(params) {
    return this.addParams(`${this.docStoreUrl}/document/rename`, params)
  }

  //
  // Version 2 API
  //
  v2Document(id, params) {
    return this.addParams(`${this.docStoreUrl}/v2/documents/${id}`, params)
  }

  v2CreateDocument(params) {
    return { method: 'POST', url: this.v2Document('', params) }
  }
    
  v2LoadDocument(id, params) {
    return { method: 'GET', url: this.v2Document(id, params) }
  }
    
  v2SaveDocument(id, params) {
    return { method: 'PUT', url: this.v2Document(id, params) }
  }
    
  v2PatchDocument(id, params) {
    return { method: 'PATCH', url: this.v2Document(id, params) }
  }
}
    
  // Not implemented by the server
  // v2DeleteDocument: (id, params) ->
  //   { method: 'DELETE', url: @v2Document(id, params) }
    
export default DocumentStoreUrl
