// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const AppView = createReactFactory(require('./views/app-view'));

const { CloudFileManagerUIMenu } = (require('./ui'));
const { CloudFileManagerClient } = (require('./client'));

const getHashParam = require('./utils/get-hash-param');

class CloudFileManager {

  constructor(options) {
    // since the module exports an instance of the class we need to fake a class variable as an instance variable
    this.DefaultMenu = CloudFileManagerUIMenu.DefaultMenu;

    this.client = new CloudFileManagerClient();
    this.appOptions = {};
  }

  // usingIframe: if true, client app is wrapped in an iframe within the CFM-managed div
  // appOrMenuElemId: if appOrMenuElemId is passed and usingIframe is true, then the CFM
  //   presents its UI and the wrapped client app within the specified element. If
  //   appOrMenuElemId is set and usingIframe is false, then the CFM presents its menubar
  //   UI within the specified element, but there is no iframe or wrapped client app.
  init(appOptions) {
    this.appOptions = appOptions;
    this.appOptions.hashParams = {
      sharedContentId: getHashParam("shared"),
      fileParams: getHashParam("file"),
      copyParams: getHashParam("copy"),
      newInFolderParams: getHashParam("newInFolder")
    };

    return this.client.setAppOptions(this.appOptions);
  }

  // Convenience function for setting up CFM with an iframe-wrapped client app
  createFrame(appOptions, appElemId, eventCallback = null) {
    this.appOptions = appOptions;
    this.appOptions.usingIframe = true;
    this.appOptions.appOrMenuElemId = appElemId;
    this.init(this.appOptions);
    this.client.listen(eventCallback);
    return this._renderApp(document.getElementById(appElemId));
  }

  clientConnect(eventCallback) {
    try {
      if (this.appOptions.appOrMenuElemId != null) {
        this._renderApp(document.getElementById(this.appOptions.appOrMenuElemId));
      } else {
        this._createHiddenApp();
      }
    } catch (e) {
      console.error(`Unable render app: ${e}`);
    }
    this.client.listen(eventCallback);
    this.client.connect();

    // open any initial document (if any specified) and signal ready()
    this.client.processUrlParams();

    // if iframed let the parent know about the connect
    if (window.parent !== window) {
      return window.parent.postMessage({type: "cfm::iframedClientConnected"}, "*");
    }
  }

  _createHiddenApp() {
    const anchor = document.createElement("div");
    document.body.appendChild(anchor);
    return this._renderApp(anchor);
  }

  _renderApp(anchor) {
    this.appOptions.client = this.client;
    ReactDOM.render((AppView(this.appOptions)), anchor);
    this.client.iframe = anchor.getElementsByTagName('iframe')[0];
    return this.client.rendered();
  }
}

const instance = new  CloudFileManager();
module.exports = instance;
global.CloudFileManager = instance;
