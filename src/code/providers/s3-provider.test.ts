
import { ImportMock } from 'ts-mock-imports'
import S3Provider from "./s3-provider"
import * as Client from "../client"
import { CloudMetadata } from "./provider-interface"

const clientMockManager = ImportMock.mockClass(Client, 'CloudFileManagerClient')
const client = clientMockManager.getMockInstance()


describe("S3ShareProvider", () => {
  const provider = new S3Provider(client)
  describe("load(metadata: CloudMetadata, callback: callbackSigLoad)", () => {
    describe("when using a legacy documentID", () => {
      it('should return a legacy url', () => {
        const contentId = "1234"
        const metadata = new CloudMetadata({filename: "test", sharedContentId: contentId})
        const callback = (err:string, content: any) => true
        provider.loadFromUrl = (string) => { expect(string).toMatch("legacy-document-store/1234") }
        provider.load(metadata, callback)
      })
    })

    describe("when the ID is a full URL", () => {
      it('should return the url', () => {
        const urlToContent = "https://somethingcool/1234sdfsf/foo.txt"
        const metadata = new CloudMetadata({filename: "test", sharedContentId: urlToContent})
        const callback = (err:string, content: any) => true
        provider.loadFromUrl = (string) => { expect(string).toBe(urlToContent) }
        provider.load(metadata, callback)
      })
    })

  })
})


