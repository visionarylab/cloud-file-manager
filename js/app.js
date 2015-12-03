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
    var patchable, ref, ref1;
    if (callback == null) {
      callback = null;
    }
    patchable = ((ref = this.state.metadata) != null ? ref.overwritable : void 0) && ((ref1 = this.state.metadata) != null ? ref1.provider.can('patch') : void 0);
    return this._event('getContent', {
      patchable: patchable
    }, (function(_this) {
      return function(content, isPatch) {
        return _this.saveContent(content, isPatch, callback);
      };
    })(this));
  };

  CloudFileManagerClient.prototype.saveContent = function(content, isPatch, callback) {
    if (callback == null) {
      callback = null;
    }
    if (this.state.metadata) {
      return this.saveFile(content, isPatch, this.state.metadata, callback);
    } else {
      return this.saveFileDialog(content, callback);
    }
  };

  CloudFileManagerClient.prototype.saveFile = function(content, isPatch, metadata, callback) {
    var method, ref, ref1;
    if (callback == null) {
      callback = null;
    }
    if (isPatch && (metadata != null ? (ref = metadata.provider) != null ? ref.can(method = 'patch') : void 0 : void 0) || (metadata != null ? (ref1 = metadata.provider) != null ? ref1.can(method = 'save') : void 0 : void 0)) {
      this._setState({
        saving: metadata
      });
      return metadata.provider[method](content, metadata, (function(_this) {
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
            return _this.state.metadata.provider.rename(_this.state.metadata, newName, function(err, metadata) {
              if (err) {
                return _this._error(err);
              }
              _this._setState({
                metadata: metadata
              });
              _this._event('renamedFile', {
                metadata: metadata
              });
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
      return this.saveFile(content, false, metadata, callback);
    } else {
      return this._event('getContent', {}, (function(_this) {
        return function(content) {
          return _this.saveFile(content, false, metadata, callback);
        };
      })(this));
    }
  };

  CloudFileManagerClient.prototype._error = function(message) {
    return alert(message);
  };

  CloudFileManagerClient.prototype._fileChanged = function(type, content, metadata) {
    metadata.overwritable = true;
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
var CloudMetadata, DocumentStoreAuthorizationDialog, DocumentStoreProvider, ProviderInterface, authorizeUrl, button, checkLoginUrl, div, documentStore, isString, listUrl, loadDocumentUrl, patchDocumentUrl, ref, removeDocumentUrl, renameDocumentUrl, saveDocumentUrl, span, tr,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

ref = React.DOM, div = ref.div, button = ref.button, span = ref.span;

documentStore = "http://document-store.herokuapp.com";

authorizeUrl = documentStore + "/user/authenticate";

checkLoginUrl = documentStore + "/user/info";

listUrl = documentStore + "/document/all";

loadDocumentUrl = documentStore + "/document/open";

saveDocumentUrl = documentStore + "/document/save";

patchDocumentUrl = documentStore + "/document/patch";

removeDocumentUrl = documentStore + "/document/delete";

renameDocumentUrl = documentStore + "/document/rename";

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
        rename: true,
        patch: true
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
      url: loadDocumentUrl,
      data: {
        recordid: metadata.providerData.id
      },
      context: this,
      xhrFields: {
        withCredentials: true
      },
      success: function(data) {
        return callback(null, data.content);
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

  DocumentStoreProvider.prototype.patch = function(content, metadata, callback) {
    var url;
    if (!((metadata != null ? metadata.overwritable : void 0) && metadata.providerData.id)) {
      return this.save(content, metadata, callback);
    }
    url = this._addParams(patchDocumentUrl, {
      recordid: metadata.providerData.id
    });
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

  DocumentStoreProvider.prototype.rename = function(metadata, newName, callback) {
    return $.ajax({
      url: renameDocumentUrl,
      data: {
        recordid: metadata.providerData.id,
        newRecordname: newName
      },
      context: this,
      xhrFields: {
        withCredentials: true
      },
      success: function(data) {
        metadata.name = newName;
        return callback(null, metadata);
      },
      error: function() {
        return callback("Unable to rename " + metadata.name);
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
    try {
      content = JSON.parse(content);
    } catch (error) {
      content = {
        content: content
      };
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

  GoogleDriveProvider.prototype.rename = function(metadata, newName, callback) {
    return this._loadedGAPI(function() {
      var request;
      request = gapi.client.drive.files.patch({
        fileId: metadata.providerData.id,
        resource: {
          title: newName
        }
      });
      return request.execute(function(result) {
        if (result != null ? result.error : void 0) {
          return typeof callback === "function" ? callback(result.error) : void 0;
        } else {
          metadata.name = newName;
          return callback(null, metadata);
        }
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
    if (window._LoadedGAPIClients) {
      return callback();
    } else {
      self = this;
      check = function() {
        if (window._LoadedGAPI) {
          return gapi.client.load('drive', 'v2', function() {
            return gapi.client.load('oauth2', 'v2', function() {
              window._LoadedGAPIClients = true;
              return callback.call(self);
            });
          });
        } else {
          return setTimeout(check, 10);
        }
      };
      return setTimeout(check, 10);
    }
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

  LocalStorageProvider.prototype.rename = function(metadata, newName, callback) {
    var content, error;
    try {
      content = window.localStorage.getItem(this._getKey(metadata.name));
      window.localStorage.setItem(this._getKey(newName), content);
      window.localStorage.removeItem(this._getKey(metadata.name));
      metadata.name = newName;
      return callback(null, metadata);
    } catch (error) {
      return typeof callback === "function" ? callback('Unable to rename') : void 0;
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
    this.name = options.name, this.path = options.path, this.type = options.type, this.provider = options.provider, this.providerData = (ref = options.providerData) != null ? ref : {}, this.overwritable = options.overwritable;
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

  ProviderInterface.prototype.patch = function(metadata, newName, callback) {
    return this._notImplemented('patch');
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
    var filename, state;
    filename = this.props.filename || '';
    return state = {
      filename: filename,
      trimmedFilename: this.trim(filename)
    };
  },
  componentDidMount: function() {
    this.filename = React.findDOMNode(this.refs.filename);
    return this.filename.focus();
  },
  updateFilename: function() {
    var filename;
    filename = this.filename.value;
    return this.setState({
      filename: filename,
      trimmedFilename: this.trim(filename)
    });
  },
  trim: function(s) {
    return s.replace(/^\s+|\s+$/, '');
  },
  download: function(e) {
    if (this.state.trimmedFilename.length > 0) {
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
      className: (this.state.trimmedFilename.length === 0 ? 'disabled' : ''),
      download: this.state.trimmedFilename,
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
    var filename, state;
    filename = this.props.filename || '';
    return state = {
      filename: filename,
      trimmedFilename: this.trim(filename)
    };
  },
  componentDidMount: function() {
    this.filename = React.findDOMNode(this.refs.filename);
    return this.filename.focus();
  },
  updateFilename: function() {
    var filename;
    filename = this.filename.value;
    return this.setState({
      filename: filename,
      trimmedFilename: this.trim(filename)
    });
  },
  trim: function(s) {
    return s.replace(/^\s+|\s+$/, '');
  },
  rename: function(e) {
    var base;
    if (this.state.trimmedFilename.length > 0) {
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
      className: (this.state.trimmedFilename.length === 0 ? 'disabled' : ''),
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFxhcHAuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxcY2xpZW50LmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHByb3ZpZGVyc1xcZG9jdW1lbnQtc3RvcmUtcHJvdmlkZXIuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxccHJvdmlkZXJzXFxnb29nbGUtZHJpdmUtcHJvdmlkZXIuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxccHJvdmlkZXJzXFxsb2NhbHN0b3JhZ2UtcHJvdmlkZXIuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxccHJvdmlkZXJzXFxwcm92aWRlci1pbnRlcmZhY2UuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxccHJvdmlkZXJzXFxyZWFkb25seS1wcm92aWRlci5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx1aS5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx1dGlsc1xcaXMtc3RyaW5nLmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHV0aWxzXFxsYW5nXFxlbi11cy5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx1dGlsc1xcdHJhbnNsYXRlLmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHZpZXdzXFxhcHAtdmlldy5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx2aWV3c1xcYXV0aG9yaXplLW1peGluLmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHZpZXdzXFxkb3dubG9hZC1kaWFsb2ctdmlldy5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx2aWV3c1xcZHJvcGRvd24tdmlldy5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx2aWV3c1xcZmlsZS1kaWFsb2ctdGFiLXZpZXcuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxcdmlld3NcXG1lbnUtYmFyLXZpZXcuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxcdmlld3NcXG1vZGFsLWRpYWxvZy12aWV3LmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHZpZXdzXFxtb2RhbC10YWJiZWQtZGlhbG9nLXZpZXcuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxcdmlld3NcXG1vZGFsLXZpZXcuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxcdmlld3NcXHByb3ZpZGVyLXRhYmJlZC1kaWFsb2ctdmlldy5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx2aWV3c1xccmVuYW1lLWRpYWxvZy12aWV3LmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHZpZXdzXFxzZWxlY3QtcHJvdmlkZXItZGlhbG9nLXRhYi12aWV3LmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHZpZXdzXFx0YWJiZWQtcGFuZWwtdmlldy5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQSxJQUFBOztBQUFBLE9BQUEsR0FBVSxLQUFLLENBQUMsYUFBTixDQUFvQixPQUFBLENBQVEsa0JBQVIsQ0FBcEI7O0FBRVYsc0JBQUEsR0FBeUIsQ0FBQyxPQUFBLENBQVEsTUFBUixDQUFELENBQWdCLENBQUM7O0FBQzFDLHNCQUFBLEdBQXlCLENBQUMsT0FBQSxDQUFRLFVBQVIsQ0FBRCxDQUFvQixDQUFDOztBQUV4QztFQUVTLDBCQUFDLE9BQUQ7SUFFWCxJQUFDLENBQUEsV0FBRCxHQUFlLHNCQUFzQixDQUFDO0lBRXRDLElBQUMsQ0FBQSxNQUFELEdBQWMsSUFBQSxzQkFBQSxDQUFBO0lBQ2QsSUFBQyxDQUFBLFVBQUQsR0FBYztFQUxIOzs2QkFPYixJQUFBLEdBQU0s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TUFHQSxRQUFBLEVBQVcsS0FBQSxLQUFTLElBQUMsQ0FBQSxLQUFLLENBQUMsZ0JBSDNCO01BSUEsVUFBQSxFQUFZLElBQUMsQ0FBQSxXQUpiO0tBREQ7RUFEUSxDQVhYO0VBb0JBLFVBQUEsRUFBWSxTQUFBO0FBQ1YsUUFBQTtXQUFDLEdBQUEsQ0FBSTtNQUFDLFNBQUEsRUFBVyxnQkFBWjtLQUFKOztBQUNFO0FBQUE7V0FBQSxzREFBQTs7cUJBQUEsRUFBQSxDQUFHO1VBQUMsR0FBQSxFQUFLLEtBQU47U0FBSCxFQUFpQixJQUFDLENBQUEsU0FBRCxDQUFXLEdBQVgsRUFBZ0IsS0FBaEIsQ0FBakI7QUFBQTs7aUJBREY7RUFEUyxDQXBCWjtFQXlCQSxtQkFBQSxFQUFxQixTQUFBO0FBQ25CLFFBQUE7V0FBQyxHQUFBLENBQUk7TUFBQyxTQUFBLEVBQVcseUJBQVo7S0FBSjs7QUFDQztBQUFBO1dBQUEsc0RBQUE7O3FCQUNHLEdBQUEsQ0FBSTtVQUNILEdBQUEsRUFBSyxLQURGO1VBRUgsS0FBQSxFQUNFO1lBQUEsT0FBQSxFQUFZLEtBQUEsS0FBUyxJQUFDLENBQUEsS0FBSyxDQUFDLGdCQUFuQixHQUF5QyxPQUF6QyxHQUFzRCxNQUEvRDtXQUhDO1NBQUosRUFLQyxHQUFHLENBQUMsU0FMTDtBQURIOztpQkFERDtFQURrQixDQXpCckI7RUFxQ0EsTUFBQSxFQUFRLFNBQUE7V0FDTCxHQUFBLENBQUk7TUFBQyxHQUFBLEVBQUssSUFBQyxDQUFBLEtBQUssQ0FBQyxHQUFiO01BQWtCLFNBQUEsRUFBVyxjQUE3QjtLQUFKLEVBQ0MsSUFBQyxDQUFBLFVBQUQsQ0FBQSxDQURELEVBRUMsSUFBQyxDQUFBLG1CQUFELENBQUEsQ0FGRDtFQURLLENBckNSO0NBRmUiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiQXBwVmlldyA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi92aWV3cy9hcHAtdmlldydcclxuXHJcbkNsb3VkRmlsZU1hbmFnZXJVSU1lbnUgPSAocmVxdWlyZSAnLi91aScpLkNsb3VkRmlsZU1hbmFnZXJVSU1lbnVcclxuQ2xvdWRGaWxlTWFuYWdlckNsaWVudCA9IChyZXF1aXJlICcuL2NsaWVudCcpLkNsb3VkRmlsZU1hbmFnZXJDbGllbnRcclxuXHJcbmNsYXNzIENsb3VkRmlsZU1hbmFnZXJcclxuXHJcbiAgY29uc3RydWN0b3I6IChvcHRpb25zKSAtPlxyXG4gICAgIyBzaW5jZSB0aGUgbW9kdWxlIGV4cG9ydHMgYW4gaW5zdGFuY2Ugb2YgdGhlIGNsYXNzIHdlIG5lZWQgdG8gZmFrZSBhIGNsYXNzIHZhcmlhYmxlIGFzIGFuIGluc3RhbmNlIHZhcmlhYmxlXHJcbiAgICBARGVmYXVsdE1lbnUgPSBDbG91ZEZpbGVNYW5hZ2VyVUlNZW51LkRlZmF1bHRNZW51XHJcblxyXG4gICAgQGNsaWVudCA9IG5ldyBDbG91ZEZpbGVNYW5hZ2VyQ2xpZW50KClcclxuICAgIEBhcHBPcHRpb25zID0ge31cclxuXHJcbiAgaW5pdDogKEBhcHBPcHRpb25zLCB1c2luZ0lmcmFtZSA9IGZhbHNlKSAtPlxyXG4gICAgQGFwcE9wdGlvbnMudXNpbmdJZnJhbWUgPSB1c2luZ0lmcmFtZVxyXG4gICAgQGNsaWVudC5zZXRBcHBPcHRpb25zIEBhcHBPcHRpb25zXHJcblxyXG4gIGNyZWF0ZUZyYW1lOiAoQGFwcE9wdGlvbnMsIGVsZW1JZCkgLT5cclxuICAgIEBpbml0IEBhcHBPcHRpb25zLCB0cnVlXHJcbiAgICBAX3JlbmRlckFwcCBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChlbGVtSWQpXHJcblxyXG4gIGNsaWVudENvbm5lY3Q6IChldmVudENhbGxiYWNrKSAtPlxyXG4gICAgaWYgbm90IEBhcHBPcHRpb25zLnVzaW5nSWZyYW1lXHJcbiAgICAgIEBfY3JlYXRlSGlkZGVuQXBwKClcclxuICAgIEBjbGllbnQuY29ubmVjdCBldmVudENhbGxiYWNrXHJcblxyXG4gIF9jcmVhdGVIaWRkZW5BcHA6IC0+XHJcbiAgICBhbmNob3IgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpXHJcbiAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGFuY2hvcilcclxuICAgIEBfcmVuZGVyQXBwIGFuY2hvclxyXG5cclxuICBfcmVuZGVyQXBwOiAoYW5jaG9yKSAtPlxyXG4gICAgQGFwcE9wdGlvbnMuY2xpZW50ID0gQGNsaWVudFxyXG4gICAgUmVhY3QucmVuZGVyIChBcHBWaWV3IEBhcHBPcHRpb25zKSwgYW5jaG9yXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBDbG91ZEZpbGVNYW5hZ2VyKClcclxuIiwidHIgPSByZXF1aXJlICcuL3V0aWxzL3RyYW5zbGF0ZSdcclxuaXNTdHJpbmcgPSByZXF1aXJlICcuL3V0aWxzL2lzLXN0cmluZydcclxuXHJcbkNsb3VkRmlsZU1hbmFnZXJVSSA9IChyZXF1aXJlICcuL3VpJykuQ2xvdWRGaWxlTWFuYWdlclVJXHJcblxyXG5Mb2NhbFN0b3JhZ2VQcm92aWRlciA9IHJlcXVpcmUgJy4vcHJvdmlkZXJzL2xvY2Fsc3RvcmFnZS1wcm92aWRlcidcclxuUmVhZE9ubHlQcm92aWRlciA9IHJlcXVpcmUgJy4vcHJvdmlkZXJzL3JlYWRvbmx5LXByb3ZpZGVyJ1xyXG5Hb29nbGVEcml2ZVByb3ZpZGVyID0gcmVxdWlyZSAnLi9wcm92aWRlcnMvZ29vZ2xlLWRyaXZlLXByb3ZpZGVyJ1xyXG5Eb2N1bWVudFN0b3JlUHJvdmlkZXIgPSByZXF1aXJlICcuL3Byb3ZpZGVycy9kb2N1bWVudC1zdG9yZS1wcm92aWRlcidcclxuXHJcbmNsYXNzIENsb3VkRmlsZU1hbmFnZXJDbGllbnRFdmVudFxyXG5cclxuICBjb25zdHJ1Y3RvcjogKEB0eXBlLCBAZGF0YSA9IHt9LCBAY2FsbGJhY2sgPSBudWxsLCBAc3RhdGUgPSB7fSkgLT5cclxuXHJcbmNsYXNzIENsb3VkRmlsZU1hbmFnZXJDbGllbnRcclxuXHJcbiAgY29uc3RydWN0b3I6IChvcHRpb25zKSAtPlxyXG4gICAgQHN0YXRlID1cclxuICAgICAgYXZhaWxhYmxlUHJvdmlkZXJzOiBbXVxyXG4gICAgQF9yZXNldFN0YXRlKClcclxuICAgIEBfdWkgPSBuZXcgQ2xvdWRGaWxlTWFuYWdlclVJIEBcclxuXHJcbiAgc2V0QXBwT3B0aW9uczogKEBhcHBPcHRpb25zID0ge30pLT5cclxuICAgICMgZmx0ZXIgZm9yIGF2YWlsYWJsZSBwcm92aWRlcnNcclxuICAgIGFsbFByb3ZpZGVycyA9IHt9XHJcbiAgICBmb3IgUHJvdmlkZXIgaW4gW1JlYWRPbmx5UHJvdmlkZXIsIExvY2FsU3RvcmFnZVByb3ZpZGVyLCBHb29nbGVEcml2ZVByb3ZpZGVyLCBEb2N1bWVudFN0b3JlUHJvdmlkZXJdXHJcbiAgICAgIGlmIFByb3ZpZGVyLkF2YWlsYWJsZSgpXHJcbiAgICAgICAgYWxsUHJvdmlkZXJzW1Byb3ZpZGVyLk5hbWVdID0gUHJvdmlkZXJcclxuXHJcbiAgICAjIGRlZmF1bHQgdG8gYWxsIHByb3ZpZGVycyBpZiBub24gc3BlY2lmaWVkXHJcbiAgICBpZiBub3QgQGFwcE9wdGlvbnMucHJvdmlkZXJzXHJcbiAgICAgIEBhcHBPcHRpb25zLnByb3ZpZGVycyA9IFtdXHJcbiAgICAgIGZvciBvd24gcHJvdmlkZXJOYW1lIG9mIGFsbFByb3ZpZGVyc1xyXG4gICAgICAgIGFwcE9wdGlvbnMucHJvdmlkZXJzLnB1c2ggcHJvdmlkZXJOYW1lXHJcblxyXG4gICAgIyBjaGVjayB0aGUgcHJvdmlkZXJzXHJcbiAgICBhdmFpbGFibGVQcm92aWRlcnMgPSBbXVxyXG4gICAgZm9yIHByb3ZpZGVyIGluIEBhcHBPcHRpb25zLnByb3ZpZGVyc1xyXG4gICAgICBbcHJvdmlkZXJOYW1lLCBwcm92aWRlck9wdGlvbnNdID0gaWYgaXNTdHJpbmcgcHJvdmlkZXIgdGhlbiBbcHJvdmlkZXIsIHt9XSBlbHNlIFtwcm92aWRlci5uYW1lLCBwcm92aWRlcl1cclxuICAgICAgIyBtZXJnZSBpbiBvdGhlciBvcHRpb25zIGFzIG5lZWRlZFxyXG4gICAgICBwcm92aWRlck9wdGlvbnMubWltZVR5cGUgPz0gQGFwcE9wdGlvbnMubWltZVR5cGVcclxuICAgICAgaWYgbm90IHByb3ZpZGVyTmFtZVxyXG4gICAgICAgIEBfZXJyb3IgXCJJbnZhbGlkIHByb3ZpZGVyIHNwZWMgLSBtdXN0IGVpdGhlciBiZSBzdHJpbmcgb3Igb2JqZWN0IHdpdGggbmFtZSBwcm9wZXJ0eVwiXHJcbiAgICAgIGVsc2VcclxuICAgICAgICBpZiBhbGxQcm92aWRlcnNbcHJvdmlkZXJOYW1lXVxyXG4gICAgICAgICAgUHJvdmlkZXIgPSBhbGxQcm92aWRlcnNbcHJvdmlkZXJOYW1lXVxyXG4gICAgICAgICAgYXZhaWxhYmxlUHJvdmlkZXJzLnB1c2ggbmV3IFByb3ZpZGVyIHByb3ZpZGVyT3B0aW9uc1xyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgIEBfZXJyb3IgXCJVbmtub3duIHByb3ZpZGVyOiAje3Byb3ZpZGVyTmFtZX1cIlxyXG4gICAgQF9zZXRTdGF0ZSBhdmFpbGFibGVQcm92aWRlcnM6IGF2YWlsYWJsZVByb3ZpZGVyc1xyXG4gICAgQF91aS5pbml0IEBhcHBPcHRpb25zLnVpXHJcblxyXG4gICAgIyBjaGVjayBmb3IgYXV0b3NhdmVcclxuICAgIGlmIG9wdGlvbnMuYXV0b1NhdmVJbnRlcnZhbFxyXG4gICAgICBAYXV0b1NhdmUgb3B0aW9ucy5hdXRvU2F2ZUludGVydmFsXHJcblxyXG4gICMgc2luZ2xlIGNsaWVudCAtIHVzZWQgYnkgdGhlIGNsaWVudCBhcHAgdG8gcmVnaXN0ZXIgYW5kIHJlY2VpdmUgY2FsbGJhY2sgZXZlbnRzXHJcbiAgY29ubmVjdDogKEBldmVudENhbGxiYWNrKSAtPlxyXG4gICAgQF9ldmVudCAnY29ubmVjdGVkJywge2NsaWVudDogQH1cclxuXHJcbiAgIyBzaW5nbGUgbGlzdGVuZXIgLSB1c2VkIGJ5IHRoZSBSZWFjdCBtZW51IHZpYSB0byB3YXRjaCBjbGllbnQgc3RhdGUgY2hhbmdlc1xyXG4gIGxpc3RlbjogKEBsaXN0ZW5lckNhbGxiYWNrKSAtPlxyXG5cclxuICBhcHBlbmRNZW51SXRlbTogKGl0ZW0pIC0+XHJcbiAgICBAX3VpLmFwcGVuZE1lbnVJdGVtIGl0ZW1cclxuXHJcbiAgc2V0TWVudUJhckluZm86IChpbmZvKSAtPlxyXG4gICAgQF91aS5zZXRNZW51QmFySW5mbyBpbmZvXHJcblxyXG4gIG5ld0ZpbGU6IChjYWxsYmFjayA9IG51bGwpIC0+XHJcbiAgICBAX3Jlc2V0U3RhdGUoKVxyXG4gICAgQF9ldmVudCAnbmV3ZWRGaWxlJ1xyXG5cclxuICBuZXdGaWxlRGlhbG9nOiAoY2FsbGJhY2sgPSBudWxsKSAtPlxyXG4gICAgaWYgQGFwcE9wdGlvbnMudWk/Lm5ld0ZpbGVPcGVuc0luTmV3VGFiXHJcbiAgICAgIHdpbmRvdy5vcGVuIHdpbmRvdy5sb2NhdGlvbiwgJ19ibGFuaydcclxuICAgIGVsc2UgaWYgQHN0YXRlLmRpcnR5XHJcbiAgICAgIGlmIEBfYXV0b1NhdmVJbnRlcnZhbCBhbmQgQHN0YXRlLm1ldGFkYXRhXHJcbiAgICAgICAgQHNhdmUoKVxyXG4gICAgICAgIEBuZXdGaWxlKClcclxuICAgICAgZWxzZSBpZiBjb25maXJtIHRyICd+Q09ORklSTS5VTlNBVkVEX0NIQU5HRVMnXHJcbiAgICAgICAgQG5ld0ZpbGUoKVxyXG4gICAgZWxzZVxyXG4gICAgICBAbmV3RmlsZSgpXHJcblxyXG4gIG9wZW5GaWxlOiAobWV0YWRhdGEsIGNhbGxiYWNrID0gbnVsbCkgLT5cclxuICAgIGlmIG1ldGFkYXRhPy5wcm92aWRlcj8uY2FuICdsb2FkJ1xyXG4gICAgICBtZXRhZGF0YS5wcm92aWRlci5sb2FkIG1ldGFkYXRhLCAoZXJyLCBjb250ZW50KSA9PlxyXG4gICAgICAgIHJldHVybiBAX2Vycm9yKGVycikgaWYgZXJyXHJcbiAgICAgICAgQF9maWxlQ2hhbmdlZCAnb3BlbmVkRmlsZScsIGNvbnRlbnQsIG1ldGFkYXRhXHJcbiAgICAgICAgY2FsbGJhY2s/IGNvbnRlbnQsIG1ldGFkYXRhXHJcbiAgICBlbHNlXHJcbiAgICAgIEBvcGVuRmlsZURpYWxvZyBjYWxsYmFja1xyXG5cclxuICBvcGVuRmlsZURpYWxvZzogKGNhbGxiYWNrID0gbnVsbCkgLT5cclxuICAgIEBfdWkub3BlbkZpbGVEaWFsb2cgKG1ldGFkYXRhKSA9PlxyXG4gICAgICBAb3BlbkZpbGUgbWV0YWRhdGEsIGNhbGxiYWNrXHJcblxyXG4gIHNhdmU6IChjYWxsYmFjayA9IG51bGwpIC0+XHJcbiAgICBwYXRjaGFibGUgPSBAc3RhdGUubWV0YWRhdGE/Lm92ZXJ3cml0YWJsZSBhbmQgQHN0YXRlLm1ldGFkYXRhPy5wcm92aWRlci5jYW4gJ3BhdGNoJ1xyXG4gICAgQF9ldmVudCAnZ2V0Q29udGVudCcsIHtwYXRjaGFibGV9LCAoY29udGVudCwgaXNQYXRjaCkgPT5cclxuICAgICAgQHNhdmVDb250ZW50IGNvbnRlbnQsIGlzUGF0Y2gsIGNhbGxiYWNrXHJcblxyXG4gIHNhdmVDb250ZW50OiAoY29udGVudCwgaXNQYXRjaCwgY2FsbGJhY2sgPSBudWxsKSAtPlxyXG4gICAgaWYgQHN0YXRlLm1ldGFkYXRhXHJcbiAgICAgIEBzYXZlRmlsZSBjb250ZW50LCBpc1BhdGNoLCBAc3RhdGUubWV0YWRhdGEsIGNhbGxiYWNrXHJcbiAgICBlbHNlXHJcbiAgICAgIEBzYXZlRmlsZURpYWxvZyBjb250ZW50LCBjYWxsYmFja1xyXG5cclxuICBzYXZlRmlsZTogKGNvbnRlbnQsIGlzUGF0Y2gsIG1ldGFkYXRhLCBjYWxsYmFjayA9IG51bGwpIC0+XHJcbiAgICBpZiBpc1BhdGNoIGFuZCBtZXRhZGF0YT8ucHJvdmlkZXI/LmNhbihtZXRob2Q9J3BhdGNoJykgb3JcclxuICAgICAgIG1ldGFkYXRhPy5wcm92aWRlcj8uY2FuKG1ldGhvZD0nc2F2ZScpXHJcbiAgICAgIEBfc2V0U3RhdGVcclxuICAgICAgICBzYXZpbmc6IG1ldGFkYXRhXHJcbiAgICAgIG1ldGFkYXRhLnByb3ZpZGVyW21ldGhvZF0gY29udGVudCwgbWV0YWRhdGEsIChlcnIpID0+XHJcbiAgICAgICAgcmV0dXJuIEBfZXJyb3IoZXJyKSBpZiBlcnJcclxuICAgICAgICBAX2ZpbGVDaGFuZ2VkICdzYXZlZEZpbGUnLCBjb250ZW50LCBtZXRhZGF0YVxyXG4gICAgICAgIGNhbGxiYWNrPyBjb250ZW50LCBtZXRhZGF0YVxyXG4gICAgZWxzZVxyXG4gICAgICBAc2F2ZUZpbGVEaWFsb2cgY29udGVudCwgY2FsbGJhY2tcclxuXHJcbiAgc2F2ZUZpbGVEaWFsb2c6IChjb250ZW50ID0gbnVsbCwgY2FsbGJhY2sgPSBudWxsKSAtPlxyXG4gICAgQF91aS5zYXZlRmlsZURpYWxvZyAobWV0YWRhdGEpID0+XHJcbiAgICAgIEBfZGlhbG9nU2F2ZSBjb250ZW50LCBtZXRhZGF0YSwgY2FsbGJhY2tcclxuXHJcbiAgc2F2ZUZpbGVBc0RpYWxvZzogKGNvbnRlbnQgPSBudWxsLCBjYWxsYmFjayA9IG51bGwpIC0+XHJcbiAgICBAX3VpLnNhdmVGaWxlQXNEaWFsb2cgKG1ldGFkYXRhKSA9PlxyXG4gICAgICBAX2RpYWxvZ1NhdmUgY29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrXHJcblxyXG4gIGRvd25sb2FkRGlhbG9nOiAoY2FsbGJhY2sgPSBudWxsKSAtPlxyXG4gICAgQF9ldmVudCAnZ2V0Q29udGVudCcsIHt9LCAoY29udGVudCkgPT5cclxuICAgICAgQF91aS5kb3dubG9hZERpYWxvZyBAc3RhdGUubWV0YWRhdGE/Lm5hbWUsIGNvbnRlbnQsIGNhbGxiYWNrXHJcblxyXG4gIHJlbmFtZURpYWxvZzogKGNhbGxiYWNrID0gbnVsbCkgLT5cclxuICAgIGlmIEBzdGF0ZS5tZXRhZGF0YVxyXG4gICAgICBAX3VpLnJlbmFtZURpYWxvZyBAc3RhdGUubWV0YWRhdGEubmFtZSwgKG5ld05hbWUpID0+XHJcbiAgICAgICAgaWYgbmV3TmFtZSBpc250IEBzdGF0ZS5tZXRhZGF0YS5uYW1lXHJcbiAgICAgICAgICBAc3RhdGUubWV0YWRhdGEucHJvdmlkZXIucmVuYW1lIEBzdGF0ZS5tZXRhZGF0YSwgbmV3TmFtZSwgKGVyciwgbWV0YWRhdGEpID0+XHJcbiAgICAgICAgICAgIHJldHVybiBAX2Vycm9yKGVycikgaWYgZXJyXHJcbiAgICAgICAgICAgIEBfc2V0U3RhdGVcclxuICAgICAgICAgICAgICBtZXRhZGF0YTogbWV0YWRhdGFcclxuICAgICAgICAgICAgQF9ldmVudCAncmVuYW1lZEZpbGUnLCB7bWV0YWRhdGE6IG1ldGFkYXRhfVxyXG4gICAgICAgICAgICBjYWxsYmFjaz8gZmlsZW5hbWVcclxuICAgIGVsc2VcclxuICAgICAgY2FsbGJhY2s/ICdObyBjdXJyZW50bHkgYWN0aXZlIGZpbGUnXHJcblxyXG4gIGRpcnR5OiAoaXNEaXJ0eSA9IHRydWUpLT5cclxuICAgIEBfc2V0U3RhdGVcclxuICAgICAgZGlydHk6IGlzRGlydHlcclxuICAgICAgc2F2ZWQ6IGZhbHNlIGlmIGlzRGlydHlcclxuXHJcbiAgYXV0b1NhdmU6IChpbnRlcnZhbCkgLT5cclxuICAgIGlmIEBfYXV0b1NhdmVJbnRlcnZhbFxyXG4gICAgICBjbGVhckludGVydmFsIEBfYXV0b1NhdmVJbnRlcnZhbFxyXG5cclxuICAgICMgaW4gY2FzZSB0aGUgY2FsbGVyIHVzZXMgbWlsbGlzZWNvbmRzXHJcbiAgICBpZiBpbnRlcnZhbCA+IDEwMDBcclxuICAgICAgaW50ZXJ2YWwgPSBNYXRoLnJvdW5kKGludGVydmFsIC8gMTAwMClcclxuICAgIGlmIGludGVydmFsID4gMFxyXG4gICAgICBzYXZlSWZEaXJ0eSA9ID0+XHJcbiAgICAgICAgaWYgQHN0YXRlLmRpcnR5IGFuZCBAc3RhdGUubWV0YWRhdGE/LnByb3ZpZGVyPy5jYW4gJ3NhdmUnXHJcbiAgICAgICAgICBAc2F2ZSgpXHJcbiAgICAgIEBfYXV0b1NhdmVJbnRlcnZhbCA9IHNldEludGVydmFsIHNhdmVJZkRpcnR5LCAoaW50ZXJ2YWwgKiAxMDAwKVxyXG5cclxuICBpc0F1dG9TYXZpbmc6IC0+XHJcbiAgICBAX2F1dG9TYXZlSW50ZXJ2YWwgPiAwXHJcblxyXG4gIF9kaWFsb2dTYXZlOiAoY29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgaWYgY29udGVudCBpc250IG51bGxcclxuICAgICAgQHNhdmVGaWxlIGNvbnRlbnQsIGZhbHNlLCBtZXRhZGF0YSwgY2FsbGJhY2tcclxuICAgIGVsc2VcclxuICAgICAgQF9ldmVudCAnZ2V0Q29udGVudCcsIHt9LCAoY29udGVudCkgPT5cclxuICAgICAgICBAc2F2ZUZpbGUgY29udGVudCwgZmFsc2UsIG1ldGFkYXRhLCBjYWxsYmFja1xyXG5cclxuICBfZXJyb3I6IChtZXNzYWdlKSAtPlxyXG4gICAgIyBmb3Igbm93IGFuIGFsZXJ0XHJcbiAgICBhbGVydCBtZXNzYWdlXHJcblxyXG4gIF9maWxlQ2hhbmdlZDogKHR5cGUsIGNvbnRlbnQsIG1ldGFkYXRhKSAtPlxyXG4gICAgbWV0YWRhdGEub3ZlcndyaXRhYmxlID0gdHJ1ZVxyXG4gICAgQF9zZXRTdGF0ZVxyXG4gICAgICBjb250ZW50OiBjb250ZW50XHJcbiAgICAgIG1ldGFkYXRhOiBtZXRhZGF0YVxyXG4gICAgICBzYXZpbmc6IG51bGxcclxuICAgICAgc2F2ZWQ6IHR5cGUgaXMgJ3NhdmVkRmlsZSdcclxuICAgICAgZGlydHk6IGZhbHNlXHJcbiAgICBAX2V2ZW50IHR5cGUsIHtjb250ZW50OiBjb250ZW50LCBtZXRhZGF0YTogbWV0YWRhdGF9XHJcblxyXG4gIF9ldmVudDogKHR5cGUsIGRhdGEgPSB7fSwgZXZlbnRDYWxsYmFjayA9IG51bGwpIC0+XHJcbiAgICBldmVudCA9IG5ldyBDbG91ZEZpbGVNYW5hZ2VyQ2xpZW50RXZlbnQgdHlwZSwgZGF0YSwgZXZlbnRDYWxsYmFjaywgQHN0YXRlXHJcbiAgICBAZXZlbnRDYWxsYmFjaz8gZXZlbnRcclxuICAgIEBsaXN0ZW5lckNhbGxiYWNrPyBldmVudFxyXG5cclxuICBfc2V0U3RhdGU6IChvcHRpb25zKSAtPlxyXG4gICAgZm9yIG93biBrZXksIHZhbHVlIG9mIG9wdGlvbnNcclxuICAgICAgQHN0YXRlW2tleV0gPSB2YWx1ZVxyXG4gICAgQF9ldmVudCAnc3RhdGVDaGFuZ2VkJ1xyXG5cclxuICBfcmVzZXRTdGF0ZTogLT5cclxuICAgIEBfc2V0U3RhdGVcclxuICAgICAgY29udGVudDogbnVsbFxyXG4gICAgICBtZXRhZGF0YTogbnVsbFxyXG4gICAgICBkaXJ0eTogZmFsc2VcclxuICAgICAgc2F2aW5nOiBudWxsXHJcbiAgICAgIHNhdmVkOiBmYWxzZVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPVxyXG4gIENsb3VkRmlsZU1hbmFnZXJDbGllbnRFdmVudDogQ2xvdWRGaWxlTWFuYWdlckNsaWVudEV2ZW50XHJcbiAgQ2xvdWRGaWxlTWFuYWdlckNsaWVudDogQ2xvdWRGaWxlTWFuYWdlckNsaWVudFxyXG4iLCJ7ZGl2LCBidXR0b24sIHNwYW59ID0gUmVhY3QuRE9NXHJcblxyXG5kb2N1bWVudFN0b3JlID0gXCJodHRwOi8vZG9jdW1lbnQtc3RvcmUuaGVyb2t1YXBwLmNvbVwiXHJcbmF1dGhvcml6ZVVybCAgICAgID0gXCIje2RvY3VtZW50U3RvcmV9L3VzZXIvYXV0aGVudGljYXRlXCJcclxuY2hlY2tMb2dpblVybCAgICAgPSBcIiN7ZG9jdW1lbnRTdG9yZX0vdXNlci9pbmZvXCJcclxubGlzdFVybCAgICAgICAgICAgPSBcIiN7ZG9jdW1lbnRTdG9yZX0vZG9jdW1lbnQvYWxsXCJcclxubG9hZERvY3VtZW50VXJsICAgPSBcIiN7ZG9jdW1lbnRTdG9yZX0vZG9jdW1lbnQvb3BlblwiXHJcbnNhdmVEb2N1bWVudFVybCAgID0gXCIje2RvY3VtZW50U3RvcmV9L2RvY3VtZW50L3NhdmVcIlxyXG5wYXRjaERvY3VtZW50VXJsICA9IFwiI3tkb2N1bWVudFN0b3JlfS9kb2N1bWVudC9wYXRjaFwiXHJcbnJlbW92ZURvY3VtZW50VXJsID0gXCIje2RvY3VtZW50U3RvcmV9L2RvY3VtZW50L2RlbGV0ZVwiXHJcbnJlbmFtZURvY3VtZW50VXJsID0gXCIje2RvY3VtZW50U3RvcmV9L2RvY3VtZW50L3JlbmFtZVwiXHJcblxyXG50ciA9IHJlcXVpcmUgJy4uL3V0aWxzL3RyYW5zbGF0ZSdcclxuaXNTdHJpbmcgPSByZXF1aXJlICcuLi91dGlscy9pcy1zdHJpbmcnXHJcblxyXG5Qcm92aWRlckludGVyZmFjZSA9IChyZXF1aXJlICcuL3Byb3ZpZGVyLWludGVyZmFjZScpLlByb3ZpZGVySW50ZXJmYWNlXHJcbkNsb3VkTWV0YWRhdGEgPSAocmVxdWlyZSAnLi9wcm92aWRlci1pbnRlcmZhY2UnKS5DbG91ZE1ldGFkYXRhXHJcblxyXG5Eb2N1bWVudFN0b3JlQXV0aG9yaXphdGlvbkRpYWxvZyA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgUmVhY3QuY3JlYXRlQ2xhc3NcclxuICBkaXNwbGF5TmFtZTogJ0RvY3VtZW50U3RvcmVBdXRob3JpemF0aW9uRGlhbG9nJ1xyXG5cclxuICBnZXRJbml0aWFsU3RhdGU6IC0+XHJcbiAgICBkb2NTdG9yZUF2YWlsYWJsZTogZmFsc2VcclxuXHJcbiAgY29tcG9uZW50V2lsbE1vdW50OiAtPlxyXG4gICAgQHByb3BzLnByb3ZpZGVyLl9vbkRvY1N0b3JlTG9hZGVkID0+XHJcbiAgICAgIEBzZXRTdGF0ZSBkb2NTdG9yZUF2YWlsYWJsZTogdHJ1ZVxyXG5cclxuICBhdXRoZW50aWNhdGU6IC0+XHJcbiAgICBAcHJvcHMucHJvdmlkZXIuYXV0aG9yaXplKClcclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgKGRpdiB7fSxcclxuICAgICAgaWYgQHN0YXRlLmRvY1N0b3JlQXZhaWxhYmxlXHJcbiAgICAgICAgKGJ1dHRvbiB7b25DbGljazogQGF1dGhlbnRpY2F0ZX0sICdBdXRob3JpemF0aW9uIE5lZWRlZCcpXHJcbiAgICAgIGVsc2VcclxuICAgICAgICAnVHJ5aW5nIHRvIGxvZyBpbnRvIHRoZSBEb2N1bWVudCBTdG9yZS4uLidcclxuICAgIClcclxuXHJcbmNsYXNzIERvY3VtZW50U3RvcmVQcm92aWRlciBleHRlbmRzIFByb3ZpZGVySW50ZXJmYWNlXHJcblxyXG4gIGNvbnN0cnVjdG9yOiAoQG9wdGlvbnMgPSB7fSkgLT5cclxuICAgIHN1cGVyXHJcbiAgICAgIG5hbWU6IERvY3VtZW50U3RvcmVQcm92aWRlci5OYW1lXHJcbiAgICAgIGRpc3BsYXlOYW1lOiBAb3B0aW9ucy5kaXNwbGF5TmFtZSBvciAodHIgJ35QUk9WSURFUi5ET0NVTUVOVF9TVE9SRScpXHJcbiAgICAgIGNhcGFiaWxpdGllczpcclxuICAgICAgICBzYXZlOiB0cnVlXHJcbiAgICAgICAgbG9hZDogdHJ1ZVxyXG4gICAgICAgIGxpc3Q6IHRydWVcclxuICAgICAgICByZW1vdmU6IHRydWVcclxuICAgICAgICByZW5hbWU6IHRydWVcclxuICAgICAgICBwYXRjaDogdHJ1ZVxyXG5cclxuICAgIEB1c2VyID0gbnVsbFxyXG5cclxuICBATmFtZTogJ2RvY3VtZW50U3RvcmUnXHJcblxyXG4gIGF1dGhvcml6ZWQ6IChAYXV0aENhbGxiYWNrKSAtPlxyXG4gICAgaWYgQGF1dGhDYWxsYmFja1xyXG4gICAgICBpZiBAdXNlclxyXG4gICAgICAgIEBhdXRoQ2FsbGJhY2sgdHJ1ZVxyXG4gICAgICBlbHNlXHJcbiAgICAgICAgQF9jaGVja0xvZ2luKClcclxuICAgIGVsc2VcclxuICAgICAgQHVzZXIgaXNudCBudWxsXHJcblxyXG4gIGF1dGhvcml6ZTogLT5cclxuICAgIEBfc2hvd0xvZ2luV2luZG93KClcclxuXHJcbiAgX29uRG9jU3RvcmVMb2FkZWQ6IChAZG9jU3RvcmVMb2FkZWRDYWxsYmFjaykgLT5cclxuICAgIGlmIEBfZG9jU3RvcmVMb2FkZWRcclxuICAgICAgQGRvY1N0b3JlTG9hZGVkQ2FsbGJhY2soKVxyXG5cclxuICBfbG9naW5TdWNjZXNzZnVsOiAoQHVzZXIpIC0+XHJcbiAgICBAX2xvZ2luV2luZG93Py5jbG9zZSgpXHJcbiAgICBAYXV0aENhbGxiYWNrIHRydWVcclxuXHJcbiAgX2NoZWNrTG9naW46IC0+XHJcbiAgICBwcm92aWRlciA9IEBcclxuICAgICQuYWpheFxyXG4gICAgICBkYXRhVHlwZTogJ2pzb24nXHJcbiAgICAgIHVybDogY2hlY2tMb2dpblVybFxyXG4gICAgICB4aHJGaWVsZHM6XHJcbiAgICAgICAgd2l0aENyZWRlbnRpYWxzOiB0cnVlXHJcbiAgICAgIHN1Y2Nlc3M6IChkYXRhKSAtPlxyXG4gICAgICAgIHByb3ZpZGVyLmRvY1N0b3JlTG9hZGVkQ2FsbGJhY2soKVxyXG4gICAgICAgIHByb3ZpZGVyLl9sb2dpblN1Y2Nlc3NmdWwoZGF0YSlcclxuICAgICAgZXJyb3I6IC0+XHJcbiAgICAgICAgcHJvdmlkZXIuZG9jU3RvcmVMb2FkZWRDYWxsYmFjaygpXHJcblxyXG4gIF9sb2dpbldpbmRvdzogbnVsbFxyXG5cclxuICBfc2hvd0xvZ2luV2luZG93OiAtPlxyXG4gICAgaWYgQF9sb2dpbldpbmRvdyBhbmQgbm90IEBfbG9naW5XaW5kb3cuY2xvc2VkXHJcbiAgICAgIEBfbG9naW5XaW5kb3cuZm9jdXMoKVxyXG4gICAgZWxzZVxyXG5cclxuICAgICAgY29tcHV0ZVNjcmVlbkxvY2F0aW9uID0gKHcsIGgpIC0+XHJcbiAgICAgICAgc2NyZWVuTGVmdCA9IHdpbmRvdy5zY3JlZW5MZWZ0IG9yIHNjcmVlbi5sZWZ0XHJcbiAgICAgICAgc2NyZWVuVG9wICA9IHdpbmRvdy5zY3JlZW5Ub3AgIG9yIHNjcmVlbi50b3BcclxuICAgICAgICB3aWR0aCAgPSB3aW5kb3cuaW5uZXJXaWR0aCAgb3IgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudFdpZHRoICBvciBzY3JlZW4ud2lkdGhcclxuICAgICAgICBoZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQgb3IgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudEhlaWdodCBvciBzY3JlZW4uaGVpZ2h0XHJcblxyXG4gICAgICAgIGxlZnQgPSAoKHdpZHRoIC8gMikgLSAodyAvIDIpKSArIHNjcmVlbkxlZnRcclxuICAgICAgICB0b3AgPSAoKGhlaWdodCAvIDIpIC0gKGggLyAyKSkgKyBzY3JlZW5Ub3BcclxuICAgICAgICByZXR1cm4ge2xlZnQsIHRvcH1cclxuXHJcbiAgICAgIHdpZHRoID0gMTAwMFxyXG4gICAgICBoZWlnaHQgPSA0ODBcclxuICAgICAgcG9zaXRpb24gPSBjb21wdXRlU2NyZWVuTG9jYXRpb24gd2lkdGgsIGhlaWdodFxyXG4gICAgICB3aW5kb3dGZWF0dXJlcyA9IFtcclxuICAgICAgICAnd2lkdGg9JyArIHdpZHRoXHJcbiAgICAgICAgJ2hlaWdodD0nICsgaGVpZ2h0XHJcbiAgICAgICAgJ3RvcD0nICsgcG9zaXRpb24udG9wIG9yIDIwMFxyXG4gICAgICAgICdsZWZ0PScgKyBwb3NpdGlvbi5sZWZ0IG9yIDIwMFxyXG4gICAgICAgICdkZXBlbmRlbnQ9eWVzJ1xyXG4gICAgICAgICdyZXNpemFibGU9bm8nXHJcbiAgICAgICAgJ2xvY2F0aW9uPW5vJ1xyXG4gICAgICAgICdkaWFsb2c9eWVzJ1xyXG4gICAgICAgICdtZW51YmFyPW5vJ1xyXG4gICAgICBdXHJcblxyXG4gICAgICBAX2xvZ2luV2luZG93ID0gd2luZG93Lm9wZW4oYXV0aG9yaXplVXJsLCAnYXV0aCcsIHdpbmRvd0ZlYXR1cmVzLmpvaW4oKSlcclxuXHJcbiAgICAgIHBvbGxBY3Rpb24gPSA9PlxyXG4gICAgICAgIHRyeVxyXG4gICAgICAgICAgaHJlZiA9IEBfbG9naW5XaW5kb3cubG9jYXRpb24uaHJlZlxyXG4gICAgICAgICAgaWYgKGhyZWYgaXMgd2luZG93LmxvY2F0aW9uLmhyZWYpXHJcbiAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwgcG9sbFxyXG4gICAgICAgICAgICBAX2xvZ2luV2luZG93LmNsb3NlKClcclxuICAgICAgICAgICAgQF9jaGVja0xvZ2luKClcclxuICAgICAgICBjYXRjaCBlXHJcbiAgICAgICAgICAjIGNvbnNvbGUubG9nIGVcclxuXHJcbiAgICAgIHBvbGwgPSBzZXRJbnRlcnZhbCBwb2xsQWN0aW9uLCAyMDBcclxuXHJcbiAgcmVuZGVyQXV0aG9yaXphdGlvbkRpYWxvZzogLT5cclxuICAgIChEb2N1bWVudFN0b3JlQXV0aG9yaXphdGlvbkRpYWxvZyB7cHJvdmlkZXI6IEAsIGF1dGhDYWxsYmFjazogQGF1dGhDYWxsYmFja30pXHJcblxyXG4gIHJlbmRlclVzZXI6IC0+XHJcbiAgICBpZiBAdXNlclxyXG4gICAgICAoc3BhbiB7fSwgKHNwYW4ge2NsYXNzTmFtZTogJ2RvY3VtZW50LXN0b3JlLWljb24nfSksIEB1c2VyLm5hbWUpXHJcbiAgICBlbHNlXHJcbiAgICAgIG51bGxcclxuXHJcbiAgbGlzdDogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgICQuYWpheFxyXG4gICAgICBkYXRhVHlwZTogJ2pzb24nXHJcbiAgICAgIHVybDogbGlzdFVybFxyXG4gICAgICBjb250ZXh0OiBAXHJcbiAgICAgIHhockZpZWxkczpcclxuICAgICAgICB3aXRoQ3JlZGVudGlhbHM6IHRydWVcclxuICAgICAgc3VjY2VzczogKGRhdGEpIC0+XHJcbiAgICAgICAgbGlzdCA9IFtdXHJcbiAgICAgICAgZm9yIG93biBrZXksIGZpbGUgb2YgZGF0YVxyXG4gICAgICAgICAgbGlzdC5wdXNoIG5ldyBDbG91ZE1ldGFkYXRhXHJcbiAgICAgICAgICAgIG5hbWU6IGZpbGUubmFtZVxyXG4gICAgICAgICAgICBwcm92aWRlckRhdGE6IHtpZDogZmlsZS5pZH1cclxuICAgICAgICAgICAgdHlwZTogQ2xvdWRNZXRhZGF0YS5GaWxlXHJcbiAgICAgICAgICAgIHByb3ZpZGVyOiBAXHJcbiAgICAgICAgY2FsbGJhY2sgbnVsbCwgbGlzdFxyXG4gICAgICBlcnJvcjogLT5cclxuICAgICAgICBjYWxsYmFjayBudWxsLCBbXVxyXG5cclxuICBsb2FkOiAobWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgJC5hamF4XHJcbiAgICAgIHVybDogbG9hZERvY3VtZW50VXJsXHJcbiAgICAgIGRhdGE6XHJcbiAgICAgICAgcmVjb3JkaWQ6IG1ldGFkYXRhLnByb3ZpZGVyRGF0YS5pZFxyXG4gICAgICBjb250ZXh0OiBAXHJcbiAgICAgIHhockZpZWxkczpcclxuICAgICAgICB3aXRoQ3JlZGVudGlhbHM6IHRydWVcclxuICAgICAgc3VjY2VzczogKGRhdGEpIC0+XHJcbiAgICAgICAgY2FsbGJhY2sgbnVsbCwgZGF0YS5jb250ZW50XHJcbiAgICAgIGVycm9yOiAtPlxyXG4gICAgICAgIGNhbGxiYWNrIFwiVW5hYmxlIHRvIGxvYWQgXCIrbWV0YWRhdGEubmFtZVxyXG5cclxuICBzYXZlOiAoY29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgY29udGVudCA9IEBfdmFsaWRhdGVDb250ZW50IGNvbnRlbnRcclxuXHJcbiAgICBwYXJhbXMgPSB7fVxyXG4gICAgaWYgbWV0YWRhdGEucHJvdmlkZXJEYXRhLmlkIHRoZW4gcGFyYW1zLnJlY29yZGlkID0gbWV0YWRhdGEucHJvdmlkZXJEYXRhLmlkXHJcbiAgICBpZiBtZXRhZGF0YS5uYW1lIHRoZW4gcGFyYW1zLnJlY29yZG5hbWUgPSBtZXRhZGF0YS5uYW1lXHJcblxyXG4gICAgdXJsID0gQF9hZGRQYXJhbXMoc2F2ZURvY3VtZW50VXJsLCBwYXJhbXMpXHJcblxyXG4gICAgJC5hamF4XHJcbiAgICAgIGRhdGFUeXBlOiAnanNvbidcclxuICAgICAgbWV0aG9kOiAnUE9TVCdcclxuICAgICAgdXJsOiB1cmxcclxuICAgICAgZGF0YTogY29udGVudFxyXG4gICAgICBjb250ZXh0OiBAXHJcbiAgICAgIHhockZpZWxkczpcclxuICAgICAgICB3aXRoQ3JlZGVudGlhbHM6IHRydWVcclxuICAgICAgc3VjY2VzczogKGRhdGEpIC0+XHJcbiAgICAgICAgaWYgZGF0YS5pZCB0aGVuIG1ldGFkYXRhLnByb3ZpZGVyRGF0YS5pZCA9IGRhdGEuaWRcclxuICAgICAgICBjYWxsYmFjayBudWxsLCBkYXRhXHJcbiAgICAgIGVycm9yOiAtPlxyXG4gICAgICAgIGNhbGxiYWNrIFwiVW5hYmxlIHRvIGxvYWQgXCIrbWV0YWRhdGEubmFtZVxyXG5cclxuICBwYXRjaDogKGNvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIHVubGVzcyBtZXRhZGF0YT8ub3ZlcndyaXRhYmxlIGFuZCBtZXRhZGF0YS5wcm92aWRlckRhdGEuaWRcclxuICAgICAgcmV0dXJuIEBzYXZlKGNvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFjaylcclxuXHJcbiAgICB1cmwgPSBAX2FkZFBhcmFtcyhwYXRjaERvY3VtZW50VXJsLCB7cmVjb3JkaWQ6IG1ldGFkYXRhLnByb3ZpZGVyRGF0YS5pZH0pXHJcblxyXG4gICAgJC5hamF4XHJcbiAgICAgIGRhdGFUeXBlOiAnanNvbidcclxuICAgICAgbWV0aG9kOiAnUE9TVCdcclxuICAgICAgdXJsOiB1cmxcclxuICAgICAgZGF0YTogY29udGVudFxyXG4gICAgICBjb250ZXh0OiBAXHJcbiAgICAgIHhockZpZWxkczpcclxuICAgICAgICB3aXRoQ3JlZGVudGlhbHM6IHRydWVcclxuICAgICAgc3VjY2VzczogKGRhdGEpIC0+XHJcbiAgICAgICAgY2FsbGJhY2sgbnVsbCwgZGF0YVxyXG4gICAgICBlcnJvcjogLT5cclxuICAgICAgICBjYWxsYmFjayBcIlVuYWJsZSB0byBsb2FkIFwiK21ldGFkYXRhLm5hbWVcclxuXHJcblxyXG4gIHJlbW92ZTogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgICQuYWpheFxyXG4gICAgICB1cmw6IHJlbW92ZURvY3VtZW50VXJsXHJcbiAgICAgIGRhdGE6XHJcbiAgICAgICAgcmVjb3JkbmFtZTogbWV0YWRhdGEubmFtZVxyXG4gICAgICBjb250ZXh0OiBAXHJcbiAgICAgIHhockZpZWxkczpcclxuICAgICAgICB3aXRoQ3JlZGVudGlhbHM6IHRydWVcclxuICAgICAgc3VjY2VzczogKGRhdGEpIC0+XHJcbiAgICAgICAgY2FsbGJhY2sgbnVsbCwgZGF0YVxyXG4gICAgICBlcnJvcjogLT5cclxuICAgICAgICBjYWxsYmFjayBcIlVuYWJsZSB0byBsb2FkIFwiK21ldGFkYXRhLm5hbWVcclxuXHJcbiAgcmVuYW1lOiAobWV0YWRhdGEsIG5ld05hbWUsIGNhbGxiYWNrKSAtPlxyXG4gICAgJC5hamF4XHJcbiAgICAgIHVybDogcmVuYW1lRG9jdW1lbnRVcmxcclxuICAgICAgZGF0YTpcclxuICAgICAgICByZWNvcmRpZDogbWV0YWRhdGEucHJvdmlkZXJEYXRhLmlkXHJcbiAgICAgICAgbmV3UmVjb3JkbmFtZTogbmV3TmFtZVxyXG4gICAgICBjb250ZXh0OiBAXHJcbiAgICAgIHhockZpZWxkczpcclxuICAgICAgICB3aXRoQ3JlZGVudGlhbHM6IHRydWVcclxuICAgICAgc3VjY2VzczogKGRhdGEpIC0+XHJcbiAgICAgICAgbWV0YWRhdGEubmFtZSA9IG5ld05hbWVcclxuICAgICAgICBjYWxsYmFjayBudWxsLCBtZXRhZGF0YVxyXG4gICAgICBlcnJvcjogLT5cclxuICAgICAgICBjYWxsYmFjayBcIlVuYWJsZSB0byByZW5hbWUgXCIrbWV0YWRhdGEubmFtZVxyXG5cclxuICBfYWRkUGFyYW1zOiAodXJsLCBwYXJhbXMpIC0+XHJcbiAgICByZXR1cm4gdXJsIHVubGVzcyBwYXJhbXNcclxuICAgIGt2cCA9IFtdXHJcbiAgICBmb3Iga2V5LCB2YWx1ZSBvZiBwYXJhbXNcclxuICAgICAga3ZwLnB1c2ggW2tleSwgdmFsdWVdLm1hcChlbmNvZGVVUkkpLmpvaW4gXCI9XCJcclxuICAgIHJldHVybiB1cmwgKyBcIj9cIiArIGt2cC5qb2luIFwiJlwiXHJcblxyXG4gICMgVGhlIGRvY3VtZW50IHNlcnZlciByZXF1aXJlcyB0aGUgY29udGVudCB0byBiZSBKU09OLCBhbmQgaXQgbXVzdCBoYXZlXHJcbiAgIyBjZXJ0YWluIHByZS1kZWZpbmVkIGtleXMgaW4gb3JkZXIgdG8gYmUgbGlzdGVkIHdoZW4gd2UgcXVlcnkgdGhlIGxpc3RcclxuICBfdmFsaWRhdGVDb250ZW50OiAoY29udGVudCkgLT5cclxuICAgICMgZmlyc3QgY29udmVydCB0byBhbiBvYmplY3QgdG8gZWFzaWx5IGFkZCBwcm9wZXJ0aWVzXHJcbiAgICB0cnlcclxuICAgICAgY29udGVudCA9IEpTT04ucGFyc2UgY29udGVudFxyXG4gICAgY2F0Y2hcclxuICAgICAgY29udGVudCA9IHtjb250ZW50OiBjb250ZW50fVxyXG5cclxuICAgIGNvbnRlbnQuYXBwTmFtZSAgICAgPz0gQG9wdGlvbnMuYXBwTmFtZVxyXG4gICAgY29udGVudC5hcHBWZXJzaW9uICA/PSBAb3B0aW9ucy5hcHBWZXJzaW9uXHJcbiAgICBjb250ZW50LmFwcEJ1aWxkTnVtID89IEBvcHRpb25zLmFwcEJ1aWxkTnVtXHJcblxyXG4gICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5IGNvbnRlbnRcclxuXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IERvY3VtZW50U3RvcmVQcm92aWRlclxyXG4iLCJ7ZGl2LCBidXR0b24sIHNwYW59ID0gUmVhY3QuRE9NXHJcblxyXG50ciA9IHJlcXVpcmUgJy4uL3V0aWxzL3RyYW5zbGF0ZSdcclxuaXNTdHJpbmcgPSByZXF1aXJlICcuLi91dGlscy9pcy1zdHJpbmcnXHJcblxyXG5Qcm92aWRlckludGVyZmFjZSA9IChyZXF1aXJlICcuL3Byb3ZpZGVyLWludGVyZmFjZScpLlByb3ZpZGVySW50ZXJmYWNlXHJcbkNsb3VkTWV0YWRhdGEgPSAocmVxdWlyZSAnLi9wcm92aWRlci1pbnRlcmZhY2UnKS5DbG91ZE1ldGFkYXRhXHJcblxyXG5Hb29nbGVEcml2ZUF1dGhvcml6YXRpb25EaWFsb2cgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IFJlYWN0LmNyZWF0ZUNsYXNzXHJcbiAgZGlzcGxheU5hbWU6ICdHb29nbGVEcml2ZUF1dGhvcml6YXRpb25EaWFsb2cnXHJcblxyXG4gIGdldEluaXRpYWxTdGF0ZTogLT5cclxuICAgIGxvYWRlZEdBUEk6IGZhbHNlXHJcblxyXG4gIGNvbXBvbmVudFdpbGxNb3VudDogLT5cclxuICAgIEBwcm9wcy5wcm92aWRlci5fbG9hZGVkR0FQSSA9PlxyXG4gICAgICBAc2V0U3RhdGUgbG9hZGVkR0FQSTogdHJ1ZVxyXG5cclxuICBhdXRoZW50aWNhdGU6IC0+XHJcbiAgICBAcHJvcHMucHJvdmlkZXIuYXV0aG9yaXplIEdvb2dsZURyaXZlUHJvdmlkZXIuU0hPV19QT1BVUFxyXG5cclxuICByZW5kZXI6IC0+XHJcbiAgICAoZGl2IHt9LFxyXG4gICAgICBpZiBAc3RhdGUubG9hZGVkR0FQSVxyXG4gICAgICAgIChidXR0b24ge29uQ2xpY2s6IEBhdXRoZW50aWNhdGV9LCAnQXV0aG9yaXphdGlvbiBOZWVkZWQnKVxyXG4gICAgICBlbHNlXHJcbiAgICAgICAgJ1dhaXRpbmcgZm9yIHRoZSBHb29nbGUgQ2xpZW50IEFQSSB0byBsb2FkLi4uJ1xyXG4gICAgKVxyXG5cclxuY2xhc3MgR29vZ2xlRHJpdmVQcm92aWRlciBleHRlbmRzIFByb3ZpZGVySW50ZXJmYWNlXHJcblxyXG4gIGNvbnN0cnVjdG9yOiAoQG9wdGlvbnMgPSB7fSkgLT5cclxuICAgIHN1cGVyXHJcbiAgICAgIG5hbWU6IEdvb2dsZURyaXZlUHJvdmlkZXIuTmFtZVxyXG4gICAgICBkaXNwbGF5TmFtZTogQG9wdGlvbnMuZGlzcGxheU5hbWUgb3IgKHRyICd+UFJPVklERVIuR09PR0xFX0RSSVZFJylcclxuICAgICAgY2FwYWJpbGl0aWVzOlxyXG4gICAgICAgIHNhdmU6IHRydWVcclxuICAgICAgICBsb2FkOiB0cnVlXHJcbiAgICAgICAgbGlzdDogdHJ1ZVxyXG4gICAgICAgIHJlbW92ZTogdHJ1ZVxyXG4gICAgICAgIHJlbmFtZTogdHJ1ZVxyXG5cclxuICAgIEBhdXRoVG9rZW4gPSBudWxsXHJcbiAgICBAdXNlciA9IG51bGxcclxuICAgIEBjbGllbnRJZCA9IEBvcHRpb25zLmNsaWVudElkXHJcbiAgICBpZiBub3QgQGNsaWVudElkXHJcbiAgICAgIHRocm93IG5ldyBFcnJvciAnTWlzc2luZyByZXF1aXJlZCBjbGllbnRJZCBpbiBnb29nbGVEcml2ZSBwcm92aWRlciBvcHRpb25zJ1xyXG4gICAgQG1pbWVUeXBlID0gQG9wdGlvbnMubWltZVR5cGUgb3IgXCJ0ZXh0L3BsYWluXCJcclxuICAgIEBfbG9hZEdBUEkoKVxyXG5cclxuICBATmFtZTogJ2dvb2dsZURyaXZlJ1xyXG5cclxuICAjIGFsaWFzZXMgZm9yIGJvb2xlYW4gcGFyYW1ldGVyIHRvIGF1dGhvcml6ZVxyXG4gIEBJTU1FRElBVEUgPSB0cnVlXHJcbiAgQFNIT1dfUE9QVVAgPSBmYWxzZVxyXG5cclxuICBhdXRob3JpemVkOiAoQGF1dGhDYWxsYmFjaykgLT5cclxuICAgIGlmIEBhdXRoQ2FsbGJhY2tcclxuICAgICAgaWYgQGF1dGhUb2tlblxyXG4gICAgICAgIEBhdXRoQ2FsbGJhY2sgdHJ1ZVxyXG4gICAgICBlbHNlXHJcbiAgICAgICAgQGF1dGhvcml6ZSBHb29nbGVEcml2ZVByb3ZpZGVyLklNTUVESUFURVxyXG4gICAgZWxzZVxyXG4gICAgICBAYXV0aFRva2VuIGlzbnQgbnVsbFxyXG5cclxuICBhdXRob3JpemU6IChpbW1lZGlhdGUpIC0+XHJcbiAgICBAX2xvYWRlZEdBUEkgPT5cclxuICAgICAgYXJncyA9XHJcbiAgICAgICAgY2xpZW50X2lkOiBAY2xpZW50SWRcclxuICAgICAgICBzY29wZTogWydodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS9hdXRoL2RyaXZlJywgJ2h0dHBzOi8vd3d3Lmdvb2dsZWFwaXMuY29tL2F1dGgvdXNlcmluZm8ucHJvZmlsZSddXHJcbiAgICAgICAgaW1tZWRpYXRlOiBpbW1lZGlhdGVcclxuICAgICAgZ2FwaS5hdXRoLmF1dGhvcml6ZSBhcmdzLCAoYXV0aFRva2VuKSA9PlxyXG4gICAgICAgIEBhdXRoVG9rZW4gPSBpZiBhdXRoVG9rZW4gYW5kIG5vdCBhdXRoVG9rZW4uZXJyb3IgdGhlbiBhdXRoVG9rZW4gZWxzZSBudWxsXHJcbiAgICAgICAgQHVzZXIgPSBudWxsXHJcbiAgICAgICAgaWYgQGF1dGhUb2tlblxyXG4gICAgICAgICAgZ2FwaS5jbGllbnQub2F1dGgyLnVzZXJpbmZvLmdldCgpLmV4ZWN1dGUgKHVzZXIpID0+XHJcbiAgICAgICAgICAgIEB1c2VyID0gdXNlclxyXG4gICAgICAgIEBhdXRoQ2FsbGJhY2sgQGF1dGhUb2tlbiBpc250IG51bGxcclxuXHJcbiAgcmVuZGVyQXV0aG9yaXphdGlvbkRpYWxvZzogLT5cclxuICAgIChHb29nbGVEcml2ZUF1dGhvcml6YXRpb25EaWFsb2cge3Byb3ZpZGVyOiBAfSlcclxuXHJcbiAgcmVuZGVyVXNlcjogLT5cclxuICAgIGlmIEB1c2VyXHJcbiAgICAgIChzcGFuIHt9LCAoc3BhbiB7Y2xhc3NOYW1lOiAnZ2RyaXZlLWljb24nfSksIEB1c2VyLm5hbWUpXHJcbiAgICBlbHNlXHJcbiAgICAgIG51bGxcclxuXHJcbiAgc2F2ZTogIChjb250ZW50LCBtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICBAX2xvYWRlZEdBUEkgPT5cclxuICAgICAgQF9zZW5kRmlsZSBjb250ZW50LCBtZXRhZGF0YSwgY2FsbGJhY2tcclxuXHJcbiAgbG9hZDogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIEBfbG9hZGVkR0FQSSA9PlxyXG4gICAgICByZXF1ZXN0ID0gZ2FwaS5jbGllbnQuZHJpdmUuZmlsZXMuZ2V0XHJcbiAgICAgICAgZmlsZUlkOiBtZXRhZGF0YS5wcm92aWRlckRhdGEuaWRcclxuICAgICAgcmVxdWVzdC5leGVjdXRlIChmaWxlKSA9PlxyXG4gICAgICAgIGlmIGZpbGU/LmRvd25sb2FkVXJsXHJcbiAgICAgICAgICBAX2Rvd25sb2FkRnJvbVVybCBmaWxlLmRvd25sb2FkVXJsLCBAYXV0aFRva2VuLCBjYWxsYmFja1xyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgIGNhbGxiYWNrICdVbmFibGUgdG8gZ2V0IGRvd25sb2FkIHVybCdcclxuXHJcbiAgbGlzdDogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIEBfbG9hZGVkR0FQSSA9PlxyXG4gICAgICByZXF1ZXN0ID0gZ2FwaS5jbGllbnQuZHJpdmUuZmlsZXMubGlzdFxyXG4gICAgICAgIHE6IFwibWltZVR5cGUgPSAnI3tAbWltZVR5cGV9J1wiXHJcbiAgICAgIHJlcXVlc3QuZXhlY3V0ZSAocmVzdWx0KSA9PlxyXG4gICAgICAgIHJldHVybiBjYWxsYmFjaygnVW5hYmxlIHRvIGxpc3QgZmlsZXMnKSBpZiBub3QgcmVzdWx0XHJcbiAgICAgICAgbGlzdCA9IFtdXHJcbiAgICAgICAgZm9yIGl0ZW0gaW4gcmVzdWx0Py5pdGVtc1xyXG4gICAgICAgICAgIyBUT0RPOiBmb3Igbm93IGRvbid0IGFsbG93IGZvbGRlcnNcclxuICAgICAgICAgIGlmIGl0ZW0ubWltZVR5cGUgaXNudCAnYXBwbGljYXRpb24vdm5kLmdvb2dsZS1hcHBzLmZvbGRlcidcclxuICAgICAgICAgICAgbGlzdC5wdXNoIG5ldyBDbG91ZE1ldGFkYXRhXHJcbiAgICAgICAgICAgICAgbmFtZTogaXRlbS50aXRsZVxyXG4gICAgICAgICAgICAgICMgVE9ETzogRklYIFBBVEhcclxuICAgICAgICAgICAgICBwYXRoOiBcIlwiXHJcbiAgICAgICAgICAgICAgdHlwZTogaWYgaXRlbS5taW1lVHlwZSBpcyAnYXBwbGljYXRpb24vdm5kLmdvb2dsZS1hcHBzLmZvbGRlcicgdGhlbiBDbG91ZE1ldGFkYXRhLkZvbGRlciBlbHNlIENsb3VkTWV0YWRhdGEuRmlsZVxyXG4gICAgICAgICAgICAgIHByb3ZpZGVyOiBAXHJcbiAgICAgICAgICAgICAgcHJvdmlkZXJEYXRhOlxyXG4gICAgICAgICAgICAgICAgaWQ6IGl0ZW0uaWRcclxuICAgICAgICBsaXN0LnNvcnQgKGEsIGIpIC0+XHJcbiAgICAgICAgICBsb3dlckEgPSBhLm5hbWUudG9Mb3dlckNhc2UoKVxyXG4gICAgICAgICAgbG93ZXJCID0gYi5uYW1lLnRvTG93ZXJDYXNlKClcclxuICAgICAgICAgIHJldHVybiAtMSBpZiBsb3dlckEgPCBsb3dlckJcclxuICAgICAgICAgIHJldHVybiAxIGlmIGxvd2VyQSA+IGxvd2VyQlxyXG4gICAgICAgICAgcmV0dXJuIDBcclxuICAgICAgICBjYWxsYmFjayBudWxsLCBsaXN0XHJcblxyXG4gIHJlbW92ZTogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIEBfbG9hZGVkR0FQSSAtPlxyXG4gICAgICByZXF1ZXN0ID0gZ2FwaS5jbGllbnQuZHJpdmUuZmlsZXMuZGVsZXRlXHJcbiAgICAgICAgZmlsZUlkOiBtZXRhZGF0YS5wcm92aWRlckRhdGEuaWRcclxuICAgICAgcmVxdWVzdC5leGVjdXRlIChyZXN1bHQpIC0+XHJcbiAgICAgICAgY2FsbGJhY2s/IHJlc3VsdD8uZXJyb3Igb3IgbnVsbFxyXG5cclxuICByZW5hbWU6IChtZXRhZGF0YSwgbmV3TmFtZSwgY2FsbGJhY2spIC0+XHJcbiAgICBAX2xvYWRlZEdBUEkgLT5cclxuICAgICAgcmVxdWVzdCA9IGdhcGkuY2xpZW50LmRyaXZlLmZpbGVzLnBhdGNoXHJcbiAgICAgICAgZmlsZUlkOiBtZXRhZGF0YS5wcm92aWRlckRhdGEuaWRcclxuICAgICAgICByZXNvdXJjZTpcclxuICAgICAgICAgIHRpdGxlOiBuZXdOYW1lXHJcbiAgICAgIHJlcXVlc3QuZXhlY3V0ZSAocmVzdWx0KSAtPlxyXG4gICAgICAgIGlmIHJlc3VsdD8uZXJyb3JcclxuICAgICAgICAgIGNhbGxiYWNrPyByZXN1bHQuZXJyb3JcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICBtZXRhZGF0YS5uYW1lID0gbmV3TmFtZVxyXG4gICAgICAgICAgY2FsbGJhY2sgbnVsbCwgbWV0YWRhdGFcclxuXHJcbiAgX2xvYWRHQVBJOiAtPlxyXG4gICAgaWYgbm90IHdpbmRvdy5fTG9hZGluZ0dBUElcclxuICAgICAgd2luZG93Ll9Mb2FkaW5nR0FQSSA9IHRydWVcclxuICAgICAgd2luZG93Ll9HQVBJT25Mb2FkID0gLT5cclxuICAgICAgICBAd2luZG93Ll9Mb2FkZWRHQVBJID0gdHJ1ZVxyXG4gICAgICBzY3JpcHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50ICdzY3JpcHQnXHJcbiAgICAgIHNjcmlwdC5zcmMgPSAnaHR0cHM6Ly9hcGlzLmdvb2dsZS5jb20vanMvY2xpZW50LmpzP29ubG9hZD1fR0FQSU9uTG9hZCdcclxuICAgICAgZG9jdW1lbnQuaGVhZC5hcHBlbmRDaGlsZCBzY3JpcHRcclxuXHJcbiAgX2xvYWRlZEdBUEk6IChjYWxsYmFjaykgLT5cclxuICAgIGlmIHdpbmRvdy5fTG9hZGVkR0FQSUNsaWVudHNcclxuICAgICAgY2FsbGJhY2soKVxyXG4gICAgZWxzZVxyXG4gICAgICBzZWxmID0gQFxyXG4gICAgICBjaGVjayA9IC0+XHJcbiAgICAgICAgaWYgd2luZG93Ll9Mb2FkZWRHQVBJXHJcbiAgICAgICAgICBnYXBpLmNsaWVudC5sb2FkICdkcml2ZScsICd2MicsIC0+XHJcbiAgICAgICAgICAgIGdhcGkuY2xpZW50LmxvYWQgJ29hdXRoMicsICd2MicsIC0+XHJcbiAgICAgICAgICAgICAgd2luZG93Ll9Mb2FkZWRHQVBJQ2xpZW50cyA9IHRydWVcclxuICAgICAgICAgICAgICBjYWxsYmFjay5jYWxsIHNlbGZcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICBzZXRUaW1lb3V0IGNoZWNrLCAxMFxyXG4gICAgICBzZXRUaW1lb3V0IGNoZWNrLCAxMFxyXG5cclxuICBfZG93bmxvYWRGcm9tVXJsOiAodXJsLCB0b2tlbiwgY2FsbGJhY2spIC0+XHJcbiAgICB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKVxyXG4gICAgeGhyLm9wZW4gJ0dFVCcsIHVybFxyXG4gICAgaWYgdG9rZW5cclxuICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIgJ0F1dGhvcml6YXRpb24nLCBcIkJlYXJlciAje3Rva2VuLmFjY2Vzc190b2tlbn1cIlxyXG4gICAgeGhyLm9ubG9hZCA9IC0+XHJcbiAgICAgIGNhbGxiYWNrIG51bGwsIHhoci5yZXNwb25zZVRleHRcclxuICAgIHhoci5vbmVycm9yID0gLT5cclxuICAgICAgY2FsbGJhY2sgXCJVbmFibGUgdG8gZG93bmxvYWQgI3t1cmx9XCJcclxuICAgIHhoci5zZW5kKClcclxuXHJcbiAgX3NlbmRGaWxlOiAoY29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgYm91bmRhcnkgPSAnLS0tLS0tLTMxNDE1OTI2NTM1ODk3OTMyMzg0NidcclxuICAgIGhlYWRlciA9IEpTT04uc3RyaW5naWZ5XHJcbiAgICAgIHRpdGxlOiBtZXRhZGF0YS5uYW1lXHJcbiAgICAgIG1pbWVUeXBlOiBAbWltZVR5cGVcclxuXHJcbiAgICBbbWV0aG9kLCBwYXRoXSA9IGlmIG1ldGFkYXRhLnByb3ZpZGVyRGF0YT8uaWRcclxuICAgICAgWydQVVQnLCBcIi91cGxvYWQvZHJpdmUvdjIvZmlsZXMvI3ttZXRhZGF0YS5wcm92aWRlckRhdGEuaWR9XCJdXHJcbiAgICBlbHNlXHJcbiAgICAgIFsnUE9TVCcsICcvdXBsb2FkL2RyaXZlL3YyL2ZpbGVzJ11cclxuXHJcbiAgICBib2R5ID0gW1xyXG4gICAgICBcIlxcclxcbi0tI3tib3VuZGFyeX1cXHJcXG5Db250ZW50LVR5cGU6IGFwcGxpY2F0aW9uL2pzb25cXHJcXG5cXHJcXG4je2hlYWRlcn1cIixcclxuICAgICAgXCJcXHJcXG4tLSN7Ym91bmRhcnl9XFxyXFxuQ29udGVudC1UeXBlOiAje0BtaW1lVHlwZX1cXHJcXG5cXHJcXG4je2NvbnRlbnR9XCIsXHJcbiAgICAgIFwiXFxyXFxuLS0je2JvdW5kYXJ5fS0tXCJcclxuICAgIF0uam9pbiAnJ1xyXG5cclxuICAgIHJlcXVlc3QgPSBnYXBpLmNsaWVudC5yZXF1ZXN0XHJcbiAgICAgIHBhdGg6IHBhdGhcclxuICAgICAgbWV0aG9kOiBtZXRob2RcclxuICAgICAgcGFyYW1zOiB7dXBsb2FkVHlwZTogJ211bHRpcGFydCd9XHJcbiAgICAgIGhlYWRlcnM6IHsnQ29udGVudC1UeXBlJzogJ211bHRpcGFydC9yZWxhdGVkOyBib3VuZGFyeT1cIicgKyBib3VuZGFyeSArICdcIid9XHJcbiAgICAgIGJvZHk6IGJvZHlcclxuXHJcbiAgICByZXF1ZXN0LmV4ZWN1dGUgKGZpbGUpIC0+XHJcbiAgICAgIGlmIGNhbGxiYWNrXHJcbiAgICAgICAgaWYgZmlsZT8uZXJyb3JcclxuICAgICAgICAgIGNhbGxiYWNrIFwiVW5hYmxlZCB0byB1cGxvYWQgZmlsZTogI3tmaWxlLmVycm9yLm1lc3NhZ2V9XCJcclxuICAgICAgICBlbHNlIGlmIGZpbGVcclxuICAgICAgICAgIGNhbGxiYWNrIG51bGwsIGZpbGVcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICBjYWxsYmFjayAnVW5hYmxlZCB0byB1cGxvYWQgZmlsZSdcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gR29vZ2xlRHJpdmVQcm92aWRlclxyXG4iLCJ0ciA9IHJlcXVpcmUgJy4uL3V0aWxzL3RyYW5zbGF0ZSdcclxuXHJcblByb3ZpZGVySW50ZXJmYWNlID0gKHJlcXVpcmUgJy4vcHJvdmlkZXItaW50ZXJmYWNlJykuUHJvdmlkZXJJbnRlcmZhY2VcclxuQ2xvdWRNZXRhZGF0YSA9IChyZXF1aXJlICcuL3Byb3ZpZGVyLWludGVyZmFjZScpLkNsb3VkTWV0YWRhdGFcclxuXHJcbmNsYXNzIExvY2FsU3RvcmFnZVByb3ZpZGVyIGV4dGVuZHMgUHJvdmlkZXJJbnRlcmZhY2VcclxuXHJcbiAgY29uc3RydWN0b3I6IChAb3B0aW9ucyA9IHt9KSAtPlxyXG4gICAgc3VwZXJcclxuICAgICAgbmFtZTogTG9jYWxTdG9yYWdlUHJvdmlkZXIuTmFtZVxyXG4gICAgICBkaXNwbGF5TmFtZTogQG9wdGlvbnMuZGlzcGxheU5hbWUgb3IgKHRyICd+UFJPVklERVIuTE9DQUxfU1RPUkFHRScpXHJcbiAgICAgIGNhcGFiaWxpdGllczpcclxuICAgICAgICBzYXZlOiB0cnVlXHJcbiAgICAgICAgbG9hZDogdHJ1ZVxyXG4gICAgICAgIGxpc3Q6IHRydWVcclxuICAgICAgICByZW1vdmU6IHRydWVcclxuICAgICAgICByZW5hbWU6IHRydWVcclxuXHJcbiAgQE5hbWU6ICdsb2NhbFN0b3JhZ2UnXHJcbiAgQEF2YWlsYWJsZTogLT5cclxuICAgIHJlc3VsdCA9IHRyeVxyXG4gICAgICB0ZXN0ID0gJ0xvY2FsU3RvcmFnZVByb3ZpZGVyOjphdXRoJ1xyXG4gICAgICB3aW5kb3cubG9jYWxTdG9yYWdlLnNldEl0ZW0odGVzdCwgdGVzdClcclxuICAgICAgd2luZG93LmxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKHRlc3QpXHJcbiAgICAgIHRydWVcclxuICAgIGNhdGNoXHJcbiAgICAgIGZhbHNlXHJcblxyXG4gIHNhdmU6IChjb250ZW50LCBtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICB0cnlcclxuICAgICAgd2luZG93LmxvY2FsU3RvcmFnZS5zZXRJdGVtIEBfZ2V0S2V5KG1ldGFkYXRhLm5hbWUpLCBjb250ZW50XHJcbiAgICAgIGNhbGxiYWNrPyBudWxsXHJcbiAgICBjYXRjaFxyXG4gICAgICBjYWxsYmFjaz8gJ1VuYWJsZSB0byBzYXZlJ1xyXG5cclxuICBsb2FkOiAobWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgdHJ5XHJcbiAgICAgIGNvbnRlbnQgPSB3aW5kb3cubG9jYWxTdG9yYWdlLmdldEl0ZW0gQF9nZXRLZXkgbWV0YWRhdGEubmFtZVxyXG4gICAgICBjYWxsYmFjayBudWxsLCBjb250ZW50XHJcbiAgICBjYXRjaFxyXG4gICAgICBjYWxsYmFjayAnVW5hYmxlIHRvIGxvYWQnXHJcblxyXG4gIGxpc3Q6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICBsaXN0ID0gW11cclxuICAgICMgVE9ETzogRklYIFBBVEhcclxuICAgIHBhdGggPSBtZXRhZGF0YT8ucGF0aCBvciAnJ1xyXG4gICAgcHJlZml4ID0gQF9nZXRLZXkgcGF0aFxyXG4gICAgZm9yIG93biBrZXkgb2Ygd2luZG93LmxvY2FsU3RvcmFnZVxyXG4gICAgICBpZiBrZXkuc3Vic3RyKDAsIHByZWZpeC5sZW5ndGgpIGlzIHByZWZpeFxyXG4gICAgICAgIFtuYW1lLCByZW1haW5kZXIuLi5dID0ga2V5LnN1YnN0cihwcmVmaXgubGVuZ3RoKS5zcGxpdCgnLycpXHJcbiAgICAgICAgbGlzdC5wdXNoIG5ldyBDbG91ZE1ldGFkYXRhXHJcbiAgICAgICAgICBuYW1lOiBrZXkuc3Vic3RyKHByZWZpeC5sZW5ndGgpXHJcbiAgICAgICAgICAjIFRPRE86IEZJWCBQQVRIXHJcbiAgICAgICAgICBwYXRoOiBcIiN7cGF0aH0vI3tuYW1lfVwiXHJcbiAgICAgICAgICB0eXBlOiBpZiByZW1haW5kZXIubGVuZ3RoID4gMCB0aGVuIENsb3VkTWV0YWRhdGEuRm9sZGVyIGVsc2UgQ2xvdWRNZXRhZGF0YS5GaWxlXHJcbiAgICAgICAgICBwcm92aWRlcjogQFxyXG4gICAgY2FsbGJhY2sgbnVsbCwgbGlzdFxyXG5cclxuICByZW1vdmU6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICB0cnlcclxuICAgICAgd2luZG93LmxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtIEBfZ2V0S2V5KG1ldGFkYXRhLm5hbWUpXHJcbiAgICAgIGNhbGxiYWNrPyBudWxsXHJcbiAgICBjYXRjaFxyXG4gICAgICBjYWxsYmFjaz8gJ1VuYWJsZSB0byBkZWxldGUnXHJcblxyXG4gIHJlbmFtZTogKG1ldGFkYXRhLCBuZXdOYW1lLCBjYWxsYmFjaykgLT5cclxuICAgIHRyeVxyXG4gICAgICBjb250ZW50ID0gd2luZG93LmxvY2FsU3RvcmFnZS5nZXRJdGVtIEBfZ2V0S2V5IG1ldGFkYXRhLm5hbWVcclxuICAgICAgd2luZG93LmxvY2FsU3RvcmFnZS5zZXRJdGVtIEBfZ2V0S2V5KG5ld05hbWUpLCBjb250ZW50XHJcbiAgICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSBAX2dldEtleShtZXRhZGF0YS5uYW1lKVxyXG4gICAgICBtZXRhZGF0YS5uYW1lID0gbmV3TmFtZVxyXG4gICAgICBjYWxsYmFjayBudWxsLCBtZXRhZGF0YVxyXG4gICAgY2F0Y2hcclxuICAgICAgY2FsbGJhY2s/ICdVbmFibGUgdG8gcmVuYW1lJ1xyXG5cclxuICBfZ2V0S2V5OiAobmFtZSA9ICcnKSAtPlxyXG4gICAgXCJjZm06OiN7bmFtZX1cIlxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBMb2NhbFN0b3JhZ2VQcm92aWRlclxyXG4iLCJ7ZGl2fSA9IFJlYWN0LkRPTVxyXG5cclxuY2xhc3MgQ2xvdWRGaWxlXHJcbiAgY29udHJ1Y3RvcjogKG9wdGlvbnMpIC0+XHJcbiAgICB7QGNvbnRlbnQsIEBtZXRhZGF0YX0gPSBvcHRpb25zXHJcblxyXG5jbGFzcyBDbG91ZE1ldGFkYXRhXHJcbiAgY29uc3RydWN0b3I6IChvcHRpb25zKSAtPlxyXG4gICAge0BuYW1lLCBAcGF0aCwgQHR5cGUsIEBwcm92aWRlciwgQHByb3ZpZGVyRGF0YT17fSwgQG92ZXJ3cml0YWJsZX0gPSBvcHRpb25zXHJcbiAgQEZvbGRlcjogJ2ZvbGRlcidcclxuICBARmlsZTogJ2ZpbGUnXHJcblxyXG5BdXRob3JpemF0aW9uTm90SW1wbGVtZW50ZWREaWFsb2cgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IFJlYWN0LmNyZWF0ZUNsYXNzXHJcbiAgZGlzcGxheU5hbWU6ICdBdXRob3JpemF0aW9uTm90SW1wbGVtZW50ZWREaWFsb2cnXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgKGRpdiB7fSwgXCJBdXRob3JpemF0aW9uIGRpYWxvZyBub3QgeWV0IGltcGxlbWVudGVkIGZvciAje0Bwcm9wcy5wcm92aWRlci5kaXNwbGF5TmFtZX1cIilcclxuXHJcbmNsYXNzIFByb3ZpZGVySW50ZXJmYWNlXHJcblxyXG4gIGNvbnN0cnVjdG9yOiAob3B0aW9ucykgLT5cclxuICAgIHtAbmFtZSwgQGRpc3BsYXlOYW1lLCBAY2FwYWJpbGl0aWVzfSA9IG9wdGlvbnNcclxuXHJcbiAgQEF2YWlsYWJsZTogLT4gdHJ1ZVxyXG5cclxuICBjYW46IChjYXBhYmlsaXR5KSAtPlxyXG4gICAgQGNhcGFiaWxpdGllc1tjYXBhYmlsaXR5XVxyXG5cclxuICBhdXRob3JpemVkOiAoY2FsbGJhY2spIC0+XHJcbiAgICBpZiBjYWxsYmFja1xyXG4gICAgICBjYWxsYmFjayB0cnVlXHJcbiAgICBlbHNlXHJcbiAgICAgIHRydWVcclxuXHJcbiAgcmVuZGVyQXV0aG9yaXphdGlvbkRpYWxvZzogLT5cclxuICAgIChBdXRob3JpemF0aW9uTm90SW1wbGVtZW50ZWREaWFsb2cge3Byb3ZpZGVyOiBAfSlcclxuXHJcbiAgcmVuZGVyVXNlcjogLT5cclxuICAgIG51bGxcclxuXHJcbiAgZGlhbG9nOiAoY2FsbGJhY2spIC0+XHJcbiAgICBAX25vdEltcGxlbWVudGVkICdkaWFsb2cnXHJcblxyXG4gIHNhdmU6IChjb250ZW50LCBtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICBAX25vdEltcGxlbWVudGVkICdzYXZlJ1xyXG5cclxuICBsb2FkOiAoY2FsbGJhY2spIC0+XHJcbiAgICBAX25vdEltcGxlbWVudGVkICdsb2FkJ1xyXG5cclxuICBsaXN0OiAobWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgQF9ub3RJbXBsZW1lbnRlZCAnbGlzdCdcclxuXHJcbiAgcmVtb3ZlOiAobWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgQF9ub3RJbXBsZW1lbnRlZCAncmVtb3ZlJ1xyXG5cclxuICByZW5hbWU6IChtZXRhZGF0YSwgbmV3TmFtZSwgY2FsbGJhY2spIC0+XHJcbiAgICBAX25vdEltcGxlbWVudGVkICdyZW5hbWUnXHJcblxyXG4gIHBhdGNoOiAobWV0YWRhdGEsIG5ld05hbWUsIGNhbGxiYWNrKSAtPlxyXG4gICAgQF9ub3RJbXBsZW1lbnRlZCAncGF0Y2gnXHJcblxyXG4gIF9ub3RJbXBsZW1lbnRlZDogKG1ldGhvZE5hbWUpIC0+XHJcbiAgICBhbGVydCBcIiN7bWV0aG9kTmFtZX0gbm90IGltcGxlbWVudGVkIGZvciAje0BuYW1lfSBwcm92aWRlclwiXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9XHJcbiAgQ2xvdWRGaWxlOiBDbG91ZEZpbGVcclxuICBDbG91ZE1ldGFkYXRhOiBDbG91ZE1ldGFkYXRhXHJcbiAgUHJvdmlkZXJJbnRlcmZhY2U6IFByb3ZpZGVySW50ZXJmYWNlXHJcbiIsInRyID0gcmVxdWlyZSAnLi4vdXRpbHMvdHJhbnNsYXRlJ1xyXG5pc1N0cmluZyA9IHJlcXVpcmUgJy4uL3V0aWxzL2lzLXN0cmluZydcclxuXHJcblByb3ZpZGVySW50ZXJmYWNlID0gKHJlcXVpcmUgJy4vcHJvdmlkZXItaW50ZXJmYWNlJykuUHJvdmlkZXJJbnRlcmZhY2VcclxuQ2xvdWRNZXRhZGF0YSA9IChyZXF1aXJlICcuL3Byb3ZpZGVyLWludGVyZmFjZScpLkNsb3VkTWV0YWRhdGFcclxuXHJcbmNsYXNzIFJlYWRPbmx5UHJvdmlkZXIgZXh0ZW5kcyBQcm92aWRlckludGVyZmFjZVxyXG5cclxuICBjb25zdHJ1Y3RvcjogKEBvcHRpb25zID0ge30pIC0+XHJcbiAgICBzdXBlclxyXG4gICAgICBuYW1lOiBSZWFkT25seVByb3ZpZGVyLk5hbWVcclxuICAgICAgZGlzcGxheU5hbWU6IEBvcHRpb25zLmRpc3BsYXlOYW1lIG9yICh0ciAnflBST1ZJREVSLlJFQURfT05MWScpXHJcbiAgICAgIGNhcGFiaWxpdGllczpcclxuICAgICAgICBzYXZlOiBmYWxzZVxyXG4gICAgICAgIGxvYWQ6IHRydWVcclxuICAgICAgICBsaXN0OiB0cnVlXHJcbiAgICAgICAgcmVtb3ZlOiBmYWxzZVxyXG4gICAgICAgIHJlbmFtZTogZmFsc2VcclxuICAgIEB0cmVlID0gbnVsbFxyXG5cclxuICBATmFtZTogJ3JlYWRPbmx5J1xyXG5cclxuICBsb2FkOiAobWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgQF9sb2FkVHJlZSAoZXJyLCB0cmVlKSA9PlxyXG4gICAgICByZXR1cm4gY2FsbGJhY2sgZXJyIGlmIGVyclxyXG4gICAgICBwYXJlbnQgPSBAX2ZpbmRQYXJlbnQgbWV0YWRhdGFcclxuICAgICAgaWYgcGFyZW50XHJcbiAgICAgICAgaWYgcGFyZW50W21ldGFkYXRhLm5hbWVdXHJcbiAgICAgICAgICBpZiBwYXJlbnRbbWV0YWRhdGEubmFtZV0ubWV0YWRhdGEudHlwZSBpcyBDbG91ZE1ldGFkYXRhLkZpbGVcclxuICAgICAgICAgICAgY2FsbGJhY2sgbnVsbCwgcGFyZW50W21ldGFkYXRhLm5hbWVdLmNvbnRlbnRcclxuICAgICAgICAgIGVsc2VcclxuICAgICAgICAgICAgY2FsbGJhY2sgXCIje21ldGFkYXRhLm5hbWV9IGlzIGEgZm9sZGVyXCJcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICBjYWxsYmFjayBcIiN7bWV0YWRhdGEubmFtZX0gbm90IGZvdW5kIGluIGZvbGRlclwiXHJcbiAgICAgIGVsc2VcclxuICAgICAgICBjYWxsYmFjayBcIiN7bWV0YWRhdGEubmFtZX0gZm9sZGVyIG5vdCBmb3VuZFwiXHJcblxyXG4gIGxpc3Q6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICBAX2xvYWRUcmVlIChlcnIsIHRyZWUpID0+XHJcbiAgICAgIHJldHVybiBjYWxsYmFjayBlcnIgaWYgZXJyXHJcbiAgICAgIHBhcmVudCA9IEBfZmluZFBhcmVudCBtZXRhZGF0YVxyXG4gICAgICBpZiBwYXJlbnRcclxuICAgICAgICBsaXN0ID0gW11cclxuICAgICAgICBsaXN0LnB1c2ggZmlsZS5tZXRhZGF0YSBmb3Igb3duIGZpbGVuYW1lLCBmaWxlIG9mIHBhcmVudFxyXG4gICAgICAgIGNhbGxiYWNrIG51bGwsIGxpc3RcclxuICAgICAgZWxzZSBpZiBtZXRhZGF0YVxyXG4gICAgICAgIGNhbGxiYWNrIFwiI3ttZXRhZGF0YS5uYW1lfSBmb2xkZXIgbm90IGZvdW5kXCJcclxuXHJcbiAgX2xvYWRUcmVlOiAoY2FsbGJhY2spIC0+XHJcbiAgICBpZiBAdHJlZSBpc250IG51bGxcclxuICAgICAgY2FsbGJhY2sgbnVsbCwgQHRyZWVcclxuICAgIGVsc2UgaWYgQG9wdGlvbnMuanNvblxyXG4gICAgICBAdHJlZSA9IEBfY29udmVydEpTT05Ub01ldGFkYXRhVHJlZSBAb3B0aW9ucy5qc29uXHJcbiAgICAgIGNhbGxiYWNrIG51bGwsIEB0cmVlXHJcbiAgICBlbHNlIGlmIEBvcHRpb25zLmpzb25DYWxsYmFja1xyXG4gICAgICBAb3B0aW9ucy5qc29uQ2FsbGJhY2sgKGVyciwganNvbikgPT5cclxuICAgICAgICBpZiBlcnJcclxuICAgICAgICAgIGNhbGxiYWNrIGVyclxyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgIEB0cmVlID0gQF9jb252ZXJ0SlNPTlRvTWV0YWRhdGFUcmVlIEBvcHRpb25zLmpzb25cclxuICAgICAgICAgIGNhbGxiYWNrIG51bGwsIEB0cmVlXHJcbiAgICBlbHNlIGlmIEBvcHRpb25zLnNyY1xyXG4gICAgICAkLmFqYXhcclxuICAgICAgICBkYXRhVHlwZTogJ2pzb24nXHJcbiAgICAgICAgdXJsOiBAb3B0aW9ucy5zcmNcclxuICAgICAgICBzdWNjZXNzOiAoZGF0YSkgPT5cclxuICAgICAgICAgIEB0cmVlID0gQF9jb252ZXJ0SlNPTlRvTWV0YWRhdGFUcmVlIGRhdGFcclxuICAgICAgICAgIGNhbGxiYWNrIG51bGwsIEB0cmVlXHJcbiAgICAgICAgZXJyb3I6IC0+IGNhbGxiYWNrIFwiVW5hYmxlIHRvIGxvYWQganNvbiBmb3IgI3tAZGlzcGxheU5hbWV9IHByb3ZpZGVyXCJcclxuICAgIGVsc2VcclxuICAgICAgY29uc29sZS5lcnJvcj8gXCJObyBqc29uIG9yIHNyYyBvcHRpb24gZm91bmQgZm9yICN7QGRpc3BsYXlOYW1lfSBwcm92aWRlclwiXHJcbiAgICAgIGNhbGxiYWNrIG51bGwsIHt9XHJcblxyXG4gIF9jb252ZXJ0SlNPTlRvTWV0YWRhdGFUcmVlOiAoanNvbiwgcGF0aFByZWZpeCA9ICcvJykgLT5cclxuICAgIHRyZWUgPSB7fVxyXG4gICAgZm9yIG93biBmaWxlbmFtZSBvZiBqc29uXHJcbiAgICAgIHR5cGUgPSBpZiBpc1N0cmluZyBqc29uW2ZpbGVuYW1lXSB0aGVuIENsb3VkTWV0YWRhdGEuRmlsZSBlbHNlIENsb3VkTWV0YWRhdGEuRm9sZGVyXHJcbiAgICAgIG1ldGFkYXRhID0gbmV3IENsb3VkTWV0YWRhdGFcclxuICAgICAgICBuYW1lOiBmaWxlbmFtZVxyXG4gICAgICAgICMgVE9ETzogRklYIFBBVEhcclxuICAgICAgICBwYXRoOiBwYXRoUHJlZml4ICsgZmlsZW5hbWVcclxuICAgICAgICB0eXBlOiB0eXBlXHJcbiAgICAgICAgcHJvdmlkZXI6IEBcclxuICAgICAgICBjaGlsZHJlbjogbnVsbFxyXG4gICAgICBpZiB0eXBlIGlzIENsb3VkTWV0YWRhdGEuRm9sZGVyXHJcbiAgICAgICAgbWV0YWRhdGEuY2hpbGRyZW4gPSBfY29udmVydEpTT05Ub01ldGFkYXRhVHJlZSBqc29uW2ZpbGVuYW1lXSwgcGF0aFByZWZpeCArIGZpbGVuYW1lICsgJy8nXHJcbiAgICAgIHRyZWVbZmlsZW5hbWVdID1cclxuICAgICAgICBjb250ZW50OiBqc29uW2ZpbGVuYW1lXVxyXG4gICAgICAgIG1ldGFkYXRhOiBtZXRhZGF0YVxyXG4gICAgdHJlZVxyXG5cclxuICBfZmluZFBhcmVudDogKG1ldGFkYXRhKSAtPlxyXG4gICAgaWYgbm90IG1ldGFkYXRhXHJcbiAgICAgIEB0cmVlXHJcbiAgICBlbHNlXHJcbiAgICAgIEB0cmVlXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWRPbmx5UHJvdmlkZXJcclxuIiwidHIgPSByZXF1aXJlICcuL3V0aWxzL3RyYW5zbGF0ZSdcclxuaXNTdHJpbmcgPSByZXF1aXJlICcuL3V0aWxzL2lzLXN0cmluZydcclxuXHJcbmNsYXNzIENsb3VkRmlsZU1hbmFnZXJVSUV2ZW50XHJcblxyXG4gIGNvbnN0cnVjdG9yOiAoQHR5cGUsIEBkYXRhID0ge30pIC0+XHJcblxyXG5jbGFzcyBDbG91ZEZpbGVNYW5hZ2VyVUlNZW51XHJcblxyXG4gIEBEZWZhdWx0TWVudTogWyduZXdGaWxlRGlhbG9nJywgJ29wZW5GaWxlRGlhbG9nJywgJ3NhdmUnLCAnc2F2ZUZpbGVBc0RpYWxvZycsICdkb3dubG9hZERpYWxvZycsICdyZW5hbWVEaWFsb2cnXVxyXG5cclxuICBjb25zdHJ1Y3RvcjogKG9wdGlvbnMsIGNsaWVudCkgLT5cclxuICAgIHNldEFjdGlvbiA9IChhY3Rpb24pIC0+XHJcbiAgICAgIGNsaWVudFthY3Rpb25dPy5iaW5kKGNsaWVudCkgb3IgKC0+IGFsZXJ0IFwiTm8gI3thY3Rpb259IGFjdGlvbiBpcyBhdmFpbGFibGUgaW4gdGhlIGNsaWVudFwiKVxyXG5cclxuICAgIHNldEVuYWJsZWQgPSAoYWN0aW9uKSAtPlxyXG4gICAgICBpZiBhY3Rpb24gaXMgJ3JlbmFtZURpYWxvZydcclxuICAgICAgICAtPiBjbGllbnQuc3RhdGUubWV0YWRhdGE/LnByb3ZpZGVyLmNhbiAncmVuYW1lJ1xyXG4gICAgICBlbHNlXHJcbiAgICAgICAgdHJ1ZVxyXG5cclxuICAgIEBpdGVtcyA9IFtdXHJcbiAgICBmb3IgaXRlbSBpbiBvcHRpb25zLm1lbnVcclxuICAgICAgbWVudUl0ZW0gPSBpZiBpc1N0cmluZyBpdGVtXHJcbiAgICAgICAgbmFtZSA9IG9wdGlvbnMubWVudU5hbWVzP1tpdGVtXVxyXG4gICAgICAgIG1lbnVJdGVtID0gc3dpdGNoIGl0ZW1cclxuICAgICAgICAgIHdoZW4gJ25ld0ZpbGVEaWFsb2cnXHJcbiAgICAgICAgICAgIG5hbWU6IG5hbWUgb3IgdHIgXCJ+TUVOVS5ORVdcIlxyXG4gICAgICAgICAgd2hlbiAnb3BlbkZpbGVEaWFsb2cnXHJcbiAgICAgICAgICAgIG5hbWU6IG5hbWUgb3IgdHIgXCJ+TUVOVS5PUEVOXCJcclxuICAgICAgICAgIHdoZW4gJ3NhdmUnXHJcbiAgICAgICAgICAgIG5hbWU6IG5hbWUgb3IgdHIgXCJ+TUVOVS5TQVZFXCJcclxuICAgICAgICAgIHdoZW4gJ3NhdmVGaWxlQXNEaWFsb2cnXHJcbiAgICAgICAgICAgIG5hbWU6IG5hbWUgb3IgdHIgXCJ+TUVOVS5TQVZFX0FTXCJcclxuICAgICAgICAgIHdoZW4gJ2Rvd25sb2FkRGlhbG9nJ1xyXG4gICAgICAgICAgICBuYW1lOiBuYW1lIG9yIHRyIFwifk1FTlUuRE9XTkxPQURcIlxyXG4gICAgICAgICAgd2hlbiAncmVuYW1lRGlhbG9nJ1xyXG4gICAgICAgICAgICBuYW1lOiBuYW1lIG9yIHRyIFwifk1FTlUuUkVOQU1FXCJcclxuICAgICAgICAgIGVsc2VcclxuICAgICAgICAgICAgbmFtZTogXCJVbmtub3duIGl0ZW06ICN7aXRlbX1cIlxyXG4gICAgICAgIG1lbnVJdGVtLmVuYWJsZWQgPSBzZXRFbmFibGVkIGl0ZW1cclxuICAgICAgICBtZW51SXRlbS5hY3Rpb24gPSBzZXRBY3Rpb24gaXRlbVxyXG4gICAgICAgIG1lbnVJdGVtXHJcbiAgICAgIGVsc2VcclxuICAgICAgICAjIGNsaWVudHMgY2FuIHBhc3MgaW4gY3VzdG9tIHtuYW1lOi4uLiwgYWN0aW9uOi4uLn0gbWVudSBpdGVtcyB3aGVyZSB0aGUgYWN0aW9uIGNhbiBiZSBhIGNsaWVudCBmdW5jdGlvbiBuYW1lIG9yIG90aGVyd2lzZSBpdCBpcyBhc3N1bWVkIGFjdGlvbiBpcyBhIGZ1bmN0aW9uXHJcbiAgICAgICAgaWYgaXNTdHJpbmcgaXRlbS5hY3Rpb25cclxuICAgICAgICAgIGl0ZW0uZW5hYmxlZCA9IHNldEVuYWJsZWQgaXRlbS5hY3Rpb25cclxuICAgICAgICAgIGl0ZW0uYWN0aW9uID0gc2V0QWN0aW9uIGl0ZW0uYWN0aW9uXHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgaXRlbS5lbmFibGVkIG9yPSB0cnVlXHJcbiAgICAgICAgaXRlbVxyXG4gICAgICBpZiBtZW51SXRlbVxyXG4gICAgICAgIEBpdGVtcy5wdXNoIG1lbnVJdGVtXHJcblxyXG5jbGFzcyBDbG91ZEZpbGVNYW5hZ2VyVUlcclxuXHJcbiAgY29uc3RydWN0b3I6IChAY2xpZW50KS0+XHJcbiAgICBAbWVudSA9IG51bGxcclxuXHJcbiAgaW5pdDogKG9wdGlvbnMpIC0+XHJcbiAgICBvcHRpb25zID0gb3B0aW9ucyBvciB7fVxyXG4gICAgIyBza2lwIHRoZSBtZW51IGlmIGV4cGxpY2l0eSBzZXQgdG8gbnVsbCAobWVhbmluZyBubyBtZW51KVxyXG4gICAgaWYgb3B0aW9ucy5tZW51IGlzbnQgbnVsbFxyXG4gICAgICBpZiB0eXBlb2Ygb3B0aW9ucy5tZW51IGlzICd1bmRlZmluZWQnXHJcbiAgICAgICAgb3B0aW9ucy5tZW51ID0gQ2xvdWRGaWxlTWFuYWdlclVJTWVudS5EZWZhdWx0TWVudVxyXG4gICAgICBAbWVudSA9IG5ldyBDbG91ZEZpbGVNYW5hZ2VyVUlNZW51IG9wdGlvbnMsIEBjbGllbnRcclxuXHJcbiAgIyBmb3IgUmVhY3QgdG8gbGlzdGVuIGZvciBkaWFsb2cgY2hhbmdlc1xyXG4gIGxpc3RlbjogKEBsaXN0ZW5lckNhbGxiYWNrKSAtPlxyXG5cclxuICBhcHBlbmRNZW51SXRlbTogKGl0ZW0pIC0+XHJcbiAgICBAbGlzdGVuZXJDYWxsYmFjayBuZXcgQ2xvdWRGaWxlTWFuYWdlclVJRXZlbnQgJ2FwcGVuZE1lbnVJdGVtJywgaXRlbVxyXG5cclxuICBzZXRNZW51QmFySW5mbzogKGluZm8pIC0+XHJcbiAgICBAbGlzdGVuZXJDYWxsYmFjayBuZXcgQ2xvdWRGaWxlTWFuYWdlclVJRXZlbnQgJ3NldE1lbnVCYXJJbmZvJywgaW5mb1xyXG5cclxuICBzYXZlRmlsZURpYWxvZzogKGNhbGxiYWNrKSAtPlxyXG4gICAgQF9zaG93UHJvdmlkZXJEaWFsb2cgJ3NhdmVGaWxlJywgKHRyICd+RElBTE9HLlNBVkUnKSwgY2FsbGJhY2tcclxuXHJcbiAgc2F2ZUZpbGVBc0RpYWxvZzogKGNhbGxiYWNrKSAtPlxyXG4gICAgQF9zaG93UHJvdmlkZXJEaWFsb2cgJ3NhdmVGaWxlQXMnLCAodHIgJ35ESUFMT0cuU0FWRV9BUycpLCBjYWxsYmFja1xyXG5cclxuICBvcGVuRmlsZURpYWxvZzogKGNhbGxiYWNrKSAtPlxyXG4gICAgQF9zaG93UHJvdmlkZXJEaWFsb2cgJ29wZW5GaWxlJywgKHRyICd+RElBTE9HLk9QRU4nKSwgY2FsbGJhY2tcclxuXHJcbiAgZG93bmxvYWREaWFsb2c6IChmaWxlbmFtZSwgY29udGVudCwgY2FsbGJhY2spIC0+XHJcbiAgICBAbGlzdGVuZXJDYWxsYmFjayBuZXcgQ2xvdWRGaWxlTWFuYWdlclVJRXZlbnQgJ3Nob3dEb3dubG9hZERpYWxvZycsXHJcbiAgICAgIGZpbGVuYW1lOiBmaWxlbmFtZVxyXG4gICAgICBjb250ZW50OiBjb250ZW50XHJcbiAgICAgIGNhbGxiYWNrOiBjYWxsYmFja1xyXG5cclxuICByZW5hbWVEaWFsb2c6IChmaWxlbmFtZSwgY2FsbGJhY2spIC0+XHJcbiAgICBAbGlzdGVuZXJDYWxsYmFjayBuZXcgQ2xvdWRGaWxlTWFuYWdlclVJRXZlbnQgJ3Nob3dSZW5hbWVEaWFsb2cnLFxyXG4gICAgICBmaWxlbmFtZTogZmlsZW5hbWVcclxuICAgICAgY2FsbGJhY2s6IGNhbGxiYWNrXHJcblxyXG4gIF9zaG93UHJvdmlkZXJEaWFsb2c6IChhY3Rpb24sIHRpdGxlLCBjYWxsYmFjaykgLT5cclxuICAgIEBsaXN0ZW5lckNhbGxiYWNrIG5ldyBDbG91ZEZpbGVNYW5hZ2VyVUlFdmVudCAnc2hvd1Byb3ZpZGVyRGlhbG9nJyxcclxuICAgICAgYWN0aW9uOiBhY3Rpb25cclxuICAgICAgdGl0bGU6IHRpdGxlXHJcbiAgICAgIGNhbGxiYWNrOiBjYWxsYmFja1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPVxyXG4gIENsb3VkRmlsZU1hbmFnZXJVSUV2ZW50OiBDbG91ZEZpbGVNYW5hZ2VyVUlFdmVudFxyXG4gIENsb3VkRmlsZU1hbmFnZXJVSTogQ2xvdWRGaWxlTWFuYWdlclVJXHJcbiAgQ2xvdWRGaWxlTWFuYWdlclVJTWVudTogQ2xvdWRGaWxlTWFuYWdlclVJTWVudVxyXG4iLCJtb2R1bGUuZXhwb3J0cyA9IChwYXJhbSkgLT4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHBhcmFtKSBpcyAnW29iamVjdCBTdHJpbmddJ1xyXG4iLCJtb2R1bGUuZXhwb3J0cyA9XHJcbiAgXCJ+TUVOVUJBUi5VTlRJVExFX0RPQ1VNRU5UXCI6IFwiVW50aXRsZWQgRG9jdW1lbnRcIlxyXG5cclxuICBcIn5NRU5VLk5FV1wiOiBcIk5ld1wiXHJcbiAgXCJ+TUVOVS5PUEVOXCI6IFwiT3BlbiAuLi5cIlxyXG4gIFwifk1FTlUuU0FWRVwiOiBcIlNhdmVcIlxyXG4gIFwifk1FTlUuU0FWRV9BU1wiOiBcIlNhdmUgQXMgLi4uXCJcclxuICBcIn5NRU5VLkRPV05MT0FEXCI6IFwiRG93bmxvYWRcIlxyXG4gIFwifk1FTlUuUkVOQU1FXCI6IFwiUmVuYW1lXCJcclxuXHJcbiAgXCJ+RElBTE9HLlNBVkVcIjogXCJTYXZlXCJcclxuICBcIn5ESUFMT0cuU0FWRV9BU1wiOiBcIlNhdmUgQXMgLi4uXCJcclxuICBcIn5ESUFMT0cuT1BFTlwiOiBcIk9wZW5cIlxyXG4gIFwifkRJQUxPRy5ET1dOTE9BRFwiOiBcIkRvd25sb2FkXCJcclxuICBcIn5ESUFMT0cuUkVOQU1FXCI6IFwiUmVuYW1lXCJcclxuXHJcbiAgXCJ+UFJPVklERVIuTE9DQUxfU1RPUkFHRVwiOiBcIkxvY2FsIFN0b3JhZ2VcIlxyXG4gIFwiflBST1ZJREVSLlJFQURfT05MWVwiOiBcIlJlYWQgT25seVwiXHJcbiAgXCJ+UFJPVklERVIuR09PR0xFX0RSSVZFXCI6IFwiR29vZ2xlIERyaXZlXCJcclxuICBcIn5QUk9WSURFUi5ET0NVTUVOVF9TVE9SRVwiOiBcIkRvY3VtZW50IFN0b3JlXCJcclxuXHJcbiAgXCJ+RklMRV9ESUFMT0cuRklMRU5BTUVcIjogXCJGaWxlbmFtZVwiXHJcbiAgXCJ+RklMRV9ESUFMT0cuT1BFTlwiOiBcIk9wZW5cIlxyXG4gIFwifkZJTEVfRElBTE9HLlNBVkVcIjogXCJTYXZlXCJcclxuICBcIn5GSUxFX0RJQUxPRy5DQU5DRUxcIjogXCJDYW5jZWxcIlxyXG4gIFwifkZJTEVfRElBTE9HLlJFTU9WRVwiOiBcIkRlbGV0ZVwiXHJcbiAgXCJ+RklMRV9ESUFMT0cuUkVNT1ZFX0NPTkZJUk1cIjogXCJBcmUgeW91IHN1cmUgeW91IHdhbnQgdG8gZGVsZXRlICV7ZmlsZW5hbWV9P1wiXHJcbiAgXCJ+RklMRV9ESUFMT0cuTE9BRElOR1wiOiBcIkxvYWRpbmcuLi5cIlxyXG5cclxuICBcIn5ET1dOTE9BRF9ESUFMT0cuRE9XTkxPQURcIjogXCJEb3dubG9hZFwiXHJcbiAgXCJ+RE9XTkxPQURfRElBTE9HLkNBTkNFTFwiOiBcIkNhbmNlbFwiXHJcblxyXG4gIFwiflJFTkFNRV9ESUFMT0cuUkVOQU1FXCI6IFwiUmVuYW1lXCJcclxuICBcIn5SRU5BTUVfRElBTE9HLkNBTkNFTFwiOiBcIkNhbmNlbFwiXHJcblxyXG4gIFwifkNPTkZJUk0uVU5TQVZFRF9DSEFOR0VTXCI6IFwiWW91IGhhdmUgdW5zYXZlZCBjaGFuZ2VzLiAgQXJlIHlvdSBzdXJlIHlvdSB3YW50IGEgbmV3IGZpbGU/XCJcclxuIiwidHJhbnNsYXRpb25zID0gIHt9XHJcbnRyYW5zbGF0aW9uc1snZW4nXSA9IHJlcXVpcmUgJy4vbGFuZy9lbi11cydcclxuZGVmYXVsdExhbmcgPSAnZW4nXHJcbnZhclJlZ0V4cCA9IC8lXFx7XFxzKihbXn1cXHNdKilcXHMqXFx9L2dcclxuXHJcbnRyYW5zbGF0ZSA9IChrZXksIHZhcnM9e30sIGxhbmc9ZGVmYXVsdExhbmcpIC0+XHJcbiAgdHJhbnNsYXRpb24gPSB0cmFuc2xhdGlvbnNbbGFuZ10/W2tleV0gb3Iga2V5XHJcbiAgdHJhbnNsYXRpb24ucmVwbGFjZSB2YXJSZWdFeHAsIChtYXRjaCwga2V5KSAtPlxyXG4gICAgaWYgdmFycy5oYXNPd25Qcm9wZXJ0eSBrZXkgdGhlbiB2YXJzW2tleV0gZWxzZSBcIicqKiBVS05PV04gS0VZOiAje2tleX0gKipcIlxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSB0cmFuc2xhdGVcclxuIiwiTWVudUJhciA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9tZW51LWJhci12aWV3J1xyXG5Qcm92aWRlclRhYmJlZERpYWxvZyA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9wcm92aWRlci10YWJiZWQtZGlhbG9nLXZpZXcnXHJcbkRvd25sb2FkRGlhbG9nID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL2Rvd25sb2FkLWRpYWxvZy12aWV3J1xyXG5SZW5hbWVEaWFsb2cgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vcmVuYW1lLWRpYWxvZy12aWV3J1xyXG5cclxudHIgPSByZXF1aXJlICcuLi91dGlscy90cmFuc2xhdGUnXHJcblxyXG57ZGl2LCBpZnJhbWV9ID0gUmVhY3QuRE9NXHJcblxyXG5Jbm5lckFwcCA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgUmVhY3QuY3JlYXRlQ2xhc3NcclxuXHJcbiAgZGlzcGxheU5hbWU6ICdDbG91ZEZpbGVNYW5hZ2VySW5uZXJBcHAnXHJcblxyXG4gIHNob3VsZENvbXBvbmVudFVwZGF0ZTogKG5leHRQcm9wcykgLT5cclxuICAgIG5leHRQcm9wcy5hcHAgaXNudCBAcHJvcHMuYXBwXHJcblxyXG4gIHJlbmRlcjogLT5cclxuICAgIChkaXYge2NsYXNzTmFtZTogJ2lubmVyQXBwJ30sXHJcbiAgICAgIChpZnJhbWUge3NyYzogQHByb3BzLmFwcH0pXHJcbiAgICApXHJcblxyXG5BcHAgPSBSZWFjdC5jcmVhdGVDbGFzc1xyXG5cclxuICBkaXNwbGF5TmFtZTogJ0Nsb3VkRmlsZU1hbmFnZXInXHJcblxyXG4gIGdldEZpbGVuYW1lOiAtPlxyXG4gICAgaWYgQHByb3BzLmNsaWVudC5zdGF0ZS5tZXRhZGF0YT8uaGFzT3duUHJvcGVydHkoJ25hbWUnKSB0aGVuIEBwcm9wcy5jbGllbnQuc3RhdGUubWV0YWRhdGEubmFtZSBlbHNlICh0ciBcIn5NRU5VQkFSLlVOVElUTEVfRE9DVU1FTlRcIilcclxuXHJcbiAgZ2V0UHJvdmlkZXI6IC0+XHJcbiAgICBAcHJvcHMuY2xpZW50LnN0YXRlLm1ldGFkYXRhPy5wcm92aWRlclxyXG5cclxuICBnZXRJbml0aWFsU3RhdGU6IC0+XHJcbiAgICBmaWxlbmFtZTogQGdldEZpbGVuYW1lKClcclxuICAgIHByb3ZpZGVyOiBAZ2V0UHJvdmlkZXIoKVxyXG4gICAgbWVudUl0ZW1zOiBAcHJvcHMuY2xpZW50Ll91aS5tZW51Py5pdGVtcyBvciBbXVxyXG4gICAgbWVudU9wdGlvbnM6IEBwcm9wcy51aT8ubWVudUJhciBvciB7fVxyXG4gICAgcHJvdmlkZXJEaWFsb2c6IG51bGxcclxuICAgIGRvd25sb2FkRGlhbG9nOiBudWxsXHJcbiAgICByZW5hbWVEaWFsb2c6IG51bGxcclxuICAgIGRpcnR5OiBmYWxzZVxyXG5cclxuICBjb21wb25lbnRXaWxsTW91bnQ6IC0+XHJcbiAgICBAcHJvcHMuY2xpZW50Lmxpc3RlbiAoZXZlbnQpID0+XHJcbiAgICAgIGZpbGVTdGF0dXMgPSBpZiBldmVudC5zdGF0ZS5zYXZpbmdcclxuICAgICAgICB7bWVzc2FnZTogXCJTYXZpbmcuLi5cIiwgdHlwZTogJ2luZm8nfVxyXG4gICAgICBlbHNlIGlmIGV2ZW50LnN0YXRlLnNhdmVkXHJcbiAgICAgICAge21lc3NhZ2U6IFwiQWxsIGNoYW5nZXMgc2F2ZWQgdG8gI3tldmVudC5zdGF0ZS5tZXRhZGF0YS5wcm92aWRlci5kaXNwbGF5TmFtZX1cIiwgdHlwZTogJ2luZm8nfVxyXG4gICAgICBlbHNlIGlmIGV2ZW50LnN0YXRlLmRpcnR5XHJcbiAgICAgICAge21lc3NhZ2U6ICdVbnNhdmVkJywgdHlwZTogJ2FsZXJ0J31cclxuICAgICAgZWxzZVxyXG4gICAgICAgIG51bGxcclxuICAgICAgQHNldFN0YXRlXHJcbiAgICAgICAgZmlsZW5hbWU6IEBnZXRGaWxlbmFtZSgpXHJcbiAgICAgICAgcHJvdmlkZXI6IEBnZXRQcm92aWRlcigpXHJcbiAgICAgICAgZmlsZVN0YXR1czogZmlsZVN0YXR1c1xyXG5cclxuICAgICAgc3dpdGNoIGV2ZW50LnR5cGVcclxuICAgICAgICB3aGVuICdjb25uZWN0ZWQnXHJcbiAgICAgICAgICBAc2V0U3RhdGUgbWVudUl0ZW1zOiBAcHJvcHMuY2xpZW50Ll91aS5tZW51Py5pdGVtcyBvciBbXVxyXG5cclxuICAgIEBwcm9wcy5jbGllbnQuX3VpLmxpc3RlbiAoZXZlbnQpID0+XHJcbiAgICAgIHN3aXRjaCBldmVudC50eXBlXHJcbiAgICAgICAgd2hlbiAnc2hvd1Byb3ZpZGVyRGlhbG9nJ1xyXG4gICAgICAgICAgQHNldFN0YXRlIHByb3ZpZGVyRGlhbG9nOiBldmVudC5kYXRhXHJcbiAgICAgICAgd2hlbiAnc2hvd0Rvd25sb2FkRGlhbG9nJ1xyXG4gICAgICAgICAgQHNldFN0YXRlIGRvd25sb2FkRGlhbG9nOiBldmVudC5kYXRhXHJcbiAgICAgICAgd2hlbiAnc2hvd1JlbmFtZURpYWxvZydcclxuICAgICAgICAgIEBzZXRTdGF0ZSByZW5hbWVEaWFsb2c6IGV2ZW50LmRhdGFcclxuICAgICAgICB3aGVuICdhcHBlbmRNZW51SXRlbSdcclxuICAgICAgICAgIEBzdGF0ZS5tZW51SXRlbXMucHVzaCBldmVudC5kYXRhXHJcbiAgICAgICAgICBAc2V0U3RhdGUgbWVudUl0ZW1zOiBAc3RhdGUubWVudUl0ZW1zXHJcbiAgICAgICAgd2hlbiAnc2V0TWVudUJhckluZm8nXHJcbiAgICAgICAgICBAc3RhdGUubWVudU9wdGlvbnMuaW5mbyA9IGV2ZW50LmRhdGFcclxuICAgICAgICAgIEBzZXRTdGF0ZSBtZW51T3B0aW9uczogQHN0YXRlLm1lbnVPcHRpb25zXHJcblxyXG4gIGNsb3NlRGlhbG9nczogLT5cclxuICAgIEBzZXRTdGF0ZVxyXG4gICAgICBwcm92aWRlckRpYWxvZzogbnVsbFxyXG4gICAgICBkb3dubG9hZERpYWxvZzogbnVsbFxyXG4gICAgICByZW5hbWVEaWFsb2c6IG51bGxcclxuXHJcbiAgcmVuZGVyRGlhbG9nczogLT5cclxuICAgIGlmIEBzdGF0ZS5wcm92aWRlckRpYWxvZ1xyXG4gICAgICAoUHJvdmlkZXJUYWJiZWREaWFsb2cge2NsaWVudDogQHByb3BzLmNsaWVudCwgZGlhbG9nOiBAc3RhdGUucHJvdmlkZXJEaWFsb2csIGNsb3NlOiBAY2xvc2VEaWFsb2dzfSlcclxuICAgIGVsc2UgaWYgQHN0YXRlLmRvd25sb2FkRGlhbG9nXHJcbiAgICAgIChEb3dubG9hZERpYWxvZyB7ZmlsZW5hbWU6IEBzdGF0ZS5kb3dubG9hZERpYWxvZy5maWxlbmFtZSwgY29udGVudDogQHN0YXRlLmRvd25sb2FkRGlhbG9nLmNvbnRlbnQsIGNsb3NlOiBAY2xvc2VEaWFsb2dzfSlcclxuICAgIGVsc2UgaWYgQHN0YXRlLnJlbmFtZURpYWxvZ1xyXG4gICAgICAoUmVuYW1lRGlhbG9nIHtmaWxlbmFtZTogQHN0YXRlLnJlbmFtZURpYWxvZy5maWxlbmFtZSwgY2FsbGJhY2s6IEBzdGF0ZS5yZW5hbWVEaWFsb2cuY2FsbGJhY2ssIGNsb3NlOiBAY2xvc2VEaWFsb2dzfSlcclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgaWYgQHByb3BzLnVzaW5nSWZyYW1lXHJcbiAgICAgIChkaXYge2NsYXNzTmFtZTogJ2FwcCd9LFxyXG4gICAgICAgIChNZW51QmFyIHtmaWxlbmFtZTogQHN0YXRlLmZpbGVuYW1lLCBwcm92aWRlcjogQHN0YXRlLnByb3ZpZGVyLCBmaWxlU3RhdHVzOiBAc3RhdGUuZmlsZVN0YXR1cywgaXRlbXM6IEBzdGF0ZS5tZW51SXRlbXMsIG9wdGlvbnM6IEBzdGF0ZS5tZW51T3B0aW9uc30pXHJcbiAgICAgICAgKElubmVyQXBwIHthcHA6IEBwcm9wcy5hcHB9KVxyXG4gICAgICAgIEByZW5kZXJEaWFsb2dzKClcclxuICAgICAgKVxyXG4gICAgZWxzZSBpZiBAc3RhdGUucHJvdmlkZXJEaWFsb2cgb3IgQHN0YXRlLmRvd25sb2FkRGlhbG9nXHJcbiAgICAgIChkaXYge2NsYXNzTmFtZTogJ2FwcCd9LFxyXG4gICAgICAgIEByZW5kZXJEaWFsb2dzKClcclxuICAgICAgKVxyXG4gICAgZWxzZVxyXG4gICAgICBudWxsXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEFwcFxyXG4iLCJBdXRob3JpemVNaXhpbiA9XHJcbiAgZ2V0SW5pdGlhbFN0YXRlOiAtPlxyXG4gICAgYXV0aG9yaXplZDogZmFsc2VcclxuXHJcbiAgY29tcG9uZW50V2lsbE1vdW50OiAtPlxyXG4gICAgQHByb3BzLnByb3ZpZGVyLmF1dGhvcml6ZWQgKGF1dGhvcml6ZWQpID0+XHJcbiAgICAgIEBzZXRTdGF0ZSBhdXRob3JpemVkOiBhdXRob3JpemVkXHJcblxyXG4gIHJlbmRlcjogLT5cclxuICAgIGlmIEBzdGF0ZS5hdXRob3JpemVkXHJcbiAgICAgIEByZW5kZXJXaGVuQXV0aG9yaXplZCgpXHJcbiAgICBlbHNlXHJcbiAgICAgIEBwcm9wcy5wcm92aWRlci5yZW5kZXJBdXRob3JpemF0aW9uRGlhbG9nKClcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQXV0aG9yaXplTWl4aW5cclxuIiwie2RpdiwgaW5wdXQsIGEsIGJ1dHRvbn0gPSBSZWFjdC5ET01cclxuXHJcbk1vZGFsRGlhbG9nID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL21vZGFsLWRpYWxvZy12aWV3J1xyXG5cclxudHIgPSByZXF1aXJlICcuLi91dGlscy90cmFuc2xhdGUnXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzXHJcblxyXG4gIGRpc3BsYXlOYW1lOiAnRG93bmxvYWREaWFsb2dWaWV3J1xyXG5cclxuICBnZXRJbml0aWFsU3RhdGU6IC0+XHJcbiAgICBmaWxlbmFtZSA9IEBwcm9wcy5maWxlbmFtZSBvciAnJ1xyXG4gICAgc3RhdGUgPVxyXG4gICAgICBmaWxlbmFtZTogZmlsZW5hbWVcclxuICAgICAgdHJpbW1lZEZpbGVuYW1lOiBAdHJpbSBmaWxlbmFtZVxyXG5cclxuICBjb21wb25lbnREaWRNb3VudDogLT5cclxuICAgIEBmaWxlbmFtZSA9IFJlYWN0LmZpbmRET01Ob2RlIEByZWZzLmZpbGVuYW1lXHJcbiAgICBAZmlsZW5hbWUuZm9jdXMoKVxyXG5cclxuICB1cGRhdGVGaWxlbmFtZTogLT5cclxuICAgIGZpbGVuYW1lID0gQGZpbGVuYW1lLnZhbHVlXHJcbiAgICBAc2V0U3RhdGVcclxuICAgICAgZmlsZW5hbWU6IGZpbGVuYW1lXHJcbiAgICAgIHRyaW1tZWRGaWxlbmFtZTogQHRyaW0gZmlsZW5hbWVcclxuXHJcbiAgdHJpbTogKHMpIC0+XHJcbiAgICBzLnJlcGxhY2UgL15cXHMrfFxccyskLywgJydcclxuXHJcbiAgZG93bmxvYWQ6IChlKSAtPlxyXG4gICAgaWYgQHN0YXRlLnRyaW1tZWRGaWxlbmFtZS5sZW5ndGggPiAwXHJcbiAgICAgIGUudGFyZ2V0LnNldEF0dHJpYnV0ZSAnaHJlZicsIFwiZGF0YTp0ZXh0L3BsYWluLCN7ZW5jb2RlVVJJQ29tcG9uZW50KEBwcm9wcy5jb250ZW50KX1cIlxyXG4gICAgICBAcHJvcHMuY2xvc2UoKVxyXG4gICAgZWxzZVxyXG4gICAgICBlLnByZXZlbnREZWZhdWx0KClcclxuICAgICAgQGZpbGVuYW1lLmZvY3VzKClcclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgKE1vZGFsRGlhbG9nIHt0aXRsZTogKHRyICd+RElBTE9HLkRPV05MT0FEJyksIGNsb3NlOiBAcHJvcHMuY2xvc2V9LFxyXG4gICAgICAoZGl2IHtjbGFzc05hbWU6ICdkb3dubG9hZC1kaWFsb2cnfSxcclxuICAgICAgICAoaW5wdXQge3JlZjogJ2ZpbGVuYW1lJywgcGxhY2Vob2xkZXI6ICdGaWxlbmFtZScsIHZhbHVlOiBAc3RhdGUuZmlsZW5hbWUsIG9uQ2hhbmdlOiBAdXBkYXRlRmlsZW5hbWV9KVxyXG4gICAgICAgIChkaXYge2NsYXNzTmFtZTogJ2J1dHRvbnMnfSxcclxuICAgICAgICAgIChhIHtocmVmOiAnIycsIGNsYXNzTmFtZTogKGlmIEBzdGF0ZS50cmltbWVkRmlsZW5hbWUubGVuZ3RoIGlzIDAgdGhlbiAnZGlzYWJsZWQnIGVsc2UgJycpLCBkb3dubG9hZDogQHN0YXRlLnRyaW1tZWRGaWxlbmFtZSwgb25DbGljazogQGRvd25sb2FkfSwgdHIgJ35ET1dOTE9BRF9ESUFMT0cuRE9XTkxPQUQnKVxyXG4gICAgICAgICAgKGJ1dHRvbiB7b25DbGljazogQHByb3BzLmNsb3NlfSwgdHIgJ35ET1dOTE9BRF9ESUFMT0cuQ0FOQ0VMJylcclxuICAgICAgICApXHJcbiAgICAgIClcclxuICAgIClcclxuIiwie2RpdiwgaSwgc3BhbiwgdWwsIGxpfSA9IFJlYWN0LkRPTVxyXG5cclxuRHJvcGRvd25JdGVtID0gUmVhY3QuY3JlYXRlRmFjdG9yeSBSZWFjdC5jcmVhdGVDbGFzc1xyXG5cclxuICBkaXNwbGF5TmFtZTogJ0Ryb3Bkb3duSXRlbSdcclxuXHJcbiAgY2xpY2tlZDogLT5cclxuICAgIEBwcm9wcy5zZWxlY3QgQHByb3BzLml0ZW1cclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgZW5hYmxlZCA9IGlmIEBwcm9wcy5pdGVtLmhhc093blByb3BlcnR5ICdlbmFibGVkJ1xyXG4gICAgICBpZiB0eXBlb2YgQHByb3BzLml0ZW0uZW5hYmxlZCBpcyAnZnVuY3Rpb24nXHJcbiAgICAgICAgQHByb3BzLml0ZW0uZW5hYmxlZCgpXHJcbiAgICAgIGVsc2VcclxuICAgICAgICBAcHJvcHMuaXRlbS5lbmFibGVkXHJcbiAgICBlbHNlXHJcbiAgICAgIHRydWVcclxuICAgIGRpc2FibGVkID0gbm90IGVuYWJsZWQgb3IgKEBwcm9wcy5pc0FjdGlvbk1lbnUgYW5kIG5vdCBAcHJvcHMuaXRlbS5hY3Rpb24pXHJcblxyXG4gICAgY2xhc3NOYW1lID0gXCJtZW51SXRlbSAje2lmIGRpc2FibGVkIHRoZW4gJ2Rpc2FibGVkJyBlbHNlICcnfVwiXHJcbiAgICBuYW1lID0gQHByb3BzLml0ZW0ubmFtZSBvciBAcHJvcHMuaXRlbVxyXG4gICAgKGxpIHtjbGFzc05hbWU6IGNsYXNzTmFtZSwgb25DbGljazogQGNsaWNrZWQgfSwgbmFtZSlcclxuXHJcbkRyb3BEb3duID0gUmVhY3QuY3JlYXRlQ2xhc3NcclxuXHJcbiAgZGlzcGxheU5hbWU6ICdEcm9wZG93bidcclxuXHJcbiAgZ2V0RGVmYXVsdFByb3BzOiAtPlxyXG4gICAgaXNBY3Rpb25NZW51OiB0cnVlICAgICAgICAgICAgICAjIFdoZXRoZXIgZWFjaCBpdGVtIGNvbnRhaW5zIGl0cyBvd24gYWN0aW9uXHJcbiAgICBvblNlbGVjdDogKGl0ZW0pIC0+ICAgICAgICAgICAgICMgSWYgbm90LCBAcHJvcHMub25TZWxlY3QgaXMgY2FsbGVkXHJcbiAgICAgIGxvZy5pbmZvIFwiU2VsZWN0ZWQgI3tpdGVtfVwiXHJcblxyXG4gIGdldEluaXRpYWxTdGF0ZTogLT5cclxuICAgIHNob3dpbmdNZW51OiBmYWxzZVxyXG4gICAgdGltZW91dDogbnVsbFxyXG5cclxuICBibHVyOiAtPlxyXG4gICAgQHVuYmx1cigpXHJcbiAgICB0aW1lb3V0ID0gc2V0VGltZW91dCAoID0+IEBzZXRTdGF0ZSB7c2hvd2luZ01lbnU6IGZhbHNlfSApLCA1MDBcclxuICAgIEBzZXRTdGF0ZSB7dGltZW91dDogdGltZW91dH1cclxuXHJcbiAgdW5ibHVyOiAtPlxyXG4gICAgaWYgQHN0YXRlLnRpbWVvdXRcclxuICAgICAgY2xlYXJUaW1lb3V0KEBzdGF0ZS50aW1lb3V0KVxyXG4gICAgQHNldFN0YXRlIHt0aW1lb3V0OiBudWxsfVxyXG5cclxuICBzZWxlY3Q6IChpdGVtKSAtPlxyXG4gICAgbmV4dFN0YXRlID0gKG5vdCBAc3RhdGUuc2hvd2luZ01lbnUpXHJcbiAgICBAc2V0U3RhdGUge3Nob3dpbmdNZW51OiBuZXh0U3RhdGV9XHJcbiAgICByZXR1cm4gdW5sZXNzIGl0ZW1cclxuICAgIGlmIEBwcm9wcy5pc0FjdGlvbk1lbnUgYW5kIGl0ZW0uYWN0aW9uXHJcbiAgICAgIGl0ZW0uYWN0aW9uKClcclxuICAgIGVsc2VcclxuICAgICAgQHByb3BzLm9uU2VsZWN0IGl0ZW1cclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgbWVudUNsYXNzID0gaWYgQHN0YXRlLnNob3dpbmdNZW51IHRoZW4gJ21lbnUtc2hvd2luZycgZWxzZSAnbWVudS1oaWRkZW4nXHJcbiAgICBzZWxlY3QgPSAoaXRlbSkgPT5cclxuICAgICAgKCA9PiBAc2VsZWN0KGl0ZW0pKVxyXG4gICAgKGRpdiB7Y2xhc3NOYW1lOiAnbWVudSd9LFxyXG4gICAgICAoc3BhbiB7Y2xhc3NOYW1lOiAnbWVudS1hbmNob3InLCBvbkNsaWNrOiA9PiBAc2VsZWN0KG51bGwpfSxcclxuICAgICAgICBAcHJvcHMuYW5jaG9yXHJcbiAgICAgICAgKGkge2NsYXNzTmFtZTogJ2ljb24tYXJyb3ctZXhwYW5kJ30pXHJcbiAgICAgIClcclxuICAgICAgaWYgQHByb3BzLml0ZW1zPy5sZW5ndGggPiAwXHJcbiAgICAgICAgKGRpdiB7Y2xhc3NOYW1lOiBtZW51Q2xhc3MsIG9uTW91c2VMZWF2ZTogQGJsdXIsIG9uTW91c2VFbnRlcjogQHVuYmx1cn0sXHJcbiAgICAgICAgICAodWwge30sXHJcbiAgICAgICAgICAgIChEcm9wZG93bkl0ZW0ge2tleTogaXRlbS5uYW1lIG9yIGl0ZW0sIGl0ZW06IGl0ZW0sIHNlbGVjdDogQHNlbGVjdCwgaXNBY3Rpb25NZW51OiBAcHJvcHMuaXNBY3Rpb25NZW51fSkgZm9yIGl0ZW0gaW4gQHByb3BzLml0ZW1zXHJcbiAgICAgICAgICApXHJcbiAgICAgICAgKVxyXG4gICAgKVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBEcm9wRG93blxyXG4iLCJBdXRob3JpemVNaXhpbiA9IHJlcXVpcmUgJy4vYXV0aG9yaXplLW1peGluJ1xyXG5DbG91ZE1ldGFkYXRhID0gKHJlcXVpcmUgJy4uL3Byb3ZpZGVycy9wcm92aWRlci1pbnRlcmZhY2UnKS5DbG91ZE1ldGFkYXRhXHJcblxyXG50ciA9IHJlcXVpcmUgJy4uL3V0aWxzL3RyYW5zbGF0ZSdcclxuXHJcbntkaXYsIGltZywgaSwgc3BhbiwgaW5wdXQsIGJ1dHRvbn0gPSBSZWFjdC5ET01cclxuXHJcbkZpbGVMaXN0RmlsZSA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgUmVhY3QuY3JlYXRlQ2xhc3NcclxuICBkaXNwbGF5TmFtZTogJ0ZpbGVMaXN0RmlsZSdcclxuXHJcbiAgY29tcG9uZW50V2lsbE1vdW50OiAtPlxyXG4gICAgQGxhc3RDbGljayA9IDBcclxuXHJcbiAgZmlsZVNlbGVjdGVkOiAgKGUpIC0+XHJcbiAgICBlLnByZXZlbnREZWZhdWx0KClcclxuICAgIGUuc3RvcFByb3BhZ2F0aW9uKClcclxuICAgIG5vdyA9IChuZXcgRGF0ZSgpKS5nZXRUaW1lKClcclxuICAgIEBwcm9wcy5maWxlU2VsZWN0ZWQgQHByb3BzLm1ldGFkYXRhXHJcbiAgICBpZiBub3cgLSBAbGFzdENsaWNrIDw9IDI1MFxyXG4gICAgICBAcHJvcHMuZmlsZUNvbmZpcm1lZCgpXHJcbiAgICBAbGFzdENsaWNrID0gbm93XHJcblxyXG4gIHJlbmRlcjogLT5cclxuICAgIChkaXYge2tleTogQHByb3BzLmtleSwgY2xhc3NOYW1lOiAoaWYgQHByb3BzLnNlbGVjdGVkIHRoZW4gJ3NlbGVjdGVkJyBlbHNlICcnKSwgb25DbGljazogQGZpbGVTZWxlY3RlZH0sIEBwcm9wcy5tZXRhZGF0YS5uYW1lKVxyXG5cclxuRmlsZUxpc3QgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IFJlYWN0LmNyZWF0ZUNsYXNzXHJcbiAgZGlzcGxheU5hbWU6ICdGaWxlTGlzdCdcclxuXHJcbiAgZ2V0SW5pdGlhbFN0YXRlOiAtPlxyXG4gICAgbG9hZGluZzogdHJ1ZVxyXG5cclxuICBjb21wb25lbnREaWRNb3VudDogLT5cclxuICAgIEBsb2FkKClcclxuXHJcbiAgbG9hZDogLT5cclxuICAgIEBwcm9wcy5wcm92aWRlci5saXN0IEBwcm9wcy5mb2xkZXIsIChlcnIsIGxpc3QpID0+XHJcbiAgICAgIHJldHVybiBhbGVydChlcnIpIGlmIGVyclxyXG4gICAgICBAc2V0U3RhdGVcclxuICAgICAgICBsb2FkaW5nOiBmYWxzZVxyXG4gICAgICBAcHJvcHMubGlzdExvYWRlZCBsaXN0XHJcblxyXG4gIHJlbmRlcjogLT5cclxuICAgIChkaXYge2NsYXNzTmFtZTogJ2ZpbGVsaXN0J30sXHJcbiAgICAgIGlmIEBzdGF0ZS5sb2FkaW5nXHJcbiAgICAgICAgdHIgXCJ+RklMRV9ESUFMT0cuTE9BRElOR1wiXHJcbiAgICAgIGVsc2VcclxuICAgICAgICBmb3IgbWV0YWRhdGEsIGkgaW4gQHByb3BzLmxpc3RcclxuICAgICAgICAgIChGaWxlTGlzdEZpbGUge2tleTogaSwgbWV0YWRhdGE6IG1ldGFkYXRhLCBzZWxlY3RlZDogQHByb3BzLnNlbGVjdGVkRmlsZSBpcyBtZXRhZGF0YSwgZmlsZVNlbGVjdGVkOiBAcHJvcHMuZmlsZVNlbGVjdGVkLCBmaWxlQ29uZmlybWVkOiBAcHJvcHMuZmlsZUNvbmZpcm1lZH0pXHJcbiAgICApXHJcblxyXG5GaWxlRGlhbG9nVGFiID0gUmVhY3QuY3JlYXRlQ2xhc3NcclxuICBkaXNwbGF5TmFtZTogJ0ZpbGVEaWFsb2dUYWInXHJcblxyXG4gIG1peGluczogW0F1dGhvcml6ZU1peGluXVxyXG5cclxuICBnZXRJbml0aWFsU3RhdGU6IC0+XHJcbiAgICBmb2xkZXI6IEBwcm9wcy5jbGllbnQuc3RhdGUubWV0YWRhdGE/LnBhcmVudCBvciBudWxsXHJcbiAgICBtZXRhZGF0YTogQHByb3BzLmNsaWVudC5zdGF0ZS5tZXRhZGF0YVxyXG4gICAgZmlsZW5hbWU6IEBwcm9wcy5jbGllbnQuc3RhdGUubWV0YWRhdGE/Lm5hbWUgb3IgJydcclxuICAgIGxpc3Q6IFtdXHJcblxyXG4gIGNvbXBvbmVudFdpbGxNb3VudDogLT5cclxuICAgIEBpc09wZW4gPSBAcHJvcHMuZGlhbG9nLmFjdGlvbiBpcyAnb3BlbkZpbGUnXHJcblxyXG4gIGZpbGVuYW1lQ2hhbmdlZDogKGUpIC0+XHJcbiAgICBmaWxlbmFtZSA9IGUudGFyZ2V0LnZhbHVlXHJcbiAgICBtZXRhZGF0YSA9IEBmaW5kTWV0YWRhdGEgZmlsZW5hbWVcclxuICAgIEBzZXRTdGF0ZVxyXG4gICAgICBmaWxlbmFtZTogZmlsZW5hbWVcclxuICAgICAgbWV0YWRhdGE6IG1ldGFkYXRhXHJcblxyXG4gIGxpc3RMb2FkZWQ6IChsaXN0KSAtPlxyXG4gICAgQHNldFN0YXRlIGxpc3Q6IGxpc3RcclxuXHJcbiAgZmlsZVNlbGVjdGVkOiAobWV0YWRhdGEpIC0+XHJcbiAgICBpZiBtZXRhZGF0YT8udHlwZSBpcyBDbG91ZE1ldGFkYXRhLkZpbGVcclxuICAgICAgQHNldFN0YXRlIGZpbGVuYW1lOiBtZXRhZGF0YS5uYW1lXHJcbiAgICBAc2V0U3RhdGUgbWV0YWRhdGE6IG1ldGFkYXRhXHJcblxyXG4gIGNvbmZpcm06IC0+XHJcbiAgICBpZiBub3QgQHN0YXRlLm1ldGFkYXRhXHJcbiAgICAgIGZpbGVuYW1lID0gJC50cmltIEBzdGF0ZS5maWxlbmFtZVxyXG4gICAgICBAc3RhdGUubWV0YWRhdGEgPSBAZmluZE1ldGFkYXRhIGZpbGVuYW1lXHJcbiAgICAgIGlmIG5vdCBAc3RhdGUubWV0YWRhdGFcclxuICAgICAgICBpZiBAaXNPcGVuXHJcbiAgICAgICAgICBhbGVydCBcIiN7QHN0YXRlLmZpbGVuYW1lfSBub3QgZm91bmRcIlxyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgIEBzdGF0ZS5tZXRhZGF0YSA9IG5ldyBDbG91ZE1ldGFkYXRhXHJcbiAgICAgICAgICAgIG5hbWU6IGZpbGVuYW1lXHJcbiAgICAgICAgICAgICMgVE9ETzogRklYIFBBVEhcclxuICAgICAgICAgICAgcGF0aDogXCIvI3tmaWxlbmFtZX1cIlxyXG4gICAgICAgICAgICB0eXBlOiBDbG91ZE1ldGFkYXRhLkZpbGVcclxuICAgICAgICAgICAgcHJvdmlkZXI6IEBwcm9wcy5wcm92aWRlclxyXG4gICAgaWYgQHN0YXRlLm1ldGFkYXRhXHJcbiAgICAgICMgZW5zdXJlIHRoZSBtZXRhZGF0YSBwcm92aWRlciBpcyB0aGUgY3VycmVudGx5LXNob3dpbmcgdGFiXHJcbiAgICAgIEBzdGF0ZS5tZXRhZGF0YS5wcm92aWRlciA9IEBwcm9wcy5wcm92aWRlclxyXG4gICAgICBAcHJvcHMuZGlhbG9nLmNhbGxiYWNrIEBzdGF0ZS5tZXRhZGF0YVxyXG4gICAgICBAcHJvcHMuY2xvc2UoKVxyXG5cclxuICByZW1vdmU6IC0+XHJcbiAgICBpZiBAc3RhdGUubWV0YWRhdGEgYW5kIEBzdGF0ZS5tZXRhZGF0YS50eXBlIGlzbnQgQ2xvdWRNZXRhZGF0YS5Gb2xkZXIgYW5kIGNvbmZpcm0odHIoXCJ+RklMRV9ESUFMT0cuUkVNT1ZFX0NPTkZJUk1cIiwge2ZpbGVuYW1lOiBAc3RhdGUubWV0YWRhdGEubmFtZX0pKVxyXG4gICAgICBAcHJvcHMucHJvdmlkZXIucmVtb3ZlIEBzdGF0ZS5tZXRhZGF0YSwgKGVycikgPT5cclxuICAgICAgICBpZiBub3QgZXJyXHJcbiAgICAgICAgICBsaXN0ID0gQHN0YXRlLmxpc3Quc2xpY2UgMFxyXG4gICAgICAgICAgaW5kZXggPSBsaXN0LmluZGV4T2YgQHN0YXRlLm1ldGFkYXRhXHJcbiAgICAgICAgICBsaXN0LnNwbGljZSBpbmRleCwgMVxyXG4gICAgICAgICAgQHNldFN0YXRlXHJcbiAgICAgICAgICAgIGxpc3Q6IGxpc3RcclxuICAgICAgICAgICAgbWV0YWRhdGE6IG51bGxcclxuICAgICAgICAgICAgZmlsZW5hbWU6ICcnXHJcblxyXG4gIGNhbmNlbDogLT5cclxuICAgIEBwcm9wcy5jbG9zZSgpXHJcblxyXG4gIGZpbmRNZXRhZGF0YTogKGZpbGVuYW1lKSAtPlxyXG4gICAgZm9yIG1ldGFkYXRhIGluIEBzdGF0ZS5saXN0XHJcbiAgICAgIGlmIG1ldGFkYXRhLm5hbWUgaXMgZmlsZW5hbWVcclxuICAgICAgICByZXR1cm4gbWV0YWRhdGFcclxuICAgIG51bGxcclxuXHJcbiAgd2F0Y2hGb3JFbnRlcjogKGUpIC0+XHJcbiAgICBpZiBlLmtleUNvZGUgaXMgMTMgYW5kIG5vdCBAY29uZmlybURpc2FibGVkKClcclxuICAgICAgQGNvbmZpcm0oKVxyXG5cclxuICBjb25maXJtRGlzYWJsZWQ6IC0+XHJcbiAgICAoQHN0YXRlLmZpbGVuYW1lLmxlbmd0aCBpcyAwKSBvciAoQGlzT3BlbiBhbmQgbm90IEBzdGF0ZS5tZXRhZGF0YSlcclxuXHJcbiAgcmVuZGVyV2hlbkF1dGhvcml6ZWQ6IC0+XHJcbiAgICBjb25maXJtRGlzYWJsZWQgPSBAY29uZmlybURpc2FibGVkKClcclxuICAgIHJlbW92ZURpc2FibGVkID0gKEBzdGF0ZS5tZXRhZGF0YSBpcyBudWxsKSBvciAoQHN0YXRlLm1ldGFkYXRhLnR5cGUgaXMgQ2xvdWRNZXRhZGF0YS5Gb2xkZXIpXHJcblxyXG4gICAgKGRpdiB7Y2xhc3NOYW1lOiAnZGlhbG9nVGFiJ30sXHJcbiAgICAgIChpbnB1dCB7dHlwZTogJ3RleHQnLCB2YWx1ZTogQHN0YXRlLmZpbGVuYW1lLCBwbGFjZWhvbGRlcjogKHRyIFwifkZJTEVfRElBTE9HLkZJTEVOQU1FXCIpLCBvbkNoYW5nZTogQGZpbGVuYW1lQ2hhbmdlZCwgb25LZXlEb3duOiBAd2F0Y2hGb3JFbnRlcn0pXHJcbiAgICAgIChGaWxlTGlzdCB7cHJvdmlkZXI6IEBwcm9wcy5wcm92aWRlciwgZm9sZGVyOiBAc3RhdGUuZm9sZGVyLCBzZWxlY3RlZEZpbGU6IEBzdGF0ZS5tZXRhZGF0YSwgZmlsZVNlbGVjdGVkOiBAZmlsZVNlbGVjdGVkLCBmaWxlQ29uZmlybWVkOiBAY29uZmlybSwgbGlzdDogQHN0YXRlLmxpc3QsIGxpc3RMb2FkZWQ6IEBsaXN0TG9hZGVkfSlcclxuICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnYnV0dG9ucyd9LFxyXG4gICAgICAgIChidXR0b24ge29uQ2xpY2s6IEBjb25maXJtLCBkaXNhYmxlZDogY29uZmlybURpc2FibGVkLCBjbGFzc05hbWU6IGlmIGNvbmZpcm1EaXNhYmxlZCB0aGVuICdkaXNhYmxlZCcgZWxzZSAnJ30sIGlmIEBpc09wZW4gdGhlbiAodHIgXCJ+RklMRV9ESUFMT0cuT1BFTlwiKSBlbHNlICh0ciBcIn5GSUxFX0RJQUxPRy5TQVZFXCIpKVxyXG4gICAgICAgIGlmIEBwcm9wcy5wcm92aWRlci5jYW4gJ3JlbW92ZSdcclxuICAgICAgICAgIChidXR0b24ge29uQ2xpY2s6IEByZW1vdmUsIGRpc2FibGVkOiByZW1vdmVEaXNhYmxlZCwgY2xhc3NOYW1lOiBpZiByZW1vdmVEaXNhYmxlZCB0aGVuICdkaXNhYmxlZCcgZWxzZSAnJ30sICh0ciBcIn5GSUxFX0RJQUxPRy5SRU1PVkVcIikpXHJcbiAgICAgICAgKGJ1dHRvbiB7b25DbGljazogQGNhbmNlbH0sICh0ciBcIn5GSUxFX0RJQUxPRy5DQU5DRUxcIikpXHJcbiAgICAgIClcclxuICAgIClcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gRmlsZURpYWxvZ1RhYlxyXG4iLCJ7ZGl2LCBpLCBzcGFufSA9IFJlYWN0LkRPTVxyXG5cclxuRHJvcGRvd24gPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vZHJvcGRvd24tdmlldydcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3NcclxuXHJcbiAgZGlzcGxheU5hbWU6ICdNZW51QmFyJ1xyXG5cclxuICBoZWxwOiAtPlxyXG4gICAgd2luZG93Lm9wZW4gQHByb3BzLm9wdGlvbnMuaGVscCwgJ19ibGFuaydcclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgKGRpdiB7Y2xhc3NOYW1lOiAnbWVudS1iYXInfSxcclxuICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnbWVudS1iYXItbGVmdCd9LFxyXG4gICAgICAgIChEcm9wZG93biB7XHJcbiAgICAgICAgICBhbmNob3I6IEBwcm9wcy5maWxlbmFtZVxyXG4gICAgICAgICAgaXRlbXM6IEBwcm9wcy5pdGVtc1xyXG4gICAgICAgICAgY2xhc3NOYW1lOidtZW51LWJhci1jb250ZW50LWZpbGVuYW1lJ30pXHJcbiAgICAgICAgaWYgQHByb3BzLmZpbGVTdGF0dXNcclxuICAgICAgICAgIChzcGFuIHtjbGFzc05hbWU6IFwibWVudS1iYXItZmlsZS1zdGF0dXMtI3tAcHJvcHMuZmlsZVN0YXR1cy50eXBlfVwifSwgQHByb3BzLmZpbGVTdGF0dXMubWVzc2FnZSlcclxuICAgICAgKVxyXG4gICAgICAoZGl2IHtjbGFzc05hbWU6ICdtZW51LWJhci1yaWdodCd9LFxyXG4gICAgICAgIGlmIEBwcm9wcy5vcHRpb25zLmluZm9cclxuICAgICAgICAgIChzcGFuIHtjbGFzc05hbWU6ICdtZW51LWJhci1pbmZvJ30sIEBwcm9wcy5vcHRpb25zLmluZm8pXHJcbiAgICAgICAgaWYgQHByb3BzLnByb3ZpZGVyIGFuZCBAcHJvcHMucHJvdmlkZXIuYXV0aG9yaXplZCgpXHJcbiAgICAgICAgICBAcHJvcHMucHJvdmlkZXIucmVuZGVyVXNlcigpXHJcbiAgICAgICAgaWYgQHByb3BzLm9wdGlvbnMuaGVscFxyXG4gICAgICAgICAgKGkge3N0eWxlOiB7Zm9udFNpemU6IFwiMTNweFwifSwgY2xhc3NOYW1lOiAnY2xpY2thYmxlIGljb24taGVscCcsIG9uQ2xpY2s6IEBoZWxwfSlcclxuICAgICAgKVxyXG4gICAgKVxyXG4iLCJNb2RhbCA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9tb2RhbC12aWV3J1xyXG57ZGl2LCBpfSA9IFJlYWN0LkRPTVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzc1xyXG5cclxuICBkaXNwbGF5TmFtZTogJ01vZGFsRGlhbG9nJ1xyXG5cclxuICBjbG9zZTogLT5cclxuICAgIEBwcm9wcy5jbG9zZT8oKVxyXG5cclxuICByZW5kZXI6IC0+XHJcbiAgICAoTW9kYWwge2Nsb3NlOiBAcHJvcHMuY2xvc2V9LFxyXG4gICAgICAoZGl2IHtjbGFzc05hbWU6ICdtb2RhbC1kaWFsb2cnfSxcclxuICAgICAgICAoZGl2IHtjbGFzc05hbWU6ICdtb2RhbC1kaWFsb2ctd3JhcHBlcid9LFxyXG4gICAgICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnbW9kYWwtZGlhbG9nLXRpdGxlJ30sXHJcbiAgICAgICAgICAgIChpIHtjbGFzc05hbWU6IFwibW9kYWwtZGlhbG9nLXRpdGxlLWNsb3NlIGljb24tZXhcIiwgb25DbGljazogQGNsb3NlfSlcclxuICAgICAgICAgICAgQHByb3BzLnRpdGxlIG9yICdVbnRpdGxlZCBEaWFsb2cnXHJcbiAgICAgICAgICApXHJcbiAgICAgICAgICAoZGl2IHtjbGFzc05hbWU6ICdtb2RhbC1kaWFsb2ctd29ya3NwYWNlJ30sIEBwcm9wcy5jaGlsZHJlbilcclxuICAgICAgICApXHJcbiAgICAgIClcclxuICAgIClcclxuIiwiTW9kYWxEaWFsb2cgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vbW9kYWwtZGlhbG9nLXZpZXcnXHJcblRhYmJlZFBhbmVsID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL3RhYmJlZC1wYW5lbC12aWV3J1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzc1xyXG5cclxuICBkaXNwbGF5TmFtZTogJ01vZGFsVGFiYmVkRGlhbG9nVmlldydcclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgKE1vZGFsRGlhbG9nIHt0aXRsZTogQHByb3BzLnRpdGxlLCBjbG9zZTogQHByb3BzLmNsb3NlfSxcclxuICAgICAgKFRhYmJlZFBhbmVsIHt0YWJzOiBAcHJvcHMudGFicywgc2VsZWN0ZWRUYWJJbmRleDogQHByb3BzLnNlbGVjdGVkVGFiSW5kZXh9KVxyXG4gICAgKVxyXG4iLCJ7ZGl2fSA9IFJlYWN0LkRPTVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzc1xyXG5cclxuICBkaXNwbGF5TmFtZTogJ01vZGFsJ1xyXG5cclxuICB3YXRjaEZvckVzY2FwZTogKGUpIC0+XHJcbiAgICBpZiBlLmtleUNvZGUgaXMgMjdcclxuICAgICAgQHByb3BzLmNsb3NlPygpXHJcblxyXG4gIGNvbXBvbmVudERpZE1vdW50OiAtPlxyXG4gICAgJCh3aW5kb3cpLm9uICdrZXl1cCcsIEB3YXRjaEZvckVzY2FwZVxyXG5cclxuICBjb21wb25lbnRXaWxsVW5tb3VudDogLT5cclxuICAgICQod2luZG93KS5vZmYgJ2tleXVwJywgQHdhdGNoRm9yRXNjYXBlXHJcblxyXG4gIHJlbmRlcjogLT5cclxuICAgIChkaXYge2NsYXNzTmFtZTogJ21vZGFsJ30sXHJcbiAgICAgIChkaXYge2NsYXNzTmFtZTogJ21vZGFsLWJhY2tncm91bmQnfSlcclxuICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnbW9kYWwtY29udGVudCd9LCBAcHJvcHMuY2hpbGRyZW4pXHJcbiAgICApXHJcbiIsIk1vZGFsVGFiYmVkRGlhbG9nID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL21vZGFsLXRhYmJlZC1kaWFsb2ctdmlldydcclxuVGFiYmVkUGFuZWwgPSByZXF1aXJlICcuL3RhYmJlZC1wYW5lbC12aWV3J1xyXG5DbG91ZE1ldGFkYXRhID0gKHJlcXVpcmUgJy4uL3Byb3ZpZGVycy9wcm92aWRlci1pbnRlcmZhY2UnKS5DbG91ZE1ldGFkYXRhXHJcbkZpbGVEaWFsb2dUYWIgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vZmlsZS1kaWFsb2ctdGFiLXZpZXcnXHJcblNlbGVjdFByb3ZpZGVyRGlhbG9nVGFiID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL3NlbGVjdC1wcm92aWRlci1kaWFsb2ctdGFiLXZpZXcnXHJcblxyXG50ciA9IHJlcXVpcmUgJy4uL3V0aWxzL3RyYW5zbGF0ZSdcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3NcclxuICBkaXNwbGF5TmFtZTogJ1Byb3ZpZGVyVGFiYmVkRGlhbG9nJ1xyXG5cclxuICByZW5kZXI6ICAtPlxyXG4gICAgW2NhcGFiaWxpdHksIFRhYkNvbXBvbmVudF0gPSBzd2l0Y2ggQHByb3BzLmRpYWxvZy5hY3Rpb25cclxuICAgICAgd2hlbiAnb3BlbkZpbGUnIHRoZW4gWydsaXN0JywgRmlsZURpYWxvZ1RhYl1cclxuICAgICAgd2hlbiAnc2F2ZUZpbGUnLCAnc2F2ZUZpbGVBcycgdGhlbiBbJ3NhdmUnLCBGaWxlRGlhbG9nVGFiXVxyXG4gICAgICB3aGVuICdzZWxlY3RQcm92aWRlcicgdGhlbiBbbnVsbCwgU2VsZWN0UHJvdmlkZXJEaWFsb2dUYWJdXHJcblxyXG4gICAgdGFicyA9IFtdXHJcbiAgICBzZWxlY3RlZFRhYkluZGV4ID0gMFxyXG4gICAgZm9yIHByb3ZpZGVyLCBpIGluIEBwcm9wcy5jbGllbnQuc3RhdGUuYXZhaWxhYmxlUHJvdmlkZXJzXHJcbiAgICAgIGlmIG5vdCBjYXBhYmlsaXR5IG9yIHByb3ZpZGVyLmNhcGFiaWxpdGllc1tjYXBhYmlsaXR5XVxyXG4gICAgICAgIGNvbXBvbmVudCA9IFRhYkNvbXBvbmVudFxyXG4gICAgICAgICAgY2xpZW50OiBAcHJvcHMuY2xpZW50XHJcbiAgICAgICAgICBkaWFsb2c6IEBwcm9wcy5kaWFsb2dcclxuICAgICAgICAgIGNsb3NlOiBAcHJvcHMuY2xvc2VcclxuICAgICAgICAgIHByb3ZpZGVyOiBwcm92aWRlclxyXG4gICAgICAgIHRhYnMucHVzaCBUYWJiZWRQYW5lbC5UYWIge2tleTogaSwgbGFiZWw6ICh0ciBwcm92aWRlci5kaXNwbGF5TmFtZSksIGNvbXBvbmVudDogY29tcG9uZW50fVxyXG4gICAgICAgIGlmIHByb3ZpZGVyIGlzIEBwcm9wcy5jbGllbnQuc3RhdGUubWV0YWRhdGE/LnByb3ZpZGVyXHJcbiAgICAgICAgICBzZWxlY3RlZFRhYkluZGV4ID0gaVxyXG5cclxuICAgIChNb2RhbFRhYmJlZERpYWxvZyB7dGl0bGU6ICh0ciBAcHJvcHMuZGlhbG9nLnRpdGxlKSwgY2xvc2U6IEBwcm9wcy5jbG9zZSwgdGFiczogdGFicywgc2VsZWN0ZWRUYWJJbmRleDogc2VsZWN0ZWRUYWJJbmRleH0pXHJcbiIsIntkaXYsIGlucHV0LCBhLCBidXR0b259ID0gUmVhY3QuRE9NXHJcblxyXG5Nb2RhbERpYWxvZyA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9tb2RhbC1kaWFsb2ctdmlldydcclxuXHJcbnRyID0gcmVxdWlyZSAnLi4vdXRpbHMvdHJhbnNsYXRlJ1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzc1xyXG5cclxuICBkaXNwbGF5TmFtZTogJ1JlbmFtZURpYWxvZ1ZpZXcnXHJcblxyXG4gIGdldEluaXRpYWxTdGF0ZTogLT5cclxuICAgIGZpbGVuYW1lID0gQHByb3BzLmZpbGVuYW1lIG9yICcnXHJcbiAgICBzdGF0ZSA9XHJcbiAgICAgIGZpbGVuYW1lOiBmaWxlbmFtZVxyXG4gICAgICB0cmltbWVkRmlsZW5hbWU6IEB0cmltIGZpbGVuYW1lXHJcblxyXG4gIGNvbXBvbmVudERpZE1vdW50OiAtPlxyXG4gICAgQGZpbGVuYW1lID0gUmVhY3QuZmluZERPTU5vZGUgQHJlZnMuZmlsZW5hbWVcclxuICAgIEBmaWxlbmFtZS5mb2N1cygpXHJcblxyXG4gIHVwZGF0ZUZpbGVuYW1lOiAtPlxyXG4gICAgZmlsZW5hbWUgPSBAZmlsZW5hbWUudmFsdWVcclxuICAgIEBzZXRTdGF0ZVxyXG4gICAgICBmaWxlbmFtZTogZmlsZW5hbWVcclxuICAgICAgdHJpbW1lZEZpbGVuYW1lOiBAdHJpbSBmaWxlbmFtZVxyXG5cclxuICB0cmltOiAocykgLT5cclxuICAgIHMucmVwbGFjZSAvXlxccyt8XFxzKyQvLCAnJ1xyXG5cclxuICByZW5hbWU6IChlKSAtPlxyXG4gICAgaWYgQHN0YXRlLnRyaW1tZWRGaWxlbmFtZS5sZW5ndGggPiAwXHJcbiAgICAgIEBwcm9wcy5jYWxsYmFjaz8gQHN0YXRlLmZpbGVuYW1lXHJcbiAgICAgIEBwcm9wcy5jbG9zZSgpXHJcbiAgICBlbHNlXHJcbiAgICAgIGUucHJldmVudERlZmF1bHQoKVxyXG4gICAgICBAZmlsZW5hbWUuZm9jdXMoKVxyXG5cclxuICByZW5kZXI6IC0+XHJcbiAgICAoTW9kYWxEaWFsb2cge3RpdGxlOiAodHIgJ35ESUFMT0cuRE9XTkxPQUQnKSwgY2xvc2U6IEBwcm9wcy5jbG9zZX0sXHJcbiAgICAgIChkaXYge2NsYXNzTmFtZTogJ3JlbmFtZS1kaWFsb2cnfSxcclxuICAgICAgICAoaW5wdXQge3JlZjogJ2ZpbGVuYW1lJywgcGxhY2Vob2xkZXI6ICdGaWxlbmFtZScsIHZhbHVlOiBAc3RhdGUuZmlsZW5hbWUsIG9uQ2hhbmdlOiBAdXBkYXRlRmlsZW5hbWV9KVxyXG4gICAgICAgIChkaXYge2NsYXNzTmFtZTogJ2J1dHRvbnMnfSxcclxuICAgICAgICAgIChidXR0b24ge2NsYXNzTmFtZTogKGlmIEBzdGF0ZS50cmltbWVkRmlsZW5hbWUubGVuZ3RoIGlzIDAgdGhlbiAnZGlzYWJsZWQnIGVsc2UgJycpLCBvbkNsaWNrOiBAcmVuYW1lfSwgdHIgJ35SRU5BTUVfRElBTE9HLlJFTkFNRScpXHJcbiAgICAgICAgICAoYnV0dG9uIHtvbkNsaWNrOiBAcHJvcHMuY2xvc2V9LCB0ciAnflJFTkFNRV9ESUFMT0cuQ0FOQ0VMJylcclxuICAgICAgICApXHJcbiAgICAgIClcclxuICAgIClcclxuIiwie2Rpdn0gPSBSZWFjdC5ET01cclxuXHJcblNlbGVjdFByb3ZpZGVyRGlhbG9nVGFiID0gUmVhY3QuY3JlYXRlRmFjdG9yeSBSZWFjdC5jcmVhdGVDbGFzc1xyXG4gIGRpc3BsYXlOYW1lOiAnU2VsZWN0UHJvdmlkZXJEaWFsb2dUYWInXHJcbiAgcmVuZGVyOiAtPiAoZGl2IHt9LCBcIlRPRE86IFNlbGVjdFByb3ZpZGVyRGlhbG9nVGFiOiAje0Bwcm9wcy5wcm92aWRlci5kaXNwbGF5TmFtZX1cIilcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gU2VsZWN0UHJvdmlkZXJEaWFsb2dUYWJcclxuIiwie2RpdiwgdWwsIGxpLCBhfSA9IFJlYWN0LkRPTVxyXG5cclxuY2xhc3MgVGFiSW5mb1xyXG4gIGNvbnN0cnVjdG9yOiAoc2V0dGluZ3M9e30pIC0+XHJcbiAgICB7QGxhYmVsLCBAY29tcG9uZW50fSA9IHNldHRpbmdzXHJcblxyXG5UYWIgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IFJlYWN0LmNyZWF0ZUNsYXNzXHJcblxyXG4gIGRpc3BsYXlOYW1lOiAnVGFiYmVkUGFuZWxUYWInXHJcblxyXG4gIGNsaWNrZWQ6IChlKSAtPlxyXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXHJcbiAgICBAcHJvcHMub25TZWxlY3RlZCBAcHJvcHMuaW5kZXhcclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgY2xhc3NuYW1lID0gaWYgQHByb3BzLnNlbGVjdGVkIHRoZW4gJ3RhYi1zZWxlY3RlZCcgZWxzZSAnJ1xyXG4gICAgKGxpIHtjbGFzc05hbWU6IGNsYXNzbmFtZSwgb25DbGljazogQGNsaWNrZWR9LCBAcHJvcHMubGFiZWwpXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzXHJcblxyXG4gIGRpc3BsYXlOYW1lOiAnVGFiYmVkUGFuZWxWaWV3J1xyXG5cclxuICBnZXRJbml0aWFsU3RhdGU6IC0+XHJcbiAgICBzZWxlY3RlZFRhYkluZGV4OiBAcHJvcHMuc2VsZWN0ZWRUYWJJbmRleCBvciAwXHJcblxyXG4gIHN0YXRpY3M6XHJcbiAgICBUYWI6IChzZXR0aW5ncykgLT4gbmV3IFRhYkluZm8gc2V0dGluZ3NcclxuXHJcbiAgc2VsZWN0ZWRUYWI6IChpbmRleCkgLT5cclxuICAgIEBzZXRTdGF0ZSBzZWxlY3RlZFRhYkluZGV4OiBpbmRleFxyXG5cclxuICByZW5kZXJUYWI6ICh0YWIsIGluZGV4KSAtPlxyXG4gICAgKFRhYlxyXG4gICAgICBsYWJlbDogdGFiLmxhYmVsXHJcbiAgICAgIGtleTogaW5kZXhcclxuICAgICAgaW5kZXg6IGluZGV4XHJcbiAgICAgIHNlbGVjdGVkOiAoaW5kZXggaXMgQHN0YXRlLnNlbGVjdGVkVGFiSW5kZXgpXHJcbiAgICAgIG9uU2VsZWN0ZWQ6IEBzZWxlY3RlZFRhYlxyXG4gICAgKVxyXG5cclxuICByZW5kZXJUYWJzOiAtPlxyXG4gICAgKGRpdiB7Y2xhc3NOYW1lOiAnd29ya3NwYWNlLXRhYnMnfSxcclxuICAgICAgKHVsIHtrZXk6IGluZGV4fSwgQHJlbmRlclRhYih0YWIsIGluZGV4KSBmb3IgdGFiLCBpbmRleCBpbiBAcHJvcHMudGFicylcclxuICAgIClcclxuXHJcbiAgcmVuZGVyU2VsZWN0ZWRQYW5lbDogLT5cclxuICAgIChkaXYge2NsYXNzTmFtZTogJ3dvcmtzcGFjZS10YWItY29tcG9uZW50J30sXHJcbiAgICAgIGZvciB0YWIsIGluZGV4IGluIEBwcm9wcy50YWJzXHJcbiAgICAgICAgKGRpdiB7XHJcbiAgICAgICAgICBrZXk6IGluZGV4XHJcbiAgICAgICAgICBzdHlsZTpcclxuICAgICAgICAgICAgZGlzcGxheTogaWYgaW5kZXggaXMgQHN0YXRlLnNlbGVjdGVkVGFiSW5kZXggdGhlbiAnYmxvY2snIGVsc2UgJ25vbmUnXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgdGFiLmNvbXBvbmVudFxyXG4gICAgICAgIClcclxuICAgIClcclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgKGRpdiB7a2V5OiBAcHJvcHMua2V5LCBjbGFzc05hbWU6IFwidGFiYmVkLXBhbmVsXCJ9LFxyXG4gICAgICBAcmVuZGVyVGFicygpXHJcbiAgICAgIEByZW5kZXJTZWxlY3RlZFBhbmVsKClcclxuICAgIClcclxuIl19
