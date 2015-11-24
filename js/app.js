(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.CloudFileManager = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var AppView, CloudFileManager, CloudFileManagerClient, CloudFileManagerUIMenu;

AppView = React.createFactory(require('./views/app-view'));

CloudFileManagerUIMenu = (require('./ui')).CloudFileManagerUIMenu;

CloudFileManagerClient = (require('./client')).CloudFileManagerClient;

CloudFileManager = (function() {
  CloudFileManager.DefaultMenu = CloudFileManagerUIMenu.DefaultMenu;

  function CloudFileManager(options) {
    this.client = new CloudFileManagerClient();
  }

  CloudFileManager.prototype.setAppOptions = function(appOptions) {
    return this.client.setAppOptions(appOptions);
  };

  CloudFileManager.prototype.createFrame = function(appOptions, elemId) {
    this.setAppOptions(appOptions);
    appOptions.client = this.client;
    return React.render(AppView(appOptions), document.getElementById(elemId));
  };

  CloudFileManager.prototype.clientConnect = function(eventCallback) {
    return this.client.connect(eventCallback);
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
var AUTH, CloudMetadata, GoogleDriveAuthorizationDialog, GoogleDriveProvider, ProviderInterface, button, div, isString, tr,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

div = React.DOM.div;

tr = require('../utils/translate');

isString = require('../utils/is-string');

ProviderInterface = (require('./provider-interface')).ProviderInterface;

CloudMetadata = (require('./provider-interface')).CloudMetadata;

button = React.DOM.button;

AUTH = {
  APP_ID: '1095918012594',
  DEVELOPER_KEY: 'AIzaSyAUobrEXqtbZHBvr24tamdE6JxmPYTRPEA',
  CLIENT_ID: '1095918012594-svs72eqfalasuc4t1p1ps1m8r9b8psso.apps.googleusercontent.com',
  SCOPES: 'https://www.googleapis.com/auth/drive'
};

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
        list: true
      }
    });
    this.authToken = null;
    this.mimeType = "application/json";
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
          client_id: AUTH.CLIENT_ID,
          scope: AUTH.SCOPES,
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
        request = gapi.client.drive.files.list();
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
    var check;
    check = function() {
      if (window._LoadedGAPI) {
        return gapi.client.load('drive', 'v2', function() {
          return callback();
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
        list: true
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
      return callback(null);
    } catch (error) {
      return callback('Unable to save');
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
        list: true
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
        if (event.type === 'showProviderDialog') {
          return _this.setState({
            providerDialog: event.data
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
    return div({
      className: 'app'
    }, MenuBar({
      filename: this.state.filename,
      items: this.state.menuItems
    }), InnerApp({
      app: this.props.app
    }), this.state.providerDialog ? ProviderTabbedDialog({
      client: this.props.client,
      dialog: this.state.providerDialog,
      close: this.closeProviderDialog
    }) : void 0);
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
      className: 'icon-codap-arrow-expand'
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
  fileSelected: function() {
    return this.props.fileSelected(this.props.metadata);
  },
  render: function() {
    return div({
      title: this.props.metadata.path,
      onClick: this.fileSelected
    }, this.props.metadata.name);
  }
}));

FileList = React.createFactory(React.createClass({
  displayName: 'FileList',
  getInitialState: function() {
    return {
      loading: true,
      list: []
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
          loading: false,
          list: list
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
        ref1 = this.state.list;
        results = [];
        for (j = 0, len = ref1.length; j < len; j++) {
          metadata = ref1[j];
          results.push(FileListFile({
            metadata: metadata,
            fileSelected: this.props.fileSelected
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
      filename: ((ref2 = this.props.client.state.metadata) != null ? ref2.name : void 0) || ''
    };
  },
  componentWillMount: function() {
    this.isOpen = this.props.dialog.action === 'openFile';
    return this.list = [];
  },
  filenameChanged: function(e) {
    var filename, metadata;
    filename = e.target.value;
    metadata = null;
    return this.setState({
      filename: filename,
      metadata: metadata
    });
  },
  listLoaded: function(list) {
    return this.list = list;
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
    var filename, j, len, metadata, ref1;
    filename = $.trim(this.state.filename);
    if (!this.state.metadata) {
      ref1 = this.list;
      for (j = 0, len = ref1.length; j < len; j++) {
        metadata = ref1[j];
        if (metadata.name === filename) {
          this.state.metadata = metadata;
          break;
        }
      }
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
      this.props.dialog.callback(this.state.metadata);
      return this.props.close();
    }
  },
  cancel: function() {
    return this.props.close();
  },
  renderWhenAuthorized: function() {
    return div({
      className: 'dialogTab'
    }, input({
      type: 'text',
      value: this.state.filename,
      placeholder: tr("~FILE_DIALOG.FILENAME"),
      onChange: this.filenameChanged
    }), FileList({
      provider: this.props.provider,
      folder: this.state.folder,
      fileSelected: this.fileSelected,
      listLoaded: this.listLoaded
    }), div({
      className: 'buttons'
    }, button({
      onClick: this.confirm,
      disabled: this.state.filename.length === 0
    }, this.isOpen ? tr("~FILE_DIALOG.OPEN") : tr("~FILE_DIALOG.SAVE")), button({
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
  render: function() {
    return div({
      className: 'menu-bar'
    }, div({}, Dropdown({
      anchor: this.props.filename,
      items: this.props.items,
      className: 'menu-bar-content-filename'
    })));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvc2ZlbnRyZXNzL3Byb2plY3RzL2Nsb3VkLWZpbGUtbWFuYWdlci9zcmMvY29kZS9hcHAuY29mZmVlIiwiL1VzZXJzL3NmZW50cmVzcy9wcm9qZWN0cy9jbG91ZC1maWxlLW1hbmFnZXIvc3JjL2NvZGUvY2xpZW50LmNvZmZlZSIsIi9Vc2Vycy9zZmVudHJlc3MvcHJvamVjdHMvY2xvdWQtZmlsZS1tYW5hZ2VyL3NyYy9jb2RlL3Byb3ZpZGVycy9kb2N1bWVudC1zdG9yZS1wcm92aWRlci5jb2ZmZWUiLCIvVXNlcnMvc2ZlbnRyZXNzL3Byb2plY3RzL2Nsb3VkLWZpbGUtbWFuYWdlci9zcmMvY29kZS9wcm92aWRlcnMvZ29vZ2xlLWRyaXZlLXByb3ZpZGVyLmNvZmZlZSIsIi9Vc2Vycy9zZmVudHJlc3MvcHJvamVjdHMvY2xvdWQtZmlsZS1tYW5hZ2VyL3NyYy9jb2RlL3Byb3ZpZGVycy9sb2NhbHN0b3JhZ2UtcHJvdmlkZXIuY29mZmVlIiwiL1VzZXJzL3NmZW50cmVzcy9wcm9qZWN0cy9jbG91ZC1maWxlLW1hbmFnZXIvc3JjL2NvZGUvcHJvdmlkZXJzL3Byb3ZpZGVyLWludGVyZmFjZS5jb2ZmZWUiLCIvVXNlcnMvc2ZlbnRyZXNzL3Byb2plY3RzL2Nsb3VkLWZpbGUtbWFuYWdlci9zcmMvY29kZS9wcm92aWRlcnMvcmVhZG9ubHktcHJvdmlkZXIuY29mZmVlIiwiL1VzZXJzL3NmZW50cmVzcy9wcm9qZWN0cy9jbG91ZC1maWxlLW1hbmFnZXIvc3JjL2NvZGUvdWkuY29mZmVlIiwiL1VzZXJzL3NmZW50cmVzcy9wcm9qZWN0cy9jbG91ZC1maWxlLW1hbmFnZXIvc3JjL2NvZGUvdXRpbHMvaXMtc3RyaW5nLmNvZmZlZSIsIi9Vc2Vycy9zZmVudHJlc3MvcHJvamVjdHMvY2xvdWQtZmlsZS1tYW5hZ2VyL3NyYy9jb2RlL3V0aWxzL2xhbmcvZW4tdXMuY29mZmVlIiwiL1VzZXJzL3NmZW50cmVzcy9wcm9qZWN0cy9jbG91ZC1maWxlLW1hbmFnZXIvc3JjL2NvZGUvdXRpbHMvdHJhbnNsYXRlLmNvZmZlZSIsIi9Vc2Vycy9zZmVudHJlc3MvcHJvamVjdHMvY2xvdWQtZmlsZS1tYW5hZ2VyL3NyYy9jb2RlL3ZpZXdzL2FwcC12aWV3LmNvZmZlZSIsIi9Vc2Vycy9zZmVudHJlc3MvcHJvamVjdHMvY2xvdWQtZmlsZS1tYW5hZ2VyL3NyYy9jb2RlL3ZpZXdzL2F1dGhvcml6ZS1taXhpbi5jb2ZmZWUiLCIvVXNlcnMvc2ZlbnRyZXNzL3Byb2plY3RzL2Nsb3VkLWZpbGUtbWFuYWdlci9zcmMvY29kZS92aWV3cy9kcm9wZG93bi12aWV3LmNvZmZlZSIsIi9Vc2Vycy9zZmVudHJlc3MvcHJvamVjdHMvY2xvdWQtZmlsZS1tYW5hZ2VyL3NyYy9jb2RlL3ZpZXdzL2ZpbGUtZGlhbG9nLXRhYi12aWV3LmNvZmZlZSIsIi9Vc2Vycy9zZmVudHJlc3MvcHJvamVjdHMvY2xvdWQtZmlsZS1tYW5hZ2VyL3NyYy9jb2RlL3ZpZXdzL21lbnUtYmFyLXZpZXcuY29mZmVlIiwiL1VzZXJzL3NmZW50cmVzcy9wcm9qZWN0cy9jbG91ZC1maWxlLW1hbmFnZXIvc3JjL2NvZGUvdmlld3MvbW9kYWwtZGlhbG9nLXZpZXcuY29mZmVlIiwiL1VzZXJzL3NmZW50cmVzcy9wcm9qZWN0cy9jbG91ZC1maWxlLW1hbmFnZXIvc3JjL2NvZGUvdmlld3MvbW9kYWwtdGFiYmVkLWRpYWxvZy12aWV3LmNvZmZlZSIsIi9Vc2Vycy9zZmVudHJlc3MvcHJvamVjdHMvY2xvdWQtZmlsZS1tYW5hZ2VyL3NyYy9jb2RlL3ZpZXdzL21vZGFsLXZpZXcuY29mZmVlIiwiL1VzZXJzL3NmZW50cmVzcy9wcm9qZWN0cy9jbG91ZC1maWxlLW1hbmFnZXIvc3JjL2NvZGUvdmlld3MvcHJvdmlkZXItdGFiYmVkLWRpYWxvZy12aWV3LmNvZmZlZSIsIi9Vc2Vycy9zZmVudHJlc3MvcHJvamVjdHMvY2xvdWQtZmlsZS1tYW5hZ2VyL3NyYy9jb2RlL3ZpZXdzL3NlbGVjdC1wcm92aWRlci1kaWFsb2ctdGFiLXZpZXcuY29mZmVlIiwiL1VzZXJzL3NmZW50cmVzcy9wcm9qZWN0cy9jbG91ZC1maWxlLW1hbmFnZXIvc3JjL2NvZGUvdmlld3MvdGFiYmVkLXBhbmVsLXZpZXcuY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUEsSUFBQTs7QUFBQSxPQUFBLEdBQVUsS0FBSyxDQUFDLGFBQU4sQ0FBb0IsT0FBQSxDQUFRLGtCQUFSLENBQXBCOztBQUVWLHNCQUFBLEdBQXlCLENBQUMsT0FBQSxDQUFRLE1BQVIsQ0FBRCxDQUFnQixDQUFDOztBQUMxQyxzQkFBQSxHQUF5QixDQUFDLE9BQUEsQ0FBUSxVQUFSLENBQUQsQ0FBb0IsQ0FBQzs7QUFFeEM7RUFFSixnQkFBQyxDQUFBLFdBQUQsR0FBYyxzQkFBc0IsQ0FBQzs7RUFFeEIsMEJBQUMsT0FBRDtJQUNYLElBQUMsQ0FBQSxNQUFELEdBQWMsSUFBQSxzQkFBQSxDQUFBO0VBREg7OzZCQUdiLGFBQUEsR0FBZSxTQUFDLFVBQUQ7V0FDYixJQUFDLENBQUEsTUFBTSxDQUFDLGFBQVIsQ0FBc0IsVUFBdEI7RUFEYTs7NkJBR2YsV0FBQSxHQUFhLFNBQUMsVUFBRCxFQUFhLE1BQWI7SUFDWCxJQUFDLENBQUEsYUFBRCxDQUFlLFVBQWY7SUFDQSxVQUFVLENBQUMsTUFBWCxHQUFvQixJQUFDLENBQUE7V0FDckIsS0FBSyxDQUFDLE1BQU4sQ0FBYyxPQUFBLENBQVEsVUFBUixDQUFkLEVBQW1DLFFBQVEsQ0FBQyxjQUFULENBQXdCLE1BQXhCLENBQW5DO0VBSFc7OzZCQUtiLGFBQUEsR0FBZSxTQUFDLGFBQUQ7V0FDYixJQUFDLENBQUEsTUFBTSxDQUFDLE9BQVIsQ0FBZ0IsYUFBaEI7RUFEYTs7Ozs7O0FBR2pCLE1BQU0sQ0FBQyxPQUFQLEdBQXFCLElBQUEsZ0JBQUEsQ0FBQTs7Ozs7QUN2QnJCLElBQUEseUtBQUE7RUFBQTs7QUFB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TUFBQSxFQUFRLFNBQUE7V0FDTCxHQUFBLENBQUk7TUFBQyxHQUFBLEVBQUssSUFBQyxDQUFBLEtBQUssQ0FBQyxHQUFiO01BQWtCLFNBQUEsRUFBVyxjQUE3QjtLQUFKLEVBQ0MsSUFBQyxDQUFBLFVBQUQsQ0FBQSxDQURELEVBRUMsSUFBQyxDQUFBLG1CQUFELENBQUEsQ0FGRDtFQURLLENBckNSO0NBRmUiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiQXBwVmlldyA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi92aWV3cy9hcHAtdmlldydcblxuQ2xvdWRGaWxlTWFuYWdlclVJTWVudSA9IChyZXF1aXJlICcuL3VpJykuQ2xvdWRGaWxlTWFuYWdlclVJTWVudVxuQ2xvdWRGaWxlTWFuYWdlckNsaWVudCA9IChyZXF1aXJlICcuL2NsaWVudCcpLkNsb3VkRmlsZU1hbmFnZXJDbGllbnRcblxuY2xhc3MgQ2xvdWRGaWxlTWFuYWdlclxuXG4gIEBEZWZhdWx0TWVudTogQ2xvdWRGaWxlTWFuYWdlclVJTWVudS5EZWZhdWx0TWVudVxuXG4gIGNvbnN0cnVjdG9yOiAob3B0aW9ucykgLT5cbiAgICBAY2xpZW50ID0gbmV3IENsb3VkRmlsZU1hbmFnZXJDbGllbnQoKVxuXG4gIHNldEFwcE9wdGlvbnM6IChhcHBPcHRpb25zKSAtPlxuICAgIEBjbGllbnQuc2V0QXBwT3B0aW9ucyBhcHBPcHRpb25zXG5cbiAgY3JlYXRlRnJhbWU6IChhcHBPcHRpb25zLCBlbGVtSWQpIC0+XG4gICAgQHNldEFwcE9wdGlvbnMgYXBwT3B0aW9uc1xuICAgIGFwcE9wdGlvbnMuY2xpZW50ID0gQGNsaWVudFxuICAgIFJlYWN0LnJlbmRlciAoQXBwVmlldyBhcHBPcHRpb25zKSwgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoZWxlbUlkKVxuXG4gIGNsaWVudENvbm5lY3Q6IChldmVudENhbGxiYWNrKSAtPlxuICAgIEBjbGllbnQuY29ubmVjdCBldmVudENhbGxiYWNrXG5cbm1vZHVsZS5leHBvcnRzID0gbmV3IENsb3VkRmlsZU1hbmFnZXIoKVxuIiwidHIgPSByZXF1aXJlICcuL3V0aWxzL3RyYW5zbGF0ZSdcbmlzU3RyaW5nID0gcmVxdWlyZSAnLi91dGlscy9pcy1zdHJpbmcnXG5cbkNsb3VkRmlsZU1hbmFnZXJVSSA9IChyZXF1aXJlICcuL3VpJykuQ2xvdWRGaWxlTWFuYWdlclVJXG5cbkxvY2FsU3RvcmFnZVByb3ZpZGVyID0gcmVxdWlyZSAnLi9wcm92aWRlcnMvbG9jYWxzdG9yYWdlLXByb3ZpZGVyJ1xuUmVhZE9ubHlQcm92aWRlciA9IHJlcXVpcmUgJy4vcHJvdmlkZXJzL3JlYWRvbmx5LXByb3ZpZGVyJ1xuR29vZ2xlRHJpdmVQcm92aWRlciA9IHJlcXVpcmUgJy4vcHJvdmlkZXJzL2dvb2dsZS1kcml2ZS1wcm92aWRlcidcbkRvY3VtZW50U3RvcmVQcm92aWRlciA9IHJlcXVpcmUgJy4vcHJvdmlkZXJzL2RvY3VtZW50LXN0b3JlLXByb3ZpZGVyJ1xuXG5jbGFzcyBDbG91ZEZpbGVNYW5hZ2VyQ2xpZW50RXZlbnRcblxuICBjb25zdHJ1Y3RvcjogKEB0eXBlLCBAZGF0YSA9IHt9LCBAY2FsbGJhY2sgPSBudWxsLCBAc3RhdGUgPSB7fSkgLT5cblxuY2xhc3MgQ2xvdWRGaWxlTWFuYWdlckNsaWVudFxuXG4gIGNvbnN0cnVjdG9yOiAob3B0aW9ucykgLT5cbiAgICBAc3RhdGUgPVxuICAgICAgY29udGVudDogbnVsbFxuICAgICAgbWV0YWRhdGE6IG51bGxcbiAgICAgIGF2YWlsYWJsZVByb3ZpZGVyczogW11cbiAgICBAX3VpID0gbmV3IENsb3VkRmlsZU1hbmFnZXJVSSBAXG5cbiAgc2V0QXBwT3B0aW9uczogKGFwcE9wdGlvbnMgPSB7fSktPlxuICAgICMgZmx0ZXIgZm9yIGF2YWlsYWJsZSBwcm92aWRlcnNcbiAgICBhbGxQcm92aWRlcnMgPSB7fVxuICAgIGZvciBQcm92aWRlciBpbiBbUmVhZE9ubHlQcm92aWRlciwgTG9jYWxTdG9yYWdlUHJvdmlkZXIsIEdvb2dsZURyaXZlUHJvdmlkZXIsIERvY3VtZW50U3RvcmVQcm92aWRlcl1cbiAgICAgIGlmIFByb3ZpZGVyLkF2YWlsYWJsZSgpXG4gICAgICAgIGFsbFByb3ZpZGVyc1tQcm92aWRlci5OYW1lXSA9IFByb3ZpZGVyXG5cbiAgICAjIGRlZmF1bHQgdG8gYWxsIHByb3ZpZGVycyBpZiBub24gc3BlY2lmaWVkXG4gICAgaWYgbm90IGFwcE9wdGlvbnMucHJvdmlkZXJzXG4gICAgICBhcHBPcHRpb25zLnByb3ZpZGVycyA9IFtdXG4gICAgICBmb3Igb3duIHByb3ZpZGVyTmFtZSBvZiBhbGxQcm92aWRlcnNcbiAgICAgICAgYXBwT3B0aW9ucy5wcm92aWRlcnMucHVzaCBwcm92aWRlck5hbWVcblxuICAgICMgY2hlY2sgdGhlIHByb3ZpZGVyc1xuICAgIGZvciBwcm92aWRlciBpbiBhcHBPcHRpb25zLnByb3ZpZGVyc1xuICAgICAgW3Byb3ZpZGVyTmFtZSwgcHJvdmlkZXJPcHRpb25zXSA9IGlmIGlzU3RyaW5nIHByb3ZpZGVyIHRoZW4gW3Byb3ZpZGVyLCB7fV0gZWxzZSBbcHJvdmlkZXIubmFtZSwgcHJvdmlkZXJdXG4gICAgICBpZiBub3QgcHJvdmlkZXJOYW1lXG4gICAgICAgIEBfZXJyb3IgXCJJbnZhbGlkIHByb3ZpZGVyIHNwZWMgLSBtdXN0IGVpdGhlciBiZSBzdHJpbmcgb3Igb2JqZWN0IHdpdGggbmFtZSBwcm9wZXJ0eVwiXG4gICAgICBlbHNlXG4gICAgICAgIGlmIGFsbFByb3ZpZGVyc1twcm92aWRlck5hbWVdXG4gICAgICAgICAgUHJvdmlkZXIgPSBhbGxQcm92aWRlcnNbcHJvdmlkZXJOYW1lXVxuICAgICAgICAgIEBzdGF0ZS5hdmFpbGFibGVQcm92aWRlcnMucHVzaCBuZXcgUHJvdmlkZXIgcHJvdmlkZXJPcHRpb25zXG4gICAgICAgIGVsc2VcbiAgICAgICAgICBAX2Vycm9yIFwiVW5rbm93biBwcm92aWRlcjogI3twcm92aWRlck5hbWV9XCJcblxuICAgIEBfdWkuaW5pdCBhcHBPcHRpb25zLnVpXG5cbiAgIyBzaW5nbGUgY2xpZW50IC0gdXNlZCBieSB0aGUgY2xpZW50IGFwcCB0byByZWdpc3RlciBhbmQgcmVjZWl2ZSBjYWxsYmFjayBldmVudHNcbiAgY29ubmVjdDogKEBldmVudENhbGxiYWNrKSAtPlxuICAgIEBfZXZlbnQgJ2Nvbm5lY3RlZCcsIHtjbGllbnQ6IEB9XG5cbiAgIyBzaW5nbGUgbGlzdGVuZXIgLSB1c2VkIGJ5IHRoZSBSZWFjdCBtZW51IHZpYSB0byB3YXRjaCBjbGllbnQgc3RhdGUgY2hhbmdlc1xuICBsaXN0ZW46IChAbGlzdGVuZXJDYWxsYmFjaykgLT5cblxuICBuZXdGaWxlOiAoY2FsbGJhY2sgPSBudWxsKSAtPlxuICAgIEBzdGF0ZS5jb250ZW50ID0gbnVsbFxuICAgIEBzdGF0ZS5tZXRhZGF0YSA9IG51bGxcbiAgICBAX2V2ZW50ICduZXdlZEZpbGUnXG5cbiAgbmV3RmlsZURpYWxvZzogKGNhbGxiYWNrID0gbnVsbCkgLT5cbiAgICAjIGZvciBub3cganVzdCBjYWxsIG5ldyAtIGxhdGVyIHdlIGNhbiBhZGQgY2hhbmdlIG5vdGlmaWNhdGlvbiBmcm9tIHRoZSBjbGllbnQgc28gd2UgY2FuIHByb21wdCBmb3IgXCJBcmUgeW91IHN1cmU/XCJcbiAgICBAbmV3RmlsZSgpXG5cbiAgb3BlbkZpbGU6IChtZXRhZGF0YSwgY2FsbGJhY2sgPSBudWxsKSAtPlxuICAgIGlmIG1ldGFkYXRhPy5wcm92aWRlcj8uY2FuICdsb2FkJ1xuICAgICAgbWV0YWRhdGEucHJvdmlkZXIubG9hZCBtZXRhZGF0YSwgKGVyciwgY29udGVudCkgPT5cbiAgICAgICAgcmV0dXJuIEBfZXJyb3IoZXJyKSBpZiBlcnJcbiAgICAgICAgQF9maWxlQ2hhbmdlZCAnb3BlbmVkRmlsZScsIGNvbnRlbnQsIG1ldGFkYXRhXG4gICAgICAgIGNhbGxiYWNrPyBjb250ZW50LCBtZXRhZGF0YVxuICAgIGVsc2VcbiAgICAgIEBvcGVuRmlsZURpYWxvZyBjYWxsYmFja1xuXG4gIG9wZW5GaWxlRGlhbG9nOiAoY2FsbGJhY2sgPSBudWxsKSAtPlxuICAgIEBfdWkub3BlbkZpbGVEaWFsb2cgKG1ldGFkYXRhKSA9PlxuICAgICAgQG9wZW5GaWxlIG1ldGFkYXRhLCBjYWxsYmFja1xuXG4gIHNhdmU6IChjYWxsYmFjayA9IG51bGwpIC0+XG4gICAgQF9ldmVudCAnZ2V0Q29udGVudCcsIHt9LCAoY29udGVudCkgPT5cbiAgICAgIEBzYXZlQ29udGVudCBjb250ZW50LCBjYWxsYmFja1xuXG4gIHNhdmVDb250ZW50OiAoY29udGVudCwgY2FsbGJhY2sgPSBudWxsKSAtPlxuICAgIGlmIEBzdGF0ZS5tZXRhZGF0YVxuICAgICAgQHNhdmVGaWxlIGNvbnRlbnQsIEBzdGF0ZS5tZXRhZGF0YSwgY2FsbGJhY2tcbiAgICBlbHNlXG4gICAgICBAc2F2ZUZpbGVEaWFsb2cgY29udGVudCwgY2FsbGJhY2tcblxuICBzYXZlRmlsZTogKGNvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFjayA9IG51bGwpIC0+XG4gICAgaWYgbWV0YWRhdGE/LnByb3ZpZGVyPy5jYW4gJ3NhdmUnXG4gICAgICBtZXRhZGF0YS5wcm92aWRlci5zYXZlIGNvbnRlbnQsIG1ldGFkYXRhLCAoZXJyKSA9PlxuICAgICAgICByZXR1cm4gQF9lcnJvcihlcnIpIGlmIGVyclxuICAgICAgICBAX2ZpbGVDaGFuZ2VkICdzYXZlZEZpbGUnLCBjb250ZW50LCBtZXRhZGF0YVxuICAgICAgICBjYWxsYmFjaz8gY29udGVudCwgbWV0YWRhdGFcbiAgICBlbHNlXG4gICAgICBAc2F2ZUZpbGVEaWFsb2cgY29udGVudCwgY2FsbGJhY2tcblxuICBzYXZlRmlsZURpYWxvZzogKGNvbnRlbnQgPSBudWxsLCBjYWxsYmFjayA9IG51bGwpIC0+XG4gICAgQF91aS5zYXZlRmlsZURpYWxvZyAobWV0YWRhdGEpID0+XG4gICAgICBAX2RpYWxvZ1NhdmUgY29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrXG5cbiAgc2F2ZUZpbGVBc0RpYWxvZzogKGNvbnRlbnQgPSBudWxsLCBjYWxsYmFjayA9IG51bGwpIC0+XG4gICAgQF91aS5zYXZlRmlsZUFzRGlhbG9nIChtZXRhZGF0YSkgPT5cbiAgICAgIEBfZGlhbG9nU2F2ZSBjb250ZW50LCBtZXRhZGF0YSwgY2FsbGJhY2tcblxuICBfZGlhbG9nU2F2ZTogKGNvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cbiAgICBpZiBjb250ZW50IGlzbnQgbnVsbFxuICAgICAgQHNhdmVGaWxlIGNvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFja1xuICAgIGVsc2VcbiAgICAgIEBfZXZlbnQgJ2dldENvbnRlbnQnLCB7fSwgKGNvbnRlbnQpID0+XG4gICAgICAgIEBzYXZlRmlsZSBjb250ZW50LCBtZXRhZGF0YSwgY2FsbGJhY2tcblxuICBfZXJyb3I6IChtZXNzYWdlKSAtPlxuICAgICMgZm9yIG5vdyBhbiBhbGVydFxuICAgIGFsZXJ0IG1lc3NhZ2VcblxuICBfZmlsZUNoYW5nZWQ6ICh0eXBlLCBjb250ZW50LCBtZXRhZGF0YSkgLT5cbiAgICBAc3RhdGUuY29udGVudCA9IGNvbnRlbnRcbiAgICBAc3RhdGUubWV0YWRhdGEgPSBtZXRhZGF0YVxuICAgIEBfZXZlbnQgdHlwZSwge2NvbnRlbnQ6IGNvbnRlbnQsIG1ldGFkYXRhOiBtZXRhZGF0YX1cblxuICBfZXZlbnQ6ICh0eXBlLCBkYXRhID0ge30sIGV2ZW50Q2FsbGJhY2sgPSBudWxsKSAtPlxuICAgIGV2ZW50ID0gbmV3IENsb3VkRmlsZU1hbmFnZXJDbGllbnRFdmVudCB0eXBlLCBkYXRhLCBldmVudENhbGxiYWNrLCBAc3RhdGVcbiAgICBAZXZlbnRDYWxsYmFjaz8gZXZlbnRcbiAgICBAbGlzdGVuZXJDYWxsYmFjaz8gZXZlbnRcblxubW9kdWxlLmV4cG9ydHMgPVxuICBDbG91ZEZpbGVNYW5hZ2VyQ2xpZW50RXZlbnQ6IENsb3VkRmlsZU1hbmFnZXJDbGllbnRFdmVudFxuICBDbG91ZEZpbGVNYW5hZ2VyQ2xpZW50OiBDbG91ZEZpbGVNYW5hZ2VyQ2xpZW50XG4iLCJ7ZGl2LCBidXR0b259ID0gUmVhY3QuRE9NXG5cbmF1dGhvcml6ZVVybCAgPSBcImh0dHA6Ly9kb2N1bWVudC1zdG9yZS5oZXJva3VhcHAuY29tL3VzZXIvYXV0aGVudGljYXRlXCJcbmNoZWNrTG9naW5VcmwgPSBcImh0dHA6Ly9kb2N1bWVudC1zdG9yZS5oZXJva3VhcHAuY29tL3VzZXIvaW5mb1wiXG5saXN0VXJsID0gXCJodHRwOi8vZG9jdW1lbnQtc3RvcmUuaGVyb2t1YXBwLmNvbS9kb2N1bWVudC9hbGxcIlxuXG50ciA9IHJlcXVpcmUgJy4uL3V0aWxzL3RyYW5zbGF0ZSdcbmlzU3RyaW5nID0gcmVxdWlyZSAnLi4vdXRpbHMvaXMtc3RyaW5nJ1xuXG5Qcm92aWRlckludGVyZmFjZSA9IChyZXF1aXJlICcuL3Byb3ZpZGVyLWludGVyZmFjZScpLlByb3ZpZGVySW50ZXJmYWNlXG5DbG91ZE1ldGFkYXRhID0gKHJlcXVpcmUgJy4vcHJvdmlkZXItaW50ZXJmYWNlJykuQ2xvdWRNZXRhZGF0YVxuXG5Eb2N1bWVudFN0b3JlQXV0aG9yaXphdGlvbkRpYWxvZyA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgUmVhY3QuY3JlYXRlQ2xhc3NcbiAgZGlzcGxheU5hbWU6ICdEb2N1bWVudFN0b3JlQXV0aG9yaXphdGlvbkRpYWxvZydcblxuICBhdXRoZW50aWNhdGU6IC0+XG4gICAgQHByb3BzLnByb3ZpZGVyLmF1dGhvcml6ZSgpXG5cbiAgcmVuZGVyOiAtPlxuICAgIChkaXYge30sXG4gICAgICAoYnV0dG9uIHtvbkNsaWNrOiBAYXV0aGVudGljYXRlfSwgJ0F1dGhvcml6YXRpb24gTmVlZGVkJylcbiAgICApXG5cbmNsYXNzIERvY3VtZW50U3RvcmVQcm92aWRlciBleHRlbmRzIFByb3ZpZGVySW50ZXJmYWNlXG5cbiAgY29uc3RydWN0b3I6IChAb3B0aW9ucyA9IHt9KSAtPlxuICAgIHN1cGVyXG4gICAgICBuYW1lOiBEb2N1bWVudFN0b3JlUHJvdmlkZXIuTmFtZVxuICAgICAgZGlzcGxheU5hbWU6IEBvcHRpb25zLmRpc3BsYXlOYW1lIG9yICh0ciAnflBST1ZJREVSLkRPQ1VNRU5UX1NUT1JFJylcbiAgICAgIGNhcGFiaWxpdGllczpcbiAgICAgICAgc2F2ZTogdHJ1ZVxuICAgICAgICBsb2FkOiB0cnVlXG4gICAgICAgIGxpc3Q6IHRydWVcblxuICBATmFtZTogJ2RvY3VtZW50U3RvcmUnXG5cbiAgYXV0aG9yaXplZDogKEBhdXRoQ2FsbGJhY2spIC0+XG5cbiAgYXV0aG9yaXplOiAtPlxuICAgIEBfc2hvd0xvZ2luV2luZG93KClcbiAgICBAX2NoZWNrTG9naW4oKVxuXG4gIF9sb2dpblN1Y2Nlc3NmdWw6IChkYXRhKSAtPlxuICAgIGlmIEBfbG9naW5XaW5kb3cgdGhlbiBAX2xvZ2luV2luZG93LmNsb3NlKClcbiAgICBAYXV0aENhbGxiYWNrIHRydWVcblxuICBfY2hlY2tMb2dpbjogLT5cbiAgICBwcm92aWRlciA9IEBcbiAgICAkLmFqYXhcbiAgICAgIGRhdGFUeXBlOiAnanNvbidcbiAgICAgIHVybDogY2hlY2tMb2dpblVybFxuICAgICAgeGhyRmllbGRzOlxuICAgICAgICB3aXRoQ3JlZGVudGlhbHM6IHRydWVcbiAgICAgIHN1Y2Nlc3M6IChkYXRhKSAtPlxuICAgICAgICBwcm92aWRlci5fbG9naW5TdWNjZXNzZnVsKGRhdGEpXG4gICAgICBlcnJvcjogLT5cbiAgICAgICAgIyBub3RoaW5nIHlldFxuXG4gIF9sb2dpbldpbmRvdzogbnVsbFxuXG4gIF9zaG93TG9naW5XaW5kb3c6IC0+XG4gICAgaWYgQF9sb2dpbldpbmRvdyBhbmQgbm90IEBfbG9naW5XaW5kb3cuY2xvc2VkXG4gICAgICBAX2xvZ2luV2luZG93LmZvY3VzKClcbiAgICBlbHNlXG5cbiAgICAgIGNvbXB1dGVTY3JlZW5Mb2NhdGlvbiA9ICh3LCBoKSAtPlxuICAgICAgICBzY3JlZW5MZWZ0ID0gd2luZG93LnNjcmVlbkxlZnQgb3Igc2NyZWVuLmxlZnRcbiAgICAgICAgc2NyZWVuVG9wICA9IHdpbmRvdy5zY3JlZW5Ub3AgIG9yIHNjcmVlbi50b3BcbiAgICAgICAgd2lkdGggID0gd2luZG93LmlubmVyV2lkdGggIG9yIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGllbnRXaWR0aCAgb3Igc2NyZWVuLndpZHRoXG4gICAgICAgIGhlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodCBvciBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xpZW50SGVpZ2h0IG9yIHNjcmVlbi5oZWlnaHRcblxuICAgICAgICBsZWZ0ID0gKCh3aWR0aCAvIDIpIC0gKHcgLyAyKSkgKyBzY3JlZW5MZWZ0XG4gICAgICAgIHRvcCA9ICgoaGVpZ2h0IC8gMikgLSAoaCAvIDIpKSArIHNjcmVlblRvcFxuICAgICAgICByZXR1cm4ge2xlZnQsIHRvcH1cblxuICAgICAgd2lkdGggPSAxMDAwXG4gICAgICBoZWlnaHQgPSA0ODBcbiAgICAgIHBvc2l0aW9uID0gY29tcHV0ZVNjcmVlbkxvY2F0aW9uIHdpZHRoLCBoZWlnaHRcbiAgICAgIHdpbmRvd0ZlYXR1cmVzID0gW1xuICAgICAgICAnd2lkdGg9JyArIHdpZHRoXG4gICAgICAgICdoZWlnaHQ9JyArIGhlaWdodFxuICAgICAgICAndG9wPScgKyBwb3NpdGlvbi50b3Agb3IgMjAwXG4gICAgICAgICdsZWZ0PScgKyBwb3NpdGlvbi5sZWZ0IG9yIDIwMFxuICAgICAgICAnZGVwZW5kZW50PXllcydcbiAgICAgICAgJ3Jlc2l6YWJsZT1ubydcbiAgICAgICAgJ2xvY2F0aW9uPW5vJ1xuICAgICAgICAnZGlhbG9nPXllcydcbiAgICAgICAgJ21lbnViYXI9bm8nXG4gICAgICBdXG5cbiAgICAgIEBfbG9naW5XaW5kb3cgPSB3aW5kb3cub3BlbihhdXRob3JpemVVcmwsICdhdXRoJywgd2luZG93RmVhdHVyZXMuam9pbigpKVxuXG4gICAgICBwb2xsQWN0aW9uID0gPT5cbiAgICAgICAgdHJ5XG4gICAgICAgICAgaHJlZiA9IEBfbG9naW5XaW5kb3cubG9jYXRpb24uaHJlZlxuICAgICAgICAgIGlmIChocmVmIGlzIHdpbmRvdy5sb2NhdGlvbi5ocmVmKVxuICAgICAgICAgICAgY2xlYXJJbnRlcnZhbCBwb2xsXG4gICAgICAgICAgICBAX2xvZ2luV2luZG93LmNsb3NlKClcbiAgICAgICAgICAgIEBfY2hlY2tMb2dpbigpXG4gICAgICAgIGNhdGNoIGVcbiAgICAgICAgICBjb25zb2xlLmxvZyBlXG5cbiAgICAgIHBvbGwgPSBzZXRJbnRlcnZhbCBwb2xsQWN0aW9uLCAyMDBcblxuICByZW5kZXJBdXRob3JpemF0aW9uRGlhbG9nOiAtPlxuICAgIChEb2N1bWVudFN0b3JlQXV0aG9yaXphdGlvbkRpYWxvZyB7cHJvdmlkZXI6IEAsIGF1dGhDYWxsYmFjazogQGF1dGhDYWxsYmFja30pXG5cbiAgbGlzdDogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cbiAgICBwcm92aWRlciA9IEBcbiAgICAkLmFqYXhcbiAgICAgIGRhdGFUeXBlOiAnanNvbidcbiAgICAgIHVybDogbGlzdFVybFxuICAgICAgeGhyRmllbGRzOlxuICAgICAgICB3aXRoQ3JlZGVudGlhbHM6IHRydWVcbiAgICAgIHN1Y2Nlc3M6IChkYXRhKSAtPlxuICAgICAgICBsaXN0ID0gW11cbiAgICAgICAgcGF0aCA9IG1ldGFkYXRhPy5wYXRoIG9yICcnXG4gICAgICAgIGZvciBvd24ga2V5IG9mIHdpbmRvdy5sb2NhbFN0b3JhZ2VcbiAgICAgICAgICBsaXN0LnB1c2ggbmV3IENsb3VkTWV0YWRhdGFcbiAgICAgICAgICAgIG5hbWU6IGtleVxuICAgICAgICAgICAgcGF0aDogXCIje3BhdGh9LyN7bmFtZX1cIlxuICAgICAgICAgICAgdHlwZTogQ2xvdWRNZXRhZGF0YS5GaWxlXG4gICAgICAgICAgICBwcm92aWRlcjogcHJvdmlkZXJcbiAgICAgICAgY2FsbGJhY2sgbnVsbCwgbGlzdFxuICAgICAgZXJyb3I6IC0+XG4gICAgICAgIGNhbGxiYWNrIG51bGwsIFtdXG5cbiAgbG9hZDogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cblxuXG5tb2R1bGUuZXhwb3J0cyA9IERvY3VtZW50U3RvcmVQcm92aWRlclxuIiwie2Rpdn0gPSBSZWFjdC5ET01cblxudHIgPSByZXF1aXJlICcuLi91dGlscy90cmFuc2xhdGUnXG5pc1N0cmluZyA9IHJlcXVpcmUgJy4uL3V0aWxzL2lzLXN0cmluZydcblxuUHJvdmlkZXJJbnRlcmZhY2UgPSAocmVxdWlyZSAnLi9wcm92aWRlci1pbnRlcmZhY2UnKS5Qcm92aWRlckludGVyZmFjZVxuQ2xvdWRNZXRhZGF0YSA9IChyZXF1aXJlICcuL3Byb3ZpZGVyLWludGVyZmFjZScpLkNsb3VkTWV0YWRhdGFcblxue2J1dHRvbn0gPSBSZWFjdC5ET01cblxuQVVUSCA9XG4gIEFQUF9JRCA6ICcxMDk1OTE4MDEyNTk0J1xuICBERVZFTE9QRVJfS0VZOiAnQUl6YVN5QVVvYnJFWHF0YlpIQnZyMjR0YW1kRTZKeG1QWVRSUEVBJ1xuICBDTElFTlRfSUQ6ICcxMDk1OTE4MDEyNTk0LXN2czcyZXFmYWxhc3VjNHQxcDFwczFtOHI5Yjhwc3NvLmFwcHMuZ29vZ2xldXNlcmNvbnRlbnQuY29tJ1xuICBTQ09QRVM6ICdodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS9hdXRoL2RyaXZlJ1xuXG5Hb29nbGVEcml2ZUF1dGhvcml6YXRpb25EaWFsb2cgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IFJlYWN0LmNyZWF0ZUNsYXNzXG4gIGRpc3BsYXlOYW1lOiAnR29vZ2xlRHJpdmVBdXRob3JpemF0aW9uRGlhbG9nJ1xuXG4gIGdldEluaXRpYWxTdGF0ZTogLT5cbiAgICBsb2FkZWRHQVBJOiBmYWxzZVxuXG4gIGNvbXBvbmVudFdpbGxNb3VudDogLT5cbiAgICBAcHJvcHMucHJvdmlkZXIuX2xvYWRlZEdBUEkgPT5cbiAgICAgIEBzZXRTdGF0ZSBsb2FkZWRHQVBJOiB0cnVlXG5cbiAgYXV0aGVudGljYXRlOiAtPlxuICAgIEBwcm9wcy5wcm92aWRlci5hdXRob3JpemUgR29vZ2xlRHJpdmVQcm92aWRlci5TSE9XX1BPUFVQXG5cbiAgcmVuZGVyOiAtPlxuICAgIChkaXYge30sXG4gICAgICBpZiBAc3RhdGUubG9hZGVkR0FQSVxuICAgICAgICAoYnV0dG9uIHtvbkNsaWNrOiBAYXV0aGVudGljYXRlfSwgJ0F1dGhvcml6YXRpb24gTmVlZGVkJylcbiAgICAgIGVsc2VcbiAgICAgICAgJ1dhaXRpbmcgZm9yIHRoZSBHb29nbGUgQ2xpZW50IEFQSSB0byBsb2FkLi4uJ1xuICAgIClcblxuY2xhc3MgR29vZ2xlRHJpdmVQcm92aWRlciBleHRlbmRzIFByb3ZpZGVySW50ZXJmYWNlXG5cbiAgY29uc3RydWN0b3I6IChAb3B0aW9ucyA9IHt9KSAtPlxuICAgIHN1cGVyXG4gICAgICBuYW1lOiBHb29nbGVEcml2ZVByb3ZpZGVyLk5hbWVcbiAgICAgIGRpc3BsYXlOYW1lOiBAb3B0aW9ucy5kaXNwbGF5TmFtZSBvciAodHIgJ35QUk9WSURFUi5HT09HTEVfRFJJVkUnKVxuICAgICAgY2FwYWJpbGl0aWVzOlxuICAgICAgICBzYXZlOiB0cnVlXG4gICAgICAgIGxvYWQ6IHRydWVcbiAgICAgICAgbGlzdDogdHJ1ZVxuICAgIEBhdXRoVG9rZW4gPSBudWxsXG4gICAgQG1pbWVUeXBlID0gXCJhcHBsaWNhdGlvbi9qc29uXCJcbiAgICBAX2xvYWRHQVBJKClcblxuICBATmFtZTogJ2dvb2dsZURyaXZlJ1xuXG4gICMgYWxpYXNlcyBmb3IgYm9vbGVhbiBwYXJhbWV0ZXIgdG8gYXV0aG9yaXplXG4gIEBJTU1FRElBVEUgPSB0cnVlXG4gIEBTSE9XX1BPUFVQID0gZmFsc2VcblxuICBhdXRob3JpemVkOiAoQGF1dGhDYWxsYmFjaykgLT5cbiAgICBpZiBAYXV0aFRva2VuXG4gICAgICBAYXV0aENhbGxiYWNrIHRydWVcbiAgICBlbHNlXG4gICAgICBAYXV0aG9yaXplIEdvb2dsZURyaXZlUHJvdmlkZXIuSU1NRURJQVRFXG5cbiAgYXV0aG9yaXplOiAoaW1tZWRpYXRlKSAtPlxuICAgIEBfbG9hZGVkR0FQSSA9PlxuICAgICAgYXJncyA9XG4gICAgICAgIGNsaWVudF9pZDogQVVUSC5DTElFTlRfSURcbiAgICAgICAgc2NvcGU6IEFVVEguU0NPUEVTXG4gICAgICAgIGltbWVkaWF0ZTogaW1tZWRpYXRlXG4gICAgICBnYXBpLmF1dGguYXV0aG9yaXplIGFyZ3MsIChhdXRoVG9rZW4pID0+XG4gICAgICAgIEBhdXRoVG9rZW4gPSBpZiBhdXRoVG9rZW4gYW5kIG5vdCBhdXRoVG9rZW4uZXJyb3IgdGhlbiBhdXRoVG9rZW4gZWxzZSBudWxsXG4gICAgICAgIEBhdXRoQ2FsbGJhY2sgQGF1dGhUb2tlbiBpc250IG51bGxcblxuICByZW5kZXJBdXRob3JpemF0aW9uRGlhbG9nOiAtPlxuICAgIChHb29nbGVEcml2ZUF1dGhvcml6YXRpb25EaWFsb2cge3Byb3ZpZGVyOiBAfSlcblxuICBzYXZlOiAgKGNvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cbiAgICBAX2xvYWRlZEdBUEkgPT5cbiAgICAgIEBfc2VuZEZpbGUgY29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrXG5cbiAgbG9hZDogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cbiAgICBAX2xvYWRlZEdBUEkgPT5cbiAgICAgIHJlcXVlc3QgPSBnYXBpLmNsaWVudC5kcml2ZS5maWxlcy5nZXRcbiAgICAgICAgZmlsZUlkOiBtZXRhZGF0YS5wcm92aWRlckRhdGEuaWRcbiAgICAgIHJlcXVlc3QuZXhlY3V0ZSAoZmlsZSkgPT5cbiAgICAgICAgaWYgZmlsZT8uZG93bmxvYWRVcmxcbiAgICAgICAgICBAX2Rvd25sb2FkRnJvbVVybCBmaWxlLmRvd25sb2FkVXJsLCBAYXV0aFRva2VuLCBjYWxsYmFja1xuICAgICAgICBlbHNlXG4gICAgICAgICAgY2FsbGJhY2sgJ1VuYWJsZSB0byBnZXQgZG93bmxvYWQgdXJsJ1xuXG4gIGxpc3Q6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XG4gICAgQF9sb2FkZWRHQVBJID0+XG4gICAgICByZXF1ZXN0ID0gZ2FwaS5jbGllbnQuZHJpdmUuZmlsZXMubGlzdCgpXG4gICAgICByZXF1ZXN0LmV4ZWN1dGUgKHJlc3VsdCkgPT5cbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrKCdVbmFibGUgdG8gbGlzdCBmaWxlcycpIGlmIG5vdCByZXN1bHRcbiAgICAgICAgbGlzdCA9IFtdXG4gICAgICAgIGZvciBpdGVtIGluIHJlc3VsdD8uaXRlbXNcbiAgICAgICAgICAjIFRPRE86IGZvciBub3cgZG9uJ3QgYWxsb3cgZm9sZGVyc1xuICAgICAgICAgIGlmIGl0ZW0ubWltZVR5cGUgaXNudCAnYXBwbGljYXRpb24vdm5kLmdvb2dsZS1hcHBzLmZvbGRlcidcbiAgICAgICAgICAgIGxpc3QucHVzaCBuZXcgQ2xvdWRNZXRhZGF0YVxuICAgICAgICAgICAgICBuYW1lOiBpdGVtLnRpdGxlXG4gICAgICAgICAgICAgIHBhdGg6IFwiXCJcbiAgICAgICAgICAgICAgdHlwZTogaWYgaXRlbS5taW1lVHlwZSBpcyAnYXBwbGljYXRpb24vdm5kLmdvb2dsZS1hcHBzLmZvbGRlcicgdGhlbiBDbG91ZE1ldGFkYXRhLkZvbGRlciBlbHNlIENsb3VkTWV0YWRhdGEuRmlsZVxuICAgICAgICAgICAgICBwcm92aWRlcjogQFxuICAgICAgICAgICAgICBwcm92aWRlckRhdGE6XG4gICAgICAgICAgICAgICAgaWQ6IGl0ZW0uaWRcbiAgICAgICAgbGlzdC5zb3J0IChhLCBiKSAtPlxuICAgICAgICAgIGxvd2VyQSA9IGEubmFtZS50b0xvd2VyQ2FzZSgpXG4gICAgICAgICAgbG93ZXJCID0gYi5uYW1lLnRvTG93ZXJDYXNlKClcbiAgICAgICAgICByZXR1cm4gLTEgaWYgbG93ZXJBIDwgbG93ZXJCXG4gICAgICAgICAgcmV0dXJuIDEgaWYgbG93ZXJBID4gbG93ZXJCXG4gICAgICAgICAgcmV0dXJuIDBcbiAgICAgICAgY2FsbGJhY2sgbnVsbCwgbGlzdFxuXG4gIF9sb2FkR0FQSTogLT5cbiAgICBpZiBub3Qgd2luZG93Ll9Mb2FkaW5nR0FQSVxuICAgICAgd2luZG93Ll9Mb2FkaW5nR0FQSSA9IHRydWVcbiAgICAgIHdpbmRvdy5fR0FQSU9uTG9hZCA9IC0+XG4gICAgICAgIEB3aW5kb3cuX0xvYWRlZEdBUEkgPSB0cnVlXG4gICAgICBzY3JpcHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50ICdzY3JpcHQnXG4gICAgICBzY3JpcHQuc3JjID0gJ2h0dHBzOi8vYXBpcy5nb29nbGUuY29tL2pzL2NsaWVudC5qcz9vbmxvYWQ9X0dBUElPbkxvYWQnXG4gICAgICBkb2N1bWVudC5oZWFkLmFwcGVuZENoaWxkIHNjcmlwdFxuXG4gIF9sb2FkZWRHQVBJOiAoY2FsbGJhY2spIC0+XG4gICAgY2hlY2sgPSAtPlxuICAgICAgaWYgd2luZG93Ll9Mb2FkZWRHQVBJXG4gICAgICAgIGdhcGkuY2xpZW50LmxvYWQgJ2RyaXZlJywgJ3YyJywgLT5cbiAgICAgICAgICBjYWxsYmFjaygpXG4gICAgICBlbHNlXG4gICAgICAgIHNldFRpbWVvdXQgY2hlY2ssIDEwXG4gICAgc2V0VGltZW91dCBjaGVjaywgMTBcblxuICBfZG93bmxvYWRGcm9tVXJsOiAodXJsLCB0b2tlbiwgY2FsbGJhY2spIC0+XG4gICAgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KClcbiAgICB4aHIub3BlbiAnR0VUJywgdXJsXG4gICAgaWYgdG9rZW5cbiAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyICdBdXRob3JpemF0aW9uJywgXCJCZWFyZXIgI3t0b2tlbi5hY2Nlc3NfdG9rZW59XCJcbiAgICB4aHIub25sb2FkID0gLT5cbiAgICAgIGNhbGxiYWNrIG51bGwsIHhoci5yZXNwb25zZVRleHRcbiAgICB4aHIub25lcnJvciA9IC0+XG4gICAgICBjYWxsYmFjayBcIlVuYWJsZSB0byBkb3dubG9hZCAje3VybH1cIlxuICAgIHhoci5zZW5kKClcblxuICBfc2VuZEZpbGU6IChjb250ZW50LCBtZXRhZGF0YSwgY2FsbGJhY2spIC0+XG4gICAgYm91bmRhcnkgPSAnLS0tLS0tLTMxNDE1OTI2NTM1ODk3OTMyMzg0NidcbiAgICBoZWFkZXIgPSBKU09OLnN0cmluZ2lmeVxuICAgICAgdGl0bGU6IG1ldGFkYXRhLm5hbWVcbiAgICAgIG1pbWVUeXBlOiBAbWltZVR5cGVcblxuICAgIFttZXRob2QsIHBhdGhdID0gaWYgbWV0YWRhdGEucHJvdmlkZXJEYXRhPy5pZFxuICAgICAgWydQVVQnLCBcIi91cGxvYWQvZHJpdmUvdjIvZmlsZXMvI3ttZXRhZGF0YS5wcm92aWRlckRhdGEuaWR9XCJdXG4gICAgZWxzZVxuICAgICAgWydQT1NUJywgJy91cGxvYWQvZHJpdmUvdjIvZmlsZXMnXVxuXG4gICAgYm9keSA9IFtcbiAgICAgIFwiXFxyXFxuLS0je2JvdW5kYXJ5fVxcclxcbkNvbnRlbnQtVHlwZTogYXBwbGljYXRpb24vanNvblxcclxcblxcclxcbiN7aGVhZGVyfVwiLFxuICAgICAgXCJcXHJcXG4tLSN7Ym91bmRhcnl9XFxyXFxuQ29udGVudC1UeXBlOiAje0BtaW1lVHlwZX1cXHJcXG5cXHJcXG4je2NvbnRlbnR9XCIsXG4gICAgICBcIlxcclxcbi0tI3tib3VuZGFyeX0tLVwiXG4gICAgXS5qb2luICcnXG5cbiAgICByZXF1ZXN0ID0gZ2FwaS5jbGllbnQucmVxdWVzdFxuICAgICAgcGF0aDogcGF0aFxuICAgICAgbWV0aG9kOiBtZXRob2RcbiAgICAgIHBhcmFtczoge3VwbG9hZFR5cGU6ICdtdWx0aXBhcnQnfVxuICAgICAgaGVhZGVyczogeydDb250ZW50LVR5cGUnOiAnbXVsdGlwYXJ0L3JlbGF0ZWQ7IGJvdW5kYXJ5PVwiJyArIGJvdW5kYXJ5ICsgJ1wiJ31cbiAgICAgIGJvZHk6IGJvZHlcblxuICAgIHJlcXVlc3QuZXhlY3V0ZSAoZmlsZSkgLT5cbiAgICAgIGlmIGNhbGxiYWNrXG4gICAgICAgIGlmIGZpbGU/LmVycm9yXG4gICAgICAgICAgY2FsbGJhY2sgXCJVbmFibGVkIHRvIHVwbG9hZCBmaWxlOiAje2ZpbGUuZXJyb3IubWVzc2FnZX1cIlxuICAgICAgICBlbHNlIGlmIGZpbGVcbiAgICAgICAgICBjYWxsYmFjayBudWxsLCBmaWxlXG4gICAgICAgIGVsc2VcbiAgICAgICAgICBjYWxsYmFjayAnVW5hYmxlZCB0byB1cGxvYWQgZmlsZSdcblxubW9kdWxlLmV4cG9ydHMgPSBHb29nbGVEcml2ZVByb3ZpZGVyXG4iLCJ0ciA9IHJlcXVpcmUgJy4uL3V0aWxzL3RyYW5zbGF0ZSdcblxuUHJvdmlkZXJJbnRlcmZhY2UgPSAocmVxdWlyZSAnLi9wcm92aWRlci1pbnRlcmZhY2UnKS5Qcm92aWRlckludGVyZmFjZVxuQ2xvdWRNZXRhZGF0YSA9IChyZXF1aXJlICcuL3Byb3ZpZGVyLWludGVyZmFjZScpLkNsb3VkTWV0YWRhdGFcblxuY2xhc3MgTG9jYWxTdG9yYWdlUHJvdmlkZXIgZXh0ZW5kcyBQcm92aWRlckludGVyZmFjZVxuXG4gIGNvbnN0cnVjdG9yOiAoQG9wdGlvbnMgPSB7fSkgLT5cbiAgICBzdXBlclxuICAgICAgbmFtZTogTG9jYWxTdG9yYWdlUHJvdmlkZXIuTmFtZVxuICAgICAgZGlzcGxheU5hbWU6IEBvcHRpb25zLmRpc3BsYXlOYW1lIG9yICh0ciAnflBST1ZJREVSLkxPQ0FMX1NUT1JBR0UnKVxuICAgICAgY2FwYWJpbGl0aWVzOlxuICAgICAgICBzYXZlOiB0cnVlXG4gICAgICAgIGxvYWQ6IHRydWVcbiAgICAgICAgbGlzdDogdHJ1ZVxuXG4gIEBOYW1lOiAnbG9jYWxTdG9yYWdlJ1xuICBAQXZhaWxhYmxlOiAtPlxuICAgIHJlc3VsdCA9IHRyeVxuICAgICAgdGVzdCA9ICdMb2NhbFN0b3JhZ2VQcm92aWRlcjo6YXV0aCdcbiAgICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2Uuc2V0SXRlbSh0ZXN0LCB0ZXN0KVxuICAgICAgd2luZG93LmxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKHRlc3QpXG4gICAgICB0cnVlXG4gICAgY2F0Y2hcbiAgICAgIGZhbHNlXG5cbiAgc2F2ZTogKGNvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cbiAgICB0cnlcbiAgICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2Uuc2V0SXRlbSBAX2dldEtleShtZXRhZGF0YS5uYW1lKSwgY29udGVudFxuICAgICAgY2FsbGJhY2sgbnVsbFxuICAgIGNhdGNoXG4gICAgICBjYWxsYmFjayAnVW5hYmxlIHRvIHNhdmUnXG5cbiAgbG9hZDogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cbiAgICB0cnlcbiAgICAgIGNvbnRlbnQgPSB3aW5kb3cubG9jYWxTdG9yYWdlLmdldEl0ZW0gQF9nZXRLZXkgbWV0YWRhdGEubmFtZVxuICAgICAgY2FsbGJhY2sgbnVsbCwgY29udGVudFxuICAgIGNhdGNoXG4gICAgICBjYWxsYmFjayAnVW5hYmxlIHRvIGxvYWQnXG5cbiAgbGlzdDogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cbiAgICBsaXN0ID0gW11cbiAgICBwYXRoID0gbWV0YWRhdGE/LnBhdGggb3IgJydcbiAgICBwcmVmaXggPSBAX2dldEtleSBwYXRoXG4gICAgZm9yIG93biBrZXkgb2Ygd2luZG93LmxvY2FsU3RvcmFnZVxuICAgICAgaWYga2V5LnN1YnN0cigwLCBwcmVmaXgubGVuZ3RoKSBpcyBwcmVmaXhcbiAgICAgICAgW25hbWUsIHJlbWFpbmRlci4uLl0gPSBrZXkuc3Vic3RyKHByZWZpeC5sZW5ndGgpLnNwbGl0KCcvJylcbiAgICAgICAgbGlzdC5wdXNoIG5ldyBDbG91ZE1ldGFkYXRhXG4gICAgICAgICAgbmFtZToga2V5LnN1YnN0cihwcmVmaXgubGVuZ3RoKVxuICAgICAgICAgIHBhdGg6IFwiI3twYXRofS8je25hbWV9XCJcbiAgICAgICAgICB0eXBlOiBpZiByZW1haW5kZXIubGVuZ3RoID4gMCB0aGVuIENsb3VkTWV0YWRhdGEuRm9sZGVyIGVsc2UgQ2xvdWRNZXRhZGF0YS5GaWxlXG4gICAgICAgICAgcHJvdmlkZXI6IEBcbiAgICBjYWxsYmFjayBudWxsLCBsaXN0XG5cbiAgX2dldEtleTogKG5hbWUgPSAnJykgLT5cbiAgICBcImNmbTo6I3tuYW1lfVwiXG5cbm1vZHVsZS5leHBvcnRzID0gTG9jYWxTdG9yYWdlUHJvdmlkZXJcbiIsIntkaXZ9ID0gUmVhY3QuRE9NXG5cbmNsYXNzIENsb3VkRmlsZVxuICBjb250cnVjdG9yOiAob3B0aW9ucykgLT5cbiAgICB7QGNvbnRlbnQsIEBtZXRhZGF0YX0gPSBvcHRpb25zXG5cbmNsYXNzIENsb3VkTWV0YWRhdGFcbiAgY29uc3RydWN0b3I6IChvcHRpb25zKSAtPlxuICAgIHtAbmFtZSwgQHBhdGgsIEB0eXBlLCBAcHJvdmlkZXIsIEBwcm92aWRlckRhdGF9ID0gb3B0aW9uc1xuICBARm9sZGVyOiAnZm9sZGVyJ1xuICBARmlsZTogJ2ZpbGUnXG5cbkF1dGhvcml6YXRpb25Ob3RJbXBsZW1lbnRlZERpYWxvZyA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgUmVhY3QuY3JlYXRlQ2xhc3NcbiAgZGlzcGxheU5hbWU6ICdBdXRob3JpemF0aW9uTm90SW1wbGVtZW50ZWREaWFsb2cnXG4gIHJlbmRlcjogLT5cbiAgICAoZGl2IHt9LCBcIkF1dGhvcml6YXRpb24gZGlhbG9nIG5vdCB5ZXQgaW1wbGVtZW50ZWQgZm9yICN7QHByb3BzLnByb3ZpZGVyLmRpc3BsYXlOYW1lfVwiKVxuXG5jbGFzcyBQcm92aWRlckludGVyZmFjZVxuXG4gIGNvbnN0cnVjdG9yOiAob3B0aW9ucykgLT5cbiAgICB7QG5hbWUsIEBkaXNwbGF5TmFtZSwgQGNhcGFiaWxpdGllc30gPSBvcHRpb25zXG4gICAgQHVzZXIgPSBudWxsXG5cbiAgQEF2YWlsYWJsZTogLT4gdHJ1ZVxuXG4gIGNhbjogKGNhcGFiaWxpdHkpIC0+XG4gICAgQGNhcGFiaWxpdGllc1tjYXBhYmlsaXR5XVxuXG4gIGF1dGhvcml6ZWQ6IChjYWxsYmFjaykgLT5cbiAgICBjYWxsYmFjayB0cnVlXG5cbiAgYXV0aG9yaXphdGlvbkRpYWxvZzogQXV0aG9yaXphdGlvbk5vdEltcGxlbWVudGVkRGlhbG9nXG5cbiAgZGlhbG9nOiAoY2FsbGJhY2spIC0+XG4gICAgQF9ub3RJbXBsZW1lbnRlZCAnZGlhbG9nJ1xuXG4gIHNhdmU6IChjb250ZW50LCBtZXRhZGF0YSwgY2FsbGJhY2spIC0+XG4gICAgQF9ub3RJbXBsZW1lbnRlZCAnc2F2ZSdcblxuICBsb2FkOiAoY2FsbGJhY2spIC0+XG4gICAgQF9ub3RJbXBsZW1lbnRlZCAnbG9hZCdcblxuICBsaXN0OiAobWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxuICAgIEBfbm90SW1wbGVtZW50ZWQgJ2xpc3QnXG5cbiAgX25vdEltcGxlbWVudGVkOiAobWV0aG9kTmFtZSkgLT5cbiAgICB0aHJvdyBuZXcgRXJyb3IoXCIje21ldGhvZE5hbWV9IG5vdCBpbXBsZW1lbnRlZCBmb3IgI3tAbmFtZX0gcHJvdmlkZXJcIilcblxubW9kdWxlLmV4cG9ydHMgPVxuICBDbG91ZEZpbGU6IENsb3VkRmlsZVxuICBDbG91ZE1ldGFkYXRhOiBDbG91ZE1ldGFkYXRhXG4gIFByb3ZpZGVySW50ZXJmYWNlOiBQcm92aWRlckludGVyZmFjZVxuIiwidHIgPSByZXF1aXJlICcuLi91dGlscy90cmFuc2xhdGUnXG5pc1N0cmluZyA9IHJlcXVpcmUgJy4uL3V0aWxzL2lzLXN0cmluZydcblxuUHJvdmlkZXJJbnRlcmZhY2UgPSAocmVxdWlyZSAnLi9wcm92aWRlci1pbnRlcmZhY2UnKS5Qcm92aWRlckludGVyZmFjZVxuQ2xvdWRNZXRhZGF0YSA9IChyZXF1aXJlICcuL3Byb3ZpZGVyLWludGVyZmFjZScpLkNsb3VkTWV0YWRhdGFcblxuY2xhc3MgUmVhZE9ubHlQcm92aWRlciBleHRlbmRzIFByb3ZpZGVySW50ZXJmYWNlXG5cbiAgY29uc3RydWN0b3I6IChAb3B0aW9ucyA9IHt9KSAtPlxuICAgIHN1cGVyXG4gICAgICBuYW1lOiBSZWFkT25seVByb3ZpZGVyLk5hbWVcbiAgICAgIGRpc3BsYXlOYW1lOiBAb3B0aW9ucy5kaXNwbGF5TmFtZSBvciAodHIgJ35QUk9WSURFUi5SRUFEX09OTFknKVxuICAgICAgY2FwYWJpbGl0aWVzOlxuICAgICAgICBzYXZlOiBmYWxzZVxuICAgICAgICBsb2FkOiB0cnVlXG4gICAgICAgIGxpc3Q6IHRydWVcbiAgICBAdHJlZSA9IG51bGxcblxuICBATmFtZTogJ3JlYWRPbmx5J1xuXG4gIGxvYWQ6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XG4gICAgQF9sb2FkVHJlZSAoZXJyLCB0cmVlKSA9PlxuICAgICAgcmV0dXJuIGNhbGxiYWNrIGVyciBpZiBlcnJcbiAgICAgIHBhcmVudCA9IEBfZmluZFBhcmVudCBtZXRhZGF0YVxuICAgICAgaWYgcGFyZW50XG4gICAgICAgIGlmIHBhcmVudFttZXRhZGF0YS5uYW1lXVxuICAgICAgICAgIGlmIHBhcmVudFttZXRhZGF0YS5uYW1lXS5tZXRhZGF0YS50eXBlIGlzIENsb3VkTWV0YWRhdGEuRmlsZVxuICAgICAgICAgICAgY2FsbGJhY2sgbnVsbCwgcGFyZW50W21ldGFkYXRhLm5hbWVdLmNvbnRlbnRcbiAgICAgICAgICBlbHNlXG4gICAgICAgICAgICBjYWxsYmFjayBcIiN7bWV0YWRhdGEubmFtZX0gaXMgYSBmb2xkZXJcIlxuICAgICAgICBlbHNlXG4gICAgICAgICAgY2FsbGJhY2sgXCIje21ldGFkYXRhLm5hbWV9IG5vdCBmb3VuZCBpbiBmb2xkZXJcIlxuICAgICAgZWxzZVxuICAgICAgICBjYWxsYmFjayBcIiN7bWV0YWRhdGEubmFtZX0gZm9sZGVyIG5vdCBmb3VuZFwiXG5cbiAgbGlzdDogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cbiAgICBAX2xvYWRUcmVlIChlcnIsIHRyZWUpID0+XG4gICAgICByZXR1cm4gY2FsbGJhY2sgZXJyIGlmIGVyclxuICAgICAgcGFyZW50ID0gQF9maW5kUGFyZW50IG1ldGFkYXRhXG4gICAgICBpZiBwYXJlbnRcbiAgICAgICAgbGlzdCA9IFtdXG4gICAgICAgIGxpc3QucHVzaCBmaWxlLm1ldGFkYXRhIGZvciBvd24gZmlsZW5hbWUsIGZpbGUgb2YgcGFyZW50XG4gICAgICAgIGNhbGxiYWNrIG51bGwsIGxpc3RcbiAgICAgIGVsc2UgaWYgbWV0YWRhdGFcbiAgICAgICAgY2FsbGJhY2sgXCIje21ldGFkYXRhLm5hbWV9IGZvbGRlciBub3QgZm91bmRcIlxuXG4gIF9sb2FkVHJlZTogKGNhbGxiYWNrKSAtPlxuICAgIGlmIEB0cmVlIGlzbnQgbnVsbFxuICAgICAgY2FsbGJhY2sgbnVsbCwgQHRyZWVcbiAgICBlbHNlIGlmIEBvcHRpb25zLmpzb25cbiAgICAgIEB0cmVlID0gQF9jb252ZXJ0SlNPTlRvTWV0YWRhdGFUcmVlIEBvcHRpb25zLmpzb25cbiAgICAgIGNhbGxiYWNrIG51bGwsIEB0cmVlXG4gICAgZWxzZSBpZiBAb3B0aW9ucy5qc29uQ2FsbGJhY2tcbiAgICAgIEBvcHRpb25zLmpzb25DYWxsYmFjayAoZXJyLCBqc29uKSA9PlxuICAgICAgICBpZiBlcnJcbiAgICAgICAgICBjYWxsYmFjayBlcnJcbiAgICAgICAgZWxzZVxuICAgICAgICAgIEB0cmVlID0gQF9jb252ZXJ0SlNPTlRvTWV0YWRhdGFUcmVlIEBvcHRpb25zLmpzb25cbiAgICAgICAgICBjYWxsYmFjayBudWxsLCBAdHJlZVxuICAgIGVsc2UgaWYgQG9wdGlvbnMuc3JjXG4gICAgICAkLmFqYXhcbiAgICAgICAgZGF0YVR5cGU6ICdqc29uJ1xuICAgICAgICB1cmw6IEBvcHRpb25zLnNyY1xuICAgICAgICBzdWNjZXNzOiAoZGF0YSkgPT5cbiAgICAgICAgICBAdHJlZSA9IEBfY29udmVydEpTT05Ub01ldGFkYXRhVHJlZSBkYXRhXG4gICAgICAgICAgY2FsbGJhY2sgbnVsbCwgQHRyZWVcbiAgICAgICAgZXJyb3I6IC0+IGNhbGxiYWNrIFwiVW5hYmxlIHRvIGxvYWQganNvbiBmb3IgI3tAZGlzcGxheU5hbWV9IHByb3ZpZGVyXCJcbiAgICBlbHNlXG4gICAgICBjb25zb2xlLmVycm9yPyBcIk5vIGpzb24gb3Igc3JjIG9wdGlvbiBmb3VuZCBmb3IgI3tAZGlzcGxheU5hbWV9IHByb3ZpZGVyXCJcbiAgICAgIGNhbGxiYWNrIG51bGwsIHt9XG5cbiAgX2NvbnZlcnRKU09OVG9NZXRhZGF0YVRyZWU6IChqc29uLCBwYXRoUHJlZml4ID0gJy8nKSAtPlxuICAgIHRyZWUgPSB7fVxuICAgIGZvciBvd24gZmlsZW5hbWUgb2YganNvblxuICAgICAgdHlwZSA9IGlmIGlzU3RyaW5nIGpzb25bZmlsZW5hbWVdIHRoZW4gQ2xvdWRNZXRhZGF0YS5GaWxlIGVsc2UgQ2xvdWRNZXRhZGF0YS5Gb2xkZXJcbiAgICAgIG1ldGFkYXRhID0gbmV3IENsb3VkTWV0YWRhdGFcbiAgICAgICAgbmFtZTogZmlsZW5hbWVcbiAgICAgICAgcGF0aDogcGF0aFByZWZpeCArIGZpbGVuYW1lXG4gICAgICAgIHR5cGU6IHR5cGVcbiAgICAgICAgcHJvdmlkZXI6IEBcbiAgICAgICAgY2hpbGRyZW46IG51bGxcbiAgICAgIGlmIHR5cGUgaXMgQ2xvdWRNZXRhZGF0YS5Gb2xkZXJcbiAgICAgICAgbWV0YWRhdGEuY2hpbGRyZW4gPSBfY29udmVydEpTT05Ub01ldGFkYXRhVHJlZSBqc29uW2ZpbGVuYW1lXSwgcGF0aFByZWZpeCArIGZpbGVuYW1lICsgJy8nXG4gICAgICB0cmVlW2ZpbGVuYW1lXSA9XG4gICAgICAgIGNvbnRlbnQ6IGpzb25bZmlsZW5hbWVdXG4gICAgICAgIG1ldGFkYXRhOiBtZXRhZGF0YVxuICAgIHRyZWVcblxuICBfZmluZFBhcmVudDogKG1ldGFkYXRhKSAtPlxuICAgIGlmIG5vdCBtZXRhZGF0YVxuICAgICAgQHRyZWVcbiAgICBlbHNlXG4gICAgICBAdHJlZVxuXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWRPbmx5UHJvdmlkZXJcbiIsInRyID0gcmVxdWlyZSAnLi91dGlscy90cmFuc2xhdGUnXG5pc1N0cmluZyA9IHJlcXVpcmUgJy4vdXRpbHMvaXMtc3RyaW5nJ1xuXG5jbGFzcyBDbG91ZEZpbGVNYW5hZ2VyVUlFdmVudFxuXG4gIGNvbnN0cnVjdG9yOiAoQHR5cGUsIEBkYXRhID0ge30pIC0+XG5cbmNsYXNzIENsb3VkRmlsZU1hbmFnZXJVSU1lbnVcblxuICBARGVmYXVsdE1lbnU6IFsnbmV3RmlsZURpYWxvZycsICdvcGVuRmlsZURpYWxvZycsICdzYXZlJywgJ3NhdmVGaWxlQXNEaWFsb2cnXVxuXG4gIGNvbnN0cnVjdG9yOiAob3B0aW9ucywgY2xpZW50KSAtPlxuICAgIHNldEFjdGlvbiA9IChhY3Rpb24pIC0+XG4gICAgICBjbGllbnRbYWN0aW9uXT8uYmluZChjbGllbnQpIG9yICgtPiBhbGVydCBcIk5vICN7YWN0aW9ufSBhY3Rpb24gaXMgYXZhaWxhYmxlIGluIHRoZSBjbGllbnRcIilcblxuICAgIEBpdGVtcyA9IFtdXG4gICAgZm9yIGl0ZW0gaW4gb3B0aW9ucy5tZW51XG4gICAgICBtZW51SXRlbSA9IGlmIGlzU3RyaW5nIGl0ZW1cbiAgICAgICAgbmFtZSA9IG9wdGlvbnMubWVudU5hbWVzP1tpdGVtXVxuICAgICAgICBtZW51SXRlbSA9IHN3aXRjaCBpdGVtXG4gICAgICAgICAgd2hlbiAnbmV3RmlsZURpYWxvZydcbiAgICAgICAgICAgIG5hbWU6IG5hbWUgb3IgdHIgXCJ+TUVOVS5ORVdcIlxuICAgICAgICAgIHdoZW4gJ29wZW5GaWxlRGlhbG9nJ1xuICAgICAgICAgICAgbmFtZTogbmFtZSBvciB0ciBcIn5NRU5VLk9QRU5cIlxuICAgICAgICAgIHdoZW4gJ3NhdmUnXG4gICAgICAgICAgICBuYW1lOiBuYW1lIG9yIHRyIFwifk1FTlUuU0FWRVwiXG4gICAgICAgICAgd2hlbiAnc2F2ZUZpbGVBc0RpYWxvZydcbiAgICAgICAgICAgIG5hbWU6IG5hbWUgb3IgdHIgXCJ+TUVOVS5TQVZFX0FTXCJcbiAgICAgICAgICBlbHNlXG4gICAgICAgICAgICBuYW1lOiBcIlVua25vd24gaXRlbTogI3tpdGVtfVwiXG4gICAgICAgIG1lbnVJdGVtLmFjdGlvbiA9IHNldEFjdGlvbiBpdGVtXG4gICAgICAgIG1lbnVJdGVtXG4gICAgICBlbHNlXG4gICAgICAgICMgY2xpZW50cyBjYW4gcGFzcyBpbiBjdXN0b20ge25hbWU6Li4uLCBhY3Rpb246Li4ufSBtZW51IGl0ZW1zIHdoZXJlIHRoZSBhY3Rpb24gY2FuIGJlIGEgY2xpZW50IGZ1bmN0aW9uIG5hbWUgb3IgaXQgaXMgYXNzdWdtZWQgaXQgaXMgYSBmdW5jdGlvblxuICAgICAgICBpZiBpc1N0cmluZyBpdGVtLmFjdGlvblxuICAgICAgICAgIGl0ZW0uYWN0aW9uID0gc2V0QWN0aW9uIGl0ZW0uYWN0aW9uXG4gICAgICAgIGl0ZW1cbiAgICAgIGlmIG1lbnVJdGVtXG4gICAgICAgIEBpdGVtcy5wdXNoIG1lbnVJdGVtXG5cbmNsYXNzIENsb3VkRmlsZU1hbmFnZXJVSVxuXG4gIGNvbnN0cnVjdG9yOiAoQGNsaWVudCktPlxuICAgIEBtZW51ID0gbnVsbFxuXG4gIGluaXQ6IChvcHRpb25zKSAtPlxuICAgIG9wdGlvbnMgPSBvcHRpb25zIG9yIHt9XG4gICAgIyBza2lwIHRoZSBtZW51IGlmIGV4cGxpY2l0eSBzZXQgdG8gbnVsbCAobWVhbmluZyBubyBtZW51KVxuICAgIGlmIG9wdGlvbnMubWVudSBpc250IG51bGxcbiAgICAgIGlmIHR5cGVvZiBvcHRpb25zLm1lbnUgaXMgJ3VuZGVmaW5lZCdcbiAgICAgICAgb3B0aW9ucy5tZW51ID0gQ2xvdWRGaWxlTWFuYWdlclVJTWVudS5EZWZhdWx0TWVudVxuICAgICAgQG1lbnUgPSBuZXcgQ2xvdWRGaWxlTWFuYWdlclVJTWVudSBvcHRpb25zLCBAY2xpZW50XG5cbiAgIyBmb3IgUmVhY3QgdG8gbGlzdGVuIGZvciBkaWFsb2cgY2hhbmdlc1xuICBsaXN0ZW46IChAbGlzdGVuZXJDYWxsYmFjaykgLT5cblxuICBzYXZlRmlsZURpYWxvZzogKGNhbGxiYWNrKSAtPlxuICAgIEBfc2hvd1Byb3ZpZGVyRGlhbG9nICdzYXZlRmlsZScsICh0ciAnfkRJQUxPRy5TQVZFJyksIGNhbGxiYWNrXG5cbiAgc2F2ZUZpbGVBc0RpYWxvZzogKGNhbGxiYWNrKSAtPlxuICAgIEBfc2hvd1Byb3ZpZGVyRGlhbG9nICdzYXZlRmlsZUFzJywgKHRyICd+RElBTE9HLlNBVkVfQVMnKSwgY2FsbGJhY2tcblxuICBvcGVuRmlsZURpYWxvZzogKGNhbGxiYWNrKSAtPlxuICAgIEBfc2hvd1Byb3ZpZGVyRGlhbG9nICdvcGVuRmlsZScsICh0ciAnfkRJQUxPRy5PUEVOJyksIGNhbGxiYWNrXG5cbiAgX3Nob3dQcm92aWRlckRpYWxvZzogKGFjdGlvbiwgdGl0bGUsIGNhbGxiYWNrKSAtPlxuICAgIEBsaXN0ZW5lckNhbGxiYWNrIG5ldyBDbG91ZEZpbGVNYW5hZ2VyVUlFdmVudCAnc2hvd1Byb3ZpZGVyRGlhbG9nJyxcbiAgICAgIGFjdGlvbjogYWN0aW9uXG4gICAgICB0aXRsZTogdGl0bGVcbiAgICAgIGNhbGxiYWNrOiBjYWxsYmFja1xuXG5tb2R1bGUuZXhwb3J0cyA9XG4gIENsb3VkRmlsZU1hbmFnZXJVSUV2ZW50OiBDbG91ZEZpbGVNYW5hZ2VyVUlFdmVudFxuICBDbG91ZEZpbGVNYW5hZ2VyVUk6IENsb3VkRmlsZU1hbmFnZXJVSVxuICBDbG91ZEZpbGVNYW5hZ2VyVUlNZW51OiBDbG91ZEZpbGVNYW5hZ2VyVUlNZW51XG4iLCJtb2R1bGUuZXhwb3J0cyA9IChwYXJhbSkgLT4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHBhcmFtKSBpcyAnW29iamVjdCBTdHJpbmddJ1xuIiwibW9kdWxlLmV4cG9ydHMgPVxuICBcIn5NRU5VQkFSLlVOVElUTEVfRE9DVU1FTlRcIjogXCJVbnRpdGxlZCBEb2N1bWVudFwiXG5cbiAgXCJ+TUVOVS5ORVdcIjogXCJOZXdcIlxuICBcIn5NRU5VLk9QRU5cIjogXCJPcGVuIC4uLlwiXG4gIFwifk1FTlUuU0FWRVwiOiBcIlNhdmVcIlxuICBcIn5NRU5VLlNBVkVfQVNcIjogXCJTYXZlIEFzIC4uLlwiXG5cbiAgXCJ+RElBTE9HLlNBVkVcIjogXCJTYXZlXCJcbiAgXCJ+RElBTE9HLlNBVkVfQVNcIjogXCJTYXZlIEFzIC4uLlwiXG4gIFwifkRJQUxPRy5PUEVOXCI6IFwiT3BlblwiXG5cbiAgXCJ+UFJPVklERVIuTE9DQUxfU1RPUkFHRVwiOiBcIkxvY2FsIFN0b3JhZ2VcIlxuICBcIn5QUk9WSURFUi5SRUFEX09OTFlcIjogXCJSZWFkIE9ubHlcIlxuICBcIn5QUk9WSURFUi5HT09HTEVfRFJJVkVcIjogXCJHb29nbGUgRHJpdmVcIlxuICBcIn5QUk9WSURFUi5ET0NVTUVOVF9TVE9SRVwiOiBcIkRvY3VtZW50IFN0b3JlXCJcblxuICBcIn5GSUxFX0RJQUxPRy5GSUxFTkFNRVwiOiBcIkZpbGVuYW1lXCJcbiAgXCJ+RklMRV9ESUFMT0cuT1BFTlwiOiBcIk9wZW5cIlxuICBcIn5GSUxFX0RJQUxPRy5TQVZFXCI6IFwiU2F2ZVwiXG4gIFwifkZJTEVfRElBTE9HLkNBTkNFTFwiOiBcIkNhbmNlbFwiXG4gIFwifkZJTEVfRElBTE9HLkxPQURJTkdcIjogXCJMb2FkaW5nLi4uXCJcbiIsInRyYW5zbGF0aW9ucyA9ICB7fVxudHJhbnNsYXRpb25zWydlbiddID0gcmVxdWlyZSAnLi9sYW5nL2VuLXVzJ1xuZGVmYXVsdExhbmcgPSAnZW4nXG52YXJSZWdFeHAgPSAvJVxce1xccyooW159XFxzXSopXFxzKlxcfS9nXG5cbnRyYW5zbGF0ZSA9IChrZXksIHZhcnM9e30sIGxhbmc9ZGVmYXVsdExhbmcpIC0+XG4gIHRyYW5zbGF0aW9uID0gdHJhbnNsYXRpb25zW2xhbmddP1trZXldIG9yIGtleVxuICB0cmFuc2xhdGlvbi5yZXBsYWNlIHZhclJlZ0V4cCwgKG1hdGNoLCBrZXkpIC0+XG4gICAgaWYgdmFycy5oYXNPd25Qcm9wZXJ0eSBrZXkgdGhlbiB2YXJzW2tleV0gZWxzZSBcIicqKiBVS05PV04gS0VZOiAje2tleX0gKipcIlxuXG5tb2R1bGUuZXhwb3J0cyA9IHRyYW5zbGF0ZVxuIiwiTWVudUJhciA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9tZW51LWJhci12aWV3J1xuUHJvdmlkZXJUYWJiZWREaWFsb2cgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vcHJvdmlkZXItdGFiYmVkLWRpYWxvZy12aWV3J1xuXG50ciA9IHJlcXVpcmUgJy4uL3V0aWxzL3RyYW5zbGF0ZSdcblxue2RpdiwgaWZyYW1lfSA9IFJlYWN0LkRPTVxuXG5Jbm5lckFwcCA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgUmVhY3QuY3JlYXRlQ2xhc3NcblxuICBkaXNwbGF5TmFtZTogJ0Nsb3VkRmlsZU1hbmFnZXJJbm5lckFwcCdcblxuICBzaG91bGRDb21wb25lbnRVcGRhdGU6IChuZXh0UHJvcHMpIC0+XG4gICAgbmV4dFByb3BzLmFwcCBpc250IEBwcm9wcy5hcHBcblxuICByZW5kZXI6IC0+XG4gICAgKGRpdiB7Y2xhc3NOYW1lOiAnaW5uZXJBcHAnfSxcbiAgICAgIChpZnJhbWUge3NyYzogQHByb3BzLmFwcH0pXG4gICAgKVxuXG5BcHAgPSBSZWFjdC5jcmVhdGVDbGFzc1xuXG4gIGRpc3BsYXlOYW1lOiAnQ2xvdWRGaWxlTWFuYWdlcidcblxuICBnZXRGaWxlbmFtZTogLT5cbiAgICBpZiBAcHJvcHMuY2xpZW50LnN0YXRlLm1ldGFkYXRhPy5oYXNPd25Qcm9wZXJ0eSgnbmFtZScpIHRoZW4gQHByb3BzLmNsaWVudC5zdGF0ZS5tZXRhZGF0YS5uYW1lIGVsc2UgKHRyIFwifk1FTlVCQVIuVU5USVRMRV9ET0NVTUVOVFwiKVxuXG4gIGdldEluaXRpYWxTdGF0ZTogLT5cbiAgICBmaWxlbmFtZTogQGdldEZpbGVuYW1lKClcbiAgICBtZW51SXRlbXM6IEBwcm9wcy5jbGllbnQuX3VpLm1lbnU/Lml0ZW1zIG9yIFtdXG4gICAgcHJvdmlkZXJEaWFsb2c6IG51bGxcblxuICBjb21wb25lbnRXaWxsTW91bnQ6IC0+XG4gICAgQHByb3BzLmNsaWVudC5saXN0ZW4gKGV2ZW50KSA9PlxuICAgICAgQHNldFN0YXRlIGZpbGVuYW1lOiBAZ2V0RmlsZW5hbWUoKVxuXG4gICAgICBzd2l0Y2ggZXZlbnQudHlwZVxuICAgICAgICB3aGVuICdjb25uZWN0ZWQnXG4gICAgICAgICAgQHNldFN0YXRlIG1lbnVJdGVtczogQHByb3BzLmNsaWVudC5fdWkubWVudT8uaXRlbXMgb3IgW11cblxuICAgIEBwcm9wcy5jbGllbnQuX3VpLmxpc3RlbiAoZXZlbnQpID0+XG4gICAgICBpZiBldmVudC50eXBlIGlzICdzaG93UHJvdmlkZXJEaWFsb2cnXG4gICAgICAgIEBzZXRTdGF0ZSBwcm92aWRlckRpYWxvZzogZXZlbnQuZGF0YVxuXG4gIGNsb3NlUHJvdmlkZXJEaWFsb2c6IC0+XG4gICAgQHNldFN0YXRlIHByb3ZpZGVyRGlhbG9nOiBudWxsXG5cbiAgcmVuZGVyOiAtPlxuICAgIChkaXYge2NsYXNzTmFtZTogJ2FwcCd9LFxuICAgICAgKE1lbnVCYXIge2ZpbGVuYW1lOiBAc3RhdGUuZmlsZW5hbWUsIGl0ZW1zOiBAc3RhdGUubWVudUl0ZW1zfSlcbiAgICAgIChJbm5lckFwcCAoYXBwOiBAcHJvcHMuYXBwKSlcbiAgICAgIGlmIEBzdGF0ZS5wcm92aWRlckRpYWxvZ1xuICAgICAgICAoUHJvdmlkZXJUYWJiZWREaWFsb2cge2NsaWVudDogQHByb3BzLmNsaWVudCwgZGlhbG9nOiBAc3RhdGUucHJvdmlkZXJEaWFsb2csIGNsb3NlOiBAY2xvc2VQcm92aWRlckRpYWxvZ30pXG4gICAgKVxuXG5tb2R1bGUuZXhwb3J0cyA9IEFwcFxuIiwiQXV0aG9yaXplTWl4aW4gPVxuICBnZXRJbml0aWFsU3RhdGU6IC0+XG4gICAgYXV0aG9yaXplZDogZmFsc2VcblxuICBjb21wb25lbnRXaWxsTW91bnQ6IC0+XG4gICAgQHByb3BzLnByb3ZpZGVyLmF1dGhvcml6ZWQgKGF1dGhvcml6ZWQpID0+XG4gICAgICBAc2V0U3RhdGUgYXV0aG9yaXplZDogYXV0aG9yaXplZFxuXG4gIHJlbmRlcjogLT5cbiAgICBpZiBAc3RhdGUuYXV0aG9yaXplZFxuICAgICAgQHJlbmRlcldoZW5BdXRob3JpemVkKClcbiAgICBlbHNlXG4gICAgICBAcHJvcHMucHJvdmlkZXIucmVuZGVyQXV0aG9yaXphdGlvbkRpYWxvZygpXG5cbm1vZHVsZS5leHBvcnRzID0gQXV0aG9yaXplTWl4aW5cbiIsIntkaXYsIGksIHNwYW4sIHVsLCBsaX0gPSBSZWFjdC5ET01cblxuRHJvcGRvd25JdGVtID0gUmVhY3QuY3JlYXRlRmFjdG9yeSBSZWFjdC5jcmVhdGVDbGFzc1xuXG4gIGRpc3BsYXlOYW1lOiAnRHJvcGRvd25JdGVtJ1xuXG4gIGNsaWNrZWQ6IC0+XG4gICAgQHByb3BzLnNlbGVjdCBAcHJvcHMuaXRlbVxuXG4gIHJlbmRlcjogLT5cbiAgICBjbGFzc05hbWUgPSBcIm1lbnVJdGVtICN7aWYgQHByb3BzLmlzQWN0aW9uTWVudSBhbmQgbm90IEBwcm9wcy5pdGVtLmFjdGlvbiB0aGVuICdkaXNhYmxlZCcgZWxzZSAnJ31cIlxuICAgIG5hbWUgPSBAcHJvcHMuaXRlbS5uYW1lIG9yIEBwcm9wcy5pdGVtXG4gICAgKGxpIHtjbGFzc05hbWU6IGNsYXNzTmFtZSwgb25DbGljazogQGNsaWNrZWQgfSwgbmFtZSlcblxuRHJvcERvd24gPSBSZWFjdC5jcmVhdGVDbGFzc1xuXG4gIGRpc3BsYXlOYW1lOiAnRHJvcGRvd24nXG5cbiAgZ2V0RGVmYXVsdFByb3BzOiAtPlxuICAgIGlzQWN0aW9uTWVudTogdHJ1ZSAgICAgICAgICAgICAgIyBXaGV0aGVyIGVhY2ggaXRlbSBjb250YWlucyBpdHMgb3duIGFjdGlvblxuICAgIG9uU2VsZWN0OiAoaXRlbSkgLT4gICAgICAgICAgICAgIyBJZiBub3QsIEBwcm9wcy5vblNlbGVjdCBpcyBjYWxsZWRcbiAgICAgIGxvZy5pbmZvIFwiU2VsZWN0ZWQgI3tpdGVtfVwiXG5cbiAgZ2V0SW5pdGlhbFN0YXRlOiAtPlxuICAgIHNob3dpbmdNZW51OiBmYWxzZVxuICAgIHRpbWVvdXQ6IG51bGxcblxuICBibHVyOiAtPlxuICAgIEB1bmJsdXIoKVxuICAgIHRpbWVvdXQgPSBzZXRUaW1lb3V0ICggPT4gQHNldFN0YXRlIHtzaG93aW5nTWVudTogZmFsc2V9ICksIDUwMFxuICAgIEBzZXRTdGF0ZSB7dGltZW91dDogdGltZW91dH1cblxuICB1bmJsdXI6IC0+XG4gICAgaWYgQHN0YXRlLnRpbWVvdXRcbiAgICAgIGNsZWFyVGltZW91dChAc3RhdGUudGltZW91dClcbiAgICBAc2V0U3RhdGUge3RpbWVvdXQ6IG51bGx9XG5cbiAgc2VsZWN0OiAoaXRlbSkgLT5cbiAgICBuZXh0U3RhdGUgPSAobm90IEBzdGF0ZS5zaG93aW5nTWVudSlcbiAgICBAc2V0U3RhdGUge3Nob3dpbmdNZW51OiBuZXh0U3RhdGV9XG4gICAgcmV0dXJuIHVubGVzcyBpdGVtXG4gICAgaWYgQHByb3BzLmlzQWN0aW9uTWVudSBhbmQgaXRlbS5hY3Rpb25cbiAgICAgIGl0ZW0uYWN0aW9uKClcbiAgICBlbHNlXG4gICAgICBAcHJvcHMub25TZWxlY3QgaXRlbVxuXG4gIHJlbmRlcjogLT5cbiAgICBtZW51Q2xhc3MgPSBpZiBAc3RhdGUuc2hvd2luZ01lbnUgdGhlbiAnbWVudS1zaG93aW5nJyBlbHNlICdtZW51LWhpZGRlbidcbiAgICBzZWxlY3QgPSAoaXRlbSkgPT5cbiAgICAgICggPT4gQHNlbGVjdChpdGVtKSlcbiAgICAoZGl2IHtjbGFzc05hbWU6ICdtZW51J30sXG4gICAgICAoc3BhbiB7Y2xhc3NOYW1lOiAnbWVudS1hbmNob3InLCBvbkNsaWNrOiA9PiBAc2VsZWN0KG51bGwpfSxcbiAgICAgICAgQHByb3BzLmFuY2hvclxuICAgICAgICAoaSB7Y2xhc3NOYW1lOiAnaWNvbi1jb2RhcC1hcnJvdy1leHBhbmQnfSlcbiAgICAgIClcbiAgICAgIGlmIEBwcm9wcy5pdGVtcz8ubGVuZ3RoID4gMFxuICAgICAgICAoZGl2IHtjbGFzc05hbWU6IG1lbnVDbGFzcywgb25Nb3VzZUxlYXZlOiBAYmx1ciwgb25Nb3VzZUVudGVyOiBAdW5ibHVyfSxcbiAgICAgICAgICAodWwge30sXG4gICAgICAgICAgICAoRHJvcGRvd25JdGVtIHtrZXk6IGl0ZW0ubmFtZSBvciBpdGVtLCBpdGVtOiBpdGVtLCBzZWxlY3Q6IEBzZWxlY3QsIGlzQWN0aW9uTWVudTogQHByb3BzLmlzQWN0aW9uTWVudX0pIGZvciBpdGVtIGluIEBwcm9wcy5pdGVtc1xuICAgICAgICAgIClcbiAgICAgICAgKVxuICAgIClcblxubW9kdWxlLmV4cG9ydHMgPSBEcm9wRG93blxuIiwiQXV0aG9yaXplTWl4aW4gPSByZXF1aXJlICcuL2F1dGhvcml6ZS1taXhpbidcbkNsb3VkTWV0YWRhdGEgPSAocmVxdWlyZSAnLi4vcHJvdmlkZXJzL3Byb3ZpZGVyLWludGVyZmFjZScpLkNsb3VkTWV0YWRhdGFcblxudHIgPSByZXF1aXJlICcuLi91dGlscy90cmFuc2xhdGUnXG5cbntkaXYsIGltZywgaSwgc3BhbiwgaW5wdXQsIGJ1dHRvbn0gPSBSZWFjdC5ET01cblxuRmlsZUxpc3RGaWxlID0gUmVhY3QuY3JlYXRlRmFjdG9yeSBSZWFjdC5jcmVhdGVDbGFzc1xuICBkaXNwbGF5TmFtZTogJ0ZpbGVMaXN0RmlsZSdcblxuICBmaWxlU2VsZWN0ZWQ6IC0+XG4gICAgQHByb3BzLmZpbGVTZWxlY3RlZCBAcHJvcHMubWV0YWRhdGFcblxuICByZW5kZXI6IC0+XG4gICAgKGRpdiB7dGl0bGU6IEBwcm9wcy5tZXRhZGF0YS5wYXRoLCBvbkNsaWNrOiBAZmlsZVNlbGVjdGVkfSwgQHByb3BzLm1ldGFkYXRhLm5hbWUpXG5cbkZpbGVMaXN0ID0gUmVhY3QuY3JlYXRlRmFjdG9yeSBSZWFjdC5jcmVhdGVDbGFzc1xuICBkaXNwbGF5TmFtZTogJ0ZpbGVMaXN0J1xuXG4gIGdldEluaXRpYWxTdGF0ZTogLT5cbiAgICBsb2FkaW5nOiB0cnVlXG4gICAgbGlzdDogW11cblxuICBjb21wb25lbnREaWRNb3VudDogLT5cbiAgICBAbG9hZCgpXG5cbiAgbG9hZDogLT5cbiAgICBAcHJvcHMucHJvdmlkZXIubGlzdCBAcHJvcHMuZm9sZGVyLCAoZXJyLCBsaXN0KSA9PlxuICAgICAgcmV0dXJuIGFsZXJ0KGVycikgaWYgZXJyXG4gICAgICBAc2V0U3RhdGVcbiAgICAgICAgbG9hZGluZzogZmFsc2VcbiAgICAgICAgbGlzdDogbGlzdFxuICAgICAgQHByb3BzLmxpc3RMb2FkZWQgbGlzdFxuXG4gIHJlbmRlcjogLT5cbiAgICAoZGl2IHtjbGFzc05hbWU6ICdmaWxlbGlzdCd9LFxuICAgICAgaWYgQHN0YXRlLmxvYWRpbmdcbiAgICAgICAgdHIgXCJ+RklMRV9ESUFMT0cuTE9BRElOR1wiXG4gICAgICBlbHNlXG4gICAgICAgIGZvciBtZXRhZGF0YSBpbiBAc3RhdGUubGlzdFxuICAgICAgICAgIChGaWxlTGlzdEZpbGUge21ldGFkYXRhOiBtZXRhZGF0YSwgZmlsZVNlbGVjdGVkOiBAcHJvcHMuZmlsZVNlbGVjdGVkfSlcbiAgICApXG5cbkZpbGVEaWFsb2dUYWIgPSBSZWFjdC5jcmVhdGVDbGFzc1xuICBkaXNwbGF5TmFtZTogJ0ZpbGVEaWFsb2dUYWInXG5cbiAgbWl4aW5zOiBbQXV0aG9yaXplTWl4aW5dXG5cbiAgZ2V0SW5pdGlhbFN0YXRlOiAtPlxuICAgIGZvbGRlcjogQHByb3BzLmNsaWVudC5zdGF0ZS5tZXRhZGF0YT8ucGFyZW50IG9yIG51bGxcbiAgICBtZXRhZGF0YTogQHByb3BzLmNsaWVudC5zdGF0ZS5tZXRhZGF0YVxuICAgIGZpbGVuYW1lOiBAcHJvcHMuY2xpZW50LnN0YXRlLm1ldGFkYXRhPy5uYW1lIG9yICcnXG5cbiAgY29tcG9uZW50V2lsbE1vdW50OiAtPlxuICAgIEBpc09wZW4gPSBAcHJvcHMuZGlhbG9nLmFjdGlvbiBpcyAnb3BlbkZpbGUnXG4gICAgQGxpc3QgPSBbXVxuXG4gIGZpbGVuYW1lQ2hhbmdlZDogKGUpIC0+XG4gICAgZmlsZW5hbWUgPSBlLnRhcmdldC52YWx1ZVxuICAgIG1ldGFkYXRhID0gbnVsbFxuICAgIEBzZXRTdGF0ZVxuICAgICAgZmlsZW5hbWU6IGZpbGVuYW1lXG4gICAgICBtZXRhZGF0YTogbWV0YWRhdGFcblxuICBsaXN0TG9hZGVkOiAobGlzdCkgLT5cbiAgICBAbGlzdCA9IGxpc3RcblxuICBmaWxlU2VsZWN0ZWQ6IChtZXRhZGF0YSkgLT5cbiAgICBpZiBtZXRhZGF0YT8udHlwZSBpcyBDbG91ZE1ldGFkYXRhLkZpbGVcbiAgICAgIEBzZXRTdGF0ZSBmaWxlbmFtZTogbWV0YWRhdGEubmFtZVxuICAgIEBzZXRTdGF0ZSBtZXRhZGF0YTogbWV0YWRhdGFcblxuICBjb25maXJtOiAtPlxuICAgICMgaWYgZmlsZW5hbWUgY2hhbmdlZCBmaW5kIHRoZSBmaWxlIGluIHRoZSBsaXN0XG4gICAgZmlsZW5hbWUgPSAkLnRyaW0gQHN0YXRlLmZpbGVuYW1lXG4gICAgaWYgbm90IEBzdGF0ZS5tZXRhZGF0YVxuICAgICAgZm9yIG1ldGFkYXRhIGluIEBsaXN0XG4gICAgICAgIGlmIG1ldGFkYXRhLm5hbWUgaXMgZmlsZW5hbWVcbiAgICAgICAgICBAc3RhdGUubWV0YWRhdGEgPSBtZXRhZGF0YVxuICAgICAgICAgIGJyZWFrXG4gICAgICBpZiBub3QgQHN0YXRlLm1ldGFkYXRhXG4gICAgICAgIGlmIEBpc09wZW5cbiAgICAgICAgICBhbGVydCBcIiN7QHN0YXRlLmZpbGVuYW1lfSBub3QgZm91bmRcIlxuICAgICAgICBlbHNlXG4gICAgICAgICAgQHN0YXRlLm1ldGFkYXRhID0gbmV3IENsb3VkTWV0YWRhdGFcbiAgICAgICAgICAgIG5hbWU6IGZpbGVuYW1lXG4gICAgICAgICAgICBwYXRoOiBcIi8je2ZpbGVuYW1lfVwiICMgVE9ETzogRml4IHBhdGhcbiAgICAgICAgICAgIHR5cGU6IENsb3VkTWV0YWRhdGEuRmlsZVxuICAgICAgICAgICAgcHJvdmlkZXI6IEBwcm9wcy5wcm92aWRlclxuICAgIGlmIEBzdGF0ZS5tZXRhZGF0YVxuICAgICAgQHByb3BzLmRpYWxvZy5jYWxsYmFjayBAc3RhdGUubWV0YWRhdGFcbiAgICAgIEBwcm9wcy5jbG9zZSgpXG5cbiAgY2FuY2VsOiAtPlxuICAgIEBwcm9wcy5jbG9zZSgpXG5cbiAgcmVuZGVyV2hlbkF1dGhvcml6ZWQ6IC0+XG4gICAgKGRpdiB7Y2xhc3NOYW1lOiAnZGlhbG9nVGFiJ30sXG4gICAgICAoaW5wdXQge3R5cGU6ICd0ZXh0JywgdmFsdWU6IEBzdGF0ZS5maWxlbmFtZSwgcGxhY2Vob2xkZXI6ICh0ciBcIn5GSUxFX0RJQUxPRy5GSUxFTkFNRVwiKSwgb25DaGFuZ2U6IEBmaWxlbmFtZUNoYW5nZWR9KVxuICAgICAgKEZpbGVMaXN0IHtwcm92aWRlcjogQHByb3BzLnByb3ZpZGVyLCBmb2xkZXI6IEBzdGF0ZS5mb2xkZXIsIGZpbGVTZWxlY3RlZDogQGZpbGVTZWxlY3RlZCwgbGlzdExvYWRlZDogQGxpc3RMb2FkZWR9KVxuICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnYnV0dG9ucyd9LFxuICAgICAgICAoYnV0dG9uIHtvbkNsaWNrOiBAY29uZmlybSwgZGlzYWJsZWQ6IEBzdGF0ZS5maWxlbmFtZS5sZW5ndGggaXMgMH0sIGlmIEBpc09wZW4gdGhlbiAodHIgXCJ+RklMRV9ESUFMT0cuT1BFTlwiKSBlbHNlICh0ciBcIn5GSUxFX0RJQUxPRy5TQVZFXCIpKVxuICAgICAgICAoYnV0dG9uIHtvbkNsaWNrOiBAY2FuY2VsfSwgKHRyIFwifkZJTEVfRElBTE9HLkNBTkNFTFwiKSlcbiAgICAgIClcbiAgICApXG5cbm1vZHVsZS5leHBvcnRzID0gRmlsZURpYWxvZ1RhYlxuIiwie2RpdiwgaSwgc3Bhbn0gPSBSZWFjdC5ET01cblxuRHJvcGRvd24gPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vZHJvcGRvd24tdmlldydcblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzc1xuXG4gIGRpc3BsYXlOYW1lOiAnTWVudUJhcidcblxuICByZW5kZXI6IC0+XG4gICAgKGRpdiB7Y2xhc3NOYW1lOiAnbWVudS1iYXInfSxcbiAgICAgIChkaXYge30sXG4gICAgICAgIChEcm9wZG93biB7XG4gICAgICAgICAgYW5jaG9yOiBAcHJvcHMuZmlsZW5hbWVcbiAgICAgICAgICBpdGVtczogQHByb3BzLml0ZW1zXG4gICAgICAgICAgY2xhc3NOYW1lOidtZW51LWJhci1jb250ZW50LWZpbGVuYW1lJ30pXG4gICAgICApXG4gICAgKVxuIiwiTW9kYWwgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vbW9kYWwtdmlldydcbntkaXYsIGl9ID0gUmVhY3QuRE9NXG5cbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3NcblxuICBkaXNwbGF5TmFtZTogJ01vZGFsRGlhbG9nJ1xuXG4gIGNsb3NlOiAtPlxuICAgIEBwcm9wcy5jbG9zZT8oKVxuXG4gIHJlbmRlcjogLT5cbiAgICAoTW9kYWwge2Nsb3NlOiBAcHJvcHMuY2xvc2V9LFxuICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnbW9kYWwtZGlhbG9nJ30sXG4gICAgICAgIChkaXYge2NsYXNzTmFtZTogJ21vZGFsLWRpYWxvZy13cmFwcGVyJ30sXG4gICAgICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnbW9kYWwtZGlhbG9nLXRpdGxlJ30sXG4gICAgICAgICAgICAoaSB7Y2xhc3NOYW1lOiBcIm1vZGFsLWRpYWxvZy10aXRsZS1jbG9zZSBpY29uLWNvZGFwLWV4XCIsIG9uQ2xpY2s6IEBjbG9zZX0pXG4gICAgICAgICAgICBAcHJvcHMudGl0bGUgb3IgJ1VudGl0bGVkIERpYWxvZydcbiAgICAgICAgICApXG4gICAgICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnbW9kYWwtZGlhbG9nLXdvcmtzcGFjZSd9LCBAcHJvcHMuY2hpbGRyZW4pXG4gICAgICAgIClcbiAgICAgIClcbiAgICApXG4iLCJNb2RhbERpYWxvZyA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9tb2RhbC1kaWFsb2ctdmlldydcblRhYmJlZFBhbmVsID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL3RhYmJlZC1wYW5lbC12aWV3J1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzXG5cbiAgZGlzcGxheU5hbWU6ICdNb2RhbFRhYmJlZERpYWxvZ1ZpZXcnXG5cbiAgcmVuZGVyOiAtPlxuICAgIChNb2RhbERpYWxvZyB7dGl0bGU6IEBwcm9wcy50aXRsZSwgY2xvc2U6IEBwcm9wcy5jbG9zZX0sXG4gICAgICAoVGFiYmVkUGFuZWwge3RhYnM6IEBwcm9wcy50YWJzLCBzZWxlY3RlZFRhYkluZGV4OiBAcHJvcHMuc2VsZWN0ZWRUYWJJbmRleH0pXG4gICAgKVxuIiwie2Rpdn0gPSBSZWFjdC5ET01cblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzc1xuXG4gIGRpc3BsYXlOYW1lOiAnTW9kYWwnXG5cbiAgd2F0Y2hGb3JFc2NhcGU6IChlKSAtPlxuICAgIGlmIGUua2V5Q29kZSBpcyAyN1xuICAgICAgQHByb3BzLmNsb3NlPygpXG5cbiAgY29tcG9uZW50RGlkTW91bnQ6IC0+XG4gICAgJCh3aW5kb3cpLm9uICdrZXl1cCcsIEB3YXRjaEZvckVzY2FwZVxuXG4gIGNvbXBvbmVudFdpbGxVbm1vdW50OiAtPlxuICAgICQod2luZG93KS5vZmYgJ2tleXVwJywgQHdhdGNoRm9yRXNjYXBlXG5cbiAgcmVuZGVyOiAtPlxuICAgIChkaXYge2NsYXNzTmFtZTogJ21vZGFsJ30sXG4gICAgICAoZGl2IHtjbGFzc05hbWU6ICdtb2RhbC1iYWNrZ3JvdW5kJ30pXG4gICAgICAoZGl2IHtjbGFzc05hbWU6ICdtb2RhbC1jb250ZW50J30sIEBwcm9wcy5jaGlsZHJlbilcbiAgICApXG4iLCJNb2RhbFRhYmJlZERpYWxvZyA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9tb2RhbC10YWJiZWQtZGlhbG9nLXZpZXcnXG5UYWJiZWRQYW5lbCA9IHJlcXVpcmUgJy4vdGFiYmVkLXBhbmVsLXZpZXcnXG5DbG91ZE1ldGFkYXRhID0gKHJlcXVpcmUgJy4uL3Byb3ZpZGVycy9wcm92aWRlci1pbnRlcmZhY2UnKS5DbG91ZE1ldGFkYXRhXG5GaWxlRGlhbG9nVGFiID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL2ZpbGUtZGlhbG9nLXRhYi12aWV3J1xuU2VsZWN0UHJvdmlkZXJEaWFsb2dUYWIgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vc2VsZWN0LXByb3ZpZGVyLWRpYWxvZy10YWItdmlldydcblxudHIgPSByZXF1aXJlICcuLi91dGlscy90cmFuc2xhdGUnXG5cbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3NcbiAgZGlzcGxheU5hbWU6ICdQcm92aWRlclRhYmJlZERpYWxvZydcblxuICByZW5kZXI6ICAtPlxuICAgIFtjYXBhYmlsaXR5LCBUYWJDb21wb25lbnRdID0gc3dpdGNoIEBwcm9wcy5kaWFsb2cuYWN0aW9uXG4gICAgICB3aGVuICdvcGVuRmlsZScgdGhlbiBbJ2xpc3QnLCBGaWxlRGlhbG9nVGFiXVxuICAgICAgd2hlbiAnc2F2ZUZpbGUnLCAnc2F2ZUZpbGVBcycgdGhlbiBbJ3NhdmUnLCBGaWxlRGlhbG9nVGFiXVxuICAgICAgd2hlbiAnc2VsZWN0UHJvdmlkZXInIHRoZW4gW251bGwsIFNlbGVjdFByb3ZpZGVyRGlhbG9nVGFiXVxuXG4gICAgdGFicyA9IFtdXG4gICAgc2VsZWN0ZWRUYWJJbmRleCA9IDBcbiAgICBmb3IgcHJvdmlkZXIsIGkgaW4gQHByb3BzLmNsaWVudC5zdGF0ZS5hdmFpbGFibGVQcm92aWRlcnNcbiAgICAgIGlmIG5vdCBjYXBhYmlsaXR5IG9yIHByb3ZpZGVyLmNhcGFiaWxpdGllc1tjYXBhYmlsaXR5XVxuICAgICAgICBjb21wb25lbnQgPSBUYWJDb21wb25lbnRcbiAgICAgICAgICBjbGllbnQ6IEBwcm9wcy5jbGllbnRcbiAgICAgICAgICBkaWFsb2c6IEBwcm9wcy5kaWFsb2dcbiAgICAgICAgICBjbG9zZTogQHByb3BzLmNsb3NlXG4gICAgICAgICAgcHJvdmlkZXI6IHByb3ZpZGVyXG4gICAgICAgIHRhYnMucHVzaCBUYWJiZWRQYW5lbC5UYWIge2tleTogaSwgbGFiZWw6ICh0ciBwcm92aWRlci5kaXNwbGF5TmFtZSksIGNvbXBvbmVudDogY29tcG9uZW50fVxuICAgICAgICBpZiBwcm92aWRlciBpcyBAcHJvcHMuY2xpZW50LnN0YXRlLm1ldGFkYXRhPy5wcm92aWRlclxuICAgICAgICAgIHNlbGVjdGVkVGFiSW5kZXggPSBpXG5cbiAgICAoTW9kYWxUYWJiZWREaWFsb2cge3RpdGxlOiAodHIgQHByb3BzLmRpYWxvZy50aXRsZSksIGNsb3NlOiBAcHJvcHMuY2xvc2UsIHRhYnM6IHRhYnMsIHNlbGVjdGVkVGFiSW5kZXg6IHNlbGVjdGVkVGFiSW5kZXh9KVxuIiwie2Rpdn0gPSBSZWFjdC5ET01cblxuU2VsZWN0UHJvdmlkZXJEaWFsb2dUYWIgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IFJlYWN0LmNyZWF0ZUNsYXNzXG4gIGRpc3BsYXlOYW1lOiAnU2VsZWN0UHJvdmlkZXJEaWFsb2dUYWInXG4gIHJlbmRlcjogLT4gKGRpdiB7fSwgXCJUT0RPOiBTZWxlY3RQcm92aWRlckRpYWxvZ1RhYjogI3tAcHJvcHMucHJvdmlkZXIuZGlzcGxheU5hbWV9XCIpXG5cbm1vZHVsZS5leHBvcnRzID0gU2VsZWN0UHJvdmlkZXJEaWFsb2dUYWJcbiIsIntkaXYsIHVsLCBsaSwgYX0gPSBSZWFjdC5ET01cblxuY2xhc3MgVGFiSW5mb1xuICBjb25zdHJ1Y3RvcjogKHNldHRpbmdzPXt9KSAtPlxuICAgIHtAbGFiZWwsIEBjb21wb25lbnR9ID0gc2V0dGluZ3NcblxuVGFiID0gUmVhY3QuY3JlYXRlRmFjdG9yeSBSZWFjdC5jcmVhdGVDbGFzc1xuXG4gIGRpc3BsYXlOYW1lOiAnVGFiYmVkUGFuZWxUYWInXG5cbiAgY2xpY2tlZDogKGUpIC0+XG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgQHByb3BzLm9uU2VsZWN0ZWQgQHByb3BzLmluZGV4XG5cbiAgcmVuZGVyOiAtPlxuICAgIGNsYXNzbmFtZSA9IGlmIEBwcm9wcy5zZWxlY3RlZCB0aGVuICd0YWItc2VsZWN0ZWQnIGVsc2UgJydcbiAgICAobGkge2NsYXNzTmFtZTogY2xhc3NuYW1lLCBvbkNsaWNrOiBAY2xpY2tlZH0sIEBwcm9wcy5sYWJlbClcblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzc1xuXG4gIGRpc3BsYXlOYW1lOiAnVGFiYmVkUGFuZWxWaWV3J1xuXG4gIGdldEluaXRpYWxTdGF0ZTogLT5cbiAgICBzZWxlY3RlZFRhYkluZGV4OiBAcHJvcHMuc2VsZWN0ZWRUYWJJbmRleCBvciAwXG5cbiAgc3RhdGljczpcbiAgICBUYWI6IChzZXR0aW5ncykgLT4gbmV3IFRhYkluZm8gc2V0dGluZ3NcblxuICBzZWxlY3RlZFRhYjogKGluZGV4KSAtPlxuICAgIEBzZXRTdGF0ZSBzZWxlY3RlZFRhYkluZGV4OiBpbmRleFxuXG4gIHJlbmRlclRhYjogKHRhYiwgaW5kZXgpIC0+XG4gICAgKFRhYlxuICAgICAgbGFiZWw6IHRhYi5sYWJlbFxuICAgICAga2V5OiBpbmRleFxuICAgICAgaW5kZXg6IGluZGV4XG4gICAgICBzZWxlY3RlZDogKGluZGV4IGlzIEBzdGF0ZS5zZWxlY3RlZFRhYkluZGV4KVxuICAgICAgb25TZWxlY3RlZDogQHNlbGVjdGVkVGFiXG4gICAgKVxuXG4gIHJlbmRlclRhYnM6IC0+XG4gICAgKGRpdiB7Y2xhc3NOYW1lOiAnd29ya3NwYWNlLXRhYnMnfSxcbiAgICAgICh1bCB7fSwgQHJlbmRlclRhYih0YWIsaW5kZXgpIGZvciB0YWIsIGluZGV4IGluIEBwcm9wcy50YWJzKVxuICAgIClcblxuICByZW5kZXJTZWxlY3RlZFBhbmVsOiAtPlxuICAgIChkaXYge2NsYXNzTmFtZTogJ3dvcmtzcGFjZS10YWItY29tcG9uZW50J30sXG4gICAgICBmb3IgdGFiLCBpbmRleCBpbiBAcHJvcHMudGFic1xuICAgICAgICAoZGl2IHtcbiAgICAgICAgICBrZXk6IGluZGV4XG4gICAgICAgICAgc3R5bGU6XG4gICAgICAgICAgICBkaXNwbGF5OiBpZiBpbmRleCBpcyBAc3RhdGUuc2VsZWN0ZWRUYWJJbmRleCB0aGVuICdibG9jaycgZWxzZSAnbm9uZSdcbiAgICAgICAgICB9LFxuICAgICAgICAgIHRhYi5jb21wb25lbnRcbiAgICAgICAgKVxuICAgIClcblxuICByZW5kZXI6IC0+XG4gICAgKGRpdiB7a2V5OiBAcHJvcHMua2V5LCBjbGFzc05hbWU6IFwidGFiYmVkLXBhbmVsXCJ9LFxuICAgICAgQHJlbmRlclRhYnMoKVxuICAgICAgQHJlbmRlclNlbGVjdGVkUGFuZWwoKVxuICAgIClcbiJdfQ==
