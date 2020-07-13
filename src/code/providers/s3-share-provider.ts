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
    accessKey: string,
    callback: callbackSigShare) {
      // Call update:
      updateFile({
        filename: filename,
        newFileContent: contentJSON,
        // DocumentID is the resourceID for TokenService
        resourceId: documentID,
        readWriteToken: accessKey

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
    const documentID = masterContent.get('sharedDocumentId')

    // newer V2 documents have 'accessKeys'; legacy V1 documents have 'sharedEditKey's
    // which are actually V1 'runKey's under an assumed name (to protect their identity?)
    const accessKeys = masterContent.get('accessKeys')
    const runKey = masterContent.get('shareEditKey')
    const accessKey = accessKeys?.readWrite || runKey
    const contentJson = sharedContent.getContentAsJSON()
    const filename = metadata.filename
    // if we already have a documentID and some form of accessKey,
    // then we must be updating an existing shared document
    if (documentID && accessKey) {
      this.updateShare(contentJson, documentID, filename, accessKey, callback)
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
