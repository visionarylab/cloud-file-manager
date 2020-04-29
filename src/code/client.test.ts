import {CloudFileManagerClient, CloudFileManagerClientEvent} from "./client"

test('Client id increments with each event registered', () => {
  const clientEvent = new CloudFileManagerClientEvent({type: "any", data: {}, state: {}})
  expect(clientEvent.id).toBe(1)
  const clientEvent2 = new CloudFileManagerClientEvent({type: "any", data: {}, state: {}})
  expect(clientEvent2.id).toBe(2)
})