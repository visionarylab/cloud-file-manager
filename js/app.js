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
      content: null,
      metadata: null,
      availableProviders: []
    };
    this._ui = new CloudFileManagerUI(this);
  }

  CloudFileManagerClient.prototype.setAppOptions = function(appOptions) {
    var Provider, allProviders, i, j, len, len1, provider, providerName, providerOptions, ref, ref1, ref2;
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
    ref1 = appOptions.providers;
    for (j = 0, len1 = ref1.length; j < len1; j++) {
      provider = ref1[j];
      ref2 = isString(provider) ? [provider, {}] : [provider.name, provider], providerName = ref2[0], providerOptions = ref2[1];
      if (!providerName) {
        this._error("Invalid provider spec - must either be string or object with name property");
      } else {
        if (allProviders[providerName]) {
          Provider = allProviders[providerName];
          this.state.availableProviders.push(new Provider(providerOptions));
        } else {
          this._error("Unknown provider: " + providerName);
        }
      }
    }
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
    this.state.content = null;
    this.state.metadata = null;
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
    this.state.content = content;
    this.state.metadata = metadata;
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
      providerDialog: null
    };
  },
  componentWillMount: function() {
    this.props.client.listen((function(_this) {
      return function(event) {
        var ref1;
        _this.setState({
          filename: _this.getFilename()
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
    })), div({
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFxhcHAuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxcY2xpZW50LmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHByb3ZpZGVyc1xcZG9jdW1lbnQtc3RvcmUtcHJvdmlkZXIuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxccHJvdmlkZXJzXFxnb29nbGUtZHJpdmUtcHJvdmlkZXIuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxccHJvdmlkZXJzXFxsb2NhbHN0b3JhZ2UtcHJvdmlkZXIuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxccHJvdmlkZXJzXFxwcm92aWRlci1pbnRlcmZhY2UuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxccHJvdmlkZXJzXFxyZWFkb25seS1wcm92aWRlci5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx1aS5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx1dGlsc1xcaXMtc3RyaW5nLmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHV0aWxzXFxsYW5nXFxlbi11cy5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx1dGlsc1xcdHJhbnNsYXRlLmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHZpZXdzXFxhcHAtdmlldy5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx2aWV3c1xcYXV0aG9yaXplLW1peGluLmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHZpZXdzXFxkcm9wZG93bi12aWV3LmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHZpZXdzXFxmaWxlLWRpYWxvZy10YWItdmlldy5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx2aWV3c1xcbWVudS1iYXItdmlldy5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx2aWV3c1xcbW9kYWwtZGlhbG9nLXZpZXcuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxcdmlld3NcXG1vZGFsLXRhYmJlZC1kaWFsb2ctdmlldy5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx2aWV3c1xcbW9kYWwtdmlldy5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx2aWV3c1xccHJvdmlkZXItdGFiYmVkLWRpYWxvZy12aWV3LmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHZpZXdzXFxzZWxlY3QtcHJvdmlkZXItZGlhbG9nLXRhYi12aWV3LmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHZpZXdzXFx0YWJiZWQtcGFuZWwtdmlldy5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQSxJQUFBOztBQUFBLE9BQUEsR0FBVSxLQUFLLENBQUMsYUFBTixDQUFvQixPQUFBLENBQVEsa0JBQVIsQ0FBcEI7O0FBRVYsc0JBQUEsR0FBeUIsQ0FBQyxPQUFBLENBQVEsTUFBUixDQUFELENBQWdCLENBQUM7O0FBQzFDLHNCQUFBLEdBQXlCLENBQUMsT0FBQSxDQUFRLFVBQVIsQ0FBRCxDQUFvQixDQUFDOztBQUV4QztFQUVTLDBCQUFDLE9BQUQ7SUFFWCxJQUFDLENBQUEsV0FBRCxHQUFlLHNCQUFzQixDQUFDO0lBRXRDLElBQUMsQ0FBQSxNQUFELEdBQWMsSUFBQSxzQkFBQSxDQUFBO0lBQ2QsSUFBQyxDQUFBLFVBQUQsR0FBYztFQUxIOzs2QkFPYixJQUFBLEdBQU0sU0FBQyxVQUFELEVBQWMsV0FBZDtJQUFDLElBQUMsQ0FBQSxhQUFEOztNQUFhLGNBQWM7O0lBQ2hDLElBQUMsQ0FBQSxVQUFVLENBQUMsV0FBWixHQUEwQjtXQUMxQixJQUFDLENBQUEsTUFBTSxDQUFDLGFBQVIsQ0FBc0IsSUFBQyxDQUFBLFVBQXZCO0VBRkk7OzZCQUlOLFdBQUEsR0FBYSxTQUFDLFVBQUQsRUFBYyxNQUFkO0lBQUMsSUFBQyxDQUFBLGFBQUQ7SUFDWixJQUFDLENBQUEsSUFBRCxDQUFNLElBQUMsQ0FBQSxVQUFQLEVBQW1CLElBQW5CO1dBQ0EsSUFBQyxDQUFB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KGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJBcHBWaWV3ID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL3ZpZXdzL2FwcC12aWV3J1xyXG5cclxuQ2xvdWRGaWxlTWFuYWdlclVJTWVudSA9IChyZXF1aXJlICcuL3VpJykuQ2xvdWRGaWxlTWFuYWdlclVJTWVudVxyXG5DbG91ZEZpbGVNYW5hZ2VyQ2xpZW50ID0gKHJlcXVpcmUgJy4vY2xpZW50JykuQ2xvdWRGaWxlTWFuYWdlckNsaWVudFxyXG5cclxuY2xhc3MgQ2xvdWRGaWxlTWFuYWdlclxyXG5cclxuICBjb25zdHJ1Y3RvcjogKG9wdGlvbnMpIC0+XHJcbiAgICAjIHNpbmNlIHRoZSBtb2R1bGUgZXhwb3J0cyBhbiBpbnN0YW5jZSBvZiB0aGUgY2xhc3Mgd2UgbmVlZCB0byBmYWtlIGEgY2xhc3MgdmFyaWFibGUgYXMgYW4gaW5zdGFuY2UgdmFyaWFibGVcclxuICAgIEBEZWZhdWx0TWVudSA9IENsb3VkRmlsZU1hbmFnZXJVSU1lbnUuRGVmYXVsdE1lbnVcclxuXHJcbiAgICBAY2xpZW50ID0gbmV3IENsb3VkRmlsZU1hbmFnZXJDbGllbnQoKVxyXG4gICAgQGFwcE9wdGlvbnMgPSB7fVxyXG5cclxuICBpbml0OiAoQGFwcE9wdGlvbnMsIHVzaW5nSWZyYW1lID0gZmFsc2UpIC0+XHJcbiAgICBAYXBwT3B0aW9ucy51c2luZ0lmcmFtZSA9IHVzaW5nSWZyYW1lXHJcbiAgICBAY2xpZW50LnNldEFwcE9wdGlvbnMgQGFwcE9wdGlvbnNcclxuXHJcbiAgY3JlYXRlRnJhbWU6IChAYXBwT3B0aW9ucywgZWxlbUlkKSAtPlxyXG4gICAgQGluaXQgQGFwcE9wdGlvbnMsIHRydWVcclxuICAgIEBfcmVuZGVyQXBwIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGVsZW1JZClcclxuXHJcbiAgY2xpZW50Q29ubmVjdDogKGV2ZW50Q2FsbGJhY2spIC0+XHJcbiAgICBpZiBub3QgQGFwcE9wdGlvbnMudXNpbmdJZnJhbWVcclxuICAgICAgQF9jcmVhdGVIaWRkZW5BcHAoKVxyXG4gICAgQGNsaWVudC5jb25uZWN0IGV2ZW50Q2FsbGJhY2tcclxuXHJcbiAgX2NyZWF0ZUhpZGRlbkFwcDogLT5cclxuICAgIGFuY2hvciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIilcclxuICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoYW5jaG9yKVxyXG4gICAgQF9yZW5kZXJBcHAgYW5jaG9yXHJcblxyXG4gIF9yZW5kZXJBcHA6IChhbmNob3IpIC0+XHJcbiAgICBAYXBwT3B0aW9ucy5jbGllbnQgPSBAY2xpZW50XHJcbiAgICBSZWFjdC5yZW5kZXIgKEFwcFZpZXcgQGFwcE9wdGlvbnMpLCBhbmNob3JcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gbmV3IENsb3VkRmlsZU1hbmFnZXIoKVxyXG4iLCJ0ciA9IHJlcXVpcmUgJy4vdXRpbHMvdHJhbnNsYXRlJ1xyXG5pc1N0cmluZyA9IHJlcXVpcmUgJy4vdXRpbHMvaXMtc3RyaW5nJ1xyXG5cclxuQ2xvdWRGaWxlTWFuYWdlclVJID0gKHJlcXVpcmUgJy4vdWknKS5DbG91ZEZpbGVNYW5hZ2VyVUlcclxuXHJcbkxvY2FsU3RvcmFnZVByb3ZpZGVyID0gcmVxdWlyZSAnLi9wcm92aWRlcnMvbG9jYWxzdG9yYWdlLXByb3ZpZGVyJ1xyXG5SZWFkT25seVByb3ZpZGVyID0gcmVxdWlyZSAnLi9wcm92aWRlcnMvcmVhZG9ubHktcHJvdmlkZXInXHJcbkdvb2dsZURyaXZlUHJvdmlkZXIgPSByZXF1aXJlICcuL3Byb3ZpZGVycy9nb29nbGUtZHJpdmUtcHJvdmlkZXInXHJcbkRvY3VtZW50U3RvcmVQcm92aWRlciA9IHJlcXVpcmUgJy4vcHJvdmlkZXJzL2RvY3VtZW50LXN0b3JlLXByb3ZpZGVyJ1xyXG5cclxuY2xhc3MgQ2xvdWRGaWxlTWFuYWdlckNsaWVudEV2ZW50XHJcblxyXG4gIGNvbnN0cnVjdG9yOiAoQHR5cGUsIEBkYXRhID0ge30sIEBjYWxsYmFjayA9IG51bGwsIEBzdGF0ZSA9IHt9KSAtPlxyXG5cclxuY2xhc3MgQ2xvdWRGaWxlTWFuYWdlckNsaWVudFxyXG5cclxuICBjb25zdHJ1Y3RvcjogKG9wdGlvbnMpIC0+XHJcbiAgICBAc3RhdGUgPVxyXG4gICAgICBjb250ZW50OiBudWxsXHJcbiAgICAgIG1ldGFkYXRhOiBudWxsXHJcbiAgICAgIGF2YWlsYWJsZVByb3ZpZGVyczogW11cclxuICAgIEBfdWkgPSBuZXcgQ2xvdWRGaWxlTWFuYWdlclVJIEBcclxuXHJcbiAgc2V0QXBwT3B0aW9uczogKGFwcE9wdGlvbnMgPSB7fSktPlxyXG4gICAgIyBmbHRlciBmb3IgYXZhaWxhYmxlIHByb3ZpZGVyc1xyXG4gICAgYWxsUHJvdmlkZXJzID0ge31cclxuICAgIGZvciBQcm92aWRlciBpbiBbUmVhZE9ubHlQcm92aWRlciwgTG9jYWxTdG9yYWdlUHJvdmlkZXIsIEdvb2dsZURyaXZlUHJvdmlkZXIsIERvY3VtZW50U3RvcmVQcm92aWRlcl1cclxuICAgICAgaWYgUHJvdmlkZXIuQXZhaWxhYmxlKClcclxuICAgICAgICBhbGxQcm92aWRlcnNbUHJvdmlkZXIuTmFtZV0gPSBQcm92aWRlclxyXG5cclxuICAgICMgZGVmYXVsdCB0byBhbGwgcHJvdmlkZXJzIGlmIG5vbiBzcGVjaWZpZWRcclxuICAgIGlmIG5vdCBhcHBPcHRpb25zLnByb3ZpZGVyc1xyXG4gICAgICBhcHBPcHRpb25zLnByb3ZpZGVycyA9IFtdXHJcbiAgICAgIGZvciBvd24gcHJvdmlkZXJOYW1lIG9mIGFsbFByb3ZpZGVyc1xyXG4gICAgICAgIGFwcE9wdGlvbnMucHJvdmlkZXJzLnB1c2ggcHJvdmlkZXJOYW1lXHJcblxyXG4gICAgIyBjaGVjayB0aGUgcHJvdmlkZXJzXHJcbiAgICBmb3IgcHJvdmlkZXIgaW4gYXBwT3B0aW9ucy5wcm92aWRlcnNcclxuICAgICAgW3Byb3ZpZGVyTmFtZSwgcHJvdmlkZXJPcHRpb25zXSA9IGlmIGlzU3RyaW5nIHByb3ZpZGVyIHRoZW4gW3Byb3ZpZGVyLCB7fV0gZWxzZSBbcHJvdmlkZXIubmFtZSwgcHJvdmlkZXJdXHJcbiAgICAgIGlmIG5vdCBwcm92aWRlck5hbWVcclxuICAgICAgICBAX2Vycm9yIFwiSW52YWxpZCBwcm92aWRlciBzcGVjIC0gbXVzdCBlaXRoZXIgYmUgc3RyaW5nIG9yIG9iamVjdCB3aXRoIG5hbWUgcHJvcGVydHlcIlxyXG4gICAgICBlbHNlXHJcbiAgICAgICAgaWYgYWxsUHJvdmlkZXJzW3Byb3ZpZGVyTmFtZV1cclxuICAgICAgICAgIFByb3ZpZGVyID0gYWxsUHJvdmlkZXJzW3Byb3ZpZGVyTmFtZV1cclxuICAgICAgICAgIEBzdGF0ZS5hdmFpbGFibGVQcm92aWRlcnMucHVzaCBuZXcgUHJvdmlkZXIgcHJvdmlkZXJPcHRpb25zXHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgQF9lcnJvciBcIlVua25vd24gcHJvdmlkZXI6ICN7cHJvdmlkZXJOYW1lfVwiXHJcblxyXG4gICAgQF91aS5pbml0IGFwcE9wdGlvbnMudWlcclxuXHJcbiAgIyBzaW5nbGUgY2xpZW50IC0gdXNlZCBieSB0aGUgY2xpZW50IGFwcCB0byByZWdpc3RlciBhbmQgcmVjZWl2ZSBjYWxsYmFjayBldmVudHNcclxuICBjb25uZWN0OiAoQGV2ZW50Q2FsbGJhY2spIC0+XHJcbiAgICBAX2V2ZW50ICdjb25uZWN0ZWQnLCB7Y2xpZW50OiBAfVxyXG5cclxuICAjIHNpbmdsZSBsaXN0ZW5lciAtIHVzZWQgYnkgdGhlIFJlYWN0IG1lbnUgdmlhIHRvIHdhdGNoIGNsaWVudCBzdGF0ZSBjaGFuZ2VzXHJcbiAgbGlzdGVuOiAoQGxpc3RlbmVyQ2FsbGJhY2spIC0+XHJcblxyXG4gIGFwcGVuZE1lbnVJdGVtOiAoaXRlbSkgLT5cclxuICAgIEBfdWkuYXBwZW5kTWVudUl0ZW0gaXRlbVxyXG5cclxuICBzZXRNZW51QmFySW5mbzogKGluZm8pIC0+XHJcbiAgICBAX3VpLnNldE1lbnVCYXJJbmZvIGluZm9cclxuXHJcbiAgbmV3RmlsZTogKGNhbGxiYWNrID0gbnVsbCkgLT5cclxuICAgIEBzdGF0ZS5jb250ZW50ID0gbnVsbFxyXG4gICAgQHN0YXRlLm1ldGFkYXRhID0gbnVsbFxyXG4gICAgQF9ldmVudCAnbmV3ZWRGaWxlJ1xyXG5cclxuICBuZXdGaWxlRGlhbG9nOiAoY2FsbGJhY2sgPSBudWxsKSAtPlxyXG4gICAgIyBmb3Igbm93IGp1c3QgY2FsbCBuZXcgLSBsYXRlciB3ZSBjYW4gYWRkIGNoYW5nZSBub3RpZmljYXRpb24gZnJvbSB0aGUgY2xpZW50IHNvIHdlIGNhbiBwcm9tcHQgZm9yIFwiQXJlIHlvdSBzdXJlP1wiXHJcbiAgICBAbmV3RmlsZSgpXHJcblxyXG4gIG9wZW5GaWxlOiAobWV0YWRhdGEsIGNhbGxiYWNrID0gbnVsbCkgLT5cclxuICAgIGlmIG1ldGFkYXRhPy5wcm92aWRlcj8uY2FuICdsb2FkJ1xyXG4gICAgICBtZXRhZGF0YS5wcm92aWRlci5sb2FkIG1ldGFkYXRhLCAoZXJyLCBjb250ZW50KSA9PlxyXG4gICAgICAgIHJldHVybiBAX2Vycm9yKGVycikgaWYgZXJyXHJcbiAgICAgICAgQF9maWxlQ2hhbmdlZCAnb3BlbmVkRmlsZScsIGNvbnRlbnQsIG1ldGFkYXRhXHJcbiAgICAgICAgY2FsbGJhY2s/IGNvbnRlbnQsIG1ldGFkYXRhXHJcbiAgICBlbHNlXHJcbiAgICAgIEBvcGVuRmlsZURpYWxvZyBjYWxsYmFja1xyXG5cclxuICBvcGVuRmlsZURpYWxvZzogKGNhbGxiYWNrID0gbnVsbCkgLT5cclxuICAgIEBfdWkub3BlbkZpbGVEaWFsb2cgKG1ldGFkYXRhKSA9PlxyXG4gICAgICBAb3BlbkZpbGUgbWV0YWRhdGEsIGNhbGxiYWNrXHJcblxyXG4gIHNhdmU6IChjYWxsYmFjayA9IG51bGwpIC0+XHJcbiAgICBAX2V2ZW50ICdnZXRDb250ZW50Jywge30sIChjb250ZW50KSA9PlxyXG4gICAgICBAc2F2ZUNvbnRlbnQgY29udGVudCwgY2FsbGJhY2tcclxuXHJcbiAgc2F2ZUNvbnRlbnQ6IChjb250ZW50LCBjYWxsYmFjayA9IG51bGwpIC0+XHJcbiAgICBpZiBAc3RhdGUubWV0YWRhdGFcclxuICAgICAgQHNhdmVGaWxlIGNvbnRlbnQsIEBzdGF0ZS5tZXRhZGF0YSwgY2FsbGJhY2tcclxuICAgIGVsc2VcclxuICAgICAgQHNhdmVGaWxlRGlhbG9nIGNvbnRlbnQsIGNhbGxiYWNrXHJcblxyXG4gIHNhdmVGaWxlOiAoY29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrID0gbnVsbCkgLT5cclxuICAgIGlmIG1ldGFkYXRhPy5wcm92aWRlcj8uY2FuICdzYXZlJ1xyXG4gICAgICBtZXRhZGF0YS5wcm92aWRlci5zYXZlIGNvbnRlbnQsIG1ldGFkYXRhLCAoZXJyKSA9PlxyXG4gICAgICAgIHJldHVybiBAX2Vycm9yKGVycikgaWYgZXJyXHJcbiAgICAgICAgQF9maWxlQ2hhbmdlZCAnc2F2ZWRGaWxlJywgY29udGVudCwgbWV0YWRhdGFcclxuICAgICAgICBjYWxsYmFjaz8gY29udGVudCwgbWV0YWRhdGFcclxuICAgIGVsc2VcclxuICAgICAgQHNhdmVGaWxlRGlhbG9nIGNvbnRlbnQsIGNhbGxiYWNrXHJcblxyXG4gIHNhdmVGaWxlRGlhbG9nOiAoY29udGVudCA9IG51bGwsIGNhbGxiYWNrID0gbnVsbCkgLT5cclxuICAgIEBfdWkuc2F2ZUZpbGVEaWFsb2cgKG1ldGFkYXRhKSA9PlxyXG4gICAgICBAX2RpYWxvZ1NhdmUgY29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrXHJcblxyXG4gIHNhdmVGaWxlQXNEaWFsb2c6IChjb250ZW50ID0gbnVsbCwgY2FsbGJhY2sgPSBudWxsKSAtPlxyXG4gICAgQF91aS5zYXZlRmlsZUFzRGlhbG9nIChtZXRhZGF0YSkgPT5cclxuICAgICAgQF9kaWFsb2dTYXZlIGNvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFja1xyXG5cclxuICBfZGlhbG9nU2F2ZTogKGNvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIGlmIGNvbnRlbnQgaXNudCBudWxsXHJcbiAgICAgIEBzYXZlRmlsZSBjb250ZW50LCBtZXRhZGF0YSwgY2FsbGJhY2tcclxuICAgIGVsc2VcclxuICAgICAgQF9ldmVudCAnZ2V0Q29udGVudCcsIHt9LCAoY29udGVudCkgPT5cclxuICAgICAgICBAc2F2ZUZpbGUgY29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrXHJcblxyXG4gIF9lcnJvcjogKG1lc3NhZ2UpIC0+XHJcbiAgICAjIGZvciBub3cgYW4gYWxlcnRcclxuICAgIGFsZXJ0IG1lc3NhZ2VcclxuXHJcbiAgX2ZpbGVDaGFuZ2VkOiAodHlwZSwgY29udGVudCwgbWV0YWRhdGEpIC0+XHJcbiAgICBAc3RhdGUuY29udGVudCA9IGNvbnRlbnRcclxuICAgIEBzdGF0ZS5tZXRhZGF0YSA9IG1ldGFkYXRhXHJcbiAgICBAX2V2ZW50IHR5cGUsIHtjb250ZW50OiBjb250ZW50LCBtZXRhZGF0YTogbWV0YWRhdGF9XHJcblxyXG4gIF9ldmVudDogKHR5cGUsIGRhdGEgPSB7fSwgZXZlbnRDYWxsYmFjayA9IG51bGwpIC0+XHJcbiAgICBldmVudCA9IG5ldyBDbG91ZEZpbGVNYW5hZ2VyQ2xpZW50RXZlbnQgdHlwZSwgZGF0YSwgZXZlbnRDYWxsYmFjaywgQHN0YXRlXHJcbiAgICBAZXZlbnRDYWxsYmFjaz8gZXZlbnRcclxuICAgIEBsaXN0ZW5lckNhbGxiYWNrPyBldmVudFxyXG5cclxubW9kdWxlLmV4cG9ydHMgPVxyXG4gIENsb3VkRmlsZU1hbmFnZXJDbGllbnRFdmVudDogQ2xvdWRGaWxlTWFuYWdlckNsaWVudEV2ZW50XHJcbiAgQ2xvdWRGaWxlTWFuYWdlckNsaWVudDogQ2xvdWRGaWxlTWFuYWdlckNsaWVudFxyXG4iLCJ7ZGl2LCBidXR0b259ID0gUmVhY3QuRE9NXHJcblxyXG5hdXRob3JpemVVcmwgID0gXCJodHRwOi8vZG9jdW1lbnQtc3RvcmUuaGVyb2t1YXBwLmNvbS91c2VyL2F1dGhlbnRpY2F0ZVwiXHJcbmNoZWNrTG9naW5VcmwgPSBcImh0dHA6Ly9kb2N1bWVudC1zdG9yZS5oZXJva3VhcHAuY29tL3VzZXIvaW5mb1wiXHJcbmxpc3RVcmwgPSBcImh0dHA6Ly9kb2N1bWVudC1zdG9yZS5oZXJva3VhcHAuY29tL2RvY3VtZW50L2FsbFwiXHJcblxyXG50ciA9IHJlcXVpcmUgJy4uL3V0aWxzL3RyYW5zbGF0ZSdcclxuaXNTdHJpbmcgPSByZXF1aXJlICcuLi91dGlscy9pcy1zdHJpbmcnXHJcblxyXG5Qcm92aWRlckludGVyZmFjZSA9IChyZXF1aXJlICcuL3Byb3ZpZGVyLWludGVyZmFjZScpLlByb3ZpZGVySW50ZXJmYWNlXHJcbkNsb3VkTWV0YWRhdGEgPSAocmVxdWlyZSAnLi9wcm92aWRlci1pbnRlcmZhY2UnKS5DbG91ZE1ldGFkYXRhXHJcblxyXG5Eb2N1bWVudFN0b3JlQXV0aG9yaXphdGlvbkRpYWxvZyA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgUmVhY3QuY3JlYXRlQ2xhc3NcclxuICBkaXNwbGF5TmFtZTogJ0RvY3VtZW50U3RvcmVBdXRob3JpemF0aW9uRGlhbG9nJ1xyXG5cclxuICBhdXRoZW50aWNhdGU6IC0+XHJcbiAgICBAcHJvcHMucHJvdmlkZXIuYXV0aG9yaXplKClcclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgKGRpdiB7fSxcclxuICAgICAgKGJ1dHRvbiB7b25DbGljazogQGF1dGhlbnRpY2F0ZX0sICdBdXRob3JpemF0aW9uIE5lZWRlZCcpXHJcbiAgICApXHJcblxyXG5jbGFzcyBEb2N1bWVudFN0b3JlUHJvdmlkZXIgZXh0ZW5kcyBQcm92aWRlckludGVyZmFjZVxyXG5cclxuICBjb25zdHJ1Y3RvcjogKEBvcHRpb25zID0ge30pIC0+XHJcbiAgICBzdXBlclxyXG4gICAgICBuYW1lOiBEb2N1bWVudFN0b3JlUHJvdmlkZXIuTmFtZVxyXG4gICAgICBkaXNwbGF5TmFtZTogQG9wdGlvbnMuZGlzcGxheU5hbWUgb3IgKHRyICd+UFJPVklERVIuRE9DVU1FTlRfU1RPUkUnKVxyXG4gICAgICBjYXBhYmlsaXRpZXM6XHJcbiAgICAgICAgc2F2ZTogdHJ1ZVxyXG4gICAgICAgIGxvYWQ6IHRydWVcclxuICAgICAgICBsaXN0OiB0cnVlXHJcblxyXG4gIEBOYW1lOiAnZG9jdW1lbnRTdG9yZSdcclxuXHJcbiAgYXV0aG9yaXplZDogKEBhdXRoQ2FsbGJhY2spIC0+XHJcblxyXG4gIGF1dGhvcml6ZTogLT5cclxuICAgIEBfc2hvd0xvZ2luV2luZG93KClcclxuICAgIEBfY2hlY2tMb2dpbigpXHJcblxyXG4gIF9sb2dpblN1Y2Nlc3NmdWw6IChkYXRhKSAtPlxyXG4gICAgaWYgQF9sb2dpbldpbmRvdyB0aGVuIEBfbG9naW5XaW5kb3cuY2xvc2UoKVxyXG4gICAgQGF1dGhDYWxsYmFjayB0cnVlXHJcblxyXG4gIF9jaGVja0xvZ2luOiAtPlxyXG4gICAgcHJvdmlkZXIgPSBAXHJcbiAgICAkLmFqYXhcclxuICAgICAgZGF0YVR5cGU6ICdqc29uJ1xyXG4gICAgICB1cmw6IGNoZWNrTG9naW5VcmxcclxuICAgICAgeGhyRmllbGRzOlxyXG4gICAgICAgIHdpdGhDcmVkZW50aWFsczogdHJ1ZVxyXG4gICAgICBzdWNjZXNzOiAoZGF0YSkgLT5cclxuICAgICAgICBwcm92aWRlci5fbG9naW5TdWNjZXNzZnVsKGRhdGEpXHJcbiAgICAgIGVycm9yOiAtPlxyXG4gICAgICAgICMgbm90aGluZyB5ZXRcclxuXHJcbiAgX2xvZ2luV2luZG93OiBudWxsXHJcblxyXG4gIF9zaG93TG9naW5XaW5kb3c6IC0+XHJcbiAgICBpZiBAX2xvZ2luV2luZG93IGFuZCBub3QgQF9sb2dpbldpbmRvdy5jbG9zZWRcclxuICAgICAgQF9sb2dpbldpbmRvdy5mb2N1cygpXHJcbiAgICBlbHNlXHJcblxyXG4gICAgICBjb21wdXRlU2NyZWVuTG9jYXRpb24gPSAodywgaCkgLT5cclxuICAgICAgICBzY3JlZW5MZWZ0ID0gd2luZG93LnNjcmVlbkxlZnQgb3Igc2NyZWVuLmxlZnRcclxuICAgICAgICBzY3JlZW5Ub3AgID0gd2luZG93LnNjcmVlblRvcCAgb3Igc2NyZWVuLnRvcFxyXG4gICAgICAgIHdpZHRoICA9IHdpbmRvdy5pbm5lcldpZHRoICBvciBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xpZW50V2lkdGggIG9yIHNjcmVlbi53aWR0aFxyXG4gICAgICAgIGhlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodCBvciBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xpZW50SGVpZ2h0IG9yIHNjcmVlbi5oZWlnaHRcclxuXHJcbiAgICAgICAgbGVmdCA9ICgod2lkdGggLyAyKSAtICh3IC8gMikpICsgc2NyZWVuTGVmdFxyXG4gICAgICAgIHRvcCA9ICgoaGVpZ2h0IC8gMikgLSAoaCAvIDIpKSArIHNjcmVlblRvcFxyXG4gICAgICAgIHJldHVybiB7bGVmdCwgdG9wfVxyXG5cclxuICAgICAgd2lkdGggPSAxMDAwXHJcbiAgICAgIGhlaWdodCA9IDQ4MFxyXG4gICAgICBwb3NpdGlvbiA9IGNvbXB1dGVTY3JlZW5Mb2NhdGlvbiB3aWR0aCwgaGVpZ2h0XHJcbiAgICAgIHdpbmRvd0ZlYXR1cmVzID0gW1xyXG4gICAgICAgICd3aWR0aD0nICsgd2lkdGhcclxuICAgICAgICAnaGVpZ2h0PScgKyBoZWlnaHRcclxuICAgICAgICAndG9wPScgKyBwb3NpdGlvbi50b3Agb3IgMjAwXHJcbiAgICAgICAgJ2xlZnQ9JyArIHBvc2l0aW9uLmxlZnQgb3IgMjAwXHJcbiAgICAgICAgJ2RlcGVuZGVudD15ZXMnXHJcbiAgICAgICAgJ3Jlc2l6YWJsZT1ubydcclxuICAgICAgICAnbG9jYXRpb249bm8nXHJcbiAgICAgICAgJ2RpYWxvZz15ZXMnXHJcbiAgICAgICAgJ21lbnViYXI9bm8nXHJcbiAgICAgIF1cclxuXHJcbiAgICAgIEBfbG9naW5XaW5kb3cgPSB3aW5kb3cub3BlbihhdXRob3JpemVVcmwsICdhdXRoJywgd2luZG93RmVhdHVyZXMuam9pbigpKVxyXG5cclxuICAgICAgcG9sbEFjdGlvbiA9ID0+XHJcbiAgICAgICAgdHJ5XHJcbiAgICAgICAgICBocmVmID0gQF9sb2dpbldpbmRvdy5sb2NhdGlvbi5ocmVmXHJcbiAgICAgICAgICBpZiAoaHJlZiBpcyB3aW5kb3cubG9jYXRpb24uaHJlZilcclxuICAgICAgICAgICAgY2xlYXJJbnRlcnZhbCBwb2xsXHJcbiAgICAgICAgICAgIEBfbG9naW5XaW5kb3cuY2xvc2UoKVxyXG4gICAgICAgICAgICBAX2NoZWNrTG9naW4oKVxyXG4gICAgICAgIGNhdGNoIGVcclxuICAgICAgICAgIGNvbnNvbGUubG9nIGVcclxuXHJcbiAgICAgIHBvbGwgPSBzZXRJbnRlcnZhbCBwb2xsQWN0aW9uLCAyMDBcclxuXHJcbiAgcmVuZGVyQXV0aG9yaXphdGlvbkRpYWxvZzogLT5cclxuICAgIChEb2N1bWVudFN0b3JlQXV0aG9yaXphdGlvbkRpYWxvZyB7cHJvdmlkZXI6IEAsIGF1dGhDYWxsYmFjazogQGF1dGhDYWxsYmFja30pXHJcblxyXG4gIGxpc3Q6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICBwcm92aWRlciA9IEBcclxuICAgICQuYWpheFxyXG4gICAgICBkYXRhVHlwZTogJ2pzb24nXHJcbiAgICAgIHVybDogbGlzdFVybFxyXG4gICAgICB4aHJGaWVsZHM6XHJcbiAgICAgICAgd2l0aENyZWRlbnRpYWxzOiB0cnVlXHJcbiAgICAgIHN1Y2Nlc3M6IChkYXRhKSAtPlxyXG4gICAgICAgIGxpc3QgPSBbXVxyXG4gICAgICAgIHBhdGggPSBtZXRhZGF0YT8ucGF0aCBvciAnJ1xyXG4gICAgICAgIGZvciBvd24ga2V5IG9mIHdpbmRvdy5sb2NhbFN0b3JhZ2VcclxuICAgICAgICAgIGxpc3QucHVzaCBuZXcgQ2xvdWRNZXRhZGF0YVxyXG4gICAgICAgICAgICBuYW1lOiBrZXlcclxuICAgICAgICAgICAgcGF0aDogXCIje3BhdGh9LyN7bmFtZX1cIlxyXG4gICAgICAgICAgICB0eXBlOiBDbG91ZE1ldGFkYXRhLkZpbGVcclxuICAgICAgICAgICAgcHJvdmlkZXI6IHByb3ZpZGVyXHJcbiAgICAgICAgY2FsbGJhY2sgbnVsbCwgbGlzdFxyXG4gICAgICBlcnJvcjogLT5cclxuICAgICAgICBjYWxsYmFjayBudWxsLCBbXVxyXG5cclxuICBsb2FkOiAobWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG5cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gRG9jdW1lbnRTdG9yZVByb3ZpZGVyXHJcbiIsIntkaXZ9ID0gUmVhY3QuRE9NXHJcblxyXG50ciA9IHJlcXVpcmUgJy4uL3V0aWxzL3RyYW5zbGF0ZSdcclxuaXNTdHJpbmcgPSByZXF1aXJlICcuLi91dGlscy9pcy1zdHJpbmcnXHJcblxyXG5Qcm92aWRlckludGVyZmFjZSA9IChyZXF1aXJlICcuL3Byb3ZpZGVyLWludGVyZmFjZScpLlByb3ZpZGVySW50ZXJmYWNlXHJcbkNsb3VkTWV0YWRhdGEgPSAocmVxdWlyZSAnLi9wcm92aWRlci1pbnRlcmZhY2UnKS5DbG91ZE1ldGFkYXRhXHJcblxyXG57YnV0dG9ufSA9IFJlYWN0LkRPTVxyXG5cclxuR29vZ2xlRHJpdmVBdXRob3JpemF0aW9uRGlhbG9nID0gUmVhY3QuY3JlYXRlRmFjdG9yeSBSZWFjdC5jcmVhdGVDbGFzc1xyXG4gIGRpc3BsYXlOYW1lOiAnR29vZ2xlRHJpdmVBdXRob3JpemF0aW9uRGlhbG9nJ1xyXG5cclxuICBnZXRJbml0aWFsU3RhdGU6IC0+XHJcbiAgICBsb2FkZWRHQVBJOiBmYWxzZVxyXG5cclxuICBjb21wb25lbnRXaWxsTW91bnQ6IC0+XHJcbiAgICBAcHJvcHMucHJvdmlkZXIuX2xvYWRlZEdBUEkgPT5cclxuICAgICAgQHNldFN0YXRlIGxvYWRlZEdBUEk6IHRydWVcclxuXHJcbiAgYXV0aGVudGljYXRlOiAtPlxyXG4gICAgQHByb3BzLnByb3ZpZGVyLmF1dGhvcml6ZSBHb29nbGVEcml2ZVByb3ZpZGVyLlNIT1dfUE9QVVBcclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgKGRpdiB7fSxcclxuICAgICAgaWYgQHN0YXRlLmxvYWRlZEdBUElcclxuICAgICAgICAoYnV0dG9uIHtvbkNsaWNrOiBAYXV0aGVudGljYXRlfSwgJ0F1dGhvcml6YXRpb24gTmVlZGVkJylcclxuICAgICAgZWxzZVxyXG4gICAgICAgICdXYWl0aW5nIGZvciB0aGUgR29vZ2xlIENsaWVudCBBUEkgdG8gbG9hZC4uLidcclxuICAgIClcclxuXHJcbmNsYXNzIEdvb2dsZURyaXZlUHJvdmlkZXIgZXh0ZW5kcyBQcm92aWRlckludGVyZmFjZVxyXG5cclxuICBjb25zdHJ1Y3RvcjogKEBvcHRpb25zID0ge30pIC0+XHJcbiAgICBzdXBlclxyXG4gICAgICBuYW1lOiBHb29nbGVEcml2ZVByb3ZpZGVyLk5hbWVcclxuICAgICAgZGlzcGxheU5hbWU6IEBvcHRpb25zLmRpc3BsYXlOYW1lIG9yICh0ciAnflBST1ZJREVSLkdPT0dMRV9EUklWRScpXHJcbiAgICAgIGNhcGFiaWxpdGllczpcclxuICAgICAgICBzYXZlOiB0cnVlXHJcbiAgICAgICAgbG9hZDogdHJ1ZVxyXG4gICAgICAgIGxpc3Q6IHRydWVcclxuICAgICAgICByZW1vdmU6IHRydWVcclxuICAgIEBhdXRoVG9rZW4gPSBudWxsXHJcbiAgICBAY2xpZW50SWQgPSBAb3B0aW9ucy5jbGllbnRJZFxyXG4gICAgaWYgbm90IEBjbGllbnRJZFxyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IgJ01pc3NpbmcgcmVxdWlyZWQgY2xpZW50SWQgaW4gZ29vZ2xEcml2ZSBwcm92aWRlciBvcHRpb25zJ1xyXG4gICAgQG1pbWVUeXBlID0gQG9wdGlvbnMubWltZVR5cGUgb3IgXCJ0ZXh0L3BsYWluXCJcclxuICAgIEBfbG9hZEdBUEkoKVxyXG5cclxuICBATmFtZTogJ2dvb2dsZURyaXZlJ1xyXG5cclxuICAjIGFsaWFzZXMgZm9yIGJvb2xlYW4gcGFyYW1ldGVyIHRvIGF1dGhvcml6ZVxyXG4gIEBJTU1FRElBVEUgPSB0cnVlXHJcbiAgQFNIT1dfUE9QVVAgPSBmYWxzZVxyXG5cclxuICBhdXRob3JpemVkOiAoQGF1dGhDYWxsYmFjaykgLT5cclxuICAgIGlmIEBhdXRoVG9rZW5cclxuICAgICAgQGF1dGhDYWxsYmFjayB0cnVlXHJcbiAgICBlbHNlXHJcbiAgICAgIEBhdXRob3JpemUgR29vZ2xlRHJpdmVQcm92aWRlci5JTU1FRElBVEVcclxuXHJcbiAgYXV0aG9yaXplOiAoaW1tZWRpYXRlKSAtPlxyXG4gICAgQF9sb2FkZWRHQVBJID0+XHJcbiAgICAgIGFyZ3MgPVxyXG4gICAgICAgIGNsaWVudF9pZDogQGNsaWVudElkXHJcbiAgICAgICAgc2NvcGU6ICdodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS9hdXRoL2RyaXZlJ1xyXG4gICAgICAgIGltbWVkaWF0ZTogaW1tZWRpYXRlXHJcbiAgICAgIGdhcGkuYXV0aC5hdXRob3JpemUgYXJncywgKGF1dGhUb2tlbikgPT5cclxuICAgICAgICBAYXV0aFRva2VuID0gaWYgYXV0aFRva2VuIGFuZCBub3QgYXV0aFRva2VuLmVycm9yIHRoZW4gYXV0aFRva2VuIGVsc2UgbnVsbFxyXG4gICAgICAgIEBhdXRoQ2FsbGJhY2sgQGF1dGhUb2tlbiBpc250IG51bGxcclxuXHJcbiAgcmVuZGVyQXV0aG9yaXphdGlvbkRpYWxvZzogLT5cclxuICAgIChHb29nbGVEcml2ZUF1dGhvcml6YXRpb25EaWFsb2cge3Byb3ZpZGVyOiBAfSlcclxuXHJcbiAgc2F2ZTogIChjb250ZW50LCBtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICBAX2xvYWRlZEdBUEkgPT5cclxuICAgICAgQF9zZW5kRmlsZSBjb250ZW50LCBtZXRhZGF0YSwgY2FsbGJhY2tcclxuXHJcbiAgbG9hZDogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIEBfbG9hZGVkR0FQSSA9PlxyXG4gICAgICByZXF1ZXN0ID0gZ2FwaS5jbGllbnQuZHJpdmUuZmlsZXMuZ2V0XHJcbiAgICAgICAgZmlsZUlkOiBtZXRhZGF0YS5wcm92aWRlckRhdGEuaWRcclxuICAgICAgcmVxdWVzdC5leGVjdXRlIChmaWxlKSA9PlxyXG4gICAgICAgIGlmIGZpbGU/LmRvd25sb2FkVXJsXHJcbiAgICAgICAgICBAX2Rvd25sb2FkRnJvbVVybCBmaWxlLmRvd25sb2FkVXJsLCBAYXV0aFRva2VuLCBjYWxsYmFja1xyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgIGNhbGxiYWNrICdVbmFibGUgdG8gZ2V0IGRvd25sb2FkIHVybCdcclxuXHJcbiAgbGlzdDogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIEBfbG9hZGVkR0FQSSA9PlxyXG4gICAgICByZXF1ZXN0ID0gZ2FwaS5jbGllbnQuZHJpdmUuZmlsZXMubGlzdFxyXG4gICAgICAgIHE6IFwibWltZVR5cGUgPSAnI3tAbWltZVR5cGV9J1wiXHJcbiAgICAgIHJlcXVlc3QuZXhlY3V0ZSAocmVzdWx0KSA9PlxyXG4gICAgICAgIHJldHVybiBjYWxsYmFjaygnVW5hYmxlIHRvIGxpc3QgZmlsZXMnKSBpZiBub3QgcmVzdWx0XHJcbiAgICAgICAgbGlzdCA9IFtdXHJcbiAgICAgICAgZm9yIGl0ZW0gaW4gcmVzdWx0Py5pdGVtc1xyXG4gICAgICAgICAgIyBUT0RPOiBmb3Igbm93IGRvbid0IGFsbG93IGZvbGRlcnNcclxuICAgICAgICAgIGlmIGl0ZW0ubWltZVR5cGUgaXNudCAnYXBwbGljYXRpb24vdm5kLmdvb2dsZS1hcHBzLmZvbGRlcidcclxuICAgICAgICAgICAgbGlzdC5wdXNoIG5ldyBDbG91ZE1ldGFkYXRhXHJcbiAgICAgICAgICAgICAgbmFtZTogaXRlbS50aXRsZVxyXG4gICAgICAgICAgICAgIHBhdGg6IFwiXCJcclxuICAgICAgICAgICAgICB0eXBlOiBpZiBpdGVtLm1pbWVUeXBlIGlzICdhcHBsaWNhdGlvbi92bmQuZ29vZ2xlLWFwcHMuZm9sZGVyJyB0aGVuIENsb3VkTWV0YWRhdGEuRm9sZGVyIGVsc2UgQ2xvdWRNZXRhZGF0YS5GaWxlXHJcbiAgICAgICAgICAgICAgcHJvdmlkZXI6IEBcclxuICAgICAgICAgICAgICBwcm92aWRlckRhdGE6XHJcbiAgICAgICAgICAgICAgICBpZDogaXRlbS5pZFxyXG4gICAgICAgIGxpc3Quc29ydCAoYSwgYikgLT5cclxuICAgICAgICAgIGxvd2VyQSA9IGEubmFtZS50b0xvd2VyQ2FzZSgpXHJcbiAgICAgICAgICBsb3dlckIgPSBiLm5hbWUudG9Mb3dlckNhc2UoKVxyXG4gICAgICAgICAgcmV0dXJuIC0xIGlmIGxvd2VyQSA8IGxvd2VyQlxyXG4gICAgICAgICAgcmV0dXJuIDEgaWYgbG93ZXJBID4gbG93ZXJCXHJcbiAgICAgICAgICByZXR1cm4gMFxyXG4gICAgICAgIGNhbGxiYWNrIG51bGwsIGxpc3RcclxuXHJcbiAgcmVtb3ZlOiAobWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgQF9sb2FkZWRHQVBJIC0+XHJcbiAgICAgIHJlcXVlc3QgPSBnYXBpLmNsaWVudC5kcml2ZS5maWxlcy5kZWxldGVcclxuICAgICAgICBmaWxlSWQ6IG1ldGFkYXRhLnByb3ZpZGVyRGF0YS5pZFxyXG4gICAgICByZXF1ZXN0LmV4ZWN1dGUgKHJlc3VsdCkgLT5cclxuICAgICAgICBjYWxsYmFjaz8gcmVzdWx0Py5lcnJvciBvciBudWxsXHJcblxyXG4gIF9sb2FkR0FQSTogLT5cclxuICAgIGlmIG5vdCB3aW5kb3cuX0xvYWRpbmdHQVBJXHJcbiAgICAgIHdpbmRvdy5fTG9hZGluZ0dBUEkgPSB0cnVlXHJcbiAgICAgIHdpbmRvdy5fR0FQSU9uTG9hZCA9IC0+XHJcbiAgICAgICAgQHdpbmRvdy5fTG9hZGVkR0FQSSA9IHRydWVcclxuICAgICAgc2NyaXB0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCAnc2NyaXB0J1xyXG4gICAgICBzY3JpcHQuc3JjID0gJ2h0dHBzOi8vYXBpcy5nb29nbGUuY29tL2pzL2NsaWVudC5qcz9vbmxvYWQ9X0dBUElPbkxvYWQnXHJcbiAgICAgIGRvY3VtZW50LmhlYWQuYXBwZW5kQ2hpbGQgc2NyaXB0XHJcblxyXG4gIF9sb2FkZWRHQVBJOiAoY2FsbGJhY2spIC0+XHJcbiAgICBzZWxmID0gQFxyXG4gICAgY2hlY2sgPSAtPlxyXG4gICAgICBpZiB3aW5kb3cuX0xvYWRlZEdBUElcclxuICAgICAgICBnYXBpLmNsaWVudC5sb2FkICdkcml2ZScsICd2MicsIC0+XHJcbiAgICAgICAgICBjYWxsYmFjay5jYWxsIHNlbGZcclxuICAgICAgZWxzZVxyXG4gICAgICAgIHNldFRpbWVvdXQgY2hlY2ssIDEwXHJcbiAgICBzZXRUaW1lb3V0IGNoZWNrLCAxMFxyXG5cclxuICBfZG93bmxvYWRGcm9tVXJsOiAodXJsLCB0b2tlbiwgY2FsbGJhY2spIC0+XHJcbiAgICB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKVxyXG4gICAgeGhyLm9wZW4gJ0dFVCcsIHVybFxyXG4gICAgaWYgdG9rZW5cclxuICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIgJ0F1dGhvcml6YXRpb24nLCBcIkJlYXJlciAje3Rva2VuLmFjY2Vzc190b2tlbn1cIlxyXG4gICAgeGhyLm9ubG9hZCA9IC0+XHJcbiAgICAgIGNhbGxiYWNrIG51bGwsIHhoci5yZXNwb25zZVRleHRcclxuICAgIHhoci5vbmVycm9yID0gLT5cclxuICAgICAgY2FsbGJhY2sgXCJVbmFibGUgdG8gZG93bmxvYWQgI3t1cmx9XCJcclxuICAgIHhoci5zZW5kKClcclxuXHJcbiAgX3NlbmRGaWxlOiAoY29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgYm91bmRhcnkgPSAnLS0tLS0tLTMxNDE1OTI2NTM1ODk3OTMyMzg0NidcclxuICAgIGhlYWRlciA9IEpTT04uc3RyaW5naWZ5XHJcbiAgICAgIHRpdGxlOiBtZXRhZGF0YS5uYW1lXHJcbiAgICAgIG1pbWVUeXBlOiBAbWltZVR5cGVcclxuXHJcbiAgICBbbWV0aG9kLCBwYXRoXSA9IGlmIG1ldGFkYXRhLnByb3ZpZGVyRGF0YT8uaWRcclxuICAgICAgWydQVVQnLCBcIi91cGxvYWQvZHJpdmUvdjIvZmlsZXMvI3ttZXRhZGF0YS5wcm92aWRlckRhdGEuaWR9XCJdXHJcbiAgICBlbHNlXHJcbiAgICAgIFsnUE9TVCcsICcvdXBsb2FkL2RyaXZlL3YyL2ZpbGVzJ11cclxuXHJcbiAgICBib2R5ID0gW1xyXG4gICAgICBcIlxcclxcbi0tI3tib3VuZGFyeX1cXHJcXG5Db250ZW50LVR5cGU6IGFwcGxpY2F0aW9uL2pzb25cXHJcXG5cXHJcXG4je2hlYWRlcn1cIixcclxuICAgICAgXCJcXHJcXG4tLSN7Ym91bmRhcnl9XFxyXFxuQ29udGVudC1UeXBlOiAje0BtaW1lVHlwZX1cXHJcXG5cXHJcXG4je2NvbnRlbnR9XCIsXHJcbiAgICAgIFwiXFxyXFxuLS0je2JvdW5kYXJ5fS0tXCJcclxuICAgIF0uam9pbiAnJ1xyXG5cclxuICAgIHJlcXVlc3QgPSBnYXBpLmNsaWVudC5yZXF1ZXN0XHJcbiAgICAgIHBhdGg6IHBhdGhcclxuICAgICAgbWV0aG9kOiBtZXRob2RcclxuICAgICAgcGFyYW1zOiB7dXBsb2FkVHlwZTogJ211bHRpcGFydCd9XHJcbiAgICAgIGhlYWRlcnM6IHsnQ29udGVudC1UeXBlJzogJ211bHRpcGFydC9yZWxhdGVkOyBib3VuZGFyeT1cIicgKyBib3VuZGFyeSArICdcIid9XHJcbiAgICAgIGJvZHk6IGJvZHlcclxuXHJcbiAgICByZXF1ZXN0LmV4ZWN1dGUgKGZpbGUpIC0+XHJcbiAgICAgIGlmIGNhbGxiYWNrXHJcbiAgICAgICAgaWYgZmlsZT8uZXJyb3JcclxuICAgICAgICAgIGNhbGxiYWNrIFwiVW5hYmxlZCB0byB1cGxvYWQgZmlsZTogI3tmaWxlLmVycm9yLm1lc3NhZ2V9XCJcclxuICAgICAgICBlbHNlIGlmIGZpbGVcclxuICAgICAgICAgIGNhbGxiYWNrIG51bGwsIGZpbGVcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICBjYWxsYmFjayAnVW5hYmxlZCB0byB1cGxvYWQgZmlsZSdcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gR29vZ2xlRHJpdmVQcm92aWRlclxyXG4iLCJ0ciA9IHJlcXVpcmUgJy4uL3V0aWxzL3RyYW5zbGF0ZSdcclxuXHJcblByb3ZpZGVySW50ZXJmYWNlID0gKHJlcXVpcmUgJy4vcHJvdmlkZXItaW50ZXJmYWNlJykuUHJvdmlkZXJJbnRlcmZhY2VcclxuQ2xvdWRNZXRhZGF0YSA9IChyZXF1aXJlICcuL3Byb3ZpZGVyLWludGVyZmFjZScpLkNsb3VkTWV0YWRhdGFcclxuXHJcbmNsYXNzIExvY2FsU3RvcmFnZVByb3ZpZGVyIGV4dGVuZHMgUHJvdmlkZXJJbnRlcmZhY2VcclxuXHJcbiAgY29uc3RydWN0b3I6IChAb3B0aW9ucyA9IHt9KSAtPlxyXG4gICAgc3VwZXJcclxuICAgICAgbmFtZTogTG9jYWxTdG9yYWdlUHJvdmlkZXIuTmFtZVxyXG4gICAgICBkaXNwbGF5TmFtZTogQG9wdGlvbnMuZGlzcGxheU5hbWUgb3IgKHRyICd+UFJPVklERVIuTE9DQUxfU1RPUkFHRScpXHJcbiAgICAgIGNhcGFiaWxpdGllczpcclxuICAgICAgICBzYXZlOiB0cnVlXHJcbiAgICAgICAgbG9hZDogdHJ1ZVxyXG4gICAgICAgIGxpc3Q6IHRydWVcclxuICAgICAgICByZW1vdmU6IHRydWVcclxuXHJcbiAgQE5hbWU6ICdsb2NhbFN0b3JhZ2UnXHJcbiAgQEF2YWlsYWJsZTogLT5cclxuICAgIHJlc3VsdCA9IHRyeVxyXG4gICAgICB0ZXN0ID0gJ0xvY2FsU3RvcmFnZVByb3ZpZGVyOjphdXRoJ1xyXG4gICAgICB3aW5kb3cubG9jYWxTdG9yYWdlLnNldEl0ZW0odGVzdCwgdGVzdClcclxuICAgICAgd2luZG93LmxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKHRlc3QpXHJcbiAgICAgIHRydWVcclxuICAgIGNhdGNoXHJcbiAgICAgIGZhbHNlXHJcblxyXG4gIHNhdmU6IChjb250ZW50LCBtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICB0cnlcclxuICAgICAgd2luZG93LmxvY2FsU3RvcmFnZS5zZXRJdGVtIEBfZ2V0S2V5KG1ldGFkYXRhLm5hbWUpLCBjb250ZW50XHJcbiAgICAgIGNhbGxiYWNrPyBudWxsXHJcbiAgICBjYXRjaFxyXG4gICAgICBjYWxsYmFjaz8gJ1VuYWJsZSB0byBzYXZlJ1xyXG5cclxuICBsb2FkOiAobWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgdHJ5XHJcbiAgICAgIGNvbnRlbnQgPSB3aW5kb3cubG9jYWxTdG9yYWdlLmdldEl0ZW0gQF9nZXRLZXkgbWV0YWRhdGEubmFtZVxyXG4gICAgICBjYWxsYmFjayBudWxsLCBjb250ZW50XHJcbiAgICBjYXRjaFxyXG4gICAgICBjYWxsYmFjayAnVW5hYmxlIHRvIGxvYWQnXHJcblxyXG4gIGxpc3Q6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICBsaXN0ID0gW11cclxuICAgIHBhdGggPSBtZXRhZGF0YT8ucGF0aCBvciAnJ1xyXG4gICAgcHJlZml4ID0gQF9nZXRLZXkgcGF0aFxyXG4gICAgZm9yIG93biBrZXkgb2Ygd2luZG93LmxvY2FsU3RvcmFnZVxyXG4gICAgICBpZiBrZXkuc3Vic3RyKDAsIHByZWZpeC5sZW5ndGgpIGlzIHByZWZpeFxyXG4gICAgICAgIFtuYW1lLCByZW1haW5kZXIuLi5dID0ga2V5LnN1YnN0cihwcmVmaXgubGVuZ3RoKS5zcGxpdCgnLycpXHJcbiAgICAgICAgbGlzdC5wdXNoIG5ldyBDbG91ZE1ldGFkYXRhXHJcbiAgICAgICAgICBuYW1lOiBrZXkuc3Vic3RyKHByZWZpeC5sZW5ndGgpXHJcbiAgICAgICAgICBwYXRoOiBcIiN7cGF0aH0vI3tuYW1lfVwiXHJcbiAgICAgICAgICB0eXBlOiBpZiByZW1haW5kZXIubGVuZ3RoID4gMCB0aGVuIENsb3VkTWV0YWRhdGEuRm9sZGVyIGVsc2UgQ2xvdWRNZXRhZGF0YS5GaWxlXHJcbiAgICAgICAgICBwcm92aWRlcjogQFxyXG4gICAgY2FsbGJhY2sgbnVsbCwgbGlzdFxyXG5cclxuICByZW1vdmU6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICB0cnlcclxuICAgICAgd2luZG93LmxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtIEBfZ2V0S2V5KG1ldGFkYXRhLm5hbWUpXHJcbiAgICAgIGNhbGxiYWNrPyBudWxsXHJcbiAgICBjYXRjaFxyXG4gICAgICBjYWxsYmFjaz8gJ1VuYWJsZSB0byBkZWxldGUnXHJcblxyXG4gIF9nZXRLZXk6IChuYW1lID0gJycpIC0+XHJcbiAgICBcImNmbTo6I3tuYW1lfVwiXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IExvY2FsU3RvcmFnZVByb3ZpZGVyXHJcbiIsIntkaXZ9ID0gUmVhY3QuRE9NXHJcblxyXG5jbGFzcyBDbG91ZEZpbGVcclxuICBjb250cnVjdG9yOiAob3B0aW9ucykgLT5cclxuICAgIHtAY29udGVudCwgQG1ldGFkYXRhfSA9IG9wdGlvbnNcclxuXHJcbmNsYXNzIENsb3VkTWV0YWRhdGFcclxuICBjb25zdHJ1Y3RvcjogKG9wdGlvbnMpIC0+XHJcbiAgICB7QG5hbWUsIEBwYXRoLCBAdHlwZSwgQHByb3ZpZGVyLCBAcHJvdmlkZXJEYXRhfSA9IG9wdGlvbnNcclxuICBARm9sZGVyOiAnZm9sZGVyJ1xyXG4gIEBGaWxlOiAnZmlsZSdcclxuXHJcbkF1dGhvcml6YXRpb25Ob3RJbXBsZW1lbnRlZERpYWxvZyA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgUmVhY3QuY3JlYXRlQ2xhc3NcclxuICBkaXNwbGF5TmFtZTogJ0F1dGhvcml6YXRpb25Ob3RJbXBsZW1lbnRlZERpYWxvZydcclxuICByZW5kZXI6IC0+XHJcbiAgICAoZGl2IHt9LCBcIkF1dGhvcml6YXRpb24gZGlhbG9nIG5vdCB5ZXQgaW1wbGVtZW50ZWQgZm9yICN7QHByb3BzLnByb3ZpZGVyLmRpc3BsYXlOYW1lfVwiKVxyXG5cclxuY2xhc3MgUHJvdmlkZXJJbnRlcmZhY2VcclxuXHJcbiAgY29uc3RydWN0b3I6IChvcHRpb25zKSAtPlxyXG4gICAge0BuYW1lLCBAZGlzcGxheU5hbWUsIEBjYXBhYmlsaXRpZXN9ID0gb3B0aW9uc1xyXG4gICAgQHVzZXIgPSBudWxsXHJcblxyXG4gIEBBdmFpbGFibGU6IC0+IHRydWVcclxuXHJcbiAgY2FuOiAoY2FwYWJpbGl0eSkgLT5cclxuICAgIEBjYXBhYmlsaXRpZXNbY2FwYWJpbGl0eV1cclxuXHJcbiAgYXV0aG9yaXplZDogKGNhbGxiYWNrKSAtPlxyXG4gICAgY2FsbGJhY2sgdHJ1ZVxyXG5cclxuICBhdXRob3JpemF0aW9uRGlhbG9nOiBBdXRob3JpemF0aW9uTm90SW1wbGVtZW50ZWREaWFsb2dcclxuXHJcbiAgZGlhbG9nOiAoY2FsbGJhY2spIC0+XHJcbiAgICBAX25vdEltcGxlbWVudGVkICdkaWFsb2cnXHJcblxyXG4gIHNhdmU6IChjb250ZW50LCBtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICBAX25vdEltcGxlbWVudGVkICdzYXZlJ1xyXG5cclxuICBsb2FkOiAoY2FsbGJhY2spIC0+XHJcbiAgICBAX25vdEltcGxlbWVudGVkICdsb2FkJ1xyXG5cclxuICBsaXN0OiAobWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgQF9ub3RJbXBsZW1lbnRlZCAnbGlzdCdcclxuXHJcbiAgcmVtb3ZlOiAobWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgQF9ub3RJbXBsZW1lbnRlZCAncmVtb3ZlJ1xyXG5cclxuICBfbm90SW1wbGVtZW50ZWQ6IChtZXRob2ROYW1lKSAtPlxyXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiI3ttZXRob2ROYW1lfSBub3QgaW1wbGVtZW50ZWQgZm9yICN7QG5hbWV9IHByb3ZpZGVyXCIpXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9XHJcbiAgQ2xvdWRGaWxlOiBDbG91ZEZpbGVcclxuICBDbG91ZE1ldGFkYXRhOiBDbG91ZE1ldGFkYXRhXHJcbiAgUHJvdmlkZXJJbnRlcmZhY2U6IFByb3ZpZGVySW50ZXJmYWNlXHJcbiIsInRyID0gcmVxdWlyZSAnLi4vdXRpbHMvdHJhbnNsYXRlJ1xyXG5pc1N0cmluZyA9IHJlcXVpcmUgJy4uL3V0aWxzL2lzLXN0cmluZydcclxuXHJcblByb3ZpZGVySW50ZXJmYWNlID0gKHJlcXVpcmUgJy4vcHJvdmlkZXItaW50ZXJmYWNlJykuUHJvdmlkZXJJbnRlcmZhY2VcclxuQ2xvdWRNZXRhZGF0YSA9IChyZXF1aXJlICcuL3Byb3ZpZGVyLWludGVyZmFjZScpLkNsb3VkTWV0YWRhdGFcclxuXHJcbmNsYXNzIFJlYWRPbmx5UHJvdmlkZXIgZXh0ZW5kcyBQcm92aWRlckludGVyZmFjZVxyXG5cclxuICBjb25zdHJ1Y3RvcjogKEBvcHRpb25zID0ge30pIC0+XHJcbiAgICBzdXBlclxyXG4gICAgICBuYW1lOiBSZWFkT25seVByb3ZpZGVyLk5hbWVcclxuICAgICAgZGlzcGxheU5hbWU6IEBvcHRpb25zLmRpc3BsYXlOYW1lIG9yICh0ciAnflBST1ZJREVSLlJFQURfT05MWScpXHJcbiAgICAgIGNhcGFiaWxpdGllczpcclxuICAgICAgICBzYXZlOiBmYWxzZVxyXG4gICAgICAgIGxvYWQ6IHRydWVcclxuICAgICAgICBsaXN0OiB0cnVlXHJcbiAgICAgICAgcmVtb3ZlOiBmYWxzZVxyXG4gICAgQHRyZWUgPSBudWxsXHJcblxyXG4gIEBOYW1lOiAncmVhZE9ubHknXHJcblxyXG4gIGxvYWQ6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICBAX2xvYWRUcmVlIChlcnIsIHRyZWUpID0+XHJcbiAgICAgIHJldHVybiBjYWxsYmFjayBlcnIgaWYgZXJyXHJcbiAgICAgIHBhcmVudCA9IEBfZmluZFBhcmVudCBtZXRhZGF0YVxyXG4gICAgICBpZiBwYXJlbnRcclxuICAgICAgICBpZiBwYXJlbnRbbWV0YWRhdGEubmFtZV1cclxuICAgICAgICAgIGlmIHBhcmVudFttZXRhZGF0YS5uYW1lXS5tZXRhZGF0YS50eXBlIGlzIENsb3VkTWV0YWRhdGEuRmlsZVxyXG4gICAgICAgICAgICBjYWxsYmFjayBudWxsLCBwYXJlbnRbbWV0YWRhdGEubmFtZV0uY29udGVudFxyXG4gICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICBjYWxsYmFjayBcIiN7bWV0YWRhdGEubmFtZX0gaXMgYSBmb2xkZXJcIlxyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgIGNhbGxiYWNrIFwiI3ttZXRhZGF0YS5uYW1lfSBub3QgZm91bmQgaW4gZm9sZGVyXCJcclxuICAgICAgZWxzZVxyXG4gICAgICAgIGNhbGxiYWNrIFwiI3ttZXRhZGF0YS5uYW1lfSBmb2xkZXIgbm90IGZvdW5kXCJcclxuXHJcbiAgbGlzdDogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIEBfbG9hZFRyZWUgKGVyciwgdHJlZSkgPT5cclxuICAgICAgcmV0dXJuIGNhbGxiYWNrIGVyciBpZiBlcnJcclxuICAgICAgcGFyZW50ID0gQF9maW5kUGFyZW50IG1ldGFkYXRhXHJcbiAgICAgIGlmIHBhcmVudFxyXG4gICAgICAgIGxpc3QgPSBbXVxyXG4gICAgICAgIGxpc3QucHVzaCBmaWxlLm1ldGFkYXRhIGZvciBvd24gZmlsZW5hbWUsIGZpbGUgb2YgcGFyZW50XHJcbiAgICAgICAgY2FsbGJhY2sgbnVsbCwgbGlzdFxyXG4gICAgICBlbHNlIGlmIG1ldGFkYXRhXHJcbiAgICAgICAgY2FsbGJhY2sgXCIje21ldGFkYXRhLm5hbWV9IGZvbGRlciBub3QgZm91bmRcIlxyXG5cclxuICBfbG9hZFRyZWU6IChjYWxsYmFjaykgLT5cclxuICAgIGlmIEB0cmVlIGlzbnQgbnVsbFxyXG4gICAgICBjYWxsYmFjayBudWxsLCBAdHJlZVxyXG4gICAgZWxzZSBpZiBAb3B0aW9ucy5qc29uXHJcbiAgICAgIEB0cmVlID0gQF9jb252ZXJ0SlNPTlRvTWV0YWRhdGFUcmVlIEBvcHRpb25zLmpzb25cclxuICAgICAgY2FsbGJhY2sgbnVsbCwgQHRyZWVcclxuICAgIGVsc2UgaWYgQG9wdGlvbnMuanNvbkNhbGxiYWNrXHJcbiAgICAgIEBvcHRpb25zLmpzb25DYWxsYmFjayAoZXJyLCBqc29uKSA9PlxyXG4gICAgICAgIGlmIGVyclxyXG4gICAgICAgICAgY2FsbGJhY2sgZXJyXHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgQHRyZWUgPSBAX2NvbnZlcnRKU09OVG9NZXRhZGF0YVRyZWUgQG9wdGlvbnMuanNvblxyXG4gICAgICAgICAgY2FsbGJhY2sgbnVsbCwgQHRyZWVcclxuICAgIGVsc2UgaWYgQG9wdGlvbnMuc3JjXHJcbiAgICAgICQuYWpheFxyXG4gICAgICAgIGRhdGFUeXBlOiAnanNvbidcclxuICAgICAgICB1cmw6IEBvcHRpb25zLnNyY1xyXG4gICAgICAgIHN1Y2Nlc3M6IChkYXRhKSA9PlxyXG4gICAgICAgICAgQHRyZWUgPSBAX2NvbnZlcnRKU09OVG9NZXRhZGF0YVRyZWUgZGF0YVxyXG4gICAgICAgICAgY2FsbGJhY2sgbnVsbCwgQHRyZWVcclxuICAgICAgICBlcnJvcjogLT4gY2FsbGJhY2sgXCJVbmFibGUgdG8gbG9hZCBqc29uIGZvciAje0BkaXNwbGF5TmFtZX0gcHJvdmlkZXJcIlxyXG4gICAgZWxzZVxyXG4gICAgICBjb25zb2xlLmVycm9yPyBcIk5vIGpzb24gb3Igc3JjIG9wdGlvbiBmb3VuZCBmb3IgI3tAZGlzcGxheU5hbWV9IHByb3ZpZGVyXCJcclxuICAgICAgY2FsbGJhY2sgbnVsbCwge31cclxuXHJcbiAgX2NvbnZlcnRKU09OVG9NZXRhZGF0YVRyZWU6IChqc29uLCBwYXRoUHJlZml4ID0gJy8nKSAtPlxyXG4gICAgdHJlZSA9IHt9XHJcbiAgICBmb3Igb3duIGZpbGVuYW1lIG9mIGpzb25cclxuICAgICAgdHlwZSA9IGlmIGlzU3RyaW5nIGpzb25bZmlsZW5hbWVdIHRoZW4gQ2xvdWRNZXRhZGF0YS5GaWxlIGVsc2UgQ2xvdWRNZXRhZGF0YS5Gb2xkZXJcclxuICAgICAgbWV0YWRhdGEgPSBuZXcgQ2xvdWRNZXRhZGF0YVxyXG4gICAgICAgIG5hbWU6IGZpbGVuYW1lXHJcbiAgICAgICAgcGF0aDogcGF0aFByZWZpeCArIGZpbGVuYW1lXHJcbiAgICAgICAgdHlwZTogdHlwZVxyXG4gICAgICAgIHByb3ZpZGVyOiBAXHJcbiAgICAgICAgY2hpbGRyZW46IG51bGxcclxuICAgICAgaWYgdHlwZSBpcyBDbG91ZE1ldGFkYXRhLkZvbGRlclxyXG4gICAgICAgIG1ldGFkYXRhLmNoaWxkcmVuID0gX2NvbnZlcnRKU09OVG9NZXRhZGF0YVRyZWUganNvbltmaWxlbmFtZV0sIHBhdGhQcmVmaXggKyBmaWxlbmFtZSArICcvJ1xyXG4gICAgICB0cmVlW2ZpbGVuYW1lXSA9XHJcbiAgICAgICAgY29udGVudDoganNvbltmaWxlbmFtZV1cclxuICAgICAgICBtZXRhZGF0YTogbWV0YWRhdGFcclxuICAgIHRyZWVcclxuXHJcbiAgX2ZpbmRQYXJlbnQ6IChtZXRhZGF0YSkgLT5cclxuICAgIGlmIG5vdCBtZXRhZGF0YVxyXG4gICAgICBAdHJlZVxyXG4gICAgZWxzZVxyXG4gICAgICBAdHJlZVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBSZWFkT25seVByb3ZpZGVyXHJcbiIsInRyID0gcmVxdWlyZSAnLi91dGlscy90cmFuc2xhdGUnXHJcbmlzU3RyaW5nID0gcmVxdWlyZSAnLi91dGlscy9pcy1zdHJpbmcnXHJcblxyXG5jbGFzcyBDbG91ZEZpbGVNYW5hZ2VyVUlFdmVudFxyXG5cclxuICBjb25zdHJ1Y3RvcjogKEB0eXBlLCBAZGF0YSA9IHt9KSAtPlxyXG5cclxuY2xhc3MgQ2xvdWRGaWxlTWFuYWdlclVJTWVudVxyXG5cclxuICBARGVmYXVsdE1lbnU6IFsnbmV3RmlsZURpYWxvZycsICdvcGVuRmlsZURpYWxvZycsICdzYXZlJywgJ3NhdmVGaWxlQXNEaWFsb2cnXVxyXG5cclxuICBjb25zdHJ1Y3RvcjogKG9wdGlvbnMsIGNsaWVudCkgLT5cclxuICAgIHNldEFjdGlvbiA9IChhY3Rpb24pIC0+XHJcbiAgICAgIGNsaWVudFthY3Rpb25dPy5iaW5kKGNsaWVudCkgb3IgKC0+IGFsZXJ0IFwiTm8gI3thY3Rpb259IGFjdGlvbiBpcyBhdmFpbGFibGUgaW4gdGhlIGNsaWVudFwiKVxyXG5cclxuICAgIEBpdGVtcyA9IFtdXHJcbiAgICBmb3IgaXRlbSBpbiBvcHRpb25zLm1lbnVcclxuICAgICAgbWVudUl0ZW0gPSBpZiBpc1N0cmluZyBpdGVtXHJcbiAgICAgICAgbmFtZSA9IG9wdGlvbnMubWVudU5hbWVzP1tpdGVtXVxyXG4gICAgICAgIG1lbnVJdGVtID0gc3dpdGNoIGl0ZW1cclxuICAgICAgICAgIHdoZW4gJ25ld0ZpbGVEaWFsb2cnXHJcbiAgICAgICAgICAgIG5hbWU6IG5hbWUgb3IgdHIgXCJ+TUVOVS5ORVdcIlxyXG4gICAgICAgICAgd2hlbiAnb3BlbkZpbGVEaWFsb2cnXHJcbiAgICAgICAgICAgIG5hbWU6IG5hbWUgb3IgdHIgXCJ+TUVOVS5PUEVOXCJcclxuICAgICAgICAgIHdoZW4gJ3NhdmUnXHJcbiAgICAgICAgICAgIG5hbWU6IG5hbWUgb3IgdHIgXCJ+TUVOVS5TQVZFXCJcclxuICAgICAgICAgIHdoZW4gJ3NhdmVGaWxlQXNEaWFsb2cnXHJcbiAgICAgICAgICAgIG5hbWU6IG5hbWUgb3IgdHIgXCJ+TUVOVS5TQVZFX0FTXCJcclxuICAgICAgICAgIGVsc2VcclxuICAgICAgICAgICAgbmFtZTogXCJVbmtub3duIGl0ZW06ICN7aXRlbX1cIlxyXG4gICAgICAgIG1lbnVJdGVtLmFjdGlvbiA9IHNldEFjdGlvbiBpdGVtXHJcbiAgICAgICAgbWVudUl0ZW1cclxuICAgICAgZWxzZVxyXG4gICAgICAgICMgY2xpZW50cyBjYW4gcGFzcyBpbiBjdXN0b20ge25hbWU6Li4uLCBhY3Rpb246Li4ufSBtZW51IGl0ZW1zIHdoZXJlIHRoZSBhY3Rpb24gY2FuIGJlIGEgY2xpZW50IGZ1bmN0aW9uIG5hbWUgb3IgaXQgaXMgYXNzdWdtZWQgaXQgaXMgYSBmdW5jdGlvblxyXG4gICAgICAgIGlmIGlzU3RyaW5nIGl0ZW0uYWN0aW9uXHJcbiAgICAgICAgICBpdGVtLmFjdGlvbiA9IHNldEFjdGlvbiBpdGVtLmFjdGlvblxyXG4gICAgICAgIGl0ZW1cclxuICAgICAgaWYgbWVudUl0ZW1cclxuICAgICAgICBAaXRlbXMucHVzaCBtZW51SXRlbVxyXG5cclxuY2xhc3MgQ2xvdWRGaWxlTWFuYWdlclVJXHJcblxyXG4gIGNvbnN0cnVjdG9yOiAoQGNsaWVudCktPlxyXG4gICAgQG1lbnUgPSBudWxsXHJcblxyXG4gIGluaXQ6IChvcHRpb25zKSAtPlxyXG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgb3Ige31cclxuICAgICMgc2tpcCB0aGUgbWVudSBpZiBleHBsaWNpdHkgc2V0IHRvIG51bGwgKG1lYW5pbmcgbm8gbWVudSlcclxuICAgIGlmIG9wdGlvbnMubWVudSBpc250IG51bGxcclxuICAgICAgaWYgdHlwZW9mIG9wdGlvbnMubWVudSBpcyAndW5kZWZpbmVkJ1xyXG4gICAgICAgIG9wdGlvbnMubWVudSA9IENsb3VkRmlsZU1hbmFnZXJVSU1lbnUuRGVmYXVsdE1lbnVcclxuICAgICAgQG1lbnUgPSBuZXcgQ2xvdWRGaWxlTWFuYWdlclVJTWVudSBvcHRpb25zLCBAY2xpZW50XHJcblxyXG4gICMgZm9yIFJlYWN0IHRvIGxpc3RlbiBmb3IgZGlhbG9nIGNoYW5nZXNcclxuICBsaXN0ZW46IChAbGlzdGVuZXJDYWxsYmFjaykgLT5cclxuXHJcbiAgYXBwZW5kTWVudUl0ZW06IChpdGVtKSAtPlxyXG4gICAgQGxpc3RlbmVyQ2FsbGJhY2sgbmV3IENsb3VkRmlsZU1hbmFnZXJVSUV2ZW50ICdhcHBlbmRNZW51SXRlbScsIGl0ZW1cclxuXHJcbiAgc2V0TWVudUJhckluZm86IChpbmZvKSAtPlxyXG4gICAgQGxpc3RlbmVyQ2FsbGJhY2sgbmV3IENsb3VkRmlsZU1hbmFnZXJVSUV2ZW50ICdzZXRNZW51QmFySW5mbycsIGluZm9cclxuXHJcbiAgc2F2ZUZpbGVEaWFsb2c6IChjYWxsYmFjaykgLT5cclxuICAgIEBfc2hvd1Byb3ZpZGVyRGlhbG9nICdzYXZlRmlsZScsICh0ciAnfkRJQUxPRy5TQVZFJyksIGNhbGxiYWNrXHJcblxyXG4gIHNhdmVGaWxlQXNEaWFsb2c6IChjYWxsYmFjaykgLT5cclxuICAgIEBfc2hvd1Byb3ZpZGVyRGlhbG9nICdzYXZlRmlsZUFzJywgKHRyICd+RElBTE9HLlNBVkVfQVMnKSwgY2FsbGJhY2tcclxuXHJcbiAgb3BlbkZpbGVEaWFsb2c6IChjYWxsYmFjaykgLT5cclxuICAgIEBfc2hvd1Byb3ZpZGVyRGlhbG9nICdvcGVuRmlsZScsICh0ciAnfkRJQUxPRy5PUEVOJyksIGNhbGxiYWNrXHJcblxyXG4gIF9zaG93UHJvdmlkZXJEaWFsb2c6IChhY3Rpb24sIHRpdGxlLCBjYWxsYmFjaykgLT5cclxuICAgIEBsaXN0ZW5lckNhbGxiYWNrIG5ldyBDbG91ZEZpbGVNYW5hZ2VyVUlFdmVudCAnc2hvd1Byb3ZpZGVyRGlhbG9nJyxcclxuICAgICAgYWN0aW9uOiBhY3Rpb25cclxuICAgICAgdGl0bGU6IHRpdGxlXHJcbiAgICAgIGNhbGxiYWNrOiBjYWxsYmFja1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPVxyXG4gIENsb3VkRmlsZU1hbmFnZXJVSUV2ZW50OiBDbG91ZEZpbGVNYW5hZ2VyVUlFdmVudFxyXG4gIENsb3VkRmlsZU1hbmFnZXJVSTogQ2xvdWRGaWxlTWFuYWdlclVJXHJcbiAgQ2xvdWRGaWxlTWFuYWdlclVJTWVudTogQ2xvdWRGaWxlTWFuYWdlclVJTWVudVxyXG4iLCJtb2R1bGUuZXhwb3J0cyA9IChwYXJhbSkgLT4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHBhcmFtKSBpcyAnW29iamVjdCBTdHJpbmddJ1xyXG4iLCJtb2R1bGUuZXhwb3J0cyA9XHJcbiAgXCJ+TUVOVUJBUi5VTlRJVExFX0RPQ1VNRU5UXCI6IFwiVW50aXRsZWQgRG9jdW1lbnRcIlxyXG5cclxuICBcIn5NRU5VLk5FV1wiOiBcIk5ld1wiXHJcbiAgXCJ+TUVOVS5PUEVOXCI6IFwiT3BlbiAuLi5cIlxyXG4gIFwifk1FTlUuU0FWRVwiOiBcIlNhdmVcIlxyXG4gIFwifk1FTlUuU0FWRV9BU1wiOiBcIlNhdmUgQXMgLi4uXCJcclxuXHJcbiAgXCJ+RElBTE9HLlNBVkVcIjogXCJTYXZlXCJcclxuICBcIn5ESUFMT0cuU0FWRV9BU1wiOiBcIlNhdmUgQXMgLi4uXCJcclxuICBcIn5ESUFMT0cuT1BFTlwiOiBcIk9wZW5cIlxyXG5cclxuICBcIn5QUk9WSURFUi5MT0NBTF9TVE9SQUdFXCI6IFwiTG9jYWwgU3RvcmFnZVwiXHJcbiAgXCJ+UFJPVklERVIuUkVBRF9PTkxZXCI6IFwiUmVhZCBPbmx5XCJcclxuICBcIn5QUk9WSURFUi5HT09HTEVfRFJJVkVcIjogXCJHb29nbGUgRHJpdmVcIlxyXG4gIFwiflBST1ZJREVSLkRPQ1VNRU5UX1NUT1JFXCI6IFwiRG9jdW1lbnQgU3RvcmVcIlxyXG5cclxuICBcIn5GSUxFX0RJQUxPRy5GSUxFTkFNRVwiOiBcIkZpbGVuYW1lXCJcclxuICBcIn5GSUxFX0RJQUxPRy5PUEVOXCI6IFwiT3BlblwiXHJcbiAgXCJ+RklMRV9ESUFMT0cuU0FWRVwiOiBcIlNhdmVcIlxyXG4gIFwifkZJTEVfRElBTE9HLkNBTkNFTFwiOiBcIkNhbmNlbFwiXHJcbiAgXCJ+RklMRV9ESUFMT0cuUkVNT1ZFXCI6IFwiRGVsZXRlXCJcclxuICBcIn5GSUxFX0RJQUxPRy5SRU1PVkVfQ09ORklSTVwiOiBcIkFyZSB5b3Ugc3VyZSB5b3Ugd2FudCB0byBkZWxldGUgJXtmaWxlbmFtZX0/XCJcclxuICBcIn5GSUxFX0RJQUxPRy5MT0FESU5HXCI6IFwiTG9hZGluZy4uLlwiXHJcbiIsInRyYW5zbGF0aW9ucyA9ICB7fVxyXG50cmFuc2xhdGlvbnNbJ2VuJ10gPSByZXF1aXJlICcuL2xhbmcvZW4tdXMnXHJcbmRlZmF1bHRMYW5nID0gJ2VuJ1xyXG52YXJSZWdFeHAgPSAvJVxce1xccyooW159XFxzXSopXFxzKlxcfS9nXHJcblxyXG50cmFuc2xhdGUgPSAoa2V5LCB2YXJzPXt9LCBsYW5nPWRlZmF1bHRMYW5nKSAtPlxyXG4gIHRyYW5zbGF0aW9uID0gdHJhbnNsYXRpb25zW2xhbmddP1trZXldIG9yIGtleVxyXG4gIHRyYW5zbGF0aW9uLnJlcGxhY2UgdmFyUmVnRXhwLCAobWF0Y2gsIGtleSkgLT5cclxuICAgIGlmIHZhcnMuaGFzT3duUHJvcGVydHkga2V5IHRoZW4gdmFyc1trZXldIGVsc2UgXCInKiogVUtOT1dOIEtFWTogI3trZXl9ICoqXCJcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gdHJhbnNsYXRlXHJcbiIsIk1lbnVCYXIgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vbWVudS1iYXItdmlldydcclxuUHJvdmlkZXJUYWJiZWREaWFsb2cgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vcHJvdmlkZXItdGFiYmVkLWRpYWxvZy12aWV3J1xyXG5cclxudHIgPSByZXF1aXJlICcuLi91dGlscy90cmFuc2xhdGUnXHJcblxyXG57ZGl2LCBpZnJhbWV9ID0gUmVhY3QuRE9NXHJcblxyXG5Jbm5lckFwcCA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgUmVhY3QuY3JlYXRlQ2xhc3NcclxuXHJcbiAgZGlzcGxheU5hbWU6ICdDbG91ZEZpbGVNYW5hZ2VySW5uZXJBcHAnXHJcblxyXG4gIHNob3VsZENvbXBvbmVudFVwZGF0ZTogKG5leHRQcm9wcykgLT5cclxuICAgIG5leHRQcm9wcy5hcHAgaXNudCBAcHJvcHMuYXBwXHJcblxyXG4gIHJlbmRlcjogLT5cclxuICAgIChkaXYge2NsYXNzTmFtZTogJ2lubmVyQXBwJ30sXHJcbiAgICAgIChpZnJhbWUge3NyYzogQHByb3BzLmFwcH0pXHJcbiAgICApXHJcblxyXG5BcHAgPSBSZWFjdC5jcmVhdGVDbGFzc1xyXG5cclxuICBkaXNwbGF5TmFtZTogJ0Nsb3VkRmlsZU1hbmFnZXInXHJcblxyXG4gIGdldEZpbGVuYW1lOiAtPlxyXG4gICAgaWYgQHByb3BzLmNsaWVudC5zdGF0ZS5tZXRhZGF0YT8uaGFzT3duUHJvcGVydHkoJ25hbWUnKSB0aGVuIEBwcm9wcy5jbGllbnQuc3RhdGUubWV0YWRhdGEubmFtZSBlbHNlICh0ciBcIn5NRU5VQkFSLlVOVElUTEVfRE9DVU1FTlRcIilcclxuXHJcbiAgZ2V0SW5pdGlhbFN0YXRlOiAtPlxyXG4gICAgZmlsZW5hbWU6IEBnZXRGaWxlbmFtZSgpXHJcbiAgICBtZW51SXRlbXM6IEBwcm9wcy5jbGllbnQuX3VpLm1lbnU/Lml0ZW1zIG9yIFtdXHJcbiAgICBtZW51T3B0aW9uczogQHByb3BzLm1lbnVCYXIgb3Ige31cclxuICAgIHByb3ZpZGVyRGlhbG9nOiBudWxsXHJcblxyXG4gIGNvbXBvbmVudFdpbGxNb3VudDogLT5cclxuICAgIEBwcm9wcy5jbGllbnQubGlzdGVuIChldmVudCkgPT5cclxuICAgICAgQHNldFN0YXRlIGZpbGVuYW1lOiBAZ2V0RmlsZW5hbWUoKVxyXG5cclxuICAgICAgc3dpdGNoIGV2ZW50LnR5cGVcclxuICAgICAgICB3aGVuICdjb25uZWN0ZWQnXHJcbiAgICAgICAgICBAc2V0U3RhdGUgbWVudUl0ZW1zOiBAcHJvcHMuY2xpZW50Ll91aS5tZW51Py5pdGVtcyBvciBbXVxyXG5cclxuICAgIEBwcm9wcy5jbGllbnQuX3VpLmxpc3RlbiAoZXZlbnQpID0+XHJcbiAgICAgIHN3aXRjaCBldmVudC50eXBlXHJcbiAgICAgICAgd2hlbiAnc2hvd1Byb3ZpZGVyRGlhbG9nJ1xyXG4gICAgICAgICAgQHNldFN0YXRlIHByb3ZpZGVyRGlhbG9nOiBldmVudC5kYXRhXHJcbiAgICAgICAgd2hlbiAnYXBwZW5kTWVudUl0ZW0nXHJcbiAgICAgICAgICBAc3RhdGUubWVudUl0ZW1zLnB1c2ggZXZlbnQuZGF0YVxyXG4gICAgICAgICAgQHNldFN0YXRlIG1lbnVJdGVtczogQHN0YXRlLm1lbnVJdGVtc1xyXG4gICAgICAgIHdoZW4gJ3NldE1lbnVCYXJJbmZvJ1xyXG4gICAgICAgICAgQHN0YXRlLm1lbnVPcHRpb25zLmluZm8gPSBldmVudC5kYXRhXHJcbiAgICAgICAgICBAc2V0U3RhdGUgbWVudU9wdGlvbnM6IEBzdGF0ZS5tZW51T3B0aW9uc1xyXG5cclxuICBjbG9zZVByb3ZpZGVyRGlhbG9nOiAtPlxyXG4gICAgQHNldFN0YXRlIHByb3ZpZGVyRGlhbG9nOiBudWxsXHJcblxyXG4gIHJlbmRlcjogLT5cclxuICAgIGlmIEBwcm9wcy51c2luZ0lmcmFtZVxyXG4gICAgICAoZGl2IHtjbGFzc05hbWU6ICdhcHAnfSxcclxuICAgICAgICAoTWVudUJhciB7ZmlsZW5hbWU6IEBzdGF0ZS5maWxlbmFtZSwgaXRlbXM6IEBzdGF0ZS5tZW51SXRlbXMsIG9wdGlvbnM6IEBzdGF0ZS5tZW51T3B0aW9uc30pXHJcbiAgICAgICAgKElubmVyQXBwIHthcHA6IEBwcm9wcy5hcHB9KVxyXG4gICAgICAgIGlmIEBzdGF0ZS5wcm92aWRlckRpYWxvZ1xyXG4gICAgICAgICAgKFByb3ZpZGVyVGFiYmVkRGlhbG9nIHtjbGllbnQ6IEBwcm9wcy5jbGllbnQsIGRpYWxvZzogQHN0YXRlLnByb3ZpZGVyRGlhbG9nLCBjbG9zZTogQGNsb3NlUHJvdmlkZXJEaWFsb2d9KVxyXG4gICAgICApXHJcbiAgICBlbHNlXHJcbiAgICAgIGlmIEBzdGF0ZS5wcm92aWRlckRpYWxvZ1xyXG4gICAgICAgIChkaXYge2NsYXNzTmFtZTogJ2FwcCd9LFxyXG4gICAgICAgICAgKFByb3ZpZGVyVGFiYmVkRGlhbG9nIHtjbGllbnQ6IEBwcm9wcy5jbGllbnQsIGRpYWxvZzogQHN0YXRlLnByb3ZpZGVyRGlhbG9nLCBjbG9zZTogQGNsb3NlUHJvdmlkZXJEaWFsb2d9KVxyXG4gICAgICAgIClcclxuICAgICAgZWxzZVxyXG4gICAgICAgIG51bGxcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQXBwXHJcbiIsIkF1dGhvcml6ZU1peGluID1cclxuICBnZXRJbml0aWFsU3RhdGU6IC0+XHJcbiAgICBhdXRob3JpemVkOiBmYWxzZVxyXG5cclxuICBjb21wb25lbnRXaWxsTW91bnQ6IC0+XHJcbiAgICBAcHJvcHMucHJvdmlkZXIuYXV0aG9yaXplZCAoYXV0aG9yaXplZCkgPT5cclxuICAgICAgQHNldFN0YXRlIGF1dGhvcml6ZWQ6IGF1dGhvcml6ZWRcclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgaWYgQHN0YXRlLmF1dGhvcml6ZWRcclxuICAgICAgQHJlbmRlcldoZW5BdXRob3JpemVkKClcclxuICAgIGVsc2VcclxuICAgICAgQHByb3BzLnByb3ZpZGVyLnJlbmRlckF1dGhvcml6YXRpb25EaWFsb2coKVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBBdXRob3JpemVNaXhpblxyXG4iLCJ7ZGl2LCBpLCBzcGFuLCB1bCwgbGl9ID0gUmVhY3QuRE9NXHJcblxyXG5Ecm9wZG93bkl0ZW0gPSBSZWFjdC5jcmVhdGVGYWN0b3J5IFJlYWN0LmNyZWF0ZUNsYXNzXHJcblxyXG4gIGRpc3BsYXlOYW1lOiAnRHJvcGRvd25JdGVtJ1xyXG5cclxuICBjbGlja2VkOiAtPlxyXG4gICAgQHByb3BzLnNlbGVjdCBAcHJvcHMuaXRlbVxyXG5cclxuICByZW5kZXI6IC0+XHJcbiAgICBjbGFzc05hbWUgPSBcIm1lbnVJdGVtICN7aWYgQHByb3BzLmlzQWN0aW9uTWVudSBhbmQgbm90IEBwcm9wcy5pdGVtLmFjdGlvbiB0aGVuICdkaXNhYmxlZCcgZWxzZSAnJ31cIlxyXG4gICAgbmFtZSA9IEBwcm9wcy5pdGVtLm5hbWUgb3IgQHByb3BzLml0ZW1cclxuICAgIChsaSB7Y2xhc3NOYW1lOiBjbGFzc05hbWUsIG9uQ2xpY2s6IEBjbGlja2VkIH0sIG5hbWUpXHJcblxyXG5Ecm9wRG93biA9IFJlYWN0LmNyZWF0ZUNsYXNzXHJcblxyXG4gIGRpc3BsYXlOYW1lOiAnRHJvcGRvd24nXHJcblxyXG4gIGdldERlZmF1bHRQcm9wczogLT5cclxuICAgIGlzQWN0aW9uTWVudTogdHJ1ZSAgICAgICAgICAgICAgIyBXaGV0aGVyIGVhY2ggaXRlbSBjb250YWlucyBpdHMgb3duIGFjdGlvblxyXG4gICAgb25TZWxlY3Q6IChpdGVtKSAtPiAgICAgICAgICAgICAjIElmIG5vdCwgQHByb3BzLm9uU2VsZWN0IGlzIGNhbGxlZFxyXG4gICAgICBsb2cuaW5mbyBcIlNlbGVjdGVkICN7aXRlbX1cIlxyXG5cclxuICBnZXRJbml0aWFsU3RhdGU6IC0+XHJcbiAgICBzaG93aW5nTWVudTogZmFsc2VcclxuICAgIHRpbWVvdXQ6IG51bGxcclxuXHJcbiAgYmx1cjogLT5cclxuICAgIEB1bmJsdXIoKVxyXG4gICAgdGltZW91dCA9IHNldFRpbWVvdXQgKCA9PiBAc2V0U3RhdGUge3Nob3dpbmdNZW51OiBmYWxzZX0gKSwgNTAwXHJcbiAgICBAc2V0U3RhdGUge3RpbWVvdXQ6IHRpbWVvdXR9XHJcblxyXG4gIHVuYmx1cjogLT5cclxuICAgIGlmIEBzdGF0ZS50aW1lb3V0XHJcbiAgICAgIGNsZWFyVGltZW91dChAc3RhdGUudGltZW91dClcclxuICAgIEBzZXRTdGF0ZSB7dGltZW91dDogbnVsbH1cclxuXHJcbiAgc2VsZWN0OiAoaXRlbSkgLT5cclxuICAgIG5leHRTdGF0ZSA9IChub3QgQHN0YXRlLnNob3dpbmdNZW51KVxyXG4gICAgQHNldFN0YXRlIHtzaG93aW5nTWVudTogbmV4dFN0YXRlfVxyXG4gICAgcmV0dXJuIHVubGVzcyBpdGVtXHJcbiAgICBpZiBAcHJvcHMuaXNBY3Rpb25NZW51IGFuZCBpdGVtLmFjdGlvblxyXG4gICAgICBpdGVtLmFjdGlvbigpXHJcbiAgICBlbHNlXHJcbiAgICAgIEBwcm9wcy5vblNlbGVjdCBpdGVtXHJcblxyXG4gIHJlbmRlcjogLT5cclxuICAgIG1lbnVDbGFzcyA9IGlmIEBzdGF0ZS5zaG93aW5nTWVudSB0aGVuICdtZW51LXNob3dpbmcnIGVsc2UgJ21lbnUtaGlkZGVuJ1xyXG4gICAgc2VsZWN0ID0gKGl0ZW0pID0+XHJcbiAgICAgICggPT4gQHNlbGVjdChpdGVtKSlcclxuICAgIChkaXYge2NsYXNzTmFtZTogJ21lbnUnfSxcclxuICAgICAgKHNwYW4ge2NsYXNzTmFtZTogJ21lbnUtYW5jaG9yJywgb25DbGljazogPT4gQHNlbGVjdChudWxsKX0sXHJcbiAgICAgICAgQHByb3BzLmFuY2hvclxyXG4gICAgICAgIChpIHtjbGFzc05hbWU6ICdpY29uLWFycm93LWV4cGFuZCd9KVxyXG4gICAgICApXHJcbiAgICAgIGlmIEBwcm9wcy5pdGVtcz8ubGVuZ3RoID4gMFxyXG4gICAgICAgIChkaXYge2NsYXNzTmFtZTogbWVudUNsYXNzLCBvbk1vdXNlTGVhdmU6IEBibHVyLCBvbk1vdXNlRW50ZXI6IEB1bmJsdXJ9LFxyXG4gICAgICAgICAgKHVsIHt9LFxyXG4gICAgICAgICAgICAoRHJvcGRvd25JdGVtIHtrZXk6IGl0ZW0ubmFtZSBvciBpdGVtLCBpdGVtOiBpdGVtLCBzZWxlY3Q6IEBzZWxlY3QsIGlzQWN0aW9uTWVudTogQHByb3BzLmlzQWN0aW9uTWVudX0pIGZvciBpdGVtIGluIEBwcm9wcy5pdGVtc1xyXG4gICAgICAgICAgKVxyXG4gICAgICAgIClcclxuICAgIClcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gRHJvcERvd25cclxuIiwiQXV0aG9yaXplTWl4aW4gPSByZXF1aXJlICcuL2F1dGhvcml6ZS1taXhpbidcclxuQ2xvdWRNZXRhZGF0YSA9IChyZXF1aXJlICcuLi9wcm92aWRlcnMvcHJvdmlkZXItaW50ZXJmYWNlJykuQ2xvdWRNZXRhZGF0YVxyXG5cclxudHIgPSByZXF1aXJlICcuLi91dGlscy90cmFuc2xhdGUnXHJcblxyXG57ZGl2LCBpbWcsIGksIHNwYW4sIGlucHV0LCBidXR0b259ID0gUmVhY3QuRE9NXHJcblxyXG5GaWxlTGlzdEZpbGUgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IFJlYWN0LmNyZWF0ZUNsYXNzXHJcbiAgZGlzcGxheU5hbWU6ICdGaWxlTGlzdEZpbGUnXHJcblxyXG4gIGNvbXBvbmVudFdpbGxNb3VudDogLT5cclxuICAgIEBsYXN0Q2xpY2sgPSAwXHJcblxyXG4gIGZpbGVTZWxlY3RlZDogIChlKSAtPlxyXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXHJcbiAgICBlLnN0b3BQcm9wYWdhdGlvbigpXHJcbiAgICBub3cgPSAobmV3IERhdGUoKSkuZ2V0VGltZSgpXHJcbiAgICBAcHJvcHMuZmlsZVNlbGVjdGVkIEBwcm9wcy5tZXRhZGF0YVxyXG4gICAgaWYgbm93IC0gQGxhc3RDbGljayA8PSAyNTBcclxuICAgICAgQHByb3BzLmZpbGVDb25maXJtZWQoKVxyXG4gICAgQGxhc3RDbGljayA9IG5vd1xyXG5cclxuICByZW5kZXI6IC0+XHJcbiAgICAoZGl2IHtjbGFzc05hbWU6IChpZiBAcHJvcHMuc2VsZWN0ZWQgdGhlbiAnc2VsZWN0ZWQnIGVsc2UgJycpLCBvbkNsaWNrOiBAZmlsZVNlbGVjdGVkfSwgQHByb3BzLm1ldGFkYXRhLm5hbWUpXHJcblxyXG5GaWxlTGlzdCA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgUmVhY3QuY3JlYXRlQ2xhc3NcclxuICBkaXNwbGF5TmFtZTogJ0ZpbGVMaXN0J1xyXG5cclxuICBnZXRJbml0aWFsU3RhdGU6IC0+XHJcbiAgICBsb2FkaW5nOiB0cnVlXHJcblxyXG4gIGNvbXBvbmVudERpZE1vdW50OiAtPlxyXG4gICAgQGxvYWQoKVxyXG5cclxuICBsb2FkOiAtPlxyXG4gICAgQHByb3BzLnByb3ZpZGVyLmxpc3QgQHByb3BzLmZvbGRlciwgKGVyciwgbGlzdCkgPT5cclxuICAgICAgcmV0dXJuIGFsZXJ0KGVycikgaWYgZXJyXHJcbiAgICAgIEBzZXRTdGF0ZVxyXG4gICAgICAgIGxvYWRpbmc6IGZhbHNlXHJcbiAgICAgIEBwcm9wcy5saXN0TG9hZGVkIGxpc3RcclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgKGRpdiB7Y2xhc3NOYW1lOiAnZmlsZWxpc3QnfSxcclxuICAgICAgaWYgQHN0YXRlLmxvYWRpbmdcclxuICAgICAgICB0ciBcIn5GSUxFX0RJQUxPRy5MT0FESU5HXCJcclxuICAgICAgZWxzZVxyXG4gICAgICAgIGZvciBtZXRhZGF0YSBpbiBAcHJvcHMubGlzdFxyXG4gICAgICAgICAgKEZpbGVMaXN0RmlsZSB7bWV0YWRhdGE6IG1ldGFkYXRhLCBzZWxlY3RlZDogQHByb3BzLnNlbGVjdGVkRmlsZSBpcyBtZXRhZGF0YSwgZmlsZVNlbGVjdGVkOiBAcHJvcHMuZmlsZVNlbGVjdGVkLCBmaWxlQ29uZmlybWVkOiBAcHJvcHMuZmlsZUNvbmZpcm1lZH0pXHJcbiAgICApXHJcblxyXG5GaWxlRGlhbG9nVGFiID0gUmVhY3QuY3JlYXRlQ2xhc3NcclxuICBkaXNwbGF5TmFtZTogJ0ZpbGVEaWFsb2dUYWInXHJcblxyXG4gIG1peGluczogW0F1dGhvcml6ZU1peGluXVxyXG5cclxuICBnZXRJbml0aWFsU3RhdGU6IC0+XHJcbiAgICBmb2xkZXI6IEBwcm9wcy5jbGllbnQuc3RhdGUubWV0YWRhdGE/LnBhcmVudCBvciBudWxsXHJcbiAgICBtZXRhZGF0YTogQHByb3BzLmNsaWVudC5zdGF0ZS5tZXRhZGF0YVxyXG4gICAgZmlsZW5hbWU6IEBwcm9wcy5jbGllbnQuc3RhdGUubWV0YWRhdGE/Lm5hbWUgb3IgJydcclxuICAgIGxpc3Q6IFtdXHJcblxyXG4gIGNvbXBvbmVudFdpbGxNb3VudDogLT5cclxuICAgIEBpc09wZW4gPSBAcHJvcHMuZGlhbG9nLmFjdGlvbiBpcyAnb3BlbkZpbGUnXHJcblxyXG4gIGZpbGVuYW1lQ2hhbmdlZDogKGUpIC0+XHJcbiAgICBmaWxlbmFtZSA9IGUudGFyZ2V0LnZhbHVlXHJcbiAgICBtZXRhZGF0YSA9IEBmaW5kTWV0YWRhdGEgZmlsZW5hbWVcclxuICAgIEBzZXRTdGF0ZVxyXG4gICAgICBmaWxlbmFtZTogZmlsZW5hbWVcclxuICAgICAgbWV0YWRhdGE6IG1ldGFkYXRhXHJcblxyXG4gIGxpc3RMb2FkZWQ6IChsaXN0KSAtPlxyXG4gICAgQHNldFN0YXRlIGxpc3Q6IGxpc3RcclxuXHJcbiAgZmlsZVNlbGVjdGVkOiAobWV0YWRhdGEpIC0+XHJcbiAgICBpZiBtZXRhZGF0YT8udHlwZSBpcyBDbG91ZE1ldGFkYXRhLkZpbGVcclxuICAgICAgQHNldFN0YXRlIGZpbGVuYW1lOiBtZXRhZGF0YS5uYW1lXHJcbiAgICBAc2V0U3RhdGUgbWV0YWRhdGE6IG1ldGFkYXRhXHJcblxyXG4gIGNvbmZpcm06IC0+XHJcbiAgICBpZiBub3QgQHN0YXRlLm1ldGFkYXRhXHJcbiAgICAgIGZpbGVuYW1lID0gJC50cmltIEBzdGF0ZS5maWxlbmFtZVxyXG4gICAgICBAc3RhdGUubWV0YWRhdGEgPSBAZmluZE1ldGFkYXRhIGZpbGVuYW1lXHJcbiAgICAgIGlmIG5vdCBAc3RhdGUubWV0YWRhdGFcclxuICAgICAgICBpZiBAaXNPcGVuXHJcbiAgICAgICAgICBhbGVydCBcIiN7QHN0YXRlLmZpbGVuYW1lfSBub3QgZm91bmRcIlxyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgIEBzdGF0ZS5tZXRhZGF0YSA9IG5ldyBDbG91ZE1ldGFkYXRhXHJcbiAgICAgICAgICAgIG5hbWU6IGZpbGVuYW1lXHJcbiAgICAgICAgICAgIHBhdGg6IFwiLyN7ZmlsZW5hbWV9XCIgIyBUT0RPOiBGaXggcGF0aFxyXG4gICAgICAgICAgICB0eXBlOiBDbG91ZE1ldGFkYXRhLkZpbGVcclxuICAgICAgICAgICAgcHJvdmlkZXI6IEBwcm9wcy5wcm92aWRlclxyXG4gICAgaWYgQHN0YXRlLm1ldGFkYXRhXHJcbiAgICAgICMgZW5zdXJlIHRoZSBtZXRhZGF0YSBwcm92aWRlciBpcyB0aGUgY3VycmVudGx5LXNob3dpbmcgdGFiXHJcbiAgICAgIEBzdGF0ZS5tZXRhZGF0YS5wcm92aWRlciA9IEBwcm9wcy5wcm92aWRlclxyXG4gICAgICBAcHJvcHMuZGlhbG9nLmNhbGxiYWNrIEBzdGF0ZS5tZXRhZGF0YVxyXG4gICAgICBAcHJvcHMuY2xvc2UoKVxyXG5cclxuICByZW1vdmU6IC0+XHJcbiAgICBpZiBAc3RhdGUubWV0YWRhdGEgYW5kIEBzdGF0ZS5tZXRhZGF0YS50eXBlIGlzbnQgQ2xvdWRNZXRhZGF0YS5Gb2xkZXIgYW5kIGNvbmZpcm0odHIoXCJ+RklMRV9ESUFMT0cuUkVNT1ZFX0NPTkZJUk1cIiwge2ZpbGVuYW1lOiBAc3RhdGUubWV0YWRhdGEubmFtZX0pKVxyXG4gICAgICBAcHJvcHMucHJvdmlkZXIucmVtb3ZlIEBzdGF0ZS5tZXRhZGF0YSwgKGVycikgPT5cclxuICAgICAgICBpZiBub3QgZXJyXHJcbiAgICAgICAgICBsaXN0ID0gQHN0YXRlLmxpc3Quc2xpY2UgMFxyXG4gICAgICAgICAgaW5kZXggPSBsaXN0LmluZGV4T2YgQHN0YXRlLm1ldGFkYXRhXHJcbiAgICAgICAgICBsaXN0LnNwbGljZSBpbmRleCwgMVxyXG4gICAgICAgICAgQHNldFN0YXRlXHJcbiAgICAgICAgICAgIGxpc3Q6IGxpc3RcclxuICAgICAgICAgICAgbWV0YWRhdGE6IG51bGxcclxuICAgICAgICAgICAgZmlsZW5hbWU6ICcnXHJcblxyXG4gIGNhbmNlbDogLT5cclxuICAgIEBwcm9wcy5jbG9zZSgpXHJcblxyXG4gIGZpbmRNZXRhZGF0YTogKGZpbGVuYW1lKSAtPlxyXG4gICAgZm9yIG1ldGFkYXRhIGluIEBzdGF0ZS5saXN0XHJcbiAgICAgIGlmIG1ldGFkYXRhLm5hbWUgaXMgZmlsZW5hbWVcclxuICAgICAgICByZXR1cm4gbWV0YWRhdGFcclxuICAgIG51bGxcclxuXHJcbiAgd2F0Y2hGb3JFbnRlcjogKGUpIC0+XHJcbiAgICBpZiBlLmtleUNvZGUgaXMgMTMgYW5kIG5vdCBAY29uZmlybURpc2FibGVkKClcclxuICAgICAgQGNvbmZpcm0oKVxyXG5cclxuICBjb25maXJtRGlzYWJsZWQ6IC0+XHJcbiAgICAoQHN0YXRlLmZpbGVuYW1lLmxlbmd0aCBpcyAwKSBvciAoQGlzT3BlbiBhbmQgbm90IEBzdGF0ZS5tZXRhZGF0YSlcclxuXHJcbiAgcmVuZGVyV2hlbkF1dGhvcml6ZWQ6IC0+XHJcbiAgICBjb25maXJtRGlzYWJsZWQgPSBAY29uZmlybURpc2FibGVkKClcclxuICAgIHJlbW92ZURpc2FibGVkID0gKEBzdGF0ZS5tZXRhZGF0YSBpcyBudWxsKSBvciAoQHN0YXRlLm1ldGFkYXRhLnR5cGUgaXMgQ2xvdWRNZXRhZGF0YS5Gb2xkZXIpXHJcblxyXG4gICAgKGRpdiB7Y2xhc3NOYW1lOiAnZGlhbG9nVGFiJ30sXHJcbiAgICAgIChpbnB1dCB7dHlwZTogJ3RleHQnLCB2YWx1ZTogQHN0YXRlLmZpbGVuYW1lLCBwbGFjZWhvbGRlcjogKHRyIFwifkZJTEVfRElBTE9HLkZJTEVOQU1FXCIpLCBvbkNoYW5nZTogQGZpbGVuYW1lQ2hhbmdlZCwgb25LZXlEb3duOiBAd2F0Y2hGb3JFbnRlcn0pXHJcbiAgICAgIChGaWxlTGlzdCB7cHJvdmlkZXI6IEBwcm9wcy5wcm92aWRlciwgZm9sZGVyOiBAc3RhdGUuZm9sZGVyLCBzZWxlY3RlZEZpbGU6IEBzdGF0ZS5tZXRhZGF0YSwgZmlsZVNlbGVjdGVkOiBAZmlsZVNlbGVjdGVkLCBmaWxlQ29uZmlybWVkOiBAY29uZmlybSwgbGlzdDogQHN0YXRlLmxpc3QsIGxpc3RMb2FkZWQ6IEBsaXN0TG9hZGVkfSlcclxuICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnYnV0dG9ucyd9LFxyXG4gICAgICAgIChidXR0b24ge29uQ2xpY2s6IEBjb25maXJtLCBkaXNhYmxlZDogY29uZmlybURpc2FibGVkLCBjbGFzc05hbWU6IGlmIGNvbmZpcm1EaXNhYmxlZCB0aGVuICdkaXNhYmxlZCcgZWxzZSAnJ30sIGlmIEBpc09wZW4gdGhlbiAodHIgXCJ+RklMRV9ESUFMT0cuT1BFTlwiKSBlbHNlICh0ciBcIn5GSUxFX0RJQUxPRy5TQVZFXCIpKVxyXG4gICAgICAgIGlmIEBwcm9wcy5wcm92aWRlci5jYW4gJ3JlbW92ZSdcclxuICAgICAgICAgIChidXR0b24ge29uQ2xpY2s6IEByZW1vdmUsIGRpc2FibGVkOiByZW1vdmVEaXNhYmxlZCwgY2xhc3NOYW1lOiBpZiByZW1vdmVEaXNhYmxlZCB0aGVuICdkaXNhYmxlZCcgZWxzZSAnJ30sICh0ciBcIn5GSUxFX0RJQUxPRy5SRU1PVkVcIikpXHJcbiAgICAgICAgKGJ1dHRvbiB7b25DbGljazogQGNhbmNlbH0sICh0ciBcIn5GSUxFX0RJQUxPRy5DQU5DRUxcIikpXHJcbiAgICAgIClcclxuICAgIClcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gRmlsZURpYWxvZ1RhYlxyXG4iLCJ7ZGl2LCBpLCBzcGFufSA9IFJlYWN0LkRPTVxyXG5cclxuRHJvcGRvd24gPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vZHJvcGRvd24tdmlldydcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3NcclxuXHJcbiAgZGlzcGxheU5hbWU6ICdNZW51QmFyJ1xyXG5cclxuICBnZXRJbml0aWFsU3RhdGU6IC0+XHJcbiAgICByaWdodFNpZGVMYXlvdXQ6IEBwcm9wcy5vcHRpb25zLnJpZ2h0U2lkZUxheW91dCBvciBbJ2luZm8nLCAnaGVscCddXHJcblxyXG4gIGhlbHA6IC0+XHJcbiAgICB3aW5kb3cub3BlbiBAcHJvcHMub3B0aW9ucy5oZWxwLCAnX2JsYW5rJ1xyXG5cclxuICByZW5kZXI6IC0+XHJcbiAgICAoZGl2IHtjbGFzc05hbWU6ICdtZW51LWJhcid9LFxyXG4gICAgICAoZGl2IHtjbGFzc05hbWU6ICdtZW51LWJhci1sZWZ0J30sXHJcbiAgICAgICAgKERyb3Bkb3duIHtcclxuICAgICAgICAgIGFuY2hvcjogQHByb3BzLmZpbGVuYW1lXHJcbiAgICAgICAgICBpdGVtczogQHByb3BzLml0ZW1zXHJcbiAgICAgICAgICBjbGFzc05hbWU6J21lbnUtYmFyLWNvbnRlbnQtZmlsZW5hbWUnfSlcclxuICAgICAgKVxyXG4gICAgICAoZGl2IHtjbGFzc05hbWU6ICdtZW51LWJhci1yaWdodCd9LFxyXG4gICAgICAgIGZvciBpdGVtIGluIEBzdGF0ZS5yaWdodFNpZGVMYXlvdXRcclxuICAgICAgICAgIGlmIEBwcm9wcy5vcHRpb25zW2l0ZW1dXHJcbiAgICAgICAgICAgIHN3aXRjaCBpdGVtXHJcbiAgICAgICAgICAgICAgd2hlbiAnaW5mbydcclxuICAgICAgICAgICAgICAgIChzcGFuIHtjbGFzc05hbWU6ICdtZW51LWJhci1pbmZvJ30sIEBwcm9wcy5vcHRpb25zLmluZm8pXHJcbiAgICAgICAgICAgICAgd2hlbiAnaGVscCdcclxuICAgICAgICAgICAgICAgIChpIHtzdHlsZToge2ZvbnRTaXplOiBcIjEzcHhcIn0sIGNsYXNzTmFtZTogJ2NsaWNrYWJsZSBpY29uLWhlbHAnLCBvbkNsaWNrOiBAaGVscH0pXHJcbiAgICAgIClcclxuICAgIClcclxuIiwiTW9kYWwgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vbW9kYWwtdmlldydcclxue2RpdiwgaX0gPSBSZWFjdC5ET01cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3NcclxuXHJcbiAgZGlzcGxheU5hbWU6ICdNb2RhbERpYWxvZydcclxuXHJcbiAgY2xvc2U6IC0+XHJcbiAgICBAcHJvcHMuY2xvc2U/KClcclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgKE1vZGFsIHtjbG9zZTogQHByb3BzLmNsb3NlfSxcclxuICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnbW9kYWwtZGlhbG9nJ30sXHJcbiAgICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnbW9kYWwtZGlhbG9nLXdyYXBwZXInfSxcclxuICAgICAgICAgIChkaXYge2NsYXNzTmFtZTogJ21vZGFsLWRpYWxvZy10aXRsZSd9LFxyXG4gICAgICAgICAgICAoaSB7Y2xhc3NOYW1lOiBcIm1vZGFsLWRpYWxvZy10aXRsZS1jbG9zZSBpY29uLWNvZGFwLWV4XCIsIG9uQ2xpY2s6IEBjbG9zZX0pXHJcbiAgICAgICAgICAgIEBwcm9wcy50aXRsZSBvciAnVW50aXRsZWQgRGlhbG9nJ1xyXG4gICAgICAgICAgKVxyXG4gICAgICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnbW9kYWwtZGlhbG9nLXdvcmtzcGFjZSd9LCBAcHJvcHMuY2hpbGRyZW4pXHJcbiAgICAgICAgKVxyXG4gICAgICApXHJcbiAgICApXHJcbiIsIk1vZGFsRGlhbG9nID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL21vZGFsLWRpYWxvZy12aWV3J1xyXG5UYWJiZWRQYW5lbCA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi90YWJiZWQtcGFuZWwtdmlldydcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3NcclxuXHJcbiAgZGlzcGxheU5hbWU6ICdNb2RhbFRhYmJlZERpYWxvZ1ZpZXcnXHJcblxyXG4gIHJlbmRlcjogLT5cclxuICAgIChNb2RhbERpYWxvZyB7dGl0bGU6IEBwcm9wcy50aXRsZSwgY2xvc2U6IEBwcm9wcy5jbG9zZX0sXHJcbiAgICAgIChUYWJiZWRQYW5lbCB7dGFiczogQHByb3BzLnRhYnMsIHNlbGVjdGVkVGFiSW5kZXg6IEBwcm9wcy5zZWxlY3RlZFRhYkluZGV4fSlcclxuICAgIClcclxuIiwie2Rpdn0gPSBSZWFjdC5ET01cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3NcclxuXHJcbiAgZGlzcGxheU5hbWU6ICdNb2RhbCdcclxuXHJcbiAgd2F0Y2hGb3JFc2NhcGU6IChlKSAtPlxyXG4gICAgaWYgZS5rZXlDb2RlIGlzIDI3XHJcbiAgICAgIEBwcm9wcy5jbG9zZT8oKVxyXG5cclxuICBjb21wb25lbnREaWRNb3VudDogLT5cclxuICAgICQod2luZG93KS5vbiAna2V5dXAnLCBAd2F0Y2hGb3JFc2NhcGVcclxuXHJcbiAgY29tcG9uZW50V2lsbFVubW91bnQ6IC0+XHJcbiAgICAkKHdpbmRvdykub2ZmICdrZXl1cCcsIEB3YXRjaEZvckVzY2FwZVxyXG5cclxuICByZW5kZXI6IC0+XHJcbiAgICAoZGl2IHtjbGFzc05hbWU6ICdtb2RhbCd9LFxyXG4gICAgICAoZGl2IHtjbGFzc05hbWU6ICdtb2RhbC1iYWNrZ3JvdW5kJ30pXHJcbiAgICAgIChkaXYge2NsYXNzTmFtZTogJ21vZGFsLWNvbnRlbnQnfSwgQHByb3BzLmNoaWxkcmVuKVxyXG4gICAgKVxyXG4iLCJNb2RhbFRhYmJlZERpYWxvZyA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9tb2RhbC10YWJiZWQtZGlhbG9nLXZpZXcnXHJcblRhYmJlZFBhbmVsID0gcmVxdWlyZSAnLi90YWJiZWQtcGFuZWwtdmlldydcclxuQ2xvdWRNZXRhZGF0YSA9IChyZXF1aXJlICcuLi9wcm92aWRlcnMvcHJvdmlkZXItaW50ZXJmYWNlJykuQ2xvdWRNZXRhZGF0YVxyXG5GaWxlRGlhbG9nVGFiID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL2ZpbGUtZGlhbG9nLXRhYi12aWV3J1xyXG5TZWxlY3RQcm92aWRlckRpYWxvZ1RhYiA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9zZWxlY3QtcHJvdmlkZXItZGlhbG9nLXRhYi12aWV3J1xyXG5cclxudHIgPSByZXF1aXJlICcuLi91dGlscy90cmFuc2xhdGUnXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzXHJcbiAgZGlzcGxheU5hbWU6ICdQcm92aWRlclRhYmJlZERpYWxvZydcclxuXHJcbiAgcmVuZGVyOiAgLT5cclxuICAgIFtjYXBhYmlsaXR5LCBUYWJDb21wb25lbnRdID0gc3dpdGNoIEBwcm9wcy5kaWFsb2cuYWN0aW9uXHJcbiAgICAgIHdoZW4gJ29wZW5GaWxlJyB0aGVuIFsnbGlzdCcsIEZpbGVEaWFsb2dUYWJdXHJcbiAgICAgIHdoZW4gJ3NhdmVGaWxlJywgJ3NhdmVGaWxlQXMnIHRoZW4gWydzYXZlJywgRmlsZURpYWxvZ1RhYl1cclxuICAgICAgd2hlbiAnc2VsZWN0UHJvdmlkZXInIHRoZW4gW251bGwsIFNlbGVjdFByb3ZpZGVyRGlhbG9nVGFiXVxyXG5cclxuICAgIHRhYnMgPSBbXVxyXG4gICAgc2VsZWN0ZWRUYWJJbmRleCA9IDBcclxuICAgIGZvciBwcm92aWRlciwgaSBpbiBAcHJvcHMuY2xpZW50LnN0YXRlLmF2YWlsYWJsZVByb3ZpZGVyc1xyXG4gICAgICBpZiBub3QgY2FwYWJpbGl0eSBvciBwcm92aWRlci5jYXBhYmlsaXRpZXNbY2FwYWJpbGl0eV1cclxuICAgICAgICBjb21wb25lbnQgPSBUYWJDb21wb25lbnRcclxuICAgICAgICAgIGNsaWVudDogQHByb3BzLmNsaWVudFxyXG4gICAgICAgICAgZGlhbG9nOiBAcHJvcHMuZGlhbG9nXHJcbiAgICAgICAgICBjbG9zZTogQHByb3BzLmNsb3NlXHJcbiAgICAgICAgICBwcm92aWRlcjogcHJvdmlkZXJcclxuICAgICAgICB0YWJzLnB1c2ggVGFiYmVkUGFuZWwuVGFiIHtrZXk6IGksIGxhYmVsOiAodHIgcHJvdmlkZXIuZGlzcGxheU5hbWUpLCBjb21wb25lbnQ6IGNvbXBvbmVudH1cclxuICAgICAgICBpZiBwcm92aWRlciBpcyBAcHJvcHMuY2xpZW50LnN0YXRlLm1ldGFkYXRhPy5wcm92aWRlclxyXG4gICAgICAgICAgc2VsZWN0ZWRUYWJJbmRleCA9IGlcclxuXHJcbiAgICAoTW9kYWxUYWJiZWREaWFsb2cge3RpdGxlOiAodHIgQHByb3BzLmRpYWxvZy50aXRsZSksIGNsb3NlOiBAcHJvcHMuY2xvc2UsIHRhYnM6IHRhYnMsIHNlbGVjdGVkVGFiSW5kZXg6IHNlbGVjdGVkVGFiSW5kZXh9KVxyXG4iLCJ7ZGl2fSA9IFJlYWN0LkRPTVxyXG5cclxuU2VsZWN0UHJvdmlkZXJEaWFsb2dUYWIgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IFJlYWN0LmNyZWF0ZUNsYXNzXHJcbiAgZGlzcGxheU5hbWU6ICdTZWxlY3RQcm92aWRlckRpYWxvZ1RhYidcclxuICByZW5kZXI6IC0+IChkaXYge30sIFwiVE9ETzogU2VsZWN0UHJvdmlkZXJEaWFsb2dUYWI6ICN7QHByb3BzLnByb3ZpZGVyLmRpc3BsYXlOYW1lfVwiKVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBTZWxlY3RQcm92aWRlckRpYWxvZ1RhYlxyXG4iLCJ7ZGl2LCB1bCwgbGksIGF9ID0gUmVhY3QuRE9NXHJcblxyXG5jbGFzcyBUYWJJbmZvXHJcbiAgY29uc3RydWN0b3I6IChzZXR0aW5ncz17fSkgLT5cclxuICAgIHtAbGFiZWwsIEBjb21wb25lbnR9ID0gc2V0dGluZ3NcclxuXHJcblRhYiA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgUmVhY3QuY3JlYXRlQ2xhc3NcclxuXHJcbiAgZGlzcGxheU5hbWU6ICdUYWJiZWRQYW5lbFRhYidcclxuXHJcbiAgY2xpY2tlZDogKGUpIC0+XHJcbiAgICBlLnByZXZlbnREZWZhdWx0KClcclxuICAgIEBwcm9wcy5vblNlbGVjdGVkIEBwcm9wcy5pbmRleFxyXG5cclxuICByZW5kZXI6IC0+XHJcbiAgICBjbGFzc25hbWUgPSBpZiBAcHJvcHMuc2VsZWN0ZWQgdGhlbiAndGFiLXNlbGVjdGVkJyBlbHNlICcnXHJcbiAgICAobGkge2NsYXNzTmFtZTogY2xhc3NuYW1lLCBvbkNsaWNrOiBAY2xpY2tlZH0sIEBwcm9wcy5sYWJlbClcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3NcclxuXHJcbiAgZGlzcGxheU5hbWU6ICdUYWJiZWRQYW5lbFZpZXcnXHJcblxyXG4gIGdldEluaXRpYWxTdGF0ZTogLT5cclxuICAgIHNlbGVjdGVkVGFiSW5kZXg6IEBwcm9wcy5zZWxlY3RlZFRhYkluZGV4IG9yIDBcclxuXHJcbiAgc3RhdGljczpcclxuICAgIFRhYjogKHNldHRpbmdzKSAtPiBuZXcgVGFiSW5mbyBzZXR0aW5nc1xyXG5cclxuICBzZWxlY3RlZFRhYjogKGluZGV4KSAtPlxyXG4gICAgQHNldFN0YXRlIHNlbGVjdGVkVGFiSW5kZXg6IGluZGV4XHJcblxyXG4gIHJlbmRlclRhYjogKHRhYiwgaW5kZXgpIC0+XHJcbiAgICAoVGFiXHJcbiAgICAgIGxhYmVsOiB0YWIubGFiZWxcclxuICAgICAga2V5OiBpbmRleFxyXG4gICAgICBpbmRleDogaW5kZXhcclxuICAgICAgc2VsZWN0ZWQ6IChpbmRleCBpcyBAc3RhdGUuc2VsZWN0ZWRUYWJJbmRleClcclxuICAgICAgb25TZWxlY3RlZDogQHNlbGVjdGVkVGFiXHJcbiAgICApXHJcblxyXG4gIHJlbmRlclRhYnM6IC0+XHJcbiAgICAoZGl2IHtjbGFzc05hbWU6ICd3b3Jrc3BhY2UtdGFicyd9LFxyXG4gICAgICAodWwge30sIEByZW5kZXJUYWIodGFiLGluZGV4KSBmb3IgdGFiLCBpbmRleCBpbiBAcHJvcHMudGFicylcclxuICAgIClcclxuXHJcbiAgcmVuZGVyU2VsZWN0ZWRQYW5lbDogLT5cclxuICAgIChkaXYge2NsYXNzTmFtZTogJ3dvcmtzcGFjZS10YWItY29tcG9uZW50J30sXHJcbiAgICAgIGZvciB0YWIsIGluZGV4IGluIEBwcm9wcy50YWJzXHJcbiAgICAgICAgKGRpdiB7XHJcbiAgICAgICAgICBrZXk6IGluZGV4XHJcbiAgICAgICAgICBzdHlsZTpcclxuICAgICAgICAgICAgZGlzcGxheTogaWYgaW5kZXggaXMgQHN0YXRlLnNlbGVjdGVkVGFiSW5kZXggdGhlbiAnYmxvY2snIGVsc2UgJ25vbmUnXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgdGFiLmNvbXBvbmVudFxyXG4gICAgICAgIClcclxuICAgIClcclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgKGRpdiB7a2V5OiBAcHJvcHMua2V5LCBjbGFzc05hbWU6IFwidGFiYmVkLXBhbmVsXCJ9LFxyXG4gICAgICBAcmVuZGVyVGFicygpXHJcbiAgICAgIEByZW5kZXJTZWxlY3RlZFBhbmVsKClcclxuICAgIClcclxuIl19
