import {
  ICloudMetaDataSpec,
  callbackSigLoad,
  callbackSigSave,
  ProviderInterface,
  IProviderInterfaceOpts,
  CloudMetadata,
  cloudContentFactory
}  from './provider-interface'

import { createFile, getLegacyUrl } from '../utils/s3-share-provider-token-service-helper'
import { reportError } from '../utils/report-error'

// TODO: Type the cient
interface IClientInterface {}

// New method for sharing read only documents using S3.
// The readWrite key must be retained in the original document
// so that the shared document can be upadted.
// Based on the historical `document-store-share-provider`
class S3Provider extends ProviderInterface {
  public static Name ='s3-provider'
  client: IClientInterface
  options: IProviderInterfaceOpts
  provider: ProviderInterface
  constructor(client:IClientInterface) {
    const opts:IProviderInterfaceOpts = {
      urlDisplayName: 'S3 Provider',
      name: S3Provider.Name,
      // displayName: opts.displayName || (tr('~PROVIDER.LOCAL_FILE')),
      displayName: "S3 Provider",
      capabilities: {
        save: true,
        load: true,
        // NP For now none of this stuff:
        export: false,
        resave: false,
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

  save(content: any, metadata: ICloudMetaDataSpec, callback: callbackSigSave) {
    let payloadContent = content;
    if(typeof(payloadContent) !== "string") {
      payloadContent = JSON.stringify(payloadContent)
    }

    const result = createFile({
      fileContent: payloadContent
    });

    result.then( ({publicUrl, resourceId, readWriteToken}) => {
      metadata.sharedContentSecretKey=readWriteToken
      metadata.url=publicUrl
      metadata.sharedDocumentUrl=publicUrl
      callback(publicUrl);
    });
  }

  loadFromUrl(
    documentUrl: string,
    metadata: CloudMetadata,
    callback: callbackSigLoad) {
    fetch(documentUrl)
    .then(response => response.json())
    .then(data => {
      const content = cloudContentFactory.createEnvelopedCloudContent(data)
      // for documents loaded by id or other means (besides name),
      // capture the name for use in the CFM interface.
      // 'docName' at the top level for CFM-wrapped documents
      // 'name' at the top level for unwrapped documents (e.g. CODAP)
      // 'name' at the top level of 'content' for wrapped CODAP documents
      const name =
        metadata.name
        || metadata.providerData.name
        || data.docName
        || data.name
        || data.content?.name
      metadata.rename(name)
      if (metadata.name) {
        content.addMetadata({docName: metadata.filename})
      }

      return callback(null, content)
    })
    .catch(e => {
      callback(`Unable to load '${metadata.name}': ${e.message}`, {})
    })
  }

  private getLoadUrlFromSharedContentId(sharedDocumentId: string) {
    const urlRegex = /^http/
    const legacyIDRegex = /^(\d)+$/
    if (sharedDocumentId.match(urlRegex)) {
      return sharedDocumentId
    }
    if (sharedDocumentId.match(legacyIDRegex)) {
      return getLegacyUrl(sharedDocumentId)
    }
    reportError(`Can't find URL from sharedDocumentId: "${sharedDocumentId}"`)
    return null
  }

  load(metadata: CloudMetadata, callback: callbackSigLoad) {
    const id = metadata.sharedContentId
    const loadUrl = this.getLoadUrlFromSharedContentId(id)
    if(loadUrl !== null) {
      this.loadFromUrl(loadUrl, metadata, callback)
    }
    else {
      callback(`Unable to load ${id}`, {})
    }
  }
}

export default S3Provider
