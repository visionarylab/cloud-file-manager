

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
import { createFile, updateFile } from './s3-share-provider-token-service-helper'
import { reportError } from '../utils/report-error'

interface IClientInterface {}



// New method for sharing read only documents using S3.
// The readWrite key must be retained in the original document
// so that the shared document can be upadted.
// Based on the historical `document-store-share-provider`
class S3ShareProvider implements IShareProvider  {
  public static Name ='s3-share-provider'
  client: IClientInterface
  // NP 2020-05-11 :  I don't think we need this provider reference...
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
        result.publicUrl
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
          sharedDocumentUrl: publicUrl,
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

}

export default S3ShareProvider
