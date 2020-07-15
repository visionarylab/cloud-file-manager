import {
  ICloudMetaDataSpec,
  callbackSigShare,
  callbackSigLoad,
  ProviderInterface,
  ICloudFileTypes,
  CloudContent,
  CloudMetadata
}  from './provider-interface'

import { IShareProvider} from './share-provider-interface'
import { createFile, updateFile } from '../utils/s3-share-provider-token-service-helper'
import { reportError } from '../utils/report-error'
import { sha256 } from 'js-sha256';

interface IClientInterface {}

// New method for sharing read only documents using S3.
// The readWrite key must be retained in the original document
// so that the shared document can be upadted.
// Based on the historical `document-store-share-provider`
class S3ShareProvider implements IShareProvider  {
  public static Name ='s3-share-provider'
  client: IClientInterface
  provider: ProviderInterface

  constructor(client:IClientInterface, _provider: ProviderInterface) {
    this.provider = _provider
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

  private updateShare(
    contentJSON: string,
    documentID: string,
    filename: string,
    readWriteToken: string,
    callback: callbackSigShare) {
      // Call update:
      updateFile({
        filename: filename,
        newFileContent: contentJSON,
        // DocumentID is the resourceID for TokenService
        resourceId: documentID,
        readWriteToken: readWriteToken

      }).then( result => {
        result.publicUrl
        callback(null, documentID)
      }).catch(e => {
        reportError(e)
        return callback(`Unable to update shared '${filename}' ${e}`, {})
      })
  }

  private createShare(
    masterContent: CloudContent,
    filename: string,
    contentJSON: string,
    metadata:ICloudMetaDataSpec,
    callback: callbackSigShare,
    ) {
    const result = createFile({
      filename: filename,
      fileContent: contentJSON
    });
    result.then( ({publicUrl, resourceId, readWriteToken}) => {
      metadata.sharedContentSecretKey=readWriteToken
      metadata.url=publicUrl
      // on successful share/save, capture the sharedDocumentId and accessKeys
      masterContent.addMetadata({
        // DocumentId is the same as TokenService resourceId
        sharedDocumentId: resourceId,
        sharedDocumentUrl: publicUrl,
        accessKeys: { readOnly: publicUrl, readWrite: readWriteToken }
      })
      return callback(null, readWriteToken)
    }).catch( e => {
      return callback(`Unable to share '${filename}' ${e}`, {})
    })
  }

  // Public interface called by client:
  share(
    shared: boolean,
    masterContent: CloudContent,
    sharedContent:CloudContent,
    metadata:ICloudMetaDataSpec,
    callback: callbackSigShare) {

    // document ID is stored in masterContent
    let documentID = masterContent.get('sharedDocumentId')

    // newer V2 documents have 'accessKeys'; legacy V1 documents have 'sharedEditKey's
    // which are actually V1 'runKey's under an assumed name (to protect their identity?)
    const accessKeys = masterContent.get('accessKeys')
    const runKey = masterContent.get('shareEditKey')
    let readWriteToken = accessKeys?.readWrite || runKey
    const contentJson = sharedContent.getContentAsJSON()
    const filename = metadata.filename
    // if we already have a documentID and some form of accessKey,
    // then we must be updating an existing shared document
    if (documentID && readWriteToken) {
      // There are two kinds of documents we might encounter:
      // 1. Documents shared using old CFM based on document-store.
      // 2. Documents shared using new, token-service based CFM.
      // There are a few ways to recognize legacy documents that require special handling:
      // - readWriteToken key doesn't start with "read-write-token" prefix
      // - documentID is a number (new docs have Firestore IDs which are combinations of digits and characters)
      // - there is no "sharedDocumentUrl"
      // Any of these methods can be used to detect legacy document.
      const isLegacyDocument = readWriteToken.indexOf("read-write-token") !== 0
      if (isLegacyDocument) {
        // This logic is based on logic in the document store migration script:
        // https://github.com/concord-consortium/document-store/blob/master/token-service-migration/index.js#L115-L126
        documentID = accessKeys.readOnly
        if (!documentID) {
          // document-store migration does the same thing if readOnly key is missing.
          documentID = sha256(readWriteToken)
        }
        // Again, follow document-store migration code.
        readWriteToken = "read-write-token:doc-store-imported:" + readWriteToken
      }
      this.updateShare(contentJson, documentID, filename, readWriteToken, callback)
    // if we don't have a document ID and some form of accessKey,
    // then we must create a new shared document when sharing is being enabled
    } else if (shared) {
      this.createShare(masterContent, filename, contentJson, metadata, callback)
    } else {
      return callback(`Unable to unshare '${filename}' (not implemented)`, {})
    }
  }

}

export default S3ShareProvider
