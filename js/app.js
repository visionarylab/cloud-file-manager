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

  CloudFileManagerClient.prototype.setAppOptions = function(appOptions1) {
    var Provider, allProviders, availableProviders, i, j, len, len1, provider, providerName, providerOptions, ref, ref1, ref2;
    this.appOptions = appOptions1 != null ? appOptions1 : {};
    allProviders = {};
    ref = [ReadOnlyProvider, LocalStorageProvider, GoogleDriveProvider, DocumentStoreProvider];
    for (i = 0, len = ref.length; i < len; i++) {
      Provider = ref[i];
      if (Provider.Available()) {
        allProviders[Provider.Name] = Provider;
      }
    }
    if (!this.appOptions.providers) {
      this.appOptions.providers = [];
      for (providerName in allProviders) {
        if (!hasProp.call(allProviders, providerName)) continue;
        appOptions.providers.push(providerName);
      }
    }
    availableProviders = [];
    ref1 = this.appOptions.providers;
    for (j = 0, len1 = ref1.length; j < len1; j++) {
      provider = ref1[j];
      ref2 = isString(provider) ? [provider, {}] : [provider.name, provider], providerName = ref2[0], providerOptions = ref2[1];
      if (providerOptions.mimeType == null) {
        providerOptions.mimeType = this.appOptions.mimeType;
      }
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
    this._ui.init(this.appOptions.ui);
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
    var ref;
    if (callback == null) {
      callback = null;
    }
    if ((ref = this.appOptions.ui) != null ? ref.newFileOpensInNewTab : void 0) {
      return window.open(window.location, '_blank');
    } else if (this.state.dirty) {
      if (this._autoSaveInterval && this.state.metadata) {
        this.save();
        return this.newFile();
      } else if (confirm(tr('~CONFIRM.UNSAVED_CHANGES'))) {
        return this.newFile();
      }
    } else {
      return this.newFile();
    }
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

  CloudFileManagerClient.prototype.downloadDialog = function(callback) {
    if (callback == null) {
      callback = null;
    }
    return this._event('getContent', {}, (function(_this) {
      return function(content) {
        var ref;
        return _this._ui.downloadDialog((ref = _this.state.metadata) != null ? ref.name : void 0, content, callback);
      };
    })(this));
  };

  CloudFileManagerClient.prototype.renameDialog = function(callback) {
    if (callback == null) {
      callback = null;
    }
    if (this.state.metadata) {
      return this._ui.renameDialog(this.state.metadata.name, (function(_this) {
        return function(newName) {
          if (newName !== _this.state.metadata.name) {
            return _this.state.metadata.provider.rename(_this.state.metadata, newName, function(metadata, err) {
              if (err) {
                return _this._error(err);
              }
              _this._fileChanged('renamedFile', _this.state.content, metadata);
              return typeof callback === "function" ? callback(filename) : void 0;
            });
          }
        };
      })(this));
    } else {
      return typeof callback === "function" ? callback('No currently active file') : void 0;
    }
  };

  CloudFileManagerClient.prototype.dirty = function(isDirty) {
    if (isDirty == null) {
      isDirty = true;
    }
    return this._setState({
      dirty: isDirty,
      saved: isDirty ? false : void 0
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
          var ref, ref1;
          if (_this.state.dirty && ((ref = _this.state.metadata) != null ? (ref1 = ref.provider) != null ? ref1.can('save') : void 0 : void 0)) {
            return _this.save();
          }
        };
      })(this);
      return this._autoSaveInterval = setInterval(saveIfDirty, interval * 1000);
    }
  };

  CloudFileManagerClient.prototype.isAutoSaving = function() {
    return this._autoSaveInterval > 0;
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
var CloudMetadata, DocumentStoreAuthorizationDialog, DocumentStoreProvider, ProviderInterface, authorizeUrl, button, checkLoginUrl, div, documentStore, isString, listUrl, loadDocumentUrl, ref, removeDocumentUrl, saveDocumentUrl, span, tr,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

ref = React.DOM, div = ref.div, button = ref.button, span = ref.span;

documentStore = "http://document-store.herokuapp.com";

authorizeUrl = documentStore + "/user/authenticate";

checkLoginUrl = documentStore + "/user/info";

listUrl = documentStore + "/document/all";

loadDocumentUrl = documentStore + "/document/open";

saveDocumentUrl = documentStore + "/document/save";

removeDocumentUrl = documentStore + "/document/delete";

tr = require('../utils/translate');

isString = require('../utils/is-string');

ProviderInterface = (require('./provider-interface')).ProviderInterface;

CloudMetadata = (require('./provider-interface')).CloudMetadata;

DocumentStoreAuthorizationDialog = React.createFactory(React.createClass({
  displayName: 'DocumentStoreAuthorizationDialog',
  getInitialState: function() {
    return {
      docStoreAvailable: false
    };
  },
  componentWillMount: function() {
    return this.props.provider._onDocStoreLoaded((function(_this) {
      return function() {
        return _this.setState({
          docStoreAvailable: true
        });
      };
    })(this));
  },
  authenticate: function() {
    return this.props.provider.authorize();
  },
  render: function() {
    return div({}, this.state.docStoreAvailable ? button({
      onClick: this.authenticate
    }, 'Authorization Needed') : 'Trying to log into the Document Store...');
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
        list: true,
        remove: true,
        rename: true
      }
    });
    this.user = null;
  }

  DocumentStoreProvider.Name = 'documentStore';

  DocumentStoreProvider.prototype.authorized = function(authCallback) {
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
  };

  DocumentStoreProvider.prototype.authorize = function() {
    return this._showLoginWindow();
  };

  DocumentStoreProvider.prototype._onDocStoreLoaded = function(docStoreLoadedCallback) {
    this.docStoreLoadedCallback = docStoreLoadedCallback;
    if (this._docStoreLoaded) {
      return this.docStoreLoadedCallback();
    }
  };

  DocumentStoreProvider.prototype._loginSuccessful = function(user) {
    var ref1;
    this.user = user;
    if ((ref1 = this._loginWindow) != null) {
      ref1.close();
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
        provider.docStoreLoadedCallback();
        return provider._loginSuccessful(data);
      },
      error: function() {
        return provider.docStoreLoadedCallback();
      }
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

  DocumentStoreProvider.prototype.renderUser = function() {
    if (this.user) {
      return span({}, span({
        className: 'document-store-icon'
      }), this.user.name);
    } else {
      return null;
    }
  };

  DocumentStoreProvider.prototype.list = function(metadata, callback) {
    return $.ajax({
      dataType: 'json',
      url: listUrl,
      context: this,
      xhrFields: {
        withCredentials: true
      },
      success: function(data) {
        var file, key, list;
        list = [];
        for (key in data) {
          if (!hasProp.call(data, key)) continue;
          file = data[key];
          list.push(new CloudMetadata({
            name: file.name,
            providerData: {
              id: file.id
            },
            type: CloudMetadata.File,
            provider: this
          }));
        }
        return callback(null, list);
      },
      error: function() {
        return callback(null, []);
      }
    });
  };

  DocumentStoreProvider.prototype.load = function(metadata, callback) {
    return $.ajax({
      dataType: 'json',
      url: loadDocumentUrl,
      data: {
        recordid: metadata.providerData.id
      },
      context: this,
      xhrFields: {
        withCredentials: true
      },
      success: function(data) {
        return callback(null, data);
      },
      error: function() {
        return callback("Unable to load " + metadata.name);
      }
    });
  };

  DocumentStoreProvider.prototype.save = function(content, metadata, callback) {
    var params, url;
    content = this._validateContent(content);
    params = {};
    if (metadata.providerData.id) {
      params.recordid = metadata.providerData.id;
    }
    if (metadata.name) {
      params.recordname = metadata.name;
    }
    url = this._addParams(saveDocumentUrl, params);
    return $.ajax({
      dataType: 'json',
      method: 'POST',
      url: url,
      data: content,
      context: this,
      xhrFields: {
        withCredentials: true
      },
      success: function(data) {
        if (data.id) {
          metadata.providerData.id = data.id;
        }
        return callback(null, data);
      },
      error: function() {
        return callback("Unable to load " + metadata.name);
      }
    });
  };

  DocumentStoreProvider.prototype.remove = function(metadata, callback) {
    return $.ajax({
      url: removeDocumentUrl,
      data: {
        recordname: metadata.name
      },
      context: this,
      xhrFields: {
        withCredentials: true
      },
      success: function(data) {
        return callback(null, data);
      },
      error: function() {
        return callback("Unable to load " + metadata.name);
      }
    });
  };

  DocumentStoreProvider.prototype._addParams = function(url, params) {
    var key, kvp, value;
    if (!params) {
      return url;
    }
    kvp = [];
    for (key in params) {
      value = params[key];
      kvp.push([key, value].map(encodeURI).join("="));
    }
    return url + "?" + kvp.join("&");
  };

  DocumentStoreProvider.prototype._validateContent = function(content) {
    var error;
    if (typeof content !== "object") {
      try {
        content = JSON.parse(content);
      } catch (error) {
        content = {
          content: content
        };
      }
    }
    if (content.appName == null) {
      content.appName = this.options.appName;
    }
    if (content.appVersion == null) {
      content.appVersion = this.options.appVersion;
    }
    if (content.appBuildNum == null) {
      content.appBuildNum = this.options.appBuildNum;
    }
    return JSON.stringify(content);
  };

  return DocumentStoreProvider;

})(ProviderInterface);

module.exports = DocumentStoreProvider;



},{"../utils/is-string":9,"../utils/translate":11,"./provider-interface":6}],4:[function(require,module,exports){
var CloudMetadata, GoogleDriveAuthorizationDialog, GoogleDriveProvider, ProviderInterface, button, div, isString, ref, span, tr,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

ref = React.DOM, div = ref.div, button = ref.button, span = ref.span;

tr = require('../utils/translate');

isString = require('../utils/is-string');

ProviderInterface = (require('./provider-interface')).ProviderInterface;

CloudMetadata = (require('./provider-interface')).CloudMetadata;

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
        remove: true,
        rename: true
      }
    });
    this.authToken = null;
    this.user = null;
    this.clientId = this.options.clientId;
    if (!this.clientId) {
      throw new Error('Missing required clientId in googleDrive provider options');
    }
    this.mimeType = this.options.mimeType || "text/plain";
    this._loadGAPI();
  }

  GoogleDriveProvider.Name = 'googleDrive';

  GoogleDriveProvider.IMMEDIATE = true;

  GoogleDriveProvider.SHOW_POPUP = false;

  GoogleDriveProvider.prototype.authorized = function(authCallback) {
    this.authCallback = authCallback;
    if (this.authCallback) {
      if (this.authToken) {
        return this.authCallback(true);
      } else {
        return this.authorize(GoogleDriveProvider.IMMEDIATE);
      }
    } else {
      return this.authToken !== null;
    }
  };

  GoogleDriveProvider.prototype.authorize = function(immediate) {
    return this._loadedGAPI((function(_this) {
      return function() {
        var args;
        args = {
          client_id: _this.clientId,
          scope: ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/userinfo.profile'],
          immediate: immediate
        };
        return gapi.auth.authorize(args, function(authToken) {
          _this.authToken = authToken && !authToken.error ? authToken : null;
          _this.user = null;
          if (_this.authToken) {
            gapi.client.oauth2.userinfo.get().execute(function(user) {
              return _this.user = user;
            });
          }
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

  GoogleDriveProvider.prototype.renderUser = function() {
    if (this.user) {
      return span({}, span({
        className: 'gdrive-icon'
      }), this.user.name);
    } else {
      return null;
    }
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
          var i, item, len, list, ref1;
          if (!result) {
            return callback('Unable to list files');
          }
          list = [];
          ref1 = result != null ? result.items : void 0;
          for (i = 0, len = ref1.length; i < len; i++) {
            item = ref1[i];
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
          return gapi.client.load('oauth2', 'v2', function() {
            return callback.call(self);
          });
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
    var body, boundary, header, method, path, ref1, ref2, request;
    boundary = '-------314159265358979323846';
    header = JSON.stringify({
      title: metadata.name,
      mimeType: this.mimeType
    });
    ref2 = ((ref1 = metadata.providerData) != null ? ref1.id : void 0) ? ['PUT', "/upload/drive/v2/files/" + metadata.providerData.id] : ['POST', '/upload/drive/v2/files'], method = ref2[0], path = ref2[1];
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
        remove: true,
        rename: true
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
    var ref;
    this.name = options.name, this.path = options.path, this.type = options.type, this.provider = options.provider, this.providerData = (ref = options.providerData) != null ? ref : {};
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
  }

  ProviderInterface.Available = function() {
    return true;
  };

  ProviderInterface.prototype.can = function(capability) {
    return this.capabilities[capability];
  };

  ProviderInterface.prototype.authorized = function(callback) {
    if (callback) {
      return callback(true);
    } else {
      return true;
    }
  };

  ProviderInterface.prototype.renderAuthorizationDialog = function() {
    return AuthorizationNotImplementedDialog({
      provider: this
    });
  };

  ProviderInterface.prototype.renderUser = function() {
    return null;
  };

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

  ProviderInterface.prototype.rename = function(metadata, newName, callback) {
    return this._notImplemented('rename');
  };

  ProviderInterface.prototype._notImplemented = function(methodName) {
    return alert(methodName + " not implemented for " + this.name + " provider");
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
        remove: false,
        rename: false
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
  CloudFileManagerUIMenu.DefaultMenu = ['newFileDialog', 'openFileDialog', 'save', 'saveFileAsDialog', 'downloadDialog', 'renameDialog'];

  function CloudFileManagerUIMenu(options, client) {
    var i, item, len, menuItem, name, ref, ref1, setAction, setEnabled;
    setAction = function(action) {
      var ref;
      return ((ref = client[action]) != null ? ref.bind(client) : void 0) || (function() {
        return alert("No " + action + " action is available in the client");
      });
    };
    setEnabled = function(action) {
      if (action === 'renameDialog') {
        return function() {
          var ref;
          return (ref = client.state.metadata) != null ? ref.provider.can('rename') : void 0;
        };
      } else {
        return true;
      }
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
          case 'downloadDialog':
            return {
              name: name || tr("~MENU.DOWNLOAD")
            };
          case 'renameDialog':
            return {
              name: name || tr("~MENU.RENAME")
            };
          default:
            return {
              name: "Unknown item: " + item
            };
        }
      })(), menuItem.enabled = setEnabled(item), menuItem.action = setAction(item), menuItem) : (isString(item.action) ? (item.enabled = setEnabled(item.action), item.action = setAction(item.action)) : item.enabled || (item.enabled = true), item);
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

  CloudFileManagerUI.prototype.downloadDialog = function(filename, content, callback) {
    return this.listenerCallback(new CloudFileManagerUIEvent('showDownloadDialog', {
      filename: filename,
      content: content,
      callback: callback
    }));
  };

  CloudFileManagerUI.prototype.renameDialog = function(filename, callback) {
    return this.listenerCallback(new CloudFileManagerUIEvent('showRenameDialog', {
      filename: filename,
      callback: callback
    }));
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
  "~MENU.DOWNLOAD": "Download",
  "~MENU.RENAME": "Rename",
  "~DIALOG.SAVE": "Save",
  "~DIALOG.SAVE_AS": "Save As ...",
  "~DIALOG.OPEN": "Open",
  "~DIALOG.DOWNLOAD": "Download",
  "~DIALOG.RENAME": "Rename",
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
  "~FILE_DIALOG.LOADING": "Loading...",
  "~DOWNLOAD_DIALOG.DOWNLOAD": "Download",
  "~DOWNLOAD_DIALOG.CANCEL": "Cancel",
  "~RENAME_DIALOG.RENAME": "Rename",
  "~RENAME_DIALOG.CANCEL": "Cancel",
  "~CONFIRM.UNSAVED_CHANGES": "You have unsaved changes.  Are you sure you want a new file?"
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
var App, DownloadDialog, InnerApp, MenuBar, ProviderTabbedDialog, RenameDialog, div, iframe, ref, tr;

MenuBar = React.createFactory(require('./menu-bar-view'));

ProviderTabbedDialog = React.createFactory(require('./provider-tabbed-dialog-view'));

DownloadDialog = React.createFactory(require('./download-dialog-view'));

RenameDialog = React.createFactory(require('./rename-dialog-view'));

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
  getProvider: function() {
    var ref1;
    return (ref1 = this.props.client.state.metadata) != null ? ref1.provider : void 0;
  },
  getInitialState: function() {
    var ref1, ref2;
    return {
      filename: this.getFilename(),
      provider: this.getProvider(),
      menuItems: ((ref1 = this.props.client._ui.menu) != null ? ref1.items : void 0) || [],
      menuOptions: ((ref2 = this.props.ui) != null ? ref2.menuBar : void 0) || {},
      providerDialog: null,
      downloadDialog: null,
      renameDialog: null,
      dirty: false
    };
  },
  componentWillMount: function() {
    this.props.client.listen((function(_this) {
      return function(event) {
        var fileStatus, ref1;
        fileStatus = event.state.saving ? {
          message: "Saving...",
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
          provider: _this.getProvider(),
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
          case 'showDownloadDialog':
            return _this.setState({
              downloadDialog: event.data
            });
          case 'showRenameDialog':
            return _this.setState({
              renameDialog: event.data
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
  closeDialogs: function() {
    return this.setState({
      providerDialog: null,
      downloadDialog: null,
      renameDialog: null
    });
  },
  renderDialogs: function() {
    if (this.state.providerDialog) {
      return ProviderTabbedDialog({
        client: this.props.client,
        dialog: this.state.providerDialog,
        close: this.closeDialogs
      });
    } else if (this.state.downloadDialog) {
      return DownloadDialog({
        filename: this.state.downloadDialog.filename,
        content: this.state.downloadDialog.content,
        close: this.closeDialogs
      });
    } else if (this.state.renameDialog) {
      return RenameDialog({
        filename: this.state.renameDialog.filename,
        callback: this.state.renameDialog.callback,
        close: this.closeDialogs
      });
    }
  },
  render: function() {
    if (this.props.usingIframe) {
      return div({
        className: 'app'
      }, MenuBar({
        filename: this.state.filename,
        provider: this.state.provider,
        fileStatus: this.state.fileStatus,
        items: this.state.menuItems,
        options: this.state.menuOptions
      }), InnerApp({
        app: this.props.app
      }), this.renderDialogs());
    } else if (this.state.providerDialog || this.state.downloadDialog) {
      return div({
        className: 'app'
      }, this.renderDialogs());
    } else {
      return null;
    }
  }
});

module.exports = App;



},{"../utils/translate":11,"./download-dialog-view":14,"./menu-bar-view":17,"./provider-tabbed-dialog-view":21,"./rename-dialog-view":22}],13:[function(require,module,exports){
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
var ModalDialog, a, button, div, input, ref, tr;

ref = React.DOM, div = ref.div, input = ref.input, a = ref.a, button = ref.button;

ModalDialog = React.createFactory(require('./modal-dialog-view'));

tr = require('../utils/translate');

module.exports = React.createClass({
  displayName: 'DownloadDialogView',
  getInitialState: function() {
    return {
      filename: this.trim(this.props.filename || '')
    };
  },
  componentDidMount: function() {
    this.filename = React.findDOMNode(this.refs.filename);
    return this.filename.focus();
  },
  updateFilename: function() {
    return this.setState({
      filename: this.trim(this.filename.value)
    });
  },
  trim: function(s) {
    return s.replace(/^\s+|\s+$/, '');
  },
  download: function(e) {
    if (this.state.filename.length > 0) {
      e.target.setAttribute('href', "data:text/plain," + (encodeURIComponent(this.props.content)));
      return this.props.close();
    } else {
      e.preventDefault();
      return this.filename.focus();
    }
  },
  render: function() {
    return ModalDialog({
      title: tr('~DIALOG.DOWNLOAD'),
      close: this.props.close
    }, div({
      className: 'download-dialog'
    }, input({
      ref: 'filename',
      placeholder: 'Filename',
      value: this.state.filename,
      onChange: this.updateFilename
    }), div({
      className: 'buttons'
    }, a({
      href: '#',
      className: (this.state.filename.length === 0 ? 'disabled' : ''),
      download: this.state.filename,
      onClick: this.download
    }, tr('~DOWNLOAD_DIALOG.DOWNLOAD')), button({
      onClick: this.props.close
    }, tr('~DOWNLOAD_DIALOG.CANCEL')))));
  }
});



},{"../utils/translate":11,"./modal-dialog-view":18}],15:[function(require,module,exports){
var DropDown, DropdownItem, div, i, li, ref, span, ul;

ref = React.DOM, div = ref.div, i = ref.i, span = ref.span, ul = ref.ul, li = ref.li;

DropdownItem = React.createFactory(React.createClass({
  displayName: 'DropdownItem',
  clicked: function() {
    return this.props.select(this.props.item);
  },
  render: function() {
    var className, disabled, enabled, name;
    enabled = this.props.item.hasOwnProperty('enabled') ? typeof this.props.item.enabled === 'function' ? this.props.item.enabled() : this.props.item.enabled : true;
    disabled = !enabled || (this.props.isActionMenu && !this.props.item.action);
    className = "menuItem " + (disabled ? 'disabled' : '');
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



},{}],16:[function(require,module,exports){
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
      key: this.props.key,
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
        for (i = j = 0, len = ref1.length; j < len; i = ++j) {
          metadata = ref1[i];
          results.push(FileListFile({
            key: i,
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



},{"../providers/provider-interface":6,"../utils/translate":11,"./authorize-mixin":13}],17:[function(require,module,exports){
var Dropdown, div, i, ref, span;

ref = React.DOM, div = ref.div, i = ref.i, span = ref.span;

Dropdown = React.createFactory(require('./dropdown-view'));

module.exports = React.createClass({
  displayName: 'MenuBar',
  help: function() {
    return window.open(this.props.options.help, '_blank');
  },
  render: function() {
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
    }, this.props.options.info ? span({
      className: 'menu-bar-info'
    }, this.props.options.info) : void 0, this.props.provider && this.props.provider.authorized() ? this.props.provider.renderUser() : void 0, this.props.options.help ? i({
      style: {
        fontSize: "13px"
      },
      className: 'clickable icon-help',
      onClick: this.help
    }) : void 0));
  }
});



},{"./dropdown-view":15}],18:[function(require,module,exports){
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
      className: "modal-dialog-title-close icon-ex",
      onClick: this.close
    }), this.props.title || 'Untitled Dialog'), div({
      className: 'modal-dialog-workspace'
    }, this.props.children))));
  }
});



},{"./modal-view":20}],19:[function(require,module,exports){
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



},{"./modal-dialog-view":18,"./tabbed-panel-view":24}],20:[function(require,module,exports){
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



},{}],21:[function(require,module,exports){
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



},{"../providers/provider-interface":6,"../utils/translate":11,"./file-dialog-tab-view":16,"./modal-tabbed-dialog-view":19,"./select-provider-dialog-tab-view":23,"./tabbed-panel-view":24}],22:[function(require,module,exports){
var ModalDialog, a, button, div, input, ref, tr;

ref = React.DOM, div = ref.div, input = ref.input, a = ref.a, button = ref.button;

ModalDialog = React.createFactory(require('./modal-dialog-view'));

tr = require('../utils/translate');

module.exports = React.createClass({
  displayName: 'RenameDialogView',
  getInitialState: function() {
    return {
      filename: this.trim(this.props.filename || '')
    };
  },
  componentDidMount: function() {
    this.filename = React.findDOMNode(this.refs.filename);
    return this.filename.focus();
  },
  updateFilename: function() {
    return this.setState({
      filename: this.trim(this.filename.value)
    });
  },
  trim: function(s) {
    return s.replace(/^\s+|\s+$/, '');
  },
  rename: function(e) {
    var base;
    if (this.state.filename.length > 0) {
      if (typeof (base = this.props).callback === "function") {
        base.callback(this.state.filename);
      }
      return this.props.close();
    } else {
      e.preventDefault();
      return this.filename.focus();
    }
  },
  render: function() {
    return ModalDialog({
      title: tr('~DIALOG.DOWNLOAD'),
      close: this.props.close
    }, div({
      className: 'rename-dialog'
    }, input({
      ref: 'filename',
      placeholder: 'Filename',
      value: this.state.filename,
      onChange: this.updateFilename
    }), div({
      className: 'buttons'
    }, button({
      className: (this.state.filename.length === 0 ? 'disabled' : ''),
      onClick: this.rename
    }, tr('~RENAME_DIALOG.RENAME')), button({
      onClick: this.props.close
    }, tr('~RENAME_DIALOG.CANCEL')))));
  }
});



},{"../utils/translate":11,"./modal-dialog-view":18}],23:[function(require,module,exports){
var SelectProviderDialogTab, div;

div = React.DOM.div;

SelectProviderDialogTab = React.createFactory(React.createClass({
  displayName: 'SelectProviderDialogTab',
  render: function() {
    return div({}, "TODO: SelectProviderDialogTab: " + this.props.provider.displayName);
  }
}));

module.exports = SelectProviderDialogTab;



},{}],24:[function(require,module,exports){
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
        results.push(ul({
          key: index
        }, this.renderTab(tab, index)));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvc2ZlbnRyZXNzL3Byb2plY3RzL2Nsb3VkLWZpbGUtbWFuYWdlci9zcmMvY29kZS9hcHAuY29mZmVlIiwiL1VzZXJzL3NmZW50cmVzcy9wcm9qZWN0cy9jbG91ZC1maWxlLW1hbmFnZXIvc3JjL2NvZGUvY2xpZW50LmNvZmZlZSIsIi9Vc2Vycy9zZmVudHJlc3MvcHJvamVjdHMvY2xvdWQtZmlsZS1tYW5hZ2VyL3NyYy9jb2RlL3Byb3ZpZGVycy9kb2N1bWVudC1zdG9yZS1wcm92aWRlci5jb2ZmZWUiLCIvVXNlcnMvc2ZlbnRyZXNzL3Byb2plY3RzL2Nsb3VkLWZpbGUtbWFuYWdlci9zcmMvY29kZS9wcm92aWRlcnMvZ29vZ2xlLWRyaXZlLXByb3ZpZGVyLmNvZmZlZSIsIi9Vc2Vycy9zZmVudHJlc3MvcHJvamVjdHMvY2xvdWQtZmlsZS1tYW5hZ2VyL3NyYy9jb2RlL3Byb3ZpZGVycy9sb2NhbHN0b3JhZ2UtcHJvdmlkZXIuY29mZmVlIiwiL1VzZXJzL3NmZW50cmVzcy9wcm9qZWN0cy9jbG91ZC1maWxlLW1hbmFnZXIvc3JjL2NvZGUvcHJvdmlkZXJzL3Byb3ZpZGVyLWludGVyZmFjZS5jb2ZmZWUiLCIvVXNlcnMvc2ZlbnRyZXNzL3Byb2plY3RzL2Nsb3VkLWZpbGUtbWFuYWdlci9zcmMvY29kZS9wcm92aWRlcnMvcmVhZG9ubHktcHJvdmlkZXIuY29mZmVlIiwiL1VzZXJzL3NmZW50cmVzcy9wcm9qZWN0cy9jbG91ZC1maWxlLW1hbmFnZXIvc3JjL2NvZGUvdWkuY29mZmVlIiwiL1VzZXJzL3NmZW50cmVzcy9wcm9qZWN0cy9jbG91ZC1maWxlLW1hbmFnZXIvc3JjL2NvZGUvdXRpbHMvaXMtc3RyaW5nLmNvZmZlZSIsIi9Vc2Vycy9zZmVudHJlc3MvcHJvamVjdHMvY2xvdWQtZmlsZS1tYW5hZ2VyL3NyYy9jb2RlL3V0aWxzL2xhbmcvZW4tdXMuY29mZmVlIiwiL1VzZXJzL3NmZW50cmVzcy9wcm9qZWN0cy9jbG91ZC1maWxlLW1hbmFnZXIvc3JjL2NvZGUvdXRpbHMvdHJhbnNsYXRlLmNvZmZlZSIsIi9Vc2Vycy9zZmVudHJlc3MvcHJvamVjdHMvY2xvdWQtZmlsZS1tYW5hZ2VyL3NyYy9jb2RlL3ZpZXdzL2FwcC12aWV3LmNvZmZlZSIsIi9Vc2Vycy9zZmVudHJlc3MvcHJvamVjdHMvY2xvdWQtZmlsZS1tYW5hZ2VyL3NyYy9jb2RlL3ZpZXdzL2F1dGhvcml6ZS1taXhpbi5jb2ZmZWUiLCIvVXNlcnMvc2ZlbnRyZXNzL3Byb2plY3RzL2Nsb3VkLWZpbGUtbWFuYWdlci9zcmMvY29kZS92aWV3cy9kb3dubG9hZC1kaWFsb2ctdmlldy5jb2ZmZWUiLCIvVXNlcnMvc2ZlbnRyZXNzL3Byb2plY3RzL2Nsb3VkLWZpbGUtbWFuYWdlci9zcmMvY29kZS92aWV3cy9kcm9wZG93bi12aWV3LmNvZmZlZSIsIi9Vc2Vycy9zZmVudHJlc3MvcHJvamVjdHMvY2xvdWQtZmlsZS1tYW5hZ2VyL3NyYy9jb2RlL3ZpZXdzL2ZpbGUtZGlhbG9nLXRhYi12aWV3LmNvZmZlZSIsIi9Vc2Vycy9zZmVudHJlc3MvcHJvamVjdHMvY2xvdWQtZmlsZS1tYW5hZ2VyL3NyYy9jb2RlL3ZpZXdzL21lbnUtYmFyLXZpZXcuY29mZmVlIiwiL1VzZXJzL3NmZW50cmVzcy9wcm9qZWN0cy9jbG91ZC1maWxlLW1hbmFnZXIvc3JjL2NvZGUvdmlld3MvbW9kYWwtZGlhbG9nLXZpZXcuY29mZmVlIiwiL1VzZXJzL3NmZW50cmVzcy9wcm9qZWN0cy9jbG91ZC1maWxlLW1hbmFnZXIvc3JjL2NvZGUvdmlld3MvbW9kYWwtdGFiYmVkLWRpYWxvZy12aWV3LmNvZmZlZSIsIi9Vc2Vycy9zZmVudHJlc3MvcHJvamVjdHMvY2xvdWQtZmlsZS1tYW5hZ2VyL3NyYy9jb2RlL3ZpZXdzL21vZGFsLXZpZXcuY29mZmVlIiwiL1VzZXJzL3NmZW50cmVzcy9wcm9qZWN0cy9jbG91ZC1maWxlLW1hbmFnZXIvc3JjL2NvZGUvdmlld3MvcHJvdmlkZXItdGFiYmVkLWRpYWxvZy12aWV3LmNvZmZlZSIsIi9Vc2Vycy9zZmVudHJlc3MvcHJvamVjdHMvY2xvdWQtZmlsZS1tYW5hZ2VyL3NyYy9jb2RlL3ZpZXdzL3JlbmFtZS1kaWFsb2ctdmlldy5jb2ZmZWUiLCIvVXNlcnMvc2ZlbnRyZXNzL3Byb2plY3RzL2Nsb3VkLWZpbGUtbWFuYWdlci9zcmMvY29kZS92aWV3cy9zZWxlY3QtcHJvdmlkZXItZGlhbG9nLXRhYi12aWV3LmNvZmZlZSIsIi9Vc2Vycy9zZmVudHJlc3MvcHJvamVjdHMvY2xvdWQtZmlsZS1tYW5hZ2VyL3NyYy9jb2RlL3ZpZXdzL3RhYmJlZC1wYW5lbC12aWV3LmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBLElBQUE7O0FBQUEsT0FBQSxHQUFVLEtBQUssQ0FBQyxhQUFOLENBQW9CLE9BQUEsQ0FBUSxrQkFBUixDQUFwQjs7QUFFVixzQkFBQSxHQUF5QixDQUFDLE9BQUEsQ0FBUSxNQUFSLENBQUQsQ0FBZ0IsQ0FBQzs7QUFDMUMsc0JBQUEsR0FBeUIsQ0FBQyxPQUFBLENBQVEsVUFBUixDQUFELENBQW9CLENBQUM7O0FBRXhDO0VBRVMsMEJBQUMsT0FBRDtJQUVYLElBQUMsQ0FBQSxXQUFELEdBQWUsc0JBQXNCLENBQUM7SUFFdEMsSUFBQyxDQUFBLE1BQUQsR0FBYyxJQUFBLHNCQUFBLENBQUE7SUFDZCxJQUFDLENBQUEsVUFBRCxHQUFjO0VBTEg7OzZCQU9iLElBQUEsR0FBTSxTQUFDLFVBQUQsRUFBYyxXQUFkO0lBQUMsSUFBQyxDQUFBLGFBQUQ7O01BQWEsY0FBYzs7SUFDaEMsSUFBQyxDQUFBLFVBQVUsQ0FBQyxXQUFaLEdBQTBCO1dBQzFCLElBQUMsQ0FBQSxNQUFNLENBQUMsYUFBUixDQUFzQixJQUFDLENBQUEsVUFBdkI7RUFGSTs7NkJBSU4sV0FBQSxHQUFhLFNBQUMsVUFBRCxFQUFjLE1BQWQ7SUFBQyxJQUFDLENBQUEsYUFBRDtJQUNaLElBQUMsQ0FBQSxJQUFELENBQU0sSUFBQyxDQUFBLFVBQVAsRUFBbUIsSUFBbkI7V0FDQSxJQUFDLENBQUEsVUFBRCxDQUFZLFFBQVEsQ0FBQyxjQUFULENBQXdCLE1BQXhCLENBQVo7RUFGVzs7NkJBSWIsYUFBQSxHQUFlLFNBQUMsYUFBRDtJQUNiLElBQUcsQ0FBSSxJQUFDLENBQUEsVUFBVSxDQUFDLFdBQW5CO01BQ0UsSUFBQyxDQUFBLGdCQUFELENBQUEsRUFERjs7V0FFQSxJQUFDLENBQUEsTUFBTSxDQUFDLE9BQVIsQ0FBZ0IsYUFBaEI7RUFIYTs7NkJBS2YsZ0JBQUEsR0FBa0IsU0FBQTtBQUNoQixRQUFBO0lBQUEsTUFBQSxHQUFTLFFBQVEsQ0FBQyxhQUFULENBQXVCLEtBQXZCO0lBQ1QsUUFBUSxDQUFDLElBQUksQ0FBQyxXQUFkLENBQTBCLE1BQTFCO1dBQ0EsSUFBQyxDQUFBLFVBQUQsQ0FBWSxNQUFaO0VBSGdCOzs2QkFLbEIsVUFBQSxHQUFZLFNBQUMsTUFBRDtJQUNWLElBQUMsQ0FBQSxVQUFVLENBQUMsTUFBWixHQUFxQixJQUFDLENBQUE7V0FDdEIsS0FBSyxDQUFDLE1BQU4sQ0FBYyxPQUFBLENBQVEsSUFBQyxDQUFBLFVBQVQsQ0FBZCxFQUFvQyxNQUFwQztFQUZVOzs7Ozs7QUFJZCxNQUFNLENBQUMsT0FBUCxHQUFxQixJQUFBLGdCQUFBLENBQUE7Ozs7O0FDcENyQixJQUFBLHlLQUFBO0VBQUE7O0FBQUEsRUFBQSxHQUFLLE9BQUEsQ0FBUSxtQkFBUjs7QUFDTCxRQUFBLEdBQVcsT0FBQSxDQUFRLG1CQUFSOztBQUVYLGtCQUFBLEdBQXFCLENBQUMsT0FBQSxDQUFRLE1BQVIsQ0FBRCxDQUFnQixDQUFDOztBQUV0QyxvQkFBQSxHQUF1QixPQUFBLENBQVEsbUNBQVI7O0FBQ3ZCLGdCQUFBLEdBQW1CLE9BQUEsQ0FBUSwrQkFBUjs7QUFDbkIsbUJBQUEsR0FBc0IsT0FBQSxDQUFRLG1DQUFSOztBQUN0QixxQkFBQSxHQUF3QixPQUFBLENBQVEscUNBQVI7O0FBRWxCO0VBRVMscUNBQUMsS0FBRCxFQUFRLEtBQVIsRUFBb0IsU0FBcEIsRUFBc0MsS0FBdEM7SUFBQyxJQUFDLENBQUEsT0FBRDtJQUFPLElBQUMsQ0FBQSx1QkFBRCxRQUFRO0lBQUksSUFBQyxDQUFBLCtCQUFELFlBQVk7SUFBTSxJQUFDLENBQUEsd0JBQUQsUUFBUztFQUEvQzs7Ozs7O0FBRVQ7RUFFUyxnQ0FBQyxPQUFEO0lBQ1gsSUFBQyxDQUFBLEtBQUQsR0FDRTtNQUFBLGtCQUFBLEVBQW9CLEVBQXBCOztJQUNGLElBQUMsQ0FBQSxXQUFELENBQUE7SUFDQSxJQUFDLENBQUEsR0FBRCxHQUFXLElBQUEsa0JBQUEsQ0FBbUIsSUFBbkI7RUFKQTs7bUNBTWIsYUFBQSxHQUFlLFNBQUMsV0FBRDtBQUViLFFBQUE7SUFGYyxJQUFDLENBQUEsbUNBQUQsY0FBYztJQUU1QixZQUFBLEdBQWU7QUFDZjtBQUFBLFNBQUEscUNBQUE7O01BQ0UsSUFBRyxRQUFRLENBQUMsU0FBVCxDQUFBLENBQUg7UUFDRSxZQUFhLENBQUEsUUFBUSxDQUFDLElBQVQsQ0FBYixHQUE4QixTQURoQzs7QUFERjtJQUtBLElBQUcsQ0FBSSxJQUFDLENBQUEsVUFBVSxDQUFDLFNBQW5CO01BQ0UsSUFBQyxDQUFBLFVBQVUsQ0FBQyxTQUFaLEdBQXdCO0FBQ3hCLFdBQUEsNEJBQUE7O1FBQ0UsVUFBVSxDQUFDLFNBQVMsQ0FBQyxJQUFyQixDQUEwQixZQUExQjtBQURGLE9BRkY7O0lBTUEsa0JBQUEsR0FBcUI7QUFDckI7QUFBQSxTQUFBLHdDQUFBOztNQUNFLE9BQXFDLFFBQUEsQ0FBUyxRQUFULENBQUgsR0FBMEIsQ0FBQyxRQUFELEVBQVcsRUFBWCxDQUExQixHQUE4QyxDQUFDLFFBQVEsQ0FBQyxJQUFWLEVBQWdCLFFBQWhCLENBQWhGLEVBQUMsc0JBQUQsRUFBZTs7UUFFZixlQUFlLENBQUMsV0FBWSxJQUFDLENBQUEsVUFBVSxDQUFDOztNQUN4QyxJQUFHLENBQUksWUFBUDtRQUNFLElBQUMsQ0FBQSxNQUFELENBQVEsNEVBQVIsRUFERjtPQUFBLE1BQUE7UUFHRSxJQUFHLFlBQWEsQ0FBQSxZQUFBLENBQWhCO1VBQ0UsUUFBQSxHQUFXLFlBQWEsQ0FBQSxZQUFBO1VBQ3hCLGtCQUFrQixDQUFDLElBQW5CLENBQTRCLElBQUEsUUFBQSxDQUFTLGVBQVQsQ0FBNUIsRUFGRjtTQUFBLE1BQUE7VUFJRSxJQUFDLENBQUEsTUFBRCxDQUFRLG9CQUFBLEdBQXFCLFlBQTdCLEVBSkY7U0FIRjs7QUFKRjtJQVlBLElBQUMsQ0FBQSxTQUFELENBQVc7TUFBQSxrQkFBQSxFQUFvQixrQkFBcEI7S0FBWDtJQUNBLElBQUMsQ0FBQSxHQUFHLENBQUMsSUFBTCxDQUFVLElBQUMsQ0FBQSxVQUFVLENBQUMsRUFBdEI7SUFHQSxJQUFHLE9BQU8sQ0FBQyxnQkFBWDthQUNFLElBQUMsQ0FBQSxRQUFELENBQVUsT0FBTyxDQUFDLGdCQUFsQixFQURGOztFQS9CYTs7bUNBbUNmLE9BQUEsR0FBUyxTQUFDLGNBQUQ7SUFBQyxJQUFDLENBQUEsZ0JBQUQ7V0FDUixJQUFDLENBQUEsTUFBRCxDQUFRLFdBQVIsRUFBcUI7TUFBQyxNQUFBLEVBQVEsSUFBVDtLQUFyQjtFQURPOzttQ0FJVCxNQUFBLEdBQVEsU0FBQyxnQkFBRDtJQUFDLElBQUMsQ0FBQSxtQkFBRDtFQUFEOzttQ0FFUixjQUFBLEdBQWdCLFNBQUMsSUFBRDtXQUNkLElBQUMsQ0FBQSxHQUFHLENBQUMsY0FBTCxDQUFvQixJQUFwQjtFQURjOzttQ0FHaEIsY0FBQSxHQUFnQixTQUFDLElBQUQ7V0FDZCxJQUFDLENBQUEsR0FBRyxDQUFDLGNBQUwsQ0FBb0IsSUFBcEI7RUFEYzs7bUNBR2hCLE9BQUEsR0FBUyxTQUFDLFFBQUQ7O01BQUMsV0FBVzs7SUFDbkIsSUFBQyxDQUFBLFdBQUQsQ0FBQTtXQUNBLElBQUMsQ0FBQSxNQUFELENBQVEsV0FBUjtFQUZPOzttQ0FJVCxhQUFBLEdBQWUsU0FBQyxRQUFEO0FBQ2IsUUFBQTs7TUFEYyxXQUFXOztJQUN6Qiw0Q0FBaUIsQ0FBRSw2QkFBbkI7YUFDRSxNQUFNLENBQUMsSUFBUCxDQUFZLE1BQU0sQ0FBQyxRQUFuQixFQUE2QixRQUE3QixFQURGO0tBQUEsTUFFSyxJQUFHLElBQUMsQ0FBQSxLQUFLLENBQUMsS0FBVjtNQUNILElBQUcsSUFBQyxDQUFBLGlCQUFELElBQXVCLElBQUMsQ0FBQSxLQUFLLENBQUMsUUFBakM7UUFDRSxJQUFDLENBQUEsSUFBRCxDQUFBO2VBQ0EsSUFBQyxDQUFBLE9BQUQsQ0FBQSxFQUZGO09BQUEsTUFHSyxJQUFHLE9BQUEsQ0FBUSxFQUFBLENBQUcsMEJBQUgsQ0FBUixDQUFIO2VBQ0gsSUFBQyxDQUFBLE9BQUQsQ0FBQSxFQURHO09BSkY7S0FBQSxNQUFBO2FBT0gsSUFBQyxDQUFBLE9BQUQsQ0FBQSxFQVBHOztFQUhROzttQ0FZZixRQUFBLEdBQVUsU0FBQyxRQUFELEVBQVcsUUFBWDtBQUNSLFFBQUE7O01BRG1CLFdBQVc7O0lBQzlCLDhEQUFxQixDQUFFLEdBQXBCLENBQXdCLE1BQXhCLG1CQUFIO2FBQ0UsUUFBUSxDQUFDLFFBQVEsQ0FBQyxJQUFsQixDQUF1QixRQUF2QixFQUFpQyxDQUFBLFNBQUEsS0FBQTtlQUFBLFNBQUMsR0FBRCxFQUFNLE9BQU47VUFDL0IsSUFBdUIsR0FBdkI7QUFBQSxtQkFBTyxLQUFDLENBQUEsTUFBRCxDQUFRLEdBQVIsRUFBUDs7VUFDQSxLQUFDLENBQUEsWUFBRCxDQUFjLFlBQWQsRUFBNEIsT0FBNUIsRUFBcUMsUUFBckM7a0RBQ0EsU0FBVSxTQUFTO1FBSFk7TUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQWpDLEVBREY7S0FBQSxNQUFBO2FBTUUsSUFBQyxDQUFBLGNBQUQsQ0FBZ0IsUUFBaEIsRUFORjs7RUFEUTs7bUNBU1YsY0FBQSxHQUFnQixTQUFDLFFBQUQ7O01BQUMsV0FBVzs7V0FDMUIsSUFBQyxDQUFBLEdBQUcsQ0FBQyxjQUFMLENBQW9CLENBQUEsU0FBQSxLQUFBO2FBQUEsU0FBQyxRQUFEO2VBQ2xCLEtBQUMsQ0FBQSxRQUFELENBQVUsUUFBVixFQUFvQixRQUFwQjtNQURrQjtJQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBcEI7RUFEYzs7bUNBSWhCLElBQUEsR0FBTSxTQUFDLFFBQUQ7O01BQUMsV0FBVzs7V0FDaEIsSUFBQyxDQUFBLE1BQUQsQ0FBUSxZQUFSLEVBQXNCLEVBQXRCLEVBQTBCLENBQUEsU0FBQSxLQUFBO2FBQUEsU0FBQyxPQUFEO2VBQ3hCLEtBQUMsQ0FBQSxXQUFELENBQWEsT0FBYixFQUFzQixRQUF0QjtNQUR3QjtJQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBMUI7RUFESTs7bUNBSU4sV0FBQSxHQUFhLFNBQUMsT0FBRCxFQUFVLFFBQVY7O01BQVUsV0FBVzs7SUFDaEMsSUFBRyxJQUFDLENBQUEsS0FBSyxDQUFDLFFBQVY7YUFDRSxJQUFDLENBQUEsUUFBRCxDQUFVLE9BQVYsRUFBbUIsSUFBQyxDQUFBLEtBQUssQ0FBQyxRQUExQixFQUFvQyxRQUFwQyxFQURGO0tBQUEsTUFBQTthQUdFLElBQUMsQ0FBQSxjQUFELENBQWdCLE9BQWhCLEVBQXlCLFFBQXpCLEVBSEY7O0VBRFc7O21DQU1iLFFBQUEsR0FBVSxTQUFDLE9BQUQsRUFBVSxRQUFWLEVBQW9CLFFBQXBCO0FBQ1IsUUFBQTs7TUFENEIsV0FBVzs7SUFDdkMsOERBQXFCLENBQUUsR0FBcEIsQ0FBd0IsTUFBeEIsbUJBQUg7TUFDRSxJQUFDLENBQUEsU0FBRCxDQUNFO1FBQUEsTUFBQSxFQUFRLFFBQVI7T0FERjthQUVBLFFBQVEsQ0FBQyxRQUFRLENBQUMsSUFBbEIsQ0FBdUIsT0FBdkIsRUFBZ0MsUUFBaEMsRUFBMEMsQ0FBQSxTQUFBLEtBQUE7ZUFBQSxTQUFDLEdBQUQ7VUFDeEMsSUFBdUIsR0FBdkI7QUFBQSxtQkFBTyxLQUFDLENBQUEsTUFBRCxDQUFRLEdBQVIsRUFBUDs7VUFDQSxLQUFDLENBQUEsWUFBRCxDQUFjLFdBQWQsRUFBMkIsT0FBM0IsRUFBb0MsUUFBcEM7a0RBQ0EsU0FBVSxTQUFTO1FBSHFCO01BQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUExQyxFQUhGO0tBQUEsTUFBQTthQVFFLElBQUMsQ0FBQSxjQUFELENBQWdCLE9BQWhCLEVBQXlCLFFBQXpCLEVBUkY7O0VBRFE7O21DQVdWLGNBQUEsR0FBZ0IsU0FBQyxPQUFELEVBQWlCLFFBQWpCOztNQUFDLFVBQVU7OztNQUFNLFdBQVc7O1dBQzFDLElBQUMsQ0FBQSxHQUFHLENBQUMsY0FBTCxDQUFvQixDQUFBLFNBQUEsS0FBQTthQUFBLFNBQUMsUUFBRDtlQUNsQixLQUFDLENBQUEsV0FBRCxDQUFhLE9BQWIsRUFBc0IsUUFBdEIsRUFBZ0MsUUFBaEM7TUFEa0I7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQXBCO0VBRGM7O21DQUloQixnQkFBQSxHQUFrQixTQUFDLE9BQUQsRUFBaUIsUUFBakI7O01BQUMsVUFBVTs7O01BQU0sV0FBVzs7V0FDNUMsSUFBQyxDQUFBLEdBQUcsQ0FBQyxnQkFBTCxDQUFzQixDQUFBLFNBQUEsS0FBQTthQUFBLFNBQUMsUUFBRDtlQUNwQixLQUFDLENBQUEsV0FBRCxDQUFhLE9BQWIsRUFBc0IsUUFBdEIsRUFBZ0MsUUFBaEM7TUFEb0I7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQXRCO0VBRGdCOzttQ0FJbEIsY0FBQSxHQUFnQixTQUFDLFFBQUQ7O01BQUMsV0FBVzs7V0FDMUIsSUFBQyxDQUFBLE1BQUQsQ0FBUSxZQUFSLEVBQXNCLEVBQXRCLEVBQTBCLENBQUEsU0FBQSxLQUFBO2FBQUEsU0FBQyxPQUFEO0FBQ3hCLFlBQUE7ZUFBQSxLQUFDLENBQUEsR0FBRyxDQUFDLGNBQUwsMkNBQW1DLENBQUUsYUFBckMsRUFBMkMsT0FBM0MsRUFBb0QsUUFBcEQ7TUFEd0I7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQTFCO0VBRGM7O21DQUloQixZQUFBLEdBQWMsU0FBQyxRQUFEOztNQUFDLFdBQVc7O0lBQ3hCLElBQUcsSUFBQyxDQUFBLEtBQUssQ0FBQyxRQUFWO2FBQ0UsSUFBQyxDQUFBLEdBQUcsQ0FBQyxZQUFMLENBQWtCLElBQUMsQ0FBQSxLQUFLLENBQUMsUUFBUSxDQUFDLElBQWxDLEVBQXdDLENBQUEsU0FBQSxLQUFBO2VBQUEsU0FBQyxPQUFEO1VBQ3RDLElBQUcsT0FBQSxLQUFhLEtBQUMsQ0FBQSxLQUFLLENBQUMsUUFBUSxDQUFDLElBQWhDO21CQUNFLEtBQUMsQ0FBQSxLQUFLLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxNQUF6QixDQUFnQyxLQUFDLENBQUEsS0FBSyxDQUFDLFFBQXZDLEVBQWlELE9BQWpELEVBQTBELFNBQUMsUUFBRCxFQUFXLEdBQVg7Y0FDeEQsSUFBdUIsR0FBdkI7QUFBQSx1QkFBTyxLQUFDLENBQUEsTUFBRCxDQUFRLEdBQVIsRUFBUDs7Y0FDQSxLQUFDLENBQUEsWUFBRCxDQUFjLGFBQWQsRUFBNkIsS0FBQyxDQUFBLEtBQUssQ0FBQyxPQUFwQyxFQUE2QyxRQUE3QztzREFDQSxTQUFVO1lBSDhDLENBQTFELEVBREY7O1FBRHNDO01BQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUF4QyxFQURGO0tBQUEsTUFBQTs4Q0FRRSxTQUFVLHFDQVJaOztFQURZOzttQ0FXZCxLQUFBLEdBQU8sU0FBQyxPQUFEOztNQUFDLFVBQVU7O1dBQ2hCLElBQUMsQ0FBQSxTQUFELENBQ0U7TUFBQSxLQUFBLEVBQU8sT0FBUDtNQUNBLEtBQUEsRUFBZ0IsT0FBVCxHQUFBLEtBQUEsR0FBQSxNQURQO0tBREY7RUFESzs7bUNBS1AsUUFBQSxHQUFVLFNBQUMsUUFBRDtBQUNSLFFBQUE7SUFBQSxJQUFHLElBQUMsQ0FBQSxpQkFBSjtNQUNFLGFBQUEsQ0FBYyxJQUFDLENBQUEsaUJBQWYsRUFERjs7SUFJQSxJQUFHLFFBQUEsR0FBVyxJQUFkO01BQ0UsUUFBQSxHQUFXLElBQUksQ0FBQyxLQUFMLENBQVcsUUFBQSxHQUFXLElBQXRCLEVBRGI7O0lBRUEsSUFBRyxRQUFBLEdBQVcsQ0FBZDtNQUNFLFdBQUEsR0FBYyxDQUFBLFNBQUEsS0FBQTtlQUFBLFNBQUE7QUFDWixjQUFBO1VBQUEsSUFBRyxLQUFDLENBQUEsS0FBSyxDQUFDLEtBQVAsZ0ZBQTBDLENBQUUsR0FBM0IsQ0FBK0IsTUFBL0Isb0JBQXBCO21CQUNFLEtBQUMsQ0FBQSxJQUFELENBQUEsRUFERjs7UUFEWTtNQUFBLENBQUEsQ0FBQSxDQUFBLElBQUE7YUFHZCxJQUFDLENBQUEsaUJBQUQsR0FBcUIsV0FBQSxDQUFZLFdBQVosRUFBMEIsUUFBQSxHQUFXLElBQXJDLEVBSnZCOztFQVBROzttQ0FhVixZQUFBLEdBQWMsU0FBQTtXQUNaLElBQUMsQ0FBQSxpQkFBRCxHQUFxQjtFQURUOzttQ0FHZCxXQUFBLEdBQWEsU0FBQyxPQUFELEVBQVUsUUFBVixFQUFvQixRQUFwQjtJQUNYLElBQUcsT0FBQSxLQUFhLElBQWhCO2FBQ0UsSUFBQyxDQUFBLFFBQUQsQ0FBVSxPQUFWLEVBQW1CLFFBQW5CLEVBQTZCLFFBQTdCLEVBREY7S0FBQSxNQUFBO2FBR0UsSUFBQyxDQUFBLE1BQUQsQ0FBUSxZQUFSLEVBQXNCLEVBQXRCLEVBQTBCLENBQUEsU0FBQSxLQUFBO2VBQUEsU0FBQyxPQUFEO2lCQUN4QixLQUFDLENBQUEsUUFBRCxDQUFVLE9BQVYsRUFBbUIsUUFBbkIsRUFBNkIsUUFBN0I7UUFEd0I7TUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQTFCLEVBSEY7O0VBRFc7O21DQU9iLE1BQUEsR0FBUSxTQUFDLE9BQUQ7V0FFTixLQUFBLENBQU0sT0FBTjtFQUZNOzttQ0FJUixZQUFBLEdBQWMsU0FBQyxJQUFELEVBQU8sT0FBUCxFQUFnQixRQUFoQjtJQUNaLElBQUMsQ0FBQSxTQUFELENBQ0U7TUFBQSxPQUFBLEVBQVMsT0FBVDtNQUNBLFFBQUEsRUFBVSxRQURWO01BRUEsTUFBQSxFQUFRLElBRlI7TUFHQSxLQUFBLEVBQU8sSUFBQSxLQUFRLFdBSGY7TUFJQSxLQUFBLEVBQU8sS0FKUDtLQURGO1dBTUEsSUFBQyxDQUFBLE1BQUQsQ0FBUSxJQUFSLEVBQWM7TUFBQyxPQUFBLEVBQVMsT0FBVjtNQUFtQixRQUFBLEVBQVUsUUFBN0I7S0FBZDtFQVBZOzttQ0FTZCxNQUFBLEdBQVEsU0FBQyxJQUFELEVBQU8sSUFBUCxFQUFrQixhQUFsQjtBQUNOLFFBQUE7O01BRGEsT0FBTzs7O01BQUksZ0JBQWdCOztJQUN4QyxLQUFBLEdBQVksSUFBQSwyQkFBQSxDQUE0QixJQUE1QixFQUFrQyxJQUFsQyxFQUF3QyxhQUF4QyxFQUF1RCxJQUFDLENBQUEsS0FBeEQ7O01BQ1osSUFBQyxDQUFBLGNBQWU7O3lEQUNoQixJQUFDLENBQUEsaUJBQWtCO0VBSGI7O21DQUtSLFNBQUEsR0FBVyxTQUFDLE9BQUQ7QUFDVCxRQUFBO0FBQUEsU0FBQSxjQUFBOzs7TUFDRSxJQUFDLENBQUEsS0FBTSxDQUFBLEdBQUEsQ0FBUCxHQUFjO0FBRGhCO1dBRUEsSUFBQyxDQUFBLE1BQUQsQ0FBUSxjQUFSO0VBSFM7O21DQUtYLFdBQUEsR0FBYSxTQUFBO1dBQ1gsSUFBQyxDQUFBLFNBQUQsQ0FDRTtNQUFBLE9BQUEsRUFBUyxJQUFUO01BQ0EsUUFBQSxFQUFVLElBRFY7TUFFQSxLQUFBLEVBQU8sS0FGUDtNQUdBLE1BQUEsRUFBUSxJQUhSO01BSUEsS0FBQSxFQUFPLEtBSlA7S0FERjtFQURXOzs7Ozs7QUFRZixNQUFNLENBQUMsT0FBUCxHQUNFO0VBQUEsMkJBQUEsRUFBNkIsMkJBQTdCO0VBQ0Esc0JBQUEsRUFBd0Isc0JBRHhCOzs7Ozs7QUMxTUYsSUFBQSx5T0FBQTtFQUFBOzs7QUFBQSxNQUFzQixLQUFLLENBQUMsR0FBNUIsRUFBQyxVQUFBLEdBQUQsRUFBTSxhQUFBLE1BQU4sRUFBYyxXQUFBOztBQUVkLGFBQUEsR0FBZ0I7O0FBQ2hCLFlBQUEsR0FBc0IsYUFBRCxHQUFlOztBQUNwQyxhQUFBLEdBQXNCLGFBQUQsR0FBZTs7QUFDcEMsT0FBQSxHQUFzQixhQUFELEdBQWU7O0FBQ3BDLGVBQUEsR0FBMEIsYUFBRCxHQUFlOztBQUN4QyxlQUFBLEdBQTBCLGFBQUQsR0FBZTs7QUFDeEMsaUJBQUEsR0FBMEIsYUFBRCxHQUFlOztBQUV4QyxFQUFBLEdBQUssT0FBQSxDQUFRLG9CQUFSOztBQUNMLFFBQUEsR0FBVyxPQUFBLENBQVEsb0JBQVI7O0FBRVgsaUJBQUEsR0FBb0IsQ0FBQyxPQUFBLENBQVEsc0JBQVIsQ0FBRCxDQUFnQyxDQUFDOztBQUNyRCxhQUFBLEdBQWdCLENBQUMsT0FBQSxDQUFRLHNCQUFSLENBQUQsQ0FBZ0MsQ0FBQzs7QUFFakQsZ0NBQUEsR0FBbUMsS0FBSyxDQUFDLGFBQU4sQ0FBb0IsS0FBSyxDQUFDLFdBQU4sQ0FDckQ7RUFBQSxXQUFBLEVBQWEsa0NBQWI7RUFFQSxlQUFBLEVBQWlCLFNBQUE7V0FDZjtNQUFBLGlCQUFBLEVBQW1CLEtBQW5COztFQURlLENBRmpCO0VBS0Esa0JBQUEsRUFBb0IsU0FBQTtXQUNsQixJQUFDLENBQUEsS0FBSyxDQUFDLFFBQVEsQ0FBQyxpQkFBaEIsQ0FBa0MsQ0FBQSxTQUFBLEtBQUE7YUFBQSxTQUFBO2VBQ2hDLEtBQUMsQ0FBQSxRQUFELENBQVU7VUFBQSxpQkFBQSxFQUFtQixJQUFuQjtTQUFWO01BRGdDO0lBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFsQztFQURrQixDQUxwQjtFQVNBLFlBQUEsRUFBYyxTQUFBO1dBQ1osSUFBQyxDQUFBLEtBQUssQ0FBQyxRQUFRLENBQUMsU0FBaEIsQ0FBQTtFQURZLENBVGQ7RUFZQSxNQUFBLEVBQVEsU0FBQTtXQUNMLEdBQUEsQ0FBSSxFQUFKLEVBQ0ksSUFBQyxDQUFBLEtBQUssQ0FBQyxpQkFBVixHQUNHLE1BQUEsQ0FBTztNQUFDLE9BQUEsRUFBUyxJQUFDLENBQUEsWUFBWDtLQUFQLEVBQWlDLHNCQUFqQyxDQURILEdBR0UsMENBSkg7RUFESyxDQVpSO0NBRHFELENBQXBCOztBQXFCN0I7OztFQUVTLCtCQUFDLE9BQUQ7SUFBQyxJQUFDLENBQUEsNEJBQUQsVUFBVztJQUN2Qix1REFDRTtNQUFBLElBQUEsRUFBTSxxQkFBcUIsQ0FBQyxJQUE1QjtNQUNBLFdBQUEsRUFBYSxJQUFDLENBQUEsT0FBTyxDQUFDLFdBQVQsSUFBd0IsQ0FBQyxFQUFBLENBQUcsMEJBQUgsQ0FBRCxDQURyQztNQUVBLFlBQUEsRUFDRTtRQUFBLElBQUEsRUFBTSxJQUFOO1FBQ0EsSUFBQSxFQUFNLElBRE47UUFFQSxJQUFBLEVBQU0sSUFGTjtRQUdBLE1BQUEsRUFBUSxJQUhSO1FBSUEsTUFBQSxFQUFRLElBSlI7T0FIRjtLQURGO0lBVUEsSUFBQyxDQUFBLElBQUQsR0FBUTtFQVhHOztFQWFiLHFCQUFDLENBQUEsSUFBRCxHQUFPOztrQ0FFUCxVQUFBLEdBQVksU0FBQyxZQUFEO0lBQUMsSUFBQyxDQUFBLGVBQUQ7SUFDWCxJQUFHLElBQUMsQ0FBQSxZQUFKO01BQ0UsSUFBRyxJQUFDLENBQUEsSUFBSjtlQUNFLElBQUMsQ0FBQSxZQUFELENBQWMsSUFBZCxFQURGO09BQUEsTUFBQTtlQUdFLElBQUMsQ0FBQSxXQUFELENBQUEsRUFIRjtPQURGO0tBQUEsTUFBQTthQU1FLElBQUMsQ0FBQSxJQUFELEtBQVcsS0FOYjs7RUFEVTs7a0NBU1osU0FBQSxHQUFXLFNBQUE7V0FDVCxJQUFDLENBQUEsZ0JBQUQsQ0FBQTtFQURTOztrQ0FHWCxpQkFBQSxHQUFtQixTQUFDLHNCQUFEO0lBQUMsSUFBQyxDQUFBLHlCQUFEO0lBQ2xCLElBQUcsSUFBQyxDQUFBLGVBQUo7YUFDRSxJQUFDLENBQUEsc0JBQUQsQ0FBQSxFQURGOztFQURpQjs7a0NBSW5CLGdCQUFBLEdBQWtCLFNBQUMsSUFBRDtBQUNoQixRQUFBO0lBRGlCLElBQUMsQ0FBQSxPQUFEOztVQUNKLENBQUUsS0FBZixDQUFBOztXQUNBLElBQUMsQ0FBQSxZQUFELENBQWMsSUFBZDtFQUZnQjs7a0NBSWxCLFdBQUEsR0FBYSxTQUFBO0FBQ1gsUUFBQTtJQUFBLFFBQUEsR0FBVztXQUNYLENBQUMsQ0FBQyxJQUFGLENBQ0U7TUFBQSxRQUFBLEVBQVUsTUFBVjtNQUNBLEdBQUEsRUFBSyxhQURMO01BRUEsU0FBQSxFQUNFO1FBQUEsZUFBQSxFQUFpQixJQUFqQjtPQUhGO01BSUEsT0FBQSxFQUFTLFNBQUMsSUFBRDtRQUNQLFFBQVEsQ0FBQyxzQkFBVCxDQUFBO2VBQ0EsUUFBUSxDQUFDLGdCQUFULENBQTBCLElBQTFCO01BRk8sQ0FKVDtNQU9BLEtBQUEsRUFBTyxTQUFBO2VBQ0wsUUFBUSxDQUFDLHNCQUFULENBQUE7TUFESyxDQVBQO0tBREY7RUFGVzs7a0NBYWIsWUFBQSxHQUFjOztrQ0FFZCxnQkFBQSxHQUFrQixTQUFBO0FBQ2hCLFFBQUE7SUFBQSxJQUFHLElBQUMsQ0FBQSxZQUFELElBQWtCLENBQUksSUFBQyxDQUFBLFlBQVksQ0FBQyxNQUF2QzthQUNFLElBQUMsQ0FBQSxZQUFZLENBQUMsS0FBZCxDQUFBLEVBREY7S0FBQSxNQUFBO01BSUUscUJBQUEsR0FBd0IsU0FBQyxDQUFELEVBQUksQ0FBSjtBQUN0QixZQUFBO1FBQUEsVUFBQSxHQUFhLE1BQU0sQ0FBQyxVQUFQLElBQXFCLE1BQU0sQ0FBQztRQUN6QyxTQUFBLEdBQWEsTUFBTSxDQUFDLFNBQVAsSUFBcUIsTUFBTSxDQUFDO1FBQ3pDLEtBQUEsR0FBUyxNQUFNLENBQUMsVUFBUCxJQUFzQixRQUFRLENBQUMsZUFBZSxDQUFDLFdBQS9DLElBQStELE1BQU0sQ0FBQztRQUMvRSxNQUFBLEdBQVMsTUFBTSxDQUFDLFdBQVAsSUFBc0IsUUFBUSxDQUFDLGVBQWUsQ0FBQyxZQUEvQyxJQUErRCxNQUFNLENBQUM7UUFFL0UsSUFBQSxHQUFPLENBQUMsQ0FBQyxLQUFBLEdBQVEsQ0FBVCxDQUFBLEdBQWMsQ0FBQyxDQUFBLEdBQUksQ0FBTCxDQUFmLENBQUEsR0FBMEI7UUFDakMsR0FBQSxHQUFNLENBQUMsQ0FBQyxNQUFBLEdBQVMsQ0FBVixDQUFBLEdBQWUsQ0FBQyxDQUFBLEdBQUksQ0FBTCxDQUFoQixDQUFBLEdBQTJCO0FBQ2pDLGVBQU87VUFBQyxNQUFBLElBQUQ7VUFBTyxLQUFBLEdBQVA7O01BUmU7TUFVeEIsS0FBQSxHQUFRO01BQ1IsTUFBQSxHQUFTO01BQ1QsUUFBQSxHQUFXLHFCQUFBLENBQXNCLEtBQXRCLEVBQTZCLE1BQTdCO01BQ1gsY0FBQSxHQUFpQixDQUNmLFFBQUEsR0FBVyxLQURJLEVBRWYsU0FBQSxHQUFZLE1BRkcsRUFHZixNQUFBLEdBQVMsUUFBUSxDQUFDLEdBQWxCLElBQXlCLEdBSFYsRUFJZixPQUFBLEdBQVUsUUFBUSxDQUFDLElBQW5CLElBQTJCLEdBSlosRUFLZixlQUxlLEVBTWYsY0FOZSxFQU9mLGFBUGUsRUFRZixZQVJlLEVBU2YsWUFUZTtNQVlqQixJQUFDLENBQUEsWUFBRCxHQUFnQixNQUFNLENBQUMsSUFBUCxDQUFZLFlBQVosRUFBMEIsTUFBMUIsRUFBa0MsY0FBYyxDQUFDLElBQWYsQ0FBQSxDQUFsQztNQUVoQixVQUFBLEdBQWEsQ0FBQSxTQUFBLEtBQUE7ZUFBQSxTQUFBO0FBQ1gsY0FBQTtBQUFBO1lBQ0UsSUFBQSxHQUFPLEtBQUMsQ0FBQSxZQUFZLENBQUMsUUFBUSxDQUFDO1lBQzlCLElBQUksSUFBQSxLQUFRLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBNUI7Y0FDRSxhQUFBLENBQWMsSUFBZDtjQUNBLEtBQUMsQ0FBQSxZQUFZLENBQUMsS0FBZCxDQUFBO3FCQUNBLEtBQUMsQ0FBQSxXQUFELENBQUEsRUFIRjthQUZGO1dBQUEsYUFBQTtZQU1NLFVBTk47O1FBRFc7TUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBO2FBVWIsSUFBQSxHQUFPLFdBQUEsQ0FBWSxVQUFaLEVBQXdCLEdBQXhCLEVBekNUOztFQURnQjs7a0NBNENsQix5QkFBQSxHQUEyQixTQUFBO1dBQ3hCLGdDQUFBLENBQWlDO01BQUMsUUFBQSxFQUFVLElBQVg7TUFBYyxZQUFBLEVBQWMsSUFBQyxDQUFBLFlBQTdCO0tBQWpDO0VBRHdCOztrQ0FHM0IsVUFBQSxHQUFZLFNBQUE7SUFDVixJQUFHLElBQUMsQ0FBQSxJQUFKO2FBQ0csSUFBQSxDQUFLLEVBQUwsRUFBVSxJQUFBLENBQUs7UUFBQyxTQUFBLEVBQVcscUJBQVo7T0FBTCxDQUFWLEVBQW9ELElBQUMsQ0FBQSxJQUFJLENBQUMsSUFBMUQsRUFESDtLQUFBLE1BQUE7YUFHRSxLQUhGOztFQURVOztrQ0FNWixJQUFBLEdBQU0sU0FBQyxRQUFELEVBQVcsUUFBWDtXQUNKLENBQUMsQ0FBQyxJQUFGLENBQ0U7TUFBQSxRQUFBLEVBQVUsTUFBVjtNQUNBLEdBQUEsRUFBSyxPQURMO01BRUEsT0FBQSxFQUFTLElBRlQ7TUFHQSxTQUFBLEVBQ0U7UUFBQSxlQUFBLEVBQWlCLElBQWpCO09BSkY7TUFLQSxPQUFBLEVBQVMsU0FBQyxJQUFEO0FBQ1AsWUFBQTtRQUFBLElBQUEsR0FBTztBQUNQLGFBQUEsV0FBQTs7O1VBQ0UsSUFBSSxDQUFDLElBQUwsQ0FBYyxJQUFBLGFBQUEsQ0FDWjtZQUFBLElBQUEsRUFBTSxJQUFJLENBQUMsSUFBWDtZQUNBLFlBQUEsRUFBYztjQUFDLEVBQUEsRUFBSSxJQUFJLENBQUMsRUFBVjthQURkO1lBRUEsSUFBQSxFQUFNLGFBQWEsQ0FBQyxJQUZwQjtZQUdBLFFBQUEsRUFBVSxJQUhWO1dBRFksQ0FBZDtBQURGO2VBTUEsUUFBQSxDQUFTLElBQVQsRUFBZSxJQUFmO01BUk8sQ0FMVDtNQWNBLEtBQUEsRUFBTyxTQUFBO2VBQ0wsUUFBQSxDQUFTLElBQVQsRUFBZSxFQUFmO01BREssQ0FkUDtLQURGO0VBREk7O2tDQW1CTixJQUFBLEdBQU0sU0FBQyxRQUFELEVBQVcsUUFBWDtXQUNKLENBQUMsQ0FBQyxJQUFGLENBQ0U7TUFBQSxRQUFBLEVBQVUsTUFBVjtNQUNBLEdBQUEsRUFBSyxlQURMO01BRUEsSUFBQSxFQUNFO1FBQUEsUUFBQSxFQUFVLFFBQVEsQ0FBQyxZQUFZLENBQUMsRUFBaEM7T0FIRjtNQUlBLE9BQUEsRUFBUyxJQUpUO01BS0EsU0FBQSxFQUNFO1FBQUEsZUFBQSxFQUFpQixJQUFqQjtPQU5GO01BT0EsT0FBQSxFQUFTLFNBQUMsSUFBRDtlQUNQLFFBQUEsQ0FBUyxJQUFULEVBQWUsSUFBZjtNQURPLENBUFQ7TUFTQSxLQUFBLEVBQU8sU0FBQTtlQUNMLFFBQUEsQ0FBUyxpQkFBQSxHQUFrQixRQUFRLENBQUMsSUFBcEM7TUFESyxDQVRQO0tBREY7RUFESTs7a0NBY04sSUFBQSxHQUFNLFNBQUMsT0FBRCxFQUFVLFFBQVYsRUFBb0IsUUFBcEI7QUFDSixRQUFBO0lBQUEsT0FBQSxHQUFVLElBQUMsQ0FBQSxnQkFBRCxDQUFrQixPQUFsQjtJQUVWLE1BQUEsR0FBUztJQUNULElBQUcsUUFBUSxDQUFDLFlBQVksQ0FBQyxFQUF6QjtNQUFpQyxNQUFNLENBQUMsUUFBUCxHQUFrQixRQUFRLENBQUMsWUFBWSxDQUFDLEdBQXpFOztJQUNBLElBQUcsUUFBUSxDQUFDLElBQVo7TUFBc0IsTUFBTSxDQUFDLFVBQVAsR0FBb0IsUUFBUSxDQUFDLEtBQW5EOztJQUVBLEdBQUEsR0FBTSxJQUFDLENBQUEsVUFBRCxDQUFZLGVBQVosRUFBNkIsTUFBN0I7V0FFTixDQUFDLENBQUMsSUFBRixDQUNFO01BQUEsUUFBQSxFQUFVLE1BQVY7TUFDQSxNQUFBLEVBQVEsTUFEUjtNQUVBLEdBQUEsRUFBSyxHQUZMO01BR0EsSUFBQSxFQUFNLE9BSE47TUFJQSxPQUFBLEVBQVMsSUFKVDtNQUtBLFNBQUEsRUFDRTtRQUFBLGVBQUEsRUFBaUIsSUFBakI7T0FORjtNQU9BLE9BQUEsRUFBUyxTQUFDLElBQUQ7UUFDUCxJQUFHLElBQUksQ0FBQyxFQUFSO1VBQWdCLFFBQVEsQ0FBQyxZQUFZLENBQUMsRUFBdEIsR0FBMkIsSUFBSSxDQUFDLEdBQWhEOztlQUNBLFFBQUEsQ0FBUyxJQUFULEVBQWUsSUFBZjtNQUZPLENBUFQ7TUFVQSxLQUFBLEVBQU8sU0FBQTtlQUNMLFFBQUEsQ0FBUyxpQkFBQSxHQUFrQixRQUFRLENBQUMsSUFBcEM7TUFESyxDQVZQO0tBREY7RUFUSTs7a0NBdUJOLE1BQUEsR0FBUSxTQUFDLFFBQUQsRUFBVyxRQUFYO1dBQ04sQ0FBQyxDQUFDLElBQUYsQ0FDRTtNQUFBLEdBQUEsRUFBSyxpQkFBTDtNQUNBLElBQUEsRUFDRTtRQUFBLFVBQUEsRUFBWSxRQUFRLENBQUMsSUFBckI7T0FGRjtNQUdBLE9BQUEsRUFBUyxJQUhUO01BSUEsU0FBQSxFQUNFO1FBQUEsZUFBQSxFQUFpQixJQUFqQjtPQUxGO01BTUEsT0FBQSxFQUFTLFNBQUMsSUFBRDtlQUNQLFFBQUEsQ0FBUyxJQUFULEVBQWUsSUFBZjtNQURPLENBTlQ7TUFRQSxLQUFBLEVBQU8sU0FBQTtlQUNMLFFBQUEsQ0FBUyxpQkFBQSxHQUFrQixRQUFRLENBQUMsSUFBcEM7TUFESyxDQVJQO0tBREY7RUFETTs7a0NBYVIsVUFBQSxHQUFZLFNBQUMsR0FBRCxFQUFNLE1BQU47QUFDVixRQUFBO0lBQUEsSUFBQSxDQUFrQixNQUFsQjtBQUFBLGFBQU8sSUFBUDs7SUFDQSxHQUFBLEdBQU07QUFDTixTQUFBLGFBQUE7O01BQ0UsR0FBRyxDQUFDLElBQUosQ0FBUyxDQUFDLEdBQUQsRUFBTSxLQUFOLENBQVksQ0FBQyxHQUFiLENBQWlCLFNBQWpCLENBQTJCLENBQUMsSUFBNUIsQ0FBaUMsR0FBakMsQ0FBVDtBQURGO0FBRUEsV0FBTyxHQUFBLEdBQU0sR0FBTixHQUFZLEdBQUcsQ0FBQyxJQUFKLENBQVMsR0FBVDtFQUxUOztrQ0FTWixnQkFBQSxHQUFrQixTQUFDLE9BQUQ7QUFDaEIsUUFBQTtJQUFBLElBQUcsT0FBTyxPQUFQLEtBQW9CLFFBQXZCO0FBQ0U7UUFDRSxPQUFBLEdBQVUsSUFBSSxDQUFDLEtBQUwsQ0FBVyxPQUFYLEVBRFo7T0FBQSxhQUFBO1FBR0UsT0FBQSxHQUFVO1VBQUMsT0FBQSxFQUFTLE9BQVY7VUFIWjtPQURGOzs7TUFLQSxPQUFPLENBQUMsVUFBZSxJQUFDLENBQUEsT0FBTyxDQUFDOzs7TUFDaEMsT0FBTyxDQUFDLGFBQWUsSUFBQyxDQUFBLE9BQU8sQ0FBQzs7O01BQ2hDLE9BQU8sQ0FBQyxjQUFlLElBQUMsQ0FBQSxPQUFPLENBQUM7O0FBRWhDLFdBQU8sSUFBSSxDQUFDLFNBQUwsQ0FBZSxPQUFmO0VBVlM7Ozs7R0F2TGdCOztBQW9NcEMsTUFBTSxDQUFDLE9BQVAsR0FBaUI7Ozs7O0FDek9qQixJQUFBLDJIQUFBO0VBQUE7OztBQUFBLE1BQXNCLEtBQUssQ0FBQyxHQUE1QixFQUFDLFVBQUEsR0FBRCxFQUFNLGFBQUEsTUFBTixFQUFjLFdBQUE7O0FBRWQsRUFBQSxHQUFLLE9BQUEsQ0FBUSxvQkFBUjs7QUFDTCxRQUFBLEdBQVcsT0FBQSxDQUFRLG9CQUFSOztBQUVYLGlCQUFBLEdBQW9CLENBQUMsT0FBQSxDQUFRLHNCQUFSLENBQUQsQ0FBZ0MsQ0FBQzs7QUFDckQsYUFBQSxHQUFnQixDQUFDLE9BQUEsQ0FBUSxzQkFBUixDQUFELENBQWdDLENBQUM7O0FBRWpELDhCQUFBLEdBQWlDLEtBQUssQ0FBQyxhQUFOLENBQW9CLEtBQUssQ0FBQyxXQUFOLENBQ25EO0VBQUEsV0FBQSxFQUFhLGdDQUFiO0VBRUEsZUFBQSxFQUFpQixTQUFBO1dBQ2Y7TUFBQSxVQUFBLEVBQVksS0FBWjs7RUFEZSxDQUZqQjtFQUtBLGtCQUFBLEVBQW9CLFNBQUE7V0FDbEIsSUFBQyxDQUFBLEtBQUssQ0FBQyxRQUFRLENBQUMsV0FBaEIsQ0FBNEIsQ0FBQSxTQUFBLEtBQUE7YUFBQSxTQUFBO2VBQzFCLEtBQUMsQ0FBQSxRQUFELENBQVU7VUFBQSxVQUFBLEVBQVksSUFBWjtTQUFWO01BRDBCO0lBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUE1QjtFQURrQixDQUxwQjtFQVNBLFlBQUEsRUFBYyxTQUFBO1dBQ1osSUFBQyxDQUFBLEtBQUssQ0FBQyxRQUFRLENBQUMsU0FBaEIsQ0FBMEIsbUJBQW1CLENBQUMsVUFBOUM7RUFEWSxDQVRkO0VBWUEsTUFBQSxFQUFRLFNBQUE7V0FDTCxHQUFBLENBQUksRUFBSixFQUNJLElBQUMsQ0FBQSxLQUFLLENBQUMsVUFBVixHQUNHLE1BQUEsQ0FBTztNQUFDLE9BQUEsRUFBUyxJQUFDLENBQUEsWUFBWDtLQUFQLEVBQWlDLHNCQUFqQyxDQURILEdBR0UsOENBSkg7RUFESyxDQVpSO0NBRG1ELENBQXBCOztBQXFCM0I7OztFQUVTLDZCQUFDLE9BQUQ7SUFBQyxJQUFDLENBQUEsNEJBQUQsVUFBVztJQUN2QixxREFDRTtNQUFBLElBQUEsRUFBTSxtQkFBbUIsQ0FBQyxJQUExQjtNQUNBLFdBQUEsRUFBYSxJQUFDLENBQUEsT0FBTyxDQUFDLFdBQVQsSUFBd0IsQ0FBQyxFQUFBLENBQUcsd0JBQUgsQ0FBRCxDQURyQztNQUVBLFlBQUEsRUFDRTtRQUFBLElBQUEsRUFBTSxJQUFOO1FBQ0EsSUFBQSxFQUFNLElBRE47UUFFQSxJQUFBLEVBQU0sSUFGTjtRQUdBLE1BQUEsRUFBUSxJQUhSO1FBSUEsTUFBQSxFQUFRLElBSlI7T0FIRjtLQURGO0lBVUEsSUFBQyxDQUFBLFNBQUQsR0FBYTtJQUNiLElBQUMsQ0FBQSxJQUFELEdBQVE7SUFDUixJQUFDLENBQUEsUUFBRCxHQUFZLElBQUMsQ0FBQSxPQUFPLENBQUM7SUFDckIsSUFBRyxDQUFJLElBQUMsQ0FBQSxRQUFSO0FBQ0UsWUFBVSxJQUFBLEtBQUEsQ0FBTSwyREFBTixFQURaOztJQUVBLElBQUMsQ0FBQSxRQUFELEdBQVksSUFBQyxDQUFBLE9BQU8sQ0FBQyxRQUFULElBQXFCO0lBQ2pDLElBQUMsQ0FBQSxTQUFELENBQUE7RUFqQlc7O0VBbUJiLG1CQUFDLENBQUEsSUFBRCxHQUFPOztFQUdQLG1CQUFDLENBQUEsU0FBRCxHQUFhOztFQUNiLG1CQUFDLENBQUEsVUFBRCxHQUFjOztnQ0FFZCxVQUFBLEdBQVksU0FBQyxZQUFEO0lBQUMsSUFBQyxDQUFBLGVBQUQ7SUFDWCxJQUFHLElBQUMsQ0FBQSxZQUFKO01BQ0UsSUFBRyxJQUFDLENBQUEsU0FBSjtlQUNFLElBQUMsQ0FBQSxZQUFELENBQWMsSUFBZCxFQURGO09BQUEsTUFBQTtlQUdFLElBQUMsQ0FBQSxTQUFELENBQVcsbUJBQW1CLENBQUMsU0FBL0IsRUFIRjtPQURGO0tBQUEsTUFBQTthQU1FLElBQUMsQ0FBQSxTQUFELEtBQWdCLEtBTmxCOztFQURVOztnQ0FTWixTQUFBLEdBQVcsU0FBQyxTQUFEO1dBQ1QsSUFBQyxDQUFBLFdBQUQsQ0FBYSxDQUFBLFNBQUEsS0FBQTthQUFBLFNBQUE7QUFDWCxZQUFBO1FBQUEsSUFBQSxHQUNFO1VBQUEsU0FBQSxFQUFXLEtBQUMsQ0FBQSxRQUFaO1VBQ0EsS0FBQSxFQUFPLENBQUMsdUNBQUQsRUFBMEMsa0RBQTFDLENBRFA7VUFFQSxTQUFBLEVBQVcsU0FGWDs7ZUFHRixJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVYsQ0FBb0IsSUFBcEIsRUFBMEIsU0FBQyxTQUFEO1VBQ3hCLEtBQUMsQ0FBQSxTQUFELEdBQWdCLFNBQUEsSUFBYyxDQUFJLFNBQVMsQ0FBQyxLQUEvQixHQUEwQyxTQUExQyxHQUF5RDtVQUN0RSxLQUFDLENBQUEsSUFBRCxHQUFRO1VBQ1IsSUFBRyxLQUFDLENBQUEsU0FBSjtZQUNFLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxHQUE1QixDQUFBLENBQWlDLENBQUMsT0FBbEMsQ0FBMEMsU0FBQyxJQUFEO3FCQUN4QyxLQUFDLENBQUEsSUFBRCxHQUFRO1lBRGdDLENBQTFDLEVBREY7O2lCQUdBLEtBQUMsQ0FBQSxZQUFELENBQWMsS0FBQyxDQUFBLFNBQUQsS0FBZ0IsSUFBOUI7UUFOd0IsQ0FBMUI7TUFMVztJQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBYjtFQURTOztnQ0FjWCx5QkFBQSxHQUEyQixTQUFBO1dBQ3hCLDhCQUFBLENBQStCO01BQUMsUUFBQSxFQUFVLElBQVg7S0FBL0I7RUFEd0I7O2dDQUczQixVQUFBLEdBQVksU0FBQTtJQUNWLElBQUcsSUFBQyxDQUFBLElBQUo7YUFDRyxJQUFBLENBQUssRUFBTCxFQUFVLElBQUEsQ0FBSztRQUFDLFNBQUEsRUFBVyxhQUFaO09BQUwsQ0FBVixFQUE0QyxJQUFDLENBQUEsSUFBSSxDQUFDLElBQWxELEVBREg7S0FBQSxNQUFBO2FBR0UsS0FIRjs7RUFEVTs7Z0NBTVosSUFBQSxHQUFPLFNBQUMsT0FBRCxFQUFVLFFBQVYsRUFBb0IsUUFBcEI7V0FDTCxJQUFDLENBQUEsV0FBRCxDQUFhLENBQUEsU0FBQSxLQUFBO2FBQUEsU0FBQTtlQUNYLEtBQUMsQ0FBQSxTQUFELENBQVcsT0FBWCxFQUFvQixRQUFwQixFQUE4QixRQUE5QjtNQURXO0lBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFiO0VBREs7O2dDQUlQLElBQUEsR0FBTSxTQUFDLFFBQUQsRUFBVyxRQUFYO1dBQ0osSUFBQyxDQUFBLFdBQUQsQ0FBYSxDQUFBLFNBQUEsS0FBQTthQUFBLFNBQUE7QUFDWCxZQUFBO1FBQUEsT0FBQSxHQUFVLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUF4QixDQUNSO1VBQUEsTUFBQSxFQUFRLFFBQVEsQ0FBQyxZQUFZLENBQUMsRUFBOUI7U0FEUTtlQUVWLE9BQU8sQ0FBQyxPQUFSLENBQWdCLFNBQUMsSUFBRDtVQUNkLG1CQUFHLElBQUksQ0FBRSxvQkFBVDttQkFDRSxLQUFDLENBQUEsZ0JBQUQsQ0FBa0IsSUFBSSxDQUFDLFdBQXZCLEVBQW9DLEtBQUMsQ0FBQSxTQUFyQyxFQUFnRCxRQUFoRCxFQURGO1dBQUEsTUFBQTttQkFHRSxRQUFBLENBQVMsNEJBQVQsRUFIRjs7UUFEYyxDQUFoQjtNQUhXO0lBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFiO0VBREk7O2dDQVVOLElBQUEsR0FBTSxTQUFDLFFBQUQsRUFBVyxRQUFYO1dBQ0osSUFBQyxDQUFBLFdBQUQsQ0FBYSxDQUFBLFNBQUEsS0FBQTthQUFBLFNBQUE7QUFDWCxZQUFBO1FBQUEsT0FBQSxHQUFVLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUF4QixDQUNSO1VBQUEsQ0FBQSxFQUFHLGNBQUEsR0FBZSxLQUFDLENBQUEsUUFBaEIsR0FBeUIsR0FBNUI7U0FEUTtlQUVWLE9BQU8sQ0FBQyxPQUFSLENBQWdCLFNBQUMsTUFBRDtBQUNkLGNBQUE7VUFBQSxJQUEyQyxDQUFJLE1BQS9DO0FBQUEsbUJBQU8sUUFBQSxDQUFTLHNCQUFULEVBQVA7O1VBQ0EsSUFBQSxHQUFPO0FBQ1A7QUFBQSxlQUFBLHNDQUFBOztZQUVFLElBQUcsSUFBSSxDQUFDLFFBQUwsS0FBbUIsb0NBQXRCO2NBQ0UsSUFBSSxDQUFDLElBQUwsQ0FBYyxJQUFBLGFBQUEsQ0FDWjtnQkFBQSxJQUFBLEVBQU0sSUFBSSxDQUFDLEtBQVg7Z0JBQ0EsSUFBQSxFQUFNLEVBRE47Z0JBRUEsSUFBQSxFQUFTLElBQUksQ0FBQyxRQUFMLEtBQWlCLG9DQUFwQixHQUE4RCxhQUFhLENBQUMsTUFBNUUsR0FBd0YsYUFBYSxDQUFDLElBRjVHO2dCQUdBLFFBQUEsRUFBVSxLQUhWO2dCQUlBLFlBQUEsRUFDRTtrQkFBQSxFQUFBLEVBQUksSUFBSSxDQUFDLEVBQVQ7aUJBTEY7ZUFEWSxDQUFkLEVBREY7O0FBRkY7VUFVQSxJQUFJLENBQUMsSUFBTCxDQUFVLFNBQUMsQ0FBRCxFQUFJLENBQUo7QUFDUixnQkFBQTtZQUFBLE1BQUEsR0FBUyxDQUFDLENBQUMsSUFBSSxDQUFDLFdBQVAsQ0FBQTtZQUNULE1BQUEsR0FBUyxDQUFDLENBQUMsSUFBSSxDQUFDLFdBQVAsQ0FBQTtZQUNULElBQWEsTUFBQSxHQUFTLE1BQXRCO0FBQUEscUJBQU8sQ0FBQyxFQUFSOztZQUNBLElBQVksTUFBQSxHQUFTLE1BQXJCO0FBQUEscUJBQU8sRUFBUDs7QUFDQSxtQkFBTztVQUxDLENBQVY7aUJBTUEsUUFBQSxDQUFTLElBQVQsRUFBZSxJQUFmO1FBbkJjLENBQWhCO01BSFc7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQWI7RUFESTs7Z0NBeUJOLE1BQUEsR0FBUSxTQUFDLFFBQUQsRUFBVyxRQUFYO1dBQ04sSUFBQyxDQUFBLFdBQUQsQ0FBYSxTQUFBO0FBQ1gsVUFBQTtNQUFBLE9BQUEsR0FBVSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsUUFBRCxDQUF2QixDQUNSO1FBQUEsTUFBQSxFQUFRLFFBQVEsQ0FBQyxZQUFZLENBQUMsRUFBOUI7T0FEUTthQUVWLE9BQU8sQ0FBQyxPQUFSLENBQWdCLFNBQUMsTUFBRDtnREFDZCwyQkFBVSxNQUFNLENBQUUsZUFBUixJQUFpQjtNQURiLENBQWhCO0lBSFcsQ0FBYjtFQURNOztnQ0FPUixTQUFBLEdBQVcsU0FBQTtBQUNULFFBQUE7SUFBQSxJQUFHLENBQUksTUFBTSxDQUFDLFlBQWQ7TUFDRSxNQUFNLENBQUMsWUFBUCxHQUFzQjtNQUN0QixNQUFNLENBQUMsV0FBUCxHQUFxQixTQUFBO2VBQ25CLElBQUMsQ0FBQSxNQUFNLENBQUMsV0FBUixHQUFzQjtNQURIO01BRXJCLE1BQUEsR0FBUyxRQUFRLENBQUMsYUFBVCxDQUF1QixRQUF2QjtNQUNULE1BQU0sQ0FBQyxHQUFQLEdBQWE7YUFDYixRQUFRLENBQUMsSUFBSSxDQUFDLFdBQWQsQ0FBMEIsTUFBMUIsRUFORjs7RUFEUzs7Z0NBU1gsV0FBQSxHQUFhLFNBQUMsUUFBRDtBQUNYLFFBQUE7SUFBQSxJQUFBLEdBQU87SUFDUCxLQUFBLEdBQVEsU0FBQTtNQUNOLElBQUcsTUFBTSxDQUFDLFdBQVY7ZUFDRSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQVosQ0FBaUIsT0FBakIsRUFBMEIsSUFBMUIsRUFBZ0MsU0FBQTtpQkFDOUIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFaLENBQWlCLFFBQWpCLEVBQTJCLElBQTNCLEVBQWlDLFNBQUE7bUJBQy9CLFFBQVEsQ0FBQyxJQUFULENBQWMsSUFBZDtVQUQrQixDQUFqQztRQUQ4QixDQUFoQyxFQURGO09BQUEsTUFBQTtlQUtFLFVBQUEsQ0FBVyxLQUFYLEVBQWtCLEVBQWxCLEVBTEY7O0lBRE07V0FPUixVQUFBLENBQVcsS0FBWCxFQUFrQixFQUFsQjtFQVRXOztnQ0FXYixnQkFBQSxHQUFrQixTQUFDLEdBQUQsRUFBTSxLQUFOLEVBQWEsUUFBYjtBQUNoQixRQUFBO0lBQUEsR0FBQSxHQUFVLElBQUEsY0FBQSxDQUFBO0lBQ1YsR0FBRyxDQUFDLElBQUosQ0FBUyxLQUFULEVBQWdCLEdBQWhCO0lBQ0EsSUFBRyxLQUFIO01BQ0UsR0FBRyxDQUFDLGdCQUFKLENBQXFCLGVBQXJCLEVBQXNDLFNBQUEsR0FBVSxLQUFLLENBQUMsWUFBdEQsRUFERjs7SUFFQSxHQUFHLENBQUMsTUFBSixHQUFhLFNBQUE7YUFDWCxRQUFBLENBQVMsSUFBVCxFQUFlLEdBQUcsQ0FBQyxZQUFuQjtJQURXO0lBRWIsR0FBRyxDQUFDLE9BQUosR0FBYyxTQUFBO2FBQ1osUUFBQSxDQUFTLHFCQUFBLEdBQXNCLEdBQS9CO0lBRFk7V0FFZCxHQUFHLENBQUMsSUFBSixDQUFBO0VBVGdCOztnQ0FXbEIsU0FBQSxHQUFXLFNBQUMsT0FBRCxFQUFVLFFBQVYsRUFBb0IsUUFBcEI7QUFDVCxRQUFBO0lBQUEsUUFBQSxHQUFXO0lBQ1gsTUFBQSxHQUFTLElBQUksQ0FBQyxTQUFMLENBQ1A7TUFBQSxLQUFBLEVBQU8sUUFBUSxDQUFDLElBQWhCO01BQ0EsUUFBQSxFQUFVLElBQUMsQ0FBQSxRQURYO0tBRE87SUFJVCxxREFBeUMsQ0FBRSxZQUExQixHQUNmLENBQUMsS0FBRCxFQUFRLHlCQUFBLEdBQTBCLFFBQVEsQ0FBQyxZQUFZLENBQUMsRUFBeEQsQ0FEZSxHQUdmLENBQUMsTUFBRCxFQUFTLHdCQUFULENBSEYsRUFBQyxnQkFBRCxFQUFTO0lBS1QsSUFBQSxHQUFPLENBQ0wsUUFBQSxHQUFTLFFBQVQsR0FBa0IsNENBQWxCLEdBQThELE1BRHpELEVBRUwsUUFBQSxHQUFTLFFBQVQsR0FBa0Isb0JBQWxCLEdBQXNDLElBQUMsQ0FBQSxRQUF2QyxHQUFnRCxVQUFoRCxHQUEwRCxPQUZyRCxFQUdMLFFBQUEsR0FBUyxRQUFULEdBQWtCLElBSGIsQ0FJTixDQUFDLElBSkssQ0FJQSxFQUpBO0lBTVAsT0FBQSxHQUFVLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBWixDQUNSO01BQUEsSUFBQSxFQUFNLElBQU47TUFDQSxNQUFBLEVBQVEsTUFEUjtNQUVBLE1BQUEsRUFBUTtRQUFDLFVBQUEsRUFBWSxXQUFiO09BRlI7TUFHQSxPQUFBLEVBQVM7UUFBQyxjQUFBLEVBQWdCLCtCQUFBLEdBQWtDLFFBQWxDLEdBQTZDLEdBQTlEO09BSFQ7TUFJQSxJQUFBLEVBQU0sSUFKTjtLQURRO1dBT1YsT0FBTyxDQUFDLE9BQVIsQ0FBZ0IsU0FBQyxJQUFEO01BQ2QsSUFBRyxRQUFIO1FBQ0UsbUJBQUcsSUFBSSxDQUFFLGNBQVQ7aUJBQ0UsUUFBQSxDQUFTLDBCQUFBLEdBQTJCLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBL0MsRUFERjtTQUFBLE1BRUssSUFBRyxJQUFIO2lCQUNILFFBQUEsQ0FBUyxJQUFULEVBQWUsSUFBZixFQURHO1NBQUEsTUFBQTtpQkFHSCxRQUFBLENBQVMsd0JBQVQsRUFIRztTQUhQOztJQURjLENBQWhCO0VBeEJTOzs7O0dBeElxQjs7QUF5S2xDLE1BQU0sQ0FBQyxPQUFQLEdBQWlCOzs7OztBQ3RNakIsSUFBQSwwREFBQTtFQUFBOzs7O0FBQUEsRUFBQSxHQUFLLE9BQUEsQ0FBUSxvQkFBUjs7QUFFTCxpQkFBQSxHQUFvQixDQUFDLE9BQUEsQ0FBUSxzQkFBUixDQUFELENBQWdDLENBQUM7O0FBQ3JELGFBQUEsR0FBZ0IsQ0FBQyxPQUFBLENBQVEsc0JBQVIsQ0FBRCxDQUFnQyxDQUFDOztBQUUzQzs7O0VBRVMsOEJBQUMsT0FBRDtJQUFDLElBQUMsQ0FBQSw0QkFBRCxVQUFXO0lBQ3ZCLHNEQUNFO01BQUEsSUFBQSxFQUFNLG9CQUFvQixDQUFDLElBQTNCO01BQ0EsV0FBQSxFQUFhLElBQUMsQ0FBQSxPQUFPLENBQUMsV0FBVCxJQUF3QixDQUFDLEVBQUEsQ0FBRyx5QkFBSCxDQUFELENBRHJDO01BRUEsWUFBQSxFQUNFO1FBQUEsSUFBQSxFQUFNLElBQU47UUFDQSxJQUFBLEVBQU0sSUFETjtRQUVBLElBQUEsRUFBTSxJQUZOO1FBR0EsTUFBQSxFQUFRLElBSFI7UUFJQSxNQUFBLEVBQVEsSUFKUjtPQUhGO0tBREY7RUFEVzs7RUFXYixvQkFBQyxDQUFBLElBQUQsR0FBTzs7RUFDUCxvQkFBQyxDQUFBLFNBQUQsR0FBWSxTQUFBO0FBQ1YsUUFBQTtXQUFBLE1BQUE7O0FBQVM7UUFDUCxJQUFBLEdBQU87UUFDUCxNQUFNLENBQUMsWUFBWSxDQUFDLE9BQXBCLENBQTRCLElBQTVCLEVBQWtDLElBQWxDO1FBQ0EsTUFBTSxDQUFDLFlBQVksQ0FBQyxVQUFwQixDQUErQixJQUEvQjtlQUNBLEtBSk87T0FBQSxhQUFBO2VBTVAsTUFOTzs7O0VBREM7O2lDQVNaLElBQUEsR0FBTSxTQUFDLE9BQUQsRUFBVSxRQUFWLEVBQW9CLFFBQXBCO0FBQ0osUUFBQTtBQUFBO01BQ0UsTUFBTSxDQUFDLFlBQVksQ0FBQyxPQUFwQixDQUE0QixJQUFDLENBQUEsT0FBRCxDQUFTLFFBQVEsQ0FBQyxJQUFsQixDQUE1QixFQUFxRCxPQUFyRDs4Q0FDQSxTQUFVLGVBRlo7S0FBQSxhQUFBOzhDQUlFLFNBQVUsMkJBSlo7O0VBREk7O2lDQU9OLElBQUEsR0FBTSxTQUFDLFFBQUQsRUFBVyxRQUFYO0FBQ0osUUFBQTtBQUFBO01BQ0UsT0FBQSxHQUFVLE1BQU0sQ0FBQyxZQUFZLENBQUMsT0FBcEIsQ0FBNEIsSUFBQyxDQUFBLE9BQUQsQ0FBUyxRQUFRLENBQUMsSUFBbEIsQ0FBNUI7YUFDVixRQUFBLENBQVMsSUFBVCxFQUFlLE9BQWYsRUFGRjtLQUFBLGFBQUE7YUFJRSxRQUFBLENBQVMsZ0JBQVQsRUFKRjs7RUFESTs7aUNBT04sSUFBQSxHQUFNLFNBQUMsUUFBRCxFQUFXLFFBQVg7QUFDSixRQUFBO0lBQUEsSUFBQSxHQUFPO0lBQ1AsSUFBQSx1QkFBTyxRQUFRLENBQUUsY0FBVixJQUFrQjtJQUN6QixNQUFBLEdBQVMsSUFBQyxDQUFBLE9BQUQsQ0FBUyxJQUFUO0FBQ1Q7QUFBQSxTQUFBLFVBQUE7O01BQ0UsSUFBRyxHQUFHLENBQUMsTUFBSixDQUFXLENBQVgsRUFBYyxNQUFNLENBQUMsTUFBckIsQ0FBQSxLQUFnQyxNQUFuQztRQUNFLE9BQXVCLEdBQUcsQ0FBQyxNQUFKLENBQVcsTUFBTSxDQUFDLE1BQWxCLENBQXlCLENBQUMsS0FBMUIsQ0FBZ0MsR0FBaEMsQ0FBdkIsRUFBQyxjQUFELEVBQU87UUFDUCxJQUFJLENBQUMsSUFBTCxDQUFjLElBQUEsYUFBQSxDQUNaO1VBQUEsSUFBQSxFQUFNLEdBQUcsQ0FBQyxNQUFKLENBQVcsTUFBTSxDQUFDLE1BQWxCLENBQU47VUFDQSxJQUFBLEVBQVMsSUFBRCxHQUFNLEdBQU4sR0FBUyxJQURqQjtVQUVBLElBQUEsRUFBUyxTQUFTLENBQUMsTUFBVixHQUFtQixDQUF0QixHQUE2QixhQUFhLENBQUMsTUFBM0MsR0FBdUQsYUFBYSxDQUFDLElBRjNFO1VBR0EsUUFBQSxFQUFVLElBSFY7U0FEWSxDQUFkLEVBRkY7O0FBREY7V0FRQSxRQUFBLENBQVMsSUFBVCxFQUFlLElBQWY7RUFaSTs7aUNBY04sTUFBQSxHQUFRLFNBQUMsUUFBRCxFQUFXLFFBQVg7QUFDTixRQUFBO0FBQUE7TUFDRSxNQUFNLENBQUMsWUFBWSxDQUFDLFVBQXBCLENBQStCLElBQUMsQ0FBQSxPQUFELENBQVMsUUFBUSxDQUFDLElBQWxCLENBQS9COzhDQUNBLFNBQVUsZUFGWjtLQUFBLGFBQUE7OENBSUUsU0FBVSw2QkFKWjs7RUFETTs7aUNBT1IsT0FBQSxHQUFTLFNBQUMsSUFBRDs7TUFBQyxPQUFPOztXQUNmLE9BQUEsR0FBUTtFQUREOzs7O0dBMUR3Qjs7QUE2RG5DLE1BQU0sQ0FBQyxPQUFQLEdBQWlCOzs7OztBQ2xFakIsSUFBQTs7QUFBQyxNQUFPLEtBQUssQ0FBQyxJQUFiOztBQUVLOzs7c0JBQ0osVUFBQSxHQUFZLFNBQUMsT0FBRDtXQUNULElBQUMsQ0FBQSxrQkFBQSxPQUFGLEVBQVcsSUFBQyxDQUFBLG1CQUFBLFFBQVosRUFBd0I7RUFEZDs7Ozs7O0FBR1I7RUFDUyx1QkFBQyxPQUFEO0FBQ1gsUUFBQTtJQUFDLElBQUMsQ0FBQSxlQUFBLElBQUYsRUFBUSxJQUFDLENBQUEsZUFBQSxJQUFULEVBQWUsSUFBQyxDQUFBLGVBQUEsSUFBaEIsRUFBc0IsSUFBQyxDQUFBLG1CQUFBLFFBQXZCLEVBQWlDLElBQUMsQ0FBQSw0REFBYTtFQURwQzs7RUFFYixhQUFDLENBQUEsTUFBRCxHQUFTOztFQUNULGFBQUMsQ0FBQSxJQUFELEdBQU87Ozs7OztBQUVULGlDQUFBLEdBQW9DLEtBQUssQ0FBQyxhQUFOLENBQW9CLEtBQUssQ0FBQyxXQUFOLENBQ3REO0VBQUEsV0FBQSxFQUFhLG1DQUFiO0VBQ0EsTUFBQSxFQUFRLFNBQUE7V0FDTCxHQUFBLENBQUksRUFBSixFQUFRLCtDQUFBLEdBQWdELElBQUMsQ0FBQSxLQUFLLENBQUMsUUFBUSxDQUFDLFdBQXhFO0VBREssQ0FEUjtDQURzRCxDQUFwQjs7QUFLOUI7RUFFUywyQkFBQyxPQUFEO0lBQ1YsSUFBQyxDQUFBLGVBQUEsSUFBRixFQUFRLElBQUMsQ0FBQSxzQkFBQSxXQUFULEVBQXNCLElBQUMsQ0FBQSx1QkFBQTtFQURaOztFQUdiLGlCQUFDLENBQUEsU0FBRCxHQUFZLFNBQUE7V0FBRztFQUFIOzs4QkFFWixHQUFBLEdBQUssU0FBQyxVQUFEO1dBQ0gsSUFBQyxDQUFBLFlBQWEsQ0FBQSxVQUFBO0VBRFg7OzhCQUdMLFVBQUEsR0FBWSxTQUFDLFFBQUQ7SUFDVixJQUFHLFFBQUg7YUFDRSxRQUFBLENBQVMsSUFBVCxFQURGO0tBQUEsTUFBQTthQUdFLEtBSEY7O0VBRFU7OzhCQU1aLHlCQUFBLEdBQTJCLFNBQUE7V0FDeEIsaUNBQUEsQ0FBa0M7TUFBQyxRQUFBLEVBQVUsSUFBWDtLQUFsQztFQUR3Qjs7OEJBRzNCLFVBQUEsR0FBWSxTQUFBO1dBQ1Y7RUFEVTs7OEJBR1osTUFBQSxHQUFRLFNBQUMsUUFBRDtXQUNOLElBQUMsQ0FBQSxlQUFELENBQWlCLFFBQWpCO0VBRE07OzhCQUdSLElBQUEsR0FBTSxTQUFDLE9BQUQsRUFBVSxRQUFWLEVBQW9CLFFBQXBCO1dBQ0osSUFBQyxDQUFBLGVBQUQsQ0FBaUIsTUFBakI7RUFESTs7OEJBR04sSUFBQSxHQUFNLFNBQUMsUUFBRDtXQUNKLElBQUMsQ0FBQSxlQUFELENBQWlCLE1BQWpCO0VBREk7OzhCQUdOLElBQUEsR0FBTSxTQUFDLFFBQUQsRUFBVyxRQUFYO1dBQ0osSUFBQyxDQUFBLGVBQUQsQ0FBaUIsTUFBakI7RUFESTs7OEJBR04sTUFBQSxHQUFRLFNBQUMsUUFBRCxFQUFXLFFBQVg7V0FDTixJQUFDLENBQUEsZUFBRCxDQUFpQixRQUFqQjtFQURNOzs4QkFHUixNQUFBLEdBQVEsU0FBQyxRQUFELEVBQVcsT0FBWCxFQUFvQixRQUFwQjtXQUNOLElBQUMsQ0FBQSxlQUFELENBQWlCLFFBQWpCO0VBRE07OzhCQUdSLGVBQUEsR0FBaUIsU0FBQyxVQUFEO1dBQ2YsS0FBQSxDQUFTLFVBQUQsR0FBWSx1QkFBWixHQUFtQyxJQUFDLENBQUEsSUFBcEMsR0FBeUMsV0FBakQ7RUFEZTs7Ozs7O0FBR25CLE1BQU0sQ0FBQyxPQUFQLEdBQ0U7RUFBQSxTQUFBLEVBQVcsU0FBWDtFQUNBLGFBQUEsRUFBZSxhQURmO0VBRUEsaUJBQUEsRUFBbUIsaUJBRm5COzs7Ozs7QUM3REYsSUFBQSxnRUFBQTtFQUFBOzs7QUFBQSxFQUFBLEdBQUssT0FBQSxDQUFRLG9CQUFSOztBQUNMLFFBQUEsR0FBVyxPQUFBLENBQVEsb0JBQVI7O0FBRVgsaUJBQUEsR0FBb0IsQ0FBQyxPQUFBLENBQVEsc0JBQVIsQ0FBRCxDQUFnQyxDQUFDOztBQUNyRCxhQUFBLEdBQWdCLENBQUMsT0FBQSxDQUFRLHNCQUFSLENBQUQsQ0FBZ0MsQ0FBQzs7QUFFM0M7OztFQUVTLDBCQUFDLE9BQUQ7SUFBQyxJQUFDLENBQUEsNEJBQUQsVUFBVztJQUN2QixrREFDRTtNQUFBLElBQUEsRUFBTSxnQkFBZ0IsQ0FBQyxJQUF2QjtNQUNBLFdBQUEsRUFBYSxJQUFDLENBQUEsT0FBTyxDQUFDLFdBQVQsSUFBd0IsQ0FBQyxFQUFBLENBQUcscUJBQUgsQ0FBRCxDQURyQztNQUVBLFlBQUEsRUFDRTtRQUFBLElBQUEsRUFBTSxLQUFOO1FBQ0EsSUFBQSxFQUFNLElBRE47UUFFQSxJQUFBLEVBQU0sSUFGTjtRQUdBLE1BQUEsRUFBUSxLQUhSO1FBSUEsTUFBQSxFQUFRLEtBSlI7T0FIRjtLQURGO0lBU0EsSUFBQyxDQUFBLElBQUQsR0FBUTtFQVZHOztFQVliLGdCQUFDLENBQUEsSUFBRCxHQUFPOzs2QkFFUCxJQUFBLEdBQU0sU0FBQyxRQUFELEVBQVcsUUFBWDtXQUNKLElBQUMsQ0FBQSxTQUFELENBQVcsQ0FBQSxTQUFBLEtBQUE7YUFBQSxTQUFDLEdBQUQsRUFBTSxJQUFOO0FBQ1QsWUFBQTtRQUFBLElBQXVCLEdBQXZCO0FBQUEsaUJBQU8sUUFBQSxDQUFTLEdBQVQsRUFBUDs7UUFDQSxNQUFBLEdBQVMsS0FBQyxDQUFBLFdBQUQsQ0FBYSxRQUFiO1FBQ1QsSUFBRyxNQUFIO1VBQ0UsSUFBRyxNQUFPLENBQUEsUUFBUSxDQUFDLElBQVQsQ0FBVjtZQUNFLElBQUcsTUFBTyxDQUFBLFFBQVEsQ0FBQyxJQUFULENBQWMsQ0FBQyxRQUFRLENBQUMsSUFBL0IsS0FBdUMsYUFBYSxDQUFDLElBQXhEO3FCQUNFLFFBQUEsQ0FBUyxJQUFULEVBQWUsTUFBTyxDQUFBLFFBQVEsQ0FBQyxJQUFULENBQWMsQ0FBQyxPQUFyQyxFQURGO2FBQUEsTUFBQTtxQkFHRSxRQUFBLENBQVksUUFBUSxDQUFDLElBQVYsR0FBZSxjQUExQixFQUhGO2FBREY7V0FBQSxNQUFBO21CQU1FLFFBQUEsQ0FBWSxRQUFRLENBQUMsSUFBVixHQUFlLHNCQUExQixFQU5GO1dBREY7U0FBQSxNQUFBO2lCQVNFLFFBQUEsQ0FBWSxRQUFRLENBQUMsSUFBVixHQUFlLG1CQUExQixFQVRGOztNQUhTO0lBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFYO0VBREk7OzZCQWVOLElBQUEsR0FBTSxTQUFDLFFBQUQsRUFBVyxRQUFYO1dBQ0osSUFBQyxDQUFBLFNBQUQsQ0FBVyxDQUFBLFNBQUEsS0FBQTthQUFBLFNBQUMsR0FBRCxFQUFNLElBQU47QUFDVCxZQUFBO1FBQUEsSUFBdUIsR0FBdkI7QUFBQSxpQkFBTyxRQUFBLENBQVMsR0FBVCxFQUFQOztRQUNBLE1BQUEsR0FBUyxLQUFDLENBQUEsV0FBRCxDQUFhLFFBQWI7UUFDVCxJQUFHLE1BQUg7VUFDRSxJQUFBLEdBQU87QUFDUCxlQUFBLGtCQUFBOzs7WUFBQSxJQUFJLENBQUMsSUFBTCxDQUFVLElBQUksQ0FBQyxRQUFmO0FBQUE7aUJBQ0EsUUFBQSxDQUFTLElBQVQsRUFBZSxJQUFmLEVBSEY7U0FBQSxNQUlLLElBQUcsUUFBSDtpQkFDSCxRQUFBLENBQVksUUFBUSxDQUFDLElBQVYsR0FBZSxtQkFBMUIsRUFERzs7TUFQSTtJQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBWDtFQURJOzs2QkFXTixTQUFBLEdBQVcsU0FBQyxRQUFEO0lBQ1QsSUFBRyxJQUFDLENBQUEsSUFBRCxLQUFXLElBQWQ7YUFDRSxRQUFBLENBQVMsSUFBVCxFQUFlLElBQUMsQ0FBQSxJQUFoQixFQURGO0tBQUEsTUFFSyxJQUFHLElBQUMsQ0FBQSxPQUFPLENBQUMsSUFBWjtNQUNILElBQUMsQ0FBQSxJQUFELEdBQVEsSUFBQyxDQUFBLDBCQUFELENBQTRCLElBQUMsQ0FBQSxPQUFPLENBQUMsSUFBckM7YUFDUixRQUFBLENBQVMsSUFBVCxFQUFlLElBQUMsQ0FBQSxJQUFoQixFQUZHO0tBQUEsTUFHQSxJQUFHLElBQUMsQ0FBQSxPQUFPLENBQUMsWUFBWjthQUNILElBQUMsQ0FBQSxPQUFPLENBQUMsWUFBVCxDQUFzQixDQUFBLFNBQUEsS0FBQTtlQUFBLFNBQUMsR0FBRCxFQUFNLElBQU47VUFDcEIsSUFBRyxHQUFIO21CQUNFLFFBQUEsQ0FBUyxHQUFULEVBREY7V0FBQSxNQUFBO1lBR0UsS0FBQyxDQUFBLElBQUQsR0FBUSxLQUFDLENBQUEsMEJBQUQsQ0FBNEIsS0FBQyxDQUFBLE9BQU8sQ0FBQyxJQUFyQzttQkFDUixRQUFBLENBQVMsSUFBVCxFQUFlLEtBQUMsQ0FBQSxJQUFoQixFQUpGOztRQURvQjtNQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBdEIsRUFERztLQUFBLE1BT0EsSUFBRyxJQUFDLENBQUEsT0FBTyxDQUFDLEdBQVo7YUFDSCxDQUFDLENBQUMsSUFBRixDQUNFO1FBQUEsUUFBQSxFQUFVLE1BQVY7UUFDQSxHQUFBLEVBQUssSUFBQyxDQUFBLE9BQU8sQ0FBQyxHQURkO1FBRUEsT0FBQSxFQUFTLENBQUEsU0FBQSxLQUFBO2lCQUFBLFNBQUMsSUFBRDtZQUNQLEtBQUMsQ0FBQSxJQUFELEdBQVEsS0FBQyxDQUFBLDBCQUFELENBQTRCLElBQTVCO21CQUNSLFFBQUEsQ0FBUyxJQUFULEVBQWUsS0FBQyxDQUFBLElBQWhCO1VBRk87UUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBRlQ7UUFLQSxLQUFBLEVBQU8sU0FBQTtpQkFBRyxRQUFBLENBQVMsMEJBQUEsR0FBMkIsSUFBQyxDQUFBLFdBQTVCLEdBQXdDLFdBQWpEO1FBQUgsQ0FMUDtPQURGLEVBREc7S0FBQSxNQUFBOztRQVNILE9BQU8sQ0FBQyxNQUFPLGtDQUFBLEdBQW1DLElBQUMsQ0FBQSxXQUFwQyxHQUFnRDs7YUFDL0QsUUFBQSxDQUFTLElBQVQsRUFBZSxFQUFmLEVBVkc7O0VBYkk7OzZCQXlCWCwwQkFBQSxHQUE0QixTQUFDLElBQUQsRUFBTyxVQUFQO0FBQzFCLFFBQUE7O01BRGlDLGFBQWE7O0lBQzlDLElBQUEsR0FBTztBQUNQLFNBQUEsZ0JBQUE7O01BQ0UsSUFBQSxHQUFVLFFBQUEsQ0FBUyxJQUFLLENBQUEsUUFBQSxDQUFkLENBQUgsR0FBZ0MsYUFBYSxDQUFDLElBQTlDLEdBQXdELGFBQWEsQ0FBQztNQUM3RSxRQUFBLEdBQWUsSUFBQSxhQUFBLENBQ2I7UUFBQSxJQUFBLEVBQU0sUUFBTjtRQUNBLElBQUEsRUFBTSxVQUFBLEdBQWEsUUFEbkI7UUFFQSxJQUFBLEVBQU0sSUFGTjtRQUdBLFFBQUEsRUFBVSxJQUhWO1FBSUEsUUFBQSxFQUFVLElBSlY7T0FEYTtNQU1mLElBQUcsSUFBQSxLQUFRLGFBQWEsQ0FBQyxNQUF6QjtRQUNFLFFBQVEsQ0FBQyxRQUFULEdBQW9CLDBCQUFBLENBQTJCLElBQUssQ0FBQSxRQUFBLENBQWhDLEVBQTJDLFVBQUEsR0FBYSxRQUFiLEdBQXdCLEdBQW5FLEVBRHRCOztNQUVBLElBQUssQ0FBQSxRQUFBLENBQUwsR0FDRTtRQUFBLE9BQUEsRUFBUyxJQUFLLENBQUEsUUFBQSxDQUFkO1FBQ0EsUUFBQSxFQUFVLFFBRFY7O0FBWEo7V0FhQTtFQWYwQjs7NkJBaUI1QixXQUFBLEdBQWEsU0FBQyxRQUFEO0lBQ1gsSUFBRyxDQUFJLFFBQVA7YUFDRSxJQUFDLENBQUEsS0FESDtLQUFBLE1BQUE7YUFHRSxJQUFDLENBQUEsS0FISDs7RUFEVzs7OztHQXBGZ0I7O0FBMEYvQixNQUFNLENBQUMsT0FBUCxHQUFpQjs7Ozs7QUNoR2pCLElBQUE7O0FBQUEsRUFBQSxHQUFLLE9BQUEsQ0FBUSxtQkFBUjs7QUFDTCxRQUFBLEdBQVcsT0FBQSxDQUFRLG1CQUFSOztBQUVMO0VBRVMsaUNBQUMsSUFBRCxFQUFRLElBQVI7SUFBQyxJQUFDLENBQUEsT0FBRDtJQUFPLElBQUMsQ0FBQSxzQkFBRCxPQUFRO0VBQWhCOzs7Ozs7QUFFVDtFQUVKLHNCQUFDLENBQUEsV0FBRCxHQUFjLENBQUMsZUFBRCxFQUFrQixnQkFBbEIsRUFBb0MsTUFBcEMsRUFBNEMsa0JBQTVDLEVBQWdFLGdCQUFoRSxFQUFrRixjQUFsRjs7RUFFRCxnQ0FBQyxPQUFELEVBQVUsTUFBVjtBQUNYLFFBQUE7SUFBQSxTQUFBLEdBQVksU0FBQyxNQUFEO0FBQ1YsVUFBQTtrREFBYyxDQUFFLElBQWhCLENBQXFCLE1BQXJCLFdBQUEsSUFBZ0MsQ0FBQyxTQUFBO2VBQUcsS0FBQSxDQUFNLEtBQUEsR0FBTSxNQUFOLEdBQWEsb0NBQW5CO01BQUgsQ0FBRDtJQUR0QjtJQUdaLFVBQUEsR0FBYSxTQUFDLE1BQUQ7TUFDWCxJQUFHLE1BQUEsS0FBVSxjQUFiO2VBQ0UsU0FBQTtBQUFHLGNBQUE7NERBQXFCLENBQUUsUUFBUSxDQUFDLEdBQWhDLENBQW9DLFFBQXBDO1FBQUgsRUFERjtPQUFBLE1BQUE7ZUFHRSxLQUhGOztJQURXO0lBTWIsSUFBQyxDQUFBLEtBQUQsR0FBUztBQUNUO0FBQUEsU0FBQSxxQ0FBQTs7TUFDRSxRQUFBLEdBQWMsUUFBQSxDQUFTLElBQVQsQ0FBSCxHQUNULENBQUEsSUFBQSw0Q0FBMEIsQ0FBQSxJQUFBLFVBQTFCLEVBQ0EsUUFBQTtBQUFXLGdCQUFPLElBQVA7QUFBQSxlQUNKLGVBREk7bUJBRVA7Y0FBQSxJQUFBLEVBQU0sSUFBQSxJQUFRLEVBQUEsQ0FBRyxXQUFILENBQWQ7O0FBRk8sZUFHSixnQkFISTttQkFJUDtjQUFBLElBQUEsRUFBTSxJQUFBLElBQVEsRUFBQSxDQUFHLFlBQUgsQ0FBZDs7QUFKTyxlQUtKLE1BTEk7bUJBTVA7Y0FBQSxJQUFBLEVBQU0sSUFBQSxJQUFRLEVBQUEsQ0FBRyxZQUFILENBQWQ7O0FBTk8sZUFPSixrQkFQSTttQkFRUDtjQUFBLElBQUEsRUFBTSxJQUFBLElBQVEsRUFBQSxDQUFHLGVBQUgsQ0FBZDs7QUFSTyxlQVNKLGdCQVRJO21CQVVQO2NBQUEsSUFBQSxFQUFNLElBQUEsSUFBUSxFQUFBLENBQUcsZ0JBQUgsQ0FBZDs7QUFWTyxlQVdKLGNBWEk7bUJBWVA7Y0FBQSxJQUFBLEVBQU0sSUFBQSxJQUFRLEVBQUEsQ0FBRyxjQUFILENBQWQ7O0FBWk87bUJBY1A7Y0FBQSxJQUFBLEVBQU0sZ0JBQUEsR0FBaUIsSUFBdkI7O0FBZE87VUFEWCxFQWdCQSxRQUFRLENBQUMsT0FBVCxHQUFtQixVQUFBLENBQVcsSUFBWCxDQWhCbkIsRUFpQkEsUUFBUSxDQUFDLE1BQVQsR0FBa0IsU0FBQSxDQUFVLElBQVYsQ0FqQmxCLEVBa0JBLFFBbEJBLENBRFMsR0FzQlQsQ0FBRyxRQUFBLENBQVMsSUFBSSxDQUFDLE1BQWQsQ0FBSCxHQUNFLENBQUEsSUFBSSxDQUFDLE9BQUwsR0FBZSxVQUFBLENBQVcsSUFBSSxDQUFDLE1BQWhCLENBQWYsRUFDQSxJQUFJLENBQUMsTUFBTCxHQUFjLFNBQUEsQ0FBVSxJQUFJLENBQUMsTUFBZixDQURkLENBREYsR0FJRSxJQUFJLENBQUMsWUFBTCxJQUFJLENBQUMsVUFBWSxLQUpuQixFQUtBLElBTEE7TUFNRixJQUFHLFFBQUg7UUFDRSxJQUFDLENBQUEsS0FBSyxDQUFDLElBQVAsQ0FBWSxRQUFaLEVBREY7O0FBN0JGO0VBWFc7Ozs7OztBQTJDVDtFQUVTLDRCQUFDLE9BQUQ7SUFBQyxJQUFDLENBQUEsU0FBRDtJQUNaLElBQUMsQ0FBQSxJQUFELEdBQVE7RUFERzs7K0JBR2IsSUFBQSxHQUFNLFNBQUMsT0FBRDtJQUNKLE9BQUEsR0FBVSxPQUFBLElBQVc7SUFFckIsSUFBRyxPQUFPLENBQUMsSUFBUixLQUFrQixJQUFyQjtNQUNFLElBQUcsT0FBTyxPQUFPLENBQUMsSUFBZixLQUF1QixXQUExQjtRQUNFLE9BQU8sQ0FBQyxJQUFSLEdBQWUsc0JBQXNCLENBQUMsWUFEeEM7O2FBRUEsSUFBQyxDQUFBLElBQUQsR0FBWSxJQUFBLHNCQUFBLENBQXVCLE9BQXZCLEVBQWdDLElBQUMsQ0FBQSxNQUFqQyxFQUhkOztFQUhJOzsrQkFTTixNQUFBLEdBQVEsU0FBQyxnQkFBRDtJQUFDLElBQUMsQ0FBQSxtQkFBRDtFQUFEOzsrQkFFUixjQUFBLEdBQWdCLFNBQUMsSUFBRDtXQUNkLElBQUMsQ0FBQSxnQkFBRCxDQUFzQixJQUFBLHVCQUFBLENBQXdCLGdCQUF4QixFQUEwQyxJQUExQyxDQUF0QjtFQURjOzsrQkFHaEIsY0FBQSxHQUFnQixTQUFDLElBQUQ7V0FDZCxJQUFDLENBQUEsZ0JBQUQsQ0FBc0IsSUFBQSx1QkFBQSxDQUF3QixnQkFBeEIsRUFBMEMsSUFBMUMsQ0FBdEI7RUFEYzs7K0JBR2hCLGNBQUEsR0FBZ0IsU0FBQyxRQUFEO1dBQ2QsSUFBQyxDQUFBLG1CQUFELENBQXFCLFVBQXJCLEVBQWtDLEVBQUEsQ0FBRyxjQUFILENBQWxDLEVBQXNELFFBQXREO0VBRGM7OytCQUdoQixnQkFBQSxHQUFrQixTQUFDLFFBQUQ7V0FDaEIsSUFBQyxDQUFBLG1CQUFELENBQXFCLFlBQXJCLEVBQW9DLEVBQUEsQ0FBRyxpQkFBSCxDQUFwQyxFQUEyRCxRQUEzRDtFQURnQjs7K0JBR2xCLGNBQUEsR0FBZ0IsU0FBQyxRQUFEO1dBQ2QsSUFBQyxDQUFBLG1CQUFELENBQXFCLFVBQXJCLEVBQWtDLEVBQUEsQ0FBRyxjQUFILENBQWxDLEVBQXNELFFBQXREO0VBRGM7OytCQUdoQixjQUFBLEdBQWdCLFNBQUMsUUFBRCxFQUFXLE9BQVgsRUFBb0IsUUFBcEI7V0FDZCxJQUFDLENBQUEsZ0JBQUQsQ0FBc0IsSUFBQSx1QkFBQSxDQUF3QixvQkFBeEIsRUFDcEI7TUFBQSxRQUFBLEVBQVUsUUFBVjtNQUNBLE9BQUEsRUFBUyxPQURUO01BRUEsUUFBQSxFQUFVLFFBRlY7S0FEb0IsQ0FBdEI7RUFEYzs7K0JBTWhCLFlBQUEsR0FBYyxTQUFDLFFBQUQsRUFBVyxRQUFYO1dBQ1osSUFBQyxDQUFBLGdCQUFELENBQXNCLElBQUEsdUJBQUEsQ0FBd0Isa0JBQXhCLEVBQ3BCO01BQUEsUUFBQSxFQUFVLFFBQVY7TUFDQSxRQUFBLEVBQVUsUUFEVjtLQURvQixDQUF0QjtFQURZOzsrQkFLZCxtQkFBQSxHQUFxQixTQUFDLE1BQUQsRUFBUyxLQUFULEVBQWdCLFFBQWhCO1dBQ25CLElBQUMsQ0FBQSxnQkFBRCxDQUFzQixJQUFBLHVCQUFBLENBQXdCLG9CQUF4QixFQUNwQjtNQUFBLE1BQUEsRUFBUSxNQUFSO01BQ0EsS0FBQSxFQUFPLEtBRFA7TUFFQSxRQUFBLEVBQVUsUUFGVjtLQURvQixDQUF0QjtFQURtQjs7Ozs7O0FBTXZCLE1BQU0sQ0FBQyxPQUFQLEdBQ0U7RUFBQSx1QkFBQSxFQUF5Qix1QkFBekI7RUFDQSxrQkFBQSxFQUFvQixrQkFEcEI7RUFFQSxzQkFBQSxFQUF3QixzQkFGeEI7Ozs7OztBQ3ZHRixNQUFNLENBQUMsT0FBUCxHQUFpQixTQUFDLEtBQUQ7U0FBVyxNQUFNLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxJQUExQixDQUErQixLQUEvQixDQUFBLEtBQXlDO0FBQXBEOzs7OztBQ0FqQixNQUFNLENBQUMsT0FBUCxHQUNFO0VBQUEsMkJBQUEsRUFBNkIsbUJBQTdCO0VBRUEsV0FBQSxFQUFhLEtBRmI7RUFHQSxZQUFBLEVBQWMsVUFIZDtFQUlBLFlBQUEsRUFBYyxNQUpkO0VBS0EsZUFBQSxFQUFpQixhQUxqQjtFQU1BLGdCQUFBLEVBQWtCLFVBTmxCO0VBT0EsY0FBQSxFQUFnQixRQVBoQjtFQVNBLGNBQUEsRUFBZ0IsTUFUaEI7RUFVQSxpQkFBQSxFQUFtQixhQVZuQjtFQVdBLGNBQUEsRUFBZ0IsTUFYaEI7RUFZQSxrQkFBQSxFQUFvQixVQVpwQjtFQWFBLGdCQUFBLEVBQWtCLFFBYmxCO0VBZUEseUJBQUEsRUFBMkIsZUFmM0I7RUFnQkEscUJBQUEsRUFBdUIsV0FoQnZCO0VBaUJBLHdCQUFBLEVBQTBCLGNBakIxQjtFQWtCQSwwQkFBQSxFQUE0QixnQkFsQjVCO0VBb0JBLHVCQUFBLEVBQXlCLFVBcEJ6QjtFQXFCQSxtQkFBQSxFQUFxQixNQXJCckI7RUFzQkEsbUJBQUEsRUFBcUIsTUF0QnJCO0VBdUJBLHFCQUFBLEVBQXVCLFFBdkJ2QjtFQXdCQSxxQkFBQSxFQUF1QixRQXhCdkI7RUF5QkEsNkJBQUEsRUFBK0IsOENBekIvQjtFQTBCQSxzQkFBQSxFQUF3QixZQTFCeEI7RUE0QkEsMkJBQUEsRUFBNkIsVUE1QjdCO0VBNkJBLHlCQUFBLEVBQTJCLFFBN0IzQjtFQStCQSx1QkFBQSxFQUF5QixRQS9CekI7RUFnQ0EsdUJBQUEsRUFBeUIsUUFoQ3pCO0VBa0NBLDBCQUFBLEVBQTRCLDhEQWxDNUI7Ozs7OztBQ0RGLElBQUE7O0FBQUEsWUFBQSxHQUFnQjs7QUFDaEIsWUFBYSxDQUFBLElBQUEsQ0FBYixHQUFxQixPQUFBLENBQVEsY0FBUjs7QUFDckIsV0FBQSxHQUFjOztBQUNkLFNBQUEsR0FBWTs7QUFFWixTQUFBLEdBQVksU0FBQyxHQUFELEVBQU0sSUFBTixFQUFlLElBQWY7QUFDVixNQUFBOztJQURnQixPQUFLOzs7SUFBSSxPQUFLOztFQUM5QixXQUFBLDRDQUFrQyxDQUFBLEdBQUEsV0FBcEIsSUFBNEI7U0FDMUMsV0FBVyxDQUFDLE9BQVosQ0FBb0IsU0FBcEIsRUFBK0IsU0FBQyxLQUFELEVBQVEsR0FBUjtJQUM3QixJQUFHLElBQUksQ0FBQyxjQUFMLENBQW9CLEdBQXBCLENBQUg7YUFBZ0MsSUFBSyxDQUFBLEdBQUEsRUFBckM7S0FBQSxNQUFBO2FBQStDLGtCQUFBLEdBQW1CLEdBQW5CLEdBQXVCLE1BQXRFOztFQUQ2QixDQUEvQjtBQUZVOztBQUtaLE1BQU0sQ0FBQyxPQUFQLEdBQWlCOzs7OztBQ1ZqQixJQUFBOztBQUFBLE9BQUEsR0FBVSxLQUFLLENBQUMsYUFBTixDQUFvQixPQUFBLENBQVEsaUJBQVIsQ0FBcEI7O0FBQ1Ysb0JBQUEsR0FBdUIsS0FBSyxDQUFDLGFBQU4sQ0FBb0IsT0FBQSxDQUFRLCtCQUFSLENBQXBCOztBQUN2QixjQUFBLEdBQWlCLEtBQUssQ0FBQyxhQUFOLENBQW9CLE9BQUEsQ0FBUSx3QkFBUixDQUFwQjs7QUFDakIsWUFBQSxHQUFlLEtBQUssQ0FBQyxhQUFOLENBQW9CLE9BQUEsQ0FBUSxzQkFBUixDQUFwQjs7QUFFZixFQUFBLEdBQUssT0FBQSxDQUFRLG9CQUFSOztBQUVMLE1BQWdCLEtBQUssQ0FBQyxHQUF0QixFQUFDLFVBQUEsR0FBRCxFQUFNLGFBQUE7O0FBRU4sUUFBQSxHQUFXLEtBQUssQ0FBQyxhQUFOLENBQW9CLEtBQUssQ0FBQyxXQUFOLENBRTdCO0VBQUEsV0FBQSxFQUFhLDBCQUFiO0VBRUEscUJBQUEsRUFBdUIsU0FBQyxTQUFEO1dBQ3JCLFNBQVMsQ0FBQyxHQUFWLEtBQW1CLElBQUMsQ0FBQSxLQUFLLENBQUM7RUFETCxDQUZ2QjtFQUtBLE1BQUEsRUFBUSxTQUFBO1dBQ0wsR0FBQSxDQUFJO01BQUMsU0FBQSxFQUFXLFVBQVo7S0FBSixFQUNFLE1BQUEsQ0FBTztNQUFDLEdBQUEsRUFBSyxJQUFDLENBQUEsS0FBSyxDQUFDLEdBQWI7S0FBUCxDQURGO0VBREssQ0FMUjtDQUY2QixDQUFwQjs7QUFZWCxHQUFBLEdBQU0sS0FBSyxDQUFDLFdBQU4sQ0FFSjtFQUFBLFdBQUEsRUFBYSxrQkFBYjtFQUVBLFdBQUEsRUFBYSxTQUFBO0FBQ1gsUUFBQTtJQUFBLDREQUErQixDQUFFLGNBQTlCLENBQTZDLE1BQTdDLFVBQUg7YUFBNkQsSUFBQyxDQUFBLEtBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxLQUExRjtLQUFBLE1BQUE7YUFBcUcsRUFBQSxDQUFHLDJCQUFILEVBQXJHOztFQURXLENBRmI7RUFLQSxXQUFBLEVBQWEsU0FBQTtBQUNYLFFBQUE7bUVBQTRCLENBQUU7RUFEbkIsQ0FMYjtFQVFBLGVBQUEsRUFBaUIsU0FBQTtBQUNmLFFBQUE7V0FBQTtNQUFBLFFBQUEsRUFBVSxJQUFDLENBQUEsV0FBRCxDQUFBLENBQVY7TUFDQSxRQUFBLEVBQVUsSUFBQyxDQUFBLFdBQUQsQ0FBQSxDQURWO01BRUEsU0FBQSxxREFBaUMsQ0FBRSxlQUF4QixJQUFpQyxFQUY1QztNQUdBLFdBQUEsd0NBQXNCLENBQUUsaUJBQVgsSUFBc0IsRUFIbkM7TUFJQSxjQUFBLEVBQWdCLElBSmhCO01BS0EsY0FBQSxFQUFnQixJQUxoQjtNQU1BLFlBQUEsRUFBYyxJQU5kO01BT0EsS0FBQSxFQUFPLEtBUFA7O0VBRGUsQ0FSakI7RUFrQkEsa0JBQUEsRUFBb0IsU0FBQTtJQUNsQixJQUFDLENBQUEsS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFkLENBQXFCLENBQUEsU0FBQSxLQUFBO2FBQUEsU0FBQyxLQUFEO0FBQ25CLFlBQUE7UUFBQSxVQUFBLEdBQWdCLEtBQUssQ0FBQyxLQUFLLENBQUMsTUFBZixHQUNYO1VBQUMsT0FBQSxFQUFTLFdBQVY7VUFBdUIsSUFBQSxFQUFNLE1BQTdCO1NBRFcsR0FFTCxLQUFLLENBQUMsS0FBSyxDQUFDLEtBQWYsR0FDSDtVQUFDLE9BQUEsRUFBUyx1QkFBQSxHQUF3QixLQUFLLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsV0FBaEU7VUFBK0UsSUFBQSxFQUFNLE1BQXJGO1NBREcsR0FFRyxLQUFLLENBQUMsS0FBSyxDQUFDLEtBQWYsR0FDSDtVQUFDLE9BQUEsRUFBUyxTQUFWO1VBQXFCLElBQUEsRUFBTSxPQUEzQjtTQURHLEdBR0g7UUFDRixLQUFDLENBQUEsUUFBRCxDQUNFO1VBQUEsUUFBQSxFQUFVLEtBQUMsQ0FBQSxXQUFELENBQUEsQ0FBVjtVQUNBLFFBQUEsRUFBVSxLQUFDLENBQUEsV0FBRCxDQUFBLENBRFY7VUFFQSxVQUFBLEVBQVksVUFGWjtTQURGO0FBS0EsZ0JBQU8sS0FBSyxDQUFDLElBQWI7QUFBQSxlQUNPLFdBRFA7bUJBRUksS0FBQyxDQUFBLFFBQUQsQ0FBVTtjQUFBLFNBQUEsc0RBQWlDLENBQUUsZUFBeEIsSUFBaUMsRUFBNUM7YUFBVjtBQUZKO01BZG1CO0lBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFyQjtXQWtCQSxJQUFDLENBQUEsS0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsTUFBbEIsQ0FBeUIsQ0FBQSxTQUFBLEtBQUE7YUFBQSxTQUFDLEtBQUQ7QUFDdkIsZ0JBQU8sS0FBSyxDQUFDLElBQWI7QUFBQSxlQUNPLG9CQURQO21CQUVJLEtBQUMsQ0FBQSxRQUFELENBQVU7Y0FBQSxjQUFBLEVBQWdCLEtBQUssQ0FBQyxJQUF0QjthQUFWO0FBRkosZUFHTyxvQkFIUDttQkFJSSxLQUFDLENBQUEsUUFBRCxDQUFVO2NBQUEsY0FBQSxFQUFnQixLQUFLLENBQUMsSUFBdEI7YUFBVjtBQUpKLGVBS08sa0JBTFA7bUJBTUksS0FBQyxDQUFBLFFBQUQsQ0FBVTtjQUFBLFlBQUEsRUFBYyxLQUFLLENBQUMsSUFBcEI7YUFBVjtBQU5KLGVBT08sZ0JBUFA7WUFRSSxLQUFDLENBQUEsS0FBSyxDQUFDLFNBQVMsQ0FBQyxJQUFqQixDQUFzQixLQUFLLENBQUMsSUFBNUI7bUJBQ0EsS0FBQyxDQUFBLFFBQUQsQ0FBVTtjQUFBLFNBQUEsRUFBVyxLQUFDLENBQUEsS0FBSyxDQUFDLFNBQWxCO2FBQVY7QUFUSixlQVVPLGdCQVZQO1lBV0ksS0FBQyxDQUFBLEtBQUssQ0FBQyxXQUFXLENBQUMsSUFBbkIsR0FBMEIsS0FBSyxDQUFDO21CQUNoQyxLQUFDLENBQUEsUUFBRCxDQUFVO2NBQUEsV0FBQSxFQUFhLEtBQUMsQ0FBQSxLQUFLLENBQUMsV0FBcEI7YUFBVjtBQVpKO01BRHVCO0lBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUF6QjtFQW5Ca0IsQ0FsQnBCO0VBb0RBLFlBQUEsRUFBYyxTQUFBO1dBQ1osSUFBQyxDQUFBLFFBQUQsQ0FDRTtNQUFBLGNBQUEsRUFBZ0IsSUFBaEI7TUFDQSxjQUFBLEVBQWdCLElBRGhCO01BRUEsWUFBQSxFQUFjLElBRmQ7S0FERjtFQURZLENBcERkO0VBMERBLGFBQUEsRUFBZSxTQUFBO0lBQ2IsSUFBRyxJQUFDLENBQUEsS0FBSyxDQUFDLGNBQVY7YUFDRyxvQkFBQSxDQUFxQjtRQUFDLE1BQUEsRUFBUSxJQUFDLENBQUEsS0FBSyxDQUFDLE1BQWhCO1FBQXdCLE1BQUEsRUFBUSxJQUFDLENBQUEsS0FBSyxDQUFDLGNBQXZDO1FBQXVELEtBQUEsRUFBTyxJQUFDLENBQUEsWUFBL0Q7T0FBckIsRUFESDtLQUFBLE1BRUssSUFBRyxJQUFDLENBQUEsS0FBSyxDQUFDLGNBQVY7YUFDRixjQUFBLENBQWU7UUFBQyxRQUFBLEVBQVUsSUFBQyxDQUFBLEtBQUssQ0FBQyxjQUFjLENBQUMsUUFBakM7UUFBMkMsT0FBQSxFQUFTLElBQUMsQ0FBQSxLQUFLLENBQUMsY0FBYyxDQUFDLE9BQTFFO1FBQW1GLEtBQUEsRUFBTyxJQUFDLENBQUEsWUFBM0Y7T0FBZixFQURFO0tBQUEsTUFFQSxJQUFHLElBQUMsQ0FBQSxLQUFLLENBQUMsWUFBVjthQUNGLFlBQUEsQ0FBYTtRQUFDLFFBQUEsRUFBVSxJQUFDLENBQUEsS0FBSyxDQUFDLFlBQVksQ0FBQyxRQUEvQjtRQUF5QyxRQUFBLEVBQVUsSUFBQyxDQUFBLEtBQUssQ0FBQyxZQUFZLENBQUMsUUFBdkU7UUFBaUYsS0FBQSxFQUFPLElBQUMsQ0FBQSxZQUF6RjtPQUFiLEVBREU7O0VBTFEsQ0ExRGY7RUFrRUEsTUFBQSxFQUFRLFNBQUE7SUFDTixJQUFHLElBQUMsQ0FBQSxLQUFLLENBQUMsV0FBVjthQUNHLEdBQUEsQ0FBSTtRQUFDLFNBQUEsRUFBVyxLQUFaO09BQUosRUFDRSxPQUFBLENBQVE7UUFBQyxRQUFBLEVBQVUsSUFBQyxDQUFBLEtBQUssQ0FBQyxRQUFsQjtRQUE0QixRQUFBLEVBQVUsSUFBQyxDQUFBLEtBQUssQ0FBQyxRQUE3QztRQUF1RCxVQUFBLEVBQVksSUFBQyxDQUFBLEtBQUssQ0FBQyxVQUExRTtRQUFzRixLQUFBLEVBQU8sSUFBQyxDQUFBLEtBQUssQ0FBQyxTQUFwRztRQUErRyxPQUFBLEVBQVMsSUFBQyxDQUFBLEtBQUssQ0FBQyxXQUEvSDtPQUFSLENBREYsRUFFRSxRQUFBLENBQVM7UUFBQyxHQUFBLEVBQUssSUFBQyxDQUFBLEtBQUssQ0FBQyxHQUFiO09BQVQsQ0FGRixFQUdDLElBQUMsQ0FBQSxhQUFELENBQUEsQ0FIRCxFQURIO0tBQUEsTUFNSyxJQUFHLElBQUMsQ0FBQSxLQUFLLENBQUMsY0FBUCxJQUF5QixJQUFDLENBQUEsS0FBSyxDQUFDLGNBQW5DO2FBQ0YsR0FBQSxDQUFJO1FBQUMsU0FBQSxFQUFXLEtBQVo7T0FBSixFQUNDLElBQUMsQ0FBQSxhQUFELENBQUEsQ0FERCxFQURFO0tBQUEsTUFBQTthQUtILEtBTEc7O0VBUEMsQ0FsRVI7Q0FGSTs7QUFrRk4sTUFBTSxDQUFDLE9BQVAsR0FBaUI7Ozs7O0FDdkdqQixJQUFBOztBQUFBLGNBQUEsR0FDRTtFQUFBLGVBQUEsRUFBaUIsU0FBQTtXQUNmO01BQUEsVUFBQSxFQUFZLEtBQVo7O0VBRGUsQ0FBakI7RUFHQSxrQkFBQSxFQUFvQixTQUFBO1dBQ2xCLElBQUMsQ0FBQSxLQUFLLENBQUMsUUFBUSxDQUFDLFVBQWhCLENBQTJCLENBQUEsU0FBQSxLQUFBO2FBQUEsU0FBQyxVQUFEO2VBQ3pCLEtBQUMsQ0FBQSxRQUFELENBQVU7VUFBQSxVQUFBLEVBQVksVUFBWjtTQUFWO01BRHlCO0lBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUEzQjtFQURrQixDQUhwQjtFQU9BLE1BQUEsRUFBUSxTQUFBO0lBQ04sSUFBRyxJQUFDLENBQUEsS0FBSyxDQUFDLFVBQVY7YUFDRSxJQUFDLENBQUEsb0JBQUQsQ0FBQSxFQURGO0tBQUEsTUFBQTthQUdFLElBQUMsQ0FBQSxLQUFLLENBQUMsUUFBUSxDQUFDLHlCQUFoQixDQUFBLEVBSEY7O0VBRE0sQ0FQUjs7O0FBYUYsTUFBTSxDQUFDLE9BQVAsR0FBaUI7Ozs7O0FDZGpCLElBQUE7O0FBQUEsTUFBMEIsS0FBSyxDQUFDLEdBQWhDLEVBQUMsVUFBQSxHQUFELEVBQU0sWUFBQSxLQUFOLEVBQWEsUUFBQSxDQUFiLEVBQWdCLGFBQUE7O0FBRWhCLFdBQUEsR0FBYyxLQUFLLENBQUMsYUFBTixDQUFvQixPQUFBLENBQVEscUJBQVIsQ0FBcEI7O0FBRWQsRUFBQSxHQUFLLE9BQUEsQ0FBUSxvQkFBUjs7QUFFTCxNQUFNLENBQUMsT0FBUCxHQUFpQixLQUFLLENBQUMsV0FBTixDQUVmO0VBQUEsV0FBQSxFQUFhLG9CQUFiO0VBRUEsZUFBQSxFQUFpQixTQUFBO1dBQ2Y7TUFBQSxRQUFBLEVBQVUsSUFBQyxDQUFBLElBQUQsQ0FBTSxJQUFDLENBQUEsS0FBSyxDQUFDLFFBQVAsSUFBbUIsRUFBekIsQ0FBVjs7RUFEZSxDQUZqQjtFQUtBLGlCQUFBLEVBQW1CLFNBQUE7SUFDakIsSUFBQyxDQUFBLFFBQUQsR0FBWSxLQUFLLENBQUMsV0FBTixDQUFrQixJQUFDLENBQUEsSUFBSSxDQUFDLFFBQXhCO1dBQ1osSUFBQyxDQUFBLFFBQVEsQ0FBQyxLQUFWLENBQUE7RUFGaUIsQ0FMbkI7RUFTQSxjQUFBLEVBQWdCLFNBQUE7V0FDZCxJQUFDLENBQUEsUUFBRCxDQUFVO01BQUEsUUFBQSxFQUFVLElBQUMsQ0FBQSxJQUFELENBQU0sSUFBQyxDQUFBLFFBQVEsQ0FBQyxLQUFoQixDQUFWO0tBQVY7RUFEYyxDQVRoQjtFQVlBLElBQUEsRUFBTSxTQUFDLENBQUQ7V0FDSixDQUFDLENBQUMsT0FBRixDQUFVLFdBQVYsRUFBdUIsRUFBdkI7RUFESSxDQVpOO0VBZUEsUUFBQSxFQUFVLFNBQUMsQ0FBRDtJQUNSLElBQUcsSUFBQyxDQUFBLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBaEIsR0FBeUIsQ0FBNUI7TUFDRSxDQUFDLENBQUMsTUFBTSxDQUFDLFlBQVQsQ0FBc0IsTUFBdEIsRUFBOEIsa0JBQUEsR0FBa0IsQ0FBQyxrQkFBQSxDQUFtQixJQUFDLENBQUEsS0FBSyxDQUFDLE9BQTFCLENBQUQsQ0FBaEQ7YUFDQSxJQUFDLENBQUEsS0FBSyxDQUFDLEtBQVAsQ0FBQSxFQUZGO0tBQUEsTUFBQTtNQUlFLENBQUMsQ0FBQyxjQUFGLENBQUE7YUFDQSxJQUFDLENBQUEsUUFBUSxDQUFDLEtBQVYsQ0FBQSxFQUxGOztFQURRLENBZlY7RUF1QkEsTUFBQSxFQUFRLFNBQUE7V0FDTCxXQUFBLENBQVk7TUFBQyxLQUFBLEVBQVEsRUFBQSxDQUFHLGtCQUFILENBQVQ7TUFBaUMsS0FBQSxFQUFPLElBQUMsQ0FBQSxLQUFLLENBQUMsS0FBL0M7S0FBWixFQUNFLEdBQUEsQ0FBSTtNQUFDLFNBQUEsRUFBVyxpQkFBWjtLQUFKLEVBQ0UsS0FBQSxDQUFNO01BQUMsR0FBQSxFQUFLLFVBQU47TUFBa0IsV0FBQSxFQUFhLFVBQS9CO01BQTJDLEtBQUEsRUFBTyxJQUFDLENBQUEsS0FBSyxDQUFDLFFBQXpEO01BQW1FLFFBQUEsRUFBVSxJQUFDLENBQUEsY0FBOUU7S0FBTixDQURGLEVBRUUsR0FBQSxDQUFJO01BQUMsU0FBQSxFQUFXLFNBQVo7S0FBSixFQUNFLENBQUEsQ0FBRTtNQUFDLElBQUEsRUFBTSxHQUFQO01BQVksU0FBQSxFQUFXLENBQUksSUFBQyxDQUFBLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBaEIsS0FBMEIsQ0FBN0IsR0FBb0MsVUFBcEMsR0FBb0QsRUFBckQsQ0FBdkI7TUFBaUYsUUFBQSxFQUFVLElBQUMsQ0FBQSxLQUFLLENBQUMsUUFBbEc7TUFBNEcsT0FBQSxFQUFTLElBQUMsQ0FBQSxRQUF0SDtLQUFGLEVBQW1JLEVBQUEsQ0FBRywyQkFBSCxDQUFuSSxDQURGLEVBRUUsTUFBQSxDQUFPO01BQUMsT0FBQSxFQUFTLElBQUMsQ0FBQSxLQUFLLENBQUMsS0FBakI7S0FBUCxFQUFnQyxFQUFBLENBQUcseUJBQUgsQ0FBaEMsQ0FGRixDQUZGLENBREY7RUFESyxDQXZCUjtDQUZlOzs7OztBQ05qQixJQUFBOztBQUFBLE1BQXlCLEtBQUssQ0FBQyxHQUEvQixFQUFDLFVBQUEsR0FBRCxFQUFNLFFBQUEsQ0FBTixFQUFTLFdBQUEsSUFBVCxFQUFlLFNBQUEsRUFBZixFQUFtQixTQUFBOztBQUVuQixZQUFBLEdBQWUsS0FBSyxDQUFDLGFBQU4sQ0FBb0IsS0FBSyxDQUFDLFdBQU4sQ0FFakM7RUFBQSxXQUFBLEVBQWEsY0FBYjtFQUVBLE9BQUEsRUFBUyxTQUFBO1dBQ1AsSUFBQyxDQUFBLEtBQUssQ0FBQyxNQUFQLENBQWMsSUFBQyxDQUFBLEtBQUssQ0FBQyxJQUFyQjtFQURPLENBRlQ7RUFLQSxNQUFBLEVBQVEsU0FBQTtBQUNOLFFBQUE7SUFBQSxPQUFBLEdBQWEsSUFBQyxDQUFBLEtBQUssQ0FBQyxJQUFJLENBQUMsY0FBWixDQUEyQixTQUEzQixDQUFILEdBQ0wsT0FBTyxJQUFDLENBQUEsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFuQixLQUE4QixVQUFqQyxHQUNFLElBQUMsQ0FBQSxLQUFLLENBQUMsSUFBSSxDQUFDLE9BQVosQ0FBQSxDQURGLEdBR0UsSUFBQyxDQUFBLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FKTixHQU1SO0lBQ0YsUUFBQSxHQUFXLENBQUksT0FBSixJQUFlLENBQUMsSUFBQyxDQUFBLEtBQUssQ0FBQyxZQUFQLElBQXdCLENBQUksSUFBQyxDQUFBLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBekM7SUFFMUIsU0FBQSxHQUFZLFdBQUEsR0FBVyxDQUFJLFFBQUgsR0FBaUIsVUFBakIsR0FBaUMsRUFBbEM7SUFDdkIsSUFBQSxHQUFPLElBQUMsQ0FBQSxLQUFLLENBQUMsSUFBSSxDQUFDLElBQVosSUFBb0IsSUFBQyxDQUFBLEtBQUssQ0FBQztXQUNqQyxFQUFBLENBQUc7TUFBQyxTQUFBLEVBQVcsU0FBWjtNQUF1QixPQUFBLEVBQVMsSUFBQyxDQUFBLE9BQWpDO0tBQUgsRUFBK0MsSUFBL0M7RUFaSyxDQUxSO0NBRmlDLENBQXBCOztBQXFCZixRQUFBLEdBQVcsS0FBSyxDQUFDLFdBQU4sQ0FFVDtFQUFBLFdBQUEsRUFBYSxVQUFiO0VBRUEsZUFBQSxFQUFpQixTQUFBO1dBQ2Y7TUFBQSxZQUFBLEVBQWMsSUFBZDtNQUNBLFFBQUEsRUFBVSxTQUFDLElBQUQ7ZUFDUixHQUFHLENBQUMsSUFBSixDQUFTLFdBQUEsR0FBWSxJQUFyQjtNQURRLENBRFY7O0VBRGUsQ0FGakI7RUFPQSxlQUFBLEVBQWlCLFNBQUE7V0FDZjtNQUFBLFdBQUEsRUFBYSxLQUFiO01BQ0EsT0FBQSxFQUFTLElBRFQ7O0VBRGUsQ0FQakI7RUFXQSxJQUFBLEVBQU0sU0FBQTtBQUNKLFFBQUE7SUFBQSxJQUFDLENBQUEsTUFBRCxDQUFBO0lBQ0EsT0FBQSxHQUFVLFVBQUEsQ0FBVyxDQUFFLENBQUEsU0FBQSxLQUFBO2FBQUEsU0FBQTtlQUFHLEtBQUMsQ0FBQSxRQUFELENBQVU7VUFBQyxXQUFBLEVBQWEsS0FBZDtTQUFWO01BQUg7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQUYsQ0FBWCxFQUFrRCxHQUFsRDtXQUNWLElBQUMsQ0FBQSxRQUFELENBQVU7TUFBQyxPQUFBLEVBQVMsT0FBVjtLQUFWO0VBSEksQ0FYTjtFQWdCQSxNQUFBLEVBQVEsU0FBQTtJQUNOLElBQUcsSUFBQyxDQUFBLEtBQUssQ0FBQyxPQUFWO01BQ0UsWUFBQSxDQUFhLElBQUMsQ0FBQSxLQUFLLENBQUMsT0FBcEIsRUFERjs7V0FFQSxJQUFDLENBQUEsUUFBRCxDQUFVO01BQUMsT0FBQSxFQUFTLElBQVY7S0FBVjtFQUhNLENBaEJSO0VBcUJBLE1BQUEsRUFBUSxTQUFDLElBQUQ7QUFDTixRQUFBO0lBQUEsU0FBQSxHQUFhLENBQUksSUFBQyxDQUFBLEtBQUssQ0FBQztJQUN4QixJQUFDLENBQUEsUUFBRCxDQUFVO01BQUMsV0FBQSxFQUFhLFNBQWQ7S0FBVjtJQUNBLElBQUEsQ0FBYyxJQUFkO0FBQUEsYUFBQTs7SUFDQSxJQUFHLElBQUMsQ0FBQSxLQUFLLENBQUMsWUFBUCxJQUF3QixJQUFJLENBQUMsTUFBaEM7YUFDRSxJQUFJLENBQUMsTUFBTCxDQUFBLEVBREY7S0FBQSxNQUFBO2FBR0UsSUFBQyxDQUFBLEtBQUssQ0FBQyxRQUFQLENBQWdCLElBQWhCLEVBSEY7O0VBSk0sQ0FyQlI7RUE4QkEsTUFBQSxFQUFRLFNBQUE7QUFDTixRQUFBO0lBQUEsU0FBQSxHQUFlLElBQUMsQ0FBQSxLQUFLLENBQUMsV0FBVixHQUEyQixjQUEzQixHQUErQztJQUMzRCxNQUFBLEdBQVMsQ0FBQSxTQUFBLEtBQUE7YUFBQSxTQUFDLElBQUQ7ZUFDTCxTQUFBO2lCQUFHLEtBQUMsQ0FBQSxNQUFELENBQVEsSUFBUjtRQUFIO01BREs7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBO1dBRVIsR0FBQSxDQUFJO01BQUMsU0FBQSxFQUFXLE1BQVo7S0FBSixFQUNFLElBQUEsQ0FBSztNQUFDLFNBQUEsRUFBVyxhQUFaO01BQTJCLE9BQUEsRUFBUyxDQUFBLFNBQUEsS0FBQTtlQUFBLFNBQUE7aUJBQUcsS0FBQyxDQUFBLE1BQUQsQ0FBUSxJQUFSO1FBQUg7TUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQXBDO0tBQUwsRUFDQyxJQUFDLENBQUEsS0FBSyxDQUFDLE1BRFIsRUFFRSxDQUFBLENBQUU7TUFBQyxTQUFBLEVBQVcsbUJBQVo7S0FBRixDQUZGLENBREYsMkNBS2dCLENBQUUsZ0JBQWQsR0FBdUIsQ0FBMUIsR0FDRyxHQUFBLENBQUk7TUFBQyxTQUFBLEVBQVcsU0FBWjtNQUF1QixZQUFBLEVBQWMsSUFBQyxDQUFBLElBQXRDO01BQTRDLFlBQUEsRUFBYyxJQUFDLENBQUEsTUFBM0Q7S0FBSixFQUNFLEVBQUEsQ0FBRyxFQUFIOztBQUNDO0FBQUE7V0FBQSxzQ0FBQTs7cUJBQUMsWUFBQSxDQUFhO1VBQUMsR0FBQSxFQUFLLElBQUksQ0FBQyxJQUFMLElBQWEsSUFBbkI7VUFBeUIsSUFBQSxFQUFNLElBQS9CO1VBQXFDLE1BQUEsRUFBUSxJQUFDLENBQUEsTUFBOUM7VUFBc0QsWUFBQSxFQUFjLElBQUMsQ0FBQSxLQUFLLENBQUMsWUFBM0U7U0FBYjtBQUFEOztpQkFERCxDQURGLENBREgsR0FBQSxNQUxEO0VBSkssQ0E5QlI7Q0FGUzs7QUFpRFgsTUFBTSxDQUFDLE9BQVAsR0FBaUI7Ozs7O0FDeEVqQixJQUFBOztBQUFBLGNBQUEsR0FBaUIsT0FBQSxDQUFRLG1CQUFSOztBQUNqQixhQUFBLEdBQWdCLENBQUMsT0FBQSxDQUFRLGlDQUFSLENBQUQsQ0FBMkMsQ0FBQzs7QUFFNUQsRUFBQSxHQUFLLE9BQUEsQ0FBUSxvQkFBUjs7QUFFTCxNQUFxQyxLQUFLLENBQUMsR0FBM0MsRUFBQyxVQUFBLEdBQUQsRUFBTSxVQUFBLEdBQU4sRUFBVyxRQUFBLENBQVgsRUFBYyxXQUFBLElBQWQsRUFBb0IsWUFBQSxLQUFwQixFQUEyQixhQUFBOztBQUUzQixZQUFBLEdBQWUsS0FBSyxDQUFDLGFBQU4sQ0FBb0IsS0FBSyxDQUFDLFdBQU4sQ0FDakM7RUFBQSxXQUFBLEVBQWEsY0FBYjtFQUVBLGtCQUFBLEVBQW9CLFNBQUE7V0FDbEIsSUFBQyxDQUFBLFNBQUQsR0FBYTtFQURLLENBRnBCO0VBS0EsWUFBQSxFQUFlLFNBQUMsQ0FBRDtBQUNiLFFBQUE7SUFBQSxDQUFDLENBQUMsY0FBRixDQUFBO0lBQ0EsQ0FBQyxDQUFDLGVBQUYsQ0FBQTtJQUNBLEdBQUEsR0FBTSxDQUFLLElBQUEsSUFBQSxDQUFBLENBQUwsQ0FBWSxDQUFDLE9BQWIsQ0FBQTtJQUNOLElBQUMsQ0FBQSxLQUFLLENBQUMsWUFBUCxDQUFvQixJQUFDLENBQUEsS0FBSyxDQUFDLFFBQTNCO0lBQ0EsSUFBRyxHQUFBLEdBQU0sSUFBQyxDQUFBLFNBQVAsSUFBb0IsR0FBdkI7TUFDRSxJQUFDLENBQUEsS0FBSyxDQUFDLGFBQVAsQ0FBQSxFQURGOztXQUVBLElBQUMsQ0FBQSxTQUFELEdBQWE7RUFQQSxDQUxmO0VBY0EsTUFBQSxFQUFRLFNBQUE7V0FDTCxHQUFBLENBQUk7TUFBQyxHQUFBLEVBQUssSUFBQyxDQUFBLEtBQUssQ0FBQyxHQUFiO01BQWtCLFNBQUEsRUFBVyxDQUFJLElBQUMsQ0FBQSxLQUFLLENBQUMsUUFBVixHQUF3QixVQUF4QixHQUF3QyxFQUF6QyxDQUE3QjtNQUEyRSxPQUFBLEVBQVMsSUFBQyxDQUFBLFlBQXJGO0tBQUosRUFBd0csSUFBQyxDQUFBLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBeEg7RUFESyxDQWRSO0NBRGlDLENBQXBCOztBQWtCZixRQUFBLEdBQVcsS0FBSyxDQUFDLGFBQU4sQ0FBb0IsS0FBSyxDQUFDLFdBQU4sQ0FDN0I7RUFBQSxXQUFBLEVBQWEsVUFBYjtFQUVBLGVBQUEsRUFBaUIsU0FBQTtXQUNmO01BQUEsT0FBQSxFQUFTLElBQVQ7O0VBRGUsQ0FGakI7RUFLQSxpQkFBQSxFQUFtQixTQUFBO1dBQ2pCLElBQUMsQ0FBQSxJQUFELENBQUE7RUFEaUIsQ0FMbkI7RUFRQSxJQUFBLEVBQU0sU0FBQTtXQUNKLElBQUMsQ0FBQSxLQUFLLENBQUMsUUFBUSxDQUFDLElBQWhCLENBQXFCLElBQUMsQ0FBQSxLQUFLLENBQUMsTUFBNUIsRUFBb0MsQ0FBQSxTQUFBLEtBQUE7YUFBQSxTQUFDLEdBQUQsRUFBTSxJQUFOO1FBQ2xDLElBQXFCLEdBQXJCO0FBQUEsaUJBQU8sS0FBQSxDQUFNLEdBQU4sRUFBUDs7UUFDQSxLQUFDLENBQUEsUUFBRCxDQUNFO1VBQUEsT0FBQSxFQUFTLEtBQVQ7U0FERjtlQUVBLEtBQUMsQ0FBQSxLQUFLLENBQUMsVUFBUCxDQUFrQixJQUFsQjtNQUprQztJQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBcEM7RUFESSxDQVJOO0VBZUEsTUFBQSxFQUFRLFNBQUE7QUFDTixRQUFBO1dBQUMsR0FBQSxDQUFJO01BQUMsU0FBQSxFQUFXLFVBQVo7S0FBSjs7TUFDQyxJQUFHLElBQUMsQ0FBQSxLQUFLLENBQUMsT0FBVjtlQUNFLEVBQUEsQ0FBRyxzQkFBSCxFQURGO09BQUEsTUFBQTtBQUdFO0FBQUE7YUFBQSw4Q0FBQTs7dUJBQ0csWUFBQSxDQUFhO1lBQUMsR0FBQSxFQUFLLENBQU47WUFBUyxRQUFBLEVBQVUsUUFBbkI7WUFBNkIsUUFBQSxFQUFVLElBQUMsQ0FBQSxLQUFLLENBQUMsWUFBUCxLQUF1QixRQUE5RDtZQUF3RSxZQUFBLEVBQWMsSUFBQyxDQUFBLEtBQUssQ0FBQyxZQUE3RjtZQUEyRyxhQUFBLEVBQWUsSUFBQyxDQUFBLEtBQUssQ0FBQyxhQUFqSTtXQUFiO0FBREg7dUJBSEY7O2lCQUREO0VBREssQ0FmUjtDQUQ2QixDQUFwQjs7QUF5QlgsYUFBQSxHQUFnQixLQUFLLENBQUMsV0FBTixDQUNkO0VBQUEsV0FBQSxFQUFhLGVBQWI7RUFFQSxNQUFBLEVBQVEsQ0FBQyxjQUFELENBRlI7RUFJQSxlQUFBLEVBQWlCLFNBQUE7QUFDZixRQUFBO1dBQUE7TUFBQSxNQUFBLDJEQUFvQyxDQUFFLGdCQUE5QixJQUF3QyxJQUFoRDtNQUNBLFFBQUEsRUFBVSxJQUFDLENBQUEsS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsUUFEOUI7TUFFQSxRQUFBLDJEQUFzQyxDQUFFLGNBQTlCLElBQXNDLEVBRmhEO01BR0EsSUFBQSxFQUFNLEVBSE47O0VBRGUsQ0FKakI7RUFVQSxrQkFBQSxFQUFvQixTQUFBO1dBQ2xCLElBQUMsQ0FBQSxNQUFELEdBQVUsSUFBQyxDQUFBLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBZCxLQUF3QjtFQURoQixDQVZwQjtFQWFBLGVBQUEsRUFBaUIsU0FBQyxDQUFEO0FBQ2YsUUFBQTtJQUFBLFFBQUEsR0FBVyxDQUFDLENBQUMsTUFBTSxDQUFDO0lBQ3BCLFFBQUEsR0FBVyxJQUFDLENBQUEsWUFBRCxDQUFjLFFBQWQ7V0FDWCxJQUFDLENBQUEsUUFBRCxDQUNFO01BQUEsUUFBQSxFQUFVLFFBQVY7TUFDQSxRQUFBLEVBQVUsUUFEVjtLQURGO0VBSGUsQ0FiakI7RUFvQkEsVUFBQSxFQUFZLFNBQUMsSUFBRDtXQUNWLElBQUMsQ0FBQSxRQUFELENBQVU7TUFBQSxJQUFBLEVBQU0sSUFBTjtLQUFWO0VBRFUsQ0FwQlo7RUF1QkEsWUFBQSxFQUFjLFNBQUMsUUFBRDtJQUNaLHdCQUFHLFFBQVEsQ0FBRSxjQUFWLEtBQWtCLGFBQWEsQ0FBQyxJQUFuQztNQUNFLElBQUMsQ0FBQSxRQUFELENBQVU7UUFBQSxRQUFBLEVBQVUsUUFBUSxDQUFDLElBQW5CO09BQVYsRUFERjs7V0FFQSxJQUFDLENBQUEsUUFBRCxDQUFVO01BQUEsUUFBQSxFQUFVLFFBQVY7S0FBVjtFQUhZLENBdkJkO0VBNEJBLE9BQUEsRUFBUyxTQUFBO0FBQ1AsUUFBQTtJQUFBLElBQUcsQ0FBSSxJQUFDLENBQUEsS0FBSyxDQUFDLFFBQWQ7TUFDRSxRQUFBLEdBQVcsQ0FBQyxDQUFDLElBQUYsQ0FBTyxJQUFDLENBQUEsS0FBSyxDQUFDLFFBQWQ7TUFDWCxJQUFDLENBQUEsS0FBSyxDQUFDLFFBQVAsR0FBa0IsSUFBQyxDQUFBLFlBQUQsQ0FBYyxRQUFkO01BQ2xCLElBQUcsQ0FBSSxJQUFDLENBQUEsS0FBSyxDQUFDLFFBQWQ7UUFDRSxJQUFHLElBQUMsQ0FBQSxNQUFKO1VBQ0UsS0FBQSxDQUFTLElBQUMsQ0FBQSxLQUFLLENBQUMsUUFBUixHQUFpQixZQUF6QixFQURGO1NBQUEsTUFBQTtVQUdFLElBQUMsQ0FBQSxLQUFLLENBQUMsUUFBUCxHQUFzQixJQUFBLGFBQUEsQ0FDcEI7WUFBQSxJQUFBLEVBQU0sUUFBTjtZQUNBLElBQUEsRUFBTSxHQUFBLEdBQUksUUFEVjtZQUVBLElBQUEsRUFBTSxhQUFhLENBQUMsSUFGcEI7WUFHQSxRQUFBLEVBQVUsSUFBQyxDQUFBLEtBQUssQ0FBQyxRQUhqQjtXQURvQixFQUh4QjtTQURGO09BSEY7O0lBWUEsSUFBRyxJQUFDLENBQUEsS0FBSyxDQUFDLFFBQVY7TUFFRSxJQUFDLENBQUEsS0FBSyxDQUFDLFFBQVEsQ0FBQyxRQUFoQixHQUEyQixJQUFDLENBQUEsS0FBSyxDQUFDO01BQ2xDLElBQUMsQ0FBQSxLQUFLLENBQUMsTUFBTSxDQUFDLFFBQWQsQ0FBdUIsSUFBQyxDQUFBLEtBQUssQ0FBQyxRQUE5QjthQUNBLElBQUMsQ0FBQSxLQUFLLENBQUMsS0FBUCxDQUFBLEVBSkY7O0VBYk8sQ0E1QlQ7RUErQ0EsTUFBQSxFQUFRLFNBQUE7SUFDTixJQUFHLElBQUMsQ0FBQSxLQUFLLENBQUMsUUFBUCxJQUFvQixJQUFDLENBQUEsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFoQixLQUEwQixhQUFhLENBQUMsTUFBNUQsSUFBdUUsT0FBQSxDQUFRLEVBQUEsQ0FBRyw2QkFBSCxFQUFrQztNQUFDLFFBQUEsRUFBVSxJQUFDLENBQUEsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUEzQjtLQUFsQyxDQUFSLENBQTFFO2FBQ0UsSUFBQyxDQUFBLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBaEIsQ0FBdUIsSUFBQyxDQUFBLEtBQUssQ0FBQyxRQUE5QixFQUF3QyxDQUFBLFNBQUEsS0FBQTtlQUFBLFNBQUMsR0FBRDtBQUN0QyxjQUFBO1VBQUEsSUFBRyxDQUFJLEdBQVA7WUFDRSxJQUFBLEdBQU8sS0FBQyxDQUFBLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBWixDQUFrQixDQUFsQjtZQUNQLEtBQUEsR0FBUSxJQUFJLENBQUMsT0FBTCxDQUFhLEtBQUMsQ0FBQSxLQUFLLENBQUMsUUFBcEI7WUFDUixJQUFJLENBQUMsTUFBTCxDQUFZLEtBQVosRUFBbUIsQ0FBbkI7bUJBQ0EsS0FBQyxDQUFBLFFBQUQsQ0FDRTtjQUFBLElBQUEsRUFBTSxJQUFOO2NBQ0EsUUFBQSxFQUFVLElBRFY7Y0FFQSxRQUFBLEVBQVUsRUFGVjthQURGLEVBSkY7O1FBRHNDO01BQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUF4QyxFQURGOztFQURNLENBL0NSO0VBMkRBLE1BQUEsRUFBUSxTQUFBO1dBQ04sSUFBQyxDQUFBLEtBQUssQ0FBQyxLQUFQLENBQUE7RUFETSxDQTNEUjtFQThEQSxZQUFBLEVBQWMsU0FBQyxRQUFEO0FBQ1osUUFBQTtBQUFBO0FBQUEsU0FBQSxzQ0FBQTs7TUFDRSxJQUFHLFFBQVEsQ0FBQyxJQUFULEtBQWlCLFFBQXBCO0FBQ0UsZUFBTyxTQURUOztBQURGO1dBR0E7RUFKWSxDQTlEZDtFQW9FQSxhQUFBLEVBQWUsU0FBQyxDQUFEO0lBQ2IsSUFBRyxDQUFDLENBQUMsT0FBRixLQUFhLEVBQWIsSUFBb0IsQ0FBSSxJQUFDLENBQUEsZUFBRCxDQUFBLENBQTNCO2FBQ0UsSUFBQyxDQUFBLE9BQUQsQ0FBQSxFQURGOztFQURhLENBcEVmO0VBd0VBLGVBQUEsRUFBaUIsU0FBQTtXQUNmLENBQUMsSUFBQyxDQUFBLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBaEIsS0FBMEIsQ0FBM0IsQ0FBQSxJQUFpQyxDQUFDLElBQUMsQ0FBQSxNQUFELElBQVksQ0FBSSxJQUFDLENBQUEsS0FBSyxDQUFDLFFBQXhCO0VBRGxCLENBeEVqQjtFQTJFQSxvQkFBQSxFQUFzQixTQUFBO0FBQ3BCLFFBQUE7SUFBQSxlQUFBLEdBQWtCLElBQUMsQ0FBQSxlQUFELENBQUE7SUFDbEIsY0FBQSxHQUFpQixDQUFDLElBQUMsQ0FBQSxLQUFLLENBQUMsUUFBUCxLQUFtQixJQUFwQixDQUFBLElBQTZCLENBQUMsSUFBQyxDQUFBLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBaEIsS0FBd0IsYUFBYSxDQUFDLE1BQXZDO1dBRTdDLEdBQUEsQ0FBSTtNQUFDLFNBQUEsRUFBVyxXQUFaO0tBQUosRUFDRSxLQUFBLENBQU07TUFBQyxJQUFBLEVBQU0sTUFBUDtNQUFlLEtBQUEsRUFBTyxJQUFDLENBQUEsS0FBSyxDQUFDLFFBQTdCO01BQXVDLFdBQUEsRUFBYyxFQUFBLENBQUcsdUJBQUgsQ0FBckQ7TUFBa0YsUUFBQSxFQUFVLElBQUMsQ0FBQSxlQUE3RjtNQUE4RyxTQUFBLEVBQVcsSUFBQyxDQUFBLGFBQTFIO0tBQU4sQ0FERixFQUVFLFFBQUEsQ0FBUztNQUFDLFFBQUEsRUFBVSxJQUFDLENBQUEsS0FBSyxDQUFDLFFBQWxCO01BQTRCLE1BQUEsRUFBUSxJQUFDLENBQUEsS0FBSyxDQUFDLE1BQTNDO01BQW1ELFlBQUEsRUFBYyxJQUFDLENBQUEsS0FBSyxDQUFDLFFBQXhFO01BQWtGLFlBQUEsRUFBYyxJQUFDLENBQUEsWUFBakc7TUFBK0csYUFBQSxFQUFlLElBQUMsQ0FBQSxPQUEvSDtNQUF3SSxJQUFBLEVBQU0sSUFBQyxDQUFBLEtBQUssQ0FBQyxJQUFySjtNQUEySixVQUFBLEVBQVksSUFBQyxDQUFBLFVBQXhLO0tBQVQsQ0FGRixFQUdFLEdBQUEsQ0FBSTtNQUFDLFNBQUEsRUFBVyxTQUFaO0tBQUosRUFDRSxNQUFBLENBQU87TUFBQyxPQUFBLEVBQVMsSUFBQyxDQUFBLE9BQVg7TUFBb0IsUUFBQSxFQUFVLGVBQTlCO01BQStDLFNBQUEsRUFBYyxlQUFILEdBQXdCLFVBQXhCLEdBQXdDLEVBQWxHO0tBQVAsRUFBaUgsSUFBQyxDQUFBLE1BQUosR0FBaUIsRUFBQSxDQUFHLG1CQUFILENBQWpCLEdBQStDLEVBQUEsQ0FBRyxtQkFBSCxDQUE3SixDQURGLEVBRUksSUFBQyxDQUFBLEtBQUssQ0FBQyxRQUFRLENBQUMsR0FBaEIsQ0FBb0IsUUFBcEIsQ0FBSCxHQUNHLE1BQUEsQ0FBTztNQUFDLE9BQUEsRUFBUyxJQUFDLENBQUEsTUFBWDtNQUFtQixRQUFBLEVBQVUsY0FBN0I7TUFBNkMsU0FBQSxFQUFjLGNBQUgsR0FBdUIsVUFBdkIsR0FBdUMsRUFBL0Y7S0FBUCxFQUE0RyxFQUFBLENBQUcscUJBQUgsQ0FBNUcsQ0FESCxHQUFBLE1BRkQsRUFJRSxNQUFBLENBQU87TUFBQyxPQUFBLEVBQVMsSUFBQyxDQUFBLE1BQVg7S0FBUCxFQUE0QixFQUFBLENBQUcscUJBQUgsQ0FBNUIsQ0FKRixDQUhGO0VBSm1CLENBM0V0QjtDQURjOztBQTJGaEIsTUFBTSxDQUFDLE9BQVAsR0FBaUI7Ozs7O0FDN0lqQixJQUFBOztBQUFBLE1BQWlCLEtBQUssQ0FBQyxHQUF2QixFQUFDLFVBQUEsR0FBRCxFQUFNLFFBQUEsQ0FBTixFQUFTLFdBQUE7O0FBRVQsUUFBQSxHQUFXLEtBQUssQ0FBQyxhQUFOLENBQW9CLE9BQUEsQ0FBUSxpQkFBUixDQUFwQjs7QUFFWCxNQUFNLENBQUMsT0FBUCxHQUFpQixLQUFLLENBQUMsV0FBTixDQUVmO0VBQUEsV0FBQSxFQUFhLFNBQWI7RUFFQSxJQUFBLEVBQU0sU0FBQTtXQUNKLE1BQU0sQ0FBQyxJQUFQLENBQVksSUFBQyxDQUFBLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBM0IsRUFBaUMsUUFBakM7RUFESSxDQUZOO0VBS0EsTUFBQSxFQUFRLFNBQUE7V0FDTCxHQUFBLENBQUk7TUFBQyxTQUFBLEVBQVcsVUFBWjtLQUFKLEVBQ0UsR0FBQSxDQUFJO01BQUMsU0FBQSxFQUFXLGVBQVo7S0FBSixFQUNFLFFBQUEsQ0FBUztNQUNSLE1BQUEsRUFBUSxJQUFDLENBQUEsS0FBSyxDQUFDLFFBRFA7TUFFUixLQUFBLEVBQU8sSUFBQyxDQUFBLEtBQUssQ0FBQyxLQUZOO01BR1IsU0FBQSxFQUFVLDJCQUhGO0tBQVQsQ0FERixFQUtJLElBQUMsQ0FBQSxLQUFLLENBQUMsVUFBVixHQUNHLElBQUEsQ0FBSztNQUFDLFNBQUEsRUFBVyx1QkFBQSxHQUF3QixJQUFDLENBQUEsS0FBSyxDQUFDLFVBQVUsQ0FBQyxJQUF0RDtLQUFMLEVBQW9FLElBQUMsQ0FBQSxLQUFLLENBQUMsVUFBVSxDQUFDLE9BQXRGLENBREgsR0FBQSxNQUxELENBREYsRUFTRSxHQUFBLENBQUk7TUFBQyxTQUFBLEVBQVcsZ0JBQVo7S0FBSixFQUNJLElBQUMsQ0FBQSxLQUFLLENBQUMsT0FBTyxDQUFDLElBQWxCLEdBQ0csSUFBQSxDQUFLO01BQUMsU0FBQSxFQUFXLGVBQVo7S0FBTCxFQUFtQyxJQUFDLENBQUEsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFsRCxDQURILEdBQUEsTUFERCxFQUdJLElBQUMsQ0FBQSxLQUFLLENBQUMsUUFBUCxJQUFvQixJQUFDLENBQUEsS0FBSyxDQUFDLFFBQVEsQ0FBQyxVQUFoQixDQUFBLENBQXZCLEdBQ0UsSUFBQyxDQUFBLEtBQUssQ0FBQyxRQUFRLENBQUMsVUFBaEIsQ0FBQSxDQURGLEdBQUEsTUFIRCxFQUtJLElBQUMsQ0FBQSxLQUFLLENBQUMsT0FBTyxDQUFDLElBQWxCLEdBQ0csQ0FBQSxDQUFFO01BQUMsS0FBQSxFQUFPO1FBQUMsUUFBQSxFQUFVLE1BQVg7T0FBUjtNQUE0QixTQUFBLEVBQVcscUJBQXZDO01BQThELE9BQUEsRUFBUyxJQUFDLENBQUEsSUFBeEU7S0FBRixDQURILEdBQUEsTUFMRCxDQVRGO0VBREssQ0FMUjtDQUZlOzs7OztBQ0pqQixJQUFBOztBQUFBLEtBQUEsR0FBUSxLQUFLLENBQUMsYUFBTixDQUFvQixPQUFBLENBQVEsY0FBUixDQUFwQjs7QUFDUixNQUFXLEtBQUssQ0FBQyxHQUFqQixFQUFDLFVBQUEsR0FBRCxFQUFNLFFBQUE7O0FBRU4sTUFBTSxDQUFDLE9BQVAsR0FBaUIsS0FBSyxDQUFDLFdBQU4sQ0FFZjtFQUFBLFdBQUEsRUFBYSxhQUFiO0VBRUEsS0FBQSxFQUFPLFNBQUE7QUFDTCxRQUFBO2lFQUFNLENBQUM7RUFERixDQUZQO0VBS0EsTUFBQSxFQUFRLFNBQUE7V0FDTCxLQUFBLENBQU07TUFBQyxLQUFBLEVBQU8sSUFBQyxDQUFBLEtBQUssQ0FBQyxLQUFmO0tBQU4sRUFDRSxHQUFBLENBQUk7TUFBQyxTQUFBLEVBQVcsY0FBWjtLQUFKLEVBQ0UsR0FBQSxDQUFJO01BQUMsU0FBQSxFQUFXLHNCQUFaO0tBQUosRUFDRSxHQUFBLENBQUk7TUFBQyxTQUFBLEVBQVcsb0JBQVo7S0FBSixFQUNFLENBQUEsQ0FBRTtNQUFDLFNBQUEsRUFBVyxrQ0FBWjtNQUFnRCxPQUFBLEVBQVMsSUFBQyxDQUFBLEtBQTFEO0tBQUYsQ0FERixFQUVDLElBQUMsQ0FBQSxLQUFLLENBQUMsS0FBUCxJQUFnQixpQkFGakIsQ0FERixFQUtFLEdBQUEsQ0FBSTtNQUFDLFNBQUEsRUFBVyx3QkFBWjtLQUFKLEVBQTJDLElBQUMsQ0FBQSxLQUFLLENBQUMsUUFBbEQsQ0FMRixDQURGLENBREY7RUFESyxDQUxSO0NBRmU7Ozs7O0FDSGpCLElBQUE7O0FBQUEsV0FBQSxHQUFjLEtBQUssQ0FBQyxhQUFOLENBQW9CLE9BQUEsQ0FBUSxxQkFBUixDQUFwQjs7QUFDZCxXQUFBLEdBQWMsS0FBSyxDQUFDLGFBQU4sQ0FBb0IsT0FBQSxDQUFRLHFCQUFSLENBQXBCOztBQUVkLE1BQU0sQ0FBQyxPQUFQLEdBQWlCLEtBQUssQ0FBQyxXQUFOLENBRWY7RUFBQSxXQUFBLEVBQWEsdUJBQWI7RUFFQSxNQUFBLEVBQVEsU0FBQTtXQUNMLFdBQUEsQ0FBWTtNQUFDLEtBQUEsRUFBTyxJQUFDLENBQUEsS0FBSyxDQUFDLEtBQWY7TUFBc0IsS0FBQSxFQUFPLElBQUMsQ0FBQSxLQUFLLENBQUMsS0FBcEM7S0FBWixFQUNFLFdBQUEsQ0FBWTtNQUFDLElBQUEsRUFBTSxJQUFDLENBQUEsS0FBSyxDQUFDLElBQWQ7TUFBb0IsZ0JBQUEsRUFBa0IsSUFBQyxDQUFBLEtBQUssQ0FBQyxnQkFBN0M7S0FBWixDQURGO0VBREssQ0FGUjtDQUZlOzs7OztBQ0hqQixJQUFBOztBQUFDLE1BQU8sS0FBSyxDQUFDLElBQWI7O0FBRUQsTUFBTSxDQUFDLE9BQVAsR0FBaUIsS0FBSyxDQUFDLFdBQU4sQ0FFZjtFQUFBLFdBQUEsRUFBYSxPQUFiO0VBRUEsY0FBQSxFQUFnQixTQUFDLENBQUQ7QUFDZCxRQUFBO0lBQUEsSUFBRyxDQUFDLENBQUMsT0FBRixLQUFhLEVBQWhCO21FQUNRLENBQUMsaUJBRFQ7O0VBRGMsQ0FGaEI7RUFNQSxpQkFBQSxFQUFtQixTQUFBO1dBQ2pCLENBQUEsQ0FBRSxNQUFGLENBQVMsQ0FBQyxFQUFWLENBQWEsT0FBYixFQUFzQixJQUFDLENBQUEsY0FBdkI7RUFEaUIsQ0FObkI7RUFTQSxvQkFBQSxFQUFzQixTQUFBO1dBQ3BCLENBQUEsQ0FBRSxNQUFGLENBQVMsQ0FBQyxHQUFWLENBQWMsT0FBZCxFQUF1QixJQUFDLENBQUEsY0FBeEI7RUFEb0IsQ0FUdEI7RUFZQSxNQUFBLEVBQVEsU0FBQTtXQUNMLEdBQUEsQ0FBSTtNQUFDLFNBQUEsRUFBVyxPQUFaO0tBQUosRUFDRSxHQUFBLENBQUk7TUFBQyxTQUFBLEVBQVcsa0JBQVo7S0FBSixDQURGLEVBRUUsR0FBQSxDQUFJO01BQUMsU0FBQSxFQUFXLGVBQVo7S0FBSixFQUFrQyxJQUFDLENBQUEsS0FBSyxDQUFDLFFBQXpDLENBRkY7RUFESyxDQVpSO0NBRmU7Ozs7O0FDRmpCLElBQUE7O0FBQUEsaUJBQUEsR0FBb0IsS0FBSyxDQUFDLGFBQU4sQ0FBb0IsT0FBQSxDQUFRLDRCQUFSLENBQXBCOztBQUNwQixXQUFBLEdBQWMsT0FBQSxDQUFRLHFCQUFSOztBQUNkLGFBQUEsR0FBZ0IsQ0FBQyxPQUFBLENBQVEsaUNBQVIsQ0FBRCxDQUEyQyxDQUFDOztBQUM1RCxhQUFBLEdBQWdCLEtBQUssQ0FBQyxhQUFOLENBQW9CLE9BQUEsQ0FBUSx3QkFBUixDQUFwQjs7QUFDaEIsdUJBQUEsR0FBMEIsS0FBSyxDQUFDLGFBQU4sQ0FBb0IsT0FBQSxDQUFRLG1DQUFSLENBQXBCOztBQUUxQixFQUFBLEdBQUssT0FBQSxDQUFRLG9CQUFSOztBQUVMLE1BQU0sQ0FBQyxPQUFQLEdBQWlCLEtBQUssQ0FBQyxXQUFOLENBQ2Y7RUFBQSxXQUFBLEVBQWEsc0JBQWI7RUFFQSxNQUFBLEVBQVMsU0FBQTtBQUNQLFFBQUE7SUFBQTtBQUE2QixjQUFPLElBQUMsQ0FBQSxLQUFLLENBQUMsTUFBTSxDQUFDLE1BQXJCO0FBQUEsYUFDdEIsVUFEc0I7aUJBQ04sQ0FBQyxNQUFELEVBQVMsYUFBVDtBQURNLGFBRXRCLFVBRnNCO0FBQUEsYUFFVixZQUZVO2lCQUVRLENBQUMsTUFBRCxFQUFTLGFBQVQ7QUFGUixhQUd0QixnQkFIc0I7aUJBR0EsQ0FBQyxJQUFELEVBQU8sdUJBQVA7QUFIQTtpQkFBN0IsRUFBQyxtQkFBRCxFQUFhO0lBS2IsSUFBQSxHQUFPO0lBQ1AsZ0JBQUEsR0FBbUI7QUFDbkI7QUFBQSxTQUFBLDhDQUFBOztNQUNFLElBQUcsQ0FBSSxVQUFKLElBQWtCLFFBQVEsQ0FBQyxZQUFhLENBQUEsVUFBQSxDQUEzQztRQUNFLFNBQUEsR0FBWSxZQUFBLENBQ1Y7VUFBQSxNQUFBLEVBQVEsSUFBQyxDQUFBLEtBQUssQ0FBQyxNQUFmO1VBQ0EsTUFBQSxFQUFRLElBQUMsQ0FBQSxLQUFLLENBQUMsTUFEZjtVQUVBLEtBQUEsRUFBTyxJQUFDLENBQUEsS0FBSyxDQUFDLEtBRmQ7VUFHQSxRQUFBLEVBQVUsUUFIVjtTQURVO1FBS1osSUFBSSxDQUFDLElBQUwsQ0FBVSxXQUFXLENBQUMsR0FBWixDQUFnQjtVQUFDLEdBQUEsRUFBSyxDQUFOO1VBQVMsS0FBQSxFQUFRLEVBQUEsQ0FBRyxRQUFRLENBQUMsV0FBWixDQUFqQjtVQUEyQyxTQUFBLEVBQVcsU0FBdEQ7U0FBaEIsQ0FBVjtRQUNBLElBQUcsUUFBQSw4REFBd0MsQ0FBRSxrQkFBN0M7VUFDRSxnQkFBQSxHQUFtQixFQURyQjtTQVBGOztBQURGO1dBV0MsaUJBQUEsQ0FBa0I7TUFBQyxLQUFBLEVBQVEsRUFBQSxDQUFHLElBQUMsQ0FBQSxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQWpCLENBQVQ7TUFBa0MsS0FBQSxFQUFPLElBQUMsQ0FBQSxLQUFLLENBQUMsS0FBaEQ7TUFBdUQsSUFBQSxFQUFNLElBQTdEO01BQW1FLGdCQUFBLEVBQWtCLGdCQUFyRjtLQUFsQjtFQW5CTSxDQUZUO0NBRGU7Ozs7O0FDUmpCLElBQUE7O0FBQUEsTUFBMEIsS0FBSyxDQUFDLEdBQWhDLEVBQUMsVUFBQSxHQUFELEVBQU0sWUFBQSxLQUFOLEVBQWEsUUFBQSxDQUFiLEVBQWdCLGFBQUE7O0FBRWhCLFdBQUEsR0FBYyxLQUFLLENBQUMsYUFBTixDQUFvQixPQUFBLENBQVEscUJBQVIsQ0FBcEI7O0FBRWQsRUFBQSxHQUFLLE9BQUEsQ0FBUSxvQkFBUjs7QUFFTCxNQUFNLENBQUMsT0FBUCxHQUFpQixLQUFLLENBQUMsV0FBTixDQUVmO0VBQUEsV0FBQSxFQUFhLGtCQUFiO0VBRUEsZUFBQSxFQUFpQixTQUFBO1dBQ2Y7TUFBQSxRQUFBLEVBQVUsSUFBQyxDQUFBLElBQUQsQ0FBTSxJQUFDLENBQUEsS0FBSyxDQUFDLFFBQVAsSUFBbUIsRUFBekIsQ0FBVjs7RUFEZSxDQUZqQjtFQUtBLGlCQUFBLEVBQW1CLFNBQUE7SUFDakIsSUFBQyxDQUFBLFFBQUQsR0FBWSxLQUFLLENBQUMsV0FBTixDQUFrQixJQUFDLENBQUEsSUFBSSxDQUFDLFFBQXhCO1dBQ1osSUFBQyxDQUFBLFFBQVEsQ0FBQyxLQUFWLENBQUE7RUFGaUIsQ0FMbkI7RUFTQSxjQUFBLEVBQWdCLFNBQUE7V0FDZCxJQUFDLENBQUEsUUFBRCxDQUFVO01BQUEsUUFBQSxFQUFVLElBQUMsQ0FBQSxJQUFELENBQU0sSUFBQyxDQUFBLFFBQVEsQ0FBQyxLQUFoQixDQUFWO0tBQVY7RUFEYyxDQVRoQjtFQVlBLElBQUEsRUFBTSxTQUFDLENBQUQ7V0FDSixDQUFDLENBQUMsT0FBRixDQUFVLFdBQVYsRUFBdUIsRUFBdkI7RUFESSxDQVpOO0VBZUEsTUFBQSxFQUFRLFNBQUMsQ0FBRDtBQUNOLFFBQUE7SUFBQSxJQUFHLElBQUMsQ0FBQSxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQWhCLEdBQXlCLENBQTVCOztZQUNRLENBQUMsU0FBVSxJQUFDLENBQUEsS0FBSyxDQUFDOzthQUN4QixJQUFDLENBQUEsS0FBSyxDQUFDLEtBQVAsQ0FBQSxFQUZGO0tBQUEsTUFBQTtNQUlFLENBQUMsQ0FBQyxjQUFGLENBQUE7YUFDQSxJQUFDLENBQUEsUUFBUSxDQUFDLEtBQVYsQ0FBQSxFQUxGOztFQURNLENBZlI7RUF1QkEsTUFBQSxFQUFRLFNBQUE7V0FDTCxXQUFBLENBQVk7TUFBQyxLQUFBLEVBQVEsRUFBQSxDQUFHLGtCQUFILENBQVQ7TUFBaUMsS0FBQSxFQUFPLElBQUMsQ0FBQSxLQUFLLENBQUMsS0FBL0M7S0FBWixFQUNFLEdBQUEsQ0FBSTtNQUFDLFNBQUEsRUFBVyxlQUFaO0tBQUosRUFDRSxLQUFBLENBQU07TUFBQyxHQUFBLEVBQUssVUFBTjtNQUFrQixXQUFBLEVBQWEsVUFBL0I7TUFBMkMsS0FBQSxFQUFPLElBQUMsQ0FBQSxLQUFLLENBQUMsUUFBekQ7TUFBbUUsUUFBQSxFQUFVLElBQUMsQ0FBQSxjQUE5RTtLQUFOLENBREYsRUFFRSxHQUFBLENBQUk7TUFBQyxTQUFBLEVBQVcsU0FBWjtLQUFKLEVBQ0UsTUFBQSxDQUFPO01BQUMsU0FBQSxFQUFXLENBQUksSUFBQyxDQUFBLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBaEIsS0FBMEIsQ0FBN0IsR0FBb0MsVUFBcEMsR0FBb0QsRUFBckQsQ0FBWjtNQUFzRSxPQUFBLEVBQVMsSUFBQyxDQUFBLE1BQWhGO0tBQVAsRUFBZ0csRUFBQSxDQUFHLHVCQUFILENBQWhHLENBREYsRUFFRSxNQUFBLENBQU87TUFBQyxPQUFBLEVBQVMsSUFBQyxDQUFBLEtBQUssQ0FBQyxLQUFqQjtLQUFQLEVBQWdDLEVBQUEsQ0FBRyx1QkFBSCxDQUFoQyxDQUZGLENBRkYsQ0FERjtFQURLLENBdkJSO0NBRmU7Ozs7O0FDTmpCLElBQUE7O0FBQUMsTUFBTyxLQUFLLENBQUMsSUFBYjs7QUFFRCx1QkFBQSxHQUEwQixLQUFLLENBQUMsYUFBTixDQUFvQixLQUFLLENBQUMsV0FBTixDQUM1QztFQUFBLFdBQUEsRUFBYSx5QkFBYjtFQUNBLE1BQUEsRUFBUSxTQUFBO1dBQUksR0FBQSxDQUFJLEVBQUosRUFBUSxpQ0FBQSxHQUFrQyxJQUFDLENBQUEsS0FBSyxDQUFDLFFBQVEsQ0FBQyxXQUExRDtFQUFKLENBRFI7Q0FENEMsQ0FBcEI7O0FBSTFCLE1BQU0sQ0FBQyxPQUFQLEdBQWlCOzs7OztBQ05qQixJQUFBOztBQUFBLE1BQW1CLEtBQUssQ0FBQyxHQUF6QixFQUFDLFVBQUEsR0FBRCxFQUFNLFNBQUEsRUFBTixFQUFVLFNBQUEsRUFBVixFQUFjLFFBQUE7O0FBRVI7RUFDUyxpQkFBQyxRQUFEOztNQUFDLFdBQVM7O0lBQ3BCLElBQUMsQ0FBQSxpQkFBQSxLQUFGLEVBQVMsSUFBQyxDQUFBLHFCQUFBO0VBREM7Ozs7OztBQUdmLEdBQUEsR0FBTSxLQUFLLENBQUMsYUFBTixDQUFvQixLQUFLLENBQUMsV0FBTixDQUV4QjtFQUFBLFdBQUEsRUFBYSxnQkFBYjtFQUVBLE9BQUEsRUFBUyxTQUFDLENBQUQ7SUFDUCxDQUFDLENBQUMsY0FBRixDQUFBO1dBQ0EsSUFBQyxDQUFBLEtBQUssQ0FBQyxVQUFQLENBQWtCLElBQUMsQ0FBQSxLQUFLLENBQUMsS0FBekI7RUFGTyxDQUZUO0VBTUEsTUFBQSxFQUFRLFNBQUE7QUFDTixRQUFBO0lBQUEsU0FBQSxHQUFlLElBQUMsQ0FBQSxLQUFLLENBQUMsUUFBVixHQUF3QixjQUF4QixHQUE0QztXQUN2RCxFQUFBLENBQUc7TUFBQyxTQUFBLEVBQVcsU0FBWjtNQUF1QixPQUFBLEVBQVMsSUFBQyxDQUFBLE9BQWpDO0tBQUgsRUFBOEMsSUFBQyxDQUFBLEtBQUssQ0FBQyxLQUFyRDtFQUZLLENBTlI7Q0FGd0IsQ0FBcEI7O0FBWU4sTUFBTSxDQUFDLE9BQVAsR0FBaUIsS0FBSyxDQUFDLFdBQU4sQ0FFZjtFQUFBLFdBQUEsRUFBYSxpQkFBYjtFQUVBLGVBQUEsRUFBaUIsU0FBQTtXQUNmO01BQUEsZ0JBQUEsRUFBa0IsSUFBQyxDQUFBLEtBQUssQ0FBQyxnQkFBUCxJQUEyQixDQUE3Qzs7RUFEZSxDQUZqQjtFQUtBLE9BQUEsRUFDRTtJQUFBLEdBQUEsRUFBSyxTQUFDLFFBQUQ7YUFBa0IsSUFBQSxPQUFBLENBQVEsUUFBUjtJQUFsQixDQUFMO0dBTkY7RUFRQSxXQUFBLEVBQWEsU0FBQyxLQUFEO1dBQ1gsSUFBQyxDQUFBLFFBQUQsQ0FBVTtNQUFBLGdCQUFBLEVBQWtCLEtBQWxCO0tBQVY7RUFEVyxDQVJiO0VBV0EsU0FBQSxFQUFXLFNBQUMsR0FBRCxFQUFNLEtBQU47V0FDUixHQUFBLENBQ0M7TUFBQSxLQUFBLEVBQU8sR0FBRyxDQUFDLEtBQVg7TUFDQSxHQUFBLEVBQUssS0FETDtNQUVBLEtBQUEsRUFBTyxLQUZQO01BR0EsUUFBQSxFQUFXLEtBQUEsS0FBUyxJQUFDLENBQUEsS0FBSyxDQUFDLGdCQUgzQjtNQUlBLFVBQUEsRUFBWSxJQUFDLENBQUEsV0FKYjtLQUREO0VBRFEsQ0FYWDtFQW9CQSxVQUFBLEVBQVksU0FBQTtBQUNWLFFBQUE7V0FBQyxHQUFBLENBQUk7TUFBQyxTQUFBLEVBQVcsZ0JBQVo7S0FBSjs7QUFDRTtBQUFBO1dBQUEsc0RBQUE7O3FCQUFBLEVBQUEsQ0FBRztVQUFDLEdBQUEsRUFBSyxLQUFOO1NBQUgsRUFBaUIsSUFBQyxDQUFBLFNBQUQsQ0FBVyxHQUFYLEVBQWdCLEtBQWhCLENBQWpCO0FBQUE7O2lCQURGO0VBRFMsQ0FwQlo7RUF5QkEsbUJBQUEsRUFBcUIsU0FBQTtBQUNuQixRQUFBO1dBQUMsR0FBQSxDQUFJO01BQUMsU0FBQSxFQUFXLHlCQUFaO0tBQUo7O0FBQ0M7QUFBQTtXQUFBLHNEQUFBOztxQkFDRyxHQUFBLENBQUk7VUFDSCxHQUFBLEVBQUssS0FERjtVQUVILEtBQUEsRUFDRTtZQUFBLE9BQUEsRUFBWSxLQUFBLEtBQVMsSUFBQyxDQUFBLEtBQUssQ0FBQyxnQkFBbkIsR0FBeUMsT0FBekMsR0FBc0QsTUFBL0Q7V0FIQztTQUFKLEVBS0MsR0FBRyxDQUFDLFNBTEw7QUFESDs7aUJBREQ7RUFEa0IsQ0F6QnJCO0VBcUNBLE1BQUEsRUFBUSxTQUFBO1dBQ0wsR0FBQSxDQUFJO01BQUMsR0FBQSxFQUFLLElBQUMsQ0FBQSxLQUFLLENBQUMsR0FBYjtNQUFrQixTQUFBLEVBQVcsY0FBN0I7S0FBSixFQUNDLElBQUMsQ0FBQSxVQUFELENBQUEsQ0FERCxFQUVDLElBQUMsQ0FBQSxtQkFBRCxDQUFBLENBRkQ7RUFESyxDQXJDUjtDQUZlIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIkFwcFZpZXcgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vdmlld3MvYXBwLXZpZXcnXG5cbkNsb3VkRmlsZU1hbmFnZXJVSU1lbnUgPSAocmVxdWlyZSAnLi91aScpLkNsb3VkRmlsZU1hbmFnZXJVSU1lbnVcbkNsb3VkRmlsZU1hbmFnZXJDbGllbnQgPSAocmVxdWlyZSAnLi9jbGllbnQnKS5DbG91ZEZpbGVNYW5hZ2VyQ2xpZW50XG5cbmNsYXNzIENsb3VkRmlsZU1hbmFnZXJcblxuICBjb25zdHJ1Y3RvcjogKG9wdGlvbnMpIC0+XG4gICAgIyBzaW5jZSB0aGUgbW9kdWxlIGV4cG9ydHMgYW4gaW5zdGFuY2Ugb2YgdGhlIGNsYXNzIHdlIG5lZWQgdG8gZmFrZSBhIGNsYXNzIHZhcmlhYmxlIGFzIGFuIGluc3RhbmNlIHZhcmlhYmxlXG4gICAgQERlZmF1bHRNZW51ID0gQ2xvdWRGaWxlTWFuYWdlclVJTWVudS5EZWZhdWx0TWVudVxuXG4gICAgQGNsaWVudCA9IG5ldyBDbG91ZEZpbGVNYW5hZ2VyQ2xpZW50KClcbiAgICBAYXBwT3B0aW9ucyA9IHt9XG5cbiAgaW5pdDogKEBhcHBPcHRpb25zLCB1c2luZ0lmcmFtZSA9IGZhbHNlKSAtPlxuICAgIEBhcHBPcHRpb25zLnVzaW5nSWZyYW1lID0gdXNpbmdJZnJhbWVcbiAgICBAY2xpZW50LnNldEFwcE9wdGlvbnMgQGFwcE9wdGlvbnNcblxuICBjcmVhdGVGcmFtZTogKEBhcHBPcHRpb25zLCBlbGVtSWQpIC0+XG4gICAgQGluaXQgQGFwcE9wdGlvbnMsIHRydWVcbiAgICBAX3JlbmRlckFwcCBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChlbGVtSWQpXG5cbiAgY2xpZW50Q29ubmVjdDogKGV2ZW50Q2FsbGJhY2spIC0+XG4gICAgaWYgbm90IEBhcHBPcHRpb25zLnVzaW5nSWZyYW1lXG4gICAgICBAX2NyZWF0ZUhpZGRlbkFwcCgpXG4gICAgQGNsaWVudC5jb25uZWN0IGV2ZW50Q2FsbGJhY2tcblxuICBfY3JlYXRlSGlkZGVuQXBwOiAtPlxuICAgIGFuY2hvciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIilcbiAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGFuY2hvcilcbiAgICBAX3JlbmRlckFwcCBhbmNob3JcblxuICBfcmVuZGVyQXBwOiAoYW5jaG9yKSAtPlxuICAgIEBhcHBPcHRpb25zLmNsaWVudCA9IEBjbGllbnRcbiAgICBSZWFjdC5yZW5kZXIgKEFwcFZpZXcgQGFwcE9wdGlvbnMpLCBhbmNob3JcblxubW9kdWxlLmV4cG9ydHMgPSBuZXcgQ2xvdWRGaWxlTWFuYWdlcigpXG4iLCJ0ciA9IHJlcXVpcmUgJy4vdXRpbHMvdHJhbnNsYXRlJ1xuaXNTdHJpbmcgPSByZXF1aXJlICcuL3V0aWxzL2lzLXN0cmluZydcblxuQ2xvdWRGaWxlTWFuYWdlclVJID0gKHJlcXVpcmUgJy4vdWknKS5DbG91ZEZpbGVNYW5hZ2VyVUlcblxuTG9jYWxTdG9yYWdlUHJvdmlkZXIgPSByZXF1aXJlICcuL3Byb3ZpZGVycy9sb2NhbHN0b3JhZ2UtcHJvdmlkZXInXG5SZWFkT25seVByb3ZpZGVyID0gcmVxdWlyZSAnLi9wcm92aWRlcnMvcmVhZG9ubHktcHJvdmlkZXInXG5Hb29nbGVEcml2ZVByb3ZpZGVyID0gcmVxdWlyZSAnLi9wcm92aWRlcnMvZ29vZ2xlLWRyaXZlLXByb3ZpZGVyJ1xuRG9jdW1lbnRTdG9yZVByb3ZpZGVyID0gcmVxdWlyZSAnLi9wcm92aWRlcnMvZG9jdW1lbnQtc3RvcmUtcHJvdmlkZXInXG5cbmNsYXNzIENsb3VkRmlsZU1hbmFnZXJDbGllbnRFdmVudFxuXG4gIGNvbnN0cnVjdG9yOiAoQHR5cGUsIEBkYXRhID0ge30sIEBjYWxsYmFjayA9IG51bGwsIEBzdGF0ZSA9IHt9KSAtPlxuXG5jbGFzcyBDbG91ZEZpbGVNYW5hZ2VyQ2xpZW50XG5cbiAgY29uc3RydWN0b3I6IChvcHRpb25zKSAtPlxuICAgIEBzdGF0ZSA9XG4gICAgICBhdmFpbGFibGVQcm92aWRlcnM6IFtdXG4gICAgQF9yZXNldFN0YXRlKClcbiAgICBAX3VpID0gbmV3IENsb3VkRmlsZU1hbmFnZXJVSSBAXG5cbiAgc2V0QXBwT3B0aW9uczogKEBhcHBPcHRpb25zID0ge30pLT5cbiAgICAjIGZsdGVyIGZvciBhdmFpbGFibGUgcHJvdmlkZXJzXG4gICAgYWxsUHJvdmlkZXJzID0ge31cbiAgICBmb3IgUHJvdmlkZXIgaW4gW1JlYWRPbmx5UHJvdmlkZXIsIExvY2FsU3RvcmFnZVByb3ZpZGVyLCBHb29nbGVEcml2ZVByb3ZpZGVyLCBEb2N1bWVudFN0b3JlUHJvdmlkZXJdXG4gICAgICBpZiBQcm92aWRlci5BdmFpbGFibGUoKVxuICAgICAgICBhbGxQcm92aWRlcnNbUHJvdmlkZXIuTmFtZV0gPSBQcm92aWRlclxuXG4gICAgIyBkZWZhdWx0IHRvIGFsbCBwcm92aWRlcnMgaWYgbm9uIHNwZWNpZmllZFxuICAgIGlmIG5vdCBAYXBwT3B0aW9ucy5wcm92aWRlcnNcbiAgICAgIEBhcHBPcHRpb25zLnByb3ZpZGVycyA9IFtdXG4gICAgICBmb3Igb3duIHByb3ZpZGVyTmFtZSBvZiBhbGxQcm92aWRlcnNcbiAgICAgICAgYXBwT3B0aW9ucy5wcm92aWRlcnMucHVzaCBwcm92aWRlck5hbWVcblxuICAgICMgY2hlY2sgdGhlIHByb3ZpZGVyc1xuICAgIGF2YWlsYWJsZVByb3ZpZGVycyA9IFtdXG4gICAgZm9yIHByb3ZpZGVyIGluIEBhcHBPcHRpb25zLnByb3ZpZGVyc1xuICAgICAgW3Byb3ZpZGVyTmFtZSwgcHJvdmlkZXJPcHRpb25zXSA9IGlmIGlzU3RyaW5nIHByb3ZpZGVyIHRoZW4gW3Byb3ZpZGVyLCB7fV0gZWxzZSBbcHJvdmlkZXIubmFtZSwgcHJvdmlkZXJdXG4gICAgICAjIG1lcmdlIGluIG90aGVyIG9wdGlvbnMgYXMgbmVlZGVkXG4gICAgICBwcm92aWRlck9wdGlvbnMubWltZVR5cGUgPz0gQGFwcE9wdGlvbnMubWltZVR5cGVcbiAgICAgIGlmIG5vdCBwcm92aWRlck5hbWVcbiAgICAgICAgQF9lcnJvciBcIkludmFsaWQgcHJvdmlkZXIgc3BlYyAtIG11c3QgZWl0aGVyIGJlIHN0cmluZyBvciBvYmplY3Qgd2l0aCBuYW1lIHByb3BlcnR5XCJcbiAgICAgIGVsc2VcbiAgICAgICAgaWYgYWxsUHJvdmlkZXJzW3Byb3ZpZGVyTmFtZV1cbiAgICAgICAgICBQcm92aWRlciA9IGFsbFByb3ZpZGVyc1twcm92aWRlck5hbWVdXG4gICAgICAgICAgYXZhaWxhYmxlUHJvdmlkZXJzLnB1c2ggbmV3IFByb3ZpZGVyIHByb3ZpZGVyT3B0aW9uc1xuICAgICAgICBlbHNlXG4gICAgICAgICAgQF9lcnJvciBcIlVua25vd24gcHJvdmlkZXI6ICN7cHJvdmlkZXJOYW1lfVwiXG4gICAgQF9zZXRTdGF0ZSBhdmFpbGFibGVQcm92aWRlcnM6IGF2YWlsYWJsZVByb3ZpZGVyc1xuICAgIEBfdWkuaW5pdCBAYXBwT3B0aW9ucy51aVxuXG4gICAgIyBjaGVjayBmb3IgYXV0b3NhdmVcbiAgICBpZiBvcHRpb25zLmF1dG9TYXZlSW50ZXJ2YWxcbiAgICAgIEBhdXRvU2F2ZSBvcHRpb25zLmF1dG9TYXZlSW50ZXJ2YWxcblxuICAjIHNpbmdsZSBjbGllbnQgLSB1c2VkIGJ5IHRoZSBjbGllbnQgYXBwIHRvIHJlZ2lzdGVyIGFuZCByZWNlaXZlIGNhbGxiYWNrIGV2ZW50c1xuICBjb25uZWN0OiAoQGV2ZW50Q2FsbGJhY2spIC0+XG4gICAgQF9ldmVudCAnY29ubmVjdGVkJywge2NsaWVudDogQH1cblxuICAjIHNpbmdsZSBsaXN0ZW5lciAtIHVzZWQgYnkgdGhlIFJlYWN0IG1lbnUgdmlhIHRvIHdhdGNoIGNsaWVudCBzdGF0ZSBjaGFuZ2VzXG4gIGxpc3RlbjogKEBsaXN0ZW5lckNhbGxiYWNrKSAtPlxuXG4gIGFwcGVuZE1lbnVJdGVtOiAoaXRlbSkgLT5cbiAgICBAX3VpLmFwcGVuZE1lbnVJdGVtIGl0ZW1cblxuICBzZXRNZW51QmFySW5mbzogKGluZm8pIC0+XG4gICAgQF91aS5zZXRNZW51QmFySW5mbyBpbmZvXG5cbiAgbmV3RmlsZTogKGNhbGxiYWNrID0gbnVsbCkgLT5cbiAgICBAX3Jlc2V0U3RhdGUoKVxuICAgIEBfZXZlbnQgJ25ld2VkRmlsZSdcblxuICBuZXdGaWxlRGlhbG9nOiAoY2FsbGJhY2sgPSBudWxsKSAtPlxuICAgIGlmIEBhcHBPcHRpb25zLnVpPy5uZXdGaWxlT3BlbnNJbk5ld1RhYlxuICAgICAgd2luZG93Lm9wZW4gd2luZG93LmxvY2F0aW9uLCAnX2JsYW5rJ1xuICAgIGVsc2UgaWYgQHN0YXRlLmRpcnR5XG4gICAgICBpZiBAX2F1dG9TYXZlSW50ZXJ2YWwgYW5kIEBzdGF0ZS5tZXRhZGF0YVxuICAgICAgICBAc2F2ZSgpXG4gICAgICAgIEBuZXdGaWxlKClcbiAgICAgIGVsc2UgaWYgY29uZmlybSB0ciAnfkNPTkZJUk0uVU5TQVZFRF9DSEFOR0VTJ1xuICAgICAgICBAbmV3RmlsZSgpXG4gICAgZWxzZVxuICAgICAgQG5ld0ZpbGUoKVxuXG4gIG9wZW5GaWxlOiAobWV0YWRhdGEsIGNhbGxiYWNrID0gbnVsbCkgLT5cbiAgICBpZiBtZXRhZGF0YT8ucHJvdmlkZXI/LmNhbiAnbG9hZCdcbiAgICAgIG1ldGFkYXRhLnByb3ZpZGVyLmxvYWQgbWV0YWRhdGEsIChlcnIsIGNvbnRlbnQpID0+XG4gICAgICAgIHJldHVybiBAX2Vycm9yKGVycikgaWYgZXJyXG4gICAgICAgIEBfZmlsZUNoYW5nZWQgJ29wZW5lZEZpbGUnLCBjb250ZW50LCBtZXRhZGF0YVxuICAgICAgICBjYWxsYmFjaz8gY29udGVudCwgbWV0YWRhdGFcbiAgICBlbHNlXG4gICAgICBAb3BlbkZpbGVEaWFsb2cgY2FsbGJhY2tcblxuICBvcGVuRmlsZURpYWxvZzogKGNhbGxiYWNrID0gbnVsbCkgLT5cbiAgICBAX3VpLm9wZW5GaWxlRGlhbG9nIChtZXRhZGF0YSkgPT5cbiAgICAgIEBvcGVuRmlsZSBtZXRhZGF0YSwgY2FsbGJhY2tcblxuICBzYXZlOiAoY2FsbGJhY2sgPSBudWxsKSAtPlxuICAgIEBfZXZlbnQgJ2dldENvbnRlbnQnLCB7fSwgKGNvbnRlbnQpID0+XG4gICAgICBAc2F2ZUNvbnRlbnQgY29udGVudCwgY2FsbGJhY2tcblxuICBzYXZlQ29udGVudDogKGNvbnRlbnQsIGNhbGxiYWNrID0gbnVsbCkgLT5cbiAgICBpZiBAc3RhdGUubWV0YWRhdGFcbiAgICAgIEBzYXZlRmlsZSBjb250ZW50LCBAc3RhdGUubWV0YWRhdGEsIGNhbGxiYWNrXG4gICAgZWxzZVxuICAgICAgQHNhdmVGaWxlRGlhbG9nIGNvbnRlbnQsIGNhbGxiYWNrXG5cbiAgc2F2ZUZpbGU6IChjb250ZW50LCBtZXRhZGF0YSwgY2FsbGJhY2sgPSBudWxsKSAtPlxuICAgIGlmIG1ldGFkYXRhPy5wcm92aWRlcj8uY2FuICdzYXZlJ1xuICAgICAgQF9zZXRTdGF0ZVxuICAgICAgICBzYXZpbmc6IG1ldGFkYXRhXG4gICAgICBtZXRhZGF0YS5wcm92aWRlci5zYXZlIGNvbnRlbnQsIG1ldGFkYXRhLCAoZXJyKSA9PlxuICAgICAgICByZXR1cm4gQF9lcnJvcihlcnIpIGlmIGVyclxuICAgICAgICBAX2ZpbGVDaGFuZ2VkICdzYXZlZEZpbGUnLCBjb250ZW50LCBtZXRhZGF0YVxuICAgICAgICBjYWxsYmFjaz8gY29udGVudCwgbWV0YWRhdGFcbiAgICBlbHNlXG4gICAgICBAc2F2ZUZpbGVEaWFsb2cgY29udGVudCwgY2FsbGJhY2tcblxuICBzYXZlRmlsZURpYWxvZzogKGNvbnRlbnQgPSBudWxsLCBjYWxsYmFjayA9IG51bGwpIC0+XG4gICAgQF91aS5zYXZlRmlsZURpYWxvZyAobWV0YWRhdGEpID0+XG4gICAgICBAX2RpYWxvZ1NhdmUgY29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrXG5cbiAgc2F2ZUZpbGVBc0RpYWxvZzogKGNvbnRlbnQgPSBudWxsLCBjYWxsYmFjayA9IG51bGwpIC0+XG4gICAgQF91aS5zYXZlRmlsZUFzRGlhbG9nIChtZXRhZGF0YSkgPT5cbiAgICAgIEBfZGlhbG9nU2F2ZSBjb250ZW50LCBtZXRhZGF0YSwgY2FsbGJhY2tcblxuICBkb3dubG9hZERpYWxvZzogKGNhbGxiYWNrID0gbnVsbCkgLT5cbiAgICBAX2V2ZW50ICdnZXRDb250ZW50Jywge30sIChjb250ZW50KSA9PlxuICAgICAgQF91aS5kb3dubG9hZERpYWxvZyBAc3RhdGUubWV0YWRhdGE/Lm5hbWUsIGNvbnRlbnQsIGNhbGxiYWNrXG5cbiAgcmVuYW1lRGlhbG9nOiAoY2FsbGJhY2sgPSBudWxsKSAtPlxuICAgIGlmIEBzdGF0ZS5tZXRhZGF0YVxuICAgICAgQF91aS5yZW5hbWVEaWFsb2cgQHN0YXRlLm1ldGFkYXRhLm5hbWUsIChuZXdOYW1lKSA9PlxuICAgICAgICBpZiBuZXdOYW1lIGlzbnQgQHN0YXRlLm1ldGFkYXRhLm5hbWVcbiAgICAgICAgICBAc3RhdGUubWV0YWRhdGEucHJvdmlkZXIucmVuYW1lIEBzdGF0ZS5tZXRhZGF0YSwgbmV3TmFtZSwgKG1ldGFkYXRhLCBlcnIpID0+XG4gICAgICAgICAgICByZXR1cm4gQF9lcnJvcihlcnIpIGlmIGVyclxuICAgICAgICAgICAgQF9maWxlQ2hhbmdlZCAncmVuYW1lZEZpbGUnLCBAc3RhdGUuY29udGVudCwgbWV0YWRhdGFcbiAgICAgICAgICAgIGNhbGxiYWNrPyBmaWxlbmFtZVxuICAgIGVsc2VcbiAgICAgIGNhbGxiYWNrPyAnTm8gY3VycmVudGx5IGFjdGl2ZSBmaWxlJ1xuXG4gIGRpcnR5OiAoaXNEaXJ0eSA9IHRydWUpLT5cbiAgICBAX3NldFN0YXRlXG4gICAgICBkaXJ0eTogaXNEaXJ0eVxuICAgICAgc2F2ZWQ6IGZhbHNlIGlmIGlzRGlydHlcblxuICBhdXRvU2F2ZTogKGludGVydmFsKSAtPlxuICAgIGlmIEBfYXV0b1NhdmVJbnRlcnZhbFxuICAgICAgY2xlYXJJbnRlcnZhbCBAX2F1dG9TYXZlSW50ZXJ2YWxcblxuICAgICMgaW4gY2FzZSB0aGUgY2FsbGVyIHVzZXMgbWlsbGlzZWNvbmRzXG4gICAgaWYgaW50ZXJ2YWwgPiAxMDAwXG4gICAgICBpbnRlcnZhbCA9IE1hdGgucm91bmQoaW50ZXJ2YWwgLyAxMDAwKVxuICAgIGlmIGludGVydmFsID4gMFxuICAgICAgc2F2ZUlmRGlydHkgPSA9PlxuICAgICAgICBpZiBAc3RhdGUuZGlydHkgYW5kIEBzdGF0ZS5tZXRhZGF0YT8ucHJvdmlkZXI/LmNhbiAnc2F2ZSdcbiAgICAgICAgICBAc2F2ZSgpXG4gICAgICBAX2F1dG9TYXZlSW50ZXJ2YWwgPSBzZXRJbnRlcnZhbCBzYXZlSWZEaXJ0eSwgKGludGVydmFsICogMTAwMClcblxuICBpc0F1dG9TYXZpbmc6IC0+XG4gICAgQF9hdXRvU2F2ZUludGVydmFsID4gMFxuXG4gIF9kaWFsb2dTYXZlOiAoY29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxuICAgIGlmIGNvbnRlbnQgaXNudCBudWxsXG4gICAgICBAc2F2ZUZpbGUgY29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrXG4gICAgZWxzZVxuICAgICAgQF9ldmVudCAnZ2V0Q29udGVudCcsIHt9LCAoY29udGVudCkgPT5cbiAgICAgICAgQHNhdmVGaWxlIGNvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFja1xuXG4gIF9lcnJvcjogKG1lc3NhZ2UpIC0+XG4gICAgIyBmb3Igbm93IGFuIGFsZXJ0XG4gICAgYWxlcnQgbWVzc2FnZVxuXG4gIF9maWxlQ2hhbmdlZDogKHR5cGUsIGNvbnRlbnQsIG1ldGFkYXRhKSAtPlxuICAgIEBfc2V0U3RhdGVcbiAgICAgIGNvbnRlbnQ6IGNvbnRlbnRcbiAgICAgIG1ldGFkYXRhOiBtZXRhZGF0YVxuICAgICAgc2F2aW5nOiBudWxsXG4gICAgICBzYXZlZDogdHlwZSBpcyAnc2F2ZWRGaWxlJ1xuICAgICAgZGlydHk6IGZhbHNlXG4gICAgQF9ldmVudCB0eXBlLCB7Y29udGVudDogY29udGVudCwgbWV0YWRhdGE6IG1ldGFkYXRhfVxuXG4gIF9ldmVudDogKHR5cGUsIGRhdGEgPSB7fSwgZXZlbnRDYWxsYmFjayA9IG51bGwpIC0+XG4gICAgZXZlbnQgPSBuZXcgQ2xvdWRGaWxlTWFuYWdlckNsaWVudEV2ZW50IHR5cGUsIGRhdGEsIGV2ZW50Q2FsbGJhY2ssIEBzdGF0ZVxuICAgIEBldmVudENhbGxiYWNrPyBldmVudFxuICAgIEBsaXN0ZW5lckNhbGxiYWNrPyBldmVudFxuXG4gIF9zZXRTdGF0ZTogKG9wdGlvbnMpIC0+XG4gICAgZm9yIG93biBrZXksIHZhbHVlIG9mIG9wdGlvbnNcbiAgICAgIEBzdGF0ZVtrZXldID0gdmFsdWVcbiAgICBAX2V2ZW50ICdzdGF0ZUNoYW5nZWQnXG5cbiAgX3Jlc2V0U3RhdGU6IC0+XG4gICAgQF9zZXRTdGF0ZVxuICAgICAgY29udGVudDogbnVsbFxuICAgICAgbWV0YWRhdGE6IG51bGxcbiAgICAgIGRpcnR5OiBmYWxzZVxuICAgICAgc2F2aW5nOiBudWxsXG4gICAgICBzYXZlZDogZmFsc2VcblxubW9kdWxlLmV4cG9ydHMgPVxuICBDbG91ZEZpbGVNYW5hZ2VyQ2xpZW50RXZlbnQ6IENsb3VkRmlsZU1hbmFnZXJDbGllbnRFdmVudFxuICBDbG91ZEZpbGVNYW5hZ2VyQ2xpZW50OiBDbG91ZEZpbGVNYW5hZ2VyQ2xpZW50XG4iLCJ7ZGl2LCBidXR0b24sIHNwYW59ID0gUmVhY3QuRE9NXG5cbmRvY3VtZW50U3RvcmUgPSBcImh0dHA6Ly9kb2N1bWVudC1zdG9yZS5oZXJva3VhcHAuY29tXCJcbmF1dGhvcml6ZVVybCAgICAgPSBcIiN7ZG9jdW1lbnRTdG9yZX0vdXNlci9hdXRoZW50aWNhdGVcIlxuY2hlY2tMb2dpblVybCAgICA9IFwiI3tkb2N1bWVudFN0b3JlfS91c2VyL2luZm9cIlxubGlzdFVybCAgICAgICAgICA9IFwiI3tkb2N1bWVudFN0b3JlfS9kb2N1bWVudC9hbGxcIlxubG9hZERvY3VtZW50VXJsICAgICAgPSBcIiN7ZG9jdW1lbnRTdG9yZX0vZG9jdW1lbnQvb3BlblwiXG5zYXZlRG9jdW1lbnRVcmwgICAgICA9IFwiI3tkb2N1bWVudFN0b3JlfS9kb2N1bWVudC9zYXZlXCJcbnJlbW92ZURvY3VtZW50VXJsICAgID0gXCIje2RvY3VtZW50U3RvcmV9L2RvY3VtZW50L2RlbGV0ZVwiXG5cbnRyID0gcmVxdWlyZSAnLi4vdXRpbHMvdHJhbnNsYXRlJ1xuaXNTdHJpbmcgPSByZXF1aXJlICcuLi91dGlscy9pcy1zdHJpbmcnXG5cblByb3ZpZGVySW50ZXJmYWNlID0gKHJlcXVpcmUgJy4vcHJvdmlkZXItaW50ZXJmYWNlJykuUHJvdmlkZXJJbnRlcmZhY2VcbkNsb3VkTWV0YWRhdGEgPSAocmVxdWlyZSAnLi9wcm92aWRlci1pbnRlcmZhY2UnKS5DbG91ZE1ldGFkYXRhXG5cbkRvY3VtZW50U3RvcmVBdXRob3JpemF0aW9uRGlhbG9nID0gUmVhY3QuY3JlYXRlRmFjdG9yeSBSZWFjdC5jcmVhdGVDbGFzc1xuICBkaXNwbGF5TmFtZTogJ0RvY3VtZW50U3RvcmVBdXRob3JpemF0aW9uRGlhbG9nJ1xuXG4gIGdldEluaXRpYWxTdGF0ZTogLT5cbiAgICBkb2NTdG9yZUF2YWlsYWJsZTogZmFsc2VcblxuICBjb21wb25lbnRXaWxsTW91bnQ6IC0+XG4gICAgQHByb3BzLnByb3ZpZGVyLl9vbkRvY1N0b3JlTG9hZGVkID0+XG4gICAgICBAc2V0U3RhdGUgZG9jU3RvcmVBdmFpbGFibGU6IHRydWVcblxuICBhdXRoZW50aWNhdGU6IC0+XG4gICAgQHByb3BzLnByb3ZpZGVyLmF1dGhvcml6ZSgpXG5cbiAgcmVuZGVyOiAtPlxuICAgIChkaXYge30sXG4gICAgICBpZiBAc3RhdGUuZG9jU3RvcmVBdmFpbGFibGVcbiAgICAgICAgKGJ1dHRvbiB7b25DbGljazogQGF1dGhlbnRpY2F0ZX0sICdBdXRob3JpemF0aW9uIE5lZWRlZCcpXG4gICAgICBlbHNlXG4gICAgICAgICdUcnlpbmcgdG8gbG9nIGludG8gdGhlIERvY3VtZW50IFN0b3JlLi4uJ1xuICAgIClcblxuY2xhc3MgRG9jdW1lbnRTdG9yZVByb3ZpZGVyIGV4dGVuZHMgUHJvdmlkZXJJbnRlcmZhY2VcblxuICBjb25zdHJ1Y3RvcjogKEBvcHRpb25zID0ge30pIC0+XG4gICAgc3VwZXJcbiAgICAgIG5hbWU6IERvY3VtZW50U3RvcmVQcm92aWRlci5OYW1lXG4gICAgICBkaXNwbGF5TmFtZTogQG9wdGlvbnMuZGlzcGxheU5hbWUgb3IgKHRyICd+UFJPVklERVIuRE9DVU1FTlRfU1RPUkUnKVxuICAgICAgY2FwYWJpbGl0aWVzOlxuICAgICAgICBzYXZlOiB0cnVlXG4gICAgICAgIGxvYWQ6IHRydWVcbiAgICAgICAgbGlzdDogdHJ1ZVxuICAgICAgICByZW1vdmU6IHRydWVcbiAgICAgICAgcmVuYW1lOiB0cnVlXG5cbiAgICBAdXNlciA9IG51bGxcblxuICBATmFtZTogJ2RvY3VtZW50U3RvcmUnXG5cbiAgYXV0aG9yaXplZDogKEBhdXRoQ2FsbGJhY2spIC0+XG4gICAgaWYgQGF1dGhDYWxsYmFja1xuICAgICAgaWYgQHVzZXJcbiAgICAgICAgQGF1dGhDYWxsYmFjayB0cnVlXG4gICAgICBlbHNlXG4gICAgICAgIEBfY2hlY2tMb2dpbigpXG4gICAgZWxzZVxuICAgICAgQHVzZXIgaXNudCBudWxsXG5cbiAgYXV0aG9yaXplOiAtPlxuICAgIEBfc2hvd0xvZ2luV2luZG93KClcblxuICBfb25Eb2NTdG9yZUxvYWRlZDogKEBkb2NTdG9yZUxvYWRlZENhbGxiYWNrKSAtPlxuICAgIGlmIEBfZG9jU3RvcmVMb2FkZWRcbiAgICAgIEBkb2NTdG9yZUxvYWRlZENhbGxiYWNrKClcblxuICBfbG9naW5TdWNjZXNzZnVsOiAoQHVzZXIpIC0+XG4gICAgQF9sb2dpbldpbmRvdz8uY2xvc2UoKVxuICAgIEBhdXRoQ2FsbGJhY2sgdHJ1ZVxuXG4gIF9jaGVja0xvZ2luOiAtPlxuICAgIHByb3ZpZGVyID0gQFxuICAgICQuYWpheFxuICAgICAgZGF0YVR5cGU6ICdqc29uJ1xuICAgICAgdXJsOiBjaGVja0xvZ2luVXJsXG4gICAgICB4aHJGaWVsZHM6XG4gICAgICAgIHdpdGhDcmVkZW50aWFsczogdHJ1ZVxuICAgICAgc3VjY2VzczogKGRhdGEpIC0+XG4gICAgICAgIHByb3ZpZGVyLmRvY1N0b3JlTG9hZGVkQ2FsbGJhY2soKVxuICAgICAgICBwcm92aWRlci5fbG9naW5TdWNjZXNzZnVsKGRhdGEpXG4gICAgICBlcnJvcjogLT5cbiAgICAgICAgcHJvdmlkZXIuZG9jU3RvcmVMb2FkZWRDYWxsYmFjaygpXG5cbiAgX2xvZ2luV2luZG93OiBudWxsXG5cbiAgX3Nob3dMb2dpbldpbmRvdzogLT5cbiAgICBpZiBAX2xvZ2luV2luZG93IGFuZCBub3QgQF9sb2dpbldpbmRvdy5jbG9zZWRcbiAgICAgIEBfbG9naW5XaW5kb3cuZm9jdXMoKVxuICAgIGVsc2VcblxuICAgICAgY29tcHV0ZVNjcmVlbkxvY2F0aW9uID0gKHcsIGgpIC0+XG4gICAgICAgIHNjcmVlbkxlZnQgPSB3aW5kb3cuc2NyZWVuTGVmdCBvciBzY3JlZW4ubGVmdFxuICAgICAgICBzY3JlZW5Ub3AgID0gd2luZG93LnNjcmVlblRvcCAgb3Igc2NyZWVuLnRvcFxuICAgICAgICB3aWR0aCAgPSB3aW5kb3cuaW5uZXJXaWR0aCAgb3IgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudFdpZHRoICBvciBzY3JlZW4ud2lkdGhcbiAgICAgICAgaGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0IG9yIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGllbnRIZWlnaHQgb3Igc2NyZWVuLmhlaWdodFxuXG4gICAgICAgIGxlZnQgPSAoKHdpZHRoIC8gMikgLSAodyAvIDIpKSArIHNjcmVlbkxlZnRcbiAgICAgICAgdG9wID0gKChoZWlnaHQgLyAyKSAtIChoIC8gMikpICsgc2NyZWVuVG9wXG4gICAgICAgIHJldHVybiB7bGVmdCwgdG9wfVxuXG4gICAgICB3aWR0aCA9IDEwMDBcbiAgICAgIGhlaWdodCA9IDQ4MFxuICAgICAgcG9zaXRpb24gPSBjb21wdXRlU2NyZWVuTG9jYXRpb24gd2lkdGgsIGhlaWdodFxuICAgICAgd2luZG93RmVhdHVyZXMgPSBbXG4gICAgICAgICd3aWR0aD0nICsgd2lkdGhcbiAgICAgICAgJ2hlaWdodD0nICsgaGVpZ2h0XG4gICAgICAgICd0b3A9JyArIHBvc2l0aW9uLnRvcCBvciAyMDBcbiAgICAgICAgJ2xlZnQ9JyArIHBvc2l0aW9uLmxlZnQgb3IgMjAwXG4gICAgICAgICdkZXBlbmRlbnQ9eWVzJ1xuICAgICAgICAncmVzaXphYmxlPW5vJ1xuICAgICAgICAnbG9jYXRpb249bm8nXG4gICAgICAgICdkaWFsb2c9eWVzJ1xuICAgICAgICAnbWVudWJhcj1ubydcbiAgICAgIF1cblxuICAgICAgQF9sb2dpbldpbmRvdyA9IHdpbmRvdy5vcGVuKGF1dGhvcml6ZVVybCwgJ2F1dGgnLCB3aW5kb3dGZWF0dXJlcy5qb2luKCkpXG5cbiAgICAgIHBvbGxBY3Rpb24gPSA9PlxuICAgICAgICB0cnlcbiAgICAgICAgICBocmVmID0gQF9sb2dpbldpbmRvdy5sb2NhdGlvbi5ocmVmXG4gICAgICAgICAgaWYgKGhyZWYgaXMgd2luZG93LmxvY2F0aW9uLmhyZWYpXG4gICAgICAgICAgICBjbGVhckludGVydmFsIHBvbGxcbiAgICAgICAgICAgIEBfbG9naW5XaW5kb3cuY2xvc2UoKVxuICAgICAgICAgICAgQF9jaGVja0xvZ2luKClcbiAgICAgICAgY2F0Y2ggZVxuICAgICAgICAgICMgY29uc29sZS5sb2cgZVxuXG4gICAgICBwb2xsID0gc2V0SW50ZXJ2YWwgcG9sbEFjdGlvbiwgMjAwXG5cbiAgcmVuZGVyQXV0aG9yaXphdGlvbkRpYWxvZzogLT5cbiAgICAoRG9jdW1lbnRTdG9yZUF1dGhvcml6YXRpb25EaWFsb2cge3Byb3ZpZGVyOiBALCBhdXRoQ2FsbGJhY2s6IEBhdXRoQ2FsbGJhY2t9KVxuXG4gIHJlbmRlclVzZXI6IC0+XG4gICAgaWYgQHVzZXJcbiAgICAgIChzcGFuIHt9LCAoc3BhbiB7Y2xhc3NOYW1lOiAnZG9jdW1lbnQtc3RvcmUtaWNvbid9KSwgQHVzZXIubmFtZSlcbiAgICBlbHNlXG4gICAgICBudWxsXG5cbiAgbGlzdDogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cbiAgICAkLmFqYXhcbiAgICAgIGRhdGFUeXBlOiAnanNvbidcbiAgICAgIHVybDogbGlzdFVybFxuICAgICAgY29udGV4dDogQFxuICAgICAgeGhyRmllbGRzOlxuICAgICAgICB3aXRoQ3JlZGVudGlhbHM6IHRydWVcbiAgICAgIHN1Y2Nlc3M6IChkYXRhKSAtPlxuICAgICAgICBsaXN0ID0gW11cbiAgICAgICAgZm9yIG93biBrZXksIGZpbGUgb2YgZGF0YVxuICAgICAgICAgIGxpc3QucHVzaCBuZXcgQ2xvdWRNZXRhZGF0YVxuICAgICAgICAgICAgbmFtZTogZmlsZS5uYW1lXG4gICAgICAgICAgICBwcm92aWRlckRhdGE6IHtpZDogZmlsZS5pZH1cbiAgICAgICAgICAgIHR5cGU6IENsb3VkTWV0YWRhdGEuRmlsZVxuICAgICAgICAgICAgcHJvdmlkZXI6IEBcbiAgICAgICAgY2FsbGJhY2sgbnVsbCwgbGlzdFxuICAgICAgZXJyb3I6IC0+XG4gICAgICAgIGNhbGxiYWNrIG51bGwsIFtdXG5cbiAgbG9hZDogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cbiAgICAkLmFqYXhcbiAgICAgIGRhdGFUeXBlOiAnanNvbidcbiAgICAgIHVybDogbG9hZERvY3VtZW50VXJsXG4gICAgICBkYXRhOlxuICAgICAgICByZWNvcmRpZDogbWV0YWRhdGEucHJvdmlkZXJEYXRhLmlkXG4gICAgICBjb250ZXh0OiBAXG4gICAgICB4aHJGaWVsZHM6XG4gICAgICAgIHdpdGhDcmVkZW50aWFsczogdHJ1ZVxuICAgICAgc3VjY2VzczogKGRhdGEpIC0+XG4gICAgICAgIGNhbGxiYWNrIG51bGwsIGRhdGFcbiAgICAgIGVycm9yOiAtPlxuICAgICAgICBjYWxsYmFjayBcIlVuYWJsZSB0byBsb2FkIFwiK21ldGFkYXRhLm5hbWVcblxuICBzYXZlOiAoY29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxuICAgIGNvbnRlbnQgPSBAX3ZhbGlkYXRlQ29udGVudCBjb250ZW50XG5cbiAgICBwYXJhbXMgPSB7fVxuICAgIGlmIG1ldGFkYXRhLnByb3ZpZGVyRGF0YS5pZCB0aGVuIHBhcmFtcy5yZWNvcmRpZCA9IG1ldGFkYXRhLnByb3ZpZGVyRGF0YS5pZFxuICAgIGlmIG1ldGFkYXRhLm5hbWUgdGhlbiBwYXJhbXMucmVjb3JkbmFtZSA9IG1ldGFkYXRhLm5hbWVcblxuICAgIHVybCA9IEBfYWRkUGFyYW1zKHNhdmVEb2N1bWVudFVybCwgcGFyYW1zKVxuXG4gICAgJC5hamF4XG4gICAgICBkYXRhVHlwZTogJ2pzb24nXG4gICAgICBtZXRob2Q6ICdQT1NUJ1xuICAgICAgdXJsOiB1cmxcbiAgICAgIGRhdGE6IGNvbnRlbnRcbiAgICAgIGNvbnRleHQ6IEBcbiAgICAgIHhockZpZWxkczpcbiAgICAgICAgd2l0aENyZWRlbnRpYWxzOiB0cnVlXG4gICAgICBzdWNjZXNzOiAoZGF0YSkgLT5cbiAgICAgICAgaWYgZGF0YS5pZCB0aGVuIG1ldGFkYXRhLnByb3ZpZGVyRGF0YS5pZCA9IGRhdGEuaWRcbiAgICAgICAgY2FsbGJhY2sgbnVsbCwgZGF0YVxuICAgICAgZXJyb3I6IC0+XG4gICAgICAgIGNhbGxiYWNrIFwiVW5hYmxlIHRvIGxvYWQgXCIrbWV0YWRhdGEubmFtZVxuXG4gIHJlbW92ZTogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cbiAgICAkLmFqYXhcbiAgICAgIHVybDogcmVtb3ZlRG9jdW1lbnRVcmxcbiAgICAgIGRhdGE6XG4gICAgICAgIHJlY29yZG5hbWU6IG1ldGFkYXRhLm5hbWVcbiAgICAgIGNvbnRleHQ6IEBcbiAgICAgIHhockZpZWxkczpcbiAgICAgICAgd2l0aENyZWRlbnRpYWxzOiB0cnVlXG4gICAgICBzdWNjZXNzOiAoZGF0YSkgLT5cbiAgICAgICAgY2FsbGJhY2sgbnVsbCwgZGF0YVxuICAgICAgZXJyb3I6IC0+XG4gICAgICAgIGNhbGxiYWNrIFwiVW5hYmxlIHRvIGxvYWQgXCIrbWV0YWRhdGEubmFtZVxuXG4gIF9hZGRQYXJhbXM6ICh1cmwsIHBhcmFtcykgLT5cbiAgICByZXR1cm4gdXJsIHVubGVzcyBwYXJhbXNcbiAgICBrdnAgPSBbXVxuICAgIGZvciBrZXksIHZhbHVlIG9mIHBhcmFtc1xuICAgICAga3ZwLnB1c2ggW2tleSwgdmFsdWVdLm1hcChlbmNvZGVVUkkpLmpvaW4gXCI9XCJcbiAgICByZXR1cm4gdXJsICsgXCI/XCIgKyBrdnAuam9pbiBcIiZcIlxuXG4gICMgVGhlIGRvY3VtZW50IHNlcnZlciByZXF1aXJlcyB0aGUgY29udGVudCB0byBiZSBKU09OLCBhbmQgaXQgbXVzdCBoYXZlXG4gICMgY2VydGFpbiBwcmUtZGVmaW5lZCBrZXlzIGluIG9yZGVyIHRvIGJlIGxpc3RlZCB3aGVuIHdlIHF1ZXJ5IHRoZSBsaXN0XG4gIF92YWxpZGF0ZUNvbnRlbnQ6IChjb250ZW50KSAtPlxuICAgIGlmIHR5cGVvZiBjb250ZW50IGlzbnQgXCJvYmplY3RcIlxuICAgICAgdHJ5XG4gICAgICAgIGNvbnRlbnQgPSBKU09OLnBhcnNlIGNvbnRlbnRcbiAgICAgIGNhdGNoXG4gICAgICAgIGNvbnRlbnQgPSB7Y29udGVudDogY29udGVudH1cbiAgICBjb250ZW50LmFwcE5hbWUgICAgID89IEBvcHRpb25zLmFwcE5hbWVcbiAgICBjb250ZW50LmFwcFZlcnNpb24gID89IEBvcHRpb25zLmFwcFZlcnNpb25cbiAgICBjb250ZW50LmFwcEJ1aWxkTnVtID89IEBvcHRpb25zLmFwcEJ1aWxkTnVtXG5cbiAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkgY29udGVudFxuXG5cbm1vZHVsZS5leHBvcnRzID0gRG9jdW1lbnRTdG9yZVByb3ZpZGVyXG4iLCJ7ZGl2LCBidXR0b24sIHNwYW59ID0gUmVhY3QuRE9NXG5cbnRyID0gcmVxdWlyZSAnLi4vdXRpbHMvdHJhbnNsYXRlJ1xuaXNTdHJpbmcgPSByZXF1aXJlICcuLi91dGlscy9pcy1zdHJpbmcnXG5cblByb3ZpZGVySW50ZXJmYWNlID0gKHJlcXVpcmUgJy4vcHJvdmlkZXItaW50ZXJmYWNlJykuUHJvdmlkZXJJbnRlcmZhY2VcbkNsb3VkTWV0YWRhdGEgPSAocmVxdWlyZSAnLi9wcm92aWRlci1pbnRlcmZhY2UnKS5DbG91ZE1ldGFkYXRhXG5cbkdvb2dsZURyaXZlQXV0aG9yaXphdGlvbkRpYWxvZyA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgUmVhY3QuY3JlYXRlQ2xhc3NcbiAgZGlzcGxheU5hbWU6ICdHb29nbGVEcml2ZUF1dGhvcml6YXRpb25EaWFsb2cnXG5cbiAgZ2V0SW5pdGlhbFN0YXRlOiAtPlxuICAgIGxvYWRlZEdBUEk6IGZhbHNlXG5cbiAgY29tcG9uZW50V2lsbE1vdW50OiAtPlxuICAgIEBwcm9wcy5wcm92aWRlci5fbG9hZGVkR0FQSSA9PlxuICAgICAgQHNldFN0YXRlIGxvYWRlZEdBUEk6IHRydWVcblxuICBhdXRoZW50aWNhdGU6IC0+XG4gICAgQHByb3BzLnByb3ZpZGVyLmF1dGhvcml6ZSBHb29nbGVEcml2ZVByb3ZpZGVyLlNIT1dfUE9QVVBcblxuICByZW5kZXI6IC0+XG4gICAgKGRpdiB7fSxcbiAgICAgIGlmIEBzdGF0ZS5sb2FkZWRHQVBJXG4gICAgICAgIChidXR0b24ge29uQ2xpY2s6IEBhdXRoZW50aWNhdGV9LCAnQXV0aG9yaXphdGlvbiBOZWVkZWQnKVxuICAgICAgZWxzZVxuICAgICAgICAnV2FpdGluZyBmb3IgdGhlIEdvb2dsZSBDbGllbnQgQVBJIHRvIGxvYWQuLi4nXG4gICAgKVxuXG5jbGFzcyBHb29nbGVEcml2ZVByb3ZpZGVyIGV4dGVuZHMgUHJvdmlkZXJJbnRlcmZhY2VcblxuICBjb25zdHJ1Y3RvcjogKEBvcHRpb25zID0ge30pIC0+XG4gICAgc3VwZXJcbiAgICAgIG5hbWU6IEdvb2dsZURyaXZlUHJvdmlkZXIuTmFtZVxuICAgICAgZGlzcGxheU5hbWU6IEBvcHRpb25zLmRpc3BsYXlOYW1lIG9yICh0ciAnflBST1ZJREVSLkdPT0dMRV9EUklWRScpXG4gICAgICBjYXBhYmlsaXRpZXM6XG4gICAgICAgIHNhdmU6IHRydWVcbiAgICAgICAgbG9hZDogdHJ1ZVxuICAgICAgICBsaXN0OiB0cnVlXG4gICAgICAgIHJlbW92ZTogdHJ1ZVxuICAgICAgICByZW5hbWU6IHRydWVcblxuICAgIEBhdXRoVG9rZW4gPSBudWxsXG4gICAgQHVzZXIgPSBudWxsXG4gICAgQGNsaWVudElkID0gQG9wdGlvbnMuY2xpZW50SWRcbiAgICBpZiBub3QgQGNsaWVudElkXG4gICAgICB0aHJvdyBuZXcgRXJyb3IgJ01pc3NpbmcgcmVxdWlyZWQgY2xpZW50SWQgaW4gZ29vZ2xlRHJpdmUgcHJvdmlkZXIgb3B0aW9ucydcbiAgICBAbWltZVR5cGUgPSBAb3B0aW9ucy5taW1lVHlwZSBvciBcInRleHQvcGxhaW5cIlxuICAgIEBfbG9hZEdBUEkoKVxuXG4gIEBOYW1lOiAnZ29vZ2xlRHJpdmUnXG5cbiAgIyBhbGlhc2VzIGZvciBib29sZWFuIHBhcmFtZXRlciB0byBhdXRob3JpemVcbiAgQElNTUVESUFURSA9IHRydWVcbiAgQFNIT1dfUE9QVVAgPSBmYWxzZVxuXG4gIGF1dGhvcml6ZWQ6IChAYXV0aENhbGxiYWNrKSAtPlxuICAgIGlmIEBhdXRoQ2FsbGJhY2tcbiAgICAgIGlmIEBhdXRoVG9rZW5cbiAgICAgICAgQGF1dGhDYWxsYmFjayB0cnVlXG4gICAgICBlbHNlXG4gICAgICAgIEBhdXRob3JpemUgR29vZ2xlRHJpdmVQcm92aWRlci5JTU1FRElBVEVcbiAgICBlbHNlXG4gICAgICBAYXV0aFRva2VuIGlzbnQgbnVsbFxuXG4gIGF1dGhvcml6ZTogKGltbWVkaWF0ZSkgLT5cbiAgICBAX2xvYWRlZEdBUEkgPT5cbiAgICAgIGFyZ3MgPVxuICAgICAgICBjbGllbnRfaWQ6IEBjbGllbnRJZFxuICAgICAgICBzY29wZTogWydodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS9hdXRoL2RyaXZlJywgJ2h0dHBzOi8vd3d3Lmdvb2dsZWFwaXMuY29tL2F1dGgvdXNlcmluZm8ucHJvZmlsZSddXG4gICAgICAgIGltbWVkaWF0ZTogaW1tZWRpYXRlXG4gICAgICBnYXBpLmF1dGguYXV0aG9yaXplIGFyZ3MsIChhdXRoVG9rZW4pID0+XG4gICAgICAgIEBhdXRoVG9rZW4gPSBpZiBhdXRoVG9rZW4gYW5kIG5vdCBhdXRoVG9rZW4uZXJyb3IgdGhlbiBhdXRoVG9rZW4gZWxzZSBudWxsXG4gICAgICAgIEB1c2VyID0gbnVsbFxuICAgICAgICBpZiBAYXV0aFRva2VuXG4gICAgICAgICAgZ2FwaS5jbGllbnQub2F1dGgyLnVzZXJpbmZvLmdldCgpLmV4ZWN1dGUgKHVzZXIpID0+XG4gICAgICAgICAgICBAdXNlciA9IHVzZXJcbiAgICAgICAgQGF1dGhDYWxsYmFjayBAYXV0aFRva2VuIGlzbnQgbnVsbFxuXG4gIHJlbmRlckF1dGhvcml6YXRpb25EaWFsb2c6IC0+XG4gICAgKEdvb2dsZURyaXZlQXV0aG9yaXphdGlvbkRpYWxvZyB7cHJvdmlkZXI6IEB9KVxuXG4gIHJlbmRlclVzZXI6IC0+XG4gICAgaWYgQHVzZXJcbiAgICAgIChzcGFuIHt9LCAoc3BhbiB7Y2xhc3NOYW1lOiAnZ2RyaXZlLWljb24nfSksIEB1c2VyLm5hbWUpXG4gICAgZWxzZVxuICAgICAgbnVsbFxuXG4gIHNhdmU6ICAoY29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxuICAgIEBfbG9hZGVkR0FQSSA9PlxuICAgICAgQF9zZW5kRmlsZSBjb250ZW50LCBtZXRhZGF0YSwgY2FsbGJhY2tcblxuICBsb2FkOiAobWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxuICAgIEBfbG9hZGVkR0FQSSA9PlxuICAgICAgcmVxdWVzdCA9IGdhcGkuY2xpZW50LmRyaXZlLmZpbGVzLmdldFxuICAgICAgICBmaWxlSWQ6IG1ldGFkYXRhLnByb3ZpZGVyRGF0YS5pZFxuICAgICAgcmVxdWVzdC5leGVjdXRlIChmaWxlKSA9PlxuICAgICAgICBpZiBmaWxlPy5kb3dubG9hZFVybFxuICAgICAgICAgIEBfZG93bmxvYWRGcm9tVXJsIGZpbGUuZG93bmxvYWRVcmwsIEBhdXRoVG9rZW4sIGNhbGxiYWNrXG4gICAgICAgIGVsc2VcbiAgICAgICAgICBjYWxsYmFjayAnVW5hYmxlIHRvIGdldCBkb3dubG9hZCB1cmwnXG5cbiAgbGlzdDogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cbiAgICBAX2xvYWRlZEdBUEkgPT5cbiAgICAgIHJlcXVlc3QgPSBnYXBpLmNsaWVudC5kcml2ZS5maWxlcy5saXN0XG4gICAgICAgIHE6IFwibWltZVR5cGUgPSAnI3tAbWltZVR5cGV9J1wiXG4gICAgICByZXF1ZXN0LmV4ZWN1dGUgKHJlc3VsdCkgPT5cbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrKCdVbmFibGUgdG8gbGlzdCBmaWxlcycpIGlmIG5vdCByZXN1bHRcbiAgICAgICAgbGlzdCA9IFtdXG4gICAgICAgIGZvciBpdGVtIGluIHJlc3VsdD8uaXRlbXNcbiAgICAgICAgICAjIFRPRE86IGZvciBub3cgZG9uJ3QgYWxsb3cgZm9sZGVyc1xuICAgICAgICAgIGlmIGl0ZW0ubWltZVR5cGUgaXNudCAnYXBwbGljYXRpb24vdm5kLmdvb2dsZS1hcHBzLmZvbGRlcidcbiAgICAgICAgICAgIGxpc3QucHVzaCBuZXcgQ2xvdWRNZXRhZGF0YVxuICAgICAgICAgICAgICBuYW1lOiBpdGVtLnRpdGxlXG4gICAgICAgICAgICAgIHBhdGg6IFwiXCJcbiAgICAgICAgICAgICAgdHlwZTogaWYgaXRlbS5taW1lVHlwZSBpcyAnYXBwbGljYXRpb24vdm5kLmdvb2dsZS1hcHBzLmZvbGRlcicgdGhlbiBDbG91ZE1ldGFkYXRhLkZvbGRlciBlbHNlIENsb3VkTWV0YWRhdGEuRmlsZVxuICAgICAgICAgICAgICBwcm92aWRlcjogQFxuICAgICAgICAgICAgICBwcm92aWRlckRhdGE6XG4gICAgICAgICAgICAgICAgaWQ6IGl0ZW0uaWRcbiAgICAgICAgbGlzdC5zb3J0IChhLCBiKSAtPlxuICAgICAgICAgIGxvd2VyQSA9IGEubmFtZS50b0xvd2VyQ2FzZSgpXG4gICAgICAgICAgbG93ZXJCID0gYi5uYW1lLnRvTG93ZXJDYXNlKClcbiAgICAgICAgICByZXR1cm4gLTEgaWYgbG93ZXJBIDwgbG93ZXJCXG4gICAgICAgICAgcmV0dXJuIDEgaWYgbG93ZXJBID4gbG93ZXJCXG4gICAgICAgICAgcmV0dXJuIDBcbiAgICAgICAgY2FsbGJhY2sgbnVsbCwgbGlzdFxuXG4gIHJlbW92ZTogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cbiAgICBAX2xvYWRlZEdBUEkgLT5cbiAgICAgIHJlcXVlc3QgPSBnYXBpLmNsaWVudC5kcml2ZS5maWxlcy5kZWxldGVcbiAgICAgICAgZmlsZUlkOiBtZXRhZGF0YS5wcm92aWRlckRhdGEuaWRcbiAgICAgIHJlcXVlc3QuZXhlY3V0ZSAocmVzdWx0KSAtPlxuICAgICAgICBjYWxsYmFjaz8gcmVzdWx0Py5lcnJvciBvciBudWxsXG5cbiAgX2xvYWRHQVBJOiAtPlxuICAgIGlmIG5vdCB3aW5kb3cuX0xvYWRpbmdHQVBJXG4gICAgICB3aW5kb3cuX0xvYWRpbmdHQVBJID0gdHJ1ZVxuICAgICAgd2luZG93Ll9HQVBJT25Mb2FkID0gLT5cbiAgICAgICAgQHdpbmRvdy5fTG9hZGVkR0FQSSA9IHRydWVcbiAgICAgIHNjcmlwdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQgJ3NjcmlwdCdcbiAgICAgIHNjcmlwdC5zcmMgPSAnaHR0cHM6Ly9hcGlzLmdvb2dsZS5jb20vanMvY2xpZW50LmpzP29ubG9hZD1fR0FQSU9uTG9hZCdcbiAgICAgIGRvY3VtZW50LmhlYWQuYXBwZW5kQ2hpbGQgc2NyaXB0XG5cbiAgX2xvYWRlZEdBUEk6IChjYWxsYmFjaykgLT5cbiAgICBzZWxmID0gQFxuICAgIGNoZWNrID0gLT5cbiAgICAgIGlmIHdpbmRvdy5fTG9hZGVkR0FQSVxuICAgICAgICBnYXBpLmNsaWVudC5sb2FkICdkcml2ZScsICd2MicsIC0+XG4gICAgICAgICAgZ2FwaS5jbGllbnQubG9hZCAnb2F1dGgyJywgJ3YyJywgLT5cbiAgICAgICAgICAgIGNhbGxiYWNrLmNhbGwgc2VsZlxuICAgICAgZWxzZVxuICAgICAgICBzZXRUaW1lb3V0IGNoZWNrLCAxMFxuICAgIHNldFRpbWVvdXQgY2hlY2ssIDEwXG5cbiAgX2Rvd25sb2FkRnJvbVVybDogKHVybCwgdG9rZW4sIGNhbGxiYWNrKSAtPlxuICAgIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpXG4gICAgeGhyLm9wZW4gJ0dFVCcsIHVybFxuICAgIGlmIHRva2VuXG4gICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlciAnQXV0aG9yaXphdGlvbicsIFwiQmVhcmVyICN7dG9rZW4uYWNjZXNzX3Rva2VufVwiXG4gICAgeGhyLm9ubG9hZCA9IC0+XG4gICAgICBjYWxsYmFjayBudWxsLCB4aHIucmVzcG9uc2VUZXh0XG4gICAgeGhyLm9uZXJyb3IgPSAtPlxuICAgICAgY2FsbGJhY2sgXCJVbmFibGUgdG8gZG93bmxvYWQgI3t1cmx9XCJcbiAgICB4aHIuc2VuZCgpXG5cbiAgX3NlbmRGaWxlOiAoY29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxuICAgIGJvdW5kYXJ5ID0gJy0tLS0tLS0zMTQxNTkyNjUzNTg5NzkzMjM4NDYnXG4gICAgaGVhZGVyID0gSlNPTi5zdHJpbmdpZnlcbiAgICAgIHRpdGxlOiBtZXRhZGF0YS5uYW1lXG4gICAgICBtaW1lVHlwZTogQG1pbWVUeXBlXG5cbiAgICBbbWV0aG9kLCBwYXRoXSA9IGlmIG1ldGFkYXRhLnByb3ZpZGVyRGF0YT8uaWRcbiAgICAgIFsnUFVUJywgXCIvdXBsb2FkL2RyaXZlL3YyL2ZpbGVzLyN7bWV0YWRhdGEucHJvdmlkZXJEYXRhLmlkfVwiXVxuICAgIGVsc2VcbiAgICAgIFsnUE9TVCcsICcvdXBsb2FkL2RyaXZlL3YyL2ZpbGVzJ11cblxuICAgIGJvZHkgPSBbXG4gICAgICBcIlxcclxcbi0tI3tib3VuZGFyeX1cXHJcXG5Db250ZW50LVR5cGU6IGFwcGxpY2F0aW9uL2pzb25cXHJcXG5cXHJcXG4je2hlYWRlcn1cIixcbiAgICAgIFwiXFxyXFxuLS0je2JvdW5kYXJ5fVxcclxcbkNvbnRlbnQtVHlwZTogI3tAbWltZVR5cGV9XFxyXFxuXFxyXFxuI3tjb250ZW50fVwiLFxuICAgICAgXCJcXHJcXG4tLSN7Ym91bmRhcnl9LS1cIlxuICAgIF0uam9pbiAnJ1xuXG4gICAgcmVxdWVzdCA9IGdhcGkuY2xpZW50LnJlcXVlc3RcbiAgICAgIHBhdGg6IHBhdGhcbiAgICAgIG1ldGhvZDogbWV0aG9kXG4gICAgICBwYXJhbXM6IHt1cGxvYWRUeXBlOiAnbXVsdGlwYXJ0J31cbiAgICAgIGhlYWRlcnM6IHsnQ29udGVudC1UeXBlJzogJ211bHRpcGFydC9yZWxhdGVkOyBib3VuZGFyeT1cIicgKyBib3VuZGFyeSArICdcIid9XG4gICAgICBib2R5OiBib2R5XG5cbiAgICByZXF1ZXN0LmV4ZWN1dGUgKGZpbGUpIC0+XG4gICAgICBpZiBjYWxsYmFja1xuICAgICAgICBpZiBmaWxlPy5lcnJvclxuICAgICAgICAgIGNhbGxiYWNrIFwiVW5hYmxlZCB0byB1cGxvYWQgZmlsZTogI3tmaWxlLmVycm9yLm1lc3NhZ2V9XCJcbiAgICAgICAgZWxzZSBpZiBmaWxlXG4gICAgICAgICAgY2FsbGJhY2sgbnVsbCwgZmlsZVxuICAgICAgICBlbHNlXG4gICAgICAgICAgY2FsbGJhY2sgJ1VuYWJsZWQgdG8gdXBsb2FkIGZpbGUnXG5cbm1vZHVsZS5leHBvcnRzID0gR29vZ2xlRHJpdmVQcm92aWRlclxuIiwidHIgPSByZXF1aXJlICcuLi91dGlscy90cmFuc2xhdGUnXG5cblByb3ZpZGVySW50ZXJmYWNlID0gKHJlcXVpcmUgJy4vcHJvdmlkZXItaW50ZXJmYWNlJykuUHJvdmlkZXJJbnRlcmZhY2VcbkNsb3VkTWV0YWRhdGEgPSAocmVxdWlyZSAnLi9wcm92aWRlci1pbnRlcmZhY2UnKS5DbG91ZE1ldGFkYXRhXG5cbmNsYXNzIExvY2FsU3RvcmFnZVByb3ZpZGVyIGV4dGVuZHMgUHJvdmlkZXJJbnRlcmZhY2VcblxuICBjb25zdHJ1Y3RvcjogKEBvcHRpb25zID0ge30pIC0+XG4gICAgc3VwZXJcbiAgICAgIG5hbWU6IExvY2FsU3RvcmFnZVByb3ZpZGVyLk5hbWVcbiAgICAgIGRpc3BsYXlOYW1lOiBAb3B0aW9ucy5kaXNwbGF5TmFtZSBvciAodHIgJ35QUk9WSURFUi5MT0NBTF9TVE9SQUdFJylcbiAgICAgIGNhcGFiaWxpdGllczpcbiAgICAgICAgc2F2ZTogdHJ1ZVxuICAgICAgICBsb2FkOiB0cnVlXG4gICAgICAgIGxpc3Q6IHRydWVcbiAgICAgICAgcmVtb3ZlOiB0cnVlXG4gICAgICAgIHJlbmFtZTogdHJ1ZVxuXG4gIEBOYW1lOiAnbG9jYWxTdG9yYWdlJ1xuICBAQXZhaWxhYmxlOiAtPlxuICAgIHJlc3VsdCA9IHRyeVxuICAgICAgdGVzdCA9ICdMb2NhbFN0b3JhZ2VQcm92aWRlcjo6YXV0aCdcbiAgICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2Uuc2V0SXRlbSh0ZXN0LCB0ZXN0KVxuICAgICAgd2luZG93LmxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKHRlc3QpXG4gICAgICB0cnVlXG4gICAgY2F0Y2hcbiAgICAgIGZhbHNlXG5cbiAgc2F2ZTogKGNvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cbiAgICB0cnlcbiAgICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2Uuc2V0SXRlbSBAX2dldEtleShtZXRhZGF0YS5uYW1lKSwgY29udGVudFxuICAgICAgY2FsbGJhY2s/IG51bGxcbiAgICBjYXRjaFxuICAgICAgY2FsbGJhY2s/ICdVbmFibGUgdG8gc2F2ZSdcblxuICBsb2FkOiAobWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxuICAgIHRyeVxuICAgICAgY29udGVudCA9IHdpbmRvdy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbSBAX2dldEtleSBtZXRhZGF0YS5uYW1lXG4gICAgICBjYWxsYmFjayBudWxsLCBjb250ZW50XG4gICAgY2F0Y2hcbiAgICAgIGNhbGxiYWNrICdVbmFibGUgdG8gbG9hZCdcblxuICBsaXN0OiAobWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxuICAgIGxpc3QgPSBbXVxuICAgIHBhdGggPSBtZXRhZGF0YT8ucGF0aCBvciAnJ1xuICAgIHByZWZpeCA9IEBfZ2V0S2V5IHBhdGhcbiAgICBmb3Igb3duIGtleSBvZiB3aW5kb3cubG9jYWxTdG9yYWdlXG4gICAgICBpZiBrZXkuc3Vic3RyKDAsIHByZWZpeC5sZW5ndGgpIGlzIHByZWZpeFxuICAgICAgICBbbmFtZSwgcmVtYWluZGVyLi4uXSA9IGtleS5zdWJzdHIocHJlZml4Lmxlbmd0aCkuc3BsaXQoJy8nKVxuICAgICAgICBsaXN0LnB1c2ggbmV3IENsb3VkTWV0YWRhdGFcbiAgICAgICAgICBuYW1lOiBrZXkuc3Vic3RyKHByZWZpeC5sZW5ndGgpXG4gICAgICAgICAgcGF0aDogXCIje3BhdGh9LyN7bmFtZX1cIlxuICAgICAgICAgIHR5cGU6IGlmIHJlbWFpbmRlci5sZW5ndGggPiAwIHRoZW4gQ2xvdWRNZXRhZGF0YS5Gb2xkZXIgZWxzZSBDbG91ZE1ldGFkYXRhLkZpbGVcbiAgICAgICAgICBwcm92aWRlcjogQFxuICAgIGNhbGxiYWNrIG51bGwsIGxpc3RcblxuICByZW1vdmU6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XG4gICAgdHJ5XG4gICAgICB3aW5kb3cubG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0gQF9nZXRLZXkobWV0YWRhdGEubmFtZSlcbiAgICAgIGNhbGxiYWNrPyBudWxsXG4gICAgY2F0Y2hcbiAgICAgIGNhbGxiYWNrPyAnVW5hYmxlIHRvIGRlbGV0ZSdcblxuICBfZ2V0S2V5OiAobmFtZSA9ICcnKSAtPlxuICAgIFwiY2ZtOjoje25hbWV9XCJcblxubW9kdWxlLmV4cG9ydHMgPSBMb2NhbFN0b3JhZ2VQcm92aWRlclxuIiwie2Rpdn0gPSBSZWFjdC5ET01cblxuY2xhc3MgQ2xvdWRGaWxlXG4gIGNvbnRydWN0b3I6IChvcHRpb25zKSAtPlxuICAgIHtAY29udGVudCwgQG1ldGFkYXRhfSA9IG9wdGlvbnNcblxuY2xhc3MgQ2xvdWRNZXRhZGF0YVxuICBjb25zdHJ1Y3RvcjogKG9wdGlvbnMpIC0+XG4gICAge0BuYW1lLCBAcGF0aCwgQHR5cGUsIEBwcm92aWRlciwgQHByb3ZpZGVyRGF0YT17fX0gPSBvcHRpb25zXG4gIEBGb2xkZXI6ICdmb2xkZXInXG4gIEBGaWxlOiAnZmlsZSdcblxuQXV0aG9yaXphdGlvbk5vdEltcGxlbWVudGVkRGlhbG9nID0gUmVhY3QuY3JlYXRlRmFjdG9yeSBSZWFjdC5jcmVhdGVDbGFzc1xuICBkaXNwbGF5TmFtZTogJ0F1dGhvcml6YXRpb25Ob3RJbXBsZW1lbnRlZERpYWxvZydcbiAgcmVuZGVyOiAtPlxuICAgIChkaXYge30sIFwiQXV0aG9yaXphdGlvbiBkaWFsb2cgbm90IHlldCBpbXBsZW1lbnRlZCBmb3IgI3tAcHJvcHMucHJvdmlkZXIuZGlzcGxheU5hbWV9XCIpXG5cbmNsYXNzIFByb3ZpZGVySW50ZXJmYWNlXG5cbiAgY29uc3RydWN0b3I6IChvcHRpb25zKSAtPlxuICAgIHtAbmFtZSwgQGRpc3BsYXlOYW1lLCBAY2FwYWJpbGl0aWVzfSA9IG9wdGlvbnNcblxuICBAQXZhaWxhYmxlOiAtPiB0cnVlXG5cbiAgY2FuOiAoY2FwYWJpbGl0eSkgLT5cbiAgICBAY2FwYWJpbGl0aWVzW2NhcGFiaWxpdHldXG5cbiAgYXV0aG9yaXplZDogKGNhbGxiYWNrKSAtPlxuICAgIGlmIGNhbGxiYWNrXG4gICAgICBjYWxsYmFjayB0cnVlXG4gICAgZWxzZVxuICAgICAgdHJ1ZVxuXG4gIHJlbmRlckF1dGhvcml6YXRpb25EaWFsb2c6IC0+XG4gICAgKEF1dGhvcml6YXRpb25Ob3RJbXBsZW1lbnRlZERpYWxvZyB7cHJvdmlkZXI6IEB9KVxuXG4gIHJlbmRlclVzZXI6IC0+XG4gICAgbnVsbFxuXG4gIGRpYWxvZzogKGNhbGxiYWNrKSAtPlxuICAgIEBfbm90SW1wbGVtZW50ZWQgJ2RpYWxvZydcblxuICBzYXZlOiAoY29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxuICAgIEBfbm90SW1wbGVtZW50ZWQgJ3NhdmUnXG5cbiAgbG9hZDogKGNhbGxiYWNrKSAtPlxuICAgIEBfbm90SW1wbGVtZW50ZWQgJ2xvYWQnXG5cbiAgbGlzdDogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cbiAgICBAX25vdEltcGxlbWVudGVkICdsaXN0J1xuXG4gIHJlbW92ZTogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cbiAgICBAX25vdEltcGxlbWVudGVkICdyZW1vdmUnXG5cbiAgcmVuYW1lOiAobWV0YWRhdGEsIG5ld05hbWUsIGNhbGxiYWNrKSAtPlxuICAgIEBfbm90SW1wbGVtZW50ZWQgJ3JlbmFtZSdcblxuICBfbm90SW1wbGVtZW50ZWQ6IChtZXRob2ROYW1lKSAtPlxuICAgIGFsZXJ0IFwiI3ttZXRob2ROYW1lfSBub3QgaW1wbGVtZW50ZWQgZm9yICN7QG5hbWV9IHByb3ZpZGVyXCJcblxubW9kdWxlLmV4cG9ydHMgPVxuICBDbG91ZEZpbGU6IENsb3VkRmlsZVxuICBDbG91ZE1ldGFkYXRhOiBDbG91ZE1ldGFkYXRhXG4gIFByb3ZpZGVySW50ZXJmYWNlOiBQcm92aWRlckludGVyZmFjZVxuIiwidHIgPSByZXF1aXJlICcuLi91dGlscy90cmFuc2xhdGUnXG5pc1N0cmluZyA9IHJlcXVpcmUgJy4uL3V0aWxzL2lzLXN0cmluZydcblxuUHJvdmlkZXJJbnRlcmZhY2UgPSAocmVxdWlyZSAnLi9wcm92aWRlci1pbnRlcmZhY2UnKS5Qcm92aWRlckludGVyZmFjZVxuQ2xvdWRNZXRhZGF0YSA9IChyZXF1aXJlICcuL3Byb3ZpZGVyLWludGVyZmFjZScpLkNsb3VkTWV0YWRhdGFcblxuY2xhc3MgUmVhZE9ubHlQcm92aWRlciBleHRlbmRzIFByb3ZpZGVySW50ZXJmYWNlXG5cbiAgY29uc3RydWN0b3I6IChAb3B0aW9ucyA9IHt9KSAtPlxuICAgIHN1cGVyXG4gICAgICBuYW1lOiBSZWFkT25seVByb3ZpZGVyLk5hbWVcbiAgICAgIGRpc3BsYXlOYW1lOiBAb3B0aW9ucy5kaXNwbGF5TmFtZSBvciAodHIgJ35QUk9WSURFUi5SRUFEX09OTFknKVxuICAgICAgY2FwYWJpbGl0aWVzOlxuICAgICAgICBzYXZlOiBmYWxzZVxuICAgICAgICBsb2FkOiB0cnVlXG4gICAgICAgIGxpc3Q6IHRydWVcbiAgICAgICAgcmVtb3ZlOiBmYWxzZVxuICAgICAgICByZW5hbWU6IGZhbHNlXG4gICAgQHRyZWUgPSBudWxsXG5cbiAgQE5hbWU6ICdyZWFkT25seSdcblxuICBsb2FkOiAobWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxuICAgIEBfbG9hZFRyZWUgKGVyciwgdHJlZSkgPT5cbiAgICAgIHJldHVybiBjYWxsYmFjayBlcnIgaWYgZXJyXG4gICAgICBwYXJlbnQgPSBAX2ZpbmRQYXJlbnQgbWV0YWRhdGFcbiAgICAgIGlmIHBhcmVudFxuICAgICAgICBpZiBwYXJlbnRbbWV0YWRhdGEubmFtZV1cbiAgICAgICAgICBpZiBwYXJlbnRbbWV0YWRhdGEubmFtZV0ubWV0YWRhdGEudHlwZSBpcyBDbG91ZE1ldGFkYXRhLkZpbGVcbiAgICAgICAgICAgIGNhbGxiYWNrIG51bGwsIHBhcmVudFttZXRhZGF0YS5uYW1lXS5jb250ZW50XG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgY2FsbGJhY2sgXCIje21ldGFkYXRhLm5hbWV9IGlzIGEgZm9sZGVyXCJcbiAgICAgICAgZWxzZVxuICAgICAgICAgIGNhbGxiYWNrIFwiI3ttZXRhZGF0YS5uYW1lfSBub3QgZm91bmQgaW4gZm9sZGVyXCJcbiAgICAgIGVsc2VcbiAgICAgICAgY2FsbGJhY2sgXCIje21ldGFkYXRhLm5hbWV9IGZvbGRlciBub3QgZm91bmRcIlxuXG4gIGxpc3Q6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XG4gICAgQF9sb2FkVHJlZSAoZXJyLCB0cmVlKSA9PlxuICAgICAgcmV0dXJuIGNhbGxiYWNrIGVyciBpZiBlcnJcbiAgICAgIHBhcmVudCA9IEBfZmluZFBhcmVudCBtZXRhZGF0YVxuICAgICAgaWYgcGFyZW50XG4gICAgICAgIGxpc3QgPSBbXVxuICAgICAgICBsaXN0LnB1c2ggZmlsZS5tZXRhZGF0YSBmb3Igb3duIGZpbGVuYW1lLCBmaWxlIG9mIHBhcmVudFxuICAgICAgICBjYWxsYmFjayBudWxsLCBsaXN0XG4gICAgICBlbHNlIGlmIG1ldGFkYXRhXG4gICAgICAgIGNhbGxiYWNrIFwiI3ttZXRhZGF0YS5uYW1lfSBmb2xkZXIgbm90IGZvdW5kXCJcblxuICBfbG9hZFRyZWU6IChjYWxsYmFjaykgLT5cbiAgICBpZiBAdHJlZSBpc250IG51bGxcbiAgICAgIGNhbGxiYWNrIG51bGwsIEB0cmVlXG4gICAgZWxzZSBpZiBAb3B0aW9ucy5qc29uXG4gICAgICBAdHJlZSA9IEBfY29udmVydEpTT05Ub01ldGFkYXRhVHJlZSBAb3B0aW9ucy5qc29uXG4gICAgICBjYWxsYmFjayBudWxsLCBAdHJlZVxuICAgIGVsc2UgaWYgQG9wdGlvbnMuanNvbkNhbGxiYWNrXG4gICAgICBAb3B0aW9ucy5qc29uQ2FsbGJhY2sgKGVyciwganNvbikgPT5cbiAgICAgICAgaWYgZXJyXG4gICAgICAgICAgY2FsbGJhY2sgZXJyXG4gICAgICAgIGVsc2VcbiAgICAgICAgICBAdHJlZSA9IEBfY29udmVydEpTT05Ub01ldGFkYXRhVHJlZSBAb3B0aW9ucy5qc29uXG4gICAgICAgICAgY2FsbGJhY2sgbnVsbCwgQHRyZWVcbiAgICBlbHNlIGlmIEBvcHRpb25zLnNyY1xuICAgICAgJC5hamF4XG4gICAgICAgIGRhdGFUeXBlOiAnanNvbidcbiAgICAgICAgdXJsOiBAb3B0aW9ucy5zcmNcbiAgICAgICAgc3VjY2VzczogKGRhdGEpID0+XG4gICAgICAgICAgQHRyZWUgPSBAX2NvbnZlcnRKU09OVG9NZXRhZGF0YVRyZWUgZGF0YVxuICAgICAgICAgIGNhbGxiYWNrIG51bGwsIEB0cmVlXG4gICAgICAgIGVycm9yOiAtPiBjYWxsYmFjayBcIlVuYWJsZSB0byBsb2FkIGpzb24gZm9yICN7QGRpc3BsYXlOYW1lfSBwcm92aWRlclwiXG4gICAgZWxzZVxuICAgICAgY29uc29sZS5lcnJvcj8gXCJObyBqc29uIG9yIHNyYyBvcHRpb24gZm91bmQgZm9yICN7QGRpc3BsYXlOYW1lfSBwcm92aWRlclwiXG4gICAgICBjYWxsYmFjayBudWxsLCB7fVxuXG4gIF9jb252ZXJ0SlNPTlRvTWV0YWRhdGFUcmVlOiAoanNvbiwgcGF0aFByZWZpeCA9ICcvJykgLT5cbiAgICB0cmVlID0ge31cbiAgICBmb3Igb3duIGZpbGVuYW1lIG9mIGpzb25cbiAgICAgIHR5cGUgPSBpZiBpc1N0cmluZyBqc29uW2ZpbGVuYW1lXSB0aGVuIENsb3VkTWV0YWRhdGEuRmlsZSBlbHNlIENsb3VkTWV0YWRhdGEuRm9sZGVyXG4gICAgICBtZXRhZGF0YSA9IG5ldyBDbG91ZE1ldGFkYXRhXG4gICAgICAgIG5hbWU6IGZpbGVuYW1lXG4gICAgICAgIHBhdGg6IHBhdGhQcmVmaXggKyBmaWxlbmFtZVxuICAgICAgICB0eXBlOiB0eXBlXG4gICAgICAgIHByb3ZpZGVyOiBAXG4gICAgICAgIGNoaWxkcmVuOiBudWxsXG4gICAgICBpZiB0eXBlIGlzIENsb3VkTWV0YWRhdGEuRm9sZGVyXG4gICAgICAgIG1ldGFkYXRhLmNoaWxkcmVuID0gX2NvbnZlcnRKU09OVG9NZXRhZGF0YVRyZWUganNvbltmaWxlbmFtZV0sIHBhdGhQcmVmaXggKyBmaWxlbmFtZSArICcvJ1xuICAgICAgdHJlZVtmaWxlbmFtZV0gPVxuICAgICAgICBjb250ZW50OiBqc29uW2ZpbGVuYW1lXVxuICAgICAgICBtZXRhZGF0YTogbWV0YWRhdGFcbiAgICB0cmVlXG5cbiAgX2ZpbmRQYXJlbnQ6IChtZXRhZGF0YSkgLT5cbiAgICBpZiBub3QgbWV0YWRhdGFcbiAgICAgIEB0cmVlXG4gICAgZWxzZVxuICAgICAgQHRyZWVcblxubW9kdWxlLmV4cG9ydHMgPSBSZWFkT25seVByb3ZpZGVyXG4iLCJ0ciA9IHJlcXVpcmUgJy4vdXRpbHMvdHJhbnNsYXRlJ1xuaXNTdHJpbmcgPSByZXF1aXJlICcuL3V0aWxzL2lzLXN0cmluZydcblxuY2xhc3MgQ2xvdWRGaWxlTWFuYWdlclVJRXZlbnRcblxuICBjb25zdHJ1Y3RvcjogKEB0eXBlLCBAZGF0YSA9IHt9KSAtPlxuXG5jbGFzcyBDbG91ZEZpbGVNYW5hZ2VyVUlNZW51XG5cbiAgQERlZmF1bHRNZW51OiBbJ25ld0ZpbGVEaWFsb2cnLCAnb3BlbkZpbGVEaWFsb2cnLCAnc2F2ZScsICdzYXZlRmlsZUFzRGlhbG9nJywgJ2Rvd25sb2FkRGlhbG9nJywgJ3JlbmFtZURpYWxvZyddXG5cbiAgY29uc3RydWN0b3I6IChvcHRpb25zLCBjbGllbnQpIC0+XG4gICAgc2V0QWN0aW9uID0gKGFjdGlvbikgLT5cbiAgICAgIGNsaWVudFthY3Rpb25dPy5iaW5kKGNsaWVudCkgb3IgKC0+IGFsZXJ0IFwiTm8gI3thY3Rpb259IGFjdGlvbiBpcyBhdmFpbGFibGUgaW4gdGhlIGNsaWVudFwiKVxuXG4gICAgc2V0RW5hYmxlZCA9IChhY3Rpb24pIC0+XG4gICAgICBpZiBhY3Rpb24gaXMgJ3JlbmFtZURpYWxvZydcbiAgICAgICAgLT4gY2xpZW50LnN0YXRlLm1ldGFkYXRhPy5wcm92aWRlci5jYW4gJ3JlbmFtZSdcbiAgICAgIGVsc2VcbiAgICAgICAgdHJ1ZVxuXG4gICAgQGl0ZW1zID0gW11cbiAgICBmb3IgaXRlbSBpbiBvcHRpb25zLm1lbnVcbiAgICAgIG1lbnVJdGVtID0gaWYgaXNTdHJpbmcgaXRlbVxuICAgICAgICBuYW1lID0gb3B0aW9ucy5tZW51TmFtZXM/W2l0ZW1dXG4gICAgICAgIG1lbnVJdGVtID0gc3dpdGNoIGl0ZW1cbiAgICAgICAgICB3aGVuICduZXdGaWxlRGlhbG9nJ1xuICAgICAgICAgICAgbmFtZTogbmFtZSBvciB0ciBcIn5NRU5VLk5FV1wiXG4gICAgICAgICAgd2hlbiAnb3BlbkZpbGVEaWFsb2cnXG4gICAgICAgICAgICBuYW1lOiBuYW1lIG9yIHRyIFwifk1FTlUuT1BFTlwiXG4gICAgICAgICAgd2hlbiAnc2F2ZSdcbiAgICAgICAgICAgIG5hbWU6IG5hbWUgb3IgdHIgXCJ+TUVOVS5TQVZFXCJcbiAgICAgICAgICB3aGVuICdzYXZlRmlsZUFzRGlhbG9nJ1xuICAgICAgICAgICAgbmFtZTogbmFtZSBvciB0ciBcIn5NRU5VLlNBVkVfQVNcIlxuICAgICAgICAgIHdoZW4gJ2Rvd25sb2FkRGlhbG9nJ1xuICAgICAgICAgICAgbmFtZTogbmFtZSBvciB0ciBcIn5NRU5VLkRPV05MT0FEXCJcbiAgICAgICAgICB3aGVuICdyZW5hbWVEaWFsb2cnXG4gICAgICAgICAgICBuYW1lOiBuYW1lIG9yIHRyIFwifk1FTlUuUkVOQU1FXCJcbiAgICAgICAgICBlbHNlXG4gICAgICAgICAgICBuYW1lOiBcIlVua25vd24gaXRlbTogI3tpdGVtfVwiXG4gICAgICAgIG1lbnVJdGVtLmVuYWJsZWQgPSBzZXRFbmFibGVkIGl0ZW1cbiAgICAgICAgbWVudUl0ZW0uYWN0aW9uID0gc2V0QWN0aW9uIGl0ZW1cbiAgICAgICAgbWVudUl0ZW1cbiAgICAgIGVsc2VcbiAgICAgICAgIyBjbGllbnRzIGNhbiBwYXNzIGluIGN1c3RvbSB7bmFtZTouLi4sIGFjdGlvbjouLi59IG1lbnUgaXRlbXMgd2hlcmUgdGhlIGFjdGlvbiBjYW4gYmUgYSBjbGllbnQgZnVuY3Rpb24gbmFtZSBvciBvdGhlcndpc2UgaXQgaXMgYXNzdW1lZCBhY3Rpb24gaXMgYSBmdW5jdGlvblxuICAgICAgICBpZiBpc1N0cmluZyBpdGVtLmFjdGlvblxuICAgICAgICAgIGl0ZW0uZW5hYmxlZCA9IHNldEVuYWJsZWQgaXRlbS5hY3Rpb25cbiAgICAgICAgICBpdGVtLmFjdGlvbiA9IHNldEFjdGlvbiBpdGVtLmFjdGlvblxuICAgICAgICBlbHNlXG4gICAgICAgICAgaXRlbS5lbmFibGVkIG9yPSB0cnVlXG4gICAgICAgIGl0ZW1cbiAgICAgIGlmIG1lbnVJdGVtXG4gICAgICAgIEBpdGVtcy5wdXNoIG1lbnVJdGVtXG5cbmNsYXNzIENsb3VkRmlsZU1hbmFnZXJVSVxuXG4gIGNvbnN0cnVjdG9yOiAoQGNsaWVudCktPlxuICAgIEBtZW51ID0gbnVsbFxuXG4gIGluaXQ6IChvcHRpb25zKSAtPlxuICAgIG9wdGlvbnMgPSBvcHRpb25zIG9yIHt9XG4gICAgIyBza2lwIHRoZSBtZW51IGlmIGV4cGxpY2l0eSBzZXQgdG8gbnVsbCAobWVhbmluZyBubyBtZW51KVxuICAgIGlmIG9wdGlvbnMubWVudSBpc250IG51bGxcbiAgICAgIGlmIHR5cGVvZiBvcHRpb25zLm1lbnUgaXMgJ3VuZGVmaW5lZCdcbiAgICAgICAgb3B0aW9ucy5tZW51ID0gQ2xvdWRGaWxlTWFuYWdlclVJTWVudS5EZWZhdWx0TWVudVxuICAgICAgQG1lbnUgPSBuZXcgQ2xvdWRGaWxlTWFuYWdlclVJTWVudSBvcHRpb25zLCBAY2xpZW50XG5cbiAgIyBmb3IgUmVhY3QgdG8gbGlzdGVuIGZvciBkaWFsb2cgY2hhbmdlc1xuICBsaXN0ZW46IChAbGlzdGVuZXJDYWxsYmFjaykgLT5cblxuICBhcHBlbmRNZW51SXRlbTogKGl0ZW0pIC0+XG4gICAgQGxpc3RlbmVyQ2FsbGJhY2sgbmV3IENsb3VkRmlsZU1hbmFnZXJVSUV2ZW50ICdhcHBlbmRNZW51SXRlbScsIGl0ZW1cblxuICBzZXRNZW51QmFySW5mbzogKGluZm8pIC0+XG4gICAgQGxpc3RlbmVyQ2FsbGJhY2sgbmV3IENsb3VkRmlsZU1hbmFnZXJVSUV2ZW50ICdzZXRNZW51QmFySW5mbycsIGluZm9cblxuICBzYXZlRmlsZURpYWxvZzogKGNhbGxiYWNrKSAtPlxuICAgIEBfc2hvd1Byb3ZpZGVyRGlhbG9nICdzYXZlRmlsZScsICh0ciAnfkRJQUxPRy5TQVZFJyksIGNhbGxiYWNrXG5cbiAgc2F2ZUZpbGVBc0RpYWxvZzogKGNhbGxiYWNrKSAtPlxuICAgIEBfc2hvd1Byb3ZpZGVyRGlhbG9nICdzYXZlRmlsZUFzJywgKHRyICd+RElBTE9HLlNBVkVfQVMnKSwgY2FsbGJhY2tcblxuICBvcGVuRmlsZURpYWxvZzogKGNhbGxiYWNrKSAtPlxuICAgIEBfc2hvd1Byb3ZpZGVyRGlhbG9nICdvcGVuRmlsZScsICh0ciAnfkRJQUxPRy5PUEVOJyksIGNhbGxiYWNrXG5cbiAgZG93bmxvYWREaWFsb2c6IChmaWxlbmFtZSwgY29udGVudCwgY2FsbGJhY2spIC0+XG4gICAgQGxpc3RlbmVyQ2FsbGJhY2sgbmV3IENsb3VkRmlsZU1hbmFnZXJVSUV2ZW50ICdzaG93RG93bmxvYWREaWFsb2cnLFxuICAgICAgZmlsZW5hbWU6IGZpbGVuYW1lXG4gICAgICBjb250ZW50OiBjb250ZW50XG4gICAgICBjYWxsYmFjazogY2FsbGJhY2tcblxuICByZW5hbWVEaWFsb2c6IChmaWxlbmFtZSwgY2FsbGJhY2spIC0+XG4gICAgQGxpc3RlbmVyQ2FsbGJhY2sgbmV3IENsb3VkRmlsZU1hbmFnZXJVSUV2ZW50ICdzaG93UmVuYW1lRGlhbG9nJyxcbiAgICAgIGZpbGVuYW1lOiBmaWxlbmFtZVxuICAgICAgY2FsbGJhY2s6IGNhbGxiYWNrXG5cbiAgX3Nob3dQcm92aWRlckRpYWxvZzogKGFjdGlvbiwgdGl0bGUsIGNhbGxiYWNrKSAtPlxuICAgIEBsaXN0ZW5lckNhbGxiYWNrIG5ldyBDbG91ZEZpbGVNYW5hZ2VyVUlFdmVudCAnc2hvd1Byb3ZpZGVyRGlhbG9nJyxcbiAgICAgIGFjdGlvbjogYWN0aW9uXG4gICAgICB0aXRsZTogdGl0bGVcbiAgICAgIGNhbGxiYWNrOiBjYWxsYmFja1xuXG5tb2R1bGUuZXhwb3J0cyA9XG4gIENsb3VkRmlsZU1hbmFnZXJVSUV2ZW50OiBDbG91ZEZpbGVNYW5hZ2VyVUlFdmVudFxuICBDbG91ZEZpbGVNYW5hZ2VyVUk6IENsb3VkRmlsZU1hbmFnZXJVSVxuICBDbG91ZEZpbGVNYW5hZ2VyVUlNZW51OiBDbG91ZEZpbGVNYW5hZ2VyVUlNZW51XG4iLCJtb2R1bGUuZXhwb3J0cyA9IChwYXJhbSkgLT4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHBhcmFtKSBpcyAnW29iamVjdCBTdHJpbmddJ1xuIiwibW9kdWxlLmV4cG9ydHMgPVxuICBcIn5NRU5VQkFSLlVOVElUTEVfRE9DVU1FTlRcIjogXCJVbnRpdGxlZCBEb2N1bWVudFwiXG5cbiAgXCJ+TUVOVS5ORVdcIjogXCJOZXdcIlxuICBcIn5NRU5VLk9QRU5cIjogXCJPcGVuIC4uLlwiXG4gIFwifk1FTlUuU0FWRVwiOiBcIlNhdmVcIlxuICBcIn5NRU5VLlNBVkVfQVNcIjogXCJTYXZlIEFzIC4uLlwiXG4gIFwifk1FTlUuRE9XTkxPQURcIjogXCJEb3dubG9hZFwiXG4gIFwifk1FTlUuUkVOQU1FXCI6IFwiUmVuYW1lXCJcblxuICBcIn5ESUFMT0cuU0FWRVwiOiBcIlNhdmVcIlxuICBcIn5ESUFMT0cuU0FWRV9BU1wiOiBcIlNhdmUgQXMgLi4uXCJcbiAgXCJ+RElBTE9HLk9QRU5cIjogXCJPcGVuXCJcbiAgXCJ+RElBTE9HLkRPV05MT0FEXCI6IFwiRG93bmxvYWRcIlxuICBcIn5ESUFMT0cuUkVOQU1FXCI6IFwiUmVuYW1lXCJcblxuICBcIn5QUk9WSURFUi5MT0NBTF9TVE9SQUdFXCI6IFwiTG9jYWwgU3RvcmFnZVwiXG4gIFwiflBST1ZJREVSLlJFQURfT05MWVwiOiBcIlJlYWQgT25seVwiXG4gIFwiflBST1ZJREVSLkdPT0dMRV9EUklWRVwiOiBcIkdvb2dsZSBEcml2ZVwiXG4gIFwiflBST1ZJREVSLkRPQ1VNRU5UX1NUT1JFXCI6IFwiRG9jdW1lbnQgU3RvcmVcIlxuXG4gIFwifkZJTEVfRElBTE9HLkZJTEVOQU1FXCI6IFwiRmlsZW5hbWVcIlxuICBcIn5GSUxFX0RJQUxPRy5PUEVOXCI6IFwiT3BlblwiXG4gIFwifkZJTEVfRElBTE9HLlNBVkVcIjogXCJTYXZlXCJcbiAgXCJ+RklMRV9ESUFMT0cuQ0FOQ0VMXCI6IFwiQ2FuY2VsXCJcbiAgXCJ+RklMRV9ESUFMT0cuUkVNT1ZFXCI6IFwiRGVsZXRlXCJcbiAgXCJ+RklMRV9ESUFMT0cuUkVNT1ZFX0NPTkZJUk1cIjogXCJBcmUgeW91IHN1cmUgeW91IHdhbnQgdG8gZGVsZXRlICV7ZmlsZW5hbWV9P1wiXG4gIFwifkZJTEVfRElBTE9HLkxPQURJTkdcIjogXCJMb2FkaW5nLi4uXCJcblxuICBcIn5ET1dOTE9BRF9ESUFMT0cuRE9XTkxPQURcIjogXCJEb3dubG9hZFwiXG4gIFwifkRPV05MT0FEX0RJQUxPRy5DQU5DRUxcIjogXCJDYW5jZWxcIlxuXG4gIFwiflJFTkFNRV9ESUFMT0cuUkVOQU1FXCI6IFwiUmVuYW1lXCJcbiAgXCJ+UkVOQU1FX0RJQUxPRy5DQU5DRUxcIjogXCJDYW5jZWxcIlxuXG4gIFwifkNPTkZJUk0uVU5TQVZFRF9DSEFOR0VTXCI6IFwiWW91IGhhdmUgdW5zYXZlZCBjaGFuZ2VzLiAgQXJlIHlvdSBzdXJlIHlvdSB3YW50IGEgbmV3IGZpbGU/XCJcbiIsInRyYW5zbGF0aW9ucyA9ICB7fVxudHJhbnNsYXRpb25zWydlbiddID0gcmVxdWlyZSAnLi9sYW5nL2VuLXVzJ1xuZGVmYXVsdExhbmcgPSAnZW4nXG52YXJSZWdFeHAgPSAvJVxce1xccyooW159XFxzXSopXFxzKlxcfS9nXG5cbnRyYW5zbGF0ZSA9IChrZXksIHZhcnM9e30sIGxhbmc9ZGVmYXVsdExhbmcpIC0+XG4gIHRyYW5zbGF0aW9uID0gdHJhbnNsYXRpb25zW2xhbmddP1trZXldIG9yIGtleVxuICB0cmFuc2xhdGlvbi5yZXBsYWNlIHZhclJlZ0V4cCwgKG1hdGNoLCBrZXkpIC0+XG4gICAgaWYgdmFycy5oYXNPd25Qcm9wZXJ0eSBrZXkgdGhlbiB2YXJzW2tleV0gZWxzZSBcIicqKiBVS05PV04gS0VZOiAje2tleX0gKipcIlxuXG5tb2R1bGUuZXhwb3J0cyA9IHRyYW5zbGF0ZVxuIiwiTWVudUJhciA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9tZW51LWJhci12aWV3J1xuUHJvdmlkZXJUYWJiZWREaWFsb2cgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vcHJvdmlkZXItdGFiYmVkLWRpYWxvZy12aWV3J1xuRG93bmxvYWREaWFsb2cgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vZG93bmxvYWQtZGlhbG9nLXZpZXcnXG5SZW5hbWVEaWFsb2cgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vcmVuYW1lLWRpYWxvZy12aWV3J1xuXG50ciA9IHJlcXVpcmUgJy4uL3V0aWxzL3RyYW5zbGF0ZSdcblxue2RpdiwgaWZyYW1lfSA9IFJlYWN0LkRPTVxuXG5Jbm5lckFwcCA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgUmVhY3QuY3JlYXRlQ2xhc3NcblxuICBkaXNwbGF5TmFtZTogJ0Nsb3VkRmlsZU1hbmFnZXJJbm5lckFwcCdcblxuICBzaG91bGRDb21wb25lbnRVcGRhdGU6IChuZXh0UHJvcHMpIC0+XG4gICAgbmV4dFByb3BzLmFwcCBpc250IEBwcm9wcy5hcHBcblxuICByZW5kZXI6IC0+XG4gICAgKGRpdiB7Y2xhc3NOYW1lOiAnaW5uZXJBcHAnfSxcbiAgICAgIChpZnJhbWUge3NyYzogQHByb3BzLmFwcH0pXG4gICAgKVxuXG5BcHAgPSBSZWFjdC5jcmVhdGVDbGFzc1xuXG4gIGRpc3BsYXlOYW1lOiAnQ2xvdWRGaWxlTWFuYWdlcidcblxuICBnZXRGaWxlbmFtZTogLT5cbiAgICBpZiBAcHJvcHMuY2xpZW50LnN0YXRlLm1ldGFkYXRhPy5oYXNPd25Qcm9wZXJ0eSgnbmFtZScpIHRoZW4gQHByb3BzLmNsaWVudC5zdGF0ZS5tZXRhZGF0YS5uYW1lIGVsc2UgKHRyIFwifk1FTlVCQVIuVU5USVRMRV9ET0NVTUVOVFwiKVxuXG4gIGdldFByb3ZpZGVyOiAtPlxuICAgIEBwcm9wcy5jbGllbnQuc3RhdGUubWV0YWRhdGE/LnByb3ZpZGVyXG5cbiAgZ2V0SW5pdGlhbFN0YXRlOiAtPlxuICAgIGZpbGVuYW1lOiBAZ2V0RmlsZW5hbWUoKVxuICAgIHByb3ZpZGVyOiBAZ2V0UHJvdmlkZXIoKVxuICAgIG1lbnVJdGVtczogQHByb3BzLmNsaWVudC5fdWkubWVudT8uaXRlbXMgb3IgW11cbiAgICBtZW51T3B0aW9uczogQHByb3BzLnVpPy5tZW51QmFyIG9yIHt9XG4gICAgcHJvdmlkZXJEaWFsb2c6IG51bGxcbiAgICBkb3dubG9hZERpYWxvZzogbnVsbFxuICAgIHJlbmFtZURpYWxvZzogbnVsbFxuICAgIGRpcnR5OiBmYWxzZVxuXG4gIGNvbXBvbmVudFdpbGxNb3VudDogLT5cbiAgICBAcHJvcHMuY2xpZW50Lmxpc3RlbiAoZXZlbnQpID0+XG4gICAgICBmaWxlU3RhdHVzID0gaWYgZXZlbnQuc3RhdGUuc2F2aW5nXG4gICAgICAgIHttZXNzYWdlOiBcIlNhdmluZy4uLlwiLCB0eXBlOiAnaW5mbyd9XG4gICAgICBlbHNlIGlmIGV2ZW50LnN0YXRlLnNhdmVkXG4gICAgICAgIHttZXNzYWdlOiBcIkFsbCBjaGFuZ2VzIHNhdmVkIHRvICN7ZXZlbnQuc3RhdGUubWV0YWRhdGEucHJvdmlkZXIuZGlzcGxheU5hbWV9XCIsIHR5cGU6ICdpbmZvJ31cbiAgICAgIGVsc2UgaWYgZXZlbnQuc3RhdGUuZGlydHlcbiAgICAgICAge21lc3NhZ2U6ICdVbnNhdmVkJywgdHlwZTogJ2FsZXJ0J31cbiAgICAgIGVsc2VcbiAgICAgICAgbnVsbFxuICAgICAgQHNldFN0YXRlXG4gICAgICAgIGZpbGVuYW1lOiBAZ2V0RmlsZW5hbWUoKVxuICAgICAgICBwcm92aWRlcjogQGdldFByb3ZpZGVyKClcbiAgICAgICAgZmlsZVN0YXR1czogZmlsZVN0YXR1c1xuXG4gICAgICBzd2l0Y2ggZXZlbnQudHlwZVxuICAgICAgICB3aGVuICdjb25uZWN0ZWQnXG4gICAgICAgICAgQHNldFN0YXRlIG1lbnVJdGVtczogQHByb3BzLmNsaWVudC5fdWkubWVudT8uaXRlbXMgb3IgW11cblxuICAgIEBwcm9wcy5jbGllbnQuX3VpLmxpc3RlbiAoZXZlbnQpID0+XG4gICAgICBzd2l0Y2ggZXZlbnQudHlwZVxuICAgICAgICB3aGVuICdzaG93UHJvdmlkZXJEaWFsb2cnXG4gICAgICAgICAgQHNldFN0YXRlIHByb3ZpZGVyRGlhbG9nOiBldmVudC5kYXRhXG4gICAgICAgIHdoZW4gJ3Nob3dEb3dubG9hZERpYWxvZydcbiAgICAgICAgICBAc2V0U3RhdGUgZG93bmxvYWREaWFsb2c6IGV2ZW50LmRhdGFcbiAgICAgICAgd2hlbiAnc2hvd1JlbmFtZURpYWxvZydcbiAgICAgICAgICBAc2V0U3RhdGUgcmVuYW1lRGlhbG9nOiBldmVudC5kYXRhXG4gICAgICAgIHdoZW4gJ2FwcGVuZE1lbnVJdGVtJ1xuICAgICAgICAgIEBzdGF0ZS5tZW51SXRlbXMucHVzaCBldmVudC5kYXRhXG4gICAgICAgICAgQHNldFN0YXRlIG1lbnVJdGVtczogQHN0YXRlLm1lbnVJdGVtc1xuICAgICAgICB3aGVuICdzZXRNZW51QmFySW5mbydcbiAgICAgICAgICBAc3RhdGUubWVudU9wdGlvbnMuaW5mbyA9IGV2ZW50LmRhdGFcbiAgICAgICAgICBAc2V0U3RhdGUgbWVudU9wdGlvbnM6IEBzdGF0ZS5tZW51T3B0aW9uc1xuXG4gIGNsb3NlRGlhbG9nczogLT5cbiAgICBAc2V0U3RhdGVcbiAgICAgIHByb3ZpZGVyRGlhbG9nOiBudWxsXG4gICAgICBkb3dubG9hZERpYWxvZzogbnVsbFxuICAgICAgcmVuYW1lRGlhbG9nOiBudWxsXG5cbiAgcmVuZGVyRGlhbG9nczogLT5cbiAgICBpZiBAc3RhdGUucHJvdmlkZXJEaWFsb2dcbiAgICAgIChQcm92aWRlclRhYmJlZERpYWxvZyB7Y2xpZW50OiBAcHJvcHMuY2xpZW50LCBkaWFsb2c6IEBzdGF0ZS5wcm92aWRlckRpYWxvZywgY2xvc2U6IEBjbG9zZURpYWxvZ3N9KVxuICAgIGVsc2UgaWYgQHN0YXRlLmRvd25sb2FkRGlhbG9nXG4gICAgICAoRG93bmxvYWREaWFsb2cge2ZpbGVuYW1lOiBAc3RhdGUuZG93bmxvYWREaWFsb2cuZmlsZW5hbWUsIGNvbnRlbnQ6IEBzdGF0ZS5kb3dubG9hZERpYWxvZy5jb250ZW50LCBjbG9zZTogQGNsb3NlRGlhbG9nc30pXG4gICAgZWxzZSBpZiBAc3RhdGUucmVuYW1lRGlhbG9nXG4gICAgICAoUmVuYW1lRGlhbG9nIHtmaWxlbmFtZTogQHN0YXRlLnJlbmFtZURpYWxvZy5maWxlbmFtZSwgY2FsbGJhY2s6IEBzdGF0ZS5yZW5hbWVEaWFsb2cuY2FsbGJhY2ssIGNsb3NlOiBAY2xvc2VEaWFsb2dzfSlcblxuICByZW5kZXI6IC0+XG4gICAgaWYgQHByb3BzLnVzaW5nSWZyYW1lXG4gICAgICAoZGl2IHtjbGFzc05hbWU6ICdhcHAnfSxcbiAgICAgICAgKE1lbnVCYXIge2ZpbGVuYW1lOiBAc3RhdGUuZmlsZW5hbWUsIHByb3ZpZGVyOiBAc3RhdGUucHJvdmlkZXIsIGZpbGVTdGF0dXM6IEBzdGF0ZS5maWxlU3RhdHVzLCBpdGVtczogQHN0YXRlLm1lbnVJdGVtcywgb3B0aW9uczogQHN0YXRlLm1lbnVPcHRpb25zfSlcbiAgICAgICAgKElubmVyQXBwIHthcHA6IEBwcm9wcy5hcHB9KVxuICAgICAgICBAcmVuZGVyRGlhbG9ncygpXG4gICAgICApXG4gICAgZWxzZSBpZiBAc3RhdGUucHJvdmlkZXJEaWFsb2cgb3IgQHN0YXRlLmRvd25sb2FkRGlhbG9nXG4gICAgICAoZGl2IHtjbGFzc05hbWU6ICdhcHAnfSxcbiAgICAgICAgQHJlbmRlckRpYWxvZ3MoKVxuICAgICAgKVxuICAgIGVsc2VcbiAgICAgIG51bGxcblxubW9kdWxlLmV4cG9ydHMgPSBBcHBcbiIsIkF1dGhvcml6ZU1peGluID1cbiAgZ2V0SW5pdGlhbFN0YXRlOiAtPlxuICAgIGF1dGhvcml6ZWQ6IGZhbHNlXG5cbiAgY29tcG9uZW50V2lsbE1vdW50OiAtPlxuICAgIEBwcm9wcy5wcm92aWRlci5hdXRob3JpemVkIChhdXRob3JpemVkKSA9PlxuICAgICAgQHNldFN0YXRlIGF1dGhvcml6ZWQ6IGF1dGhvcml6ZWRcblxuICByZW5kZXI6IC0+XG4gICAgaWYgQHN0YXRlLmF1dGhvcml6ZWRcbiAgICAgIEByZW5kZXJXaGVuQXV0aG9yaXplZCgpXG4gICAgZWxzZVxuICAgICAgQHByb3BzLnByb3ZpZGVyLnJlbmRlckF1dGhvcml6YXRpb25EaWFsb2coKVxuXG5tb2R1bGUuZXhwb3J0cyA9IEF1dGhvcml6ZU1peGluXG4iLCJ7ZGl2LCBpbnB1dCwgYSwgYnV0dG9ufSA9IFJlYWN0LkRPTVxuXG5Nb2RhbERpYWxvZyA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9tb2RhbC1kaWFsb2ctdmlldydcblxudHIgPSByZXF1aXJlICcuLi91dGlscy90cmFuc2xhdGUnXG5cbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3NcblxuICBkaXNwbGF5TmFtZTogJ0Rvd25sb2FkRGlhbG9nVmlldydcblxuICBnZXRJbml0aWFsU3RhdGU6IC0+XG4gICAgZmlsZW5hbWU6IEB0cmltKEBwcm9wcy5maWxlbmFtZSBvciAnJylcblxuICBjb21wb25lbnREaWRNb3VudDogLT5cbiAgICBAZmlsZW5hbWUgPSBSZWFjdC5maW5kRE9NTm9kZSBAcmVmcy5maWxlbmFtZVxuICAgIEBmaWxlbmFtZS5mb2N1cygpXG5cbiAgdXBkYXRlRmlsZW5hbWU6IC0+XG4gICAgQHNldFN0YXRlIGZpbGVuYW1lOiBAdHJpbShAZmlsZW5hbWUudmFsdWUpXG5cbiAgdHJpbTogKHMpIC0+XG4gICAgcy5yZXBsYWNlIC9eXFxzK3xcXHMrJC8sICcnXG5cbiAgZG93bmxvYWQ6IChlKSAtPlxuICAgIGlmIEBzdGF0ZS5maWxlbmFtZS5sZW5ndGggPiAwXG4gICAgICBlLnRhcmdldC5zZXRBdHRyaWJ1dGUgJ2hyZWYnLCBcImRhdGE6dGV4dC9wbGFpbiwje2VuY29kZVVSSUNvbXBvbmVudChAcHJvcHMuY29udGVudCl9XCJcbiAgICAgIEBwcm9wcy5jbG9zZSgpXG4gICAgZWxzZVxuICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICBAZmlsZW5hbWUuZm9jdXMoKVxuXG4gIHJlbmRlcjogLT5cbiAgICAoTW9kYWxEaWFsb2cge3RpdGxlOiAodHIgJ35ESUFMT0cuRE9XTkxPQUQnKSwgY2xvc2U6IEBwcm9wcy5jbG9zZX0sXG4gICAgICAoZGl2IHtjbGFzc05hbWU6ICdkb3dubG9hZC1kaWFsb2cnfSxcbiAgICAgICAgKGlucHV0IHtyZWY6ICdmaWxlbmFtZScsIHBsYWNlaG9sZGVyOiAnRmlsZW5hbWUnLCB2YWx1ZTogQHN0YXRlLmZpbGVuYW1lLCBvbkNoYW5nZTogQHVwZGF0ZUZpbGVuYW1lfSlcbiAgICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnYnV0dG9ucyd9LFxuICAgICAgICAgIChhIHtocmVmOiAnIycsIGNsYXNzTmFtZTogKGlmIEBzdGF0ZS5maWxlbmFtZS5sZW5ndGggaXMgMCB0aGVuICdkaXNhYmxlZCcgZWxzZSAnJyksIGRvd25sb2FkOiBAc3RhdGUuZmlsZW5hbWUsIG9uQ2xpY2s6IEBkb3dubG9hZH0sIHRyICd+RE9XTkxPQURfRElBTE9HLkRPV05MT0FEJylcbiAgICAgICAgICAoYnV0dG9uIHtvbkNsaWNrOiBAcHJvcHMuY2xvc2V9LCB0ciAnfkRPV05MT0FEX0RJQUxPRy5DQU5DRUwnKVxuICAgICAgICApXG4gICAgICApXG4gICAgKVxuIiwie2RpdiwgaSwgc3BhbiwgdWwsIGxpfSA9IFJlYWN0LkRPTVxuXG5Ecm9wZG93bkl0ZW0gPSBSZWFjdC5jcmVhdGVGYWN0b3J5IFJlYWN0LmNyZWF0ZUNsYXNzXG5cbiAgZGlzcGxheU5hbWU6ICdEcm9wZG93bkl0ZW0nXG5cbiAgY2xpY2tlZDogLT5cbiAgICBAcHJvcHMuc2VsZWN0IEBwcm9wcy5pdGVtXG5cbiAgcmVuZGVyOiAtPlxuICAgIGVuYWJsZWQgPSBpZiBAcHJvcHMuaXRlbS5oYXNPd25Qcm9wZXJ0eSAnZW5hYmxlZCdcbiAgICAgIGlmIHR5cGVvZiBAcHJvcHMuaXRlbS5lbmFibGVkIGlzICdmdW5jdGlvbidcbiAgICAgICAgQHByb3BzLml0ZW0uZW5hYmxlZCgpXG4gICAgICBlbHNlXG4gICAgICAgIEBwcm9wcy5pdGVtLmVuYWJsZWRcbiAgICBlbHNlXG4gICAgICB0cnVlXG4gICAgZGlzYWJsZWQgPSBub3QgZW5hYmxlZCBvciAoQHByb3BzLmlzQWN0aW9uTWVudSBhbmQgbm90IEBwcm9wcy5pdGVtLmFjdGlvbilcblxuICAgIGNsYXNzTmFtZSA9IFwibWVudUl0ZW0gI3tpZiBkaXNhYmxlZCB0aGVuICdkaXNhYmxlZCcgZWxzZSAnJ31cIlxuICAgIG5hbWUgPSBAcHJvcHMuaXRlbS5uYW1lIG9yIEBwcm9wcy5pdGVtXG4gICAgKGxpIHtjbGFzc05hbWU6IGNsYXNzTmFtZSwgb25DbGljazogQGNsaWNrZWQgfSwgbmFtZSlcblxuRHJvcERvd24gPSBSZWFjdC5jcmVhdGVDbGFzc1xuXG4gIGRpc3BsYXlOYW1lOiAnRHJvcGRvd24nXG5cbiAgZ2V0RGVmYXVsdFByb3BzOiAtPlxuICAgIGlzQWN0aW9uTWVudTogdHJ1ZSAgICAgICAgICAgICAgIyBXaGV0aGVyIGVhY2ggaXRlbSBjb250YWlucyBpdHMgb3duIGFjdGlvblxuICAgIG9uU2VsZWN0OiAoaXRlbSkgLT4gICAgICAgICAgICAgIyBJZiBub3QsIEBwcm9wcy5vblNlbGVjdCBpcyBjYWxsZWRcbiAgICAgIGxvZy5pbmZvIFwiU2VsZWN0ZWQgI3tpdGVtfVwiXG5cbiAgZ2V0SW5pdGlhbFN0YXRlOiAtPlxuICAgIHNob3dpbmdNZW51OiBmYWxzZVxuICAgIHRpbWVvdXQ6IG51bGxcblxuICBibHVyOiAtPlxuICAgIEB1bmJsdXIoKVxuICAgIHRpbWVvdXQgPSBzZXRUaW1lb3V0ICggPT4gQHNldFN0YXRlIHtzaG93aW5nTWVudTogZmFsc2V9ICksIDUwMFxuICAgIEBzZXRTdGF0ZSB7dGltZW91dDogdGltZW91dH1cblxuICB1bmJsdXI6IC0+XG4gICAgaWYgQHN0YXRlLnRpbWVvdXRcbiAgICAgIGNsZWFyVGltZW91dChAc3RhdGUudGltZW91dClcbiAgICBAc2V0U3RhdGUge3RpbWVvdXQ6IG51bGx9XG5cbiAgc2VsZWN0OiAoaXRlbSkgLT5cbiAgICBuZXh0U3RhdGUgPSAobm90IEBzdGF0ZS5zaG93aW5nTWVudSlcbiAgICBAc2V0U3RhdGUge3Nob3dpbmdNZW51OiBuZXh0U3RhdGV9XG4gICAgcmV0dXJuIHVubGVzcyBpdGVtXG4gICAgaWYgQHByb3BzLmlzQWN0aW9uTWVudSBhbmQgaXRlbS5hY3Rpb25cbiAgICAgIGl0ZW0uYWN0aW9uKClcbiAgICBlbHNlXG4gICAgICBAcHJvcHMub25TZWxlY3QgaXRlbVxuXG4gIHJlbmRlcjogLT5cbiAgICBtZW51Q2xhc3MgPSBpZiBAc3RhdGUuc2hvd2luZ01lbnUgdGhlbiAnbWVudS1zaG93aW5nJyBlbHNlICdtZW51LWhpZGRlbidcbiAgICBzZWxlY3QgPSAoaXRlbSkgPT5cbiAgICAgICggPT4gQHNlbGVjdChpdGVtKSlcbiAgICAoZGl2IHtjbGFzc05hbWU6ICdtZW51J30sXG4gICAgICAoc3BhbiB7Y2xhc3NOYW1lOiAnbWVudS1hbmNob3InLCBvbkNsaWNrOiA9PiBAc2VsZWN0KG51bGwpfSxcbiAgICAgICAgQHByb3BzLmFuY2hvclxuICAgICAgICAoaSB7Y2xhc3NOYW1lOiAnaWNvbi1hcnJvdy1leHBhbmQnfSlcbiAgICAgIClcbiAgICAgIGlmIEBwcm9wcy5pdGVtcz8ubGVuZ3RoID4gMFxuICAgICAgICAoZGl2IHtjbGFzc05hbWU6IG1lbnVDbGFzcywgb25Nb3VzZUxlYXZlOiBAYmx1ciwgb25Nb3VzZUVudGVyOiBAdW5ibHVyfSxcbiAgICAgICAgICAodWwge30sXG4gICAgICAgICAgICAoRHJvcGRvd25JdGVtIHtrZXk6IGl0ZW0ubmFtZSBvciBpdGVtLCBpdGVtOiBpdGVtLCBzZWxlY3Q6IEBzZWxlY3QsIGlzQWN0aW9uTWVudTogQHByb3BzLmlzQWN0aW9uTWVudX0pIGZvciBpdGVtIGluIEBwcm9wcy5pdGVtc1xuICAgICAgICAgIClcbiAgICAgICAgKVxuICAgIClcblxubW9kdWxlLmV4cG9ydHMgPSBEcm9wRG93blxuIiwiQXV0aG9yaXplTWl4aW4gPSByZXF1aXJlICcuL2F1dGhvcml6ZS1taXhpbidcbkNsb3VkTWV0YWRhdGEgPSAocmVxdWlyZSAnLi4vcHJvdmlkZXJzL3Byb3ZpZGVyLWludGVyZmFjZScpLkNsb3VkTWV0YWRhdGFcblxudHIgPSByZXF1aXJlICcuLi91dGlscy90cmFuc2xhdGUnXG5cbntkaXYsIGltZywgaSwgc3BhbiwgaW5wdXQsIGJ1dHRvbn0gPSBSZWFjdC5ET01cblxuRmlsZUxpc3RGaWxlID0gUmVhY3QuY3JlYXRlRmFjdG9yeSBSZWFjdC5jcmVhdGVDbGFzc1xuICBkaXNwbGF5TmFtZTogJ0ZpbGVMaXN0RmlsZSdcblxuICBjb21wb25lbnRXaWxsTW91bnQ6IC0+XG4gICAgQGxhc3RDbGljayA9IDBcblxuICBmaWxlU2VsZWN0ZWQ6ICAoZSkgLT5cbiAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICBlLnN0b3BQcm9wYWdhdGlvbigpXG4gICAgbm93ID0gKG5ldyBEYXRlKCkpLmdldFRpbWUoKVxuICAgIEBwcm9wcy5maWxlU2VsZWN0ZWQgQHByb3BzLm1ldGFkYXRhXG4gICAgaWYgbm93IC0gQGxhc3RDbGljayA8PSAyNTBcbiAgICAgIEBwcm9wcy5maWxlQ29uZmlybWVkKClcbiAgICBAbGFzdENsaWNrID0gbm93XG5cbiAgcmVuZGVyOiAtPlxuICAgIChkaXYge2tleTogQHByb3BzLmtleSwgY2xhc3NOYW1lOiAoaWYgQHByb3BzLnNlbGVjdGVkIHRoZW4gJ3NlbGVjdGVkJyBlbHNlICcnKSwgb25DbGljazogQGZpbGVTZWxlY3RlZH0sIEBwcm9wcy5tZXRhZGF0YS5uYW1lKVxuXG5GaWxlTGlzdCA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgUmVhY3QuY3JlYXRlQ2xhc3NcbiAgZGlzcGxheU5hbWU6ICdGaWxlTGlzdCdcblxuICBnZXRJbml0aWFsU3RhdGU6IC0+XG4gICAgbG9hZGluZzogdHJ1ZVxuXG4gIGNvbXBvbmVudERpZE1vdW50OiAtPlxuICAgIEBsb2FkKClcblxuICBsb2FkOiAtPlxuICAgIEBwcm9wcy5wcm92aWRlci5saXN0IEBwcm9wcy5mb2xkZXIsIChlcnIsIGxpc3QpID0+XG4gICAgICByZXR1cm4gYWxlcnQoZXJyKSBpZiBlcnJcbiAgICAgIEBzZXRTdGF0ZVxuICAgICAgICBsb2FkaW5nOiBmYWxzZVxuICAgICAgQHByb3BzLmxpc3RMb2FkZWQgbGlzdFxuXG4gIHJlbmRlcjogLT5cbiAgICAoZGl2IHtjbGFzc05hbWU6ICdmaWxlbGlzdCd9LFxuICAgICAgaWYgQHN0YXRlLmxvYWRpbmdcbiAgICAgICAgdHIgXCJ+RklMRV9ESUFMT0cuTE9BRElOR1wiXG4gICAgICBlbHNlXG4gICAgICAgIGZvciBtZXRhZGF0YSwgaSBpbiBAcHJvcHMubGlzdFxuICAgICAgICAgIChGaWxlTGlzdEZpbGUge2tleTogaSwgbWV0YWRhdGE6IG1ldGFkYXRhLCBzZWxlY3RlZDogQHByb3BzLnNlbGVjdGVkRmlsZSBpcyBtZXRhZGF0YSwgZmlsZVNlbGVjdGVkOiBAcHJvcHMuZmlsZVNlbGVjdGVkLCBmaWxlQ29uZmlybWVkOiBAcHJvcHMuZmlsZUNvbmZpcm1lZH0pXG4gICAgKVxuXG5GaWxlRGlhbG9nVGFiID0gUmVhY3QuY3JlYXRlQ2xhc3NcbiAgZGlzcGxheU5hbWU6ICdGaWxlRGlhbG9nVGFiJ1xuXG4gIG1peGluczogW0F1dGhvcml6ZU1peGluXVxuXG4gIGdldEluaXRpYWxTdGF0ZTogLT5cbiAgICBmb2xkZXI6IEBwcm9wcy5jbGllbnQuc3RhdGUubWV0YWRhdGE/LnBhcmVudCBvciBudWxsXG4gICAgbWV0YWRhdGE6IEBwcm9wcy5jbGllbnQuc3RhdGUubWV0YWRhdGFcbiAgICBmaWxlbmFtZTogQHByb3BzLmNsaWVudC5zdGF0ZS5tZXRhZGF0YT8ubmFtZSBvciAnJ1xuICAgIGxpc3Q6IFtdXG5cbiAgY29tcG9uZW50V2lsbE1vdW50OiAtPlxuICAgIEBpc09wZW4gPSBAcHJvcHMuZGlhbG9nLmFjdGlvbiBpcyAnb3BlbkZpbGUnXG5cbiAgZmlsZW5hbWVDaGFuZ2VkOiAoZSkgLT5cbiAgICBmaWxlbmFtZSA9IGUudGFyZ2V0LnZhbHVlXG4gICAgbWV0YWRhdGEgPSBAZmluZE1ldGFkYXRhIGZpbGVuYW1lXG4gICAgQHNldFN0YXRlXG4gICAgICBmaWxlbmFtZTogZmlsZW5hbWVcbiAgICAgIG1ldGFkYXRhOiBtZXRhZGF0YVxuXG4gIGxpc3RMb2FkZWQ6IChsaXN0KSAtPlxuICAgIEBzZXRTdGF0ZSBsaXN0OiBsaXN0XG5cbiAgZmlsZVNlbGVjdGVkOiAobWV0YWRhdGEpIC0+XG4gICAgaWYgbWV0YWRhdGE/LnR5cGUgaXMgQ2xvdWRNZXRhZGF0YS5GaWxlXG4gICAgICBAc2V0U3RhdGUgZmlsZW5hbWU6IG1ldGFkYXRhLm5hbWVcbiAgICBAc2V0U3RhdGUgbWV0YWRhdGE6IG1ldGFkYXRhXG5cbiAgY29uZmlybTogLT5cbiAgICBpZiBub3QgQHN0YXRlLm1ldGFkYXRhXG4gICAgICBmaWxlbmFtZSA9ICQudHJpbSBAc3RhdGUuZmlsZW5hbWVcbiAgICAgIEBzdGF0ZS5tZXRhZGF0YSA9IEBmaW5kTWV0YWRhdGEgZmlsZW5hbWVcbiAgICAgIGlmIG5vdCBAc3RhdGUubWV0YWRhdGFcbiAgICAgICAgaWYgQGlzT3BlblxuICAgICAgICAgIGFsZXJ0IFwiI3tAc3RhdGUuZmlsZW5hbWV9IG5vdCBmb3VuZFwiXG4gICAgICAgIGVsc2VcbiAgICAgICAgICBAc3RhdGUubWV0YWRhdGEgPSBuZXcgQ2xvdWRNZXRhZGF0YVxuICAgICAgICAgICAgbmFtZTogZmlsZW5hbWVcbiAgICAgICAgICAgIHBhdGg6IFwiLyN7ZmlsZW5hbWV9XCIgIyBUT0RPOiBGaXggcGF0aFxuICAgICAgICAgICAgdHlwZTogQ2xvdWRNZXRhZGF0YS5GaWxlXG4gICAgICAgICAgICBwcm92aWRlcjogQHByb3BzLnByb3ZpZGVyXG4gICAgaWYgQHN0YXRlLm1ldGFkYXRhXG4gICAgICAjIGVuc3VyZSB0aGUgbWV0YWRhdGEgcHJvdmlkZXIgaXMgdGhlIGN1cnJlbnRseS1zaG93aW5nIHRhYlxuICAgICAgQHN0YXRlLm1ldGFkYXRhLnByb3ZpZGVyID0gQHByb3BzLnByb3ZpZGVyXG4gICAgICBAcHJvcHMuZGlhbG9nLmNhbGxiYWNrIEBzdGF0ZS5tZXRhZGF0YVxuICAgICAgQHByb3BzLmNsb3NlKClcblxuICByZW1vdmU6IC0+XG4gICAgaWYgQHN0YXRlLm1ldGFkYXRhIGFuZCBAc3RhdGUubWV0YWRhdGEudHlwZSBpc250IENsb3VkTWV0YWRhdGEuRm9sZGVyIGFuZCBjb25maXJtKHRyKFwifkZJTEVfRElBTE9HLlJFTU9WRV9DT05GSVJNXCIsIHtmaWxlbmFtZTogQHN0YXRlLm1ldGFkYXRhLm5hbWV9KSlcbiAgICAgIEBwcm9wcy5wcm92aWRlci5yZW1vdmUgQHN0YXRlLm1ldGFkYXRhLCAoZXJyKSA9PlxuICAgICAgICBpZiBub3QgZXJyXG4gICAgICAgICAgbGlzdCA9IEBzdGF0ZS5saXN0LnNsaWNlIDBcbiAgICAgICAgICBpbmRleCA9IGxpc3QuaW5kZXhPZiBAc3RhdGUubWV0YWRhdGFcbiAgICAgICAgICBsaXN0LnNwbGljZSBpbmRleCwgMVxuICAgICAgICAgIEBzZXRTdGF0ZVxuICAgICAgICAgICAgbGlzdDogbGlzdFxuICAgICAgICAgICAgbWV0YWRhdGE6IG51bGxcbiAgICAgICAgICAgIGZpbGVuYW1lOiAnJ1xuXG4gIGNhbmNlbDogLT5cbiAgICBAcHJvcHMuY2xvc2UoKVxuXG4gIGZpbmRNZXRhZGF0YTogKGZpbGVuYW1lKSAtPlxuICAgIGZvciBtZXRhZGF0YSBpbiBAc3RhdGUubGlzdFxuICAgICAgaWYgbWV0YWRhdGEubmFtZSBpcyBmaWxlbmFtZVxuICAgICAgICByZXR1cm4gbWV0YWRhdGFcbiAgICBudWxsXG5cbiAgd2F0Y2hGb3JFbnRlcjogKGUpIC0+XG4gICAgaWYgZS5rZXlDb2RlIGlzIDEzIGFuZCBub3QgQGNvbmZpcm1EaXNhYmxlZCgpXG4gICAgICBAY29uZmlybSgpXG5cbiAgY29uZmlybURpc2FibGVkOiAtPlxuICAgIChAc3RhdGUuZmlsZW5hbWUubGVuZ3RoIGlzIDApIG9yIChAaXNPcGVuIGFuZCBub3QgQHN0YXRlLm1ldGFkYXRhKVxuXG4gIHJlbmRlcldoZW5BdXRob3JpemVkOiAtPlxuICAgIGNvbmZpcm1EaXNhYmxlZCA9IEBjb25maXJtRGlzYWJsZWQoKVxuICAgIHJlbW92ZURpc2FibGVkID0gKEBzdGF0ZS5tZXRhZGF0YSBpcyBudWxsKSBvciAoQHN0YXRlLm1ldGFkYXRhLnR5cGUgaXMgQ2xvdWRNZXRhZGF0YS5Gb2xkZXIpXG5cbiAgICAoZGl2IHtjbGFzc05hbWU6ICdkaWFsb2dUYWInfSxcbiAgICAgIChpbnB1dCB7dHlwZTogJ3RleHQnLCB2YWx1ZTogQHN0YXRlLmZpbGVuYW1lLCBwbGFjZWhvbGRlcjogKHRyIFwifkZJTEVfRElBTE9HLkZJTEVOQU1FXCIpLCBvbkNoYW5nZTogQGZpbGVuYW1lQ2hhbmdlZCwgb25LZXlEb3duOiBAd2F0Y2hGb3JFbnRlcn0pXG4gICAgICAoRmlsZUxpc3Qge3Byb3ZpZGVyOiBAcHJvcHMucHJvdmlkZXIsIGZvbGRlcjogQHN0YXRlLmZvbGRlciwgc2VsZWN0ZWRGaWxlOiBAc3RhdGUubWV0YWRhdGEsIGZpbGVTZWxlY3RlZDogQGZpbGVTZWxlY3RlZCwgZmlsZUNvbmZpcm1lZDogQGNvbmZpcm0sIGxpc3Q6IEBzdGF0ZS5saXN0LCBsaXN0TG9hZGVkOiBAbGlzdExvYWRlZH0pXG4gICAgICAoZGl2IHtjbGFzc05hbWU6ICdidXR0b25zJ30sXG4gICAgICAgIChidXR0b24ge29uQ2xpY2s6IEBjb25maXJtLCBkaXNhYmxlZDogY29uZmlybURpc2FibGVkLCBjbGFzc05hbWU6IGlmIGNvbmZpcm1EaXNhYmxlZCB0aGVuICdkaXNhYmxlZCcgZWxzZSAnJ30sIGlmIEBpc09wZW4gdGhlbiAodHIgXCJ+RklMRV9ESUFMT0cuT1BFTlwiKSBlbHNlICh0ciBcIn5GSUxFX0RJQUxPRy5TQVZFXCIpKVxuICAgICAgICBpZiBAcHJvcHMucHJvdmlkZXIuY2FuICdyZW1vdmUnXG4gICAgICAgICAgKGJ1dHRvbiB7b25DbGljazogQHJlbW92ZSwgZGlzYWJsZWQ6IHJlbW92ZURpc2FibGVkLCBjbGFzc05hbWU6IGlmIHJlbW92ZURpc2FibGVkIHRoZW4gJ2Rpc2FibGVkJyBlbHNlICcnfSwgKHRyIFwifkZJTEVfRElBTE9HLlJFTU9WRVwiKSlcbiAgICAgICAgKGJ1dHRvbiB7b25DbGljazogQGNhbmNlbH0sICh0ciBcIn5GSUxFX0RJQUxPRy5DQU5DRUxcIikpXG4gICAgICApXG4gICAgKVxuXG5tb2R1bGUuZXhwb3J0cyA9IEZpbGVEaWFsb2dUYWJcbiIsIntkaXYsIGksIHNwYW59ID0gUmVhY3QuRE9NXG5cbkRyb3Bkb3duID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL2Ryb3Bkb3duLXZpZXcnXG5cbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3NcblxuICBkaXNwbGF5TmFtZTogJ01lbnVCYXInXG5cbiAgaGVscDogLT5cbiAgICB3aW5kb3cub3BlbiBAcHJvcHMub3B0aW9ucy5oZWxwLCAnX2JsYW5rJ1xuXG4gIHJlbmRlcjogLT5cbiAgICAoZGl2IHtjbGFzc05hbWU6ICdtZW51LWJhcid9LFxuICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnbWVudS1iYXItbGVmdCd9LFxuICAgICAgICAoRHJvcGRvd24ge1xuICAgICAgICAgIGFuY2hvcjogQHByb3BzLmZpbGVuYW1lXG4gICAgICAgICAgaXRlbXM6IEBwcm9wcy5pdGVtc1xuICAgICAgICAgIGNsYXNzTmFtZTonbWVudS1iYXItY29udGVudC1maWxlbmFtZSd9KVxuICAgICAgICBpZiBAcHJvcHMuZmlsZVN0YXR1c1xuICAgICAgICAgIChzcGFuIHtjbGFzc05hbWU6IFwibWVudS1iYXItZmlsZS1zdGF0dXMtI3tAcHJvcHMuZmlsZVN0YXR1cy50eXBlfVwifSwgQHByb3BzLmZpbGVTdGF0dXMubWVzc2FnZSlcbiAgICAgIClcbiAgICAgIChkaXYge2NsYXNzTmFtZTogJ21lbnUtYmFyLXJpZ2h0J30sXG4gICAgICAgIGlmIEBwcm9wcy5vcHRpb25zLmluZm9cbiAgICAgICAgICAoc3BhbiB7Y2xhc3NOYW1lOiAnbWVudS1iYXItaW5mbyd9LCBAcHJvcHMub3B0aW9ucy5pbmZvKVxuICAgICAgICBpZiBAcHJvcHMucHJvdmlkZXIgYW5kIEBwcm9wcy5wcm92aWRlci5hdXRob3JpemVkKClcbiAgICAgICAgICBAcHJvcHMucHJvdmlkZXIucmVuZGVyVXNlcigpXG4gICAgICAgIGlmIEBwcm9wcy5vcHRpb25zLmhlbHBcbiAgICAgICAgICAoaSB7c3R5bGU6IHtmb250U2l6ZTogXCIxM3B4XCJ9LCBjbGFzc05hbWU6ICdjbGlja2FibGUgaWNvbi1oZWxwJywgb25DbGljazogQGhlbHB9KVxuICAgICAgKVxuICAgIClcbiIsIk1vZGFsID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL21vZGFsLXZpZXcnXG57ZGl2LCBpfSA9IFJlYWN0LkRPTVxuXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzXG5cbiAgZGlzcGxheU5hbWU6ICdNb2RhbERpYWxvZydcblxuICBjbG9zZTogLT5cbiAgICBAcHJvcHMuY2xvc2U/KClcblxuICByZW5kZXI6IC0+XG4gICAgKE1vZGFsIHtjbG9zZTogQHByb3BzLmNsb3NlfSxcbiAgICAgIChkaXYge2NsYXNzTmFtZTogJ21vZGFsLWRpYWxvZyd9LFxuICAgICAgICAoZGl2IHtjbGFzc05hbWU6ICdtb2RhbC1kaWFsb2ctd3JhcHBlcid9LFxuICAgICAgICAgIChkaXYge2NsYXNzTmFtZTogJ21vZGFsLWRpYWxvZy10aXRsZSd9LFxuICAgICAgICAgICAgKGkge2NsYXNzTmFtZTogXCJtb2RhbC1kaWFsb2ctdGl0bGUtY2xvc2UgaWNvbi1leFwiLCBvbkNsaWNrOiBAY2xvc2V9KVxuICAgICAgICAgICAgQHByb3BzLnRpdGxlIG9yICdVbnRpdGxlZCBEaWFsb2cnXG4gICAgICAgICAgKVxuICAgICAgICAgIChkaXYge2NsYXNzTmFtZTogJ21vZGFsLWRpYWxvZy13b3Jrc3BhY2UnfSwgQHByb3BzLmNoaWxkcmVuKVxuICAgICAgICApXG4gICAgICApXG4gICAgKVxuIiwiTW9kYWxEaWFsb2cgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vbW9kYWwtZGlhbG9nLXZpZXcnXG5UYWJiZWRQYW5lbCA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi90YWJiZWQtcGFuZWwtdmlldydcblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzc1xuXG4gIGRpc3BsYXlOYW1lOiAnTW9kYWxUYWJiZWREaWFsb2dWaWV3J1xuXG4gIHJlbmRlcjogLT5cbiAgICAoTW9kYWxEaWFsb2cge3RpdGxlOiBAcHJvcHMudGl0bGUsIGNsb3NlOiBAcHJvcHMuY2xvc2V9LFxuICAgICAgKFRhYmJlZFBhbmVsIHt0YWJzOiBAcHJvcHMudGFicywgc2VsZWN0ZWRUYWJJbmRleDogQHByb3BzLnNlbGVjdGVkVGFiSW5kZXh9KVxuICAgIClcbiIsIntkaXZ9ID0gUmVhY3QuRE9NXG5cbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3NcblxuICBkaXNwbGF5TmFtZTogJ01vZGFsJ1xuXG4gIHdhdGNoRm9yRXNjYXBlOiAoZSkgLT5cbiAgICBpZiBlLmtleUNvZGUgaXMgMjdcbiAgICAgIEBwcm9wcy5jbG9zZT8oKVxuXG4gIGNvbXBvbmVudERpZE1vdW50OiAtPlxuICAgICQod2luZG93KS5vbiAna2V5dXAnLCBAd2F0Y2hGb3JFc2NhcGVcblxuICBjb21wb25lbnRXaWxsVW5tb3VudDogLT5cbiAgICAkKHdpbmRvdykub2ZmICdrZXl1cCcsIEB3YXRjaEZvckVzY2FwZVxuXG4gIHJlbmRlcjogLT5cbiAgICAoZGl2IHtjbGFzc05hbWU6ICdtb2RhbCd9LFxuICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnbW9kYWwtYmFja2dyb3VuZCd9KVxuICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnbW9kYWwtY29udGVudCd9LCBAcHJvcHMuY2hpbGRyZW4pXG4gICAgKVxuIiwiTW9kYWxUYWJiZWREaWFsb2cgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vbW9kYWwtdGFiYmVkLWRpYWxvZy12aWV3J1xuVGFiYmVkUGFuZWwgPSByZXF1aXJlICcuL3RhYmJlZC1wYW5lbC12aWV3J1xuQ2xvdWRNZXRhZGF0YSA9IChyZXF1aXJlICcuLi9wcm92aWRlcnMvcHJvdmlkZXItaW50ZXJmYWNlJykuQ2xvdWRNZXRhZGF0YVxuRmlsZURpYWxvZ1RhYiA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9maWxlLWRpYWxvZy10YWItdmlldydcblNlbGVjdFByb3ZpZGVyRGlhbG9nVGFiID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL3NlbGVjdC1wcm92aWRlci1kaWFsb2ctdGFiLXZpZXcnXG5cbnRyID0gcmVxdWlyZSAnLi4vdXRpbHMvdHJhbnNsYXRlJ1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzXG4gIGRpc3BsYXlOYW1lOiAnUHJvdmlkZXJUYWJiZWREaWFsb2cnXG5cbiAgcmVuZGVyOiAgLT5cbiAgICBbY2FwYWJpbGl0eSwgVGFiQ29tcG9uZW50XSA9IHN3aXRjaCBAcHJvcHMuZGlhbG9nLmFjdGlvblxuICAgICAgd2hlbiAnb3BlbkZpbGUnIHRoZW4gWydsaXN0JywgRmlsZURpYWxvZ1RhYl1cbiAgICAgIHdoZW4gJ3NhdmVGaWxlJywgJ3NhdmVGaWxlQXMnIHRoZW4gWydzYXZlJywgRmlsZURpYWxvZ1RhYl1cbiAgICAgIHdoZW4gJ3NlbGVjdFByb3ZpZGVyJyB0aGVuIFtudWxsLCBTZWxlY3RQcm92aWRlckRpYWxvZ1RhYl1cblxuICAgIHRhYnMgPSBbXVxuICAgIHNlbGVjdGVkVGFiSW5kZXggPSAwXG4gICAgZm9yIHByb3ZpZGVyLCBpIGluIEBwcm9wcy5jbGllbnQuc3RhdGUuYXZhaWxhYmxlUHJvdmlkZXJzXG4gICAgICBpZiBub3QgY2FwYWJpbGl0eSBvciBwcm92aWRlci5jYXBhYmlsaXRpZXNbY2FwYWJpbGl0eV1cbiAgICAgICAgY29tcG9uZW50ID0gVGFiQ29tcG9uZW50XG4gICAgICAgICAgY2xpZW50OiBAcHJvcHMuY2xpZW50XG4gICAgICAgICAgZGlhbG9nOiBAcHJvcHMuZGlhbG9nXG4gICAgICAgICAgY2xvc2U6IEBwcm9wcy5jbG9zZVxuICAgICAgICAgIHByb3ZpZGVyOiBwcm92aWRlclxuICAgICAgICB0YWJzLnB1c2ggVGFiYmVkUGFuZWwuVGFiIHtrZXk6IGksIGxhYmVsOiAodHIgcHJvdmlkZXIuZGlzcGxheU5hbWUpLCBjb21wb25lbnQ6IGNvbXBvbmVudH1cbiAgICAgICAgaWYgcHJvdmlkZXIgaXMgQHByb3BzLmNsaWVudC5zdGF0ZS5tZXRhZGF0YT8ucHJvdmlkZXJcbiAgICAgICAgICBzZWxlY3RlZFRhYkluZGV4ID0gaVxuXG4gICAgKE1vZGFsVGFiYmVkRGlhbG9nIHt0aXRsZTogKHRyIEBwcm9wcy5kaWFsb2cudGl0bGUpLCBjbG9zZTogQHByb3BzLmNsb3NlLCB0YWJzOiB0YWJzLCBzZWxlY3RlZFRhYkluZGV4OiBzZWxlY3RlZFRhYkluZGV4fSlcbiIsIntkaXYsIGlucHV0LCBhLCBidXR0b259ID0gUmVhY3QuRE9NXG5cbk1vZGFsRGlhbG9nID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL21vZGFsLWRpYWxvZy12aWV3J1xuXG50ciA9IHJlcXVpcmUgJy4uL3V0aWxzL3RyYW5zbGF0ZSdcblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzc1xuXG4gIGRpc3BsYXlOYW1lOiAnUmVuYW1lRGlhbG9nVmlldydcblxuICBnZXRJbml0aWFsU3RhdGU6IC0+XG4gICAgZmlsZW5hbWU6IEB0cmltKEBwcm9wcy5maWxlbmFtZSBvciAnJylcblxuICBjb21wb25lbnREaWRNb3VudDogLT5cbiAgICBAZmlsZW5hbWUgPSBSZWFjdC5maW5kRE9NTm9kZSBAcmVmcy5maWxlbmFtZVxuICAgIEBmaWxlbmFtZS5mb2N1cygpXG5cbiAgdXBkYXRlRmlsZW5hbWU6IC0+XG4gICAgQHNldFN0YXRlIGZpbGVuYW1lOiBAdHJpbShAZmlsZW5hbWUudmFsdWUpXG5cbiAgdHJpbTogKHMpIC0+XG4gICAgcy5yZXBsYWNlIC9eXFxzK3xcXHMrJC8sICcnXG5cbiAgcmVuYW1lOiAoZSkgLT5cbiAgICBpZiBAc3RhdGUuZmlsZW5hbWUubGVuZ3RoID4gMFxuICAgICAgQHByb3BzLmNhbGxiYWNrPyBAc3RhdGUuZmlsZW5hbWVcbiAgICAgIEBwcm9wcy5jbG9zZSgpXG4gICAgZWxzZVxuICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICBAZmlsZW5hbWUuZm9jdXMoKVxuXG4gIHJlbmRlcjogLT5cbiAgICAoTW9kYWxEaWFsb2cge3RpdGxlOiAodHIgJ35ESUFMT0cuRE9XTkxPQUQnKSwgY2xvc2U6IEBwcm9wcy5jbG9zZX0sXG4gICAgICAoZGl2IHtjbGFzc05hbWU6ICdyZW5hbWUtZGlhbG9nJ30sXG4gICAgICAgIChpbnB1dCB7cmVmOiAnZmlsZW5hbWUnLCBwbGFjZWhvbGRlcjogJ0ZpbGVuYW1lJywgdmFsdWU6IEBzdGF0ZS5maWxlbmFtZSwgb25DaGFuZ2U6IEB1cGRhdGVGaWxlbmFtZX0pXG4gICAgICAgIChkaXYge2NsYXNzTmFtZTogJ2J1dHRvbnMnfSxcbiAgICAgICAgICAoYnV0dG9uIHtjbGFzc05hbWU6IChpZiBAc3RhdGUuZmlsZW5hbWUubGVuZ3RoIGlzIDAgdGhlbiAnZGlzYWJsZWQnIGVsc2UgJycpLCBvbkNsaWNrOiBAcmVuYW1lfSwgdHIgJ35SRU5BTUVfRElBTE9HLlJFTkFNRScpXG4gICAgICAgICAgKGJ1dHRvbiB7b25DbGljazogQHByb3BzLmNsb3NlfSwgdHIgJ35SRU5BTUVfRElBTE9HLkNBTkNFTCcpXG4gICAgICAgIClcbiAgICAgIClcbiAgICApXG4iLCJ7ZGl2fSA9IFJlYWN0LkRPTVxuXG5TZWxlY3RQcm92aWRlckRpYWxvZ1RhYiA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgUmVhY3QuY3JlYXRlQ2xhc3NcbiAgZGlzcGxheU5hbWU6ICdTZWxlY3RQcm92aWRlckRpYWxvZ1RhYidcbiAgcmVuZGVyOiAtPiAoZGl2IHt9LCBcIlRPRE86IFNlbGVjdFByb3ZpZGVyRGlhbG9nVGFiOiAje0Bwcm9wcy5wcm92aWRlci5kaXNwbGF5TmFtZX1cIilcblxubW9kdWxlLmV4cG9ydHMgPSBTZWxlY3RQcm92aWRlckRpYWxvZ1RhYlxuIiwie2RpdiwgdWwsIGxpLCBhfSA9IFJlYWN0LkRPTVxuXG5jbGFzcyBUYWJJbmZvXG4gIGNvbnN0cnVjdG9yOiAoc2V0dGluZ3M9e30pIC0+XG4gICAge0BsYWJlbCwgQGNvbXBvbmVudH0gPSBzZXR0aW5nc1xuXG5UYWIgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IFJlYWN0LmNyZWF0ZUNsYXNzXG5cbiAgZGlzcGxheU5hbWU6ICdUYWJiZWRQYW5lbFRhYidcblxuICBjbGlja2VkOiAoZSkgLT5cbiAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICBAcHJvcHMub25TZWxlY3RlZCBAcHJvcHMuaW5kZXhcblxuICByZW5kZXI6IC0+XG4gICAgY2xhc3NuYW1lID0gaWYgQHByb3BzLnNlbGVjdGVkIHRoZW4gJ3RhYi1zZWxlY3RlZCcgZWxzZSAnJ1xuICAgIChsaSB7Y2xhc3NOYW1lOiBjbGFzc25hbWUsIG9uQ2xpY2s6IEBjbGlja2VkfSwgQHByb3BzLmxhYmVsKVxuXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzXG5cbiAgZGlzcGxheU5hbWU6ICdUYWJiZWRQYW5lbFZpZXcnXG5cbiAgZ2V0SW5pdGlhbFN0YXRlOiAtPlxuICAgIHNlbGVjdGVkVGFiSW5kZXg6IEBwcm9wcy5zZWxlY3RlZFRhYkluZGV4IG9yIDBcblxuICBzdGF0aWNzOlxuICAgIFRhYjogKHNldHRpbmdzKSAtPiBuZXcgVGFiSW5mbyBzZXR0aW5nc1xuXG4gIHNlbGVjdGVkVGFiOiAoaW5kZXgpIC0+XG4gICAgQHNldFN0YXRlIHNlbGVjdGVkVGFiSW5kZXg6IGluZGV4XG5cbiAgcmVuZGVyVGFiOiAodGFiLCBpbmRleCkgLT5cbiAgICAoVGFiXG4gICAgICBsYWJlbDogdGFiLmxhYmVsXG4gICAgICBrZXk6IGluZGV4XG4gICAgICBpbmRleDogaW5kZXhcbiAgICAgIHNlbGVjdGVkOiAoaW5kZXggaXMgQHN0YXRlLnNlbGVjdGVkVGFiSW5kZXgpXG4gICAgICBvblNlbGVjdGVkOiBAc2VsZWN0ZWRUYWJcbiAgICApXG5cbiAgcmVuZGVyVGFiczogLT5cbiAgICAoZGl2IHtjbGFzc05hbWU6ICd3b3Jrc3BhY2UtdGFicyd9LFxuICAgICAgKHVsIHtrZXk6IGluZGV4fSwgQHJlbmRlclRhYih0YWIsIGluZGV4KSBmb3IgdGFiLCBpbmRleCBpbiBAcHJvcHMudGFicylcbiAgICApXG5cbiAgcmVuZGVyU2VsZWN0ZWRQYW5lbDogLT5cbiAgICAoZGl2IHtjbGFzc05hbWU6ICd3b3Jrc3BhY2UtdGFiLWNvbXBvbmVudCd9LFxuICAgICAgZm9yIHRhYiwgaW5kZXggaW4gQHByb3BzLnRhYnNcbiAgICAgICAgKGRpdiB7XG4gICAgICAgICAga2V5OiBpbmRleFxuICAgICAgICAgIHN0eWxlOlxuICAgICAgICAgICAgZGlzcGxheTogaWYgaW5kZXggaXMgQHN0YXRlLnNlbGVjdGVkVGFiSW5kZXggdGhlbiAnYmxvY2snIGVsc2UgJ25vbmUnXG4gICAgICAgICAgfSxcbiAgICAgICAgICB0YWIuY29tcG9uZW50XG4gICAgICAgIClcbiAgICApXG5cbiAgcmVuZGVyOiAtPlxuICAgIChkaXYge2tleTogQHByb3BzLmtleSwgY2xhc3NOYW1lOiBcInRhYmJlZC1wYW5lbFwifSxcbiAgICAgIEByZW5kZXJUYWJzKClcbiAgICAgIEByZW5kZXJTZWxlY3RlZFBhbmVsKClcbiAgICApXG4iXX0=
