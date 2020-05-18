import { ImportMock } from 'ts-mock-imports'
import {getLegacyUrl, getModernUrl} from './s3-share-provider-token-service-helper'
import * as Config from "./config"

// export const getModernUrl = (documentId: string, filename:string) => {
//   const path = S3_SHARED_DOC_PATH_NEW
//   return `${getBaseDocumentUrl()}/${path}/${documentId}/${filename}`
// }

// export const getLegacyUrl = (documentId: string) => {
//   const path = S3_SHARED_DOC_PATH_LEGACY
//   return `${getBaseDocumentUrl()}/${path}/${documentId}`
// };

const filename = "testing.txt"
const newId = "2a334ddse2"
const legacyId = "23424"

describe("s3-share-provider-token-service-helper", () => {
  describe("production environment", () => {
    beforeEach( () => {
      ImportMock.mockFunction(Config, 'getTokenServiceEnv', 'production')
    })
    afterEach( () => {
      ImportMock.restore();
    })
    describe("getModernUrl", () => {
      it("return a modern production S3 URL for a document id", () => {
  
        const result = getModernUrl(newId, filename)
        expect(result).toEqual("https://models-resources.concord.org/cfm-shared-documents/2a334ddse2/testing.txt")
      })
    })
    describe("getLegacyUrl", () => {
      it("should return a production legacy url … ", () => {
        const result = getLegacyUrl(legacyId)
        expect(result).toEqual("https://models-resources.concord.org/legacy-document-store/23424")
      })
    })
  })
  describe("staging environment", () => {
    beforeEach( () => {
      ImportMock.mockFunction(Config, 'getTokenServiceEnv', 'staging')
    })
    afterEach( () => {
      ImportMock.restore();
    })
    describe("getModernUrl", () => {
      it("return a modern S3 URL for a document id", () => {
  
        const result = getModernUrl(newId, filename)
        expect(result).toEqual("https://token-service-files.concordqa.org/cfm-shared-documents/2a334ddse2/testing.txt")
      })
    })
    describe("getLegacyUrl", () => {
      it("should return a legacy url … ", () => {
        const result = getLegacyUrl(legacyId)
        expect(result).toEqual("https://token-service-files.concordqa.org/legacy-document-store/23424")
      })
    })
  })
})




