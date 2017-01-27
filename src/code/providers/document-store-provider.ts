let {div, button, span} = React.DOM;

import getQueryParam from '../utils/get-query-param';
import getHashParam from '../utils/get-hash-param';
import tr from '../utils/translate';
import isString from '../utils/is-string';
import jiff from 'jiff';
import pako from 'pako';

import { ProviderInterface } from './provider-interface';
import { cloudContentFactory } from './provider-interface';
import { CloudMetadata } from './provider-interface';

import DocumentStoreUrl from './document-store-url';
import PatchableContent from './patchable-content';

let DocumentStoreAuthorizationDialog = React.createFactory(React.createClass({
  displayName: 'DocumentStoreAuthorizationDialog',

  getInitialState() {
    return {docStoreAvailable: false};
  },

  componentWillMount() {
    return this.props.provider._onDocStoreLoaded(() => {
      return this.setState({docStoreAvailable: true});
    }
    );
  },

  authenticate() {
    return this.props.provider.authorize();
  },

  render() {
    return (div({className: 'document-store-auth'},
      (div({className: 'document-store-concord-logo'}, '')),
      (div({className: 'document-store-footer'},
        this.state.docStoreAvailable ?
          (button({onClick: this.authenticate}, 'Login to Concord'))
        :
          'Trying to log into Concord...'
      ))
    ));
  }
})
);

class DocumentStoreProvider extends ProviderInterface {
  static initClass() {
  
    this.Name = 'documentStore';
  
    this.prototype._loginWindow = null;
  }

  constructor(options, client) {
    if (options == null) { options = {}; }
    super({
      name: DocumentStoreProvider.Name,
      displayName: options.displayName || (tr('~PROVIDER.DOCUMENT_STORE')),
      urlDisplayName: options.urlDisplayName
    });
    this.capabilities = {
      save: this.isNotDeprecated('save'),
      resave: this.isNotDeprecated('save'),
      export: false,
      load: this.isNotDeprecated('load'),
      list: this.isNotDeprecated('list'),
      remove: this.isNotDeprecated('remove'),
      rename: this.isNotDeprecated('rename'),
      close: false
    };
    this.options = options;
    this.client = client;
    if (this.options.deprecationPhase == null) { this.options.deprecationPhase = 0; }

    this.urlParams = {
      documentServer: getQueryParam("documentServer"),
      recordid: getQueryParam("recordid"),
      runKey: getQueryParam("runKey"),
      docName: getQueryParam("doc"),
      docOwner: getQueryParam("owner")
    };
    // query params that can be removed after initial processing
    this.removableQueryParams = ['recordid', 'doc', 'owner'];

    this.docStoreUrl = new DocumentStoreUrl(this.urlParams.documentServer);

    this.user = null;

    this.savedContent = new PatchableContent(this.options.patchObjectHash);
  }

  can(capability, metadata) {
    // legacy sharing support - can't save to old-style shared documents
    if (((capability === 'save') || (capability === 'resave')) && __guard__(__guard__(metadata, x1 => x1.providerData), x => x.owner)) { return false; }
    return super.can(capability, metadata);
  }

  // if a runKey is specified, we don't need to authenticate at all
  isAuthorizationRequired() {
    return !(this.urlParams.runKey || (this.urlParams.docName && this.urlParams.docOwner));
  }

  authorized(authCallback) {
    this.authCallback = authCallback;
    if (this.authCallback) {
      if (this.user) {
        return this.authCallback(true);
      } else {
        return this._checkLogin();
      }
    } else {
      return this.user !== null;
    }
  }

  authorize(completionCallback) {
    return this._showLoginWindow(completionCallback);
  }

  _onDocStoreLoaded(docStoreLoadedCallback) {
    this.docStoreLoadedCallback = docStoreLoadedCallback;
    if (this._docStoreLoaded) {
      return this.docStoreLoadedCallback();
    }
  }

  _checkLogin() {
    let loggedIn = user => {
      this.user = user;
      this._docStoreLoaded = true;
      __guardMethod__(this, 'docStoreLoadedCallback', o => o.docStoreLoadedCallback());
      if (user) {
        __guard__(this._loginWindow, x => x.close());
      }
      if (this.authCallback) { return this.authCallback((user !== null)); }
    };

    return $.ajax({
      dataType: 'json',
      url: this.docStoreUrl.checkLogin(),
      xhrFields: {
        withCredentials: true
      },
      success(data) { return loggedIn(data); },
      error() { return loggedIn(null); }
    });
  }

  _showLoginWindow(completionCallback) {
    if (this._loginWindow && !this._loginWindow.closed) {
      this._loginWindow.focus();
    } else {

      let computeScreenLocation = function(w, h) {
        let screenLeft = window.screenLeft || screen.left;
        let screenTop  = window.screenTop  || screen.top;
        let width  = window.innerWidth  || document.documentElement.clientWidth  || screen.width;
        let height = window.innerHeight || document.documentElement.clientHeight || screen.height;

        let left = ((width / 2) - (w / 2)) + screenLeft;
        let top = ((height / 2) - (h / 2)) + screenTop;
        return {left, top};
      };

      let width = 1000;
      let height = 480;
      let position = computeScreenLocation(width, height);
      let windowFeatures = [
        `width=${width}`,
        `height=${height}`,
        (`top=${position.top}`) || 200,
        (`left=${position.left}`) || 200,
        'dependent=yes',
        'resizable=no',
        'location=no',
        'dialog=yes',
        'menubar=no'
      ];

      this._loginWindow = window.open(this.docStoreUrl.authorize(), 'auth', windowFeatures.join());

      if (this._loginWindow) {
        let pollAction = () => {
          try {
            if (this._loginWindow.location.host === window.location.host) {
              clearInterval(poll);
              this._loginWindow.close();
              this._checkLogin();
              if (completionCallback) { return completionCallback(); }
            }
          } catch (e) {}
        };
            // console.log e

        var poll = setInterval(pollAction, 200);
      }
    }

    return this._loginWindow;
  }

  renderAuthorizationDialog() {
    return (DocumentStoreAuthorizationDialog({provider: this, authCallback: this.authCallback}));
  }

  renderUser() {
    if (this.user) {
      return (span({}, (span({className: 'document-store-icon'})), this.user.name));
    } else {
      return null;
    }
  }

  filterTabComponent(capability, defaultComponent) {
    // allow the save elsewhere button to hide the document provider tab in save
    if ((capability === 'save') && this.disableForNextSave) {
      this.disableForNextSave = false;
      return null;
    } else {
      return defaultComponent;
    }
  }

  isNotDeprecated(capability) {
    if (capability === 'save') {
      return this.options.deprecationPhase < 2;
    } else {
      return this.options.deprecationPhase < 3;
    }
  }

  deprecationMessage() {
    let messages = [
      tr('~CONCORD_CLOUD_DEPRECATION.SAVE_PHASE_1'),
      tr('~CONCORD_CLOUD_DEPRECATION.SAVE_PHASE_2'),
      tr('~CONCORD_CLOUD_DEPRECATION.SAVE_PHASE_3')
    ];
    if ((this.options.deprecationPhase > 0) && (this.options.deprecationPhase <= messages.length)) {
      return messages[this.options.deprecationPhase - 1];
    } else {
      return null;
    }
  }

  onProviderTabSelected(capability) {
    if ((capability === 'save') && this.deprecationMessage()) {
      return this.client.alert(this.deprecationMessage(), (tr('~CONCORD_CLOUD_DEPRECATION.ALERT_SAVE_TITLE')));
    }
  }

  handleUrlParams() {
    if (this.urlParams.recordid) {
      this.client.openProviderFile(this.name, { id: this.urlParams.recordid });
      return true; // signal that the provider is handling the params
    } else if (this.urlParams.docName && this.urlParams.docOwner) {
      this.client.openProviderFile(this.name, { name: this.urlParams.docName, owner: this.urlParams.docOwner });
      return true; // signal that the provider is handling the params
    } else {
      return false;
    }
  }

  list(metadata, callback) {
    return $.ajax({
      dataType: 'json',
      url: this.docStoreUrl.listDocuments(),
      context: this,
      xhrFields: {
        withCredentials: true
      },
      success(data) {
        let list = [];
        for (let key of Object.keys(data || {})) {
          let file = data[key];
          if (this.matchesExtension(file.name)) {
            list.push(new CloudMetadata({
              name: file.name,
              providerData: {id: file.id},
              type: CloudMetadata.File,
              provider: this
            })
            );
          }
        }
        return callback(null, list);
      },
      error() {
        return callback(null, []);
      },
      statusCode: {
        [403]: () => {
          this.user = null;
          return this.authCallback(false);
        }
      }
    });
  }

  load(metadata, callback) {
    let withCredentials = !metadata.sharedContentId ? true : false;
    let recordid = __guard__(metadata.providerData, x => x.id) || metadata.sharedContentId;
    let requestData = {};
    if (recordid) { requestData.recordid = recordid; }
    if (this.urlParams.runKey) { requestData.runKey = this.urlParams.runKey; }
    if (!recordid) {
      if (__guard__(metadata.providerData, x1 => x1.name)) { requestData.recordname = __guard__(metadata.providerData, x2 => x2.name); }
      if (__guard__(metadata.providerData, x3 => x3.owner)) { requestData.owner = __guard__(metadata.providerData, x4 => x4.owner); }
    }
    return $.ajax({
      url: this.docStoreUrl.loadDocument(),
      dataType: 'json',
      data: requestData,
      context: this,
      xhrFields:
        {withCredentials},
      success(data) {
        let content = cloudContentFactory.createEnvelopedCloudContent(data);

        // for documents loaded by id or other means (besides name),
        // capture the name for use in the CFM interface.
        // 'docName' at the top level for CFM-wrapped documents
        // 'name' at the top level for unwrapped documents (e.g. CODAP)
        // 'name' at the top level of 'content' for wrapped CODAP documents
        metadata.rename(metadata.name || metadata.providerData.name ||
                        data.docName || data.name || __guard__(data.content, x5 => x5.name)
        );
        if (metadata.name) {
          content.addMetadata({docName: metadata.filename});
        }

        return callback(null, content);
      },
      statusCode: {
        [403]: () => {
          this.user = null;
          return callback(tr("~DOCSTORE.LOAD_403_ERROR", {filename: metadata.name || 'the file'}), 403);
        }
      },

      error(jqXHR) {
        if (jqXHR.status === 403) { return; } // let statusCode handler deal with it
        let message = metadata.sharedContentId ?
          tr("~DOCSTORE.LOAD_SHARED_404_ERROR")
        :
          tr("~DOCSTORE.LOAD_404_ERROR", {filename: metadata.name || __guard__(metadata.providerData, x5 => x5.id) || 'the file'});
        return callback(message);
      }
    });
  }

  save(cloudContent, metadata, callback) {
    let content = cloudContent.getContent();

    // See if we can patch
    let patchResults = this.savedContent.createPatch(content, this.options.patch && metadata.overwritable);

    if (patchResults.shouldPatch && !patchResults.diffLength) {
      // no reason to patch if there are no diffs
      callback(null); // no error indicates success
      return;
    }

    let params = {};
    if (metadata.providerData.id) { params.recordid = metadata.providerData.id; }

    if (!patchResults.shouldPatch && metadata.filename) {
      params.recordname = metadata.filename;
    }

    // If we are saving for the first time as a student in a LARA activity, then we do not have
    // authorization on the current document. However, we should have a runKey query parameter.
    // When we save with this runKey, the document will save our changes to a copy of the document,
    // owned by us.
    //
    // When we successfully save, we will get the id of the new document in the response, and use
    // this id for future saving. We can then save via patches, and don't need the runKey.
    if (this.urlParams.runKey) {
      params.runKey = this.urlParams.runKey;
    }

    return $.ajax({
      dataType: 'json',
      type: 'POST',
      url: patchResults.shouldPatch 
            ? this.docStoreUrl.patchDocument(params) 
            : this.docStoreUrl.saveDocument(params),
      data: pako.deflate(patchResults.sendContent),
      contentType: patchResults.mimeType,
      processData: false,
      beforeSend(xhr) {
        return xhr.setRequestHeader('Content-Encoding', 'deflate');
      },
      context: this,
      xhrFields: {
        withCredentials: true
      },
      success(data) {
        this.savedContent.updateContent(this.options.patch ? _.cloneDeep(content) : null);
        if (data.id) { metadata.providerData.id = data.id; }

        return callback(null, data);
      },
      statusCode: {
        [403]: () => {
          this.user = null;
          return callback(tr("~DOCSTORE.SAVE_403_ERROR", {filename: metadata.name}), 403);
        }
      },
      error(jqXHR) {
        try {
          if (jqXHR.status === 403) { return; } // let statusCode handler deal with it
          let responseJson = JSON.parse(jqXHR.responseText);
          if (responseJson.message === 'error.duplicate') {
            return callback(tr("~DOCSTORE.SAVE_DUPLICATE_ERROR", {filename: metadata.name}));
          } else {
            return callback(tr("~DOCSTORE.SAVE_ERROR_WITH_MESSAGE", {filename: metadata.name, message: responseJson.message}));
          }
        } catch (error) {
          return callback(tr("~DOCSTORE.SAVE_ERROR", {filename: metadata.name}));
        }
      }});
  }

  remove(metadata, callback) {
    return $.ajax({
      url: this.docStoreUrl.deleteDocument(),
      data: {
        recordname: metadata.filename
      },
      context: this,
      xhrFields: {
        withCredentials: true
      },
      success(data) {
        return callback(null, data);
      },
      statusCode: {
        [403]: () => {
          this.user = null;
          return callback(tr("~DOCSTORE.REMOVE_403_ERROR", {filename: metadata.name}), 403);
        }
      },
      error(jqXHR) {
        if (jqXHR.status === 403) { return; } // let statusCode handler deal with it
        return callback(tr("~DOCSTORE.REMOVE_ERROR", {filename: metadata.name}));
      }});
  }

  rename(metadata, newName, callback) {
    return $.ajax({
      url: this.docStoreUrl.renameDocument(),
      data: {
        recordid: metadata.providerData.id,
        newRecordname: CloudMetadata.withExtension(newName)
      },
      context: this,
      xhrFields: {
        withCredentials: true
      },
      success(data) {
        metadata.rename(newName);
        return callback(null, metadata);
      },
      statusCode: {
        [403]: () => {
          this.user = null;
          return callback(tr("~DOCSTORE.RENAME_403_ERROR", {filename: metadata.name}), 403);
        }
      },
      error(jqXHR) {
        if (jqXHR.status === 403) { return; } // let statusCode handler deal with it
        return callback(tr("~DOCSTORE.RENAME_ERROR", {filename: metadata.name}));
      }});
  }

  canOpenSaved() { return true; }

  openSaved(openSavedParams, callback) {
    let providerData = typeof openSavedParams === "object" 
                      ? openSavedParams 
                      : { id: openSavedParams };
    let metadata = new CloudMetadata({
      type: CloudMetadata.File,
      provider: this,
      providerData
    });

    return this.load(metadata, (err, content) => {
      this.client.removeQueryParams(this.removableQueryParams);
      return callback(err, content, metadata);
    }
    );
  }

  getOpenSavedParams(metadata) {
    return metadata.providerData.id;
  }

  fileOpened(content, metadata) {
    let deprecationPhase = this.options.deprecationPhase || 0;
    let fromLara = !!getQueryParam("launchFromLara") || !!getHashParam("lara");
    if (!deprecationPhase || fromLara) { return; }
    return this.client.confirmDialog({
      title: tr('~CONCORD_CLOUD_DEPRECATION.CONFIRM_SAVE_TITLE'),
      message: this.deprecationMessage(),
      yesTitle: tr('~CONCORD_CLOUD_DEPRECATION.CONFIRM_SAVE_ELSEWHERE'),
      noTitle: tr('~CONCORD_CLOUD_DEPRECATION.CONFIRM_DO_IT_LATER'),
      hideNoButton: deprecationPhase >= 3,
      callback: () => {
        this.disableForNextSave = true;
        return this.client.saveFileAsDialog();
      },
      rejectCallback: () => {
        if (deprecationPhase > 1) {
          return this.client.appOptions.autoSaveInterval = null;
        }
      }
    });
  }
}
DocumentStoreProvider.initClass();

export default DocumentStoreProvider;

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}
function __guardMethod__(obj, methodName, transform) {
  if (typeof obj !== 'undefined' && obj !== null && typeof obj[methodName] === 'function') {
    return transform(obj, methodName);
  } else {
    return undefined;
  }
}