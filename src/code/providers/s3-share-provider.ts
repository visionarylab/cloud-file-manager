// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import {
  ICloudMetaDataOpts,
  callbackSigShare,
  callbackSigLoad,
  ProviderInterface,
  IProviderInterfaceOpts,
  ICloudFileTypes,
  CloudContent,
  CloudMetadata
}  from './provider-interface'

import pako  from 'pako'

interface IClientInterface {
}

type documentKeyType = string

interface INewDocStoreSaveParams {
  // TODO: Are both of these actually optional?
  accessKey?: documentKeyType,
  shared?: boolean
}

// TODO This was docstore URL provider
interface IDocStoreUrlHelperSaveResults {
  method: 'POST'|'GET'|'PUT'|'PATCH'
  url: string
}

interface IDocStoreUrlHelperNewResults extends IDocStoreUrlHelperSaveResults {
}

interface IDocStoreUrlHelper {
  v2SaveDocument: (documentID:documentKeyType, params: INewDocStoreSaveParams) => IDocStoreUrlHelperSaveResults
  v2CreateDocument: (params: INewDocStoreSaveParams) => IDocStoreUrlHelperNewResults
}

//
// A utility class for providing sharing functionality via the Concord Document Store.
// Originally, sharing was wrapped into the Provider interface, but since we have no
// plans to extend sharing support to arbitrary providers like Google Drive, it seems
// cleaner to break out the sharing functionality into its own class.
//
class S3ShareProvider extends ProviderInterface {
  public static Name ='s3-share-provider'
  client: IClientInterface
  provider: ProviderInterface
  docStoreUrlHelper: IDocStoreUrlHelper
  options: IProviderInterfaceOpts
  constructor(opts: IProviderInterfaceOpts, client:IClientInterface) {
    super({
      urlDisplayName: 'S3 Url',
      name: S3ShareProvider.Name,
      // displayName: opts.displayName || (tr('~PROVIDER.LOCAL_FILE')),
      displayName: opts.displayName || "S3-shared-provider",
      capabilities: {
        save: true,
        resave: false,
        export: true,
        load: true,
        list: true,
        remove: false,
        rename: false,
        close: false
      }
    })
    this.options = opts
    this.client = client
  }

  loadSharedContent(id: string, callback:callbackSigLoad) {
    const sharedMetadata = new CloudMetadata({
      sharedContentId: id,
      type: ICloudFileTypes.File,
      overwritable: false
    })
    this.provider.load(sharedMetadata, (err, content) => callback(err, content, sharedMetadata))
  }

  getSharingMetadata(shared: boolean) {
    return { _permissions: shared ? 1 : 0 }
  }

  share(
    shared: boolean,
    masterContent: CloudContent,
    sharedContent:CloudContent,
    metadata:ICloudMetaDataOpts,
    callback: callbackSigShare) {

    // document ID is stored in masterContent
    let method, url
    const documentID = masterContent.get('sharedDocumentId')

    // newer V2 documents have 'accessKeys'; legacy V1 documents have 'sharedEditKey's
    // which are actually V1 'runKey's under an assumed name (to protect their identity?)
    const accessKeys = masterContent.get('accessKeys')
    const runKey = masterContent.get('shareEditKey')

    const accessKey = (accessKeys != null ? accessKeys.readWrite : undefined) || runKey

    const params: INewDocStoreSaveParams = {
      shared
    }
    if (accessKey) {
      params.accessKey = `RW::${accessKey}`
    }

    // if we already have a documentID and some form of accessKey,
    // then we must be updating an existing shared document
    if (documentID && accessKey) {
      ({method, url} = this.docStoreUrlHelper.v2SaveDocument(documentID, params))
      return $.ajax({
        dataType: 'json',
        type: method,
        url,
        contentType: 'application/json', // Document Store requires JSON currently
        data: pako.deflate(sharedContent.getContentAsJSON()),
        processData: false,
        beforeSend(xhr) {
          return xhr.setRequestHeader('Content-Encoding', 'deflate')
        },
        context: this,
        xhrFields: {
          withCredentials: true
        },
        success(data) {
          // on successful share/save, capture the sharedDocumentId and shareEditKey
          if (runKey && (accessKeys == null)) {
            masterContent.addMetadata({
              accessKeys: { readWrite: runKey }})
          }
          return callback(null, data.id)
        },
        error(jqXHR) {
          const docName = (metadata != null ? metadata.filename : undefined) || 'document'
          return callback(`Unable to update shared '${docName}'`, {})
        }
      })

    // if we don't have a document ID and some form of accessKey,
    // then we must create a new shared document when sharing is being enabled
    } else if (shared) {
      params.shared = true;
      ({method, url} = this.docStoreUrlHelper.v2CreateDocument(params))
      return $.ajax({
        dataType: 'json',
        type: method,
        url,
        contentType: 'application/json', // Document Store requires JSON currently
        data: pako.deflate(sharedContent.getContentAsJSON()),
        processData: false,
        beforeSend(xhr) {
          return xhr.setRequestHeader('Content-Encoding', 'deflate')
        },
        context: this,
        xhrFields: {
          withCredentials: true
        },
        success(data) {
          // on successful share/save, capture the sharedDocumentId and accessKeys
          masterContent.addMetadata({
            sharedDocumentId: data.id,
            accessKeys: { readOnly: data.readAccessKey, readWrite: data.readWriteAccessKey }})
          return callback(null, data.id)
        },
        error(jqXHR) {
          const docName = (metadata != null ? metadata.filename : undefined) || 'document'
          return callback(`Unable to share '${docName}'`, {})
        }
      })
    } else {
      const docName = (metadata != null ? metadata.filename : undefined) || 'document'
      return callback(`Unable to unshare '${docName}'`, {})
    }
  }
}

export default S3ShareProvider
