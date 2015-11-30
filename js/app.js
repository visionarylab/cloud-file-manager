(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.CloudFileManager = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var AppView, CloudFileManager, CloudFileManagerClient, CloudFileManagerUIMenu;

AppView = React.createFactory(require('./views/app-view'));

CloudFileManagerUIMenu = (require('./ui')).CloudFileManagerUIMenu;

CloudFileManagerClient = (require('./client')).CloudFileManagerClient;

CloudFileManager = (function() {
  function CloudFileManager(options) {
    this.DefaultMenu = CloudFileManagerUIMenu.DefaultMenu;
    this.client = new CloudFileManagerClient();
    this.appOptions = {};
  }

  CloudFileManager.prototype.init = function(appOptions, usingIframe) {
    this.appOptions = appOptions;
    if (usingIframe == null) {
      usingIframe = false;
    }
    this.appOptions.usingIframe = usingIframe;
    return this.client.setAppOptions(this.appOptions);
  };

  CloudFileManager.prototype.createFrame = function(appOptions, elemId) {
    this.appOptions = appOptions;
    this.init(this.appOptions, true);
    return this._renderApp(document.getElementById(elemId));
  };

  CloudFileManager.prototype.clientConnect = function(eventCallback) {
    if (!this.appOptions.usingIframe) {
      this._createHiddenApp();
    }
    return this.client.connect(eventCallback);
  };

  CloudFileManager.prototype._createHiddenApp = function() {
    var anchor;
    anchor = document.createElement("div");
    document.body.appendChild(anchor);
    return this._renderApp(anchor);
  };

  CloudFileManager.prototype._renderApp = function(anchor) {
    this.appOptions.client = this.client;
    return React.render(AppView(this.appOptions), anchor);
  };

  return CloudFileManager;

})();

module.exports = new CloudFileManager();



},{"./client":2,"./ui":8,"./views/app-view":12}],2:[function(require,module,exports){
var CloudFileManagerClient, CloudFileManagerClientEvent, CloudFileManagerUI, DocumentStoreProvider, GoogleDriveProvider, LocalStorageProvider, ReadOnlyProvider, isString, tr,
  hasProp = {}.hasOwnProperty;

tr = require('./utils/translate');

isString = require('./utils/is-string');

CloudFileManagerUI = (require('./ui')).CloudFileManagerUI;

LocalStorageProvider = require('./providers/localstorage-provider');

ReadOnlyProvider = require('./providers/readonly-provider');

GoogleDriveProvider = require('./providers/google-drive-provider');

DocumentStoreProvider = require('./providers/document-store-provider');

CloudFileManagerClientEvent = (function() {
  function CloudFileManagerClientEvent(type1, data1, callback1, state) {
    this.type = type1;
    this.data = data1 != null ? data1 : {};
    this.callback = callback1 != null ? callback1 : null;
    this.state = state != null ? state : {};
  }

  return CloudFileManagerClientEvent;

})();

CloudFileManagerClient = (function() {
  function CloudFileManagerClient(options) {
    this.state = {
      availableProviders: []
    };
    this._resetState();
    this._ui = new CloudFileManagerUI(this);
  }

  CloudFileManagerClient.prototype.setAppOptions = function(appOptions) {
    var Provider, allProviders, availableProviders, i, j, len, len1, provider, providerName, providerOptions, ref, ref1, ref2;
    if (appOptions == null) {
      appOptions = {};
    }
    allProviders = {};
    ref = [ReadOnlyProvider, LocalStorageProvider, GoogleDriveProvider, DocumentStoreProvider];
    for (i = 0, len = ref.length; i < len; i++) {
      Provider = ref[i];
      if (Provider.Available()) {
        allProviders[Provider.Name] = Provider;
      }
    }
    if (!appOptions.providers) {
      appOptions.providers = [];
      for (providerName in allProviders) {
        if (!hasProp.call(allProviders, providerName)) continue;
        appOptions.providers.push(providerName);
      }
    }
    availableProviders = [];
    ref1 = appOptions.providers;
    for (j = 0, len1 = ref1.length; j < len1; j++) {
      provider = ref1[j];
      ref2 = isString(provider) ? [provider, {}] : [provider.name, provider], providerName = ref2[0], providerOptions = ref2[1];
      if (!providerName) {
        this._error("Invalid provider spec - must either be string or object with name property");
      } else {
        if (allProviders[providerName]) {
          Provider = allProviders[providerName];
          availableProviders.push(new Provider(providerOptions));
        } else {
          this._error("Unknown provider: " + providerName);
        }
      }
    }
    this._setState({
      availableProviders: availableProviders
    });
    this._ui.init(appOptions.ui);
    if (options.autoSaveInterval) {
      return this.autoSave(options.autoSaveInterval);
    }
  };

  CloudFileManagerClient.prototype.connect = function(eventCallback1) {
    this.eventCallback = eventCallback1;
    return this._event('connected', {
      client: this
    });
  };

  CloudFileManagerClient.prototype.listen = function(listenerCallback) {
    this.listenerCallback = listenerCallback;
  };

  CloudFileManagerClient.prototype.appendMenuItem = function(item) {
    return this._ui.appendMenuItem(item);
  };

  CloudFileManagerClient.prototype.setMenuBarInfo = function(info) {
    return this._ui.setMenuBarInfo(info);
  };

  CloudFileManagerClient.prototype.newFile = function(callback) {
    if (callback == null) {
      callback = null;
    }
    this._resetState();
    return this._event('newedFile');
  };

  CloudFileManagerClient.prototype.newFileDialog = function(callback) {
    if (callback == null) {
      callback = null;
    }
    return this.newFile();
  };

  CloudFileManagerClient.prototype.openFile = function(metadata, callback) {
    var ref;
    if (callback == null) {
      callback = null;
    }
    if (metadata != null ? (ref = metadata.provider) != null ? ref.can('load') : void 0 : void 0) {
      return metadata.provider.load(metadata, (function(_this) {
        return function(err, content) {
          if (err) {
            return _this._error(err);
          }
          _this._fileChanged('openedFile', content, metadata);
          return typeof callback === "function" ? callback(content, metadata) : void 0;
        };
      })(this));
    } else {
      return this.openFileDialog(callback);
    }
  };

  CloudFileManagerClient.prototype.openFileDialog = function(callback) {
    if (callback == null) {
      callback = null;
    }
    return this._ui.openFileDialog((function(_this) {
      return function(metadata) {
        return _this.openFile(metadata, callback);
      };
    })(this));
  };

  CloudFileManagerClient.prototype.save = function(callback) {
    if (callback == null) {
      callback = null;
    }
    return this._event('getContent', {}, (function(_this) {
      return function(content) {
        return _this.saveContent(content, callback);
      };
    })(this));
  };

  CloudFileManagerClient.prototype.saveContent = function(content, callback) {
    if (callback == null) {
      callback = null;
    }
    if (this.state.metadata) {
      return this.saveFile(content, this.state.metadata, callback);
    } else {
      return this.saveFileDialog(content, callback);
    }
  };

  CloudFileManagerClient.prototype.saveFile = function(content, metadata, callback) {
    var ref;
    if (callback == null) {
      callback = null;
    }
    if (metadata != null ? (ref = metadata.provider) != null ? ref.can('save') : void 0 : void 0) {
      this._setState({
        saving: metadata
      });
      return metadata.provider.save(content, metadata, (function(_this) {
        return function(err) {
          if (err) {
            return _this._error(err);
          }
          _this._fileChanged('savedFile', content, metadata);
          return typeof callback === "function" ? callback(content, metadata) : void 0;
        };
      })(this));
    } else {
      return this.saveFileDialog(content, callback);
    }
  };

  CloudFileManagerClient.prototype.saveFileDialog = function(content, callback) {
    if (content == null) {
      content = null;
    }
    if (callback == null) {
      callback = null;
    }
    return this._ui.saveFileDialog((function(_this) {
      return function(metadata) {
        return _this._dialogSave(content, metadata, callback);
      };
    })(this));
  };

  CloudFileManagerClient.prototype.saveFileAsDialog = function(content, callback) {
    if (content == null) {
      content = null;
    }
    if (callback == null) {
      callback = null;
    }
    return this._ui.saveFileAsDialog((function(_this) {
      return function(metadata) {
        return _this._dialogSave(content, metadata, callback);
      };
    })(this));
  };

  CloudFileManagerClient.prototype.dirty = function() {
    return this._setState({
      dirty: true,
      saved: false
    });
  };

  CloudFileManagerClient.prototype.autoSave = function(interval) {
    var saveIfDirty;
    if (this._autoSaveInterval) {
      clearInterval(this._autoSaveInterval);
    }
    if (interval > 1000) {
      interval = Math.round(interval / 1000);
    }
    if (interval > 0) {
      saveIfDirty = (function(_this) {
        return function() {
          if (_this.state.dirty && _this.state.metadata) {
            return _this.save();
          }
        };
      })(this);
      return this._autoSaveInterval = setInterval(saveIfDirty, interval * 1000);
    }
  };

  CloudFileManagerClient.prototype._dialogSave = function(content, metadata, callback) {
    if (content !== null) {
      return this.saveFile(content, metadata, callback);
    } else {
      return this._event('getContent', {}, (function(_this) {
        return function(content) {
          return _this.saveFile(content, metadata, callback);
        };
      })(this));
    }
  };

  CloudFileManagerClient.prototype._error = function(message) {
    return alert(message);
  };

  CloudFileManagerClient.prototype._fileChanged = function(type, content, metadata) {
    this._setState({
      content: content,
      metadata: metadata,
      saving: null,
      saved: type === 'savedFile',
      dirty: false
    });
    return this._event(type, {
      content: content,
      metadata: metadata
    });
  };

  CloudFileManagerClient.prototype._event = function(type, data, eventCallback) {
    var event;
    if (data == null) {
      data = {};
    }
    if (eventCallback == null) {
      eventCallback = null;
    }
    event = new CloudFileManagerClientEvent(type, data, eventCallback, this.state);
    if (typeof this.eventCallback === "function") {
      this.eventCallback(event);
    }
    return typeof this.listenerCallback === "function" ? this.listenerCallback(event) : void 0;
  };

  CloudFileManagerClient.prototype._setState = function(options) {
    var key, value;
    for (key in options) {
      if (!hasProp.call(options, key)) continue;
      value = options[key];
      this.state[key] = value;
    }
    return this._event('stateChanged');
  };

  CloudFileManagerClient.prototype._resetState = function() {
    return this._setState({
      content: null,
      metadata: null,
      dirty: false,
      saving: null,
      saved: false
    });
  };

  return CloudFileManagerClient;

})();

module.exports = {
  CloudFileManagerClientEvent: CloudFileManagerClientEvent,
  CloudFileManagerClient: CloudFileManagerClient
};



},{"./providers/document-store-provider":3,"./providers/google-drive-provider":4,"./providers/localstorage-provider":5,"./providers/readonly-provider":7,"./ui":8,"./utils/is-string":9,"./utils/translate":11}],3:[function(require,module,exports){
var CloudMetadata, DocumentStoreAuthorizationDialog, DocumentStoreProvider, ProviderInterface, authorizeUrl, button, checkLoginUrl, div, isString, listUrl, ref, tr,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

ref = React.DOM, div = ref.div, button = ref.button;

authorizeUrl = "http://document-store.herokuapp.com/user/authenticate";

checkLoginUrl = "http://document-store.herokuapp.com/user/info";

listUrl = "http://document-store.herokuapp.com/document/all";

tr = require('../utils/translate');

isString = require('../utils/is-string');

ProviderInterface = (require('./provider-interface')).ProviderInterface;

CloudMetadata = (require('./provider-interface')).CloudMetadata;

DocumentStoreAuthorizationDialog = React.createFactory(React.createClass({
  displayName: 'DocumentStoreAuthorizationDialog',
  authenticate: function() {
    return this.props.provider.authorize();
  },
  render: function() {
    return div({}, button({
      onClick: this.authenticate
    }, 'Authorization Needed'));
  }
}));

DocumentStoreProvider = (function(superClass) {
  extend(DocumentStoreProvider, superClass);

  function DocumentStoreProvider(options) {
    this.options = options != null ? options : {};
    DocumentStoreProvider.__super__.constructor.call(this, {
      name: DocumentStoreProvider.Name,
      displayName: this.options.displayName || (tr('~PROVIDER.DOCUMENT_STORE')),
      capabilities: {
        save: true,
        load: true,
        list: true
      }
    });
  }

  DocumentStoreProvider.Name = 'documentStore';

  DocumentStoreProvider.prototype.authorized = function(authCallback) {
    this.authCallback = authCallback;
  };

  DocumentStoreProvider.prototype.authorize = function() {
    this._showLoginWindow();
    return this._checkLogin();
  };

  DocumentStoreProvider.prototype._loginSuccessful = function(data) {
    if (this._loginWindow) {
      this._loginWindow.close();
    }
    return this.authCallback(true);
  };

  DocumentStoreProvider.prototype._checkLogin = function() {
    var provider;
    provider = this;
    return $.ajax({
      dataType: 'json',
      url: checkLoginUrl,
      xhrFields: {
        withCredentials: true
      },
      success: function(data) {
        return provider._loginSuccessful(data);
      },
      error: function() {}
    });
  };

  DocumentStoreProvider.prototype._loginWindow = null;

  DocumentStoreProvider.prototype._showLoginWindow = function() {
    var computeScreenLocation, height, poll, pollAction, position, width, windowFeatures;
    if (this._loginWindow && !this._loginWindow.closed) {
      return this._loginWindow.focus();
    } else {
      computeScreenLocation = function(w, h) {
        var height, left, screenLeft, screenTop, top, width;
        screenLeft = window.screenLeft || screen.left;
        screenTop = window.screenTop || screen.top;
        width = window.innerWidth || document.documentElement.clientWidth || screen.width;
        height = window.innerHeight || document.documentElement.clientHeight || screen.height;
        left = ((width / 2) - (w / 2)) + screenLeft;
        top = ((height / 2) - (h / 2)) + screenTop;
        return {
          left: left,
          top: top
        };
      };
      width = 1000;
      height = 480;
      position = computeScreenLocation(width, height);
      windowFeatures = ['width=' + width, 'height=' + height, 'top=' + position.top || 200, 'left=' + position.left || 200, 'dependent=yes', 'resizable=no', 'location=no', 'dialog=yes', 'menubar=no'];
      this._loginWindow = window.open(authorizeUrl, 'auth', windowFeatures.join());
      pollAction = (function(_this) {
        return function() {
          var e, error, href;
          try {
            href = _this._loginWindow.location.href;
            if (href === window.location.href) {
              clearInterval(poll);
              _this._loginWindow.close();
              return _this._checkLogin();
            }
          } catch (error) {
            e = error;
            return console.log(e);
          }
        };
      })(this);
      return poll = setInterval(pollAction, 200);
    }
  };

  DocumentStoreProvider.prototype.renderAuthorizationDialog = function() {
    return DocumentStoreAuthorizationDialog({
      provider: this,
      authCallback: this.authCallback
    });
  };

  DocumentStoreProvider.prototype.list = function(metadata, callback) {
    var provider;
    provider = this;
    return $.ajax({
      dataType: 'json',
      url: listUrl,
      xhrFields: {
        withCredentials: true
      },
      success: function(data) {
        var key, list, path, ref1;
        list = [];
        path = (metadata != null ? metadata.path : void 0) || '';
        ref1 = window.localStorage;
        for (key in ref1) {
          if (!hasProp.call(ref1, key)) continue;
          list.push(new CloudMetadata({
            name: key,
            path: path + "/" + name,
            type: CloudMetadata.File,
            provider: provider
          }));
        }
        return callback(null, list);
      },
      error: function() {
        return callback(null, []);
      }
    });
  };

  DocumentStoreProvider.prototype.load = function(metadata, callback) {};

  return DocumentStoreProvider;

})(ProviderInterface);

module.exports = DocumentStoreProvider;



},{"../utils/is-string":9,"../utils/translate":11,"./provider-interface":6}],4:[function(require,module,exports){
var CloudMetadata, GoogleDriveAuthorizationDialog, GoogleDriveProvider, ProviderInterface, button, div, isString, tr,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

div = React.DOM.div;

tr = require('../utils/translate');

isString = require('../utils/is-string');

ProviderInterface = (require('./provider-interface')).ProviderInterface;

CloudMetadata = (require('./provider-interface')).CloudMetadata;

button = React.DOM.button;

GoogleDriveAuthorizationDialog = React.createFactory(React.createClass({
  displayName: 'GoogleDriveAuthorizationDialog',
  getInitialState: function() {
    return {
      loadedGAPI: false
    };
  },
  componentWillMount: function() {
    return this.props.provider._loadedGAPI((function(_this) {
      return function() {
        return _this.setState({
          loadedGAPI: true
        });
      };
    })(this));
  },
  authenticate: function() {
    return this.props.provider.authorize(GoogleDriveProvider.SHOW_POPUP);
  },
  render: function() {
    return div({}, this.state.loadedGAPI ? button({
      onClick: this.authenticate
    }, 'Authorization Needed') : 'Waiting for the Google Client API to load...');
  }
}));

GoogleDriveProvider = (function(superClass) {
  extend(GoogleDriveProvider, superClass);

  function GoogleDriveProvider(options) {
    this.options = options != null ? options : {};
    GoogleDriveProvider.__super__.constructor.call(this, {
      name: GoogleDriveProvider.Name,
      displayName: this.options.displayName || (tr('~PROVIDER.GOOGLE_DRIVE')),
      capabilities: {
        save: true,
        load: true,
        list: true,
        remove: true
      }
    });
    this.authToken = null;
    this.clientId = this.options.clientId;
    if (!this.clientId) {
      throw new Error('Missing required clientId in googlDrive provider options');
    }
    this.mimeType = this.options.mimeType || "text/plain";
    this._loadGAPI();
  }

  GoogleDriveProvider.Name = 'googleDrive';

  GoogleDriveProvider.IMMEDIATE = true;

  GoogleDriveProvider.SHOW_POPUP = false;

  GoogleDriveProvider.prototype.authorized = function(authCallback) {
    this.authCallback = authCallback;
    if (this.authToken) {
      return this.authCallback(true);
    } else {
      return this.authorize(GoogleDriveProvider.IMMEDIATE);
    }
  };

  GoogleDriveProvider.prototype.authorize = function(immediate) {
    return this._loadedGAPI((function(_this) {
      return function() {
        var args;
        args = {
          client_id: _this.clientId,
          scope: 'https://www.googleapis.com/auth/drive',
          immediate: immediate
        };
        return gapi.auth.authorize(args, function(authToken) {
          _this.authToken = authToken && !authToken.error ? authToken : null;
          return _this.authCallback(_this.authToken !== null);
        });
      };
    })(this));
  };

  GoogleDriveProvider.prototype.renderAuthorizationDialog = function() {
    return GoogleDriveAuthorizationDialog({
      provider: this
    });
  };

  GoogleDriveProvider.prototype.save = function(content, metadata, callback) {
    return this._loadedGAPI((function(_this) {
      return function() {
        return _this._sendFile(content, metadata, callback);
      };
    })(this));
  };

  GoogleDriveProvider.prototype.load = function(metadata, callback) {
    return this._loadedGAPI((function(_this) {
      return function() {
        var request;
        request = gapi.client.drive.files.get({
          fileId: metadata.providerData.id
        });
        return request.execute(function(file) {
          if (file != null ? file.downloadUrl : void 0) {
            return _this._downloadFromUrl(file.downloadUrl, _this.authToken, callback);
          } else {
            return callback('Unable to get download url');
          }
        });
      };
    })(this));
  };

  GoogleDriveProvider.prototype.list = function(metadata, callback) {
    return this._loadedGAPI((function(_this) {
      return function() {
        var request;
        request = gapi.client.drive.files.list({
          q: "mimeType = '" + _this.mimeType + "'"
        });
        return request.execute(function(result) {
          var i, item, len, list, ref;
          if (!result) {
            return callback('Unable to list files');
          }
          list = [];
          ref = result != null ? result.items : void 0;
          for (i = 0, len = ref.length; i < len; i++) {
            item = ref[i];
            if (item.mimeType !== 'application/vnd.google-apps.folder') {
              list.push(new CloudMetadata({
                name: item.title,
                path: "",
                type: item.mimeType === 'application/vnd.google-apps.folder' ? CloudMetadata.Folder : CloudMetadata.File,
                provider: _this,
                providerData: {
                  id: item.id
                }
              }));
            }
          }
          list.sort(function(a, b) {
            var lowerA, lowerB;
            lowerA = a.name.toLowerCase();
            lowerB = b.name.toLowerCase();
            if (lowerA < lowerB) {
              return -1;
            }
            if (lowerA > lowerB) {
              return 1;
            }
            return 0;
          });
          return callback(null, list);
        });
      };
    })(this));
  };

  GoogleDriveProvider.prototype.remove = function(metadata, callback) {
    return this._loadedGAPI(function() {
      var request;
      request = gapi.client.drive.files["delete"]({
        fileId: metadata.providerData.id
      });
      return request.execute(function(result) {
        return typeof callback === "function" ? callback((result != null ? result.error : void 0) || null) : void 0;
      });
    });
  };

  GoogleDriveProvider.prototype._loadGAPI = function() {
    var script;
    if (!window._LoadingGAPI) {
      window._LoadingGAPI = true;
      window._GAPIOnLoad = function() {
        return this.window._LoadedGAPI = true;
      };
      script = document.createElement('script');
      script.src = 'https://apis.google.com/js/client.js?onload=_GAPIOnLoad';
      return document.head.appendChild(script);
    }
  };

  GoogleDriveProvider.prototype._loadedGAPI = function(callback) {
    var check, self;
    self = this;
    check = function() {
      if (window._LoadedGAPI) {
        return gapi.client.load('drive', 'v2', function() {
          return callback.call(self);
        });
      } else {
        return setTimeout(check, 10);
      }
    };
    return setTimeout(check, 10);
  };

  GoogleDriveProvider.prototype._downloadFromUrl = function(url, token, callback) {
    var xhr;
    xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    if (token) {
      xhr.setRequestHeader('Authorization', "Bearer " + token.access_token);
    }
    xhr.onload = function() {
      return callback(null, xhr.responseText);
    };
    xhr.onerror = function() {
      return callback("Unable to download " + url);
    };
    return xhr.send();
  };

  GoogleDriveProvider.prototype._sendFile = function(content, metadata, callback) {
    var body, boundary, header, method, path, ref, ref1, request;
    boundary = '-------314159265358979323846';
    header = JSON.stringify({
      title: metadata.name,
      mimeType: this.mimeType
    });
    ref1 = ((ref = metadata.providerData) != null ? ref.id : void 0) ? ['PUT', "/upload/drive/v2/files/" + metadata.providerData.id] : ['POST', '/upload/drive/v2/files'], method = ref1[0], path = ref1[1];
    body = ["\r\n--" + boundary + "\r\nContent-Type: application/json\r\n\r\n" + header, "\r\n--" + boundary + "\r\nContent-Type: " + this.mimeType + "\r\n\r\n" + content, "\r\n--" + boundary + "--"].join('');
    request = gapi.client.request({
      path: path,
      method: method,
      params: {
        uploadType: 'multipart'
      },
      headers: {
        'Content-Type': 'multipart/related; boundary="' + boundary + '"'
      },
      body: body
    });
    return request.execute(function(file) {
      if (callback) {
        if (file != null ? file.error : void 0) {
          return callback("Unabled to upload file: " + file.error.message);
        } else if (file) {
          return callback(null, file);
        } else {
          return callback('Unabled to upload file');
        }
      }
    });
  };

  return GoogleDriveProvider;

})(ProviderInterface);

module.exports = GoogleDriveProvider;



},{"../utils/is-string":9,"../utils/translate":11,"./provider-interface":6}],5:[function(require,module,exports){
var CloudMetadata, LocalStorageProvider, ProviderInterface, tr,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty,
  slice = [].slice;

tr = require('../utils/translate');

ProviderInterface = (require('./provider-interface')).ProviderInterface;

CloudMetadata = (require('./provider-interface')).CloudMetadata;

LocalStorageProvider = (function(superClass) {
  extend(LocalStorageProvider, superClass);

  function LocalStorageProvider(options) {
    this.options = options != null ? options : {};
    LocalStorageProvider.__super__.constructor.call(this, {
      name: LocalStorageProvider.Name,
      displayName: this.options.displayName || (tr('~PROVIDER.LOCAL_STORAGE')),
      capabilities: {
        save: true,
        load: true,
        list: true,
        remove: true
      }
    });
  }

  LocalStorageProvider.Name = 'localStorage';

  LocalStorageProvider.Available = function() {
    var result, test;
    return result = (function() {
      var error;
      try {
        test = 'LocalStorageProvider::auth';
        window.localStorage.setItem(test, test);
        window.localStorage.removeItem(test);
        return true;
      } catch (error) {
        return false;
      }
    })();
  };

  LocalStorageProvider.prototype.save = function(content, metadata, callback) {
    var error;
    try {
      window.localStorage.setItem(this._getKey(metadata.name), content);
      return typeof callback === "function" ? callback(null) : void 0;
    } catch (error) {
      return typeof callback === "function" ? callback('Unable to save') : void 0;
    }
  };

  LocalStorageProvider.prototype.load = function(metadata, callback) {
    var content, error;
    try {
      content = window.localStorage.getItem(this._getKey(metadata.name));
      return callback(null, content);
    } catch (error) {
      return callback('Unable to load');
    }
  };

  LocalStorageProvider.prototype.list = function(metadata, callback) {
    var key, list, name, path, prefix, ref, ref1, remainder;
    list = [];
    path = (metadata != null ? metadata.path : void 0) || '';
    prefix = this._getKey(path);
    ref = window.localStorage;
    for (key in ref) {
      if (!hasProp.call(ref, key)) continue;
      if (key.substr(0, prefix.length) === prefix) {
        ref1 = key.substr(prefix.length).split('/'), name = ref1[0], remainder = 2 <= ref1.length ? slice.call(ref1, 1) : [];
        list.push(new CloudMetadata({
          name: key.substr(prefix.length),
          path: path + "/" + name,
          type: remainder.length > 0 ? CloudMetadata.Folder : CloudMetadata.File,
          provider: this
        }));
      }
    }
    return callback(null, list);
  };

  LocalStorageProvider.prototype.remove = function(metadata, callback) {
    var error;
    try {
      window.localStorage.removeItem(this._getKey(metadata.name));
      return typeof callback === "function" ? callback(null) : void 0;
    } catch (error) {
      return typeof callback === "function" ? callback('Unable to delete') : void 0;
    }
  };

  LocalStorageProvider.prototype._getKey = function(name) {
    if (name == null) {
      name = '';
    }
    return "cfm::" + name;
  };

  return LocalStorageProvider;

})(ProviderInterface);

module.exports = LocalStorageProvider;



},{"../utils/translate":11,"./provider-interface":6}],6:[function(require,module,exports){
var AuthorizationNotImplementedDialog, CloudFile, CloudMetadata, ProviderInterface, div;

div = React.DOM.div;

CloudFile = (function() {
  function CloudFile() {}

  CloudFile.prototype.contructor = function(options) {
    return this.content = options.content, this.metadata = options.metadata, options;
  };

  return CloudFile;

})();

CloudMetadata = (function() {
  function CloudMetadata(options) {
    this.name = options.name, this.path = options.path, this.type = options.type, this.provider = options.provider, this.providerData = options.providerData;
  }

  CloudMetadata.Folder = 'folder';

  CloudMetadata.File = 'file';

  return CloudMetadata;

})();

AuthorizationNotImplementedDialog = React.createFactory(React.createClass({
  displayName: 'AuthorizationNotImplementedDialog',
  render: function() {
    return div({}, "Authorization dialog not yet implemented for " + this.props.provider.displayName);
  }
}));

ProviderInterface = (function() {
  function ProviderInterface(options) {
    this.name = options.name, this.displayName = options.displayName, this.capabilities = options.capabilities;
    this.user = null;
  }

  ProviderInterface.Available = function() {
    return true;
  };

  ProviderInterface.prototype.can = function(capability) {
    return this.capabilities[capability];
  };

  ProviderInterface.prototype.authorized = function(callback) {
    return callback(true);
  };

  ProviderInterface.prototype.authorizationDialog = AuthorizationNotImplementedDialog;

  ProviderInterface.prototype.dialog = function(callback) {
    return this._notImplemented('dialog');
  };

  ProviderInterface.prototype.save = function(content, metadata, callback) {
    return this._notImplemented('save');
  };

  ProviderInterface.prototype.load = function(callback) {
    return this._notImplemented('load');
  };

  ProviderInterface.prototype.list = function(metadata, callback) {
    return this._notImplemented('list');
  };

  ProviderInterface.prototype.remove = function(metadata, callback) {
    return this._notImplemented('remove');
  };

  ProviderInterface.prototype._notImplemented = function(methodName) {
    throw new Error(methodName + " not implemented for " + this.name + " provider");
  };

  return ProviderInterface;

})();

module.exports = {
  CloudFile: CloudFile,
  CloudMetadata: CloudMetadata,
  ProviderInterface: ProviderInterface
};



},{}],7:[function(require,module,exports){
var CloudMetadata, ProviderInterface, ReadOnlyProvider, isString, tr,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

tr = require('../utils/translate');

isString = require('../utils/is-string');

ProviderInterface = (require('./provider-interface')).ProviderInterface;

CloudMetadata = (require('./provider-interface')).CloudMetadata;

ReadOnlyProvider = (function(superClass) {
  extend(ReadOnlyProvider, superClass);

  function ReadOnlyProvider(options) {
    this.options = options != null ? options : {};
    ReadOnlyProvider.__super__.constructor.call(this, {
      name: ReadOnlyProvider.Name,
      displayName: this.options.displayName || (tr('~PROVIDER.READ_ONLY')),
      capabilities: {
        save: false,
        load: true,
        list: true,
        remove: false
      }
    });
    this.tree = null;
  }

  ReadOnlyProvider.Name = 'readOnly';

  ReadOnlyProvider.prototype.load = function(metadata, callback) {
    return this._loadTree((function(_this) {
      return function(err, tree) {
        var parent;
        if (err) {
          return callback(err);
        }
        parent = _this._findParent(metadata);
        if (parent) {
          if (parent[metadata.name]) {
            if (parent[metadata.name].metadata.type === CloudMetadata.File) {
              return callback(null, parent[metadata.name].content);
            } else {
              return callback(metadata.name + " is a folder");
            }
          } else {
            return callback(metadata.name + " not found in folder");
          }
        } else {
          return callback(metadata.name + " folder not found");
        }
      };
    })(this));
  };

  ReadOnlyProvider.prototype.list = function(metadata, callback) {
    return this._loadTree((function(_this) {
      return function(err, tree) {
        var file, filename, list, parent;
        if (err) {
          return callback(err);
        }
        parent = _this._findParent(metadata);
        if (parent) {
          list = [];
          for (filename in parent) {
            if (!hasProp.call(parent, filename)) continue;
            file = parent[filename];
            list.push(file.metadata);
          }
          return callback(null, list);
        } else if (metadata) {
          return callback(metadata.name + " folder not found");
        }
      };
    })(this));
  };

  ReadOnlyProvider.prototype._loadTree = function(callback) {
    if (this.tree !== null) {
      return callback(null, this.tree);
    } else if (this.options.json) {
      this.tree = this._convertJSONToMetadataTree(this.options.json);
      return callback(null, this.tree);
    } else if (this.options.jsonCallback) {
      return this.options.jsonCallback((function(_this) {
        return function(err, json) {
          if (err) {
            return callback(err);
          } else {
            _this.tree = _this._convertJSONToMetadataTree(_this.options.json);
            return callback(null, _this.tree);
          }
        };
      })(this));
    } else if (this.options.src) {
      return $.ajax({
        dataType: 'json',
        url: this.options.src,
        success: (function(_this) {
          return function(data) {
            _this.tree = _this._convertJSONToMetadataTree(data);
            return callback(null, _this.tree);
          };
        })(this),
        error: function() {
          return callback("Unable to load json for " + this.displayName + " provider");
        }
      });
    } else {
      if (typeof console.error === "function") {
        console.error("No json or src option found for " + this.displayName + " provider");
      }
      return callback(null, {});
    }
  };

  ReadOnlyProvider.prototype._convertJSONToMetadataTree = function(json, pathPrefix) {
    var filename, metadata, tree, type;
    if (pathPrefix == null) {
      pathPrefix = '/';
    }
    tree = {};
    for (filename in json) {
      if (!hasProp.call(json, filename)) continue;
      type = isString(json[filename]) ? CloudMetadata.File : CloudMetadata.Folder;
      metadata = new CloudMetadata({
        name: filename,
        path: pathPrefix + filename,
        type: type,
        provider: this,
        children: null
      });
      if (type === CloudMetadata.Folder) {
        metadata.children = _convertJSONToMetadataTree(json[filename], pathPrefix + filename + '/');
      }
      tree[filename] = {
        content: json[filename],
        metadata: metadata
      };
    }
    return tree;
  };

  ReadOnlyProvider.prototype._findParent = function(metadata) {
    if (!metadata) {
      return this.tree;
    } else {
      return this.tree;
    }
  };

  return ReadOnlyProvider;

})(ProviderInterface);

module.exports = ReadOnlyProvider;



},{"../utils/is-string":9,"../utils/translate":11,"./provider-interface":6}],8:[function(require,module,exports){
var CloudFileManagerUI, CloudFileManagerUIEvent, CloudFileManagerUIMenu, isString, tr;

tr = require('./utils/translate');

isString = require('./utils/is-string');

CloudFileManagerUIEvent = (function() {
  function CloudFileManagerUIEvent(type, data) {
    this.type = type;
    this.data = data != null ? data : {};
  }

  return CloudFileManagerUIEvent;

})();

CloudFileManagerUIMenu = (function() {
  CloudFileManagerUIMenu.DefaultMenu = ['newFileDialog', 'openFileDialog', 'save', 'saveFileAsDialog'];

  function CloudFileManagerUIMenu(options, client) {
    var i, item, len, menuItem, name, ref, ref1, setAction;
    setAction = function(action) {
      var ref;
      return ((ref = client[action]) != null ? ref.bind(client) : void 0) || (function() {
        return alert("No " + action + " action is available in the client");
      });
    };
    this.items = [];
    ref = options.menu;
    for (i = 0, len = ref.length; i < len; i++) {
      item = ref[i];
      menuItem = isString(item) ? (name = (ref1 = options.menuNames) != null ? ref1[item] : void 0, menuItem = (function() {
        switch (item) {
          case 'newFileDialog':
            return {
              name: name || tr("~MENU.NEW")
            };
          case 'openFileDialog':
            return {
              name: name || tr("~MENU.OPEN")
            };
          case 'save':
            return {
              name: name || tr("~MENU.SAVE")
            };
          case 'saveFileAsDialog':
            return {
              name: name || tr("~MENU.SAVE_AS")
            };
          default:
            return {
              name: "Unknown item: " + item
            };
        }
      })(), menuItem.action = setAction(item), menuItem) : (isString(item.action) ? item.action = setAction(item.action) : void 0, item);
      if (menuItem) {
        this.items.push(menuItem);
      }
    }
  }

  return CloudFileManagerUIMenu;

})();

CloudFileManagerUI = (function() {
  function CloudFileManagerUI(client1) {
    this.client = client1;
    this.menu = null;
  }

  CloudFileManagerUI.prototype.init = function(options) {
    options = options || {};
    if (options.menu !== null) {
      if (typeof options.menu === 'undefined') {
        options.menu = CloudFileManagerUIMenu.DefaultMenu;
      }
      return this.menu = new CloudFileManagerUIMenu(options, this.client);
    }
  };

  CloudFileManagerUI.prototype.listen = function(listenerCallback) {
    this.listenerCallback = listenerCallback;
  };

  CloudFileManagerUI.prototype.appendMenuItem = function(item) {
    return this.listenerCallback(new CloudFileManagerUIEvent('appendMenuItem', item));
  };

  CloudFileManagerUI.prototype.setMenuBarInfo = function(info) {
    return this.listenerCallback(new CloudFileManagerUIEvent('setMenuBarInfo', info));
  };

  CloudFileManagerUI.prototype.saveFileDialog = function(callback) {
    return this._showProviderDialog('saveFile', tr('~DIALOG.SAVE'), callback);
  };

  CloudFileManagerUI.prototype.saveFileAsDialog = function(callback) {
    return this._showProviderDialog('saveFileAs', tr('~DIALOG.SAVE_AS'), callback);
  };

  CloudFileManagerUI.prototype.openFileDialog = function(callback) {
    return this._showProviderDialog('openFile', tr('~DIALOG.OPEN'), callback);
  };

  CloudFileManagerUI.prototype._showProviderDialog = function(action, title, callback) {
    return this.listenerCallback(new CloudFileManagerUIEvent('showProviderDialog', {
      action: action,
      title: title,
      callback: callback
    }));
  };

  return CloudFileManagerUI;

})();

module.exports = {
  CloudFileManagerUIEvent: CloudFileManagerUIEvent,
  CloudFileManagerUI: CloudFileManagerUI,
  CloudFileManagerUIMenu: CloudFileManagerUIMenu
};



},{"./utils/is-string":9,"./utils/translate":11}],9:[function(require,module,exports){
module.exports = function(param) {
  return Object.prototype.toString.call(param) === '[object String]';
};



},{}],10:[function(require,module,exports){
module.exports = {
  "~MENUBAR.UNTITLE_DOCUMENT": "Untitled Document",
  "~MENU.NEW": "New",
  "~MENU.OPEN": "Open ...",
  "~MENU.SAVE": "Save",
  "~MENU.SAVE_AS": "Save As ...",
  "~DIALOG.SAVE": "Save",
  "~DIALOG.SAVE_AS": "Save As ...",
  "~DIALOG.OPEN": "Open",
  "~PROVIDER.LOCAL_STORAGE": "Local Storage",
  "~PROVIDER.READ_ONLY": "Read Only",
  "~PROVIDER.GOOGLE_DRIVE": "Google Drive",
  "~PROVIDER.DOCUMENT_STORE": "Document Store",
  "~FILE_DIALOG.FILENAME": "Filename",
  "~FILE_DIALOG.OPEN": "Open",
  "~FILE_DIALOG.SAVE": "Save",
  "~FILE_DIALOG.CANCEL": "Cancel",
  "~FILE_DIALOG.REMOVE": "Delete",
  "~FILE_DIALOG.REMOVE_CONFIRM": "Are you sure you want to delete %{filename}?",
  "~FILE_DIALOG.LOADING": "Loading..."
};



},{}],11:[function(require,module,exports){
var defaultLang, translate, translations, varRegExp;

translations = {};

translations['en'] = require('./lang/en-us');

defaultLang = 'en';

varRegExp = /%\{\s*([^}\s]*)\s*\}/g;

translate = function(key, vars, lang) {
  var ref, translation;
  if (vars == null) {
    vars = {};
  }
  if (lang == null) {
    lang = defaultLang;
  }
  translation = ((ref = translations[lang]) != null ? ref[key] : void 0) || key;
  return translation.replace(varRegExp, function(match, key) {
    if (vars.hasOwnProperty(key)) {
      return vars[key];
    } else {
      return "'** UKNOWN KEY: " + key + " **";
    }
  });
};

module.exports = translate;



},{"./lang/en-us":10}],12:[function(require,module,exports){
var App, InnerApp, MenuBar, ProviderTabbedDialog, div, iframe, ref, tr;

MenuBar = React.createFactory(require('./menu-bar-view'));

ProviderTabbedDialog = React.createFactory(require('./provider-tabbed-dialog-view'));

tr = require('../utils/translate');

ref = React.DOM, div = ref.div, iframe = ref.iframe;

InnerApp = React.createFactory(React.createClass({
  displayName: 'CloudFileManagerInnerApp',
  shouldComponentUpdate: function(nextProps) {
    return nextProps.app !== this.props.app;
  },
  render: function() {
    return div({
      className: 'innerApp'
    }, iframe({
      src: this.props.app
    }));
  }
}));

App = React.createClass({
  displayName: 'CloudFileManager',
  getFilename: function() {
    var ref1;
    if ((ref1 = this.props.client.state.metadata) != null ? ref1.hasOwnProperty('name') : void 0) {
      return this.props.client.state.metadata.name;
    } else {
      return tr("~MENUBAR.UNTITLE_DOCUMENT");
    }
  },
  getInitialState: function() {
    var ref1;
    return {
      filename: this.getFilename(),
      menuItems: ((ref1 = this.props.client._ui.menu) != null ? ref1.items : void 0) || [],
      menuOptions: this.props.menuBar || {},
      providerDialog: null,
      dirty: false
    };
  },
  componentWillMount: function() {
    this.props.client.listen((function(_this) {
      return function(event) {
        var fileStatus, ref1;
        fileStatus = event.state.saving ? {
          message: "Saving all changes to " + event.state.saving.provider.displayName + "...",
          type: 'info'
        } : event.state.saved ? {
          message: "All changes saved to " + event.state.metadata.provider.displayName,
          type: 'info'
        } : event.state.dirty ? {
          message: 'Unsaved',
          type: 'alert'
        } : null;
        _this.setState({
          filename: _this.getFilename(),
          fileStatus: fileStatus
        });
        switch (event.type) {
          case 'connected':
            return _this.setState({
              menuItems: ((ref1 = _this.props.client._ui.menu) != null ? ref1.items : void 0) || []
            });
        }
      };
    })(this));
    return this.props.client._ui.listen((function(_this) {
      return function(event) {
        switch (event.type) {
          case 'showProviderDialog':
            return _this.setState({
              providerDialog: event.data
            });
          case 'appendMenuItem':
            _this.state.menuItems.push(event.data);
            return _this.setState({
              menuItems: _this.state.menuItems
            });
          case 'setMenuBarInfo':
            _this.state.menuOptions.info = event.data;
            return _this.setState({
              menuOptions: _this.state.menuOptions
            });
        }
      };
    })(this));
  },
  closeProviderDialog: function() {
    return this.setState({
      providerDialog: null
    });
  },
  render: function() {
    if (this.props.usingIframe) {
      return div({
        className: 'app'
      }, MenuBar({
        filename: this.state.filename,
        fileStatus: this.state.fileStatus,
        items: this.state.menuItems,
        options: this.state.menuOptions
      }), InnerApp({
        app: this.props.app
      }), this.state.providerDialog ? ProviderTabbedDialog({
        client: this.props.client,
        dialog: this.state.providerDialog,
        close: this.closeProviderDialog
      }) : void 0);
    } else {
      if (this.state.providerDialog) {
        return div({
          className: 'app'
        }, ProviderTabbedDialog({
          client: this.props.client,
          dialog: this.state.providerDialog,
          close: this.closeProviderDialog
        }));
      } else {
        return null;
      }
    }
  }
});

module.exports = App;



},{"../utils/translate":11,"./menu-bar-view":16,"./provider-tabbed-dialog-view":20}],13:[function(require,module,exports){
var AuthorizeMixin;

AuthorizeMixin = {
  getInitialState: function() {
    return {
      authorized: false
    };
  },
  componentWillMount: function() {
    return this.props.provider.authorized((function(_this) {
      return function(authorized) {
        return _this.setState({
          authorized: authorized
        });
      };
    })(this));
  },
  render: function() {
    if (this.state.authorized) {
      return this.renderWhenAuthorized();
    } else {
      return this.props.provider.renderAuthorizationDialog();
    }
  }
};

module.exports = AuthorizeMixin;



},{}],14:[function(require,module,exports){
var DropDown, DropdownItem, div, i, li, ref, span, ul;

ref = React.DOM, div = ref.div, i = ref.i, span = ref.span, ul = ref.ul, li = ref.li;

DropdownItem = React.createFactory(React.createClass({
  displayName: 'DropdownItem',
  clicked: function() {
    return this.props.select(this.props.item);
  },
  render: function() {
    var className, name;
    className = "menuItem " + (this.props.isActionMenu && !this.props.item.action ? 'disabled' : '');
    name = this.props.item.name || this.props.item;
    return li({
      className: className,
      onClick: this.clicked
    }, name);
  }
}));

DropDown = React.createClass({
  displayName: 'Dropdown',
  getDefaultProps: function() {
    return {
      isActionMenu: true,
      onSelect: function(item) {
        return log.info("Selected " + item);
      }
    };
  },
  getInitialState: function() {
    return {
      showingMenu: false,
      timeout: null
    };
  },
  blur: function() {
    var timeout;
    this.unblur();
    timeout = setTimeout(((function(_this) {
      return function() {
        return _this.setState({
          showingMenu: false
        });
      };
    })(this)), 500);
    return this.setState({
      timeout: timeout
    });
  },
  unblur: function() {
    if (this.state.timeout) {
      clearTimeout(this.state.timeout);
    }
    return this.setState({
      timeout: null
    });
  },
  select: function(item) {
    var nextState;
    nextState = !this.state.showingMenu;
    this.setState({
      showingMenu: nextState
    });
    if (!item) {
      return;
    }
    if (this.props.isActionMenu && item.action) {
      return item.action();
    } else {
      return this.props.onSelect(item);
    }
  },
  render: function() {
    var item, menuClass, ref1, select;
    menuClass = this.state.showingMenu ? 'menu-showing' : 'menu-hidden';
    select = (function(_this) {
      return function(item) {
        return function() {
          return _this.select(item);
        };
      };
    })(this);
    return div({
      className: 'menu'
    }, span({
      className: 'menu-anchor',
      onClick: (function(_this) {
        return function() {
          return _this.select(null);
        };
      })(this)
    }, this.props.anchor, i({
      className: 'icon-arrow-expand'
    })), ((ref1 = this.props.items) != null ? ref1.length : void 0) > 0 ? div({
      className: menuClass,
      onMouseLeave: this.blur,
      onMouseEnter: this.unblur
    }, ul({}, (function() {
      var j, len, ref2, results;
      ref2 = this.props.items;
      results = [];
      for (j = 0, len = ref2.length; j < len; j++) {
        item = ref2[j];
        results.push(DropdownItem({
          key: item.name || item,
          item: item,
          select: this.select,
          isActionMenu: this.props.isActionMenu
        }));
      }
      return results;
    }).call(this))) : void 0);
  }
});

module.exports = DropDown;



},{}],15:[function(require,module,exports){
var AuthorizeMixin, CloudMetadata, FileDialogTab, FileList, FileListFile, button, div, i, img, input, ref, span, tr;

AuthorizeMixin = require('./authorize-mixin');

CloudMetadata = (require('../providers/provider-interface')).CloudMetadata;

tr = require('../utils/translate');

ref = React.DOM, div = ref.div, img = ref.img, i = ref.i, span = ref.span, input = ref.input, button = ref.button;

FileListFile = React.createFactory(React.createClass({
  displayName: 'FileListFile',
  componentWillMount: function() {
    return this.lastClick = 0;
  },
  fileSelected: function(e) {
    var now;
    e.preventDefault();
    e.stopPropagation();
    now = (new Date()).getTime();
    this.props.fileSelected(this.props.metadata);
    if (now - this.lastClick <= 250) {
      this.props.fileConfirmed();
    }
    return this.lastClick = now;
  },
  render: function() {
    return div({
      className: (this.props.selected ? 'selected' : ''),
      onClick: this.fileSelected
    }, this.props.metadata.name);
  }
}));

FileList = React.createFactory(React.createClass({
  displayName: 'FileList',
  getInitialState: function() {
    return {
      loading: true
    };
  },
  componentDidMount: function() {
    return this.load();
  },
  load: function() {
    return this.props.provider.list(this.props.folder, (function(_this) {
      return function(err, list) {
        if (err) {
          return alert(err);
        }
        _this.setState({
          loading: false
        });
        return _this.props.listLoaded(list);
      };
    })(this));
  },
  render: function() {
    var metadata;
    return div({
      className: 'filelist'
    }, (function() {
      var j, len, ref1, results;
      if (this.state.loading) {
        return tr("~FILE_DIALOG.LOADING");
      } else {
        ref1 = this.props.list;
        results = [];
        for (j = 0, len = ref1.length; j < len; j++) {
          metadata = ref1[j];
          results.push(FileListFile({
            metadata: metadata,
            selected: this.props.selectedFile === metadata,
            fileSelected: this.props.fileSelected,
            fileConfirmed: this.props.fileConfirmed
          }));
        }
        return results;
      }
    }).call(this));
  }
}));

FileDialogTab = React.createClass({
  displayName: 'FileDialogTab',
  mixins: [AuthorizeMixin],
  getInitialState: function() {
    var ref1, ref2;
    return {
      folder: ((ref1 = this.props.client.state.metadata) != null ? ref1.parent : void 0) || null,
      metadata: this.props.client.state.metadata,
      filename: ((ref2 = this.props.client.state.metadata) != null ? ref2.name : void 0) || '',
      list: []
    };
  },
  componentWillMount: function() {
    return this.isOpen = this.props.dialog.action === 'openFile';
  },
  filenameChanged: function(e) {
    var filename, metadata;
    filename = e.target.value;
    metadata = this.findMetadata(filename);
    return this.setState({
      filename: filename,
      metadata: metadata
    });
  },
  listLoaded: function(list) {
    return this.setState({
      list: list
    });
  },
  fileSelected: function(metadata) {
    if ((metadata != null ? metadata.type : void 0) === CloudMetadata.File) {
      this.setState({
        filename: metadata.name
      });
    }
    return this.setState({
      metadata: metadata
    });
  },
  confirm: function() {
    var filename;
    if (!this.state.metadata) {
      filename = $.trim(this.state.filename);
      this.state.metadata = this.findMetadata(filename);
      if (!this.state.metadata) {
        if (this.isOpen) {
          alert(this.state.filename + " not found");
        } else {
          this.state.metadata = new CloudMetadata({
            name: filename,
            path: "/" + filename,
            type: CloudMetadata.File,
            provider: this.props.provider
          });
        }
      }
    }
    if (this.state.metadata) {
      this.state.metadata.provider = this.props.provider;
      this.props.dialog.callback(this.state.metadata);
      return this.props.close();
    }
  },
  remove: function() {
    if (this.state.metadata && this.state.metadata.type !== CloudMetadata.Folder && confirm(tr("~FILE_DIALOG.REMOVE_CONFIRM", {
      filename: this.state.metadata.name
    }))) {
      return this.props.provider.remove(this.state.metadata, (function(_this) {
        return function(err) {
          var index, list;
          if (!err) {
            list = _this.state.list.slice(0);
            index = list.indexOf(_this.state.metadata);
            list.splice(index, 1);
            return _this.setState({
              list: list,
              metadata: null,
              filename: ''
            });
          }
        };
      })(this));
    }
  },
  cancel: function() {
    return this.props.close();
  },
  findMetadata: function(filename) {
    var j, len, metadata, ref1;
    ref1 = this.state.list;
    for (j = 0, len = ref1.length; j < len; j++) {
      metadata = ref1[j];
      if (metadata.name === filename) {
        return metadata;
      }
    }
    return null;
  },
  watchForEnter: function(e) {
    if (e.keyCode === 13 && !this.confirmDisabled()) {
      return this.confirm();
    }
  },
  confirmDisabled: function() {
    return (this.state.filename.length === 0) || (this.isOpen && !this.state.metadata);
  },
  renderWhenAuthorized: function() {
    var confirmDisabled, removeDisabled;
    confirmDisabled = this.confirmDisabled();
    removeDisabled = (this.state.metadata === null) || (this.state.metadata.type === CloudMetadata.Folder);
    return div({
      className: 'dialogTab'
    }, input({
      type: 'text',
      value: this.state.filename,
      placeholder: tr("~FILE_DIALOG.FILENAME"),
      onChange: this.filenameChanged,
      onKeyDown: this.watchForEnter
    }), FileList({
      provider: this.props.provider,
      folder: this.state.folder,
      selectedFile: this.state.metadata,
      fileSelected: this.fileSelected,
      fileConfirmed: this.confirm,
      list: this.state.list,
      listLoaded: this.listLoaded
    }), div({
      className: 'buttons'
    }, button({
      onClick: this.confirm,
      disabled: confirmDisabled,
      className: confirmDisabled ? 'disabled' : ''
    }, this.isOpen ? tr("~FILE_DIALOG.OPEN") : tr("~FILE_DIALOG.SAVE")), this.props.provider.can('remove') ? button({
      onClick: this.remove,
      disabled: removeDisabled,
      className: removeDisabled ? 'disabled' : ''
    }, tr("~FILE_DIALOG.REMOVE")) : void 0, button({
      onClick: this.cancel
    }, tr("~FILE_DIALOG.CANCEL"))));
  }
});

module.exports = FileDialogTab;



},{"../providers/provider-interface":6,"../utils/translate":11,"./authorize-mixin":13}],16:[function(require,module,exports){
var Dropdown, div, i, ref, span;

ref = React.DOM, div = ref.div, i = ref.i, span = ref.span;

Dropdown = React.createFactory(require('./dropdown-view'));

module.exports = React.createClass({
  displayName: 'MenuBar',
  getInitialState: function() {
    return {
      rightSideLayout: this.props.options.rightSideLayout || ['info', 'help']
    };
  },
  help: function() {
    return window.open(this.props.options.help, '_blank');
  },
  render: function() {
    var item;
    return div({
      className: 'menu-bar'
    }, div({
      className: 'menu-bar-left'
    }, Dropdown({
      anchor: this.props.filename,
      items: this.props.items,
      className: 'menu-bar-content-filename'
    }), this.props.fileStatus ? span({
      className: "menu-bar-file-status-" + this.props.fileStatus.type
    }, this.props.fileStatus.message) : void 0), div({
      className: 'menu-bar-right'
    }, (function() {
      var j, len, ref1, results;
      ref1 = this.state.rightSideLayout;
      results = [];
      for (j = 0, len = ref1.length; j < len; j++) {
        item = ref1[j];
        if (this.props.options[item]) {
          switch (item) {
            case 'info':
              results.push(span({
                className: 'menu-bar-info'
              }, this.props.options.info));
              break;
            case 'help':
              results.push(i({
                style: {
                  fontSize: "13px"
                },
                className: 'clickable icon-help',
                onClick: this.help
              }));
              break;
            default:
              results.push(void 0);
          }
        } else {
          results.push(void 0);
        }
      }
      return results;
    }).call(this)));
  }
});



},{"./dropdown-view":14}],17:[function(require,module,exports){
var Modal, div, i, ref;

Modal = React.createFactory(require('./modal-view'));

ref = React.DOM, div = ref.div, i = ref.i;

module.exports = React.createClass({
  displayName: 'ModalDialog',
  close: function() {
    var base;
    return typeof (base = this.props).close === "function" ? base.close() : void 0;
  },
  render: function() {
    return Modal({
      close: this.props.close
    }, div({
      className: 'modal-dialog'
    }, div({
      className: 'modal-dialog-wrapper'
    }, div({
      className: 'modal-dialog-title'
    }, i({
      className: "modal-dialog-title-close icon-codap-ex",
      onClick: this.close
    }), this.props.title || 'Untitled Dialog'), div({
      className: 'modal-dialog-workspace'
    }, this.props.children))));
  }
});



},{"./modal-view":19}],18:[function(require,module,exports){
var ModalDialog, TabbedPanel;

ModalDialog = React.createFactory(require('./modal-dialog-view'));

TabbedPanel = React.createFactory(require('./tabbed-panel-view'));

module.exports = React.createClass({
  displayName: 'ModalTabbedDialogView',
  render: function() {
    return ModalDialog({
      title: this.props.title,
      close: this.props.close
    }, TabbedPanel({
      tabs: this.props.tabs,
      selectedTabIndex: this.props.selectedTabIndex
    }));
  }
});



},{"./modal-dialog-view":17,"./tabbed-panel-view":22}],19:[function(require,module,exports){
var div;

div = React.DOM.div;

module.exports = React.createClass({
  displayName: 'Modal',
  watchForEscape: function(e) {
    var base;
    if (e.keyCode === 27) {
      return typeof (base = this.props).close === "function" ? base.close() : void 0;
    }
  },
  componentDidMount: function() {
    return $(window).on('keyup', this.watchForEscape);
  },
  componentWillUnmount: function() {
    return $(window).off('keyup', this.watchForEscape);
  },
  render: function() {
    return div({
      className: 'modal'
    }, div({
      className: 'modal-background'
    }), div({
      className: 'modal-content'
    }, this.props.children));
  }
});



},{}],20:[function(require,module,exports){
var CloudMetadata, FileDialogTab, ModalTabbedDialog, SelectProviderDialogTab, TabbedPanel, tr;

ModalTabbedDialog = React.createFactory(require('./modal-tabbed-dialog-view'));

TabbedPanel = require('./tabbed-panel-view');

CloudMetadata = (require('../providers/provider-interface')).CloudMetadata;

FileDialogTab = React.createFactory(require('./file-dialog-tab-view'));

SelectProviderDialogTab = React.createFactory(require('./select-provider-dialog-tab-view'));

tr = require('../utils/translate');

module.exports = React.createClass({
  displayName: 'ProviderTabbedDialog',
  render: function() {
    var TabComponent, capability, component, i, j, len, provider, ref, ref1, ref2, selectedTabIndex, tabs;
    ref = (function() {
      switch (this.props.dialog.action) {
        case 'openFile':
          return ['list', FileDialogTab];
        case 'saveFile':
        case 'saveFileAs':
          return ['save', FileDialogTab];
        case 'selectProvider':
          return [null, SelectProviderDialogTab];
      }
    }).call(this), capability = ref[0], TabComponent = ref[1];
    tabs = [];
    selectedTabIndex = 0;
    ref1 = this.props.client.state.availableProviders;
    for (i = j = 0, len = ref1.length; j < len; i = ++j) {
      provider = ref1[i];
      if (!capability || provider.capabilities[capability]) {
        component = TabComponent({
          client: this.props.client,
          dialog: this.props.dialog,
          close: this.props.close,
          provider: provider
        });
        tabs.push(TabbedPanel.Tab({
          key: i,
          label: tr(provider.displayName),
          component: component
        }));
        if (provider === ((ref2 = this.props.client.state.metadata) != null ? ref2.provider : void 0)) {
          selectedTabIndex = i;
        }
      }
    }
    return ModalTabbedDialog({
      title: tr(this.props.dialog.title),
      close: this.props.close,
      tabs: tabs,
      selectedTabIndex: selectedTabIndex
    });
  }
});



},{"../providers/provider-interface":6,"../utils/translate":11,"./file-dialog-tab-view":15,"./modal-tabbed-dialog-view":18,"./select-provider-dialog-tab-view":21,"./tabbed-panel-view":22}],21:[function(require,module,exports){
var SelectProviderDialogTab, div;

div = React.DOM.div;

SelectProviderDialogTab = React.createFactory(React.createClass({
  displayName: 'SelectProviderDialogTab',
  render: function() {
    return div({}, "TODO: SelectProviderDialogTab: " + this.props.provider.displayName);
  }
}));

module.exports = SelectProviderDialogTab;



},{}],22:[function(require,module,exports){
var Tab, TabInfo, a, div, li, ref, ul;

ref = React.DOM, div = ref.div, ul = ref.ul, li = ref.li, a = ref.a;

TabInfo = (function() {
  function TabInfo(settings) {
    if (settings == null) {
      settings = {};
    }
    this.label = settings.label, this.component = settings.component;
  }

  return TabInfo;

})();

Tab = React.createFactory(React.createClass({
  displayName: 'TabbedPanelTab',
  clicked: function(e) {
    e.preventDefault();
    return this.props.onSelected(this.props.index);
  },
  render: function() {
    var classname;
    classname = this.props.selected ? 'tab-selected' : '';
    return li({
      className: classname,
      onClick: this.clicked
    }, this.props.label);
  }
}));

module.exports = React.createClass({
  displayName: 'TabbedPanelView',
  getInitialState: function() {
    return {
      selectedTabIndex: this.props.selectedTabIndex || 0
    };
  },
  statics: {
    Tab: function(settings) {
      return new TabInfo(settings);
    }
  },
  selectedTab: function(index) {
    return this.setState({
      selectedTabIndex: index
    });
  },
  renderTab: function(tab, index) {
    return Tab({
      label: tab.label,
      key: index,
      index: index,
      selected: index === this.state.selectedTabIndex,
      onSelected: this.selectedTab
    });
  },
  renderTabs: function() {
    var index, tab;
    return div({
      className: 'workspace-tabs'
    }, (function() {
      var i, len, ref1, results;
      ref1 = this.props.tabs;
      results = [];
      for (index = i = 0, len = ref1.length; i < len; index = ++i) {
        tab = ref1[index];
        results.push(ul({}, this.renderTab(tab, index)));
      }
      return results;
    }).call(this));
  },
  renderSelectedPanel: function() {
    var index, tab;
    return div({
      className: 'workspace-tab-component'
    }, (function() {
      var i, len, ref1, results;
      ref1 = this.props.tabs;
      results = [];
      for (index = i = 0, len = ref1.length; i < len; index = ++i) {
        tab = ref1[index];
        results.push(div({
          key: index,
          style: {
            display: index === this.state.selectedTabIndex ? 'block' : 'none'
          }
        }, tab.component));
      }
      return results;
    }).call(this));
  },
  render: function() {
    return div({
      key: this.props.key,
      className: "tabbed-panel"
    }, this.renderTabs(), this.renderSelectedPanel());
  }
});



},{}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFxhcHAuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxcY2xpZW50LmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHByb3ZpZGVyc1xcZG9jdW1lbnQtc3RvcmUtcHJvdmlkZXIuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxccHJvdmlkZXJzXFxnb29nbGUtZHJpdmUtcHJvdmlkZXIuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxccHJvdmlkZXJzXFxsb2NhbHN0b3JhZ2UtcHJvdmlkZXIuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxccHJvdmlkZXJzXFxwcm92aWRlci1pbnRlcmZhY2UuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxccHJvdmlkZXJzXFxyZWFkb25seS1wcm92aWRlci5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx1aS5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx1dGlsc1xcaXMtc3RyaW5nLmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHV0aWxzXFxsYW5nXFxlbi11cy5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx1dGlsc1xcdHJhbnNsYXRlLmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHZpZXdzXFxhcHAtdmlldy5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx2aWV3c1xcYXV0aG9yaXplLW1peGluLmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHZpZXdzXFxkcm9wZG93bi12aWV3LmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHZpZXdzXFxmaWxlLWRpYWxvZy10YWItdmlldy5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx2aWV3c1xcbWVudS1iYXItdmlldy5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx2aWV3c1xcbW9kYWwtZGlhbG9nLXZpZXcuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxcdmlld3NcXG1vZGFsLXRhYmJlZC1kaWFsb2ctdmlldy5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx2aWV3c1xcbW9kYWwtdmlldy5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx2aWV3c1xccHJvdmlkZXItdGFiYmVkLWRpYWxvZy12aWV3LmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHZpZXdzXFxzZWxlY3QtcHJvdmlkZXItZGlhbG9nLXRhYi12aWV3LmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHZpZXdzXFx0YWJiZWQtcGFuZWwtdmlldy5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQSxJQUFBOztBQUFBLE9BQUEsR0FBVSxLQUFLLENBQUMsYUFBTixDQUFvQixPQUFBLENBQVEsa0JBQVIsQ0FBcEI7O0FBRVYsc0JBQUEsR0FBeUIsQ0FBQyxPQUFBLENBQVEsTUFBUixDQUFELENBQWdCLENBQUM7O0FBQzFDLHNCQUFBLEdBQXlCLENBQUMsT0FBQSxDQUFRLFVBQVIsQ0FBRCxDQUFvQixDQUFDOztBQUV4QztFQUVTLDBCQUFDLE9BQUQ7SUFFWCxJQUFDLENBQUEsV0FBRCxHQUFlLHNCQUFzQixDQUFDO0lBRXRDLElBQUMsQ0FBQSxNQUFELEdBQWMsSUFBQSxzQkFBQSxDQUFBO0lBQ2QsSUFBQyxDQUFBLFVBQUQsR0FBYztFQUxIOzs2QkFPYixJQUFBLEdBQU0sU0FBQyxVQUFELEVBQWMsV0FBZDtJQUFDLElBQUMsQ0FBQSxhQUFEOztNQUFhLGNBQWM7O0lBQ2hDLElBQUMsQ0FBQSxVQUFVLENBQUMsV0FBWixHQUEwQjtXQUMxQixJQUFDLENBQUEsTUFBTSxDQUFDLGFBQVIsQ0FBc0IsSUFBQyxDQUFBLFVBQXZCO0VBRkk7OzZCQUlOLFdBQUEsR0FBYSxTQUFDLFVBQUQsRUFBYyxNQUFkO0lBQUMsSUFBQyxDQUFBLGFBQUQ7SUFDWixJQUFDLENBQUEsSUFBRCxDQUFNLElBQUMsQ0FBQSxVQUFQLEVBQW1CLElBQW5CO1dBQ0EsSUFBQyxDQUFB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QkFIM0I7TUFJQSxVQUFBLEVBQVksSUFBQyxDQUFBLFdBSmI7S0FERDtFQURRLENBWFg7RUFvQkEsVUFBQSxFQUFZLFNBQUE7QUFDVixRQUFBO1dBQUMsR0FBQSxDQUFJO01BQUMsU0FBQSxFQUFXLGdCQUFaO0tBQUo7O0FBQ0U7QUFBQTtXQUFBLHNEQUFBOztxQkFBQSxFQUFBLENBQUcsRUFBSCxFQUFPLElBQUMsQ0FBQSxTQUFELENBQVcsR0FBWCxFQUFlLEtBQWYsQ0FBUDtBQUFBOztpQkFERjtFQURTLENBcEJaO0VBeUJBLG1CQUFBLEVBQXFCLFNBQUE7QUFDbkIsUUFBQTtXQUFDLEdBQUEsQ0FBSTtNQUFDLFNBQUEsRUFBVyx5QkFBWjtLQUFKOztBQUNDO0FBQUE7V0FBQSxzREFBQTs7cUJBQ0csR0FBQSxDQUFJO1VBQ0gsR0FBQSxFQUFLLEtBREY7VUFFSCxLQUFBLEVBQ0U7WUFBQSxPQUFBLEVBQVksS0FBQSxLQUFTLElBQUMsQ0FBQSxLQUFLLENBQUMsZ0JBQW5CLEdBQXlDLE9BQXpDLEdBQXNELE1BQS9EO1dBSEM7U0FBSixFQUtDLEdBQUcsQ0FBQyxTQUxMO0FBREg7O2lCQUREO0VBRGtCLENBekJyQjtFQXFDQSxNQUFBLEVBQVEsU0FBQTtXQUNMLEdBQUEsQ0FBSTtNQUFDLEdBQUEsRUFBSyxJQUFDLENBQUEsS0FBSyxDQUFDLEdBQWI7TUFBa0IsU0FBQSxFQUFXLGNBQTdCO0tBQUosRUFDQyxJQUFDLENBQUEsVUFBRCxDQUFBLENBREQsRUFFQyxJQUFDLENBQUEsbUJBQUQsQ0FBQSxDQUZEO0VBREssQ0FyQ1I7Q0FGZSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJBcHBWaWV3ID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL3ZpZXdzL2FwcC12aWV3J1xyXG5cclxuQ2xvdWRGaWxlTWFuYWdlclVJTWVudSA9IChyZXF1aXJlICcuL3VpJykuQ2xvdWRGaWxlTWFuYWdlclVJTWVudVxyXG5DbG91ZEZpbGVNYW5hZ2VyQ2xpZW50ID0gKHJlcXVpcmUgJy4vY2xpZW50JykuQ2xvdWRGaWxlTWFuYWdlckNsaWVudFxyXG5cclxuY2xhc3MgQ2xvdWRGaWxlTWFuYWdlclxyXG5cclxuICBjb25zdHJ1Y3RvcjogKG9wdGlvbnMpIC0+XHJcbiAgICAjIHNpbmNlIHRoZSBtb2R1bGUgZXhwb3J0cyBhbiBpbnN0YW5jZSBvZiB0aGUgY2xhc3Mgd2UgbmVlZCB0byBmYWtlIGEgY2xhc3MgdmFyaWFibGUgYXMgYW4gaW5zdGFuY2UgdmFyaWFibGVcclxuICAgIEBEZWZhdWx0TWVudSA9IENsb3VkRmlsZU1hbmFnZXJVSU1lbnUuRGVmYXVsdE1lbnVcclxuXHJcbiAgICBAY2xpZW50ID0gbmV3IENsb3VkRmlsZU1hbmFnZXJDbGllbnQoKVxyXG4gICAgQGFwcE9wdGlvbnMgPSB7fVxyXG5cclxuICBpbml0OiAoQGFwcE9wdGlvbnMsIHVzaW5nSWZyYW1lID0gZmFsc2UpIC0+XHJcbiAgICBAYXBwT3B0aW9ucy51c2luZ0lmcmFtZSA9IHVzaW5nSWZyYW1lXHJcbiAgICBAY2xpZW50LnNldEFwcE9wdGlvbnMgQGFwcE9wdGlvbnNcclxuXHJcbiAgY3JlYXRlRnJhbWU6IChAYXBwT3B0aW9ucywgZWxlbUlkKSAtPlxyXG4gICAgQGluaXQgQGFwcE9wdGlvbnMsIHRydWVcclxuICAgIEBfcmVuZGVyQXBwIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGVsZW1JZClcclxuXHJcbiAgY2xpZW50Q29ubmVjdDogKGV2ZW50Q2FsbGJhY2spIC0+XHJcbiAgICBpZiBub3QgQGFwcE9wdGlvbnMudXNpbmdJZnJhbWVcclxuICAgICAgQF9jcmVhdGVIaWRkZW5BcHAoKVxyXG4gICAgQGNsaWVudC5jb25uZWN0IGV2ZW50Q2FsbGJhY2tcclxuXHJcbiAgX2NyZWF0ZUhpZGRlbkFwcDogLT5cclxuICAgIGFuY2hvciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIilcclxuICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoYW5jaG9yKVxyXG4gICAgQF9yZW5kZXJBcHAgYW5jaG9yXHJcblxyXG4gIF9yZW5kZXJBcHA6IChhbmNob3IpIC0+XHJcbiAgICBAYXBwT3B0aW9ucy5jbGllbnQgPSBAY2xpZW50XHJcbiAgICBSZWFjdC5yZW5kZXIgKEFwcFZpZXcgQGFwcE9wdGlvbnMpLCBhbmNob3JcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gbmV3IENsb3VkRmlsZU1hbmFnZXIoKVxyXG4iLCJ0ciA9IHJlcXVpcmUgJy4vdXRpbHMvdHJhbnNsYXRlJ1xyXG5pc1N0cmluZyA9IHJlcXVpcmUgJy4vdXRpbHMvaXMtc3RyaW5nJ1xyXG5cclxuQ2xvdWRGaWxlTWFuYWdlclVJID0gKHJlcXVpcmUgJy4vdWknKS5DbG91ZEZpbGVNYW5hZ2VyVUlcclxuXHJcbkxvY2FsU3RvcmFnZVByb3ZpZGVyID0gcmVxdWlyZSAnLi9wcm92aWRlcnMvbG9jYWxzdG9yYWdlLXByb3ZpZGVyJ1xyXG5SZWFkT25seVByb3ZpZGVyID0gcmVxdWlyZSAnLi9wcm92aWRlcnMvcmVhZG9ubHktcHJvdmlkZXInXHJcbkdvb2dsZURyaXZlUHJvdmlkZXIgPSByZXF1aXJlICcuL3Byb3ZpZGVycy9nb29nbGUtZHJpdmUtcHJvdmlkZXInXHJcbkRvY3VtZW50U3RvcmVQcm92aWRlciA9IHJlcXVpcmUgJy4vcHJvdmlkZXJzL2RvY3VtZW50LXN0b3JlLXByb3ZpZGVyJ1xyXG5cclxuY2xhc3MgQ2xvdWRGaWxlTWFuYWdlckNsaWVudEV2ZW50XHJcblxyXG4gIGNvbnN0cnVjdG9yOiAoQHR5cGUsIEBkYXRhID0ge30sIEBjYWxsYmFjayA9IG51bGwsIEBzdGF0ZSA9IHt9KSAtPlxyXG5cclxuY2xhc3MgQ2xvdWRGaWxlTWFuYWdlckNsaWVudFxyXG5cclxuICBjb25zdHJ1Y3RvcjogKG9wdGlvbnMpIC0+XHJcbiAgICBAc3RhdGUgPVxyXG4gICAgICBhdmFpbGFibGVQcm92aWRlcnM6IFtdXHJcbiAgICBAX3Jlc2V0U3RhdGUoKVxyXG4gICAgQF91aSA9IG5ldyBDbG91ZEZpbGVNYW5hZ2VyVUkgQFxyXG5cclxuICBzZXRBcHBPcHRpb25zOiAoYXBwT3B0aW9ucyA9IHt9KS0+XHJcbiAgICAjIGZsdGVyIGZvciBhdmFpbGFibGUgcHJvdmlkZXJzXHJcbiAgICBhbGxQcm92aWRlcnMgPSB7fVxyXG4gICAgZm9yIFByb3ZpZGVyIGluIFtSZWFkT25seVByb3ZpZGVyLCBMb2NhbFN0b3JhZ2VQcm92aWRlciwgR29vZ2xlRHJpdmVQcm92aWRlciwgRG9jdW1lbnRTdG9yZVByb3ZpZGVyXVxyXG4gICAgICBpZiBQcm92aWRlci5BdmFpbGFibGUoKVxyXG4gICAgICAgIGFsbFByb3ZpZGVyc1tQcm92aWRlci5OYW1lXSA9IFByb3ZpZGVyXHJcblxyXG4gICAgIyBkZWZhdWx0IHRvIGFsbCBwcm92aWRlcnMgaWYgbm9uIHNwZWNpZmllZFxyXG4gICAgaWYgbm90IGFwcE9wdGlvbnMucHJvdmlkZXJzXHJcbiAgICAgIGFwcE9wdGlvbnMucHJvdmlkZXJzID0gW11cclxuICAgICAgZm9yIG93biBwcm92aWRlck5hbWUgb2YgYWxsUHJvdmlkZXJzXHJcbiAgICAgICAgYXBwT3B0aW9ucy5wcm92aWRlcnMucHVzaCBwcm92aWRlck5hbWVcclxuXHJcbiAgICAjIGNoZWNrIHRoZSBwcm92aWRlcnNcclxuICAgIGF2YWlsYWJsZVByb3ZpZGVycyA9IFtdXHJcbiAgICBmb3IgcHJvdmlkZXIgaW4gYXBwT3B0aW9ucy5wcm92aWRlcnNcclxuICAgICAgW3Byb3ZpZGVyTmFtZSwgcHJvdmlkZXJPcHRpb25zXSA9IGlmIGlzU3RyaW5nIHByb3ZpZGVyIHRoZW4gW3Byb3ZpZGVyLCB7fV0gZWxzZSBbcHJvdmlkZXIubmFtZSwgcHJvdmlkZXJdXHJcbiAgICAgIGlmIG5vdCBwcm92aWRlck5hbWVcclxuICAgICAgICBAX2Vycm9yIFwiSW52YWxpZCBwcm92aWRlciBzcGVjIC0gbXVzdCBlaXRoZXIgYmUgc3RyaW5nIG9yIG9iamVjdCB3aXRoIG5hbWUgcHJvcGVydHlcIlxyXG4gICAgICBlbHNlXHJcbiAgICAgICAgaWYgYWxsUHJvdmlkZXJzW3Byb3ZpZGVyTmFtZV1cclxuICAgICAgICAgIFByb3ZpZGVyID0gYWxsUHJvdmlkZXJzW3Byb3ZpZGVyTmFtZV1cclxuICAgICAgICAgIGF2YWlsYWJsZVByb3ZpZGVycy5wdXNoIG5ldyBQcm92aWRlciBwcm92aWRlck9wdGlvbnNcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICBAX2Vycm9yIFwiVW5rbm93biBwcm92aWRlcjogI3twcm92aWRlck5hbWV9XCJcclxuICAgIEBfc2V0U3RhdGUgYXZhaWxhYmxlUHJvdmlkZXJzOiBhdmFpbGFibGVQcm92aWRlcnNcclxuICAgIEBfdWkuaW5pdCBhcHBPcHRpb25zLnVpXHJcblxyXG4gICAgIyBjaGVjayBmb3IgYXV0b3NhdmVcclxuICAgIGlmIG9wdGlvbnMuYXV0b1NhdmVJbnRlcnZhbFxyXG4gICAgICBAYXV0b1NhdmUgb3B0aW9ucy5hdXRvU2F2ZUludGVydmFsXHJcblxyXG4gICMgc2luZ2xlIGNsaWVudCAtIHVzZWQgYnkgdGhlIGNsaWVudCBhcHAgdG8gcmVnaXN0ZXIgYW5kIHJlY2VpdmUgY2FsbGJhY2sgZXZlbnRzXHJcbiAgY29ubmVjdDogKEBldmVudENhbGxiYWNrKSAtPlxyXG4gICAgQF9ldmVudCAnY29ubmVjdGVkJywge2NsaWVudDogQH1cclxuXHJcbiAgIyBzaW5nbGUgbGlzdGVuZXIgLSB1c2VkIGJ5IHRoZSBSZWFjdCBtZW51IHZpYSB0byB3YXRjaCBjbGllbnQgc3RhdGUgY2hhbmdlc1xyXG4gIGxpc3RlbjogKEBsaXN0ZW5lckNhbGxiYWNrKSAtPlxyXG5cclxuICBhcHBlbmRNZW51SXRlbTogKGl0ZW0pIC0+XHJcbiAgICBAX3VpLmFwcGVuZE1lbnVJdGVtIGl0ZW1cclxuXHJcbiAgc2V0TWVudUJhckluZm86IChpbmZvKSAtPlxyXG4gICAgQF91aS5zZXRNZW51QmFySW5mbyBpbmZvXHJcblxyXG4gIG5ld0ZpbGU6IChjYWxsYmFjayA9IG51bGwpIC0+XHJcbiAgICBAX3Jlc2V0U3RhdGUoKVxyXG4gICAgQF9ldmVudCAnbmV3ZWRGaWxlJ1xyXG5cclxuICBuZXdGaWxlRGlhbG9nOiAoY2FsbGJhY2sgPSBudWxsKSAtPlxyXG4gICAgIyBmb3Igbm93IGp1c3QgY2FsbCBuZXcgLSBsYXRlciB3ZSBjYW4gYWRkIGNoYW5nZSBub3RpZmljYXRpb24gZnJvbSB0aGUgY2xpZW50IHNvIHdlIGNhbiBwcm9tcHQgZm9yIFwiQXJlIHlvdSBzdXJlP1wiXHJcbiAgICBAbmV3RmlsZSgpXHJcblxyXG4gIG9wZW5GaWxlOiAobWV0YWRhdGEsIGNhbGxiYWNrID0gbnVsbCkgLT5cclxuICAgIGlmIG1ldGFkYXRhPy5wcm92aWRlcj8uY2FuICdsb2FkJ1xyXG4gICAgICBtZXRhZGF0YS5wcm92aWRlci5sb2FkIG1ldGFkYXRhLCAoZXJyLCBjb250ZW50KSA9PlxyXG4gICAgICAgIHJldHVybiBAX2Vycm9yKGVycikgaWYgZXJyXHJcbiAgICAgICAgQF9maWxlQ2hhbmdlZCAnb3BlbmVkRmlsZScsIGNvbnRlbnQsIG1ldGFkYXRhXHJcbiAgICAgICAgY2FsbGJhY2s/IGNvbnRlbnQsIG1ldGFkYXRhXHJcbiAgICBlbHNlXHJcbiAgICAgIEBvcGVuRmlsZURpYWxvZyBjYWxsYmFja1xyXG5cclxuICBvcGVuRmlsZURpYWxvZzogKGNhbGxiYWNrID0gbnVsbCkgLT5cclxuICAgIEBfdWkub3BlbkZpbGVEaWFsb2cgKG1ldGFkYXRhKSA9PlxyXG4gICAgICBAb3BlbkZpbGUgbWV0YWRhdGEsIGNhbGxiYWNrXHJcblxyXG4gIHNhdmU6IChjYWxsYmFjayA9IG51bGwpIC0+XHJcbiAgICBAX2V2ZW50ICdnZXRDb250ZW50Jywge30sIChjb250ZW50KSA9PlxyXG4gICAgICBAc2F2ZUNvbnRlbnQgY29udGVudCwgY2FsbGJhY2tcclxuXHJcbiAgc2F2ZUNvbnRlbnQ6IChjb250ZW50LCBjYWxsYmFjayA9IG51bGwpIC0+XHJcbiAgICBpZiBAc3RhdGUubWV0YWRhdGFcclxuICAgICAgQHNhdmVGaWxlIGNvbnRlbnQsIEBzdGF0ZS5tZXRhZGF0YSwgY2FsbGJhY2tcclxuICAgIGVsc2VcclxuICAgICAgQHNhdmVGaWxlRGlhbG9nIGNvbnRlbnQsIGNhbGxiYWNrXHJcblxyXG4gIHNhdmVGaWxlOiAoY29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrID0gbnVsbCkgLT5cclxuICAgIGlmIG1ldGFkYXRhPy5wcm92aWRlcj8uY2FuICdzYXZlJ1xyXG4gICAgICBAX3NldFN0YXRlXHJcbiAgICAgICAgc2F2aW5nOiBtZXRhZGF0YVxyXG4gICAgICBtZXRhZGF0YS5wcm92aWRlci5zYXZlIGNvbnRlbnQsIG1ldGFkYXRhLCAoZXJyKSA9PlxyXG4gICAgICAgIHJldHVybiBAX2Vycm9yKGVycikgaWYgZXJyXHJcbiAgICAgICAgQF9maWxlQ2hhbmdlZCAnc2F2ZWRGaWxlJywgY29udGVudCwgbWV0YWRhdGFcclxuICAgICAgICBjYWxsYmFjaz8gY29udGVudCwgbWV0YWRhdGFcclxuICAgIGVsc2VcclxuICAgICAgQHNhdmVGaWxlRGlhbG9nIGNvbnRlbnQsIGNhbGxiYWNrXHJcblxyXG4gIHNhdmVGaWxlRGlhbG9nOiAoY29udGVudCA9IG51bGwsIGNhbGxiYWNrID0gbnVsbCkgLT5cclxuICAgIEBfdWkuc2F2ZUZpbGVEaWFsb2cgKG1ldGFkYXRhKSA9PlxyXG4gICAgICBAX2RpYWxvZ1NhdmUgY29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrXHJcblxyXG4gIHNhdmVGaWxlQXNEaWFsb2c6IChjb250ZW50ID0gbnVsbCwgY2FsbGJhY2sgPSBudWxsKSAtPlxyXG4gICAgQF91aS5zYXZlRmlsZUFzRGlhbG9nIChtZXRhZGF0YSkgPT5cclxuICAgICAgQF9kaWFsb2dTYXZlIGNvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFja1xyXG5cclxuICBkaXJ0eTogLT5cclxuICAgIEBfc2V0U3RhdGVcclxuICAgICAgZGlydHk6IHRydWVcclxuICAgICAgc2F2ZWQ6IGZhbHNlXHJcblxyXG4gIGF1dG9TYXZlOiAoaW50ZXJ2YWwpIC0+XHJcbiAgICBpZiBAX2F1dG9TYXZlSW50ZXJ2YWxcclxuICAgICAgY2xlYXJJbnRlcnZhbCBAX2F1dG9TYXZlSW50ZXJ2YWxcclxuXHJcbiAgICAjIGluIGNhc2UgdGhlIGNhbGxlciB1c2VzIG1pbGxpc2Vjb25kc1xyXG4gICAgaWYgaW50ZXJ2YWwgPiAxMDAwXHJcbiAgICAgIGludGVydmFsID0gTWF0aC5yb3VuZChpbnRlcnZhbCAvIDEwMDApXHJcbiAgICBpZiBpbnRlcnZhbCA+IDBcclxuICAgICAgc2F2ZUlmRGlydHkgPSA9PlxyXG4gICAgICAgIGlmIEBzdGF0ZS5kaXJ0eSBhbmQgQHN0YXRlLm1ldGFkYXRhXHJcbiAgICAgICAgICBAc2F2ZSgpXHJcbiAgICAgIEBfYXV0b1NhdmVJbnRlcnZhbCA9IHNldEludGVydmFsIHNhdmVJZkRpcnR5LCAoaW50ZXJ2YWwgKiAxMDAwKVxyXG5cclxuICBfZGlhbG9nU2F2ZTogKGNvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIGlmIGNvbnRlbnQgaXNudCBudWxsXHJcbiAgICAgIEBzYXZlRmlsZSBjb250ZW50LCBtZXRhZGF0YSwgY2FsbGJhY2tcclxuICAgIGVsc2VcclxuICAgICAgQF9ldmVudCAnZ2V0Q29udGVudCcsIHt9LCAoY29udGVudCkgPT5cclxuICAgICAgICBAc2F2ZUZpbGUgY29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrXHJcblxyXG4gIF9lcnJvcjogKG1lc3NhZ2UpIC0+XHJcbiAgICAjIGZvciBub3cgYW4gYWxlcnRcclxuICAgIGFsZXJ0IG1lc3NhZ2VcclxuXHJcbiAgX2ZpbGVDaGFuZ2VkOiAodHlwZSwgY29udGVudCwgbWV0YWRhdGEpIC0+XHJcbiAgICBAX3NldFN0YXRlXHJcbiAgICAgIGNvbnRlbnQ6IGNvbnRlbnRcclxuICAgICAgbWV0YWRhdGE6IG1ldGFkYXRhXHJcbiAgICAgIHNhdmluZzogbnVsbFxyXG4gICAgICBzYXZlZDogdHlwZSBpcyAnc2F2ZWRGaWxlJ1xyXG4gICAgICBkaXJ0eTogZmFsc2VcclxuICAgIEBfZXZlbnQgdHlwZSwge2NvbnRlbnQ6IGNvbnRlbnQsIG1ldGFkYXRhOiBtZXRhZGF0YX1cclxuXHJcbiAgX2V2ZW50OiAodHlwZSwgZGF0YSA9IHt9LCBldmVudENhbGxiYWNrID0gbnVsbCkgLT5cclxuICAgIGV2ZW50ID0gbmV3IENsb3VkRmlsZU1hbmFnZXJDbGllbnRFdmVudCB0eXBlLCBkYXRhLCBldmVudENhbGxiYWNrLCBAc3RhdGVcclxuICAgIEBldmVudENhbGxiYWNrPyBldmVudFxyXG4gICAgQGxpc3RlbmVyQ2FsbGJhY2s/IGV2ZW50XHJcblxyXG4gIF9zZXRTdGF0ZTogKG9wdGlvbnMpIC0+XHJcbiAgICBmb3Igb3duIGtleSwgdmFsdWUgb2Ygb3B0aW9uc1xyXG4gICAgICBAc3RhdGVba2V5XSA9IHZhbHVlXHJcbiAgICBAX2V2ZW50ICdzdGF0ZUNoYW5nZWQnXHJcblxyXG4gIF9yZXNldFN0YXRlOiAtPlxyXG4gICAgQF9zZXRTdGF0ZVxyXG4gICAgICBjb250ZW50OiBudWxsXHJcbiAgICAgIG1ldGFkYXRhOiBudWxsXHJcbiAgICAgIGRpcnR5OiBmYWxzZVxyXG4gICAgICBzYXZpbmc6IG51bGxcclxuICAgICAgc2F2ZWQ6IGZhbHNlXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9XHJcbiAgQ2xvdWRGaWxlTWFuYWdlckNsaWVudEV2ZW50OiBDbG91ZEZpbGVNYW5hZ2VyQ2xpZW50RXZlbnRcclxuICBDbG91ZEZpbGVNYW5hZ2VyQ2xpZW50OiBDbG91ZEZpbGVNYW5hZ2VyQ2xpZW50XHJcbiIsIntkaXYsIGJ1dHRvbn0gPSBSZWFjdC5ET01cclxuXHJcbmF1dGhvcml6ZVVybCAgPSBcImh0dHA6Ly9kb2N1bWVudC1zdG9yZS5oZXJva3VhcHAuY29tL3VzZXIvYXV0aGVudGljYXRlXCJcclxuY2hlY2tMb2dpblVybCA9IFwiaHR0cDovL2RvY3VtZW50LXN0b3JlLmhlcm9rdWFwcC5jb20vdXNlci9pbmZvXCJcclxubGlzdFVybCA9IFwiaHR0cDovL2RvY3VtZW50LXN0b3JlLmhlcm9rdWFwcC5jb20vZG9jdW1lbnQvYWxsXCJcclxuXHJcbnRyID0gcmVxdWlyZSAnLi4vdXRpbHMvdHJhbnNsYXRlJ1xyXG5pc1N0cmluZyA9IHJlcXVpcmUgJy4uL3V0aWxzL2lzLXN0cmluZydcclxuXHJcblByb3ZpZGVySW50ZXJmYWNlID0gKHJlcXVpcmUgJy4vcHJvdmlkZXItaW50ZXJmYWNlJykuUHJvdmlkZXJJbnRlcmZhY2VcclxuQ2xvdWRNZXRhZGF0YSA9IChyZXF1aXJlICcuL3Byb3ZpZGVyLWludGVyZmFjZScpLkNsb3VkTWV0YWRhdGFcclxuXHJcbkRvY3VtZW50U3RvcmVBdXRob3JpemF0aW9uRGlhbG9nID0gUmVhY3QuY3JlYXRlRmFjdG9yeSBSZWFjdC5jcmVhdGVDbGFzc1xyXG4gIGRpc3BsYXlOYW1lOiAnRG9jdW1lbnRTdG9yZUF1dGhvcml6YXRpb25EaWFsb2cnXHJcblxyXG4gIGF1dGhlbnRpY2F0ZTogLT5cclxuICAgIEBwcm9wcy5wcm92aWRlci5hdXRob3JpemUoKVxyXG5cclxuICByZW5kZXI6IC0+XHJcbiAgICAoZGl2IHt9LFxyXG4gICAgICAoYnV0dG9uIHtvbkNsaWNrOiBAYXV0aGVudGljYXRlfSwgJ0F1dGhvcml6YXRpb24gTmVlZGVkJylcclxuICAgIClcclxuXHJcbmNsYXNzIERvY3VtZW50U3RvcmVQcm92aWRlciBleHRlbmRzIFByb3ZpZGVySW50ZXJmYWNlXHJcblxyXG4gIGNvbnN0cnVjdG9yOiAoQG9wdGlvbnMgPSB7fSkgLT5cclxuICAgIHN1cGVyXHJcbiAgICAgIG5hbWU6IERvY3VtZW50U3RvcmVQcm92aWRlci5OYW1lXHJcbiAgICAgIGRpc3BsYXlOYW1lOiBAb3B0aW9ucy5kaXNwbGF5TmFtZSBvciAodHIgJ35QUk9WSURFUi5ET0NVTUVOVF9TVE9SRScpXHJcbiAgICAgIGNhcGFiaWxpdGllczpcclxuICAgICAgICBzYXZlOiB0cnVlXHJcbiAgICAgICAgbG9hZDogdHJ1ZVxyXG4gICAgICAgIGxpc3Q6IHRydWVcclxuXHJcbiAgQE5hbWU6ICdkb2N1bWVudFN0b3JlJ1xyXG5cclxuICBhdXRob3JpemVkOiAoQGF1dGhDYWxsYmFjaykgLT5cclxuXHJcbiAgYXV0aG9yaXplOiAtPlxyXG4gICAgQF9zaG93TG9naW5XaW5kb3coKVxyXG4gICAgQF9jaGVja0xvZ2luKClcclxuXHJcbiAgX2xvZ2luU3VjY2Vzc2Z1bDogKGRhdGEpIC0+XHJcbiAgICBpZiBAX2xvZ2luV2luZG93IHRoZW4gQF9sb2dpbldpbmRvdy5jbG9zZSgpXHJcbiAgICBAYXV0aENhbGxiYWNrIHRydWVcclxuXHJcbiAgX2NoZWNrTG9naW46IC0+XHJcbiAgICBwcm92aWRlciA9IEBcclxuICAgICQuYWpheFxyXG4gICAgICBkYXRhVHlwZTogJ2pzb24nXHJcbiAgICAgIHVybDogY2hlY2tMb2dpblVybFxyXG4gICAgICB4aHJGaWVsZHM6XHJcbiAgICAgICAgd2l0aENyZWRlbnRpYWxzOiB0cnVlXHJcbiAgICAgIHN1Y2Nlc3M6IChkYXRhKSAtPlxyXG4gICAgICAgIHByb3ZpZGVyLl9sb2dpblN1Y2Nlc3NmdWwoZGF0YSlcclxuICAgICAgZXJyb3I6IC0+XHJcbiAgICAgICAgIyBub3RoaW5nIHlldFxyXG5cclxuICBfbG9naW5XaW5kb3c6IG51bGxcclxuXHJcbiAgX3Nob3dMb2dpbldpbmRvdzogLT5cclxuICAgIGlmIEBfbG9naW5XaW5kb3cgYW5kIG5vdCBAX2xvZ2luV2luZG93LmNsb3NlZFxyXG4gICAgICBAX2xvZ2luV2luZG93LmZvY3VzKClcclxuICAgIGVsc2VcclxuXHJcbiAgICAgIGNvbXB1dGVTY3JlZW5Mb2NhdGlvbiA9ICh3LCBoKSAtPlxyXG4gICAgICAgIHNjcmVlbkxlZnQgPSB3aW5kb3cuc2NyZWVuTGVmdCBvciBzY3JlZW4ubGVmdFxyXG4gICAgICAgIHNjcmVlblRvcCAgPSB3aW5kb3cuc2NyZWVuVG9wICBvciBzY3JlZW4udG9wXHJcbiAgICAgICAgd2lkdGggID0gd2luZG93LmlubmVyV2lkdGggIG9yIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGllbnRXaWR0aCAgb3Igc2NyZWVuLndpZHRoXHJcbiAgICAgICAgaGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0IG9yIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGllbnRIZWlnaHQgb3Igc2NyZWVuLmhlaWdodFxyXG5cclxuICAgICAgICBsZWZ0ID0gKCh3aWR0aCAvIDIpIC0gKHcgLyAyKSkgKyBzY3JlZW5MZWZ0XHJcbiAgICAgICAgdG9wID0gKChoZWlnaHQgLyAyKSAtIChoIC8gMikpICsgc2NyZWVuVG9wXHJcbiAgICAgICAgcmV0dXJuIHtsZWZ0LCB0b3B9XHJcblxyXG4gICAgICB3aWR0aCA9IDEwMDBcclxuICAgICAgaGVpZ2h0ID0gNDgwXHJcbiAgICAgIHBvc2l0aW9uID0gY29tcHV0ZVNjcmVlbkxvY2F0aW9uIHdpZHRoLCBoZWlnaHRcclxuICAgICAgd2luZG93RmVhdHVyZXMgPSBbXHJcbiAgICAgICAgJ3dpZHRoPScgKyB3aWR0aFxyXG4gICAgICAgICdoZWlnaHQ9JyArIGhlaWdodFxyXG4gICAgICAgICd0b3A9JyArIHBvc2l0aW9uLnRvcCBvciAyMDBcclxuICAgICAgICAnbGVmdD0nICsgcG9zaXRpb24ubGVmdCBvciAyMDBcclxuICAgICAgICAnZGVwZW5kZW50PXllcydcclxuICAgICAgICAncmVzaXphYmxlPW5vJ1xyXG4gICAgICAgICdsb2NhdGlvbj1ubydcclxuICAgICAgICAnZGlhbG9nPXllcydcclxuICAgICAgICAnbWVudWJhcj1ubydcclxuICAgICAgXVxyXG5cclxuICAgICAgQF9sb2dpbldpbmRvdyA9IHdpbmRvdy5vcGVuKGF1dGhvcml6ZVVybCwgJ2F1dGgnLCB3aW5kb3dGZWF0dXJlcy5qb2luKCkpXHJcblxyXG4gICAgICBwb2xsQWN0aW9uID0gPT5cclxuICAgICAgICB0cnlcclxuICAgICAgICAgIGhyZWYgPSBAX2xvZ2luV2luZG93LmxvY2F0aW9uLmhyZWZcclxuICAgICAgICAgIGlmIChocmVmIGlzIHdpbmRvdy5sb2NhdGlvbi5ocmVmKVxyXG4gICAgICAgICAgICBjbGVhckludGVydmFsIHBvbGxcclxuICAgICAgICAgICAgQF9sb2dpbldpbmRvdy5jbG9zZSgpXHJcbiAgICAgICAgICAgIEBfY2hlY2tMb2dpbigpXHJcbiAgICAgICAgY2F0Y2ggZVxyXG4gICAgICAgICAgY29uc29sZS5sb2cgZVxyXG5cclxuICAgICAgcG9sbCA9IHNldEludGVydmFsIHBvbGxBY3Rpb24sIDIwMFxyXG5cclxuICByZW5kZXJBdXRob3JpemF0aW9uRGlhbG9nOiAtPlxyXG4gICAgKERvY3VtZW50U3RvcmVBdXRob3JpemF0aW9uRGlhbG9nIHtwcm92aWRlcjogQCwgYXV0aENhbGxiYWNrOiBAYXV0aENhbGxiYWNrfSlcclxuXHJcbiAgbGlzdDogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIHByb3ZpZGVyID0gQFxyXG4gICAgJC5hamF4XHJcbiAgICAgIGRhdGFUeXBlOiAnanNvbidcclxuICAgICAgdXJsOiBsaXN0VXJsXHJcbiAgICAgIHhockZpZWxkczpcclxuICAgICAgICB3aXRoQ3JlZGVudGlhbHM6IHRydWVcclxuICAgICAgc3VjY2VzczogKGRhdGEpIC0+XHJcbiAgICAgICAgbGlzdCA9IFtdXHJcbiAgICAgICAgcGF0aCA9IG1ldGFkYXRhPy5wYXRoIG9yICcnXHJcbiAgICAgICAgZm9yIG93biBrZXkgb2Ygd2luZG93LmxvY2FsU3RvcmFnZVxyXG4gICAgICAgICAgbGlzdC5wdXNoIG5ldyBDbG91ZE1ldGFkYXRhXHJcbiAgICAgICAgICAgIG5hbWU6IGtleVxyXG4gICAgICAgICAgICBwYXRoOiBcIiN7cGF0aH0vI3tuYW1lfVwiXHJcbiAgICAgICAgICAgIHR5cGU6IENsb3VkTWV0YWRhdGEuRmlsZVxyXG4gICAgICAgICAgICBwcm92aWRlcjogcHJvdmlkZXJcclxuICAgICAgICBjYWxsYmFjayBudWxsLCBsaXN0XHJcbiAgICAgIGVycm9yOiAtPlxyXG4gICAgICAgIGNhbGxiYWNrIG51bGwsIFtdXHJcblxyXG4gIGxvYWQ6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcblxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBEb2N1bWVudFN0b3JlUHJvdmlkZXJcclxuIiwie2Rpdn0gPSBSZWFjdC5ET01cclxuXHJcbnRyID0gcmVxdWlyZSAnLi4vdXRpbHMvdHJhbnNsYXRlJ1xyXG5pc1N0cmluZyA9IHJlcXVpcmUgJy4uL3V0aWxzL2lzLXN0cmluZydcclxuXHJcblByb3ZpZGVySW50ZXJmYWNlID0gKHJlcXVpcmUgJy4vcHJvdmlkZXItaW50ZXJmYWNlJykuUHJvdmlkZXJJbnRlcmZhY2VcclxuQ2xvdWRNZXRhZGF0YSA9IChyZXF1aXJlICcuL3Byb3ZpZGVyLWludGVyZmFjZScpLkNsb3VkTWV0YWRhdGFcclxuXHJcbntidXR0b259ID0gUmVhY3QuRE9NXHJcblxyXG5Hb29nbGVEcml2ZUF1dGhvcml6YXRpb25EaWFsb2cgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IFJlYWN0LmNyZWF0ZUNsYXNzXHJcbiAgZGlzcGxheU5hbWU6ICdHb29nbGVEcml2ZUF1dGhvcml6YXRpb25EaWFsb2cnXHJcblxyXG4gIGdldEluaXRpYWxTdGF0ZTogLT5cclxuICAgIGxvYWRlZEdBUEk6IGZhbHNlXHJcblxyXG4gIGNvbXBvbmVudFdpbGxNb3VudDogLT5cclxuICAgIEBwcm9wcy5wcm92aWRlci5fbG9hZGVkR0FQSSA9PlxyXG4gICAgICBAc2V0U3RhdGUgbG9hZGVkR0FQSTogdHJ1ZVxyXG5cclxuICBhdXRoZW50aWNhdGU6IC0+XHJcbiAgICBAcHJvcHMucHJvdmlkZXIuYXV0aG9yaXplIEdvb2dsZURyaXZlUHJvdmlkZXIuU0hPV19QT1BVUFxyXG5cclxuICByZW5kZXI6IC0+XHJcbiAgICAoZGl2IHt9LFxyXG4gICAgICBpZiBAc3RhdGUubG9hZGVkR0FQSVxyXG4gICAgICAgIChidXR0b24ge29uQ2xpY2s6IEBhdXRoZW50aWNhdGV9LCAnQXV0aG9yaXphdGlvbiBOZWVkZWQnKVxyXG4gICAgICBlbHNlXHJcbiAgICAgICAgJ1dhaXRpbmcgZm9yIHRoZSBHb29nbGUgQ2xpZW50IEFQSSB0byBsb2FkLi4uJ1xyXG4gICAgKVxyXG5cclxuY2xhc3MgR29vZ2xlRHJpdmVQcm92aWRlciBleHRlbmRzIFByb3ZpZGVySW50ZXJmYWNlXHJcblxyXG4gIGNvbnN0cnVjdG9yOiAoQG9wdGlvbnMgPSB7fSkgLT5cclxuICAgIHN1cGVyXHJcbiAgICAgIG5hbWU6IEdvb2dsZURyaXZlUHJvdmlkZXIuTmFtZVxyXG4gICAgICBkaXNwbGF5TmFtZTogQG9wdGlvbnMuZGlzcGxheU5hbWUgb3IgKHRyICd+UFJPVklERVIuR09PR0xFX0RSSVZFJylcclxuICAgICAgY2FwYWJpbGl0aWVzOlxyXG4gICAgICAgIHNhdmU6IHRydWVcclxuICAgICAgICBsb2FkOiB0cnVlXHJcbiAgICAgICAgbGlzdDogdHJ1ZVxyXG4gICAgICAgIHJlbW92ZTogdHJ1ZVxyXG4gICAgQGF1dGhUb2tlbiA9IG51bGxcclxuICAgIEBjbGllbnRJZCA9IEBvcHRpb25zLmNsaWVudElkXHJcbiAgICBpZiBub3QgQGNsaWVudElkXHJcbiAgICAgIHRocm93IG5ldyBFcnJvciAnTWlzc2luZyByZXF1aXJlZCBjbGllbnRJZCBpbiBnb29nbERyaXZlIHByb3ZpZGVyIG9wdGlvbnMnXHJcbiAgICBAbWltZVR5cGUgPSBAb3B0aW9ucy5taW1lVHlwZSBvciBcInRleHQvcGxhaW5cIlxyXG4gICAgQF9sb2FkR0FQSSgpXHJcblxyXG4gIEBOYW1lOiAnZ29vZ2xlRHJpdmUnXHJcblxyXG4gICMgYWxpYXNlcyBmb3IgYm9vbGVhbiBwYXJhbWV0ZXIgdG8gYXV0aG9yaXplXHJcbiAgQElNTUVESUFURSA9IHRydWVcclxuICBAU0hPV19QT1BVUCA9IGZhbHNlXHJcblxyXG4gIGF1dGhvcml6ZWQ6IChAYXV0aENhbGxiYWNrKSAtPlxyXG4gICAgaWYgQGF1dGhUb2tlblxyXG4gICAgICBAYXV0aENhbGxiYWNrIHRydWVcclxuICAgIGVsc2VcclxuICAgICAgQGF1dGhvcml6ZSBHb29nbGVEcml2ZVByb3ZpZGVyLklNTUVESUFURVxyXG5cclxuICBhdXRob3JpemU6IChpbW1lZGlhdGUpIC0+XHJcbiAgICBAX2xvYWRlZEdBUEkgPT5cclxuICAgICAgYXJncyA9XHJcbiAgICAgICAgY2xpZW50X2lkOiBAY2xpZW50SWRcclxuICAgICAgICBzY29wZTogJ2h0dHBzOi8vd3d3Lmdvb2dsZWFwaXMuY29tL2F1dGgvZHJpdmUnXHJcbiAgICAgICAgaW1tZWRpYXRlOiBpbW1lZGlhdGVcclxuICAgICAgZ2FwaS5hdXRoLmF1dGhvcml6ZSBhcmdzLCAoYXV0aFRva2VuKSA9PlxyXG4gICAgICAgIEBhdXRoVG9rZW4gPSBpZiBhdXRoVG9rZW4gYW5kIG5vdCBhdXRoVG9rZW4uZXJyb3IgdGhlbiBhdXRoVG9rZW4gZWxzZSBudWxsXHJcbiAgICAgICAgQGF1dGhDYWxsYmFjayBAYXV0aFRva2VuIGlzbnQgbnVsbFxyXG5cclxuICByZW5kZXJBdXRob3JpemF0aW9uRGlhbG9nOiAtPlxyXG4gICAgKEdvb2dsZURyaXZlQXV0aG9yaXphdGlvbkRpYWxvZyB7cHJvdmlkZXI6IEB9KVxyXG5cclxuICBzYXZlOiAgKGNvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIEBfbG9hZGVkR0FQSSA9PlxyXG4gICAgICBAX3NlbmRGaWxlIGNvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFja1xyXG5cclxuICBsb2FkOiAobWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgQF9sb2FkZWRHQVBJID0+XHJcbiAgICAgIHJlcXVlc3QgPSBnYXBpLmNsaWVudC5kcml2ZS5maWxlcy5nZXRcclxuICAgICAgICBmaWxlSWQ6IG1ldGFkYXRhLnByb3ZpZGVyRGF0YS5pZFxyXG4gICAgICByZXF1ZXN0LmV4ZWN1dGUgKGZpbGUpID0+XHJcbiAgICAgICAgaWYgZmlsZT8uZG93bmxvYWRVcmxcclxuICAgICAgICAgIEBfZG93bmxvYWRGcm9tVXJsIGZpbGUuZG93bmxvYWRVcmwsIEBhdXRoVG9rZW4sIGNhbGxiYWNrXHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgY2FsbGJhY2sgJ1VuYWJsZSB0byBnZXQgZG93bmxvYWQgdXJsJ1xyXG5cclxuICBsaXN0OiAobWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgQF9sb2FkZWRHQVBJID0+XHJcbiAgICAgIHJlcXVlc3QgPSBnYXBpLmNsaWVudC5kcml2ZS5maWxlcy5saXN0XHJcbiAgICAgICAgcTogXCJtaW1lVHlwZSA9ICcje0BtaW1lVHlwZX0nXCJcclxuICAgICAgcmVxdWVzdC5leGVjdXRlIChyZXN1bHQpID0+XHJcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrKCdVbmFibGUgdG8gbGlzdCBmaWxlcycpIGlmIG5vdCByZXN1bHRcclxuICAgICAgICBsaXN0ID0gW11cclxuICAgICAgICBmb3IgaXRlbSBpbiByZXN1bHQ/Lml0ZW1zXHJcbiAgICAgICAgICAjIFRPRE86IGZvciBub3cgZG9uJ3QgYWxsb3cgZm9sZGVyc1xyXG4gICAgICAgICAgaWYgaXRlbS5taW1lVHlwZSBpc250ICdhcHBsaWNhdGlvbi92bmQuZ29vZ2xlLWFwcHMuZm9sZGVyJ1xyXG4gICAgICAgICAgICBsaXN0LnB1c2ggbmV3IENsb3VkTWV0YWRhdGFcclxuICAgICAgICAgICAgICBuYW1lOiBpdGVtLnRpdGxlXHJcbiAgICAgICAgICAgICAgcGF0aDogXCJcIlxyXG4gICAgICAgICAgICAgIHR5cGU6IGlmIGl0ZW0ubWltZVR5cGUgaXMgJ2FwcGxpY2F0aW9uL3ZuZC5nb29nbGUtYXBwcy5mb2xkZXInIHRoZW4gQ2xvdWRNZXRhZGF0YS5Gb2xkZXIgZWxzZSBDbG91ZE1ldGFkYXRhLkZpbGVcclxuICAgICAgICAgICAgICBwcm92aWRlcjogQFxyXG4gICAgICAgICAgICAgIHByb3ZpZGVyRGF0YTpcclxuICAgICAgICAgICAgICAgIGlkOiBpdGVtLmlkXHJcbiAgICAgICAgbGlzdC5zb3J0IChhLCBiKSAtPlxyXG4gICAgICAgICAgbG93ZXJBID0gYS5uYW1lLnRvTG93ZXJDYXNlKClcclxuICAgICAgICAgIGxvd2VyQiA9IGIubmFtZS50b0xvd2VyQ2FzZSgpXHJcbiAgICAgICAgICByZXR1cm4gLTEgaWYgbG93ZXJBIDwgbG93ZXJCXHJcbiAgICAgICAgICByZXR1cm4gMSBpZiBsb3dlckEgPiBsb3dlckJcclxuICAgICAgICAgIHJldHVybiAwXHJcbiAgICAgICAgY2FsbGJhY2sgbnVsbCwgbGlzdFxyXG5cclxuICByZW1vdmU6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICBAX2xvYWRlZEdBUEkgLT5cclxuICAgICAgcmVxdWVzdCA9IGdhcGkuY2xpZW50LmRyaXZlLmZpbGVzLmRlbGV0ZVxyXG4gICAgICAgIGZpbGVJZDogbWV0YWRhdGEucHJvdmlkZXJEYXRhLmlkXHJcbiAgICAgIHJlcXVlc3QuZXhlY3V0ZSAocmVzdWx0KSAtPlxyXG4gICAgICAgIGNhbGxiYWNrPyByZXN1bHQ/LmVycm9yIG9yIG51bGxcclxuXHJcbiAgX2xvYWRHQVBJOiAtPlxyXG4gICAgaWYgbm90IHdpbmRvdy5fTG9hZGluZ0dBUElcclxuICAgICAgd2luZG93Ll9Mb2FkaW5nR0FQSSA9IHRydWVcclxuICAgICAgd2luZG93Ll9HQVBJT25Mb2FkID0gLT5cclxuICAgICAgICBAd2luZG93Ll9Mb2FkZWRHQVBJID0gdHJ1ZVxyXG4gICAgICBzY3JpcHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50ICdzY3JpcHQnXHJcbiAgICAgIHNjcmlwdC5zcmMgPSAnaHR0cHM6Ly9hcGlzLmdvb2dsZS5jb20vanMvY2xpZW50LmpzP29ubG9hZD1fR0FQSU9uTG9hZCdcclxuICAgICAgZG9jdW1lbnQuaGVhZC5hcHBlbmRDaGlsZCBzY3JpcHRcclxuXHJcbiAgX2xvYWRlZEdBUEk6IChjYWxsYmFjaykgLT5cclxuICAgIHNlbGYgPSBAXHJcbiAgICBjaGVjayA9IC0+XHJcbiAgICAgIGlmIHdpbmRvdy5fTG9hZGVkR0FQSVxyXG4gICAgICAgIGdhcGkuY2xpZW50LmxvYWQgJ2RyaXZlJywgJ3YyJywgLT5cclxuICAgICAgICAgIGNhbGxiYWNrLmNhbGwgc2VsZlxyXG4gICAgICBlbHNlXHJcbiAgICAgICAgc2V0VGltZW91dCBjaGVjaywgMTBcclxuICAgIHNldFRpbWVvdXQgY2hlY2ssIDEwXHJcblxyXG4gIF9kb3dubG9hZEZyb21Vcmw6ICh1cmwsIHRva2VuLCBjYWxsYmFjaykgLT5cclxuICAgIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpXHJcbiAgICB4aHIub3BlbiAnR0VUJywgdXJsXHJcbiAgICBpZiB0b2tlblxyXG4gICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlciAnQXV0aG9yaXphdGlvbicsIFwiQmVhcmVyICN7dG9rZW4uYWNjZXNzX3Rva2VufVwiXHJcbiAgICB4aHIub25sb2FkID0gLT5cclxuICAgICAgY2FsbGJhY2sgbnVsbCwgeGhyLnJlc3BvbnNlVGV4dFxyXG4gICAgeGhyLm9uZXJyb3IgPSAtPlxyXG4gICAgICBjYWxsYmFjayBcIlVuYWJsZSB0byBkb3dubG9hZCAje3VybH1cIlxyXG4gICAgeGhyLnNlbmQoKVxyXG5cclxuICBfc2VuZEZpbGU6IChjb250ZW50LCBtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICBib3VuZGFyeSA9ICctLS0tLS0tMzE0MTU5MjY1MzU4OTc5MzIzODQ2J1xyXG4gICAgaGVhZGVyID0gSlNPTi5zdHJpbmdpZnlcclxuICAgICAgdGl0bGU6IG1ldGFkYXRhLm5hbWVcclxuICAgICAgbWltZVR5cGU6IEBtaW1lVHlwZVxyXG5cclxuICAgIFttZXRob2QsIHBhdGhdID0gaWYgbWV0YWRhdGEucHJvdmlkZXJEYXRhPy5pZFxyXG4gICAgICBbJ1BVVCcsIFwiL3VwbG9hZC9kcml2ZS92Mi9maWxlcy8je21ldGFkYXRhLnByb3ZpZGVyRGF0YS5pZH1cIl1cclxuICAgIGVsc2VcclxuICAgICAgWydQT1NUJywgJy91cGxvYWQvZHJpdmUvdjIvZmlsZXMnXVxyXG5cclxuICAgIGJvZHkgPSBbXHJcbiAgICAgIFwiXFxyXFxuLS0je2JvdW5kYXJ5fVxcclxcbkNvbnRlbnQtVHlwZTogYXBwbGljYXRpb24vanNvblxcclxcblxcclxcbiN7aGVhZGVyfVwiLFxyXG4gICAgICBcIlxcclxcbi0tI3tib3VuZGFyeX1cXHJcXG5Db250ZW50LVR5cGU6ICN7QG1pbWVUeXBlfVxcclxcblxcclxcbiN7Y29udGVudH1cIixcclxuICAgICAgXCJcXHJcXG4tLSN7Ym91bmRhcnl9LS1cIlxyXG4gICAgXS5qb2luICcnXHJcblxyXG4gICAgcmVxdWVzdCA9IGdhcGkuY2xpZW50LnJlcXVlc3RcclxuICAgICAgcGF0aDogcGF0aFxyXG4gICAgICBtZXRob2Q6IG1ldGhvZFxyXG4gICAgICBwYXJhbXM6IHt1cGxvYWRUeXBlOiAnbXVsdGlwYXJ0J31cclxuICAgICAgaGVhZGVyczogeydDb250ZW50LVR5cGUnOiAnbXVsdGlwYXJ0L3JlbGF0ZWQ7IGJvdW5kYXJ5PVwiJyArIGJvdW5kYXJ5ICsgJ1wiJ31cclxuICAgICAgYm9keTogYm9keVxyXG5cclxuICAgIHJlcXVlc3QuZXhlY3V0ZSAoZmlsZSkgLT5cclxuICAgICAgaWYgY2FsbGJhY2tcclxuICAgICAgICBpZiBmaWxlPy5lcnJvclxyXG4gICAgICAgICAgY2FsbGJhY2sgXCJVbmFibGVkIHRvIHVwbG9hZCBmaWxlOiAje2ZpbGUuZXJyb3IubWVzc2FnZX1cIlxyXG4gICAgICAgIGVsc2UgaWYgZmlsZVxyXG4gICAgICAgICAgY2FsbGJhY2sgbnVsbCwgZmlsZVxyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgIGNhbGxiYWNrICdVbmFibGVkIHRvIHVwbG9hZCBmaWxlJ1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBHb29nbGVEcml2ZVByb3ZpZGVyXHJcbiIsInRyID0gcmVxdWlyZSAnLi4vdXRpbHMvdHJhbnNsYXRlJ1xyXG5cclxuUHJvdmlkZXJJbnRlcmZhY2UgPSAocmVxdWlyZSAnLi9wcm92aWRlci1pbnRlcmZhY2UnKS5Qcm92aWRlckludGVyZmFjZVxyXG5DbG91ZE1ldGFkYXRhID0gKHJlcXVpcmUgJy4vcHJvdmlkZXItaW50ZXJmYWNlJykuQ2xvdWRNZXRhZGF0YVxyXG5cclxuY2xhc3MgTG9jYWxTdG9yYWdlUHJvdmlkZXIgZXh0ZW5kcyBQcm92aWRlckludGVyZmFjZVxyXG5cclxuICBjb25zdHJ1Y3RvcjogKEBvcHRpb25zID0ge30pIC0+XHJcbiAgICBzdXBlclxyXG4gICAgICBuYW1lOiBMb2NhbFN0b3JhZ2VQcm92aWRlci5OYW1lXHJcbiAgICAgIGRpc3BsYXlOYW1lOiBAb3B0aW9ucy5kaXNwbGF5TmFtZSBvciAodHIgJ35QUk9WSURFUi5MT0NBTF9TVE9SQUdFJylcclxuICAgICAgY2FwYWJpbGl0aWVzOlxyXG4gICAgICAgIHNhdmU6IHRydWVcclxuICAgICAgICBsb2FkOiB0cnVlXHJcbiAgICAgICAgbGlzdDogdHJ1ZVxyXG4gICAgICAgIHJlbW92ZTogdHJ1ZVxyXG5cclxuICBATmFtZTogJ2xvY2FsU3RvcmFnZSdcclxuICBAQXZhaWxhYmxlOiAtPlxyXG4gICAgcmVzdWx0ID0gdHJ5XHJcbiAgICAgIHRlc3QgPSAnTG9jYWxTdG9yYWdlUHJvdmlkZXI6OmF1dGgnXHJcbiAgICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2Uuc2V0SXRlbSh0ZXN0LCB0ZXN0KVxyXG4gICAgICB3aW5kb3cubG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0odGVzdClcclxuICAgICAgdHJ1ZVxyXG4gICAgY2F0Y2hcclxuICAgICAgZmFsc2VcclxuXHJcbiAgc2F2ZTogKGNvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIHRyeVxyXG4gICAgICB3aW5kb3cubG9jYWxTdG9yYWdlLnNldEl0ZW0gQF9nZXRLZXkobWV0YWRhdGEubmFtZSksIGNvbnRlbnRcclxuICAgICAgY2FsbGJhY2s/IG51bGxcclxuICAgIGNhdGNoXHJcbiAgICAgIGNhbGxiYWNrPyAnVW5hYmxlIHRvIHNhdmUnXHJcblxyXG4gIGxvYWQ6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICB0cnlcclxuICAgICAgY29udGVudCA9IHdpbmRvdy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbSBAX2dldEtleSBtZXRhZGF0YS5uYW1lXHJcbiAgICAgIGNhbGxiYWNrIG51bGwsIGNvbnRlbnRcclxuICAgIGNhdGNoXHJcbiAgICAgIGNhbGxiYWNrICdVbmFibGUgdG8gbG9hZCdcclxuXHJcbiAgbGlzdDogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIGxpc3QgPSBbXVxyXG4gICAgcGF0aCA9IG1ldGFkYXRhPy5wYXRoIG9yICcnXHJcbiAgICBwcmVmaXggPSBAX2dldEtleSBwYXRoXHJcbiAgICBmb3Igb3duIGtleSBvZiB3aW5kb3cubG9jYWxTdG9yYWdlXHJcbiAgICAgIGlmIGtleS5zdWJzdHIoMCwgcHJlZml4Lmxlbmd0aCkgaXMgcHJlZml4XHJcbiAgICAgICAgW25hbWUsIHJlbWFpbmRlci4uLl0gPSBrZXkuc3Vic3RyKHByZWZpeC5sZW5ndGgpLnNwbGl0KCcvJylcclxuICAgICAgICBsaXN0LnB1c2ggbmV3IENsb3VkTWV0YWRhdGFcclxuICAgICAgICAgIG5hbWU6IGtleS5zdWJzdHIocHJlZml4Lmxlbmd0aClcclxuICAgICAgICAgIHBhdGg6IFwiI3twYXRofS8je25hbWV9XCJcclxuICAgICAgICAgIHR5cGU6IGlmIHJlbWFpbmRlci5sZW5ndGggPiAwIHRoZW4gQ2xvdWRNZXRhZGF0YS5Gb2xkZXIgZWxzZSBDbG91ZE1ldGFkYXRhLkZpbGVcclxuICAgICAgICAgIHByb3ZpZGVyOiBAXHJcbiAgICBjYWxsYmFjayBudWxsLCBsaXN0XHJcblxyXG4gIHJlbW92ZTogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIHRyeVxyXG4gICAgICB3aW5kb3cubG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0gQF9nZXRLZXkobWV0YWRhdGEubmFtZSlcclxuICAgICAgY2FsbGJhY2s/IG51bGxcclxuICAgIGNhdGNoXHJcbiAgICAgIGNhbGxiYWNrPyAnVW5hYmxlIHRvIGRlbGV0ZSdcclxuXHJcbiAgX2dldEtleTogKG5hbWUgPSAnJykgLT5cclxuICAgIFwiY2ZtOjoje25hbWV9XCJcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gTG9jYWxTdG9yYWdlUHJvdmlkZXJcclxuIiwie2Rpdn0gPSBSZWFjdC5ET01cclxuXHJcbmNsYXNzIENsb3VkRmlsZVxyXG4gIGNvbnRydWN0b3I6IChvcHRpb25zKSAtPlxyXG4gICAge0Bjb250ZW50LCBAbWV0YWRhdGF9ID0gb3B0aW9uc1xyXG5cclxuY2xhc3MgQ2xvdWRNZXRhZGF0YVxyXG4gIGNvbnN0cnVjdG9yOiAob3B0aW9ucykgLT5cclxuICAgIHtAbmFtZSwgQHBhdGgsIEB0eXBlLCBAcHJvdmlkZXIsIEBwcm92aWRlckRhdGF9ID0gb3B0aW9uc1xyXG4gIEBGb2xkZXI6ICdmb2xkZXInXHJcbiAgQEZpbGU6ICdmaWxlJ1xyXG5cclxuQXV0aG9yaXphdGlvbk5vdEltcGxlbWVudGVkRGlhbG9nID0gUmVhY3QuY3JlYXRlRmFjdG9yeSBSZWFjdC5jcmVhdGVDbGFzc1xyXG4gIGRpc3BsYXlOYW1lOiAnQXV0aG9yaXphdGlvbk5vdEltcGxlbWVudGVkRGlhbG9nJ1xyXG4gIHJlbmRlcjogLT5cclxuICAgIChkaXYge30sIFwiQXV0aG9yaXphdGlvbiBkaWFsb2cgbm90IHlldCBpbXBsZW1lbnRlZCBmb3IgI3tAcHJvcHMucHJvdmlkZXIuZGlzcGxheU5hbWV9XCIpXHJcblxyXG5jbGFzcyBQcm92aWRlckludGVyZmFjZVxyXG5cclxuICBjb25zdHJ1Y3RvcjogKG9wdGlvbnMpIC0+XHJcbiAgICB7QG5hbWUsIEBkaXNwbGF5TmFtZSwgQGNhcGFiaWxpdGllc30gPSBvcHRpb25zXHJcbiAgICBAdXNlciA9IG51bGxcclxuXHJcbiAgQEF2YWlsYWJsZTogLT4gdHJ1ZVxyXG5cclxuICBjYW46IChjYXBhYmlsaXR5KSAtPlxyXG4gICAgQGNhcGFiaWxpdGllc1tjYXBhYmlsaXR5XVxyXG5cclxuICBhdXRob3JpemVkOiAoY2FsbGJhY2spIC0+XHJcbiAgICBjYWxsYmFjayB0cnVlXHJcblxyXG4gIGF1dGhvcml6YXRpb25EaWFsb2c6IEF1dGhvcml6YXRpb25Ob3RJbXBsZW1lbnRlZERpYWxvZ1xyXG5cclxuICBkaWFsb2c6IChjYWxsYmFjaykgLT5cclxuICAgIEBfbm90SW1wbGVtZW50ZWQgJ2RpYWxvZydcclxuXHJcbiAgc2F2ZTogKGNvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIEBfbm90SW1wbGVtZW50ZWQgJ3NhdmUnXHJcblxyXG4gIGxvYWQ6IChjYWxsYmFjaykgLT5cclxuICAgIEBfbm90SW1wbGVtZW50ZWQgJ2xvYWQnXHJcblxyXG4gIGxpc3Q6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICBAX25vdEltcGxlbWVudGVkICdsaXN0J1xyXG5cclxuICByZW1vdmU6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICBAX25vdEltcGxlbWVudGVkICdyZW1vdmUnXHJcblxyXG4gIF9ub3RJbXBsZW1lbnRlZDogKG1ldGhvZE5hbWUpIC0+XHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCIje21ldGhvZE5hbWV9IG5vdCBpbXBsZW1lbnRlZCBmb3IgI3tAbmFtZX0gcHJvdmlkZXJcIilcclxuXHJcbm1vZHVsZS5leHBvcnRzID1cclxuICBDbG91ZEZpbGU6IENsb3VkRmlsZVxyXG4gIENsb3VkTWV0YWRhdGE6IENsb3VkTWV0YWRhdGFcclxuICBQcm92aWRlckludGVyZmFjZTogUHJvdmlkZXJJbnRlcmZhY2VcclxuIiwidHIgPSByZXF1aXJlICcuLi91dGlscy90cmFuc2xhdGUnXHJcbmlzU3RyaW5nID0gcmVxdWlyZSAnLi4vdXRpbHMvaXMtc3RyaW5nJ1xyXG5cclxuUHJvdmlkZXJJbnRlcmZhY2UgPSAocmVxdWlyZSAnLi9wcm92aWRlci1pbnRlcmZhY2UnKS5Qcm92aWRlckludGVyZmFjZVxyXG5DbG91ZE1ldGFkYXRhID0gKHJlcXVpcmUgJy4vcHJvdmlkZXItaW50ZXJmYWNlJykuQ2xvdWRNZXRhZGF0YVxyXG5cclxuY2xhc3MgUmVhZE9ubHlQcm92aWRlciBleHRlbmRzIFByb3ZpZGVySW50ZXJmYWNlXHJcblxyXG4gIGNvbnN0cnVjdG9yOiAoQG9wdGlvbnMgPSB7fSkgLT5cclxuICAgIHN1cGVyXHJcbiAgICAgIG5hbWU6IFJlYWRPbmx5UHJvdmlkZXIuTmFtZVxyXG4gICAgICBkaXNwbGF5TmFtZTogQG9wdGlvbnMuZGlzcGxheU5hbWUgb3IgKHRyICd+UFJPVklERVIuUkVBRF9PTkxZJylcclxuICAgICAgY2FwYWJpbGl0aWVzOlxyXG4gICAgICAgIHNhdmU6IGZhbHNlXHJcbiAgICAgICAgbG9hZDogdHJ1ZVxyXG4gICAgICAgIGxpc3Q6IHRydWVcclxuICAgICAgICByZW1vdmU6IGZhbHNlXHJcbiAgICBAdHJlZSA9IG51bGxcclxuXHJcbiAgQE5hbWU6ICdyZWFkT25seSdcclxuXHJcbiAgbG9hZDogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIEBfbG9hZFRyZWUgKGVyciwgdHJlZSkgPT5cclxuICAgICAgcmV0dXJuIGNhbGxiYWNrIGVyciBpZiBlcnJcclxuICAgICAgcGFyZW50ID0gQF9maW5kUGFyZW50IG1ldGFkYXRhXHJcbiAgICAgIGlmIHBhcmVudFxyXG4gICAgICAgIGlmIHBhcmVudFttZXRhZGF0YS5uYW1lXVxyXG4gICAgICAgICAgaWYgcGFyZW50W21ldGFkYXRhLm5hbWVdLm1ldGFkYXRhLnR5cGUgaXMgQ2xvdWRNZXRhZGF0YS5GaWxlXHJcbiAgICAgICAgICAgIGNhbGxiYWNrIG51bGwsIHBhcmVudFttZXRhZGF0YS5uYW1lXS5jb250ZW50XHJcbiAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgIGNhbGxiYWNrIFwiI3ttZXRhZGF0YS5uYW1lfSBpcyBhIGZvbGRlclwiXHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgY2FsbGJhY2sgXCIje21ldGFkYXRhLm5hbWV9IG5vdCBmb3VuZCBpbiBmb2xkZXJcIlxyXG4gICAgICBlbHNlXHJcbiAgICAgICAgY2FsbGJhY2sgXCIje21ldGFkYXRhLm5hbWV9IGZvbGRlciBub3QgZm91bmRcIlxyXG5cclxuICBsaXN0OiAobWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgQF9sb2FkVHJlZSAoZXJyLCB0cmVlKSA9PlxyXG4gICAgICByZXR1cm4gY2FsbGJhY2sgZXJyIGlmIGVyclxyXG4gICAgICBwYXJlbnQgPSBAX2ZpbmRQYXJlbnQgbWV0YWRhdGFcclxuICAgICAgaWYgcGFyZW50XHJcbiAgICAgICAgbGlzdCA9IFtdXHJcbiAgICAgICAgbGlzdC5wdXNoIGZpbGUubWV0YWRhdGEgZm9yIG93biBmaWxlbmFtZSwgZmlsZSBvZiBwYXJlbnRcclxuICAgICAgICBjYWxsYmFjayBudWxsLCBsaXN0XHJcbiAgICAgIGVsc2UgaWYgbWV0YWRhdGFcclxuICAgICAgICBjYWxsYmFjayBcIiN7bWV0YWRhdGEubmFtZX0gZm9sZGVyIG5vdCBmb3VuZFwiXHJcblxyXG4gIF9sb2FkVHJlZTogKGNhbGxiYWNrKSAtPlxyXG4gICAgaWYgQHRyZWUgaXNudCBudWxsXHJcbiAgICAgIGNhbGxiYWNrIG51bGwsIEB0cmVlXHJcbiAgICBlbHNlIGlmIEBvcHRpb25zLmpzb25cclxuICAgICAgQHRyZWUgPSBAX2NvbnZlcnRKU09OVG9NZXRhZGF0YVRyZWUgQG9wdGlvbnMuanNvblxyXG4gICAgICBjYWxsYmFjayBudWxsLCBAdHJlZVxyXG4gICAgZWxzZSBpZiBAb3B0aW9ucy5qc29uQ2FsbGJhY2tcclxuICAgICAgQG9wdGlvbnMuanNvbkNhbGxiYWNrIChlcnIsIGpzb24pID0+XHJcbiAgICAgICAgaWYgZXJyXHJcbiAgICAgICAgICBjYWxsYmFjayBlcnJcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICBAdHJlZSA9IEBfY29udmVydEpTT05Ub01ldGFkYXRhVHJlZSBAb3B0aW9ucy5qc29uXHJcbiAgICAgICAgICBjYWxsYmFjayBudWxsLCBAdHJlZVxyXG4gICAgZWxzZSBpZiBAb3B0aW9ucy5zcmNcclxuICAgICAgJC5hamF4XHJcbiAgICAgICAgZGF0YVR5cGU6ICdqc29uJ1xyXG4gICAgICAgIHVybDogQG9wdGlvbnMuc3JjXHJcbiAgICAgICAgc3VjY2VzczogKGRhdGEpID0+XHJcbiAgICAgICAgICBAdHJlZSA9IEBfY29udmVydEpTT05Ub01ldGFkYXRhVHJlZSBkYXRhXHJcbiAgICAgICAgICBjYWxsYmFjayBudWxsLCBAdHJlZVxyXG4gICAgICAgIGVycm9yOiAtPiBjYWxsYmFjayBcIlVuYWJsZSB0byBsb2FkIGpzb24gZm9yICN7QGRpc3BsYXlOYW1lfSBwcm92aWRlclwiXHJcbiAgICBlbHNlXHJcbiAgICAgIGNvbnNvbGUuZXJyb3I/IFwiTm8ganNvbiBvciBzcmMgb3B0aW9uIGZvdW5kIGZvciAje0BkaXNwbGF5TmFtZX0gcHJvdmlkZXJcIlxyXG4gICAgICBjYWxsYmFjayBudWxsLCB7fVxyXG5cclxuICBfY29udmVydEpTT05Ub01ldGFkYXRhVHJlZTogKGpzb24sIHBhdGhQcmVmaXggPSAnLycpIC0+XHJcbiAgICB0cmVlID0ge31cclxuICAgIGZvciBvd24gZmlsZW5hbWUgb2YganNvblxyXG4gICAgICB0eXBlID0gaWYgaXNTdHJpbmcganNvbltmaWxlbmFtZV0gdGhlbiBDbG91ZE1ldGFkYXRhLkZpbGUgZWxzZSBDbG91ZE1ldGFkYXRhLkZvbGRlclxyXG4gICAgICBtZXRhZGF0YSA9IG5ldyBDbG91ZE1ldGFkYXRhXHJcbiAgICAgICAgbmFtZTogZmlsZW5hbWVcclxuICAgICAgICBwYXRoOiBwYXRoUHJlZml4ICsgZmlsZW5hbWVcclxuICAgICAgICB0eXBlOiB0eXBlXHJcbiAgICAgICAgcHJvdmlkZXI6IEBcclxuICAgICAgICBjaGlsZHJlbjogbnVsbFxyXG4gICAgICBpZiB0eXBlIGlzIENsb3VkTWV0YWRhdGEuRm9sZGVyXHJcbiAgICAgICAgbWV0YWRhdGEuY2hpbGRyZW4gPSBfY29udmVydEpTT05Ub01ldGFkYXRhVHJlZSBqc29uW2ZpbGVuYW1lXSwgcGF0aFByZWZpeCArIGZpbGVuYW1lICsgJy8nXHJcbiAgICAgIHRyZWVbZmlsZW5hbWVdID1cclxuICAgICAgICBjb250ZW50OiBqc29uW2ZpbGVuYW1lXVxyXG4gICAgICAgIG1ldGFkYXRhOiBtZXRhZGF0YVxyXG4gICAgdHJlZVxyXG5cclxuICBfZmluZFBhcmVudDogKG1ldGFkYXRhKSAtPlxyXG4gICAgaWYgbm90IG1ldGFkYXRhXHJcbiAgICAgIEB0cmVlXHJcbiAgICBlbHNlXHJcbiAgICAgIEB0cmVlXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWRPbmx5UHJvdmlkZXJcclxuIiwidHIgPSByZXF1aXJlICcuL3V0aWxzL3RyYW5zbGF0ZSdcclxuaXNTdHJpbmcgPSByZXF1aXJlICcuL3V0aWxzL2lzLXN0cmluZydcclxuXHJcbmNsYXNzIENsb3VkRmlsZU1hbmFnZXJVSUV2ZW50XHJcblxyXG4gIGNvbnN0cnVjdG9yOiAoQHR5cGUsIEBkYXRhID0ge30pIC0+XHJcblxyXG5jbGFzcyBDbG91ZEZpbGVNYW5hZ2VyVUlNZW51XHJcblxyXG4gIEBEZWZhdWx0TWVudTogWyduZXdGaWxlRGlhbG9nJywgJ29wZW5GaWxlRGlhbG9nJywgJ3NhdmUnLCAnc2F2ZUZpbGVBc0RpYWxvZyddXHJcblxyXG4gIGNvbnN0cnVjdG9yOiAob3B0aW9ucywgY2xpZW50KSAtPlxyXG4gICAgc2V0QWN0aW9uID0gKGFjdGlvbikgLT5cclxuICAgICAgY2xpZW50W2FjdGlvbl0/LmJpbmQoY2xpZW50KSBvciAoLT4gYWxlcnQgXCJObyAje2FjdGlvbn0gYWN0aW9uIGlzIGF2YWlsYWJsZSBpbiB0aGUgY2xpZW50XCIpXHJcblxyXG4gICAgQGl0ZW1zID0gW11cclxuICAgIGZvciBpdGVtIGluIG9wdGlvbnMubWVudVxyXG4gICAgICBtZW51SXRlbSA9IGlmIGlzU3RyaW5nIGl0ZW1cclxuICAgICAgICBuYW1lID0gb3B0aW9ucy5tZW51TmFtZXM/W2l0ZW1dXHJcbiAgICAgICAgbWVudUl0ZW0gPSBzd2l0Y2ggaXRlbVxyXG4gICAgICAgICAgd2hlbiAnbmV3RmlsZURpYWxvZydcclxuICAgICAgICAgICAgbmFtZTogbmFtZSBvciB0ciBcIn5NRU5VLk5FV1wiXHJcbiAgICAgICAgICB3aGVuICdvcGVuRmlsZURpYWxvZydcclxuICAgICAgICAgICAgbmFtZTogbmFtZSBvciB0ciBcIn5NRU5VLk9QRU5cIlxyXG4gICAgICAgICAgd2hlbiAnc2F2ZSdcclxuICAgICAgICAgICAgbmFtZTogbmFtZSBvciB0ciBcIn5NRU5VLlNBVkVcIlxyXG4gICAgICAgICAgd2hlbiAnc2F2ZUZpbGVBc0RpYWxvZydcclxuICAgICAgICAgICAgbmFtZTogbmFtZSBvciB0ciBcIn5NRU5VLlNBVkVfQVNcIlxyXG4gICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICBuYW1lOiBcIlVua25vd24gaXRlbTogI3tpdGVtfVwiXHJcbiAgICAgICAgbWVudUl0ZW0uYWN0aW9uID0gc2V0QWN0aW9uIGl0ZW1cclxuICAgICAgICBtZW51SXRlbVxyXG4gICAgICBlbHNlXHJcbiAgICAgICAgIyBjbGllbnRzIGNhbiBwYXNzIGluIGN1c3RvbSB7bmFtZTouLi4sIGFjdGlvbjouLi59IG1lbnUgaXRlbXMgd2hlcmUgdGhlIGFjdGlvbiBjYW4gYmUgYSBjbGllbnQgZnVuY3Rpb24gbmFtZSBvciBpdCBpcyBhc3N1Z21lZCBpdCBpcyBhIGZ1bmN0aW9uXHJcbiAgICAgICAgaWYgaXNTdHJpbmcgaXRlbS5hY3Rpb25cclxuICAgICAgICAgIGl0ZW0uYWN0aW9uID0gc2V0QWN0aW9uIGl0ZW0uYWN0aW9uXHJcbiAgICAgICAgaXRlbVxyXG4gICAgICBpZiBtZW51SXRlbVxyXG4gICAgICAgIEBpdGVtcy5wdXNoIG1lbnVJdGVtXHJcblxyXG5jbGFzcyBDbG91ZEZpbGVNYW5hZ2VyVUlcclxuXHJcbiAgY29uc3RydWN0b3I6IChAY2xpZW50KS0+XHJcbiAgICBAbWVudSA9IG51bGxcclxuXHJcbiAgaW5pdDogKG9wdGlvbnMpIC0+XHJcbiAgICBvcHRpb25zID0gb3B0aW9ucyBvciB7fVxyXG4gICAgIyBza2lwIHRoZSBtZW51IGlmIGV4cGxpY2l0eSBzZXQgdG8gbnVsbCAobWVhbmluZyBubyBtZW51KVxyXG4gICAgaWYgb3B0aW9ucy5tZW51IGlzbnQgbnVsbFxyXG4gICAgICBpZiB0eXBlb2Ygb3B0aW9ucy5tZW51IGlzICd1bmRlZmluZWQnXHJcbiAgICAgICAgb3B0aW9ucy5tZW51ID0gQ2xvdWRGaWxlTWFuYWdlclVJTWVudS5EZWZhdWx0TWVudVxyXG4gICAgICBAbWVudSA9IG5ldyBDbG91ZEZpbGVNYW5hZ2VyVUlNZW51IG9wdGlvbnMsIEBjbGllbnRcclxuXHJcbiAgIyBmb3IgUmVhY3QgdG8gbGlzdGVuIGZvciBkaWFsb2cgY2hhbmdlc1xyXG4gIGxpc3RlbjogKEBsaXN0ZW5lckNhbGxiYWNrKSAtPlxyXG5cclxuICBhcHBlbmRNZW51SXRlbTogKGl0ZW0pIC0+XHJcbiAgICBAbGlzdGVuZXJDYWxsYmFjayBuZXcgQ2xvdWRGaWxlTWFuYWdlclVJRXZlbnQgJ2FwcGVuZE1lbnVJdGVtJywgaXRlbVxyXG5cclxuICBzZXRNZW51QmFySW5mbzogKGluZm8pIC0+XHJcbiAgICBAbGlzdGVuZXJDYWxsYmFjayBuZXcgQ2xvdWRGaWxlTWFuYWdlclVJRXZlbnQgJ3NldE1lbnVCYXJJbmZvJywgaW5mb1xyXG5cclxuICBzYXZlRmlsZURpYWxvZzogKGNhbGxiYWNrKSAtPlxyXG4gICAgQF9zaG93UHJvdmlkZXJEaWFsb2cgJ3NhdmVGaWxlJywgKHRyICd+RElBTE9HLlNBVkUnKSwgY2FsbGJhY2tcclxuXHJcbiAgc2F2ZUZpbGVBc0RpYWxvZzogKGNhbGxiYWNrKSAtPlxyXG4gICAgQF9zaG93UHJvdmlkZXJEaWFsb2cgJ3NhdmVGaWxlQXMnLCAodHIgJ35ESUFMT0cuU0FWRV9BUycpLCBjYWxsYmFja1xyXG5cclxuICBvcGVuRmlsZURpYWxvZzogKGNhbGxiYWNrKSAtPlxyXG4gICAgQF9zaG93UHJvdmlkZXJEaWFsb2cgJ29wZW5GaWxlJywgKHRyICd+RElBTE9HLk9QRU4nKSwgY2FsbGJhY2tcclxuXHJcbiAgX3Nob3dQcm92aWRlckRpYWxvZzogKGFjdGlvbiwgdGl0bGUsIGNhbGxiYWNrKSAtPlxyXG4gICAgQGxpc3RlbmVyQ2FsbGJhY2sgbmV3IENsb3VkRmlsZU1hbmFnZXJVSUV2ZW50ICdzaG93UHJvdmlkZXJEaWFsb2cnLFxyXG4gICAgICBhY3Rpb246IGFjdGlvblxyXG4gICAgICB0aXRsZTogdGl0bGVcclxuICAgICAgY2FsbGJhY2s6IGNhbGxiYWNrXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9XHJcbiAgQ2xvdWRGaWxlTWFuYWdlclVJRXZlbnQ6IENsb3VkRmlsZU1hbmFnZXJVSUV2ZW50XHJcbiAgQ2xvdWRGaWxlTWFuYWdlclVJOiBDbG91ZEZpbGVNYW5hZ2VyVUlcclxuICBDbG91ZEZpbGVNYW5hZ2VyVUlNZW51OiBDbG91ZEZpbGVNYW5hZ2VyVUlNZW51XHJcbiIsIm1vZHVsZS5leHBvcnRzID0gKHBhcmFtKSAtPiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwocGFyYW0pIGlzICdbb2JqZWN0IFN0cmluZ10nXHJcbiIsIm1vZHVsZS5leHBvcnRzID1cclxuICBcIn5NRU5VQkFSLlVOVElUTEVfRE9DVU1FTlRcIjogXCJVbnRpdGxlZCBEb2N1bWVudFwiXHJcblxyXG4gIFwifk1FTlUuTkVXXCI6IFwiTmV3XCJcclxuICBcIn5NRU5VLk9QRU5cIjogXCJPcGVuIC4uLlwiXHJcbiAgXCJ+TUVOVS5TQVZFXCI6IFwiU2F2ZVwiXHJcbiAgXCJ+TUVOVS5TQVZFX0FTXCI6IFwiU2F2ZSBBcyAuLi5cIlxyXG5cclxuICBcIn5ESUFMT0cuU0FWRVwiOiBcIlNhdmVcIlxyXG4gIFwifkRJQUxPRy5TQVZFX0FTXCI6IFwiU2F2ZSBBcyAuLi5cIlxyXG4gIFwifkRJQUxPRy5PUEVOXCI6IFwiT3BlblwiXHJcblxyXG4gIFwiflBST1ZJREVSLkxPQ0FMX1NUT1JBR0VcIjogXCJMb2NhbCBTdG9yYWdlXCJcclxuICBcIn5QUk9WSURFUi5SRUFEX09OTFlcIjogXCJSZWFkIE9ubHlcIlxyXG4gIFwiflBST1ZJREVSLkdPT0dMRV9EUklWRVwiOiBcIkdvb2dsZSBEcml2ZVwiXHJcbiAgXCJ+UFJPVklERVIuRE9DVU1FTlRfU1RPUkVcIjogXCJEb2N1bWVudCBTdG9yZVwiXHJcblxyXG4gIFwifkZJTEVfRElBTE9HLkZJTEVOQU1FXCI6IFwiRmlsZW5hbWVcIlxyXG4gIFwifkZJTEVfRElBTE9HLk9QRU5cIjogXCJPcGVuXCJcclxuICBcIn5GSUxFX0RJQUxPRy5TQVZFXCI6IFwiU2F2ZVwiXHJcbiAgXCJ+RklMRV9ESUFMT0cuQ0FOQ0VMXCI6IFwiQ2FuY2VsXCJcclxuICBcIn5GSUxFX0RJQUxPRy5SRU1PVkVcIjogXCJEZWxldGVcIlxyXG4gIFwifkZJTEVfRElBTE9HLlJFTU9WRV9DT05GSVJNXCI6IFwiQXJlIHlvdSBzdXJlIHlvdSB3YW50IHRvIGRlbGV0ZSAle2ZpbGVuYW1lfT9cIlxyXG4gIFwifkZJTEVfRElBTE9HLkxPQURJTkdcIjogXCJMb2FkaW5nLi4uXCJcclxuIiwidHJhbnNsYXRpb25zID0gIHt9XHJcbnRyYW5zbGF0aW9uc1snZW4nXSA9IHJlcXVpcmUgJy4vbGFuZy9lbi11cydcclxuZGVmYXVsdExhbmcgPSAnZW4nXHJcbnZhclJlZ0V4cCA9IC8lXFx7XFxzKihbXn1cXHNdKilcXHMqXFx9L2dcclxuXHJcbnRyYW5zbGF0ZSA9IChrZXksIHZhcnM9e30sIGxhbmc9ZGVmYXVsdExhbmcpIC0+XHJcbiAgdHJhbnNsYXRpb24gPSB0cmFuc2xhdGlvbnNbbGFuZ10/W2tleV0gb3Iga2V5XHJcbiAgdHJhbnNsYXRpb24ucmVwbGFjZSB2YXJSZWdFeHAsIChtYXRjaCwga2V5KSAtPlxyXG4gICAgaWYgdmFycy5oYXNPd25Qcm9wZXJ0eSBrZXkgdGhlbiB2YXJzW2tleV0gZWxzZSBcIicqKiBVS05PV04gS0VZOiAje2tleX0gKipcIlxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSB0cmFuc2xhdGVcclxuIiwiTWVudUJhciA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9tZW51LWJhci12aWV3J1xyXG5Qcm92aWRlclRhYmJlZERpYWxvZyA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9wcm92aWRlci10YWJiZWQtZGlhbG9nLXZpZXcnXHJcblxyXG50ciA9IHJlcXVpcmUgJy4uL3V0aWxzL3RyYW5zbGF0ZSdcclxuXHJcbntkaXYsIGlmcmFtZX0gPSBSZWFjdC5ET01cclxuXHJcbklubmVyQXBwID0gUmVhY3QuY3JlYXRlRmFjdG9yeSBSZWFjdC5jcmVhdGVDbGFzc1xyXG5cclxuICBkaXNwbGF5TmFtZTogJ0Nsb3VkRmlsZU1hbmFnZXJJbm5lckFwcCdcclxuXHJcbiAgc2hvdWxkQ29tcG9uZW50VXBkYXRlOiAobmV4dFByb3BzKSAtPlxyXG4gICAgbmV4dFByb3BzLmFwcCBpc250IEBwcm9wcy5hcHBcclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgKGRpdiB7Y2xhc3NOYW1lOiAnaW5uZXJBcHAnfSxcclxuICAgICAgKGlmcmFtZSB7c3JjOiBAcHJvcHMuYXBwfSlcclxuICAgIClcclxuXHJcbkFwcCA9IFJlYWN0LmNyZWF0ZUNsYXNzXHJcblxyXG4gIGRpc3BsYXlOYW1lOiAnQ2xvdWRGaWxlTWFuYWdlcidcclxuXHJcbiAgZ2V0RmlsZW5hbWU6IC0+XHJcbiAgICBpZiBAcHJvcHMuY2xpZW50LnN0YXRlLm1ldGFkYXRhPy5oYXNPd25Qcm9wZXJ0eSgnbmFtZScpIHRoZW4gQHByb3BzLmNsaWVudC5zdGF0ZS5tZXRhZGF0YS5uYW1lIGVsc2UgKHRyIFwifk1FTlVCQVIuVU5USVRMRV9ET0NVTUVOVFwiKVxyXG5cclxuICBnZXRJbml0aWFsU3RhdGU6IC0+XHJcbiAgICBmaWxlbmFtZTogQGdldEZpbGVuYW1lKClcclxuICAgIG1lbnVJdGVtczogQHByb3BzLmNsaWVudC5fdWkubWVudT8uaXRlbXMgb3IgW11cclxuICAgIG1lbnVPcHRpb25zOiBAcHJvcHMubWVudUJhciBvciB7fVxyXG4gICAgcHJvdmlkZXJEaWFsb2c6IG51bGxcclxuICAgIGRpcnR5OiBmYWxzZVxyXG5cclxuICBjb21wb25lbnRXaWxsTW91bnQ6IC0+XHJcbiAgICBAcHJvcHMuY2xpZW50Lmxpc3RlbiAoZXZlbnQpID0+XHJcbiAgICAgIGZpbGVTdGF0dXMgPSBpZiBldmVudC5zdGF0ZS5zYXZpbmdcclxuICAgICAgICB7bWVzc2FnZTogXCJTYXZpbmcgYWxsIGNoYW5nZXMgdG8gI3tldmVudC5zdGF0ZS5zYXZpbmcucHJvdmlkZXIuZGlzcGxheU5hbWV9Li4uXCIsIHR5cGU6ICdpbmZvJ31cclxuICAgICAgZWxzZSBpZiBldmVudC5zdGF0ZS5zYXZlZFxyXG4gICAgICAgIHttZXNzYWdlOiBcIkFsbCBjaGFuZ2VzIHNhdmVkIHRvICN7ZXZlbnQuc3RhdGUubWV0YWRhdGEucHJvdmlkZXIuZGlzcGxheU5hbWV9XCIsIHR5cGU6ICdpbmZvJ31cclxuICAgICAgZWxzZSBpZiBldmVudC5zdGF0ZS5kaXJ0eVxyXG4gICAgICAgIHttZXNzYWdlOiAnVW5zYXZlZCcsIHR5cGU6ICdhbGVydCd9XHJcbiAgICAgIGVsc2VcclxuICAgICAgICBudWxsXHJcbiAgICAgIEBzZXRTdGF0ZVxyXG4gICAgICAgIGZpbGVuYW1lOiBAZ2V0RmlsZW5hbWUoKVxyXG4gICAgICAgIGZpbGVTdGF0dXM6IGZpbGVTdGF0dXNcclxuXHJcbiAgICAgIHN3aXRjaCBldmVudC50eXBlXHJcbiAgICAgICAgd2hlbiAnY29ubmVjdGVkJ1xyXG4gICAgICAgICAgQHNldFN0YXRlIG1lbnVJdGVtczogQHByb3BzLmNsaWVudC5fdWkubWVudT8uaXRlbXMgb3IgW11cclxuXHJcbiAgICBAcHJvcHMuY2xpZW50Ll91aS5saXN0ZW4gKGV2ZW50KSA9PlxyXG4gICAgICBzd2l0Y2ggZXZlbnQudHlwZVxyXG4gICAgICAgIHdoZW4gJ3Nob3dQcm92aWRlckRpYWxvZydcclxuICAgICAgICAgIEBzZXRTdGF0ZSBwcm92aWRlckRpYWxvZzogZXZlbnQuZGF0YVxyXG4gICAgICAgIHdoZW4gJ2FwcGVuZE1lbnVJdGVtJ1xyXG4gICAgICAgICAgQHN0YXRlLm1lbnVJdGVtcy5wdXNoIGV2ZW50LmRhdGFcclxuICAgICAgICAgIEBzZXRTdGF0ZSBtZW51SXRlbXM6IEBzdGF0ZS5tZW51SXRlbXNcclxuICAgICAgICB3aGVuICdzZXRNZW51QmFySW5mbydcclxuICAgICAgICAgIEBzdGF0ZS5tZW51T3B0aW9ucy5pbmZvID0gZXZlbnQuZGF0YVxyXG4gICAgICAgICAgQHNldFN0YXRlIG1lbnVPcHRpb25zOiBAc3RhdGUubWVudU9wdGlvbnNcclxuXHJcbiAgY2xvc2VQcm92aWRlckRpYWxvZzogLT5cclxuICAgIEBzZXRTdGF0ZSBwcm92aWRlckRpYWxvZzogbnVsbFxyXG5cclxuICByZW5kZXI6IC0+XHJcbiAgICBpZiBAcHJvcHMudXNpbmdJZnJhbWVcclxuICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnYXBwJ30sXHJcbiAgICAgICAgKE1lbnVCYXIge2ZpbGVuYW1lOiBAc3RhdGUuZmlsZW5hbWUsIGZpbGVTdGF0dXM6IEBzdGF0ZS5maWxlU3RhdHVzLCBpdGVtczogQHN0YXRlLm1lbnVJdGVtcywgb3B0aW9uczogQHN0YXRlLm1lbnVPcHRpb25zfSlcclxuICAgICAgICAoSW5uZXJBcHAge2FwcDogQHByb3BzLmFwcH0pXHJcbiAgICAgICAgaWYgQHN0YXRlLnByb3ZpZGVyRGlhbG9nXHJcbiAgICAgICAgICAoUHJvdmlkZXJUYWJiZWREaWFsb2cge2NsaWVudDogQHByb3BzLmNsaWVudCwgZGlhbG9nOiBAc3RhdGUucHJvdmlkZXJEaWFsb2csIGNsb3NlOiBAY2xvc2VQcm92aWRlckRpYWxvZ30pXHJcbiAgICAgIClcclxuICAgIGVsc2VcclxuICAgICAgaWYgQHN0YXRlLnByb3ZpZGVyRGlhbG9nXHJcbiAgICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnYXBwJ30sXHJcbiAgICAgICAgICAoUHJvdmlkZXJUYWJiZWREaWFsb2cge2NsaWVudDogQHByb3BzLmNsaWVudCwgZGlhbG9nOiBAc3RhdGUucHJvdmlkZXJEaWFsb2csIGNsb3NlOiBAY2xvc2VQcm92aWRlckRpYWxvZ30pXHJcbiAgICAgICAgKVxyXG4gICAgICBlbHNlXHJcbiAgICAgICAgbnVsbFxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBBcHBcclxuIiwiQXV0aG9yaXplTWl4aW4gPVxyXG4gIGdldEluaXRpYWxTdGF0ZTogLT5cclxuICAgIGF1dGhvcml6ZWQ6IGZhbHNlXHJcblxyXG4gIGNvbXBvbmVudFdpbGxNb3VudDogLT5cclxuICAgIEBwcm9wcy5wcm92aWRlci5hdXRob3JpemVkIChhdXRob3JpemVkKSA9PlxyXG4gICAgICBAc2V0U3RhdGUgYXV0aG9yaXplZDogYXV0aG9yaXplZFxyXG5cclxuICByZW5kZXI6IC0+XHJcbiAgICBpZiBAc3RhdGUuYXV0aG9yaXplZFxyXG4gICAgICBAcmVuZGVyV2hlbkF1dGhvcml6ZWQoKVxyXG4gICAgZWxzZVxyXG4gICAgICBAcHJvcHMucHJvdmlkZXIucmVuZGVyQXV0aG9yaXphdGlvbkRpYWxvZygpXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEF1dGhvcml6ZU1peGluXHJcbiIsIntkaXYsIGksIHNwYW4sIHVsLCBsaX0gPSBSZWFjdC5ET01cclxuXHJcbkRyb3Bkb3duSXRlbSA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgUmVhY3QuY3JlYXRlQ2xhc3NcclxuXHJcbiAgZGlzcGxheU5hbWU6ICdEcm9wZG93bkl0ZW0nXHJcblxyXG4gIGNsaWNrZWQ6IC0+XHJcbiAgICBAcHJvcHMuc2VsZWN0IEBwcm9wcy5pdGVtXHJcblxyXG4gIHJlbmRlcjogLT5cclxuICAgIGNsYXNzTmFtZSA9IFwibWVudUl0ZW0gI3tpZiBAcHJvcHMuaXNBY3Rpb25NZW51IGFuZCBub3QgQHByb3BzLml0ZW0uYWN0aW9uIHRoZW4gJ2Rpc2FibGVkJyBlbHNlICcnfVwiXHJcbiAgICBuYW1lID0gQHByb3BzLml0ZW0ubmFtZSBvciBAcHJvcHMuaXRlbVxyXG4gICAgKGxpIHtjbGFzc05hbWU6IGNsYXNzTmFtZSwgb25DbGljazogQGNsaWNrZWQgfSwgbmFtZSlcclxuXHJcbkRyb3BEb3duID0gUmVhY3QuY3JlYXRlQ2xhc3NcclxuXHJcbiAgZGlzcGxheU5hbWU6ICdEcm9wZG93bidcclxuXHJcbiAgZ2V0RGVmYXVsdFByb3BzOiAtPlxyXG4gICAgaXNBY3Rpb25NZW51OiB0cnVlICAgICAgICAgICAgICAjIFdoZXRoZXIgZWFjaCBpdGVtIGNvbnRhaW5zIGl0cyBvd24gYWN0aW9uXHJcbiAgICBvblNlbGVjdDogKGl0ZW0pIC0+ICAgICAgICAgICAgICMgSWYgbm90LCBAcHJvcHMub25TZWxlY3QgaXMgY2FsbGVkXHJcbiAgICAgIGxvZy5pbmZvIFwiU2VsZWN0ZWQgI3tpdGVtfVwiXHJcblxyXG4gIGdldEluaXRpYWxTdGF0ZTogLT5cclxuICAgIHNob3dpbmdNZW51OiBmYWxzZVxyXG4gICAgdGltZW91dDogbnVsbFxyXG5cclxuICBibHVyOiAtPlxyXG4gICAgQHVuYmx1cigpXHJcbiAgICB0aW1lb3V0ID0gc2V0VGltZW91dCAoID0+IEBzZXRTdGF0ZSB7c2hvd2luZ01lbnU6IGZhbHNlfSApLCA1MDBcclxuICAgIEBzZXRTdGF0ZSB7dGltZW91dDogdGltZW91dH1cclxuXHJcbiAgdW5ibHVyOiAtPlxyXG4gICAgaWYgQHN0YXRlLnRpbWVvdXRcclxuICAgICAgY2xlYXJUaW1lb3V0KEBzdGF0ZS50aW1lb3V0KVxyXG4gICAgQHNldFN0YXRlIHt0aW1lb3V0OiBudWxsfVxyXG5cclxuICBzZWxlY3Q6IChpdGVtKSAtPlxyXG4gICAgbmV4dFN0YXRlID0gKG5vdCBAc3RhdGUuc2hvd2luZ01lbnUpXHJcbiAgICBAc2V0U3RhdGUge3Nob3dpbmdNZW51OiBuZXh0U3RhdGV9XHJcbiAgICByZXR1cm4gdW5sZXNzIGl0ZW1cclxuICAgIGlmIEBwcm9wcy5pc0FjdGlvbk1lbnUgYW5kIGl0ZW0uYWN0aW9uXHJcbiAgICAgIGl0ZW0uYWN0aW9uKClcclxuICAgIGVsc2VcclxuICAgICAgQHByb3BzLm9uU2VsZWN0IGl0ZW1cclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgbWVudUNsYXNzID0gaWYgQHN0YXRlLnNob3dpbmdNZW51IHRoZW4gJ21lbnUtc2hvd2luZycgZWxzZSAnbWVudS1oaWRkZW4nXHJcbiAgICBzZWxlY3QgPSAoaXRlbSkgPT5cclxuICAgICAgKCA9PiBAc2VsZWN0KGl0ZW0pKVxyXG4gICAgKGRpdiB7Y2xhc3NOYW1lOiAnbWVudSd9LFxyXG4gICAgICAoc3BhbiB7Y2xhc3NOYW1lOiAnbWVudS1hbmNob3InLCBvbkNsaWNrOiA9PiBAc2VsZWN0KG51bGwpfSxcclxuICAgICAgICBAcHJvcHMuYW5jaG9yXHJcbiAgICAgICAgKGkge2NsYXNzTmFtZTogJ2ljb24tYXJyb3ctZXhwYW5kJ30pXHJcbiAgICAgIClcclxuICAgICAgaWYgQHByb3BzLml0ZW1zPy5sZW5ndGggPiAwXHJcbiAgICAgICAgKGRpdiB7Y2xhc3NOYW1lOiBtZW51Q2xhc3MsIG9uTW91c2VMZWF2ZTogQGJsdXIsIG9uTW91c2VFbnRlcjogQHVuYmx1cn0sXHJcbiAgICAgICAgICAodWwge30sXHJcbiAgICAgICAgICAgIChEcm9wZG93bkl0ZW0ge2tleTogaXRlbS5uYW1lIG9yIGl0ZW0sIGl0ZW06IGl0ZW0sIHNlbGVjdDogQHNlbGVjdCwgaXNBY3Rpb25NZW51OiBAcHJvcHMuaXNBY3Rpb25NZW51fSkgZm9yIGl0ZW0gaW4gQHByb3BzLml0ZW1zXHJcbiAgICAgICAgICApXHJcbiAgICAgICAgKVxyXG4gICAgKVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBEcm9wRG93blxyXG4iLCJBdXRob3JpemVNaXhpbiA9IHJlcXVpcmUgJy4vYXV0aG9yaXplLW1peGluJ1xyXG5DbG91ZE1ldGFkYXRhID0gKHJlcXVpcmUgJy4uL3Byb3ZpZGVycy9wcm92aWRlci1pbnRlcmZhY2UnKS5DbG91ZE1ldGFkYXRhXHJcblxyXG50ciA9IHJlcXVpcmUgJy4uL3V0aWxzL3RyYW5zbGF0ZSdcclxuXHJcbntkaXYsIGltZywgaSwgc3BhbiwgaW5wdXQsIGJ1dHRvbn0gPSBSZWFjdC5ET01cclxuXHJcbkZpbGVMaXN0RmlsZSA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgUmVhY3QuY3JlYXRlQ2xhc3NcclxuICBkaXNwbGF5TmFtZTogJ0ZpbGVMaXN0RmlsZSdcclxuXHJcbiAgY29tcG9uZW50V2lsbE1vdW50OiAtPlxyXG4gICAgQGxhc3RDbGljayA9IDBcclxuXHJcbiAgZmlsZVNlbGVjdGVkOiAgKGUpIC0+XHJcbiAgICBlLnByZXZlbnREZWZhdWx0KClcclxuICAgIGUuc3RvcFByb3BhZ2F0aW9uKClcclxuICAgIG5vdyA9IChuZXcgRGF0ZSgpKS5nZXRUaW1lKClcclxuICAgIEBwcm9wcy5maWxlU2VsZWN0ZWQgQHByb3BzLm1ldGFkYXRhXHJcbiAgICBpZiBub3cgLSBAbGFzdENsaWNrIDw9IDI1MFxyXG4gICAgICBAcHJvcHMuZmlsZUNvbmZpcm1lZCgpXHJcbiAgICBAbGFzdENsaWNrID0gbm93XHJcblxyXG4gIHJlbmRlcjogLT5cclxuICAgIChkaXYge2NsYXNzTmFtZTogKGlmIEBwcm9wcy5zZWxlY3RlZCB0aGVuICdzZWxlY3RlZCcgZWxzZSAnJyksIG9uQ2xpY2s6IEBmaWxlU2VsZWN0ZWR9LCBAcHJvcHMubWV0YWRhdGEubmFtZSlcclxuXHJcbkZpbGVMaXN0ID0gUmVhY3QuY3JlYXRlRmFjdG9yeSBSZWFjdC5jcmVhdGVDbGFzc1xyXG4gIGRpc3BsYXlOYW1lOiAnRmlsZUxpc3QnXHJcblxyXG4gIGdldEluaXRpYWxTdGF0ZTogLT5cclxuICAgIGxvYWRpbmc6IHRydWVcclxuXHJcbiAgY29tcG9uZW50RGlkTW91bnQ6IC0+XHJcbiAgICBAbG9hZCgpXHJcblxyXG4gIGxvYWQ6IC0+XHJcbiAgICBAcHJvcHMucHJvdmlkZXIubGlzdCBAcHJvcHMuZm9sZGVyLCAoZXJyLCBsaXN0KSA9PlxyXG4gICAgICByZXR1cm4gYWxlcnQoZXJyKSBpZiBlcnJcclxuICAgICAgQHNldFN0YXRlXHJcbiAgICAgICAgbG9hZGluZzogZmFsc2VcclxuICAgICAgQHByb3BzLmxpc3RMb2FkZWQgbGlzdFxyXG5cclxuICByZW5kZXI6IC0+XHJcbiAgICAoZGl2IHtjbGFzc05hbWU6ICdmaWxlbGlzdCd9LFxyXG4gICAgICBpZiBAc3RhdGUubG9hZGluZ1xyXG4gICAgICAgIHRyIFwifkZJTEVfRElBTE9HLkxPQURJTkdcIlxyXG4gICAgICBlbHNlXHJcbiAgICAgICAgZm9yIG1ldGFkYXRhIGluIEBwcm9wcy5saXN0XHJcbiAgICAgICAgICAoRmlsZUxpc3RGaWxlIHttZXRhZGF0YTogbWV0YWRhdGEsIHNlbGVjdGVkOiBAcHJvcHMuc2VsZWN0ZWRGaWxlIGlzIG1ldGFkYXRhLCBmaWxlU2VsZWN0ZWQ6IEBwcm9wcy5maWxlU2VsZWN0ZWQsIGZpbGVDb25maXJtZWQ6IEBwcm9wcy5maWxlQ29uZmlybWVkfSlcclxuICAgIClcclxuXHJcbkZpbGVEaWFsb2dUYWIgPSBSZWFjdC5jcmVhdGVDbGFzc1xyXG4gIGRpc3BsYXlOYW1lOiAnRmlsZURpYWxvZ1RhYidcclxuXHJcbiAgbWl4aW5zOiBbQXV0aG9yaXplTWl4aW5dXHJcblxyXG4gIGdldEluaXRpYWxTdGF0ZTogLT5cclxuICAgIGZvbGRlcjogQHByb3BzLmNsaWVudC5zdGF0ZS5tZXRhZGF0YT8ucGFyZW50IG9yIG51bGxcclxuICAgIG1ldGFkYXRhOiBAcHJvcHMuY2xpZW50LnN0YXRlLm1ldGFkYXRhXHJcbiAgICBmaWxlbmFtZTogQHByb3BzLmNsaWVudC5zdGF0ZS5tZXRhZGF0YT8ubmFtZSBvciAnJ1xyXG4gICAgbGlzdDogW11cclxuXHJcbiAgY29tcG9uZW50V2lsbE1vdW50OiAtPlxyXG4gICAgQGlzT3BlbiA9IEBwcm9wcy5kaWFsb2cuYWN0aW9uIGlzICdvcGVuRmlsZSdcclxuXHJcbiAgZmlsZW5hbWVDaGFuZ2VkOiAoZSkgLT5cclxuICAgIGZpbGVuYW1lID0gZS50YXJnZXQudmFsdWVcclxuICAgIG1ldGFkYXRhID0gQGZpbmRNZXRhZGF0YSBmaWxlbmFtZVxyXG4gICAgQHNldFN0YXRlXHJcbiAgICAgIGZpbGVuYW1lOiBmaWxlbmFtZVxyXG4gICAgICBtZXRhZGF0YTogbWV0YWRhdGFcclxuXHJcbiAgbGlzdExvYWRlZDogKGxpc3QpIC0+XHJcbiAgICBAc2V0U3RhdGUgbGlzdDogbGlzdFxyXG5cclxuICBmaWxlU2VsZWN0ZWQ6IChtZXRhZGF0YSkgLT5cclxuICAgIGlmIG1ldGFkYXRhPy50eXBlIGlzIENsb3VkTWV0YWRhdGEuRmlsZVxyXG4gICAgICBAc2V0U3RhdGUgZmlsZW5hbWU6IG1ldGFkYXRhLm5hbWVcclxuICAgIEBzZXRTdGF0ZSBtZXRhZGF0YTogbWV0YWRhdGFcclxuXHJcbiAgY29uZmlybTogLT5cclxuICAgIGlmIG5vdCBAc3RhdGUubWV0YWRhdGFcclxuICAgICAgZmlsZW5hbWUgPSAkLnRyaW0gQHN0YXRlLmZpbGVuYW1lXHJcbiAgICAgIEBzdGF0ZS5tZXRhZGF0YSA9IEBmaW5kTWV0YWRhdGEgZmlsZW5hbWVcclxuICAgICAgaWYgbm90IEBzdGF0ZS5tZXRhZGF0YVxyXG4gICAgICAgIGlmIEBpc09wZW5cclxuICAgICAgICAgIGFsZXJ0IFwiI3tAc3RhdGUuZmlsZW5hbWV9IG5vdCBmb3VuZFwiXHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgQHN0YXRlLm1ldGFkYXRhID0gbmV3IENsb3VkTWV0YWRhdGFcclxuICAgICAgICAgICAgbmFtZTogZmlsZW5hbWVcclxuICAgICAgICAgICAgcGF0aDogXCIvI3tmaWxlbmFtZX1cIiAjIFRPRE86IEZpeCBwYXRoXHJcbiAgICAgICAgICAgIHR5cGU6IENsb3VkTWV0YWRhdGEuRmlsZVxyXG4gICAgICAgICAgICBwcm92aWRlcjogQHByb3BzLnByb3ZpZGVyXHJcbiAgICBpZiBAc3RhdGUubWV0YWRhdGFcclxuICAgICAgIyBlbnN1cmUgdGhlIG1ldGFkYXRhIHByb3ZpZGVyIGlzIHRoZSBjdXJyZW50bHktc2hvd2luZyB0YWJcclxuICAgICAgQHN0YXRlLm1ldGFkYXRhLnByb3ZpZGVyID0gQHByb3BzLnByb3ZpZGVyXHJcbiAgICAgIEBwcm9wcy5kaWFsb2cuY2FsbGJhY2sgQHN0YXRlLm1ldGFkYXRhXHJcbiAgICAgIEBwcm9wcy5jbG9zZSgpXHJcblxyXG4gIHJlbW92ZTogLT5cclxuICAgIGlmIEBzdGF0ZS5tZXRhZGF0YSBhbmQgQHN0YXRlLm1ldGFkYXRhLnR5cGUgaXNudCBDbG91ZE1ldGFkYXRhLkZvbGRlciBhbmQgY29uZmlybSh0cihcIn5GSUxFX0RJQUxPRy5SRU1PVkVfQ09ORklSTVwiLCB7ZmlsZW5hbWU6IEBzdGF0ZS5tZXRhZGF0YS5uYW1lfSkpXHJcbiAgICAgIEBwcm9wcy5wcm92aWRlci5yZW1vdmUgQHN0YXRlLm1ldGFkYXRhLCAoZXJyKSA9PlxyXG4gICAgICAgIGlmIG5vdCBlcnJcclxuICAgICAgICAgIGxpc3QgPSBAc3RhdGUubGlzdC5zbGljZSAwXHJcbiAgICAgICAgICBpbmRleCA9IGxpc3QuaW5kZXhPZiBAc3RhdGUubWV0YWRhdGFcclxuICAgICAgICAgIGxpc3Quc3BsaWNlIGluZGV4LCAxXHJcbiAgICAgICAgICBAc2V0U3RhdGVcclxuICAgICAgICAgICAgbGlzdDogbGlzdFxyXG4gICAgICAgICAgICBtZXRhZGF0YTogbnVsbFxyXG4gICAgICAgICAgICBmaWxlbmFtZTogJydcclxuXHJcbiAgY2FuY2VsOiAtPlxyXG4gICAgQHByb3BzLmNsb3NlKClcclxuXHJcbiAgZmluZE1ldGFkYXRhOiAoZmlsZW5hbWUpIC0+XHJcbiAgICBmb3IgbWV0YWRhdGEgaW4gQHN0YXRlLmxpc3RcclxuICAgICAgaWYgbWV0YWRhdGEubmFtZSBpcyBmaWxlbmFtZVxyXG4gICAgICAgIHJldHVybiBtZXRhZGF0YVxyXG4gICAgbnVsbFxyXG5cclxuICB3YXRjaEZvckVudGVyOiAoZSkgLT5cclxuICAgIGlmIGUua2V5Q29kZSBpcyAxMyBhbmQgbm90IEBjb25maXJtRGlzYWJsZWQoKVxyXG4gICAgICBAY29uZmlybSgpXHJcblxyXG4gIGNvbmZpcm1EaXNhYmxlZDogLT5cclxuICAgIChAc3RhdGUuZmlsZW5hbWUubGVuZ3RoIGlzIDApIG9yIChAaXNPcGVuIGFuZCBub3QgQHN0YXRlLm1ldGFkYXRhKVxyXG5cclxuICByZW5kZXJXaGVuQXV0aG9yaXplZDogLT5cclxuICAgIGNvbmZpcm1EaXNhYmxlZCA9IEBjb25maXJtRGlzYWJsZWQoKVxyXG4gICAgcmVtb3ZlRGlzYWJsZWQgPSAoQHN0YXRlLm1ldGFkYXRhIGlzIG51bGwpIG9yIChAc3RhdGUubWV0YWRhdGEudHlwZSBpcyBDbG91ZE1ldGFkYXRhLkZvbGRlcilcclxuXHJcbiAgICAoZGl2IHtjbGFzc05hbWU6ICdkaWFsb2dUYWInfSxcclxuICAgICAgKGlucHV0IHt0eXBlOiAndGV4dCcsIHZhbHVlOiBAc3RhdGUuZmlsZW5hbWUsIHBsYWNlaG9sZGVyOiAodHIgXCJ+RklMRV9ESUFMT0cuRklMRU5BTUVcIiksIG9uQ2hhbmdlOiBAZmlsZW5hbWVDaGFuZ2VkLCBvbktleURvd246IEB3YXRjaEZvckVudGVyfSlcclxuICAgICAgKEZpbGVMaXN0IHtwcm92aWRlcjogQHByb3BzLnByb3ZpZGVyLCBmb2xkZXI6IEBzdGF0ZS5mb2xkZXIsIHNlbGVjdGVkRmlsZTogQHN0YXRlLm1ldGFkYXRhLCBmaWxlU2VsZWN0ZWQ6IEBmaWxlU2VsZWN0ZWQsIGZpbGVDb25maXJtZWQ6IEBjb25maXJtLCBsaXN0OiBAc3RhdGUubGlzdCwgbGlzdExvYWRlZDogQGxpc3RMb2FkZWR9KVxyXG4gICAgICAoZGl2IHtjbGFzc05hbWU6ICdidXR0b25zJ30sXHJcbiAgICAgICAgKGJ1dHRvbiB7b25DbGljazogQGNvbmZpcm0sIGRpc2FibGVkOiBjb25maXJtRGlzYWJsZWQsIGNsYXNzTmFtZTogaWYgY29uZmlybURpc2FibGVkIHRoZW4gJ2Rpc2FibGVkJyBlbHNlICcnfSwgaWYgQGlzT3BlbiB0aGVuICh0ciBcIn5GSUxFX0RJQUxPRy5PUEVOXCIpIGVsc2UgKHRyIFwifkZJTEVfRElBTE9HLlNBVkVcIikpXHJcbiAgICAgICAgaWYgQHByb3BzLnByb3ZpZGVyLmNhbiAncmVtb3ZlJ1xyXG4gICAgICAgICAgKGJ1dHRvbiB7b25DbGljazogQHJlbW92ZSwgZGlzYWJsZWQ6IHJlbW92ZURpc2FibGVkLCBjbGFzc05hbWU6IGlmIHJlbW92ZURpc2FibGVkIHRoZW4gJ2Rpc2FibGVkJyBlbHNlICcnfSwgKHRyIFwifkZJTEVfRElBTE9HLlJFTU9WRVwiKSlcclxuICAgICAgICAoYnV0dG9uIHtvbkNsaWNrOiBAY2FuY2VsfSwgKHRyIFwifkZJTEVfRElBTE9HLkNBTkNFTFwiKSlcclxuICAgICAgKVxyXG4gICAgKVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBGaWxlRGlhbG9nVGFiXHJcbiIsIntkaXYsIGksIHNwYW59ID0gUmVhY3QuRE9NXHJcblxyXG5Ecm9wZG93biA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9kcm9wZG93bi12aWV3J1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzc1xyXG5cclxuICBkaXNwbGF5TmFtZTogJ01lbnVCYXInXHJcblxyXG4gIGdldEluaXRpYWxTdGF0ZTogLT5cclxuICAgIHJpZ2h0U2lkZUxheW91dDogQHByb3BzLm9wdGlvbnMucmlnaHRTaWRlTGF5b3V0IG9yIFsnaW5mbycsICdoZWxwJ11cclxuXHJcbiAgaGVscDogLT5cclxuICAgIHdpbmRvdy5vcGVuIEBwcm9wcy5vcHRpb25zLmhlbHAsICdfYmxhbmsnXHJcblxyXG4gIHJlbmRlcjogLT5cclxuICAgIChkaXYge2NsYXNzTmFtZTogJ21lbnUtYmFyJ30sXHJcbiAgICAgIChkaXYge2NsYXNzTmFtZTogJ21lbnUtYmFyLWxlZnQnfSxcclxuICAgICAgICAoRHJvcGRvd24ge1xyXG4gICAgICAgICAgYW5jaG9yOiBAcHJvcHMuZmlsZW5hbWVcclxuICAgICAgICAgIGl0ZW1zOiBAcHJvcHMuaXRlbXNcclxuICAgICAgICAgIGNsYXNzTmFtZTonbWVudS1iYXItY29udGVudC1maWxlbmFtZSd9KVxyXG4gICAgICAgIGlmIEBwcm9wcy5maWxlU3RhdHVzXHJcbiAgICAgICAgICAoc3BhbiB7Y2xhc3NOYW1lOiBcIm1lbnUtYmFyLWZpbGUtc3RhdHVzLSN7QHByb3BzLmZpbGVTdGF0dXMudHlwZX1cIn0sIEBwcm9wcy5maWxlU3RhdHVzLm1lc3NhZ2UpXHJcbiAgICAgIClcclxuICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnbWVudS1iYXItcmlnaHQnfSxcclxuICAgICAgICBmb3IgaXRlbSBpbiBAc3RhdGUucmlnaHRTaWRlTGF5b3V0XHJcbiAgICAgICAgICBpZiBAcHJvcHMub3B0aW9uc1tpdGVtXVxyXG4gICAgICAgICAgICBzd2l0Y2ggaXRlbVxyXG4gICAgICAgICAgICAgIHdoZW4gJ2luZm8nXHJcbiAgICAgICAgICAgICAgICAoc3BhbiB7Y2xhc3NOYW1lOiAnbWVudS1iYXItaW5mbyd9LCBAcHJvcHMub3B0aW9ucy5pbmZvKVxyXG4gICAgICAgICAgICAgIHdoZW4gJ2hlbHAnXHJcbiAgICAgICAgICAgICAgICAoaSB7c3R5bGU6IHtmb250U2l6ZTogXCIxM3B4XCJ9LCBjbGFzc05hbWU6ICdjbGlja2FibGUgaWNvbi1oZWxwJywgb25DbGljazogQGhlbHB9KVxyXG4gICAgICApXHJcbiAgICApXHJcbiIsIk1vZGFsID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL21vZGFsLXZpZXcnXHJcbntkaXYsIGl9ID0gUmVhY3QuRE9NXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzXHJcblxyXG4gIGRpc3BsYXlOYW1lOiAnTW9kYWxEaWFsb2cnXHJcblxyXG4gIGNsb3NlOiAtPlxyXG4gICAgQHByb3BzLmNsb3NlPygpXHJcblxyXG4gIHJlbmRlcjogLT5cclxuICAgIChNb2RhbCB7Y2xvc2U6IEBwcm9wcy5jbG9zZX0sXHJcbiAgICAgIChkaXYge2NsYXNzTmFtZTogJ21vZGFsLWRpYWxvZyd9LFxyXG4gICAgICAgIChkaXYge2NsYXNzTmFtZTogJ21vZGFsLWRpYWxvZy13cmFwcGVyJ30sXHJcbiAgICAgICAgICAoZGl2IHtjbGFzc05hbWU6ICdtb2RhbC1kaWFsb2ctdGl0bGUnfSxcclxuICAgICAgICAgICAgKGkge2NsYXNzTmFtZTogXCJtb2RhbC1kaWFsb2ctdGl0bGUtY2xvc2UgaWNvbi1jb2RhcC1leFwiLCBvbkNsaWNrOiBAY2xvc2V9KVxyXG4gICAgICAgICAgICBAcHJvcHMudGl0bGUgb3IgJ1VudGl0bGVkIERpYWxvZydcclxuICAgICAgICAgIClcclxuICAgICAgICAgIChkaXYge2NsYXNzTmFtZTogJ21vZGFsLWRpYWxvZy13b3Jrc3BhY2UnfSwgQHByb3BzLmNoaWxkcmVuKVxyXG4gICAgICAgIClcclxuICAgICAgKVxyXG4gICAgKVxyXG4iLCJNb2RhbERpYWxvZyA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9tb2RhbC1kaWFsb2ctdmlldydcclxuVGFiYmVkUGFuZWwgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vdGFiYmVkLXBhbmVsLXZpZXcnXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzXHJcblxyXG4gIGRpc3BsYXlOYW1lOiAnTW9kYWxUYWJiZWREaWFsb2dWaWV3J1xyXG5cclxuICByZW5kZXI6IC0+XHJcbiAgICAoTW9kYWxEaWFsb2cge3RpdGxlOiBAcHJvcHMudGl0bGUsIGNsb3NlOiBAcHJvcHMuY2xvc2V9LFxyXG4gICAgICAoVGFiYmVkUGFuZWwge3RhYnM6IEBwcm9wcy50YWJzLCBzZWxlY3RlZFRhYkluZGV4OiBAcHJvcHMuc2VsZWN0ZWRUYWJJbmRleH0pXHJcbiAgICApXHJcbiIsIntkaXZ9ID0gUmVhY3QuRE9NXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzXHJcblxyXG4gIGRpc3BsYXlOYW1lOiAnTW9kYWwnXHJcblxyXG4gIHdhdGNoRm9yRXNjYXBlOiAoZSkgLT5cclxuICAgIGlmIGUua2V5Q29kZSBpcyAyN1xyXG4gICAgICBAcHJvcHMuY2xvc2U/KClcclxuXHJcbiAgY29tcG9uZW50RGlkTW91bnQ6IC0+XHJcbiAgICAkKHdpbmRvdykub24gJ2tleXVwJywgQHdhdGNoRm9yRXNjYXBlXHJcblxyXG4gIGNvbXBvbmVudFdpbGxVbm1vdW50OiAtPlxyXG4gICAgJCh3aW5kb3cpLm9mZiAna2V5dXAnLCBAd2F0Y2hGb3JFc2NhcGVcclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgKGRpdiB7Y2xhc3NOYW1lOiAnbW9kYWwnfSxcclxuICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnbW9kYWwtYmFja2dyb3VuZCd9KVxyXG4gICAgICAoZGl2IHtjbGFzc05hbWU6ICdtb2RhbC1jb250ZW50J30sIEBwcm9wcy5jaGlsZHJlbilcclxuICAgIClcclxuIiwiTW9kYWxUYWJiZWREaWFsb2cgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vbW9kYWwtdGFiYmVkLWRpYWxvZy12aWV3J1xyXG5UYWJiZWRQYW5lbCA9IHJlcXVpcmUgJy4vdGFiYmVkLXBhbmVsLXZpZXcnXHJcbkNsb3VkTWV0YWRhdGEgPSAocmVxdWlyZSAnLi4vcHJvdmlkZXJzL3Byb3ZpZGVyLWludGVyZmFjZScpLkNsb3VkTWV0YWRhdGFcclxuRmlsZURpYWxvZ1RhYiA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9maWxlLWRpYWxvZy10YWItdmlldydcclxuU2VsZWN0UHJvdmlkZXJEaWFsb2dUYWIgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vc2VsZWN0LXByb3ZpZGVyLWRpYWxvZy10YWItdmlldydcclxuXHJcbnRyID0gcmVxdWlyZSAnLi4vdXRpbHMvdHJhbnNsYXRlJ1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzc1xyXG4gIGRpc3BsYXlOYW1lOiAnUHJvdmlkZXJUYWJiZWREaWFsb2cnXHJcblxyXG4gIHJlbmRlcjogIC0+XHJcbiAgICBbY2FwYWJpbGl0eSwgVGFiQ29tcG9uZW50XSA9IHN3aXRjaCBAcHJvcHMuZGlhbG9nLmFjdGlvblxyXG4gICAgICB3aGVuICdvcGVuRmlsZScgdGhlbiBbJ2xpc3QnLCBGaWxlRGlhbG9nVGFiXVxyXG4gICAgICB3aGVuICdzYXZlRmlsZScsICdzYXZlRmlsZUFzJyB0aGVuIFsnc2F2ZScsIEZpbGVEaWFsb2dUYWJdXHJcbiAgICAgIHdoZW4gJ3NlbGVjdFByb3ZpZGVyJyB0aGVuIFtudWxsLCBTZWxlY3RQcm92aWRlckRpYWxvZ1RhYl1cclxuXHJcbiAgICB0YWJzID0gW11cclxuICAgIHNlbGVjdGVkVGFiSW5kZXggPSAwXHJcbiAgICBmb3IgcHJvdmlkZXIsIGkgaW4gQHByb3BzLmNsaWVudC5zdGF0ZS5hdmFpbGFibGVQcm92aWRlcnNcclxuICAgICAgaWYgbm90IGNhcGFiaWxpdHkgb3IgcHJvdmlkZXIuY2FwYWJpbGl0aWVzW2NhcGFiaWxpdHldXHJcbiAgICAgICAgY29tcG9uZW50ID0gVGFiQ29tcG9uZW50XHJcbiAgICAgICAgICBjbGllbnQ6IEBwcm9wcy5jbGllbnRcclxuICAgICAgICAgIGRpYWxvZzogQHByb3BzLmRpYWxvZ1xyXG4gICAgICAgICAgY2xvc2U6IEBwcm9wcy5jbG9zZVxyXG4gICAgICAgICAgcHJvdmlkZXI6IHByb3ZpZGVyXHJcbiAgICAgICAgdGFicy5wdXNoIFRhYmJlZFBhbmVsLlRhYiB7a2V5OiBpLCBsYWJlbDogKHRyIHByb3ZpZGVyLmRpc3BsYXlOYW1lKSwgY29tcG9uZW50OiBjb21wb25lbnR9XHJcbiAgICAgICAgaWYgcHJvdmlkZXIgaXMgQHByb3BzLmNsaWVudC5zdGF0ZS5tZXRhZGF0YT8ucHJvdmlkZXJcclxuICAgICAgICAgIHNlbGVjdGVkVGFiSW5kZXggPSBpXHJcblxyXG4gICAgKE1vZGFsVGFiYmVkRGlhbG9nIHt0aXRsZTogKHRyIEBwcm9wcy5kaWFsb2cudGl0bGUpLCBjbG9zZTogQHByb3BzLmNsb3NlLCB0YWJzOiB0YWJzLCBzZWxlY3RlZFRhYkluZGV4OiBzZWxlY3RlZFRhYkluZGV4fSlcclxuIiwie2Rpdn0gPSBSZWFjdC5ET01cclxuXHJcblNlbGVjdFByb3ZpZGVyRGlhbG9nVGFiID0gUmVhY3QuY3JlYXRlRmFjdG9yeSBSZWFjdC5jcmVhdGVDbGFzc1xyXG4gIGRpc3BsYXlOYW1lOiAnU2VsZWN0UHJvdmlkZXJEaWFsb2dUYWInXHJcbiAgcmVuZGVyOiAtPiAoZGl2IHt9LCBcIlRPRE86IFNlbGVjdFByb3ZpZGVyRGlhbG9nVGFiOiAje0Bwcm9wcy5wcm92aWRlci5kaXNwbGF5TmFtZX1cIilcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gU2VsZWN0UHJvdmlkZXJEaWFsb2dUYWJcclxuIiwie2RpdiwgdWwsIGxpLCBhfSA9IFJlYWN0LkRPTVxyXG5cclxuY2xhc3MgVGFiSW5mb1xyXG4gIGNvbnN0cnVjdG9yOiAoc2V0dGluZ3M9e30pIC0+XHJcbiAgICB7QGxhYmVsLCBAY29tcG9uZW50fSA9IHNldHRpbmdzXHJcblxyXG5UYWIgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IFJlYWN0LmNyZWF0ZUNsYXNzXHJcblxyXG4gIGRpc3BsYXlOYW1lOiAnVGFiYmVkUGFuZWxUYWInXHJcblxyXG4gIGNsaWNrZWQ6IChlKSAtPlxyXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXHJcbiAgICBAcHJvcHMub25TZWxlY3RlZCBAcHJvcHMuaW5kZXhcclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgY2xhc3NuYW1lID0gaWYgQHByb3BzLnNlbGVjdGVkIHRoZW4gJ3RhYi1zZWxlY3RlZCcgZWxzZSAnJ1xyXG4gICAgKGxpIHtjbGFzc05hbWU6IGNsYXNzbmFtZSwgb25DbGljazogQGNsaWNrZWR9LCBAcHJvcHMubGFiZWwpXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzXHJcblxyXG4gIGRpc3BsYXlOYW1lOiAnVGFiYmVkUGFuZWxWaWV3J1xyXG5cclxuICBnZXRJbml0aWFsU3RhdGU6IC0+XHJcbiAgICBzZWxlY3RlZFRhYkluZGV4OiBAcHJvcHMuc2VsZWN0ZWRUYWJJbmRleCBvciAwXHJcblxyXG4gIHN0YXRpY3M6XHJcbiAgICBUYWI6IChzZXR0aW5ncykgLT4gbmV3IFRhYkluZm8gc2V0dGluZ3NcclxuXHJcbiAgc2VsZWN0ZWRUYWI6IChpbmRleCkgLT5cclxuICAgIEBzZXRTdGF0ZSBzZWxlY3RlZFRhYkluZGV4OiBpbmRleFxyXG5cclxuICByZW5kZXJUYWI6ICh0YWIsIGluZGV4KSAtPlxyXG4gICAgKFRhYlxyXG4gICAgICBsYWJlbDogdGFiLmxhYmVsXHJcbiAgICAgIGtleTogaW5kZXhcclxuICAgICAgaW5kZXg6IGluZGV4XHJcbiAgICAgIHNlbGVjdGVkOiAoaW5kZXggaXMgQHN0YXRlLnNlbGVjdGVkVGFiSW5kZXgpXHJcbiAgICAgIG9uU2VsZWN0ZWQ6IEBzZWxlY3RlZFRhYlxyXG4gICAgKVxyXG5cclxuICByZW5kZXJUYWJzOiAtPlxyXG4gICAgKGRpdiB7Y2xhc3NOYW1lOiAnd29ya3NwYWNlLXRhYnMnfSxcclxuICAgICAgKHVsIHt9LCBAcmVuZGVyVGFiKHRhYixpbmRleCkgZm9yIHRhYiwgaW5kZXggaW4gQHByb3BzLnRhYnMpXHJcbiAgICApXHJcblxyXG4gIHJlbmRlclNlbGVjdGVkUGFuZWw6IC0+XHJcbiAgICAoZGl2IHtjbGFzc05hbWU6ICd3b3Jrc3BhY2UtdGFiLWNvbXBvbmVudCd9LFxyXG4gICAgICBmb3IgdGFiLCBpbmRleCBpbiBAcHJvcHMudGFic1xyXG4gICAgICAgIChkaXYge1xyXG4gICAgICAgICAga2V5OiBpbmRleFxyXG4gICAgICAgICAgc3R5bGU6XHJcbiAgICAgICAgICAgIGRpc3BsYXk6IGlmIGluZGV4IGlzIEBzdGF0ZS5zZWxlY3RlZFRhYkluZGV4IHRoZW4gJ2Jsb2NrJyBlbHNlICdub25lJ1xyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIHRhYi5jb21wb25lbnRcclxuICAgICAgICApXHJcbiAgICApXHJcblxyXG4gIHJlbmRlcjogLT5cclxuICAgIChkaXYge2tleTogQHByb3BzLmtleSwgY2xhc3NOYW1lOiBcInRhYmJlZC1wYW5lbFwifSxcclxuICAgICAgQHJlbmRlclRhYnMoKVxyXG4gICAgICBAcmVuZGVyU2VsZWN0ZWRQYW5lbCgpXHJcbiAgICApXHJcbiJdfQ==
