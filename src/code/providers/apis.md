# APIS

This is a list of providers with APIs so we can find a common core api set for the provider interface to expose.

## Providers

* [LocalStorage](https://html.spec.whatwg.org/multipage/webstorage.html#the-localstorage-attribute)
* [Google Drive](https://developers.google.com/api-client-library/javascript/)
* [Dropbox](https://www.dropbox.com/developers-v1/core/docs)
* [Concord Cloud](https://github.com/concord-consortium/document-store/blob/master/app/controllers/documents_controller.rb)

### LocalStorage

* auth -> check if window.localStorage exists
* save -> window.localStorage.setItem
* load -> window.localStorage.getItem
* list -> window.localStorage.getItem(key) in loop over key in window.localStorage

### Google Drive

* auth -> client-side OAuth
* save -> (PUT|POST) https://www.googleapis.com/upload/drive/v2/files/[fileId]*
* load -> (GET) https://www.googleapis.com/drive/v2/files/[fileId]
* list -> (GET) https://www.googleapis.com/drive/v2/files

### Dropbox

* auth -> client-side OAuth
* save -> (PUT) https://content.dropboxapi.com/1/files_put/auto/[path]?param=val
* load -> (GET) https://content.dropboxapi.com/1/files/auto/[path]
* list -> (GET) https://api.dropboxapi.com/1/metadata/auto/[path]

### Concord Cloud

* auth -> client-side OAuth
* save -> (POST) POST /documents.json
* load -> (GET) GET /documents/[id].json
* list -> (GET) GET /all

with CODAP:

* save -> (PUT) /save OR /patch
* load -> (GET) /open
