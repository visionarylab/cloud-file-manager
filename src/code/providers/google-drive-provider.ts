let {div, button, span} = React.DOM;

import tr from '../utils/translate';
import isString from '../utils/is-string';
import jsdiff from 'diff';

import { ProviderInterface } from './provider-interface';
import { cloudContentFactory } from './provider-interface';
import { CloudMetadata } from './provider-interface';

let GoogleDriveAuthorizationDialog = React.createFactory(React.createClass({
  displayName: 'GoogleDriveAuthorizationDialog',

  getInitialState() {
    return {loadedGAPI: window._LoadedGAPIClients};
  },

  // See comments in AuthorizeMixin for detailed description of the issues here.
  // The short version is that we need to maintain synchronized instance variable
  // and state to track authorization status while avoiding calling setState on
  // unmounted components, which doesn't work and triggers a React warning.

  componentWillMount() {
    return this.props.provider._loadedGAPI(() => {
      if (this._isMounted) {
        return this.setState({loadedGAPI: true});
      }
    }
    );
  },

  componentDidMount() {
    this._isMounted = true;
    if (this.state.loadedGAPI !== window._LoadedGAPIClients) {
      return this.setState({loadedGAPI: window._LoadedGAPIClients});
    }
  },

  componentWillUnmount() {
    return this._isMounted = false;
  },

  authenticate() {
    return this.props.provider.authorize(GoogleDriveProvider.SHOW_POPUP);
  },

  render() {
    return (div({className: 'google-drive-auth'},
      (div({className: 'google-drive-concord-logo'}, '')),
      (div({className: 'google-drive-footer'},
        window._LoadedGAPIClients || this.state.loadedGAPI ?
          (button({onClick: this.authenticate}, (tr("~GOOGLE_DRIVE.LOGIN_BUTTON_LABEL"))))
        :
          (tr("~GOOGLE_DRIVE.CONNECTING_MESSAGE"))
      ))
    ));
  }
})
);

class GoogleDriveProvider extends ProviderInterface {
  static initClass() {
  
    this.Name = 'googleDrive';
  
    // aliases for boolean parameter to authorize
    this.IMMEDIATE = true;
    this.SHOW_POPUP = false;
  }

  constructor(options, client) {
    if (options == null) { options = {}; }
    super({
      name: GoogleDriveProvider.Name,
      displayName: options.displayName || (tr('~PROVIDER.GOOGLE_DRIVE')),
      urlDisplayName: options.urlDisplayName,
      capabilities: {
        save: true,
        resave: true,
        export: true,
        load: true,
        list: true,
        remove: false,
        rename: true,
        close: true,
        setFolder: true
      }
    });
    this.options = options;
    this.client = client;
    this.authToken = null;
    this.user = null;
    this.clientId = this.options.clientId;
    if (!this.clientId) {
      throw new Error((tr("~GOOGLE_DRIVE.ERROR_MISSING_CLIENTID")));
    }
    this.mimeType = this.options.mimeType || "text/plain";
    this.readableMimetypes = this.options.readableMimetypes;
    this.useRealTimeAPI = this.options.useRealTimeAPI || false;
    if (this.useRealTimeAPI) {
      this.mimeType += '+cfm_realtime';
    }
    this._loadGAPI();
  }

  authorized(authCallback) {
    if (!authCallback == null) { this.authCallback = authCallback; }
    if (authCallback) {
      if (this.authToken) {
        return authCallback(true);
      } else {
        return this.authorize(GoogleDriveProvider.IMMEDIATE);
      }
    } else {
      return this.authToken !== null;
    }
  }

  authorize(immediate) {
    return this._loadedGAPI(() => {
      let args = {
        client_id: this.clientId,
        scope: [
          'https://www.googleapis.com/auth/drive',
          'https://www.googleapis.com/auth/drive.install',
          'https://www.googleapis.com/auth/drive.file',
          'https://www.googleapis.com/auth/userinfo.profile'
        ],
        immediate
      };
      return gapi.auth.authorize(args, authToken => {
        this.authToken = authToken && !authToken.error ? authToken : null;
        this.user = null;
        this.autoRenewToken(this.authToken);
        if (this.authToken) {
          gapi.client.oauth2.userinfo.get().execute(user => {
            return this.user = user;
          }
          );
        }
        return __guardMethod__(this, 'authCallback', o => o.authCallback(this.authToken !== null));
      }
      );
    }
    );
  }

  autoRenewToken(authToken) {
    if (this._autoRenewTimeout) {
      clearTimeout(this._autoRenewTimeout);
    }
    if (authToken && !authToken.error) {
      return this._autoRenewTimeout = setTimeout((() => this.authorize(GoogleDriveProvider.IMMEDIATE)), (parseInt(authToken.expires_in, 10) * 0.75) * 1000);
    }
  }

  renderAuthorizationDialog() {
    return (GoogleDriveAuthorizationDialog({provider: this}));
  }

  renderUser() {
    if (this.user) {
      return (span({}, (span({className: 'gdrive-icon'})), this.user.name));
    } else {
      return null;
    }
  }

  save(content, metadata, callback) {
    return this._loadedGAPI(() => {
      if (this.useRealTimeAPI) {
        return this._saveRealTimeFile(content, metadata, callback);
      } else {
        return this._saveFile(content, metadata, callback);
      }
    }
    );
  }

  load(metadata, callback) {
    return this._loadedGAPI(() => {
      if (this.useRealTimeAPI) {
        return this._loadOrCreateRealTimeFile(metadata, callback);
      } else {
        return this._loadFile(metadata, callback);
      }
    }
    );
  }

  list(metadata, callback) {
    return this._loadedGAPI(() => {
      let mimeType, query;
      let mimeTypesQuery = ((() => {
        let result = [];
        for (mimeType of Array.from(this.readableMimetypes)) {           result.push(`mimeType = '${mimeType}'`);
        }
        return result;
      })()).join(" or ");
      let request = gapi.client.drive.files.list({
        q: query = `trashed = false and (${mimeTypesQuery} or mimeType = 'application/vnd.google-apps.folder') and '${metadata ? metadata.providerData.id : 'root'}' in parents`});
      return request.execute(result => {
        if (!result || result.error) { return callback(this._apiError(result, 'Unable to list files')); }
        let list = [];
        for (let item of Array.from(__guard__(result, x => x.items))) {
          let type = item.mimeType === 'application/vnd.google-apps.folder' ? CloudMetadata.Folder : CloudMetadata.File;
          if ((type === CloudMetadata.Folder) || this.matchesExtension(item.title)) {
            list.push(new CloudMetadata({
              name: item.title,
              type,
              parent: metadata,
              overwritable: item.editable,
              provider: this,
              providerData: {
                id: item.id
              }
            })
            );
          }
        }
        list.sort(function(a, b) {
          let lowerA = a.name.toLowerCase();
          let lowerB = b.name.toLowerCase();
          if (lowerA < lowerB) { return -1; }
          if (lowerA > lowerB) { return 1; }
          return 0;
        });
        return callback(null, list);
      }
      );
    }
    );
  }

  remove(metadata, callback) {
    return this._loadedGAPI(function() {
      let request = gapi.client.drive.files.delete({
        fileId: metadata.providerData.id});
      return request.execute(result => __guardFunc__(callback, f => f(__guard__(result, x => x.error) || null)));
    });
  }

  rename(metadata, newName, callback) {
    return this._loadedGAPI(function() {
      let request = gapi.client.drive.files.patch({
        fileId: metadata.providerData.id,
        resource: {
          title: CloudMetadata.withExtension(newName)
        }
      });
      return request.execute(function(result) {
        if (__guard__(result, x => x.error)) {
          return __guardFunc__(callback, f => f(result.error));
        } else {
          metadata.rename(newName);
          return callback(null, metadata);
        }
      });
    });
  }

  close(metadata, callback) {
    if (__guard__(__guard__(metadata.providerData, x1 => x1.realTime), x => x.doc) != null) {
      return metadata.providerData.realTime.doc.close();
    }
  }

  canOpenSaved() { return true; }

  openSaved(openSavedParams, callback) {
    let metadata = new CloudMetadata({
      type: CloudMetadata.File,
      provider: this,
      providerData: {
        id: openSavedParams
      }
    });
    return this.load(metadata, (err, content) => callback(err, content, metadata));
  }

  getOpenSavedParams(metadata) {
    return metadata.providerData.id;
  }

  _loadGAPI() {
    if (!window._LoadingGAPI) {
      window._LoadingGAPI = true;
      window._GAPIOnLoad = () => {
        window._LoadedGAPI = true;
        // preload clients to avoid user delay later
        return this._loadedGAPI(function() {});
      };
      let script = document.createElement('script');
      script.src = 'https://apis.google.com/js/client.js?onload=_GAPIOnLoad';
      return document.head.appendChild(script);
    }
  }

  _loadedGAPI(callback) {
    if (window._LoadedGAPIClients) {
      return callback();
    } else {
      let self = this;
      var check = function() {
        if (window._LoadedGAPI) {
          return gapi.client.load('drive', 'v2', () =>
            gapi.client.load('oauth2', 'v2', () =>
              gapi.load('drive-realtime', function() {
                window._LoadedGAPIClients = true;
                return callback.call(self);
              })
            )
          );
        } else {
          return setTimeout(check, 10);
        }
      };
      return setTimeout(check, 10);
    }
  }

  _loadFile(metadata, callback) {
    let request = gapi.client.drive.files.get({
      fileId: metadata.providerData.id});
    return request.execute(file => {
      if (__guard__(file, x => x.downloadUrl)) {
        metadata.rename(file.title);
        metadata.overwritable = file.editable;
        metadata.providerData = {id: file.id};
        if ((metadata.parent == null) && (__guard__(file.parents, x1 => x1.length) > 0)) {
          metadata.parent = new CloudMetadata({
            type: CloudMetadata.Folder,
            provider: this,
            providerData: {
              id: file.parents[0].id
            }
          });
        }
        let xhr = new XMLHttpRequest();
        xhr.open('GET', file.downloadUrl);
        if (this.authToken) {
          xhr.setRequestHeader('Authorization', `Bearer ${this.authToken.access_token}`);
        }
        xhr.onload = () => callback(null, cloudContentFactory.createEnvelopedCloudContent(xhr.responseText));
        xhr.onerror = () => callback(`Unable to download ${url}`);
        return xhr.send();
      } else {
        return callback(this._apiError(file, 'Unable to get download url'));
      }
    }
    );
  }

  _saveFile(content, metadata, callback) {
    let boundary = '-------314159265358979323846';
    let mimeType = metadata.mimeType || this.mimeType;
    let header = JSON.stringify({
      title: metadata.filename,
      mimeType,
      parents: [{id: (__guard__(__guard__(metadata.parent, x1 => x1.providerData), x => x.id) != null) ? metadata.parent.providerData.id : 'root'}]});

    let [method, path] = Array.from(__guard__(metadata.providerData, x2 => x2.id) ?
      ['PUT', `/upload/drive/v2/files/${metadata.providerData.id}`]
    :
      ['POST', '/upload/drive/v2/files']);

    let transferEncoding = "";
    if (mimeType.indexOf("image/") === 0) {
      // assume we're transfering any images as base64
      transferEncoding = "\r\nContent-Transfer-Encoding: base64";
    }

    let body = [
      `\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${header}`,
      `\r\n--${boundary}\r\nContent-Type: ${mimeType}${transferEncoding}\r\n\r\n${__guardMethod__(content, 'getContentAsJSON', o => o.getContentAsJSON()) || content}`,
      `\r\n--${boundary}--`
    ].join('');

    let request = gapi.client.request({
      path,
      method,
      params: {uploadType: 'multipart'},
      headers: {'Content-Type': `multipart/related; boundary="${boundary}"`},
      body
    });

    return request.execute(file => {
      if (callback) {
        if (__guard__(file, x3 => x3.error)) {
          return callback(`Unabled to upload file: ${file.error.message}`);
        } else if (file) {
          metadata.providerData = {id: file.id};
          return callback(null, file);
        } else {
          return callback(this._apiError(file, 'Unabled to upload file'));
        }
      }
    }
    );
  }

  _loadOrCreateRealTimeFile(metadata, callback) {
    let request;
    let self = this;
    let fileLoaded = function(doc) {
      let sessionId;
      let content = doc.getModel().getRoot().get('content');
      if (metadata.overwritable) {
        let throwError = function(e) {
          if (!e.isLocal && (e.sessionId !== metadata.providerData.realTime.sessionId)) {
            return self.client.showBlockingModal({
              title: 'Concurrent Edit Lock',
              message: 'An edit was made to this file from another browser window. This app is now locked for input.'
            });
          }
        };
        content.addEventListener(gapi.drive.realtime.EventType.TEXT_INSERTED, throwError);
        content.addEventListener(gapi.drive.realtime.EventType.TEXT_DELETED, throwError);
      }
      for (let collaborator of Array.from(doc.getCollaborators())) {
        if (collaborator.isMe) { ({ sessionId } = collaborator); }
      }
      metadata.providerData.realTime = {
        doc,
        content,
        sessionId
      };
      return callback(null, cloudContentFactory.createEnvelopedCloudContent(content.getText()));
    };

    let init = function(model) {
      let content = model.createString('');
      return model.getRoot().set('content', content);
    };

    let error = err => {
      if (err.type === 'TOKEN_REFRESH_REQUIRED') {
        return this.authorize(GoogleDriveProvider.IMMEDIATE);
      } else {
        return this.client.alert(err.message);
      }
    };

    if (__guard__(metadata.providerData, x => x.id)) {
      request = gapi.client.drive.files.get({
        fileId: metadata.providerData.id});
    } else {
      request = gapi.client.drive.files.insert({
        title: metadata.filename,
        mimeType: this.mimeType,
        parents: [{id: (__guard__(__guard__(metadata.parent, x2 => x2.providerData), x1 => x1.id) != null) ? metadata.parent.providerData.id : 'root'}]});
    }

    return request.execute(file => {
      if (__guard__(file, x3 => x3.id)) {
        metadata.rename(file.title);
        metadata.overwritable = file.editable;
        metadata.providerData = {id: file.id};
        return gapi.drive.realtime.load(file.id, fileLoaded, init, error);
      } else {
        return callback(this._apiError(file, 'Unable to load file'));
      }
    }
    );
  }

  _saveRealTimeFile(content, metadata, callback) {
    if (__guard__(metadata.providerData, x => x.model)) {
      return this._diffAndUpdateRealTimeModel(content, metadata, callback);
    } else {
      return this._loadOrCreateRealTimeFile(metadata, err => {
        if (err) { return callback(err); }
        return this._diffAndUpdateRealTimeModel(content, metadata, callback);
      }
      );
    }
  }

  _diffAndUpdateRealTimeModel(content, metadata, callback) {
    let index = 0;
    let realTimeContent = metadata.providerData.realTime.content;
    let diffs = jsdiff.diffChars(realTimeContent.getText(), content.getContentAsJSON());
    for (let diff of Array.from(diffs)) {
      if (diff.removed) {
        realTimeContent.removeRange(index, index + diff.value.length);
      } else {
        if (diff.added) {
          realTimeContent.insertString(index, diff.value);
        }
        index += diff.count;
      }
    }
    return callback(null);
  }

  _apiError(result, prefix) {
    if (__guard__(result, x => x.message) != null) {
      return `${prefix}: ${result.message}`;
    } else {
      return prefix;
    }
  }
}
GoogleDriveProvider.initClass();

export default GoogleDriveProvider;

function __guardMethod__(obj, methodName, transform) {
  if (typeof obj !== 'undefined' && obj !== null && typeof obj[methodName] === 'function') {
    return transform(obj, methodName);
  } else {
    return undefined;
  }
}
function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}
function __guardFunc__(func, transform) {
  return typeof func === 'function' ? transform(func) : undefined;
}