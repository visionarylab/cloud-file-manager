
import { ImportMock } from 'ts-mock-imports'
import S3ShareProvider from "./s3-share-provider"
import * as helperModule from '../utils/s3-share-provider-token-service-helper'
import * as Client from "../client"
import { CloudContent, CloudMetadata, ICloudMetaDataSpec } from "./provider-interface"
import LocalStorageProvider from './localstorage-provider'

const clientMockManager = ImportMock.mockClass(Client, 'CloudFileManagerClient')
const client = clientMockManager.getMockInstance()
const localstorageProvider = new LocalStorageProvider({},client)

const publicUrl = 'publicUrl'
const resourceId = 'resourceId'
const readWriteToken = 'RWToken'

describe("S3ShareProvider", () => {
  const provider = new S3ShareProvider(client, localstorageProvider)
  const masterContent = new CloudContent({content: "test"}, "huh")
  const sharedContent = new CloudContent({content: "test 2"}, "huh")
  const metadata = new CloudMetadata({filename: "test"})

  const createResult = new Promise( (resolve) => {
    const data = { publicUrl, resourceId, readWriteToken }
    resolve (data)
  })

  const updateResult = createResult
  const create = ImportMock.mockFunction(helperModule, "createFile", createResult)
  const upate = ImportMock.mockFunction(helperModule, 'updateFile', updateResult)
  describe("share", () => {
    describe("When not previously shared", () => {
      it("Should return a new ReadWrite token", done => {
        const callback = (error:any, data: any) => {
          try {
            // Don't expect an error:
            expect(error).toBeNull()
            // Expect the Read & write token in the callback:
            expect(data).toBe(readWriteToken)
            const originalDoc = masterContent.getContent()
            // expect the masterConent to now have a sharedDocumentId:
            expect(originalDoc?.sharedDocumentId).toBe(resourceId)
            // expect the masterConent to now have a sharedDocumentUrl:
            expect(originalDoc?.sharedDocumentUrl).toBe(publicUrl)
            // expect the masterConent to now have a readWriteToken:
            expect(originalDoc?.accessKeys?.readWrite).toBe(readWriteToken)
            done()
          }
          catch(e) {
            done(e)
          }
        }
        const result = provider.share(true, masterContent, sharedContent, metadata, callback)
        // the share method doesn't return anything ...
        expect(result).toBeUndefined()
      })
    })

  })
})


