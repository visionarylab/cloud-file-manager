// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import {
  ICloudMetaDataSpec,
  callbackSigShare,
  callbackSigLoad,
  callbackSigSave,
  ProviderInterface,
  IProviderInterfaceOpts,
  ICloudFileTypes,
  CloudContent,
  CloudMetadata,
  callbackSigList
}  from './provider-interface'

import { createFile, updateFile, getAllResources } from './s3-share-provider-token-service-helper'
import { reportError } from '../utils/report-error'
import pako  from 'pako'

const S3TOKENCACHEKEY = 'CFM::__S3KEYCACHE__'
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
  options: IProviderInterfaceOpts
  constructor(client:IClientInterface) {
    const opts:IProviderInterfaceOpts = {
      urlDisplayName: 'S3 Url',
      name: S3ShareProvider.Name,
      // displayName: opts.displayName || (tr('~PROVIDER.LOCAL_FILE')),
      displayName: "S3-shared-provider",
      capabilities: {
        save: true,
        resave: false,
        export: true,
        load: true,
        // NP For now no listing
        list: false,
        remove: false,
        rename: false,
        close: false
      }
    }
    super(opts)
    this.options = opts
    this.client = client
  }

  loadSharedContent(id: string, callback:callbackSigLoad) {
    const sharedMetadata = new CloudMetadata({
      sharedContentId: id,
      type: ICloudFileTypes.File,
      overwritable: false
    })
  }

  getSharingMetadata(shared: boolean) {
    return { _permissions: shared ? 1 : 0 }
  }

  // Public interface called by client:
  share(
    shared: boolean,
    masterContent: CloudContent,
    sharedContent:CloudContent,
    metadata:ICloudMetaDataSpec,
    callback: callbackSigShare) {

    // document ID is stored in masterContent
    const documentID = masterContent.get('sharedDocumentId')

    // newer V2 documents have 'accessKeys'; legacy V1 documents have 'sharedEditKey's
    // which are actually V1 'runKey's under an assumed name (to protect their identity?)
    const accessKeys = masterContent.get('accessKeys')
    const runKey = masterContent.get('shareEditKey')
    const accessKey = accessKeys?.readWrite || runKey
    const docName = (metadata != null ? metadata.filename : undefined) || 'document'
    // NP: Question (TODO) Why was this json content being deflated?
    // payload before looked like this:
    // pako.deflate(sharedContent.getContentAsJSON())


    // if we already have a documentID and some form of accessKey,
    // then we must be updating an existing shared document
    if (documentID && accessKey) {
      // Call update:
      updateFile({
        filename: metadata.filename,
        newFileContent: JSON.stringify(sharedContent),
        // DocumentID is the resourceID for vortex
        resourceId: documentID,
        readWriteToken: accessKey

      }).then( result => {
        callback(null, documentID)
      }).catch(e => {
        reportError(e)
        return callback(`Unable to update shared '${docName}' ${e}`, {})
      })

    // if we don't have a document ID and some form of accessKey,
    // then we must create a new shared document when sharing is being enabled
    } else if (shared) {
      const result = createFile({
        filename: metadata.name,
        fileContent: sharedContent.getContentAsJSON()
      });
      result.then( ({publicUrl, resourceId, readWriteToken}) => {
        metadata.sharedContentSecretKey=readWriteToken
        metadata.url=publicUrl
        // on successful share/save, capture the sharedDocumentId and accessKeys
        masterContent.addMetadata({
          // DocumentId is the same as vortex resourceId
          sharedDocumentId: resourceId,
          accessKeys: { readOnly: publicUrl, readWrite: readWriteToken }
        })
        return callback(null, readWriteToken)
      }).catch( e => {
        return callback(`Unable to share '${docName}' ${e}`, {})
      })
    } else {
      return callback(`Unable to unshare '${docName}' (not implemented)`, {})
    }
  }


  save(content: any, metadata: ICloudMetaDataSpec, callback: callbackSigSave) {
    let payloadContent = content;
    if(typeof(payloadContent) !== "string") {
      payloadContent = JSON.stringify(payloadContent)
    }

    const result = createFile({
      filename: metadata.name,
      fileContent: payloadContent
    });

    result.then( ({publicUrl, resourceId, readWriteToken}) => {
      metadata.sharedContentSecretKey=readWriteToken
      metadata.url=publicUrl
      this.addLocalIndex({
        name: metadata.filename,
        url: publicUrl,
        sharedDocumentId: resourceId,
        sharedContentSecretKey: readWriteToken,
        type: CloudMetadata.File as ICloudFileTypes
      })
      callback(publicUrl);
    });
  }

  addLocalIndex(data:Partial<CloudMetadata>) {
    if(window.localStorage) {
      const oldDataString: string =
        window.localStorage[S3TOKENCACHEKEY]?.push
        ? window.localStorage[S3TOKENCACHEKEY]
        : "[]"
      const oldData = JSON.parse(oldDataString)
      oldData.push(data)
      window.localStorage[S3TOKENCACHEKEY]=JSON.stringify(oldData)
    }
  }

  getLocalIndex():ICloudMetaDataSpec[] {
    let found = []
    try {
      found = JSON.parse(window.localStorage[S3TOKENCACHEKEY])
    }
    catch(e) {
      console.warn("couldn't find cache of shared documents ... ")
    }
    return found
  }

  list(metadata: ICloudMetaDataSpec, callback: callbackSigList) {
    const list = this.getLocalIndex()
    const stuff = list.map( e => {
        return new CloudMetadata({
          name: e.name,
          type: e.type,
          parent: metadata,
          provider: this
        })
      });
    console.log(stuff)
    return callback(null, stuff)
  }

}

export default S3ShareProvider
