

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

import { createFile, updateFile } from './s3-share-provider-token-service-helper'
import { reportError } from '../utils/report-error'

const S3TOKENCACHEKEY = 'CFM::__S3KEYCACHE__'
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

  private addLocalIndex(data:Partial<CloudMetadata>) {
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

  private getLocalIndex():ICloudMetaDataSpec[] {
    let found = []
    try {
      found = JSON.parse(window.localStorage[S3TOKENCACHEKEY])
    }
    catch(e) {
      console.warn("couldn't find cache of shared documents ... ")
    }
    return found
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

export default S3Provider
