import { CloudMetadata } from './provider-interface';
import DocumentStoreUrl from './document-store-url';
import pako from 'pako';

//
// A utility class for providing sharing functionality via the Concord Document Store.
// Originally, sharing was wrapped into the Provider interface, but since we have no
// plans to extend sharing support to arbitrary providers like Google Drive, it seems
// cleaner to break out the sharing functionality into its own class.
//
class DocumentStoreShareProvider {

  constructor(client, provider) {
    this.client = client;
    this.provider = provider;
    this.docStoreUrl = this.provider.docStoreUrl;
  }

  loadSharedContent(id, callback) {
    let sharedMetadata = new CloudMetadata({
      sharedContentId: id,
      type: CloudMetadata.File,
      overwritable: false
    });
    return this.provider.load(sharedMetadata, (err, content) => callback(err, content, sharedMetadata));
  }

  getSharingMetadata(shared) {
    return { _permissions: shared ? 1 : 0 };
  }

  share(shared, masterContent, sharedContent, metadata, callback) {

    // document ID is stored in masterContent
    let method, url;
    let documentID = masterContent.get('sharedDocumentId');

    // newer V2 documents have 'accessKeys'; legacy V1 documents have 'sharedEditKey's
    // which are actually V1 'runKey's under an assumed name (to protect their identity?)
    let accessKeys = masterContent.get('accessKeys');
    let runKey = masterContent.get('shareEditKey');

    let accessKey = __guard__(accessKeys, x => x.readWrite) || runKey;

    let params = {shared};
    if (accessKey) {
      params.accessKey = `RW::${accessKey}`;
    }

    // if we already have a documentID and some form of accessKey,
    // then we must be updating an existing shared document
    if (documentID && accessKey) {
      ({method, url} = this.docStoreUrl.v2SaveDocument(documentID, params));
      return $.ajax({
        dataType: 'json',
        type: method,
        url,
        contentType: 'application/json', // Document Store requires JSON currently
        data: pako.deflate(sharedContent.getContentAsJSON()),
        processData: false,
        beforeSend(xhr) {
          return xhr.setRequestHeader('Content-Encoding', 'deflate');
        },
        context: this,
        xhrFields: {
          withCredentials: true
        },
        success(data) {
          // on successful share/save, capture the sharedDocumentId and shareEditKey
          if (runKey && (accessKeys == null)) {
            masterContent.addMetadata({
              accessKeys: { readWrite: runKey }});
          }
          return callback(null, data.id);
        },
        error(jqXHR) {
          let docName = __guard__(metadata, x1 => x1.filename) || 'document';
          return callback(`Unable to update shared '${docName}'`);
        }
      });

    // if we don't have a document ID and some form of accessKey,
    // then we must create a new shared document when sharing is being enabled
    } else if (shared) {
      params.shared = true;
      ({method, url} = this.docStoreUrl.v2CreateDocument(params));
      return $.ajax({
        dataType: 'json',
        type: method,
        url,
        contentType: 'application/json', // Document Store requires JSON currently
        data: pako.deflate(sharedContent.getContentAsJSON()),
        processData: false,
        beforeSend(xhr) {
          return xhr.setRequestHeader('Content-Encoding', 'deflate');
        },
        context: this,
        xhrFields: {
          withCredentials: true
        },
        success(data) {
          // on successful share/save, capture the sharedDocumentId and accessKeys
          masterContent.addMetadata({
            sharedDocumentId: data.id,
            accessKeys: { readOnly: data.readAccessKey, readWrite: data.readWriteAccessKey }});
          return callback(null, data.id);
        },
        error(jqXHR) {
          let docName = __guard__(metadata, x1 => x1.filename) || 'document';
          return callback(`Unable to share '${docName}'`);
        }
      });
    } else {
      return callback(`Unable to unshare '${docName}'`);
    }
  }
}

export default DocumentStoreShareProvider;

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}