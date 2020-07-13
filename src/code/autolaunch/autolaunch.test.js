import { codap_v2_link } from "./autolaunch"

describe("codap_v2_link", () => {
  it("provides custom cfmBaseUrl when necessary", () => {
    window.history.pushState({}, "Test Title", "/autolaunch/autolaunch.html");
    expect(codap_v2_link()).toEqual("https://codap.concord.org/releases/latest/"); // no cfmBaseUrl

    window.history.pushState({}, "Test Title", "/branch/master/autolaunch/autolaunch.html");
    expect(codap_v2_link()).toEqual("https://codap.concord.org/releases/latest/?cfmBaseUrl=https%3A%2F%2Fcloud-file-manager.concord.org%2Fbranch%2Fmaster%2Fjs"); // cfmBaseUrl defined
  })
})
