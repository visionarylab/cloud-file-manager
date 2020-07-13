import { ImportMock } from 'ts-mock-imports'
import { getLegacyUrl } from './s3-share-provider-token-service-helper'
import * as Config from "./config"

const legacyId = "23424"

describe("s3-share-provider-token-service-helper", () => {
  describe("production environment", () => {
    beforeEach( () => {
      ImportMock.mockFunction(Config, 'getTokenServiceEnv', 'production')
    })
    afterEach( () => {
      ImportMock.restore();
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
    describe("getLegacyUrl", () => {
      it("should return a legacy url … ", () => {
        const result = getLegacyUrl(legacyId)
        expect(result).toEqual("https://token-service-files.concordqa.org/legacy-document-store/23424")
      })
    })
  })
})




