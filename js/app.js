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
    return this._ui.init(appOptions.ui);
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
        saving: true
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
      saving: false,
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
      saving: false,
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
          message: 'Saving...',
          type: 'info'
        } : event.state.saved ? {
          message: 'Saved',
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
      className: "menu-bar-file-status menu-bar-file-status-" + this.props.fileStatus.type
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFxhcHAuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxcY2xpZW50LmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHByb3ZpZGVyc1xcZG9jdW1lbnQtc3RvcmUtcHJvdmlkZXIuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxccHJvdmlkZXJzXFxnb29nbGUtZHJpdmUtcHJvdmlkZXIuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxccHJvdmlkZXJzXFxsb2NhbHN0b3JhZ2UtcHJvdmlkZXIuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxccHJvdmlkZXJzXFxwcm92aWRlci1pbnRlcmZhY2UuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxccHJvdmlkZXJzXFxyZWFkb25seS1wcm92aWRlci5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx1aS5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx1dGlsc1xcaXMtc3RyaW5nLmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHV0aWxzXFxsYW5nXFxlbi11cy5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx1dGlsc1xcdHJhbnNsYXRlLmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHZpZXdzXFxhcHAtdmlldy5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx2aWV3c1xcYXV0aG9yaXplLW1peGluLmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHZpZXdzXFxkcm9wZG93bi12aWV3LmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHZpZXdzXFxmaWxlLWRpYWxvZy10YWItdmlldy5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx2aWV3c1xcbWVudS1iYXItdmlldy5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx2aWV3c1xcbW9kYWwtZGlhbG9nLXZpZXcuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxcdmlld3NcXG1vZGFsLXRhYmJlZC1kaWFsb2ctdmlldy5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx2aWV3c1xcbW9kYWwtdmlldy5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx2aWV3c1xccHJvdmlkZXItdGFiYmVkLWRpYWxvZy12aWV3LmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHZpZXdzXFxzZWxlY3QtcHJvdmlkZXItZGlhbG9nLXRhYi12aWV3LmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHZpZXdzXFx0YWJiZWQtcGFuZWwtdmlldy5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQSxJQUFBOztBQUFBLE9BQUEsR0FBVSxLQUFLLENBQUMsYUFBTixDQUFvQixPQUFBLENBQVEsa0JBQVIsQ0FBcEI7O0FBRVYsc0JBQUEsR0FBeUIsQ0FBQyxPQUFBLENBQVEsTUFBUixDQUFELENBQWdCLENBQUM7O0FBQzFDLHNCQUFBLEdBQXlCLENBQUMsT0FBQSxDQUFRLFVBQVIsQ0FBRCxDQUFvQixDQUFDOztBQUV4QztFQUVTLDBCQUFDLE9BQUQ7SUFFWCxJQUFDLENBQUEsV0FBRCxHQUFlLHNCQUFzQixDQUFDO0lBRXRDLElBQUMsQ0FBQSxNQUFELEdBQWMsSUFBQSxzQkFBQSxDQUFBO0lBQ2QsSUFBQyxDQUFBLFVBQUQsR0FBYztFQUxIOzs2QkFPYixJQUFBLEdBQU0sU0FBQyxVQUFELEVBQWMsV0FBZDtJQUFDLElBQUMsQ0FBQSxhQUFEOztNQUFhLGNBQWM7O0lBQ2hDLElBQUMsQ0FBQSxVQUFVLENBQUMsV0FBWixHQUEwQjtXQUMxQixJQUFDLENBQUEsTUFBTSxDQUFDLGFBQVIsQ0FBc0IsSUFBQyxDQUFBLFVBQXZCO0VBRkk7OzZCQUlOLFdBQUEsR0FBYSxTQUFDLFVBQUQsRUFBYyxNQUFkO0lBQUMsSUFBQyxDQUFBLGFBQUQ7SUFDWixJQUFDLENBQUEsSUFBRCxDQUFNLElBQUMsQ0FBQSxVQUFQLEVBQW1CLElBQW5CO1dBQ0EsSUFBQyxDQUFB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QURELEVBRUMsSUFBQyxDQUFBLG1CQUFELENBQUEsQ0FGRDtFQURLLENBckNSO0NBRmUiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiQXBwVmlldyA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi92aWV3cy9hcHAtdmlldydcclxuXHJcbkNsb3VkRmlsZU1hbmFnZXJVSU1lbnUgPSAocmVxdWlyZSAnLi91aScpLkNsb3VkRmlsZU1hbmFnZXJVSU1lbnVcclxuQ2xvdWRGaWxlTWFuYWdlckNsaWVudCA9IChyZXF1aXJlICcuL2NsaWVudCcpLkNsb3VkRmlsZU1hbmFnZXJDbGllbnRcclxuXHJcbmNsYXNzIENsb3VkRmlsZU1hbmFnZXJcclxuXHJcbiAgY29uc3RydWN0b3I6IChvcHRpb25zKSAtPlxyXG4gICAgIyBzaW5jZSB0aGUgbW9kdWxlIGV4cG9ydHMgYW4gaW5zdGFuY2Ugb2YgdGhlIGNsYXNzIHdlIG5lZWQgdG8gZmFrZSBhIGNsYXNzIHZhcmlhYmxlIGFzIGFuIGluc3RhbmNlIHZhcmlhYmxlXHJcbiAgICBARGVmYXVsdE1lbnUgPSBDbG91ZEZpbGVNYW5hZ2VyVUlNZW51LkRlZmF1bHRNZW51XHJcblxyXG4gICAgQGNsaWVudCA9IG5ldyBDbG91ZEZpbGVNYW5hZ2VyQ2xpZW50KClcclxuICAgIEBhcHBPcHRpb25zID0ge31cclxuXHJcbiAgaW5pdDogKEBhcHBPcHRpb25zLCB1c2luZ0lmcmFtZSA9IGZhbHNlKSAtPlxyXG4gICAgQGFwcE9wdGlvbnMudXNpbmdJZnJhbWUgPSB1c2luZ0lmcmFtZVxyXG4gICAgQGNsaWVudC5zZXRBcHBPcHRpb25zIEBhcHBPcHRpb25zXHJcblxyXG4gIGNyZWF0ZUZyYW1lOiAoQGFwcE9wdGlvbnMsIGVsZW1JZCkgLT5cclxuICAgIEBpbml0IEBhcHBPcHRpb25zLCB0cnVlXHJcbiAgICBAX3JlbmRlckFwcCBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChlbGVtSWQpXHJcblxyXG4gIGNsaWVudENvbm5lY3Q6IChldmVudENhbGxiYWNrKSAtPlxyXG4gICAgaWYgbm90IEBhcHBPcHRpb25zLnVzaW5nSWZyYW1lXHJcbiAgICAgIEBfY3JlYXRlSGlkZGVuQXBwKClcclxuICAgIEBjbGllbnQuY29ubmVjdCBldmVudENhbGxiYWNrXHJcblxyXG4gIF9jcmVhdGVIaWRkZW5BcHA6IC0+XHJcbiAgICBhbmNob3IgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpXHJcbiAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGFuY2hvcilcclxuICAgIEBfcmVuZGVyQXBwIGFuY2hvclxyXG5cclxuICBfcmVuZGVyQXBwOiAoYW5jaG9yKSAtPlxyXG4gICAgQGFwcE9wdGlvbnMuY2xpZW50ID0gQGNsaWVudFxyXG4gICAgUmVhY3QucmVuZGVyIChBcHBWaWV3IEBhcHBPcHRpb25zKSwgYW5jaG9yXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBDbG91ZEZpbGVNYW5hZ2VyKClcclxuIiwidHIgPSByZXF1aXJlICcuL3V0aWxzL3RyYW5zbGF0ZSdcclxuaXNTdHJpbmcgPSByZXF1aXJlICcuL3V0aWxzL2lzLXN0cmluZydcclxuXHJcbkNsb3VkRmlsZU1hbmFnZXJVSSA9IChyZXF1aXJlICcuL3VpJykuQ2xvdWRGaWxlTWFuYWdlclVJXHJcblxyXG5Mb2NhbFN0b3JhZ2VQcm92aWRlciA9IHJlcXVpcmUgJy4vcHJvdmlkZXJzL2xvY2Fsc3RvcmFnZS1wcm92aWRlcidcclxuUmVhZE9ubHlQcm92aWRlciA9IHJlcXVpcmUgJy4vcHJvdmlkZXJzL3JlYWRvbmx5LXByb3ZpZGVyJ1xyXG5Hb29nbGVEcml2ZVByb3ZpZGVyID0gcmVxdWlyZSAnLi9wcm92aWRlcnMvZ29vZ2xlLWRyaXZlLXByb3ZpZGVyJ1xyXG5Eb2N1bWVudFN0b3JlUHJvdmlkZXIgPSByZXF1aXJlICcuL3Byb3ZpZGVycy9kb2N1bWVudC1zdG9yZS1wcm92aWRlcidcclxuXHJcbmNsYXNzIENsb3VkRmlsZU1hbmFnZXJDbGllbnRFdmVudFxyXG5cclxuICBjb25zdHJ1Y3RvcjogKEB0eXBlLCBAZGF0YSA9IHt9LCBAY2FsbGJhY2sgPSBudWxsLCBAc3RhdGUgPSB7fSkgLT5cclxuXHJcbmNsYXNzIENsb3VkRmlsZU1hbmFnZXJDbGllbnRcclxuXHJcbiAgY29uc3RydWN0b3I6IChvcHRpb25zKSAtPlxyXG4gICAgQHN0YXRlID1cclxuICAgICAgYXZhaWxhYmxlUHJvdmlkZXJzOiBbXVxyXG4gICAgQF9yZXNldFN0YXRlKClcclxuICAgIEBfdWkgPSBuZXcgQ2xvdWRGaWxlTWFuYWdlclVJIEBcclxuXHJcbiAgc2V0QXBwT3B0aW9uczogKGFwcE9wdGlvbnMgPSB7fSktPlxyXG4gICAgIyBmbHRlciBmb3IgYXZhaWxhYmxlIHByb3ZpZGVyc1xyXG4gICAgYWxsUHJvdmlkZXJzID0ge31cclxuICAgIGZvciBQcm92aWRlciBpbiBbUmVhZE9ubHlQcm92aWRlciwgTG9jYWxTdG9yYWdlUHJvdmlkZXIsIEdvb2dsZURyaXZlUHJvdmlkZXIsIERvY3VtZW50U3RvcmVQcm92aWRlcl1cclxuICAgICAgaWYgUHJvdmlkZXIuQXZhaWxhYmxlKClcclxuICAgICAgICBhbGxQcm92aWRlcnNbUHJvdmlkZXIuTmFtZV0gPSBQcm92aWRlclxyXG5cclxuICAgICMgZGVmYXVsdCB0byBhbGwgcHJvdmlkZXJzIGlmIG5vbiBzcGVjaWZpZWRcclxuICAgIGlmIG5vdCBhcHBPcHRpb25zLnByb3ZpZGVyc1xyXG4gICAgICBhcHBPcHRpb25zLnByb3ZpZGVycyA9IFtdXHJcbiAgICAgIGZvciBvd24gcHJvdmlkZXJOYW1lIG9mIGFsbFByb3ZpZGVyc1xyXG4gICAgICAgIGFwcE9wdGlvbnMucHJvdmlkZXJzLnB1c2ggcHJvdmlkZXJOYW1lXHJcblxyXG4gICAgIyBjaGVjayB0aGUgcHJvdmlkZXJzXHJcbiAgICBhdmFpbGFibGVQcm92aWRlcnMgPSBbXVxyXG4gICAgZm9yIHByb3ZpZGVyIGluIGFwcE9wdGlvbnMucHJvdmlkZXJzXHJcbiAgICAgIFtwcm92aWRlck5hbWUsIHByb3ZpZGVyT3B0aW9uc10gPSBpZiBpc1N0cmluZyBwcm92aWRlciB0aGVuIFtwcm92aWRlciwge31dIGVsc2UgW3Byb3ZpZGVyLm5hbWUsIHByb3ZpZGVyXVxyXG4gICAgICBpZiBub3QgcHJvdmlkZXJOYW1lXHJcbiAgICAgICAgQF9lcnJvciBcIkludmFsaWQgcHJvdmlkZXIgc3BlYyAtIG11c3QgZWl0aGVyIGJlIHN0cmluZyBvciBvYmplY3Qgd2l0aCBuYW1lIHByb3BlcnR5XCJcclxuICAgICAgZWxzZVxyXG4gICAgICAgIGlmIGFsbFByb3ZpZGVyc1twcm92aWRlck5hbWVdXHJcbiAgICAgICAgICBQcm92aWRlciA9IGFsbFByb3ZpZGVyc1twcm92aWRlck5hbWVdXHJcbiAgICAgICAgICBhdmFpbGFibGVQcm92aWRlcnMucHVzaCBuZXcgUHJvdmlkZXIgcHJvdmlkZXJPcHRpb25zXHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgQF9lcnJvciBcIlVua25vd24gcHJvdmlkZXI6ICN7cHJvdmlkZXJOYW1lfVwiXHJcbiAgICBAX3NldFN0YXRlIGF2YWlsYWJsZVByb3ZpZGVyczogYXZhaWxhYmxlUHJvdmlkZXJzXHJcbiAgICBAX3VpLmluaXQgYXBwT3B0aW9ucy51aVxyXG5cclxuICAjIHNpbmdsZSBjbGllbnQgLSB1c2VkIGJ5IHRoZSBjbGllbnQgYXBwIHRvIHJlZ2lzdGVyIGFuZCByZWNlaXZlIGNhbGxiYWNrIGV2ZW50c1xyXG4gIGNvbm5lY3Q6IChAZXZlbnRDYWxsYmFjaykgLT5cclxuICAgIEBfZXZlbnQgJ2Nvbm5lY3RlZCcsIHtjbGllbnQ6IEB9XHJcblxyXG4gICMgc2luZ2xlIGxpc3RlbmVyIC0gdXNlZCBieSB0aGUgUmVhY3QgbWVudSB2aWEgdG8gd2F0Y2ggY2xpZW50IHN0YXRlIGNoYW5nZXNcclxuICBsaXN0ZW46IChAbGlzdGVuZXJDYWxsYmFjaykgLT5cclxuXHJcbiAgYXBwZW5kTWVudUl0ZW06IChpdGVtKSAtPlxyXG4gICAgQF91aS5hcHBlbmRNZW51SXRlbSBpdGVtXHJcblxyXG4gIHNldE1lbnVCYXJJbmZvOiAoaW5mbykgLT5cclxuICAgIEBfdWkuc2V0TWVudUJhckluZm8gaW5mb1xyXG5cclxuICBuZXdGaWxlOiAoY2FsbGJhY2sgPSBudWxsKSAtPlxyXG4gICAgQF9yZXNldFN0YXRlKClcclxuICAgIEBfZXZlbnQgJ25ld2VkRmlsZSdcclxuXHJcbiAgbmV3RmlsZURpYWxvZzogKGNhbGxiYWNrID0gbnVsbCkgLT5cclxuICAgICMgZm9yIG5vdyBqdXN0IGNhbGwgbmV3IC0gbGF0ZXIgd2UgY2FuIGFkZCBjaGFuZ2Ugbm90aWZpY2F0aW9uIGZyb20gdGhlIGNsaWVudCBzbyB3ZSBjYW4gcHJvbXB0IGZvciBcIkFyZSB5b3Ugc3VyZT9cIlxyXG4gICAgQG5ld0ZpbGUoKVxyXG5cclxuICBvcGVuRmlsZTogKG1ldGFkYXRhLCBjYWxsYmFjayA9IG51bGwpIC0+XHJcbiAgICBpZiBtZXRhZGF0YT8ucHJvdmlkZXI/LmNhbiAnbG9hZCdcclxuICAgICAgbWV0YWRhdGEucHJvdmlkZXIubG9hZCBtZXRhZGF0YSwgKGVyciwgY29udGVudCkgPT5cclxuICAgICAgICByZXR1cm4gQF9lcnJvcihlcnIpIGlmIGVyclxyXG4gICAgICAgIEBfZmlsZUNoYW5nZWQgJ29wZW5lZEZpbGUnLCBjb250ZW50LCBtZXRhZGF0YVxyXG4gICAgICAgIGNhbGxiYWNrPyBjb250ZW50LCBtZXRhZGF0YVxyXG4gICAgZWxzZVxyXG4gICAgICBAb3BlbkZpbGVEaWFsb2cgY2FsbGJhY2tcclxuXHJcbiAgb3BlbkZpbGVEaWFsb2c6IChjYWxsYmFjayA9IG51bGwpIC0+XHJcbiAgICBAX3VpLm9wZW5GaWxlRGlhbG9nIChtZXRhZGF0YSkgPT5cclxuICAgICAgQG9wZW5GaWxlIG1ldGFkYXRhLCBjYWxsYmFja1xyXG5cclxuICBzYXZlOiAoY2FsbGJhY2sgPSBudWxsKSAtPlxyXG4gICAgQF9ldmVudCAnZ2V0Q29udGVudCcsIHt9LCAoY29udGVudCkgPT5cclxuICAgICAgQHNhdmVDb250ZW50IGNvbnRlbnQsIGNhbGxiYWNrXHJcblxyXG4gIHNhdmVDb250ZW50OiAoY29udGVudCwgY2FsbGJhY2sgPSBudWxsKSAtPlxyXG4gICAgaWYgQHN0YXRlLm1ldGFkYXRhXHJcbiAgICAgIEBzYXZlRmlsZSBjb250ZW50LCBAc3RhdGUubWV0YWRhdGEsIGNhbGxiYWNrXHJcbiAgICBlbHNlXHJcbiAgICAgIEBzYXZlRmlsZURpYWxvZyBjb250ZW50LCBjYWxsYmFja1xyXG5cclxuICBzYXZlRmlsZTogKGNvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFjayA9IG51bGwpIC0+XHJcbiAgICBpZiBtZXRhZGF0YT8ucHJvdmlkZXI/LmNhbiAnc2F2ZSdcclxuICAgICAgQF9zZXRTdGF0ZSBzYXZpbmc6IHRydWVcclxuICAgICAgbWV0YWRhdGEucHJvdmlkZXIuc2F2ZSBjb250ZW50LCBtZXRhZGF0YSwgKGVycikgPT5cclxuICAgICAgICByZXR1cm4gQF9lcnJvcihlcnIpIGlmIGVyclxyXG4gICAgICAgIEBfZmlsZUNoYW5nZWQgJ3NhdmVkRmlsZScsIGNvbnRlbnQsIG1ldGFkYXRhXHJcbiAgICAgICAgY2FsbGJhY2s/IGNvbnRlbnQsIG1ldGFkYXRhXHJcbiAgICBlbHNlXHJcbiAgICAgIEBzYXZlRmlsZURpYWxvZyBjb250ZW50LCBjYWxsYmFja1xyXG5cclxuICBzYXZlRmlsZURpYWxvZzogKGNvbnRlbnQgPSBudWxsLCBjYWxsYmFjayA9IG51bGwpIC0+XHJcbiAgICBAX3VpLnNhdmVGaWxlRGlhbG9nIChtZXRhZGF0YSkgPT5cclxuICAgICAgQF9kaWFsb2dTYXZlIGNvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFja1xyXG5cclxuICBzYXZlRmlsZUFzRGlhbG9nOiAoY29udGVudCA9IG51bGwsIGNhbGxiYWNrID0gbnVsbCkgLT5cclxuICAgIEBfdWkuc2F2ZUZpbGVBc0RpYWxvZyAobWV0YWRhdGEpID0+XHJcbiAgICAgIEBfZGlhbG9nU2F2ZSBjb250ZW50LCBtZXRhZGF0YSwgY2FsbGJhY2tcclxuXHJcbiAgZGlydHk6IC0+XHJcbiAgICBAX3NldFN0YXRlXHJcbiAgICAgIGRpcnR5OiB0cnVlXHJcbiAgICAgIHNhdmVkOiBmYWxzZVxyXG5cclxuICBfZGlhbG9nU2F2ZTogKGNvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIGlmIGNvbnRlbnQgaXNudCBudWxsXHJcbiAgICAgIEBzYXZlRmlsZSBjb250ZW50LCBtZXRhZGF0YSwgY2FsbGJhY2tcclxuICAgIGVsc2VcclxuICAgICAgQF9ldmVudCAnZ2V0Q29udGVudCcsIHt9LCAoY29udGVudCkgPT5cclxuICAgICAgICBAc2F2ZUZpbGUgY29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrXHJcblxyXG4gIF9lcnJvcjogKG1lc3NhZ2UpIC0+XHJcbiAgICAjIGZvciBub3cgYW4gYWxlcnRcclxuICAgIGFsZXJ0IG1lc3NhZ2VcclxuXHJcbiAgX2ZpbGVDaGFuZ2VkOiAodHlwZSwgY29udGVudCwgbWV0YWRhdGEpIC0+XHJcbiAgICBAX3NldFN0YXRlXHJcbiAgICAgIGNvbnRlbnQ6IGNvbnRlbnRcclxuICAgICAgbWV0YWRhdGE6IG1ldGFkYXRhXHJcbiAgICAgIHNhdmluZzogZmFsc2VcclxuICAgICAgc2F2ZWQ6IHR5cGUgaXMgJ3NhdmVkRmlsZSdcclxuICAgICAgZGlydHk6IGZhbHNlXHJcbiAgICBAX2V2ZW50IHR5cGUsIHtjb250ZW50OiBjb250ZW50LCBtZXRhZGF0YTogbWV0YWRhdGF9XHJcblxyXG4gIF9ldmVudDogKHR5cGUsIGRhdGEgPSB7fSwgZXZlbnRDYWxsYmFjayA9IG51bGwpIC0+XHJcbiAgICBldmVudCA9IG5ldyBDbG91ZEZpbGVNYW5hZ2VyQ2xpZW50RXZlbnQgdHlwZSwgZGF0YSwgZXZlbnRDYWxsYmFjaywgQHN0YXRlXHJcbiAgICBAZXZlbnRDYWxsYmFjaz8gZXZlbnRcclxuICAgIEBsaXN0ZW5lckNhbGxiYWNrPyBldmVudFxyXG5cclxuICBfc2V0U3RhdGU6IChvcHRpb25zKSAtPlxyXG4gICAgZm9yIG93biBrZXksIHZhbHVlIG9mIG9wdGlvbnNcclxuICAgICAgQHN0YXRlW2tleV0gPSB2YWx1ZVxyXG4gICAgQF9ldmVudCAnc3RhdGVDaGFuZ2VkJ1xyXG5cclxuICBfcmVzZXRTdGF0ZTogLT5cclxuICAgIEBfc2V0U3RhdGVcclxuICAgICAgY29udGVudDogbnVsbFxyXG4gICAgICBtZXRhZGF0YTogbnVsbFxyXG4gICAgICBkaXJ0eTogZmFsc2VcclxuICAgICAgc2F2aW5nOiBmYWxzZVxyXG4gICAgICBzYXZlZDogZmFsc2VcclxuXHJcbm1vZHVsZS5leHBvcnRzID1cclxuICBDbG91ZEZpbGVNYW5hZ2VyQ2xpZW50RXZlbnQ6IENsb3VkRmlsZU1hbmFnZXJDbGllbnRFdmVudFxyXG4gIENsb3VkRmlsZU1hbmFnZXJDbGllbnQ6IENsb3VkRmlsZU1hbmFnZXJDbGllbnRcclxuIiwie2RpdiwgYnV0dG9ufSA9IFJlYWN0LkRPTVxyXG5cclxuYXV0aG9yaXplVXJsICA9IFwiaHR0cDovL2RvY3VtZW50LXN0b3JlLmhlcm9rdWFwcC5jb20vdXNlci9hdXRoZW50aWNhdGVcIlxyXG5jaGVja0xvZ2luVXJsID0gXCJodHRwOi8vZG9jdW1lbnQtc3RvcmUuaGVyb2t1YXBwLmNvbS91c2VyL2luZm9cIlxyXG5saXN0VXJsID0gXCJodHRwOi8vZG9jdW1lbnQtc3RvcmUuaGVyb2t1YXBwLmNvbS9kb2N1bWVudC9hbGxcIlxyXG5cclxudHIgPSByZXF1aXJlICcuLi91dGlscy90cmFuc2xhdGUnXHJcbmlzU3RyaW5nID0gcmVxdWlyZSAnLi4vdXRpbHMvaXMtc3RyaW5nJ1xyXG5cclxuUHJvdmlkZXJJbnRlcmZhY2UgPSAocmVxdWlyZSAnLi9wcm92aWRlci1pbnRlcmZhY2UnKS5Qcm92aWRlckludGVyZmFjZVxyXG5DbG91ZE1ldGFkYXRhID0gKHJlcXVpcmUgJy4vcHJvdmlkZXItaW50ZXJmYWNlJykuQ2xvdWRNZXRhZGF0YVxyXG5cclxuRG9jdW1lbnRTdG9yZUF1dGhvcml6YXRpb25EaWFsb2cgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IFJlYWN0LmNyZWF0ZUNsYXNzXHJcbiAgZGlzcGxheU5hbWU6ICdEb2N1bWVudFN0b3JlQXV0aG9yaXphdGlvbkRpYWxvZydcclxuXHJcbiAgYXV0aGVudGljYXRlOiAtPlxyXG4gICAgQHByb3BzLnByb3ZpZGVyLmF1dGhvcml6ZSgpXHJcblxyXG4gIHJlbmRlcjogLT5cclxuICAgIChkaXYge30sXHJcbiAgICAgIChidXR0b24ge29uQ2xpY2s6IEBhdXRoZW50aWNhdGV9LCAnQXV0aG9yaXphdGlvbiBOZWVkZWQnKVxyXG4gICAgKVxyXG5cclxuY2xhc3MgRG9jdW1lbnRTdG9yZVByb3ZpZGVyIGV4dGVuZHMgUHJvdmlkZXJJbnRlcmZhY2VcclxuXHJcbiAgY29uc3RydWN0b3I6IChAb3B0aW9ucyA9IHt9KSAtPlxyXG4gICAgc3VwZXJcclxuICAgICAgbmFtZTogRG9jdW1lbnRTdG9yZVByb3ZpZGVyLk5hbWVcclxuICAgICAgZGlzcGxheU5hbWU6IEBvcHRpb25zLmRpc3BsYXlOYW1lIG9yICh0ciAnflBST1ZJREVSLkRPQ1VNRU5UX1NUT1JFJylcclxuICAgICAgY2FwYWJpbGl0aWVzOlxyXG4gICAgICAgIHNhdmU6IHRydWVcclxuICAgICAgICBsb2FkOiB0cnVlXHJcbiAgICAgICAgbGlzdDogdHJ1ZVxyXG5cclxuICBATmFtZTogJ2RvY3VtZW50U3RvcmUnXHJcblxyXG4gIGF1dGhvcml6ZWQ6IChAYXV0aENhbGxiYWNrKSAtPlxyXG5cclxuICBhdXRob3JpemU6IC0+XHJcbiAgICBAX3Nob3dMb2dpbldpbmRvdygpXHJcbiAgICBAX2NoZWNrTG9naW4oKVxyXG5cclxuICBfbG9naW5TdWNjZXNzZnVsOiAoZGF0YSkgLT5cclxuICAgIGlmIEBfbG9naW5XaW5kb3cgdGhlbiBAX2xvZ2luV2luZG93LmNsb3NlKClcclxuICAgIEBhdXRoQ2FsbGJhY2sgdHJ1ZVxyXG5cclxuICBfY2hlY2tMb2dpbjogLT5cclxuICAgIHByb3ZpZGVyID0gQFxyXG4gICAgJC5hamF4XHJcbiAgICAgIGRhdGFUeXBlOiAnanNvbidcclxuICAgICAgdXJsOiBjaGVja0xvZ2luVXJsXHJcbiAgICAgIHhockZpZWxkczpcclxuICAgICAgICB3aXRoQ3JlZGVudGlhbHM6IHRydWVcclxuICAgICAgc3VjY2VzczogKGRhdGEpIC0+XHJcbiAgICAgICAgcHJvdmlkZXIuX2xvZ2luU3VjY2Vzc2Z1bChkYXRhKVxyXG4gICAgICBlcnJvcjogLT5cclxuICAgICAgICAjIG5vdGhpbmcgeWV0XHJcblxyXG4gIF9sb2dpbldpbmRvdzogbnVsbFxyXG5cclxuICBfc2hvd0xvZ2luV2luZG93OiAtPlxyXG4gICAgaWYgQF9sb2dpbldpbmRvdyBhbmQgbm90IEBfbG9naW5XaW5kb3cuY2xvc2VkXHJcbiAgICAgIEBfbG9naW5XaW5kb3cuZm9jdXMoKVxyXG4gICAgZWxzZVxyXG5cclxuICAgICAgY29tcHV0ZVNjcmVlbkxvY2F0aW9uID0gKHcsIGgpIC0+XHJcbiAgICAgICAgc2NyZWVuTGVmdCA9IHdpbmRvdy5zY3JlZW5MZWZ0IG9yIHNjcmVlbi5sZWZ0XHJcbiAgICAgICAgc2NyZWVuVG9wICA9IHdpbmRvdy5zY3JlZW5Ub3AgIG9yIHNjcmVlbi50b3BcclxuICAgICAgICB3aWR0aCAgPSB3aW5kb3cuaW5uZXJXaWR0aCAgb3IgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudFdpZHRoICBvciBzY3JlZW4ud2lkdGhcclxuICAgICAgICBoZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQgb3IgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudEhlaWdodCBvciBzY3JlZW4uaGVpZ2h0XHJcblxyXG4gICAgICAgIGxlZnQgPSAoKHdpZHRoIC8gMikgLSAodyAvIDIpKSArIHNjcmVlbkxlZnRcclxuICAgICAgICB0b3AgPSAoKGhlaWdodCAvIDIpIC0gKGggLyAyKSkgKyBzY3JlZW5Ub3BcclxuICAgICAgICByZXR1cm4ge2xlZnQsIHRvcH1cclxuXHJcbiAgICAgIHdpZHRoID0gMTAwMFxyXG4gICAgICBoZWlnaHQgPSA0ODBcclxuICAgICAgcG9zaXRpb24gPSBjb21wdXRlU2NyZWVuTG9jYXRpb24gd2lkdGgsIGhlaWdodFxyXG4gICAgICB3aW5kb3dGZWF0dXJlcyA9IFtcclxuICAgICAgICAnd2lkdGg9JyArIHdpZHRoXHJcbiAgICAgICAgJ2hlaWdodD0nICsgaGVpZ2h0XHJcbiAgICAgICAgJ3RvcD0nICsgcG9zaXRpb24udG9wIG9yIDIwMFxyXG4gICAgICAgICdsZWZ0PScgKyBwb3NpdGlvbi5sZWZ0IG9yIDIwMFxyXG4gICAgICAgICdkZXBlbmRlbnQ9eWVzJ1xyXG4gICAgICAgICdyZXNpemFibGU9bm8nXHJcbiAgICAgICAgJ2xvY2F0aW9uPW5vJ1xyXG4gICAgICAgICdkaWFsb2c9eWVzJ1xyXG4gICAgICAgICdtZW51YmFyPW5vJ1xyXG4gICAgICBdXHJcblxyXG4gICAgICBAX2xvZ2luV2luZG93ID0gd2luZG93Lm9wZW4oYXV0aG9yaXplVXJsLCAnYXV0aCcsIHdpbmRvd0ZlYXR1cmVzLmpvaW4oKSlcclxuXHJcbiAgICAgIHBvbGxBY3Rpb24gPSA9PlxyXG4gICAgICAgIHRyeVxyXG4gICAgICAgICAgaHJlZiA9IEBfbG9naW5XaW5kb3cubG9jYXRpb24uaHJlZlxyXG4gICAgICAgICAgaWYgKGhyZWYgaXMgd2luZG93LmxvY2F0aW9uLmhyZWYpXHJcbiAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwgcG9sbFxyXG4gICAgICAgICAgICBAX2xvZ2luV2luZG93LmNsb3NlKClcclxuICAgICAgICAgICAgQF9jaGVja0xvZ2luKClcclxuICAgICAgICBjYXRjaCBlXHJcbiAgICAgICAgICBjb25zb2xlLmxvZyBlXHJcblxyXG4gICAgICBwb2xsID0gc2V0SW50ZXJ2YWwgcG9sbEFjdGlvbiwgMjAwXHJcblxyXG4gIHJlbmRlckF1dGhvcml6YXRpb25EaWFsb2c6IC0+XHJcbiAgICAoRG9jdW1lbnRTdG9yZUF1dGhvcml6YXRpb25EaWFsb2cge3Byb3ZpZGVyOiBALCBhdXRoQ2FsbGJhY2s6IEBhdXRoQ2FsbGJhY2t9KVxyXG5cclxuICBsaXN0OiAobWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgcHJvdmlkZXIgPSBAXHJcbiAgICAkLmFqYXhcclxuICAgICAgZGF0YVR5cGU6ICdqc29uJ1xyXG4gICAgICB1cmw6IGxpc3RVcmxcclxuICAgICAgeGhyRmllbGRzOlxyXG4gICAgICAgIHdpdGhDcmVkZW50aWFsczogdHJ1ZVxyXG4gICAgICBzdWNjZXNzOiAoZGF0YSkgLT5cclxuICAgICAgICBsaXN0ID0gW11cclxuICAgICAgICBwYXRoID0gbWV0YWRhdGE/LnBhdGggb3IgJydcclxuICAgICAgICBmb3Igb3duIGtleSBvZiB3aW5kb3cubG9jYWxTdG9yYWdlXHJcbiAgICAgICAgICBsaXN0LnB1c2ggbmV3IENsb3VkTWV0YWRhdGFcclxuICAgICAgICAgICAgbmFtZToga2V5XHJcbiAgICAgICAgICAgIHBhdGg6IFwiI3twYXRofS8je25hbWV9XCJcclxuICAgICAgICAgICAgdHlwZTogQ2xvdWRNZXRhZGF0YS5GaWxlXHJcbiAgICAgICAgICAgIHByb3ZpZGVyOiBwcm92aWRlclxyXG4gICAgICAgIGNhbGxiYWNrIG51bGwsIGxpc3RcclxuICAgICAgZXJyb3I6IC0+XHJcbiAgICAgICAgY2FsbGJhY2sgbnVsbCwgW11cclxuXHJcbiAgbG9hZDogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IERvY3VtZW50U3RvcmVQcm92aWRlclxyXG4iLCJ7ZGl2fSA9IFJlYWN0LkRPTVxyXG5cclxudHIgPSByZXF1aXJlICcuLi91dGlscy90cmFuc2xhdGUnXHJcbmlzU3RyaW5nID0gcmVxdWlyZSAnLi4vdXRpbHMvaXMtc3RyaW5nJ1xyXG5cclxuUHJvdmlkZXJJbnRlcmZhY2UgPSAocmVxdWlyZSAnLi9wcm92aWRlci1pbnRlcmZhY2UnKS5Qcm92aWRlckludGVyZmFjZVxyXG5DbG91ZE1ldGFkYXRhID0gKHJlcXVpcmUgJy4vcHJvdmlkZXItaW50ZXJmYWNlJykuQ2xvdWRNZXRhZGF0YVxyXG5cclxue2J1dHRvbn0gPSBSZWFjdC5ET01cclxuXHJcbkdvb2dsZURyaXZlQXV0aG9yaXphdGlvbkRpYWxvZyA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgUmVhY3QuY3JlYXRlQ2xhc3NcclxuICBkaXNwbGF5TmFtZTogJ0dvb2dsZURyaXZlQXV0aG9yaXphdGlvbkRpYWxvZydcclxuXHJcbiAgZ2V0SW5pdGlhbFN0YXRlOiAtPlxyXG4gICAgbG9hZGVkR0FQSTogZmFsc2VcclxuXHJcbiAgY29tcG9uZW50V2lsbE1vdW50OiAtPlxyXG4gICAgQHByb3BzLnByb3ZpZGVyLl9sb2FkZWRHQVBJID0+XHJcbiAgICAgIEBzZXRTdGF0ZSBsb2FkZWRHQVBJOiB0cnVlXHJcblxyXG4gIGF1dGhlbnRpY2F0ZTogLT5cclxuICAgIEBwcm9wcy5wcm92aWRlci5hdXRob3JpemUgR29vZ2xlRHJpdmVQcm92aWRlci5TSE9XX1BPUFVQXHJcblxyXG4gIHJlbmRlcjogLT5cclxuICAgIChkaXYge30sXHJcbiAgICAgIGlmIEBzdGF0ZS5sb2FkZWRHQVBJXHJcbiAgICAgICAgKGJ1dHRvbiB7b25DbGljazogQGF1dGhlbnRpY2F0ZX0sICdBdXRob3JpemF0aW9uIE5lZWRlZCcpXHJcbiAgICAgIGVsc2VcclxuICAgICAgICAnV2FpdGluZyBmb3IgdGhlIEdvb2dsZSBDbGllbnQgQVBJIHRvIGxvYWQuLi4nXHJcbiAgICApXHJcblxyXG5jbGFzcyBHb29nbGVEcml2ZVByb3ZpZGVyIGV4dGVuZHMgUHJvdmlkZXJJbnRlcmZhY2VcclxuXHJcbiAgY29uc3RydWN0b3I6IChAb3B0aW9ucyA9IHt9KSAtPlxyXG4gICAgc3VwZXJcclxuICAgICAgbmFtZTogR29vZ2xlRHJpdmVQcm92aWRlci5OYW1lXHJcbiAgICAgIGRpc3BsYXlOYW1lOiBAb3B0aW9ucy5kaXNwbGF5TmFtZSBvciAodHIgJ35QUk9WSURFUi5HT09HTEVfRFJJVkUnKVxyXG4gICAgICBjYXBhYmlsaXRpZXM6XHJcbiAgICAgICAgc2F2ZTogdHJ1ZVxyXG4gICAgICAgIGxvYWQ6IHRydWVcclxuICAgICAgICBsaXN0OiB0cnVlXHJcbiAgICAgICAgcmVtb3ZlOiB0cnVlXHJcbiAgICBAYXV0aFRva2VuID0gbnVsbFxyXG4gICAgQGNsaWVudElkID0gQG9wdGlvbnMuY2xpZW50SWRcclxuICAgIGlmIG5vdCBAY2xpZW50SWRcclxuICAgICAgdGhyb3cgbmV3IEVycm9yICdNaXNzaW5nIHJlcXVpcmVkIGNsaWVudElkIGluIGdvb2dsRHJpdmUgcHJvdmlkZXIgb3B0aW9ucydcclxuICAgIEBtaW1lVHlwZSA9IEBvcHRpb25zLm1pbWVUeXBlIG9yIFwidGV4dC9wbGFpblwiXHJcbiAgICBAX2xvYWRHQVBJKClcclxuXHJcbiAgQE5hbWU6ICdnb29nbGVEcml2ZSdcclxuXHJcbiAgIyBhbGlhc2VzIGZvciBib29sZWFuIHBhcmFtZXRlciB0byBhdXRob3JpemVcclxuICBASU1NRURJQVRFID0gdHJ1ZVxyXG4gIEBTSE9XX1BPUFVQID0gZmFsc2VcclxuXHJcbiAgYXV0aG9yaXplZDogKEBhdXRoQ2FsbGJhY2spIC0+XHJcbiAgICBpZiBAYXV0aFRva2VuXHJcbiAgICAgIEBhdXRoQ2FsbGJhY2sgdHJ1ZVxyXG4gICAgZWxzZVxyXG4gICAgICBAYXV0aG9yaXplIEdvb2dsZURyaXZlUHJvdmlkZXIuSU1NRURJQVRFXHJcblxyXG4gIGF1dGhvcml6ZTogKGltbWVkaWF0ZSkgLT5cclxuICAgIEBfbG9hZGVkR0FQSSA9PlxyXG4gICAgICBhcmdzID1cclxuICAgICAgICBjbGllbnRfaWQ6IEBjbGllbnRJZFxyXG4gICAgICAgIHNjb3BlOiAnaHR0cHM6Ly93d3cuZ29vZ2xlYXBpcy5jb20vYXV0aC9kcml2ZSdcclxuICAgICAgICBpbW1lZGlhdGU6IGltbWVkaWF0ZVxyXG4gICAgICBnYXBpLmF1dGguYXV0aG9yaXplIGFyZ3MsIChhdXRoVG9rZW4pID0+XHJcbiAgICAgICAgQGF1dGhUb2tlbiA9IGlmIGF1dGhUb2tlbiBhbmQgbm90IGF1dGhUb2tlbi5lcnJvciB0aGVuIGF1dGhUb2tlbiBlbHNlIG51bGxcclxuICAgICAgICBAYXV0aENhbGxiYWNrIEBhdXRoVG9rZW4gaXNudCBudWxsXHJcblxyXG4gIHJlbmRlckF1dGhvcml6YXRpb25EaWFsb2c6IC0+XHJcbiAgICAoR29vZ2xlRHJpdmVBdXRob3JpemF0aW9uRGlhbG9nIHtwcm92aWRlcjogQH0pXHJcblxyXG4gIHNhdmU6ICAoY29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgQF9sb2FkZWRHQVBJID0+XHJcbiAgICAgIEBfc2VuZEZpbGUgY29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrXHJcblxyXG4gIGxvYWQ6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICBAX2xvYWRlZEdBUEkgPT5cclxuICAgICAgcmVxdWVzdCA9IGdhcGkuY2xpZW50LmRyaXZlLmZpbGVzLmdldFxyXG4gICAgICAgIGZpbGVJZDogbWV0YWRhdGEucHJvdmlkZXJEYXRhLmlkXHJcbiAgICAgIHJlcXVlc3QuZXhlY3V0ZSAoZmlsZSkgPT5cclxuICAgICAgICBpZiBmaWxlPy5kb3dubG9hZFVybFxyXG4gICAgICAgICAgQF9kb3dubG9hZEZyb21VcmwgZmlsZS5kb3dubG9hZFVybCwgQGF1dGhUb2tlbiwgY2FsbGJhY2tcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICBjYWxsYmFjayAnVW5hYmxlIHRvIGdldCBkb3dubG9hZCB1cmwnXHJcblxyXG4gIGxpc3Q6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICBAX2xvYWRlZEdBUEkgPT5cclxuICAgICAgcmVxdWVzdCA9IGdhcGkuY2xpZW50LmRyaXZlLmZpbGVzLmxpc3RcclxuICAgICAgICBxOiBcIm1pbWVUeXBlID0gJyN7QG1pbWVUeXBlfSdcIlxyXG4gICAgICByZXF1ZXN0LmV4ZWN1dGUgKHJlc3VsdCkgPT5cclxuICAgICAgICByZXR1cm4gY2FsbGJhY2soJ1VuYWJsZSB0byBsaXN0IGZpbGVzJykgaWYgbm90IHJlc3VsdFxyXG4gICAgICAgIGxpc3QgPSBbXVxyXG4gICAgICAgIGZvciBpdGVtIGluIHJlc3VsdD8uaXRlbXNcclxuICAgICAgICAgICMgVE9ETzogZm9yIG5vdyBkb24ndCBhbGxvdyBmb2xkZXJzXHJcbiAgICAgICAgICBpZiBpdGVtLm1pbWVUeXBlIGlzbnQgJ2FwcGxpY2F0aW9uL3ZuZC5nb29nbGUtYXBwcy5mb2xkZXInXHJcbiAgICAgICAgICAgIGxpc3QucHVzaCBuZXcgQ2xvdWRNZXRhZGF0YVxyXG4gICAgICAgICAgICAgIG5hbWU6IGl0ZW0udGl0bGVcclxuICAgICAgICAgICAgICBwYXRoOiBcIlwiXHJcbiAgICAgICAgICAgICAgdHlwZTogaWYgaXRlbS5taW1lVHlwZSBpcyAnYXBwbGljYXRpb24vdm5kLmdvb2dsZS1hcHBzLmZvbGRlcicgdGhlbiBDbG91ZE1ldGFkYXRhLkZvbGRlciBlbHNlIENsb3VkTWV0YWRhdGEuRmlsZVxyXG4gICAgICAgICAgICAgIHByb3ZpZGVyOiBAXHJcbiAgICAgICAgICAgICAgcHJvdmlkZXJEYXRhOlxyXG4gICAgICAgICAgICAgICAgaWQ6IGl0ZW0uaWRcclxuICAgICAgICBsaXN0LnNvcnQgKGEsIGIpIC0+XHJcbiAgICAgICAgICBsb3dlckEgPSBhLm5hbWUudG9Mb3dlckNhc2UoKVxyXG4gICAgICAgICAgbG93ZXJCID0gYi5uYW1lLnRvTG93ZXJDYXNlKClcclxuICAgICAgICAgIHJldHVybiAtMSBpZiBsb3dlckEgPCBsb3dlckJcclxuICAgICAgICAgIHJldHVybiAxIGlmIGxvd2VyQSA+IGxvd2VyQlxyXG4gICAgICAgICAgcmV0dXJuIDBcclxuICAgICAgICBjYWxsYmFjayBudWxsLCBsaXN0XHJcblxyXG4gIHJlbW92ZTogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIEBfbG9hZGVkR0FQSSAtPlxyXG4gICAgICByZXF1ZXN0ID0gZ2FwaS5jbGllbnQuZHJpdmUuZmlsZXMuZGVsZXRlXHJcbiAgICAgICAgZmlsZUlkOiBtZXRhZGF0YS5wcm92aWRlckRhdGEuaWRcclxuICAgICAgcmVxdWVzdC5leGVjdXRlIChyZXN1bHQpIC0+XHJcbiAgICAgICAgY2FsbGJhY2s/IHJlc3VsdD8uZXJyb3Igb3IgbnVsbFxyXG5cclxuICBfbG9hZEdBUEk6IC0+XHJcbiAgICBpZiBub3Qgd2luZG93Ll9Mb2FkaW5nR0FQSVxyXG4gICAgICB3aW5kb3cuX0xvYWRpbmdHQVBJID0gdHJ1ZVxyXG4gICAgICB3aW5kb3cuX0dBUElPbkxvYWQgPSAtPlxyXG4gICAgICAgIEB3aW5kb3cuX0xvYWRlZEdBUEkgPSB0cnVlXHJcbiAgICAgIHNjcmlwdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQgJ3NjcmlwdCdcclxuICAgICAgc2NyaXB0LnNyYyA9ICdodHRwczovL2FwaXMuZ29vZ2xlLmNvbS9qcy9jbGllbnQuanM/b25sb2FkPV9HQVBJT25Mb2FkJ1xyXG4gICAgICBkb2N1bWVudC5oZWFkLmFwcGVuZENoaWxkIHNjcmlwdFxyXG5cclxuICBfbG9hZGVkR0FQSTogKGNhbGxiYWNrKSAtPlxyXG4gICAgc2VsZiA9IEBcclxuICAgIGNoZWNrID0gLT5cclxuICAgICAgaWYgd2luZG93Ll9Mb2FkZWRHQVBJXHJcbiAgICAgICAgZ2FwaS5jbGllbnQubG9hZCAnZHJpdmUnLCAndjInLCAtPlxyXG4gICAgICAgICAgY2FsbGJhY2suY2FsbCBzZWxmXHJcbiAgICAgIGVsc2VcclxuICAgICAgICBzZXRUaW1lb3V0IGNoZWNrLCAxMFxyXG4gICAgc2V0VGltZW91dCBjaGVjaywgMTBcclxuXHJcbiAgX2Rvd25sb2FkRnJvbVVybDogKHVybCwgdG9rZW4sIGNhbGxiYWNrKSAtPlxyXG4gICAgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KClcclxuICAgIHhoci5vcGVuICdHRVQnLCB1cmxcclxuICAgIGlmIHRva2VuXHJcbiAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyICdBdXRob3JpemF0aW9uJywgXCJCZWFyZXIgI3t0b2tlbi5hY2Nlc3NfdG9rZW59XCJcclxuICAgIHhoci5vbmxvYWQgPSAtPlxyXG4gICAgICBjYWxsYmFjayBudWxsLCB4aHIucmVzcG9uc2VUZXh0XHJcbiAgICB4aHIub25lcnJvciA9IC0+XHJcbiAgICAgIGNhbGxiYWNrIFwiVW5hYmxlIHRvIGRvd25sb2FkICN7dXJsfVwiXHJcbiAgICB4aHIuc2VuZCgpXHJcblxyXG4gIF9zZW5kRmlsZTogKGNvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIGJvdW5kYXJ5ID0gJy0tLS0tLS0zMTQxNTkyNjUzNTg5NzkzMjM4NDYnXHJcbiAgICBoZWFkZXIgPSBKU09OLnN0cmluZ2lmeVxyXG4gICAgICB0aXRsZTogbWV0YWRhdGEubmFtZVxyXG4gICAgICBtaW1lVHlwZTogQG1pbWVUeXBlXHJcblxyXG4gICAgW21ldGhvZCwgcGF0aF0gPSBpZiBtZXRhZGF0YS5wcm92aWRlckRhdGE/LmlkXHJcbiAgICAgIFsnUFVUJywgXCIvdXBsb2FkL2RyaXZlL3YyL2ZpbGVzLyN7bWV0YWRhdGEucHJvdmlkZXJEYXRhLmlkfVwiXVxyXG4gICAgZWxzZVxyXG4gICAgICBbJ1BPU1QnLCAnL3VwbG9hZC9kcml2ZS92Mi9maWxlcyddXHJcblxyXG4gICAgYm9keSA9IFtcclxuICAgICAgXCJcXHJcXG4tLSN7Ym91bmRhcnl9XFxyXFxuQ29udGVudC1UeXBlOiBhcHBsaWNhdGlvbi9qc29uXFxyXFxuXFxyXFxuI3toZWFkZXJ9XCIsXHJcbiAgICAgIFwiXFxyXFxuLS0je2JvdW5kYXJ5fVxcclxcbkNvbnRlbnQtVHlwZTogI3tAbWltZVR5cGV9XFxyXFxuXFxyXFxuI3tjb250ZW50fVwiLFxyXG4gICAgICBcIlxcclxcbi0tI3tib3VuZGFyeX0tLVwiXHJcbiAgICBdLmpvaW4gJydcclxuXHJcbiAgICByZXF1ZXN0ID0gZ2FwaS5jbGllbnQucmVxdWVzdFxyXG4gICAgICBwYXRoOiBwYXRoXHJcbiAgICAgIG1ldGhvZDogbWV0aG9kXHJcbiAgICAgIHBhcmFtczoge3VwbG9hZFR5cGU6ICdtdWx0aXBhcnQnfVxyXG4gICAgICBoZWFkZXJzOiB7J0NvbnRlbnQtVHlwZSc6ICdtdWx0aXBhcnQvcmVsYXRlZDsgYm91bmRhcnk9XCInICsgYm91bmRhcnkgKyAnXCInfVxyXG4gICAgICBib2R5OiBib2R5XHJcblxyXG4gICAgcmVxdWVzdC5leGVjdXRlIChmaWxlKSAtPlxyXG4gICAgICBpZiBjYWxsYmFja1xyXG4gICAgICAgIGlmIGZpbGU/LmVycm9yXHJcbiAgICAgICAgICBjYWxsYmFjayBcIlVuYWJsZWQgdG8gdXBsb2FkIGZpbGU6ICN7ZmlsZS5lcnJvci5tZXNzYWdlfVwiXHJcbiAgICAgICAgZWxzZSBpZiBmaWxlXHJcbiAgICAgICAgICBjYWxsYmFjayBudWxsLCBmaWxlXHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgY2FsbGJhY2sgJ1VuYWJsZWQgdG8gdXBsb2FkIGZpbGUnXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEdvb2dsZURyaXZlUHJvdmlkZXJcclxuIiwidHIgPSByZXF1aXJlICcuLi91dGlscy90cmFuc2xhdGUnXHJcblxyXG5Qcm92aWRlckludGVyZmFjZSA9IChyZXF1aXJlICcuL3Byb3ZpZGVyLWludGVyZmFjZScpLlByb3ZpZGVySW50ZXJmYWNlXHJcbkNsb3VkTWV0YWRhdGEgPSAocmVxdWlyZSAnLi9wcm92aWRlci1pbnRlcmZhY2UnKS5DbG91ZE1ldGFkYXRhXHJcblxyXG5jbGFzcyBMb2NhbFN0b3JhZ2VQcm92aWRlciBleHRlbmRzIFByb3ZpZGVySW50ZXJmYWNlXHJcblxyXG4gIGNvbnN0cnVjdG9yOiAoQG9wdGlvbnMgPSB7fSkgLT5cclxuICAgIHN1cGVyXHJcbiAgICAgIG5hbWU6IExvY2FsU3RvcmFnZVByb3ZpZGVyLk5hbWVcclxuICAgICAgZGlzcGxheU5hbWU6IEBvcHRpb25zLmRpc3BsYXlOYW1lIG9yICh0ciAnflBST1ZJREVSLkxPQ0FMX1NUT1JBR0UnKVxyXG4gICAgICBjYXBhYmlsaXRpZXM6XHJcbiAgICAgICAgc2F2ZTogdHJ1ZVxyXG4gICAgICAgIGxvYWQ6IHRydWVcclxuICAgICAgICBsaXN0OiB0cnVlXHJcbiAgICAgICAgcmVtb3ZlOiB0cnVlXHJcblxyXG4gIEBOYW1lOiAnbG9jYWxTdG9yYWdlJ1xyXG4gIEBBdmFpbGFibGU6IC0+XHJcbiAgICByZXN1bHQgPSB0cnlcclxuICAgICAgdGVzdCA9ICdMb2NhbFN0b3JhZ2VQcm92aWRlcjo6YXV0aCdcclxuICAgICAgd2luZG93LmxvY2FsU3RvcmFnZS5zZXRJdGVtKHRlc3QsIHRlc3QpXHJcbiAgICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSh0ZXN0KVxyXG4gICAgICB0cnVlXHJcbiAgICBjYXRjaFxyXG4gICAgICBmYWxzZVxyXG5cclxuICBzYXZlOiAoY29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgdHJ5XHJcbiAgICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2Uuc2V0SXRlbSBAX2dldEtleShtZXRhZGF0YS5uYW1lKSwgY29udGVudFxyXG4gICAgICBjYWxsYmFjaz8gbnVsbFxyXG4gICAgY2F0Y2hcclxuICAgICAgY2FsbGJhY2s/ICdVbmFibGUgdG8gc2F2ZSdcclxuXHJcbiAgbG9hZDogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIHRyeVxyXG4gICAgICBjb250ZW50ID0gd2luZG93LmxvY2FsU3RvcmFnZS5nZXRJdGVtIEBfZ2V0S2V5IG1ldGFkYXRhLm5hbWVcclxuICAgICAgY2FsbGJhY2sgbnVsbCwgY29udGVudFxyXG4gICAgY2F0Y2hcclxuICAgICAgY2FsbGJhY2sgJ1VuYWJsZSB0byBsb2FkJ1xyXG5cclxuICBsaXN0OiAobWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgbGlzdCA9IFtdXHJcbiAgICBwYXRoID0gbWV0YWRhdGE/LnBhdGggb3IgJydcclxuICAgIHByZWZpeCA9IEBfZ2V0S2V5IHBhdGhcclxuICAgIGZvciBvd24ga2V5IG9mIHdpbmRvdy5sb2NhbFN0b3JhZ2VcclxuICAgICAgaWYga2V5LnN1YnN0cigwLCBwcmVmaXgubGVuZ3RoKSBpcyBwcmVmaXhcclxuICAgICAgICBbbmFtZSwgcmVtYWluZGVyLi4uXSA9IGtleS5zdWJzdHIocHJlZml4Lmxlbmd0aCkuc3BsaXQoJy8nKVxyXG4gICAgICAgIGxpc3QucHVzaCBuZXcgQ2xvdWRNZXRhZGF0YVxyXG4gICAgICAgICAgbmFtZToga2V5LnN1YnN0cihwcmVmaXgubGVuZ3RoKVxyXG4gICAgICAgICAgcGF0aDogXCIje3BhdGh9LyN7bmFtZX1cIlxyXG4gICAgICAgICAgdHlwZTogaWYgcmVtYWluZGVyLmxlbmd0aCA+IDAgdGhlbiBDbG91ZE1ldGFkYXRhLkZvbGRlciBlbHNlIENsb3VkTWV0YWRhdGEuRmlsZVxyXG4gICAgICAgICAgcHJvdmlkZXI6IEBcclxuICAgIGNhbGxiYWNrIG51bGwsIGxpc3RcclxuXHJcbiAgcmVtb3ZlOiAobWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgdHJ5XHJcbiAgICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSBAX2dldEtleShtZXRhZGF0YS5uYW1lKVxyXG4gICAgICBjYWxsYmFjaz8gbnVsbFxyXG4gICAgY2F0Y2hcclxuICAgICAgY2FsbGJhY2s/ICdVbmFibGUgdG8gZGVsZXRlJ1xyXG5cclxuICBfZ2V0S2V5OiAobmFtZSA9ICcnKSAtPlxyXG4gICAgXCJjZm06OiN7bmFtZX1cIlxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBMb2NhbFN0b3JhZ2VQcm92aWRlclxyXG4iLCJ7ZGl2fSA9IFJlYWN0LkRPTVxyXG5cclxuY2xhc3MgQ2xvdWRGaWxlXHJcbiAgY29udHJ1Y3RvcjogKG9wdGlvbnMpIC0+XHJcbiAgICB7QGNvbnRlbnQsIEBtZXRhZGF0YX0gPSBvcHRpb25zXHJcblxyXG5jbGFzcyBDbG91ZE1ldGFkYXRhXHJcbiAgY29uc3RydWN0b3I6IChvcHRpb25zKSAtPlxyXG4gICAge0BuYW1lLCBAcGF0aCwgQHR5cGUsIEBwcm92aWRlciwgQHByb3ZpZGVyRGF0YX0gPSBvcHRpb25zXHJcbiAgQEZvbGRlcjogJ2ZvbGRlcidcclxuICBARmlsZTogJ2ZpbGUnXHJcblxyXG5BdXRob3JpemF0aW9uTm90SW1wbGVtZW50ZWREaWFsb2cgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IFJlYWN0LmNyZWF0ZUNsYXNzXHJcbiAgZGlzcGxheU5hbWU6ICdBdXRob3JpemF0aW9uTm90SW1wbGVtZW50ZWREaWFsb2cnXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgKGRpdiB7fSwgXCJBdXRob3JpemF0aW9uIGRpYWxvZyBub3QgeWV0IGltcGxlbWVudGVkIGZvciAje0Bwcm9wcy5wcm92aWRlci5kaXNwbGF5TmFtZX1cIilcclxuXHJcbmNsYXNzIFByb3ZpZGVySW50ZXJmYWNlXHJcblxyXG4gIGNvbnN0cnVjdG9yOiAob3B0aW9ucykgLT5cclxuICAgIHtAbmFtZSwgQGRpc3BsYXlOYW1lLCBAY2FwYWJpbGl0aWVzfSA9IG9wdGlvbnNcclxuICAgIEB1c2VyID0gbnVsbFxyXG5cclxuICBAQXZhaWxhYmxlOiAtPiB0cnVlXHJcblxyXG4gIGNhbjogKGNhcGFiaWxpdHkpIC0+XHJcbiAgICBAY2FwYWJpbGl0aWVzW2NhcGFiaWxpdHldXHJcblxyXG4gIGF1dGhvcml6ZWQ6IChjYWxsYmFjaykgLT5cclxuICAgIGNhbGxiYWNrIHRydWVcclxuXHJcbiAgYXV0aG9yaXphdGlvbkRpYWxvZzogQXV0aG9yaXphdGlvbk5vdEltcGxlbWVudGVkRGlhbG9nXHJcblxyXG4gIGRpYWxvZzogKGNhbGxiYWNrKSAtPlxyXG4gICAgQF9ub3RJbXBsZW1lbnRlZCAnZGlhbG9nJ1xyXG5cclxuICBzYXZlOiAoY29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgQF9ub3RJbXBsZW1lbnRlZCAnc2F2ZSdcclxuXHJcbiAgbG9hZDogKGNhbGxiYWNrKSAtPlxyXG4gICAgQF9ub3RJbXBsZW1lbnRlZCAnbG9hZCdcclxuXHJcbiAgbGlzdDogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIEBfbm90SW1wbGVtZW50ZWQgJ2xpc3QnXHJcblxyXG4gIHJlbW92ZTogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIEBfbm90SW1wbGVtZW50ZWQgJ3JlbW92ZSdcclxuXHJcbiAgX25vdEltcGxlbWVudGVkOiAobWV0aG9kTmFtZSkgLT5cclxuICAgIHRocm93IG5ldyBFcnJvcihcIiN7bWV0aG9kTmFtZX0gbm90IGltcGxlbWVudGVkIGZvciAje0BuYW1lfSBwcm92aWRlclwiKVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPVxyXG4gIENsb3VkRmlsZTogQ2xvdWRGaWxlXHJcbiAgQ2xvdWRNZXRhZGF0YTogQ2xvdWRNZXRhZGF0YVxyXG4gIFByb3ZpZGVySW50ZXJmYWNlOiBQcm92aWRlckludGVyZmFjZVxyXG4iLCJ0ciA9IHJlcXVpcmUgJy4uL3V0aWxzL3RyYW5zbGF0ZSdcclxuaXNTdHJpbmcgPSByZXF1aXJlICcuLi91dGlscy9pcy1zdHJpbmcnXHJcblxyXG5Qcm92aWRlckludGVyZmFjZSA9IChyZXF1aXJlICcuL3Byb3ZpZGVyLWludGVyZmFjZScpLlByb3ZpZGVySW50ZXJmYWNlXHJcbkNsb3VkTWV0YWRhdGEgPSAocmVxdWlyZSAnLi9wcm92aWRlci1pbnRlcmZhY2UnKS5DbG91ZE1ldGFkYXRhXHJcblxyXG5jbGFzcyBSZWFkT25seVByb3ZpZGVyIGV4dGVuZHMgUHJvdmlkZXJJbnRlcmZhY2VcclxuXHJcbiAgY29uc3RydWN0b3I6IChAb3B0aW9ucyA9IHt9KSAtPlxyXG4gICAgc3VwZXJcclxuICAgICAgbmFtZTogUmVhZE9ubHlQcm92aWRlci5OYW1lXHJcbiAgICAgIGRpc3BsYXlOYW1lOiBAb3B0aW9ucy5kaXNwbGF5TmFtZSBvciAodHIgJ35QUk9WSURFUi5SRUFEX09OTFknKVxyXG4gICAgICBjYXBhYmlsaXRpZXM6XHJcbiAgICAgICAgc2F2ZTogZmFsc2VcclxuICAgICAgICBsb2FkOiB0cnVlXHJcbiAgICAgICAgbGlzdDogdHJ1ZVxyXG4gICAgICAgIHJlbW92ZTogZmFsc2VcclxuICAgIEB0cmVlID0gbnVsbFxyXG5cclxuICBATmFtZTogJ3JlYWRPbmx5J1xyXG5cclxuICBsb2FkOiAobWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgQF9sb2FkVHJlZSAoZXJyLCB0cmVlKSA9PlxyXG4gICAgICByZXR1cm4gY2FsbGJhY2sgZXJyIGlmIGVyclxyXG4gICAgICBwYXJlbnQgPSBAX2ZpbmRQYXJlbnQgbWV0YWRhdGFcclxuICAgICAgaWYgcGFyZW50XHJcbiAgICAgICAgaWYgcGFyZW50W21ldGFkYXRhLm5hbWVdXHJcbiAgICAgICAgICBpZiBwYXJlbnRbbWV0YWRhdGEubmFtZV0ubWV0YWRhdGEudHlwZSBpcyBDbG91ZE1ldGFkYXRhLkZpbGVcclxuICAgICAgICAgICAgY2FsbGJhY2sgbnVsbCwgcGFyZW50W21ldGFkYXRhLm5hbWVdLmNvbnRlbnRcclxuICAgICAgICAgIGVsc2VcclxuICAgICAgICAgICAgY2FsbGJhY2sgXCIje21ldGFkYXRhLm5hbWV9IGlzIGEgZm9sZGVyXCJcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICBjYWxsYmFjayBcIiN7bWV0YWRhdGEubmFtZX0gbm90IGZvdW5kIGluIGZvbGRlclwiXHJcbiAgICAgIGVsc2VcclxuICAgICAgICBjYWxsYmFjayBcIiN7bWV0YWRhdGEubmFtZX0gZm9sZGVyIG5vdCBmb3VuZFwiXHJcblxyXG4gIGxpc3Q6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICBAX2xvYWRUcmVlIChlcnIsIHRyZWUpID0+XHJcbiAgICAgIHJldHVybiBjYWxsYmFjayBlcnIgaWYgZXJyXHJcbiAgICAgIHBhcmVudCA9IEBfZmluZFBhcmVudCBtZXRhZGF0YVxyXG4gICAgICBpZiBwYXJlbnRcclxuICAgICAgICBsaXN0ID0gW11cclxuICAgICAgICBsaXN0LnB1c2ggZmlsZS5tZXRhZGF0YSBmb3Igb3duIGZpbGVuYW1lLCBmaWxlIG9mIHBhcmVudFxyXG4gICAgICAgIGNhbGxiYWNrIG51bGwsIGxpc3RcclxuICAgICAgZWxzZSBpZiBtZXRhZGF0YVxyXG4gICAgICAgIGNhbGxiYWNrIFwiI3ttZXRhZGF0YS5uYW1lfSBmb2xkZXIgbm90IGZvdW5kXCJcclxuXHJcbiAgX2xvYWRUcmVlOiAoY2FsbGJhY2spIC0+XHJcbiAgICBpZiBAdHJlZSBpc250IG51bGxcclxuICAgICAgY2FsbGJhY2sgbnVsbCwgQHRyZWVcclxuICAgIGVsc2UgaWYgQG9wdGlvbnMuanNvblxyXG4gICAgICBAdHJlZSA9IEBfY29udmVydEpTT05Ub01ldGFkYXRhVHJlZSBAb3B0aW9ucy5qc29uXHJcbiAgICAgIGNhbGxiYWNrIG51bGwsIEB0cmVlXHJcbiAgICBlbHNlIGlmIEBvcHRpb25zLmpzb25DYWxsYmFja1xyXG4gICAgICBAb3B0aW9ucy5qc29uQ2FsbGJhY2sgKGVyciwganNvbikgPT5cclxuICAgICAgICBpZiBlcnJcclxuICAgICAgICAgIGNhbGxiYWNrIGVyclxyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgIEB0cmVlID0gQF9jb252ZXJ0SlNPTlRvTWV0YWRhdGFUcmVlIEBvcHRpb25zLmpzb25cclxuICAgICAgICAgIGNhbGxiYWNrIG51bGwsIEB0cmVlXHJcbiAgICBlbHNlIGlmIEBvcHRpb25zLnNyY1xyXG4gICAgICAkLmFqYXhcclxuICAgICAgICBkYXRhVHlwZTogJ2pzb24nXHJcbiAgICAgICAgdXJsOiBAb3B0aW9ucy5zcmNcclxuICAgICAgICBzdWNjZXNzOiAoZGF0YSkgPT5cclxuICAgICAgICAgIEB0cmVlID0gQF9jb252ZXJ0SlNPTlRvTWV0YWRhdGFUcmVlIGRhdGFcclxuICAgICAgICAgIGNhbGxiYWNrIG51bGwsIEB0cmVlXHJcbiAgICAgICAgZXJyb3I6IC0+IGNhbGxiYWNrIFwiVW5hYmxlIHRvIGxvYWQganNvbiBmb3IgI3tAZGlzcGxheU5hbWV9IHByb3ZpZGVyXCJcclxuICAgIGVsc2VcclxuICAgICAgY29uc29sZS5lcnJvcj8gXCJObyBqc29uIG9yIHNyYyBvcHRpb24gZm91bmQgZm9yICN7QGRpc3BsYXlOYW1lfSBwcm92aWRlclwiXHJcbiAgICAgIGNhbGxiYWNrIG51bGwsIHt9XHJcblxyXG4gIF9jb252ZXJ0SlNPTlRvTWV0YWRhdGFUcmVlOiAoanNvbiwgcGF0aFByZWZpeCA9ICcvJykgLT5cclxuICAgIHRyZWUgPSB7fVxyXG4gICAgZm9yIG93biBmaWxlbmFtZSBvZiBqc29uXHJcbiAgICAgIHR5cGUgPSBpZiBpc1N0cmluZyBqc29uW2ZpbGVuYW1lXSB0aGVuIENsb3VkTWV0YWRhdGEuRmlsZSBlbHNlIENsb3VkTWV0YWRhdGEuRm9sZGVyXHJcbiAgICAgIG1ldGFkYXRhID0gbmV3IENsb3VkTWV0YWRhdGFcclxuICAgICAgICBuYW1lOiBmaWxlbmFtZVxyXG4gICAgICAgIHBhdGg6IHBhdGhQcmVmaXggKyBmaWxlbmFtZVxyXG4gICAgICAgIHR5cGU6IHR5cGVcclxuICAgICAgICBwcm92aWRlcjogQFxyXG4gICAgICAgIGNoaWxkcmVuOiBudWxsXHJcbiAgICAgIGlmIHR5cGUgaXMgQ2xvdWRNZXRhZGF0YS5Gb2xkZXJcclxuICAgICAgICBtZXRhZGF0YS5jaGlsZHJlbiA9IF9jb252ZXJ0SlNPTlRvTWV0YWRhdGFUcmVlIGpzb25bZmlsZW5hbWVdLCBwYXRoUHJlZml4ICsgZmlsZW5hbWUgKyAnLydcclxuICAgICAgdHJlZVtmaWxlbmFtZV0gPVxyXG4gICAgICAgIGNvbnRlbnQ6IGpzb25bZmlsZW5hbWVdXHJcbiAgICAgICAgbWV0YWRhdGE6IG1ldGFkYXRhXHJcbiAgICB0cmVlXHJcblxyXG4gIF9maW5kUGFyZW50OiAobWV0YWRhdGEpIC0+XHJcbiAgICBpZiBub3QgbWV0YWRhdGFcclxuICAgICAgQHRyZWVcclxuICAgIGVsc2VcclxuICAgICAgQHRyZWVcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUmVhZE9ubHlQcm92aWRlclxyXG4iLCJ0ciA9IHJlcXVpcmUgJy4vdXRpbHMvdHJhbnNsYXRlJ1xyXG5pc1N0cmluZyA9IHJlcXVpcmUgJy4vdXRpbHMvaXMtc3RyaW5nJ1xyXG5cclxuY2xhc3MgQ2xvdWRGaWxlTWFuYWdlclVJRXZlbnRcclxuXHJcbiAgY29uc3RydWN0b3I6IChAdHlwZSwgQGRhdGEgPSB7fSkgLT5cclxuXHJcbmNsYXNzIENsb3VkRmlsZU1hbmFnZXJVSU1lbnVcclxuXHJcbiAgQERlZmF1bHRNZW51OiBbJ25ld0ZpbGVEaWFsb2cnLCAnb3BlbkZpbGVEaWFsb2cnLCAnc2F2ZScsICdzYXZlRmlsZUFzRGlhbG9nJ11cclxuXHJcbiAgY29uc3RydWN0b3I6IChvcHRpb25zLCBjbGllbnQpIC0+XHJcbiAgICBzZXRBY3Rpb24gPSAoYWN0aW9uKSAtPlxyXG4gICAgICBjbGllbnRbYWN0aW9uXT8uYmluZChjbGllbnQpIG9yICgtPiBhbGVydCBcIk5vICN7YWN0aW9ufSBhY3Rpb24gaXMgYXZhaWxhYmxlIGluIHRoZSBjbGllbnRcIilcclxuXHJcbiAgICBAaXRlbXMgPSBbXVxyXG4gICAgZm9yIGl0ZW0gaW4gb3B0aW9ucy5tZW51XHJcbiAgICAgIG1lbnVJdGVtID0gaWYgaXNTdHJpbmcgaXRlbVxyXG4gICAgICAgIG5hbWUgPSBvcHRpb25zLm1lbnVOYW1lcz9baXRlbV1cclxuICAgICAgICBtZW51SXRlbSA9IHN3aXRjaCBpdGVtXHJcbiAgICAgICAgICB3aGVuICduZXdGaWxlRGlhbG9nJ1xyXG4gICAgICAgICAgICBuYW1lOiBuYW1lIG9yIHRyIFwifk1FTlUuTkVXXCJcclxuICAgICAgICAgIHdoZW4gJ29wZW5GaWxlRGlhbG9nJ1xyXG4gICAgICAgICAgICBuYW1lOiBuYW1lIG9yIHRyIFwifk1FTlUuT1BFTlwiXHJcbiAgICAgICAgICB3aGVuICdzYXZlJ1xyXG4gICAgICAgICAgICBuYW1lOiBuYW1lIG9yIHRyIFwifk1FTlUuU0FWRVwiXHJcbiAgICAgICAgICB3aGVuICdzYXZlRmlsZUFzRGlhbG9nJ1xyXG4gICAgICAgICAgICBuYW1lOiBuYW1lIG9yIHRyIFwifk1FTlUuU0FWRV9BU1wiXHJcbiAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgIG5hbWU6IFwiVW5rbm93biBpdGVtOiAje2l0ZW19XCJcclxuICAgICAgICBtZW51SXRlbS5hY3Rpb24gPSBzZXRBY3Rpb24gaXRlbVxyXG4gICAgICAgIG1lbnVJdGVtXHJcbiAgICAgIGVsc2VcclxuICAgICAgICAjIGNsaWVudHMgY2FuIHBhc3MgaW4gY3VzdG9tIHtuYW1lOi4uLiwgYWN0aW9uOi4uLn0gbWVudSBpdGVtcyB3aGVyZSB0aGUgYWN0aW9uIGNhbiBiZSBhIGNsaWVudCBmdW5jdGlvbiBuYW1lIG9yIGl0IGlzIGFzc3VnbWVkIGl0IGlzIGEgZnVuY3Rpb25cclxuICAgICAgICBpZiBpc1N0cmluZyBpdGVtLmFjdGlvblxyXG4gICAgICAgICAgaXRlbS5hY3Rpb24gPSBzZXRBY3Rpb24gaXRlbS5hY3Rpb25cclxuICAgICAgICBpdGVtXHJcbiAgICAgIGlmIG1lbnVJdGVtXHJcbiAgICAgICAgQGl0ZW1zLnB1c2ggbWVudUl0ZW1cclxuXHJcbmNsYXNzIENsb3VkRmlsZU1hbmFnZXJVSVxyXG5cclxuICBjb25zdHJ1Y3RvcjogKEBjbGllbnQpLT5cclxuICAgIEBtZW51ID0gbnVsbFxyXG5cclxuICBpbml0OiAob3B0aW9ucykgLT5cclxuICAgIG9wdGlvbnMgPSBvcHRpb25zIG9yIHt9XHJcbiAgICAjIHNraXAgdGhlIG1lbnUgaWYgZXhwbGljaXR5IHNldCB0byBudWxsIChtZWFuaW5nIG5vIG1lbnUpXHJcbiAgICBpZiBvcHRpb25zLm1lbnUgaXNudCBudWxsXHJcbiAgICAgIGlmIHR5cGVvZiBvcHRpb25zLm1lbnUgaXMgJ3VuZGVmaW5lZCdcclxuICAgICAgICBvcHRpb25zLm1lbnUgPSBDbG91ZEZpbGVNYW5hZ2VyVUlNZW51LkRlZmF1bHRNZW51XHJcbiAgICAgIEBtZW51ID0gbmV3IENsb3VkRmlsZU1hbmFnZXJVSU1lbnUgb3B0aW9ucywgQGNsaWVudFxyXG5cclxuICAjIGZvciBSZWFjdCB0byBsaXN0ZW4gZm9yIGRpYWxvZyBjaGFuZ2VzXHJcbiAgbGlzdGVuOiAoQGxpc3RlbmVyQ2FsbGJhY2spIC0+XHJcblxyXG4gIGFwcGVuZE1lbnVJdGVtOiAoaXRlbSkgLT5cclxuICAgIEBsaXN0ZW5lckNhbGxiYWNrIG5ldyBDbG91ZEZpbGVNYW5hZ2VyVUlFdmVudCAnYXBwZW5kTWVudUl0ZW0nLCBpdGVtXHJcblxyXG4gIHNldE1lbnVCYXJJbmZvOiAoaW5mbykgLT5cclxuICAgIEBsaXN0ZW5lckNhbGxiYWNrIG5ldyBDbG91ZEZpbGVNYW5hZ2VyVUlFdmVudCAnc2V0TWVudUJhckluZm8nLCBpbmZvXHJcblxyXG4gIHNhdmVGaWxlRGlhbG9nOiAoY2FsbGJhY2spIC0+XHJcbiAgICBAX3Nob3dQcm92aWRlckRpYWxvZyAnc2F2ZUZpbGUnLCAodHIgJ35ESUFMT0cuU0FWRScpLCBjYWxsYmFja1xyXG5cclxuICBzYXZlRmlsZUFzRGlhbG9nOiAoY2FsbGJhY2spIC0+XHJcbiAgICBAX3Nob3dQcm92aWRlckRpYWxvZyAnc2F2ZUZpbGVBcycsICh0ciAnfkRJQUxPRy5TQVZFX0FTJyksIGNhbGxiYWNrXHJcblxyXG4gIG9wZW5GaWxlRGlhbG9nOiAoY2FsbGJhY2spIC0+XHJcbiAgICBAX3Nob3dQcm92aWRlckRpYWxvZyAnb3BlbkZpbGUnLCAodHIgJ35ESUFMT0cuT1BFTicpLCBjYWxsYmFja1xyXG5cclxuICBfc2hvd1Byb3ZpZGVyRGlhbG9nOiAoYWN0aW9uLCB0aXRsZSwgY2FsbGJhY2spIC0+XHJcbiAgICBAbGlzdGVuZXJDYWxsYmFjayBuZXcgQ2xvdWRGaWxlTWFuYWdlclVJRXZlbnQgJ3Nob3dQcm92aWRlckRpYWxvZycsXHJcbiAgICAgIGFjdGlvbjogYWN0aW9uXHJcbiAgICAgIHRpdGxlOiB0aXRsZVxyXG4gICAgICBjYWxsYmFjazogY2FsbGJhY2tcclxuXHJcbm1vZHVsZS5leHBvcnRzID1cclxuICBDbG91ZEZpbGVNYW5hZ2VyVUlFdmVudDogQ2xvdWRGaWxlTWFuYWdlclVJRXZlbnRcclxuICBDbG91ZEZpbGVNYW5hZ2VyVUk6IENsb3VkRmlsZU1hbmFnZXJVSVxyXG4gIENsb3VkRmlsZU1hbmFnZXJVSU1lbnU6IENsb3VkRmlsZU1hbmFnZXJVSU1lbnVcclxuIiwibW9kdWxlLmV4cG9ydHMgPSAocGFyYW0pIC0+IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChwYXJhbSkgaXMgJ1tvYmplY3QgU3RyaW5nXSdcclxuIiwibW9kdWxlLmV4cG9ydHMgPVxyXG4gIFwifk1FTlVCQVIuVU5USVRMRV9ET0NVTUVOVFwiOiBcIlVudGl0bGVkIERvY3VtZW50XCJcclxuXHJcbiAgXCJ+TUVOVS5ORVdcIjogXCJOZXdcIlxyXG4gIFwifk1FTlUuT1BFTlwiOiBcIk9wZW4gLi4uXCJcclxuICBcIn5NRU5VLlNBVkVcIjogXCJTYXZlXCJcclxuICBcIn5NRU5VLlNBVkVfQVNcIjogXCJTYXZlIEFzIC4uLlwiXHJcblxyXG4gIFwifkRJQUxPRy5TQVZFXCI6IFwiU2F2ZVwiXHJcbiAgXCJ+RElBTE9HLlNBVkVfQVNcIjogXCJTYXZlIEFzIC4uLlwiXHJcbiAgXCJ+RElBTE9HLk9QRU5cIjogXCJPcGVuXCJcclxuXHJcbiAgXCJ+UFJPVklERVIuTE9DQUxfU1RPUkFHRVwiOiBcIkxvY2FsIFN0b3JhZ2VcIlxyXG4gIFwiflBST1ZJREVSLlJFQURfT05MWVwiOiBcIlJlYWQgT25seVwiXHJcbiAgXCJ+UFJPVklERVIuR09PR0xFX0RSSVZFXCI6IFwiR29vZ2xlIERyaXZlXCJcclxuICBcIn5QUk9WSURFUi5ET0NVTUVOVF9TVE9SRVwiOiBcIkRvY3VtZW50IFN0b3JlXCJcclxuXHJcbiAgXCJ+RklMRV9ESUFMT0cuRklMRU5BTUVcIjogXCJGaWxlbmFtZVwiXHJcbiAgXCJ+RklMRV9ESUFMT0cuT1BFTlwiOiBcIk9wZW5cIlxyXG4gIFwifkZJTEVfRElBTE9HLlNBVkVcIjogXCJTYXZlXCJcclxuICBcIn5GSUxFX0RJQUxPRy5DQU5DRUxcIjogXCJDYW5jZWxcIlxyXG4gIFwifkZJTEVfRElBTE9HLlJFTU9WRVwiOiBcIkRlbGV0ZVwiXHJcbiAgXCJ+RklMRV9ESUFMT0cuUkVNT1ZFX0NPTkZJUk1cIjogXCJBcmUgeW91IHN1cmUgeW91IHdhbnQgdG8gZGVsZXRlICV7ZmlsZW5hbWV9P1wiXHJcbiAgXCJ+RklMRV9ESUFMT0cuTE9BRElOR1wiOiBcIkxvYWRpbmcuLi5cIlxyXG4iLCJ0cmFuc2xhdGlvbnMgPSAge31cclxudHJhbnNsYXRpb25zWydlbiddID0gcmVxdWlyZSAnLi9sYW5nL2VuLXVzJ1xyXG5kZWZhdWx0TGFuZyA9ICdlbidcclxudmFyUmVnRXhwID0gLyVcXHtcXHMqKFtefVxcc10qKVxccypcXH0vZ1xyXG5cclxudHJhbnNsYXRlID0gKGtleSwgdmFycz17fSwgbGFuZz1kZWZhdWx0TGFuZykgLT5cclxuICB0cmFuc2xhdGlvbiA9IHRyYW5zbGF0aW9uc1tsYW5nXT9ba2V5XSBvciBrZXlcclxuICB0cmFuc2xhdGlvbi5yZXBsYWNlIHZhclJlZ0V4cCwgKG1hdGNoLCBrZXkpIC0+XHJcbiAgICBpZiB2YXJzLmhhc093blByb3BlcnR5IGtleSB0aGVuIHZhcnNba2V5XSBlbHNlIFwiJyoqIFVLTk9XTiBLRVk6ICN7a2V5fSAqKlwiXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHRyYW5zbGF0ZVxyXG4iLCJNZW51QmFyID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL21lbnUtYmFyLXZpZXcnXHJcblByb3ZpZGVyVGFiYmVkRGlhbG9nID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL3Byb3ZpZGVyLXRhYmJlZC1kaWFsb2ctdmlldydcclxuXHJcbnRyID0gcmVxdWlyZSAnLi4vdXRpbHMvdHJhbnNsYXRlJ1xyXG5cclxue2RpdiwgaWZyYW1lfSA9IFJlYWN0LkRPTVxyXG5cclxuSW5uZXJBcHAgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IFJlYWN0LmNyZWF0ZUNsYXNzXHJcblxyXG4gIGRpc3BsYXlOYW1lOiAnQ2xvdWRGaWxlTWFuYWdlcklubmVyQXBwJ1xyXG5cclxuICBzaG91bGRDb21wb25lbnRVcGRhdGU6IChuZXh0UHJvcHMpIC0+XHJcbiAgICBuZXh0UHJvcHMuYXBwIGlzbnQgQHByb3BzLmFwcFxyXG5cclxuICByZW5kZXI6IC0+XHJcbiAgICAoZGl2IHtjbGFzc05hbWU6ICdpbm5lckFwcCd9LFxyXG4gICAgICAoaWZyYW1lIHtzcmM6IEBwcm9wcy5hcHB9KVxyXG4gICAgKVxyXG5cclxuQXBwID0gUmVhY3QuY3JlYXRlQ2xhc3NcclxuXHJcbiAgZGlzcGxheU5hbWU6ICdDbG91ZEZpbGVNYW5hZ2VyJ1xyXG5cclxuICBnZXRGaWxlbmFtZTogLT5cclxuICAgIGlmIEBwcm9wcy5jbGllbnQuc3RhdGUubWV0YWRhdGE/Lmhhc093blByb3BlcnR5KCduYW1lJykgdGhlbiBAcHJvcHMuY2xpZW50LnN0YXRlLm1ldGFkYXRhLm5hbWUgZWxzZSAodHIgXCJ+TUVOVUJBUi5VTlRJVExFX0RPQ1VNRU5UXCIpXHJcblxyXG4gIGdldEluaXRpYWxTdGF0ZTogLT5cclxuICAgIGZpbGVuYW1lOiBAZ2V0RmlsZW5hbWUoKVxyXG4gICAgbWVudUl0ZW1zOiBAcHJvcHMuY2xpZW50Ll91aS5tZW51Py5pdGVtcyBvciBbXVxyXG4gICAgbWVudU9wdGlvbnM6IEBwcm9wcy5tZW51QmFyIG9yIHt9XHJcbiAgICBwcm92aWRlckRpYWxvZzogbnVsbFxyXG4gICAgZGlydHk6IGZhbHNlXHJcblxyXG4gIGNvbXBvbmVudFdpbGxNb3VudDogLT5cclxuICAgIEBwcm9wcy5jbGllbnQubGlzdGVuIChldmVudCkgPT5cclxuICAgICAgZmlsZVN0YXR1cyA9IGlmIGV2ZW50LnN0YXRlLnNhdmluZ1xyXG4gICAgICAgIHttZXNzYWdlOiAnU2F2aW5nLi4uJywgdHlwZTogJ2luZm8nfVxyXG4gICAgICBlbHNlIGlmIGV2ZW50LnN0YXRlLnNhdmVkXHJcbiAgICAgICAge21lc3NhZ2U6ICdTYXZlZCcsIHR5cGU6ICdpbmZvJ31cclxuICAgICAgZWxzZSBpZiBldmVudC5zdGF0ZS5kaXJ0eVxyXG4gICAgICAgIHttZXNzYWdlOiAnVW5zYXZlZCcsIHR5cGU6ICdhbGVydCd9XHJcbiAgICAgIGVsc2VcclxuICAgICAgICBudWxsXHJcbiAgICAgIEBzZXRTdGF0ZVxyXG4gICAgICAgIGZpbGVuYW1lOiBAZ2V0RmlsZW5hbWUoKVxyXG4gICAgICAgIGZpbGVTdGF0dXM6IGZpbGVTdGF0dXNcclxuXHJcbiAgICAgIHN3aXRjaCBldmVudC50eXBlXHJcbiAgICAgICAgd2hlbiAnY29ubmVjdGVkJ1xyXG4gICAgICAgICAgQHNldFN0YXRlIG1lbnVJdGVtczogQHByb3BzLmNsaWVudC5fdWkubWVudT8uaXRlbXMgb3IgW11cclxuXHJcbiAgICBAcHJvcHMuY2xpZW50Ll91aS5saXN0ZW4gKGV2ZW50KSA9PlxyXG4gICAgICBzd2l0Y2ggZXZlbnQudHlwZVxyXG4gICAgICAgIHdoZW4gJ3Nob3dQcm92aWRlckRpYWxvZydcclxuICAgICAgICAgIEBzZXRTdGF0ZSBwcm92aWRlckRpYWxvZzogZXZlbnQuZGF0YVxyXG4gICAgICAgIHdoZW4gJ2FwcGVuZE1lbnVJdGVtJ1xyXG4gICAgICAgICAgQHN0YXRlLm1lbnVJdGVtcy5wdXNoIGV2ZW50LmRhdGFcclxuICAgICAgICAgIEBzZXRTdGF0ZSBtZW51SXRlbXM6IEBzdGF0ZS5tZW51SXRlbXNcclxuICAgICAgICB3aGVuICdzZXRNZW51QmFySW5mbydcclxuICAgICAgICAgIEBzdGF0ZS5tZW51T3B0aW9ucy5pbmZvID0gZXZlbnQuZGF0YVxyXG4gICAgICAgICAgQHNldFN0YXRlIG1lbnVPcHRpb25zOiBAc3RhdGUubWVudU9wdGlvbnNcclxuXHJcbiAgY2xvc2VQcm92aWRlckRpYWxvZzogLT5cclxuICAgIEBzZXRTdGF0ZSBwcm92aWRlckRpYWxvZzogbnVsbFxyXG5cclxuICByZW5kZXI6IC0+XHJcbiAgICBpZiBAcHJvcHMudXNpbmdJZnJhbWVcclxuICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnYXBwJ30sXHJcbiAgICAgICAgKE1lbnVCYXIge2ZpbGVuYW1lOiBAc3RhdGUuZmlsZW5hbWUsIGZpbGVTdGF0dXM6IEBzdGF0ZS5maWxlU3RhdHVzLCBpdGVtczogQHN0YXRlLm1lbnVJdGVtcywgb3B0aW9uczogQHN0YXRlLm1lbnVPcHRpb25zfSlcclxuICAgICAgICAoSW5uZXJBcHAge2FwcDogQHByb3BzLmFwcH0pXHJcbiAgICAgICAgaWYgQHN0YXRlLnByb3ZpZGVyRGlhbG9nXHJcbiAgICAgICAgICAoUHJvdmlkZXJUYWJiZWREaWFsb2cge2NsaWVudDogQHByb3BzLmNsaWVudCwgZGlhbG9nOiBAc3RhdGUucHJvdmlkZXJEaWFsb2csIGNsb3NlOiBAY2xvc2VQcm92aWRlckRpYWxvZ30pXHJcbiAgICAgIClcclxuICAgIGVsc2VcclxuICAgICAgaWYgQHN0YXRlLnByb3ZpZGVyRGlhbG9nXHJcbiAgICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnYXBwJ30sXHJcbiAgICAgICAgICAoUHJvdmlkZXJUYWJiZWREaWFsb2cge2NsaWVudDogQHByb3BzLmNsaWVudCwgZGlhbG9nOiBAc3RhdGUucHJvdmlkZXJEaWFsb2csIGNsb3NlOiBAY2xvc2VQcm92aWRlckRpYWxvZ30pXHJcbiAgICAgICAgKVxyXG4gICAgICBlbHNlXHJcbiAgICAgICAgbnVsbFxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBBcHBcclxuIiwiQXV0aG9yaXplTWl4aW4gPVxyXG4gIGdldEluaXRpYWxTdGF0ZTogLT5cclxuICAgIGF1dGhvcml6ZWQ6IGZhbHNlXHJcblxyXG4gIGNvbXBvbmVudFdpbGxNb3VudDogLT5cclxuICAgIEBwcm9wcy5wcm92aWRlci5hdXRob3JpemVkIChhdXRob3JpemVkKSA9PlxyXG4gICAgICBAc2V0U3RhdGUgYXV0aG9yaXplZDogYXV0aG9yaXplZFxyXG5cclxuICByZW5kZXI6IC0+XHJcbiAgICBpZiBAc3RhdGUuYXV0aG9yaXplZFxyXG4gICAgICBAcmVuZGVyV2hlbkF1dGhvcml6ZWQoKVxyXG4gICAgZWxzZVxyXG4gICAgICBAcHJvcHMucHJvdmlkZXIucmVuZGVyQXV0aG9yaXphdGlvbkRpYWxvZygpXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEF1dGhvcml6ZU1peGluXHJcbiIsIntkaXYsIGksIHNwYW4sIHVsLCBsaX0gPSBSZWFjdC5ET01cclxuXHJcbkRyb3Bkb3duSXRlbSA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgUmVhY3QuY3JlYXRlQ2xhc3NcclxuXHJcbiAgZGlzcGxheU5hbWU6ICdEcm9wZG93bkl0ZW0nXHJcblxyXG4gIGNsaWNrZWQ6IC0+XHJcbiAgICBAcHJvcHMuc2VsZWN0IEBwcm9wcy5pdGVtXHJcblxyXG4gIHJlbmRlcjogLT5cclxuICAgIGNsYXNzTmFtZSA9IFwibWVudUl0ZW0gI3tpZiBAcHJvcHMuaXNBY3Rpb25NZW51IGFuZCBub3QgQHByb3BzLml0ZW0uYWN0aW9uIHRoZW4gJ2Rpc2FibGVkJyBlbHNlICcnfVwiXHJcbiAgICBuYW1lID0gQHByb3BzLml0ZW0ubmFtZSBvciBAcHJvcHMuaXRlbVxyXG4gICAgKGxpIHtjbGFzc05hbWU6IGNsYXNzTmFtZSwgb25DbGljazogQGNsaWNrZWQgfSwgbmFtZSlcclxuXHJcbkRyb3BEb3duID0gUmVhY3QuY3JlYXRlQ2xhc3NcclxuXHJcbiAgZGlzcGxheU5hbWU6ICdEcm9wZG93bidcclxuXHJcbiAgZ2V0RGVmYXVsdFByb3BzOiAtPlxyXG4gICAgaXNBY3Rpb25NZW51OiB0cnVlICAgICAgICAgICAgICAjIFdoZXRoZXIgZWFjaCBpdGVtIGNvbnRhaW5zIGl0cyBvd24gYWN0aW9uXHJcbiAgICBvblNlbGVjdDogKGl0ZW0pIC0+ICAgICAgICAgICAgICMgSWYgbm90LCBAcHJvcHMub25TZWxlY3QgaXMgY2FsbGVkXHJcbiAgICAgIGxvZy5pbmZvIFwiU2VsZWN0ZWQgI3tpdGVtfVwiXHJcblxyXG4gIGdldEluaXRpYWxTdGF0ZTogLT5cclxuICAgIHNob3dpbmdNZW51OiBmYWxzZVxyXG4gICAgdGltZW91dDogbnVsbFxyXG5cclxuICBibHVyOiAtPlxyXG4gICAgQHVuYmx1cigpXHJcbiAgICB0aW1lb3V0ID0gc2V0VGltZW91dCAoID0+IEBzZXRTdGF0ZSB7c2hvd2luZ01lbnU6IGZhbHNlfSApLCA1MDBcclxuICAgIEBzZXRTdGF0ZSB7dGltZW91dDogdGltZW91dH1cclxuXHJcbiAgdW5ibHVyOiAtPlxyXG4gICAgaWYgQHN0YXRlLnRpbWVvdXRcclxuICAgICAgY2xlYXJUaW1lb3V0KEBzdGF0ZS50aW1lb3V0KVxyXG4gICAgQHNldFN0YXRlIHt0aW1lb3V0OiBudWxsfVxyXG5cclxuICBzZWxlY3Q6IChpdGVtKSAtPlxyXG4gICAgbmV4dFN0YXRlID0gKG5vdCBAc3RhdGUuc2hvd2luZ01lbnUpXHJcbiAgICBAc2V0U3RhdGUge3Nob3dpbmdNZW51OiBuZXh0U3RhdGV9XHJcbiAgICByZXR1cm4gdW5sZXNzIGl0ZW1cclxuICAgIGlmIEBwcm9wcy5pc0FjdGlvbk1lbnUgYW5kIGl0ZW0uYWN0aW9uXHJcbiAgICAgIGl0ZW0uYWN0aW9uKClcclxuICAgIGVsc2VcclxuICAgICAgQHByb3BzLm9uU2VsZWN0IGl0ZW1cclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgbWVudUNsYXNzID0gaWYgQHN0YXRlLnNob3dpbmdNZW51IHRoZW4gJ21lbnUtc2hvd2luZycgZWxzZSAnbWVudS1oaWRkZW4nXHJcbiAgICBzZWxlY3QgPSAoaXRlbSkgPT5cclxuICAgICAgKCA9PiBAc2VsZWN0KGl0ZW0pKVxyXG4gICAgKGRpdiB7Y2xhc3NOYW1lOiAnbWVudSd9LFxyXG4gICAgICAoc3BhbiB7Y2xhc3NOYW1lOiAnbWVudS1hbmNob3InLCBvbkNsaWNrOiA9PiBAc2VsZWN0KG51bGwpfSxcclxuICAgICAgICBAcHJvcHMuYW5jaG9yXHJcbiAgICAgICAgKGkge2NsYXNzTmFtZTogJ2ljb24tYXJyb3ctZXhwYW5kJ30pXHJcbiAgICAgIClcclxuICAgICAgaWYgQHByb3BzLml0ZW1zPy5sZW5ndGggPiAwXHJcbiAgICAgICAgKGRpdiB7Y2xhc3NOYW1lOiBtZW51Q2xhc3MsIG9uTW91c2VMZWF2ZTogQGJsdXIsIG9uTW91c2VFbnRlcjogQHVuYmx1cn0sXHJcbiAgICAgICAgICAodWwge30sXHJcbiAgICAgICAgICAgIChEcm9wZG93bkl0ZW0ge2tleTogaXRlbS5uYW1lIG9yIGl0ZW0sIGl0ZW06IGl0ZW0sIHNlbGVjdDogQHNlbGVjdCwgaXNBY3Rpb25NZW51OiBAcHJvcHMuaXNBY3Rpb25NZW51fSkgZm9yIGl0ZW0gaW4gQHByb3BzLml0ZW1zXHJcbiAgICAgICAgICApXHJcbiAgICAgICAgKVxyXG4gICAgKVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBEcm9wRG93blxyXG4iLCJBdXRob3JpemVNaXhpbiA9IHJlcXVpcmUgJy4vYXV0aG9yaXplLW1peGluJ1xyXG5DbG91ZE1ldGFkYXRhID0gKHJlcXVpcmUgJy4uL3Byb3ZpZGVycy9wcm92aWRlci1pbnRlcmZhY2UnKS5DbG91ZE1ldGFkYXRhXHJcblxyXG50ciA9IHJlcXVpcmUgJy4uL3V0aWxzL3RyYW5zbGF0ZSdcclxuXHJcbntkaXYsIGltZywgaSwgc3BhbiwgaW5wdXQsIGJ1dHRvbn0gPSBSZWFjdC5ET01cclxuXHJcbkZpbGVMaXN0RmlsZSA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgUmVhY3QuY3JlYXRlQ2xhc3NcclxuICBkaXNwbGF5TmFtZTogJ0ZpbGVMaXN0RmlsZSdcclxuXHJcbiAgY29tcG9uZW50V2lsbE1vdW50OiAtPlxyXG4gICAgQGxhc3RDbGljayA9IDBcclxuXHJcbiAgZmlsZVNlbGVjdGVkOiAgKGUpIC0+XHJcbiAgICBlLnByZXZlbnREZWZhdWx0KClcclxuICAgIGUuc3RvcFByb3BhZ2F0aW9uKClcclxuICAgIG5vdyA9IChuZXcgRGF0ZSgpKS5nZXRUaW1lKClcclxuICAgIEBwcm9wcy5maWxlU2VsZWN0ZWQgQHByb3BzLm1ldGFkYXRhXHJcbiAgICBpZiBub3cgLSBAbGFzdENsaWNrIDw9IDI1MFxyXG4gICAgICBAcHJvcHMuZmlsZUNvbmZpcm1lZCgpXHJcbiAgICBAbGFzdENsaWNrID0gbm93XHJcblxyXG4gIHJlbmRlcjogLT5cclxuICAgIChkaXYge2NsYXNzTmFtZTogKGlmIEBwcm9wcy5zZWxlY3RlZCB0aGVuICdzZWxlY3RlZCcgZWxzZSAnJyksIG9uQ2xpY2s6IEBmaWxlU2VsZWN0ZWR9LCBAcHJvcHMubWV0YWRhdGEubmFtZSlcclxuXHJcbkZpbGVMaXN0ID0gUmVhY3QuY3JlYXRlRmFjdG9yeSBSZWFjdC5jcmVhdGVDbGFzc1xyXG4gIGRpc3BsYXlOYW1lOiAnRmlsZUxpc3QnXHJcblxyXG4gIGdldEluaXRpYWxTdGF0ZTogLT5cclxuICAgIGxvYWRpbmc6IHRydWVcclxuXHJcbiAgY29tcG9uZW50RGlkTW91bnQ6IC0+XHJcbiAgICBAbG9hZCgpXHJcblxyXG4gIGxvYWQ6IC0+XHJcbiAgICBAcHJvcHMucHJvdmlkZXIubGlzdCBAcHJvcHMuZm9sZGVyLCAoZXJyLCBsaXN0KSA9PlxyXG4gICAgICByZXR1cm4gYWxlcnQoZXJyKSBpZiBlcnJcclxuICAgICAgQHNldFN0YXRlXHJcbiAgICAgICAgbG9hZGluZzogZmFsc2VcclxuICAgICAgQHByb3BzLmxpc3RMb2FkZWQgbGlzdFxyXG5cclxuICByZW5kZXI6IC0+XHJcbiAgICAoZGl2IHtjbGFzc05hbWU6ICdmaWxlbGlzdCd9LFxyXG4gICAgICBpZiBAc3RhdGUubG9hZGluZ1xyXG4gICAgICAgIHRyIFwifkZJTEVfRElBTE9HLkxPQURJTkdcIlxyXG4gICAgICBlbHNlXHJcbiAgICAgICAgZm9yIG1ldGFkYXRhIGluIEBwcm9wcy5saXN0XHJcbiAgICAgICAgICAoRmlsZUxpc3RGaWxlIHttZXRhZGF0YTogbWV0YWRhdGEsIHNlbGVjdGVkOiBAcHJvcHMuc2VsZWN0ZWRGaWxlIGlzIG1ldGFkYXRhLCBmaWxlU2VsZWN0ZWQ6IEBwcm9wcy5maWxlU2VsZWN0ZWQsIGZpbGVDb25maXJtZWQ6IEBwcm9wcy5maWxlQ29uZmlybWVkfSlcclxuICAgIClcclxuXHJcbkZpbGVEaWFsb2dUYWIgPSBSZWFjdC5jcmVhdGVDbGFzc1xyXG4gIGRpc3BsYXlOYW1lOiAnRmlsZURpYWxvZ1RhYidcclxuXHJcbiAgbWl4aW5zOiBbQXV0aG9yaXplTWl4aW5dXHJcblxyXG4gIGdldEluaXRpYWxTdGF0ZTogLT5cclxuICAgIGZvbGRlcjogQHByb3BzLmNsaWVudC5zdGF0ZS5tZXRhZGF0YT8ucGFyZW50IG9yIG51bGxcclxuICAgIG1ldGFkYXRhOiBAcHJvcHMuY2xpZW50LnN0YXRlLm1ldGFkYXRhXHJcbiAgICBmaWxlbmFtZTogQHByb3BzLmNsaWVudC5zdGF0ZS5tZXRhZGF0YT8ubmFtZSBvciAnJ1xyXG4gICAgbGlzdDogW11cclxuXHJcbiAgY29tcG9uZW50V2lsbE1vdW50OiAtPlxyXG4gICAgQGlzT3BlbiA9IEBwcm9wcy5kaWFsb2cuYWN0aW9uIGlzICdvcGVuRmlsZSdcclxuXHJcbiAgZmlsZW5hbWVDaGFuZ2VkOiAoZSkgLT5cclxuICAgIGZpbGVuYW1lID0gZS50YXJnZXQudmFsdWVcclxuICAgIG1ldGFkYXRhID0gQGZpbmRNZXRhZGF0YSBmaWxlbmFtZVxyXG4gICAgQHNldFN0YXRlXHJcbiAgICAgIGZpbGVuYW1lOiBmaWxlbmFtZVxyXG4gICAgICBtZXRhZGF0YTogbWV0YWRhdGFcclxuXHJcbiAgbGlzdExvYWRlZDogKGxpc3QpIC0+XHJcbiAgICBAc2V0U3RhdGUgbGlzdDogbGlzdFxyXG5cclxuICBmaWxlU2VsZWN0ZWQ6IChtZXRhZGF0YSkgLT5cclxuICAgIGlmIG1ldGFkYXRhPy50eXBlIGlzIENsb3VkTWV0YWRhdGEuRmlsZVxyXG4gICAgICBAc2V0U3RhdGUgZmlsZW5hbWU6IG1ldGFkYXRhLm5hbWVcclxuICAgIEBzZXRTdGF0ZSBtZXRhZGF0YTogbWV0YWRhdGFcclxuXHJcbiAgY29uZmlybTogLT5cclxuICAgIGlmIG5vdCBAc3RhdGUubWV0YWRhdGFcclxuICAgICAgZmlsZW5hbWUgPSAkLnRyaW0gQHN0YXRlLmZpbGVuYW1lXHJcbiAgICAgIEBzdGF0ZS5tZXRhZGF0YSA9IEBmaW5kTWV0YWRhdGEgZmlsZW5hbWVcclxuICAgICAgaWYgbm90IEBzdGF0ZS5tZXRhZGF0YVxyXG4gICAgICAgIGlmIEBpc09wZW5cclxuICAgICAgICAgIGFsZXJ0IFwiI3tAc3RhdGUuZmlsZW5hbWV9IG5vdCBmb3VuZFwiXHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgQHN0YXRlLm1ldGFkYXRhID0gbmV3IENsb3VkTWV0YWRhdGFcclxuICAgICAgICAgICAgbmFtZTogZmlsZW5hbWVcclxuICAgICAgICAgICAgcGF0aDogXCIvI3tmaWxlbmFtZX1cIiAjIFRPRE86IEZpeCBwYXRoXHJcbiAgICAgICAgICAgIHR5cGU6IENsb3VkTWV0YWRhdGEuRmlsZVxyXG4gICAgICAgICAgICBwcm92aWRlcjogQHByb3BzLnByb3ZpZGVyXHJcbiAgICBpZiBAc3RhdGUubWV0YWRhdGFcclxuICAgICAgIyBlbnN1cmUgdGhlIG1ldGFkYXRhIHByb3ZpZGVyIGlzIHRoZSBjdXJyZW50bHktc2hvd2luZyB0YWJcclxuICAgICAgQHN0YXRlLm1ldGFkYXRhLnByb3ZpZGVyID0gQHByb3BzLnByb3ZpZGVyXHJcbiAgICAgIEBwcm9wcy5kaWFsb2cuY2FsbGJhY2sgQHN0YXRlLm1ldGFkYXRhXHJcbiAgICAgIEBwcm9wcy5jbG9zZSgpXHJcblxyXG4gIHJlbW92ZTogLT5cclxuICAgIGlmIEBzdGF0ZS5tZXRhZGF0YSBhbmQgQHN0YXRlLm1ldGFkYXRhLnR5cGUgaXNudCBDbG91ZE1ldGFkYXRhLkZvbGRlciBhbmQgY29uZmlybSh0cihcIn5GSUxFX0RJQUxPRy5SRU1PVkVfQ09ORklSTVwiLCB7ZmlsZW5hbWU6IEBzdGF0ZS5tZXRhZGF0YS5uYW1lfSkpXHJcbiAgICAgIEBwcm9wcy5wcm92aWRlci5yZW1vdmUgQHN0YXRlLm1ldGFkYXRhLCAoZXJyKSA9PlxyXG4gICAgICAgIGlmIG5vdCBlcnJcclxuICAgICAgICAgIGxpc3QgPSBAc3RhdGUubGlzdC5zbGljZSAwXHJcbiAgICAgICAgICBpbmRleCA9IGxpc3QuaW5kZXhPZiBAc3RhdGUubWV0YWRhdGFcclxuICAgICAgICAgIGxpc3Quc3BsaWNlIGluZGV4LCAxXHJcbiAgICAgICAgICBAc2V0U3RhdGVcclxuICAgICAgICAgICAgbGlzdDogbGlzdFxyXG4gICAgICAgICAgICBtZXRhZGF0YTogbnVsbFxyXG4gICAgICAgICAgICBmaWxlbmFtZTogJydcclxuXHJcbiAgY2FuY2VsOiAtPlxyXG4gICAgQHByb3BzLmNsb3NlKClcclxuXHJcbiAgZmluZE1ldGFkYXRhOiAoZmlsZW5hbWUpIC0+XHJcbiAgICBmb3IgbWV0YWRhdGEgaW4gQHN0YXRlLmxpc3RcclxuICAgICAgaWYgbWV0YWRhdGEubmFtZSBpcyBmaWxlbmFtZVxyXG4gICAgICAgIHJldHVybiBtZXRhZGF0YVxyXG4gICAgbnVsbFxyXG5cclxuICB3YXRjaEZvckVudGVyOiAoZSkgLT5cclxuICAgIGlmIGUua2V5Q29kZSBpcyAxMyBhbmQgbm90IEBjb25maXJtRGlzYWJsZWQoKVxyXG4gICAgICBAY29uZmlybSgpXHJcblxyXG4gIGNvbmZpcm1EaXNhYmxlZDogLT5cclxuICAgIChAc3RhdGUuZmlsZW5hbWUubGVuZ3RoIGlzIDApIG9yIChAaXNPcGVuIGFuZCBub3QgQHN0YXRlLm1ldGFkYXRhKVxyXG5cclxuICByZW5kZXJXaGVuQXV0aG9yaXplZDogLT5cclxuICAgIGNvbmZpcm1EaXNhYmxlZCA9IEBjb25maXJtRGlzYWJsZWQoKVxyXG4gICAgcmVtb3ZlRGlzYWJsZWQgPSAoQHN0YXRlLm1ldGFkYXRhIGlzIG51bGwpIG9yIChAc3RhdGUubWV0YWRhdGEudHlwZSBpcyBDbG91ZE1ldGFkYXRhLkZvbGRlcilcclxuXHJcbiAgICAoZGl2IHtjbGFzc05hbWU6ICdkaWFsb2dUYWInfSxcclxuICAgICAgKGlucHV0IHt0eXBlOiAndGV4dCcsIHZhbHVlOiBAc3RhdGUuZmlsZW5hbWUsIHBsYWNlaG9sZGVyOiAodHIgXCJ+RklMRV9ESUFMT0cuRklMRU5BTUVcIiksIG9uQ2hhbmdlOiBAZmlsZW5hbWVDaGFuZ2VkLCBvbktleURvd246IEB3YXRjaEZvckVudGVyfSlcclxuICAgICAgKEZpbGVMaXN0IHtwcm92aWRlcjogQHByb3BzLnByb3ZpZGVyLCBmb2xkZXI6IEBzdGF0ZS5mb2xkZXIsIHNlbGVjdGVkRmlsZTogQHN0YXRlLm1ldGFkYXRhLCBmaWxlU2VsZWN0ZWQ6IEBmaWxlU2VsZWN0ZWQsIGZpbGVDb25maXJtZWQ6IEBjb25maXJtLCBsaXN0OiBAc3RhdGUubGlzdCwgbGlzdExvYWRlZDogQGxpc3RMb2FkZWR9KVxyXG4gICAgICAoZGl2IHtjbGFzc05hbWU6ICdidXR0b25zJ30sXHJcbiAgICAgICAgKGJ1dHRvbiB7b25DbGljazogQGNvbmZpcm0sIGRpc2FibGVkOiBjb25maXJtRGlzYWJsZWQsIGNsYXNzTmFtZTogaWYgY29uZmlybURpc2FibGVkIHRoZW4gJ2Rpc2FibGVkJyBlbHNlICcnfSwgaWYgQGlzT3BlbiB0aGVuICh0ciBcIn5GSUxFX0RJQUxPRy5PUEVOXCIpIGVsc2UgKHRyIFwifkZJTEVfRElBTE9HLlNBVkVcIikpXHJcbiAgICAgICAgaWYgQHByb3BzLnByb3ZpZGVyLmNhbiAncmVtb3ZlJ1xyXG4gICAgICAgICAgKGJ1dHRvbiB7b25DbGljazogQHJlbW92ZSwgZGlzYWJsZWQ6IHJlbW92ZURpc2FibGVkLCBjbGFzc05hbWU6IGlmIHJlbW92ZURpc2FibGVkIHRoZW4gJ2Rpc2FibGVkJyBlbHNlICcnfSwgKHRyIFwifkZJTEVfRElBTE9HLlJFTU9WRVwiKSlcclxuICAgICAgICAoYnV0dG9uIHtvbkNsaWNrOiBAY2FuY2VsfSwgKHRyIFwifkZJTEVfRElBTE9HLkNBTkNFTFwiKSlcclxuICAgICAgKVxyXG4gICAgKVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBGaWxlRGlhbG9nVGFiXHJcbiIsIntkaXYsIGksIHNwYW59ID0gUmVhY3QuRE9NXHJcblxyXG5Ecm9wZG93biA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9kcm9wZG93bi12aWV3J1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzc1xyXG5cclxuICBkaXNwbGF5TmFtZTogJ01lbnVCYXInXHJcblxyXG4gIGdldEluaXRpYWxTdGF0ZTogLT5cclxuICAgIHJpZ2h0U2lkZUxheW91dDogQHByb3BzLm9wdGlvbnMucmlnaHRTaWRlTGF5b3V0IG9yIFsnaW5mbycsICdoZWxwJ11cclxuXHJcbiAgaGVscDogLT5cclxuICAgIHdpbmRvdy5vcGVuIEBwcm9wcy5vcHRpb25zLmhlbHAsICdfYmxhbmsnXHJcblxyXG4gIHJlbmRlcjogLT5cclxuICAgIChkaXYge2NsYXNzTmFtZTogJ21lbnUtYmFyJ30sXHJcbiAgICAgIChkaXYge2NsYXNzTmFtZTogJ21lbnUtYmFyLWxlZnQnfSxcclxuICAgICAgICAoRHJvcGRvd24ge1xyXG4gICAgICAgICAgYW5jaG9yOiBAcHJvcHMuZmlsZW5hbWVcclxuICAgICAgICAgIGl0ZW1zOiBAcHJvcHMuaXRlbXNcclxuICAgICAgICAgIGNsYXNzTmFtZTonbWVudS1iYXItY29udGVudC1maWxlbmFtZSd9KVxyXG4gICAgICAgIGlmIEBwcm9wcy5maWxlU3RhdHVzXHJcbiAgICAgICAgICAoc3BhbiB7Y2xhc3NOYW1lOiBcIm1lbnUtYmFyLWZpbGUtc3RhdHVzIG1lbnUtYmFyLWZpbGUtc3RhdHVzLSN7QHByb3BzLmZpbGVTdGF0dXMudHlwZX1cIn0sIEBwcm9wcy5maWxlU3RhdHVzLm1lc3NhZ2UpXHJcbiAgICAgIClcclxuICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnbWVudS1iYXItcmlnaHQnfSxcclxuICAgICAgICBmb3IgaXRlbSBpbiBAc3RhdGUucmlnaHRTaWRlTGF5b3V0XHJcbiAgICAgICAgICBpZiBAcHJvcHMub3B0aW9uc1tpdGVtXVxyXG4gICAgICAgICAgICBzd2l0Y2ggaXRlbVxyXG4gICAgICAgICAgICAgIHdoZW4gJ2luZm8nXHJcbiAgICAgICAgICAgICAgICAoc3BhbiB7Y2xhc3NOYW1lOiAnbWVudS1iYXItaW5mbyd9LCBAcHJvcHMub3B0aW9ucy5pbmZvKVxyXG4gICAgICAgICAgICAgIHdoZW4gJ2hlbHAnXHJcbiAgICAgICAgICAgICAgICAoaSB7c3R5bGU6IHtmb250U2l6ZTogXCIxM3B4XCJ9LCBjbGFzc05hbWU6ICdjbGlja2FibGUgaWNvbi1oZWxwJywgb25DbGljazogQGhlbHB9KVxyXG4gICAgICApXHJcbiAgICApXHJcbiIsIk1vZGFsID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL21vZGFsLXZpZXcnXHJcbntkaXYsIGl9ID0gUmVhY3QuRE9NXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzXHJcblxyXG4gIGRpc3BsYXlOYW1lOiAnTW9kYWxEaWFsb2cnXHJcblxyXG4gIGNsb3NlOiAtPlxyXG4gICAgQHByb3BzLmNsb3NlPygpXHJcblxyXG4gIHJlbmRlcjogLT5cclxuICAgIChNb2RhbCB7Y2xvc2U6IEBwcm9wcy5jbG9zZX0sXHJcbiAgICAgIChkaXYge2NsYXNzTmFtZTogJ21vZGFsLWRpYWxvZyd9LFxyXG4gICAgICAgIChkaXYge2NsYXNzTmFtZTogJ21vZGFsLWRpYWxvZy13cmFwcGVyJ30sXHJcbiAgICAgICAgICAoZGl2IHtjbGFzc05hbWU6ICdtb2RhbC1kaWFsb2ctdGl0bGUnfSxcclxuICAgICAgICAgICAgKGkge2NsYXNzTmFtZTogXCJtb2RhbC1kaWFsb2ctdGl0bGUtY2xvc2UgaWNvbi1jb2RhcC1leFwiLCBvbkNsaWNrOiBAY2xvc2V9KVxyXG4gICAgICAgICAgICBAcHJvcHMudGl0bGUgb3IgJ1VudGl0bGVkIERpYWxvZydcclxuICAgICAgICAgIClcclxuICAgICAgICAgIChkaXYge2NsYXNzTmFtZTogJ21vZGFsLWRpYWxvZy13b3Jrc3BhY2UnfSwgQHByb3BzLmNoaWxkcmVuKVxyXG4gICAgICAgIClcclxuICAgICAgKVxyXG4gICAgKVxyXG4iLCJNb2RhbERpYWxvZyA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9tb2RhbC1kaWFsb2ctdmlldydcclxuVGFiYmVkUGFuZWwgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vdGFiYmVkLXBhbmVsLXZpZXcnXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzXHJcblxyXG4gIGRpc3BsYXlOYW1lOiAnTW9kYWxUYWJiZWREaWFsb2dWaWV3J1xyXG5cclxuICByZW5kZXI6IC0+XHJcbiAgICAoTW9kYWxEaWFsb2cge3RpdGxlOiBAcHJvcHMudGl0bGUsIGNsb3NlOiBAcHJvcHMuY2xvc2V9LFxyXG4gICAgICAoVGFiYmVkUGFuZWwge3RhYnM6IEBwcm9wcy50YWJzLCBzZWxlY3RlZFRhYkluZGV4OiBAcHJvcHMuc2VsZWN0ZWRUYWJJbmRleH0pXHJcbiAgICApXHJcbiIsIntkaXZ9ID0gUmVhY3QuRE9NXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzXHJcblxyXG4gIGRpc3BsYXlOYW1lOiAnTW9kYWwnXHJcblxyXG4gIHdhdGNoRm9yRXNjYXBlOiAoZSkgLT5cclxuICAgIGlmIGUua2V5Q29kZSBpcyAyN1xyXG4gICAgICBAcHJvcHMuY2xvc2U/KClcclxuXHJcbiAgY29tcG9uZW50RGlkTW91bnQ6IC0+XHJcbiAgICAkKHdpbmRvdykub24gJ2tleXVwJywgQHdhdGNoRm9yRXNjYXBlXHJcblxyXG4gIGNvbXBvbmVudFdpbGxVbm1vdW50OiAtPlxyXG4gICAgJCh3aW5kb3cpLm9mZiAna2V5dXAnLCBAd2F0Y2hGb3JFc2NhcGVcclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgKGRpdiB7Y2xhc3NOYW1lOiAnbW9kYWwnfSxcclxuICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnbW9kYWwtYmFja2dyb3VuZCd9KVxyXG4gICAgICAoZGl2IHtjbGFzc05hbWU6ICdtb2RhbC1jb250ZW50J30sIEBwcm9wcy5jaGlsZHJlbilcclxuICAgIClcclxuIiwiTW9kYWxUYWJiZWREaWFsb2cgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vbW9kYWwtdGFiYmVkLWRpYWxvZy12aWV3J1xyXG5UYWJiZWRQYW5lbCA9IHJlcXVpcmUgJy4vdGFiYmVkLXBhbmVsLXZpZXcnXHJcbkNsb3VkTWV0YWRhdGEgPSAocmVxdWlyZSAnLi4vcHJvdmlkZXJzL3Byb3ZpZGVyLWludGVyZmFjZScpLkNsb3VkTWV0YWRhdGFcclxuRmlsZURpYWxvZ1RhYiA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9maWxlLWRpYWxvZy10YWItdmlldydcclxuU2VsZWN0UHJvdmlkZXJEaWFsb2dUYWIgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vc2VsZWN0LXByb3ZpZGVyLWRpYWxvZy10YWItdmlldydcclxuXHJcbnRyID0gcmVxdWlyZSAnLi4vdXRpbHMvdHJhbnNsYXRlJ1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzc1xyXG4gIGRpc3BsYXlOYW1lOiAnUHJvdmlkZXJUYWJiZWREaWFsb2cnXHJcblxyXG4gIHJlbmRlcjogIC0+XHJcbiAgICBbY2FwYWJpbGl0eSwgVGFiQ29tcG9uZW50XSA9IHN3aXRjaCBAcHJvcHMuZGlhbG9nLmFjdGlvblxyXG4gICAgICB3aGVuICdvcGVuRmlsZScgdGhlbiBbJ2xpc3QnLCBGaWxlRGlhbG9nVGFiXVxyXG4gICAgICB3aGVuICdzYXZlRmlsZScsICdzYXZlRmlsZUFzJyB0aGVuIFsnc2F2ZScsIEZpbGVEaWFsb2dUYWJdXHJcbiAgICAgIHdoZW4gJ3NlbGVjdFByb3ZpZGVyJyB0aGVuIFtudWxsLCBTZWxlY3RQcm92aWRlckRpYWxvZ1RhYl1cclxuXHJcbiAgICB0YWJzID0gW11cclxuICAgIHNlbGVjdGVkVGFiSW5kZXggPSAwXHJcbiAgICBmb3IgcHJvdmlkZXIsIGkgaW4gQHByb3BzLmNsaWVudC5zdGF0ZS5hdmFpbGFibGVQcm92aWRlcnNcclxuICAgICAgaWYgbm90IGNhcGFiaWxpdHkgb3IgcHJvdmlkZXIuY2FwYWJpbGl0aWVzW2NhcGFiaWxpdHldXHJcbiAgICAgICAgY29tcG9uZW50ID0gVGFiQ29tcG9uZW50XHJcbiAgICAgICAgICBjbGllbnQ6IEBwcm9wcy5jbGllbnRcclxuICAgICAgICAgIGRpYWxvZzogQHByb3BzLmRpYWxvZ1xyXG4gICAgICAgICAgY2xvc2U6IEBwcm9wcy5jbG9zZVxyXG4gICAgICAgICAgcHJvdmlkZXI6IHByb3ZpZGVyXHJcbiAgICAgICAgdGFicy5wdXNoIFRhYmJlZFBhbmVsLlRhYiB7a2V5OiBpLCBsYWJlbDogKHRyIHByb3ZpZGVyLmRpc3BsYXlOYW1lKSwgY29tcG9uZW50OiBjb21wb25lbnR9XHJcbiAgICAgICAgaWYgcHJvdmlkZXIgaXMgQHByb3BzLmNsaWVudC5zdGF0ZS5tZXRhZGF0YT8ucHJvdmlkZXJcclxuICAgICAgICAgIHNlbGVjdGVkVGFiSW5kZXggPSBpXHJcblxyXG4gICAgKE1vZGFsVGFiYmVkRGlhbG9nIHt0aXRsZTogKHRyIEBwcm9wcy5kaWFsb2cudGl0bGUpLCBjbG9zZTogQHByb3BzLmNsb3NlLCB0YWJzOiB0YWJzLCBzZWxlY3RlZFRhYkluZGV4OiBzZWxlY3RlZFRhYkluZGV4fSlcclxuIiwie2Rpdn0gPSBSZWFjdC5ET01cclxuXHJcblNlbGVjdFByb3ZpZGVyRGlhbG9nVGFiID0gUmVhY3QuY3JlYXRlRmFjdG9yeSBSZWFjdC5jcmVhdGVDbGFzc1xyXG4gIGRpc3BsYXlOYW1lOiAnU2VsZWN0UHJvdmlkZXJEaWFsb2dUYWInXHJcbiAgcmVuZGVyOiAtPiAoZGl2IHt9LCBcIlRPRE86IFNlbGVjdFByb3ZpZGVyRGlhbG9nVGFiOiAje0Bwcm9wcy5wcm92aWRlci5kaXNwbGF5TmFtZX1cIilcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gU2VsZWN0UHJvdmlkZXJEaWFsb2dUYWJcclxuIiwie2RpdiwgdWwsIGxpLCBhfSA9IFJlYWN0LkRPTVxyXG5cclxuY2xhc3MgVGFiSW5mb1xyXG4gIGNvbnN0cnVjdG9yOiAoc2V0dGluZ3M9e30pIC0+XHJcbiAgICB7QGxhYmVsLCBAY29tcG9uZW50fSA9IHNldHRpbmdzXHJcblxyXG5UYWIgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IFJlYWN0LmNyZWF0ZUNsYXNzXHJcblxyXG4gIGRpc3BsYXlOYW1lOiAnVGFiYmVkUGFuZWxUYWInXHJcblxyXG4gIGNsaWNrZWQ6IChlKSAtPlxyXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXHJcbiAgICBAcHJvcHMub25TZWxlY3RlZCBAcHJvcHMuaW5kZXhcclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgY2xhc3NuYW1lID0gaWYgQHByb3BzLnNlbGVjdGVkIHRoZW4gJ3RhYi1zZWxlY3RlZCcgZWxzZSAnJ1xyXG4gICAgKGxpIHtjbGFzc05hbWU6IGNsYXNzbmFtZSwgb25DbGljazogQGNsaWNrZWR9LCBAcHJvcHMubGFiZWwpXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzXHJcblxyXG4gIGRpc3BsYXlOYW1lOiAnVGFiYmVkUGFuZWxWaWV3J1xyXG5cclxuICBnZXRJbml0aWFsU3RhdGU6IC0+XHJcbiAgICBzZWxlY3RlZFRhYkluZGV4OiBAcHJvcHMuc2VsZWN0ZWRUYWJJbmRleCBvciAwXHJcblxyXG4gIHN0YXRpY3M6XHJcbiAgICBUYWI6IChzZXR0aW5ncykgLT4gbmV3IFRhYkluZm8gc2V0dGluZ3NcclxuXHJcbiAgc2VsZWN0ZWRUYWI6IChpbmRleCkgLT5cclxuICAgIEBzZXRTdGF0ZSBzZWxlY3RlZFRhYkluZGV4OiBpbmRleFxyXG5cclxuICByZW5kZXJUYWI6ICh0YWIsIGluZGV4KSAtPlxyXG4gICAgKFRhYlxyXG4gICAgICBsYWJlbDogdGFiLmxhYmVsXHJcbiAgICAgIGtleTogaW5kZXhcclxuICAgICAgaW5kZXg6IGluZGV4XHJcbiAgICAgIHNlbGVjdGVkOiAoaW5kZXggaXMgQHN0YXRlLnNlbGVjdGVkVGFiSW5kZXgpXHJcbiAgICAgIG9uU2VsZWN0ZWQ6IEBzZWxlY3RlZFRhYlxyXG4gICAgKVxyXG5cclxuICByZW5kZXJUYWJzOiAtPlxyXG4gICAgKGRpdiB7Y2xhc3NOYW1lOiAnd29ya3NwYWNlLXRhYnMnfSxcclxuICAgICAgKHVsIHt9LCBAcmVuZGVyVGFiKHRhYixpbmRleCkgZm9yIHRhYiwgaW5kZXggaW4gQHByb3BzLnRhYnMpXHJcbiAgICApXHJcblxyXG4gIHJlbmRlclNlbGVjdGVkUGFuZWw6IC0+XHJcbiAgICAoZGl2IHtjbGFzc05hbWU6ICd3b3Jrc3BhY2UtdGFiLWNvbXBvbmVudCd9LFxyXG4gICAgICBmb3IgdGFiLCBpbmRleCBpbiBAcHJvcHMudGFic1xyXG4gICAgICAgIChkaXYge1xyXG4gICAgICAgICAga2V5OiBpbmRleFxyXG4gICAgICAgICAgc3R5bGU6XHJcbiAgICAgICAgICAgIGRpc3BsYXk6IGlmIGluZGV4IGlzIEBzdGF0ZS5zZWxlY3RlZFRhYkluZGV4IHRoZW4gJ2Jsb2NrJyBlbHNlICdub25lJ1xyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIHRhYi5jb21wb25lbnRcclxuICAgICAgICApXHJcbiAgICApXHJcblxyXG4gIHJlbmRlcjogLT5cclxuICAgIChkaXYge2tleTogQHByb3BzLmtleSwgY2xhc3NOYW1lOiBcInRhYmJlZC1wYW5lbFwifSxcclxuICAgICAgQHJlbmRlclRhYnMoKVxyXG4gICAgICBAcmVuZGVyU2VsZWN0ZWRQYW5lbCgpXHJcbiAgICApXHJcbiJdfQ==
