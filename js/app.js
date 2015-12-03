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
      } else if (confirm(tr('~CONFIRM.NEW_FILE'))) {
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
    if ((!this.state.dirty) || (confirm(tr('~CONFIRM.OPEN_FILE')))) {
      return this._ui.openFileDialog((function(_this) {
        return function(metadata) {
          return _this.openFile(metadata, callback);
        };
      })(this));
    }
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

  CloudFileManagerClient.prototype.reopen = function(callback) {
    if (callback == null) {
      callback = null;
    }
    if (this.state.metadata) {
      return this.openFile(this.state.metadata, callback);
    }
  };

  CloudFileManagerClient.prototype.reopenDialog = function(callback) {
    if (callback == null) {
      callback = null;
    }
    if (this.state.metadata) {
      if ((!this.state.dirty) || (confirm(tr('~CONFIRM.REOPEN_FILE')))) {
        return this.openFile(this.state.metadata, callback);
      }
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
  CloudFileManagerUIMenu.DefaultMenu = ['newFileDialog', 'openFileDialog', 'reopenDialog', 'separator', 'save', 'saveFileAsDialog', 'downloadDialog', 'renameDialog'];

  function CloudFileManagerUIMenu(options, client) {
    var i, item, len, menuItem, names, ref, ref1, setAction, setEnabled;
    setAction = function(action) {
      var ref;
      return ((ref = client[action]) != null ? ref.bind(client) : void 0) || (function() {
        return alert("No " + action + " action is available in the client");
      });
    };
    setEnabled = function(action) {
      switch (action) {
        case 'reopenDialog':
          return function() {
            var ref;
            return (ref = client.state.metadata) != null ? ref.provider.can('load') : void 0;
          };
        case 'renameDialog':
          return function() {
            var ref;
            return (ref = client.state.metadata) != null ? ref.provider.can('rename') : void 0;
          };
        default:
          return true;
      }
    };
    names = {
      newFileDialog: tr("~MENU.NEW"),
      openFileDialog: tr("~MENU.OPEN"),
      reopenDialog: tr("~MENU.REOPEN"),
      save: tr("~MENU.SAVE"),
      saveFileAsDialog: tr("~MENU.SAVE_AS"),
      downloadDialog: tr("~MENU.DOWNLOAD"),
      renameDialog: tr("~MENU.RENAME")
    };
    this.items = [];
    ref = options.menu;
    for (i = 0, len = ref.length; i < len; i++) {
      item = ref[i];
      menuItem = item === 'separator' ? {
        separator: true
      } : isString(item) ? {
        name: ((ref1 = options.menuNames) != null ? ref1[item] : void 0) || names[item] || ("Unknown item: " + item),
        enabled: setEnabled(item),
        action: setAction(item)
      } : (isString(item.action) ? (item.enabled = setEnabled(item.action), item.action = setAction(item.action)) : item.enabled || (item.enabled = true), item);
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
  "~MENU.REOPEN": "Reopen",
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
  "~CONFIRM.OPEN_FILE": "You have unsaved changes.  Are you sure you want open a new file?",
  "~CONFIRM.NEW_FILE": "You have unsaved changes.  Are you sure you want a new file?",
  "~CONFIRM.REOPEN_FILE": "You have unsaved changes.  Are you sure you want reopen the file and return to its last saved state?"
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
    var classes, enabled, name;
    enabled = this.props.item.hasOwnProperty('enabled') ? typeof this.props.item.enabled === 'function' ? this.props.item.enabled() : this.props.item.enabled : true;
    classes = ['menuItem'];
    if (this.props.item.separator) {
      classes.push('separator');
      return li({
        className: classes.join(' ')
      }, '');
    } else {
      if (!enabled || (this.props.isActionMenu && !this.props.item.action)) {
        classes.push('disabled');
      }
      name = this.props.item.name || this.props.item;
      return li({
        className: classes.join(' '),
        onClick: this.clicked
      }, name);
    }
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
    var index, item, menuClass, ref1, select;
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
      for (index = j = 0, len = ref2.length; j < len; index = ++j) {
        item = ref2[index];
        results.push(DropdownItem({
          key: index,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFxhcHAuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxcY2xpZW50LmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHByb3ZpZGVyc1xcZG9jdW1lbnQtc3RvcmUtcHJvdmlkZXIuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxccHJvdmlkZXJzXFxnb29nbGUtZHJpdmUtcHJvdmlkZXIuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxccHJvdmlkZXJzXFxsb2NhbHN0b3JhZ2UtcHJvdmlkZXIuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxccHJvdmlkZXJzXFxwcm92aWRlci1pbnRlcmZhY2UuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxccHJvdmlkZXJzXFxyZWFkb25seS1wcm92aWRlci5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx1aS5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx1dGlsc1xcaXMtc3RyaW5nLmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHV0aWxzXFxsYW5nXFxlbi11cy5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx1dGlsc1xcdHJhbnNsYXRlLmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHZpZXdzXFxhcHAtdmlldy5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx2aWV3c1xcYXV0aG9yaXplLW1peGluLmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHZpZXdzXFxkb3dubG9hZC1kaWFsb2ctdmlldy5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx2aWV3c1xcZHJvcGRvd24tdmlldy5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx2aWV3c1xcZmlsZS1kaWFsb2ctdGFiLXZpZXcuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxcdmlld3NcXG1lbnUtYmFyLXZpZXcuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxcdmlld3NcXG1vZGFsLWRpYWxvZy12aWV3LmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHZpZXdzXFxtb2RhbC10YWJiZWQtZGlhbG9nLXZpZXcuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxcdmlld3NcXG1vZGFsLXZpZXcuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxcdmlld3NcXHByb3ZpZGVyLXRhYmJlZC1kaWFsb2ctdmlldy5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx2aWV3c1xccmVuYW1lLWRpYWxvZy12aWV3LmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHZpZXdzXFxzZWxlY3QtcHJvdmlkZXItZGlhbG9nLXRhYi12aWV3LmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHZpZXdzXFx0YWJiZWQtcGFuZWwtdmlldy5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQSxJQUFBOztBQUFBLE9BQUEsR0FBVSxLQUFLLENBQUMsYUFBTixDQUFvQixPQUFBLENBQVEsa0JBQVIsQ0FBcEI7O0FBRVYsc0JBQUEsR0FBeUIsQ0FBQyxPQUFBLENBQVEsTUFBUixDQUFELENBQWdCLENBQUM7O0FBQzFDLHNCQUFBLEdBQXlCLENBQUMsT0FBQSxDQUFRLFVBQVIsQ0FBRCxDQUFvQixDQUFDOztBQUV4QztFQUVTLDBCQUFDLE9BQUQ7SUFFWCxJQUFDLENBQUEsV0FBRCxHQUFlLHNCQUFzQixDQUFDO0lBRXRDLElBQUMsQ0FBQSxNQUFELEdBQWMsSUFBQSxzQkFBQSxDQUFBO0lBQ2QsSUFBQyxDQUFBLFVBQUQsR0FBYztFQUxIOzs2QkFPYixJQUFBLEdBQU0s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QUFBLEVBQVcsZ0JBQVo7S0FBSjs7QUFDRTtBQUFBO1dBQUEsc0RBQUE7O3FCQUFBLEVBQUEsQ0FBRztVQUFDLEdBQUEsRUFBSyxLQUFOO1NBQUgsRUFBaUIsSUFBQyxDQUFBLFNBQUQsQ0FBVyxHQUFYLEVBQWdCLEtBQWhCLENBQWpCO0FBQUE7O2lCQURGO0VBRFMsQ0FwQlo7RUF5QkEsbUJBQUEsRUFBcUIsU0FBQTtBQUNuQixRQUFBO1dBQUMsR0FBQSxDQUFJO01BQUMsU0FBQSxFQUFXLHlCQUFaO0tBQUo7O0FBQ0M7QUFBQTtXQUFBLHNEQUFBOztxQkFDRyxHQUFBLENBQUk7VUFDSCxHQUFBLEVBQUssS0FERjtVQUVILEtBQUEsRUFDRTtZQUFBLE9BQUEsRUFBWSxLQUFBLEtBQVMsSUFBQyxDQUFBLEtBQUssQ0FBQyxnQkFBbkIsR0FBeUMsT0FBekMsR0FBc0QsTUFBL0Q7V0FIQztTQUFKLEVBS0MsR0FBRyxDQUFDLFNBTEw7QUFESDs7aUJBREQ7RUFEa0IsQ0F6QnJCO0VBcUNBLE1BQUEsRUFBUSxTQUFBO1dBQ0wsR0FBQSxDQUFJO01BQUMsR0FBQSxFQUFLLElBQUMsQ0FBQSxLQUFLLENBQUMsR0FBYjtNQUFrQixTQUFBLEVBQVcsY0FBN0I7S0FBSixFQUNDLElBQUMsQ0FBQSxVQUFELENBQUEsQ0FERCxFQUVDLElBQUMsQ0FBQSxtQkFBRCxDQUFBLENBRkQ7RUFESyxDQXJDUjtDQUZlIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIkFwcFZpZXcgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vdmlld3MvYXBwLXZpZXcnXHJcblxyXG5DbG91ZEZpbGVNYW5hZ2VyVUlNZW51ID0gKHJlcXVpcmUgJy4vdWknKS5DbG91ZEZpbGVNYW5hZ2VyVUlNZW51XHJcbkNsb3VkRmlsZU1hbmFnZXJDbGllbnQgPSAocmVxdWlyZSAnLi9jbGllbnQnKS5DbG91ZEZpbGVNYW5hZ2VyQ2xpZW50XHJcblxyXG5jbGFzcyBDbG91ZEZpbGVNYW5hZ2VyXHJcblxyXG4gIGNvbnN0cnVjdG9yOiAob3B0aW9ucykgLT5cclxuICAgICMgc2luY2UgdGhlIG1vZHVsZSBleHBvcnRzIGFuIGluc3RhbmNlIG9mIHRoZSBjbGFzcyB3ZSBuZWVkIHRvIGZha2UgYSBjbGFzcyB2YXJpYWJsZSBhcyBhbiBpbnN0YW5jZSB2YXJpYWJsZVxyXG4gICAgQERlZmF1bHRNZW51ID0gQ2xvdWRGaWxlTWFuYWdlclVJTWVudS5EZWZhdWx0TWVudVxyXG5cclxuICAgIEBjbGllbnQgPSBuZXcgQ2xvdWRGaWxlTWFuYWdlckNsaWVudCgpXHJcbiAgICBAYXBwT3B0aW9ucyA9IHt9XHJcblxyXG4gIGluaXQ6IChAYXBwT3B0aW9ucywgdXNpbmdJZnJhbWUgPSBmYWxzZSkgLT5cclxuICAgIEBhcHBPcHRpb25zLnVzaW5nSWZyYW1lID0gdXNpbmdJZnJhbWVcclxuICAgIEBjbGllbnQuc2V0QXBwT3B0aW9ucyBAYXBwT3B0aW9uc1xyXG5cclxuICBjcmVhdGVGcmFtZTogKEBhcHBPcHRpb25zLCBlbGVtSWQpIC0+XHJcbiAgICBAaW5pdCBAYXBwT3B0aW9ucywgdHJ1ZVxyXG4gICAgQF9yZW5kZXJBcHAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoZWxlbUlkKVxyXG5cclxuICBjbGllbnRDb25uZWN0OiAoZXZlbnRDYWxsYmFjaykgLT5cclxuICAgIGlmIG5vdCBAYXBwT3B0aW9ucy51c2luZ0lmcmFtZVxyXG4gICAgICBAX2NyZWF0ZUhpZGRlbkFwcCgpXHJcbiAgICBAY2xpZW50LmNvbm5lY3QgZXZlbnRDYWxsYmFja1xyXG5cclxuICBfY3JlYXRlSGlkZGVuQXBwOiAtPlxyXG4gICAgYW5jaG9yID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKVxyXG4gICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChhbmNob3IpXHJcbiAgICBAX3JlbmRlckFwcCBhbmNob3JcclxuXHJcbiAgX3JlbmRlckFwcDogKGFuY2hvcikgLT5cclxuICAgIEBhcHBPcHRpb25zLmNsaWVudCA9IEBjbGllbnRcclxuICAgIFJlYWN0LnJlbmRlciAoQXBwVmlldyBAYXBwT3B0aW9ucyksIGFuY2hvclxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBuZXcgQ2xvdWRGaWxlTWFuYWdlcigpXHJcbiIsInRyID0gcmVxdWlyZSAnLi91dGlscy90cmFuc2xhdGUnXHJcbmlzU3RyaW5nID0gcmVxdWlyZSAnLi91dGlscy9pcy1zdHJpbmcnXHJcblxyXG5DbG91ZEZpbGVNYW5hZ2VyVUkgPSAocmVxdWlyZSAnLi91aScpLkNsb3VkRmlsZU1hbmFnZXJVSVxyXG5cclxuTG9jYWxTdG9yYWdlUHJvdmlkZXIgPSByZXF1aXJlICcuL3Byb3ZpZGVycy9sb2NhbHN0b3JhZ2UtcHJvdmlkZXInXHJcblJlYWRPbmx5UHJvdmlkZXIgPSByZXF1aXJlICcuL3Byb3ZpZGVycy9yZWFkb25seS1wcm92aWRlcidcclxuR29vZ2xlRHJpdmVQcm92aWRlciA9IHJlcXVpcmUgJy4vcHJvdmlkZXJzL2dvb2dsZS1kcml2ZS1wcm92aWRlcidcclxuRG9jdW1lbnRTdG9yZVByb3ZpZGVyID0gcmVxdWlyZSAnLi9wcm92aWRlcnMvZG9jdW1lbnQtc3RvcmUtcHJvdmlkZXInXHJcblxyXG5jbGFzcyBDbG91ZEZpbGVNYW5hZ2VyQ2xpZW50RXZlbnRcclxuXHJcbiAgY29uc3RydWN0b3I6IChAdHlwZSwgQGRhdGEgPSB7fSwgQGNhbGxiYWNrID0gbnVsbCwgQHN0YXRlID0ge30pIC0+XHJcblxyXG5jbGFzcyBDbG91ZEZpbGVNYW5hZ2VyQ2xpZW50XHJcblxyXG4gIGNvbnN0cnVjdG9yOiAob3B0aW9ucykgLT5cclxuICAgIEBzdGF0ZSA9XHJcbiAgICAgIGF2YWlsYWJsZVByb3ZpZGVyczogW11cclxuICAgIEBfcmVzZXRTdGF0ZSgpXHJcbiAgICBAX3VpID0gbmV3IENsb3VkRmlsZU1hbmFnZXJVSSBAXHJcblxyXG4gIHNldEFwcE9wdGlvbnM6IChAYXBwT3B0aW9ucyA9IHt9KS0+XHJcbiAgICAjIGZsdGVyIGZvciBhdmFpbGFibGUgcHJvdmlkZXJzXHJcbiAgICBhbGxQcm92aWRlcnMgPSB7fVxyXG4gICAgZm9yIFByb3ZpZGVyIGluIFtSZWFkT25seVByb3ZpZGVyLCBMb2NhbFN0b3JhZ2VQcm92aWRlciwgR29vZ2xlRHJpdmVQcm92aWRlciwgRG9jdW1lbnRTdG9yZVByb3ZpZGVyXVxyXG4gICAgICBpZiBQcm92aWRlci5BdmFpbGFibGUoKVxyXG4gICAgICAgIGFsbFByb3ZpZGVyc1tQcm92aWRlci5OYW1lXSA9IFByb3ZpZGVyXHJcblxyXG4gICAgIyBkZWZhdWx0IHRvIGFsbCBwcm92aWRlcnMgaWYgbm9uIHNwZWNpZmllZFxyXG4gICAgaWYgbm90IEBhcHBPcHRpb25zLnByb3ZpZGVyc1xyXG4gICAgICBAYXBwT3B0aW9ucy5wcm92aWRlcnMgPSBbXVxyXG4gICAgICBmb3Igb3duIHByb3ZpZGVyTmFtZSBvZiBhbGxQcm92aWRlcnNcclxuICAgICAgICBhcHBPcHRpb25zLnByb3ZpZGVycy5wdXNoIHByb3ZpZGVyTmFtZVxyXG5cclxuICAgICMgY2hlY2sgdGhlIHByb3ZpZGVyc1xyXG4gICAgYXZhaWxhYmxlUHJvdmlkZXJzID0gW11cclxuICAgIGZvciBwcm92aWRlciBpbiBAYXBwT3B0aW9ucy5wcm92aWRlcnNcclxuICAgICAgW3Byb3ZpZGVyTmFtZSwgcHJvdmlkZXJPcHRpb25zXSA9IGlmIGlzU3RyaW5nIHByb3ZpZGVyIHRoZW4gW3Byb3ZpZGVyLCB7fV0gZWxzZSBbcHJvdmlkZXIubmFtZSwgcHJvdmlkZXJdXHJcbiAgICAgICMgbWVyZ2UgaW4gb3RoZXIgb3B0aW9ucyBhcyBuZWVkZWRcclxuICAgICAgcHJvdmlkZXJPcHRpb25zLm1pbWVUeXBlID89IEBhcHBPcHRpb25zLm1pbWVUeXBlXHJcbiAgICAgIGlmIG5vdCBwcm92aWRlck5hbWVcclxuICAgICAgICBAX2Vycm9yIFwiSW52YWxpZCBwcm92aWRlciBzcGVjIC0gbXVzdCBlaXRoZXIgYmUgc3RyaW5nIG9yIG9iamVjdCB3aXRoIG5hbWUgcHJvcGVydHlcIlxyXG4gICAgICBlbHNlXHJcbiAgICAgICAgaWYgYWxsUHJvdmlkZXJzW3Byb3ZpZGVyTmFtZV1cclxuICAgICAgICAgIFByb3ZpZGVyID0gYWxsUHJvdmlkZXJzW3Byb3ZpZGVyTmFtZV1cclxuICAgICAgICAgIGF2YWlsYWJsZVByb3ZpZGVycy5wdXNoIG5ldyBQcm92aWRlciBwcm92aWRlck9wdGlvbnNcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICBAX2Vycm9yIFwiVW5rbm93biBwcm92aWRlcjogI3twcm92aWRlck5hbWV9XCJcclxuICAgIEBfc2V0U3RhdGUgYXZhaWxhYmxlUHJvdmlkZXJzOiBhdmFpbGFibGVQcm92aWRlcnNcclxuICAgIEBfdWkuaW5pdCBAYXBwT3B0aW9ucy51aVxyXG5cclxuICAgICMgY2hlY2sgZm9yIGF1dG9zYXZlXHJcbiAgICBpZiBvcHRpb25zLmF1dG9TYXZlSW50ZXJ2YWxcclxuICAgICAgQGF1dG9TYXZlIG9wdGlvbnMuYXV0b1NhdmVJbnRlcnZhbFxyXG5cclxuICAjIHNpbmdsZSBjbGllbnQgLSB1c2VkIGJ5IHRoZSBjbGllbnQgYXBwIHRvIHJlZ2lzdGVyIGFuZCByZWNlaXZlIGNhbGxiYWNrIGV2ZW50c1xyXG4gIGNvbm5lY3Q6IChAZXZlbnRDYWxsYmFjaykgLT5cclxuICAgIEBfZXZlbnQgJ2Nvbm5lY3RlZCcsIHtjbGllbnQ6IEB9XHJcblxyXG4gICMgc2luZ2xlIGxpc3RlbmVyIC0gdXNlZCBieSB0aGUgUmVhY3QgbWVudSB2aWEgdG8gd2F0Y2ggY2xpZW50IHN0YXRlIGNoYW5nZXNcclxuICBsaXN0ZW46IChAbGlzdGVuZXJDYWxsYmFjaykgLT5cclxuXHJcbiAgYXBwZW5kTWVudUl0ZW06IChpdGVtKSAtPlxyXG4gICAgQF91aS5hcHBlbmRNZW51SXRlbSBpdGVtXHJcblxyXG4gIHNldE1lbnVCYXJJbmZvOiAoaW5mbykgLT5cclxuICAgIEBfdWkuc2V0TWVudUJhckluZm8gaW5mb1xyXG5cclxuICBuZXdGaWxlOiAoY2FsbGJhY2sgPSBudWxsKSAtPlxyXG4gICAgQF9yZXNldFN0YXRlKClcclxuICAgIEBfZXZlbnQgJ25ld2VkRmlsZSdcclxuXHJcbiAgbmV3RmlsZURpYWxvZzogKGNhbGxiYWNrID0gbnVsbCkgLT5cclxuICAgIGlmIEBhcHBPcHRpb25zLnVpPy5uZXdGaWxlT3BlbnNJbk5ld1RhYlxyXG4gICAgICB3aW5kb3cub3BlbiB3aW5kb3cubG9jYXRpb24sICdfYmxhbmsnXHJcbiAgICBlbHNlIGlmIEBzdGF0ZS5kaXJ0eVxyXG4gICAgICBpZiBAX2F1dG9TYXZlSW50ZXJ2YWwgYW5kIEBzdGF0ZS5tZXRhZGF0YVxyXG4gICAgICAgIEBzYXZlKClcclxuICAgICAgICBAbmV3RmlsZSgpXHJcbiAgICAgIGVsc2UgaWYgY29uZmlybSB0ciAnfkNPTkZJUk0uTkVXX0ZJTEUnXHJcbiAgICAgICAgQG5ld0ZpbGUoKVxyXG4gICAgZWxzZVxyXG4gICAgICBAbmV3RmlsZSgpXHJcblxyXG4gIG9wZW5GaWxlOiAobWV0YWRhdGEsIGNhbGxiYWNrID0gbnVsbCkgLT5cclxuICAgIGlmIG1ldGFkYXRhPy5wcm92aWRlcj8uY2FuICdsb2FkJ1xyXG4gICAgICBtZXRhZGF0YS5wcm92aWRlci5sb2FkIG1ldGFkYXRhLCAoZXJyLCBjb250ZW50KSA9PlxyXG4gICAgICAgIHJldHVybiBAX2Vycm9yKGVycikgaWYgZXJyXHJcbiAgICAgICAgQF9maWxlQ2hhbmdlZCAnb3BlbmVkRmlsZScsIGNvbnRlbnQsIG1ldGFkYXRhXHJcbiAgICAgICAgY2FsbGJhY2s/IGNvbnRlbnQsIG1ldGFkYXRhXHJcbiAgICBlbHNlXHJcbiAgICAgIEBvcGVuRmlsZURpYWxvZyBjYWxsYmFja1xyXG5cclxuICBvcGVuRmlsZURpYWxvZzogKGNhbGxiYWNrID0gbnVsbCkgLT5cclxuICAgIGlmIChub3QgQHN0YXRlLmRpcnR5KSBvciAoY29uZmlybSB0ciAnfkNPTkZJUk0uT1BFTl9GSUxFJylcclxuICAgICAgQF91aS5vcGVuRmlsZURpYWxvZyAobWV0YWRhdGEpID0+XHJcbiAgICAgICAgQG9wZW5GaWxlIG1ldGFkYXRhLCBjYWxsYmFja1xyXG5cclxuICBzYXZlOiAoY2FsbGJhY2sgPSBudWxsKSAtPlxyXG4gICAgcGF0Y2hhYmxlID0gQHN0YXRlLm1ldGFkYXRhPy5vdmVyd3JpdGFibGUgYW5kIEBzdGF0ZS5tZXRhZGF0YT8ucHJvdmlkZXIuY2FuICdwYXRjaCdcclxuICAgIEBfZXZlbnQgJ2dldENvbnRlbnQnLCB7cGF0Y2hhYmxlfSwgKGNvbnRlbnQsIGlzUGF0Y2gpID0+XHJcbiAgICAgIEBzYXZlQ29udGVudCBjb250ZW50LCBpc1BhdGNoLCBjYWxsYmFja1xyXG5cclxuICBzYXZlQ29udGVudDogKGNvbnRlbnQsIGlzUGF0Y2gsIGNhbGxiYWNrID0gbnVsbCkgLT5cclxuICAgIGlmIEBzdGF0ZS5tZXRhZGF0YVxyXG4gICAgICBAc2F2ZUZpbGUgY29udGVudCwgaXNQYXRjaCwgQHN0YXRlLm1ldGFkYXRhLCBjYWxsYmFja1xyXG4gICAgZWxzZVxyXG4gICAgICBAc2F2ZUZpbGVEaWFsb2cgY29udGVudCwgY2FsbGJhY2tcclxuXHJcbiAgc2F2ZUZpbGU6IChjb250ZW50LCBpc1BhdGNoLCBtZXRhZGF0YSwgY2FsbGJhY2sgPSBudWxsKSAtPlxyXG4gICAgaWYgaXNQYXRjaCBhbmQgbWV0YWRhdGE/LnByb3ZpZGVyPy5jYW4obWV0aG9kPSdwYXRjaCcpIG9yXHJcbiAgICAgICBtZXRhZGF0YT8ucHJvdmlkZXI/LmNhbihtZXRob2Q9J3NhdmUnKVxyXG4gICAgICBAX3NldFN0YXRlXHJcbiAgICAgICAgc2F2aW5nOiBtZXRhZGF0YVxyXG4gICAgICBtZXRhZGF0YS5wcm92aWRlclttZXRob2RdIGNvbnRlbnQsIG1ldGFkYXRhLCAoZXJyKSA9PlxyXG4gICAgICAgIHJldHVybiBAX2Vycm9yKGVycikgaWYgZXJyXHJcbiAgICAgICAgQF9maWxlQ2hhbmdlZCAnc2F2ZWRGaWxlJywgY29udGVudCwgbWV0YWRhdGFcclxuICAgICAgICBjYWxsYmFjaz8gY29udGVudCwgbWV0YWRhdGFcclxuICAgIGVsc2VcclxuICAgICAgQHNhdmVGaWxlRGlhbG9nIGNvbnRlbnQsIGNhbGxiYWNrXHJcblxyXG4gIHNhdmVGaWxlRGlhbG9nOiAoY29udGVudCA9IG51bGwsIGNhbGxiYWNrID0gbnVsbCkgLT5cclxuICAgIEBfdWkuc2F2ZUZpbGVEaWFsb2cgKG1ldGFkYXRhKSA9PlxyXG4gICAgICBAX2RpYWxvZ1NhdmUgY29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrXHJcblxyXG4gIHNhdmVGaWxlQXNEaWFsb2c6IChjb250ZW50ID0gbnVsbCwgY2FsbGJhY2sgPSBudWxsKSAtPlxyXG4gICAgQF91aS5zYXZlRmlsZUFzRGlhbG9nIChtZXRhZGF0YSkgPT5cclxuICAgICAgQF9kaWFsb2dTYXZlIGNvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFja1xyXG5cclxuICBkb3dubG9hZERpYWxvZzogKGNhbGxiYWNrID0gbnVsbCkgLT5cclxuICAgIEBfZXZlbnQgJ2dldENvbnRlbnQnLCB7fSwgKGNvbnRlbnQpID0+XHJcbiAgICAgIEBfdWkuZG93bmxvYWREaWFsb2cgQHN0YXRlLm1ldGFkYXRhPy5uYW1lLCBjb250ZW50LCBjYWxsYmFja1xyXG5cclxuICByZW5hbWVEaWFsb2c6IChjYWxsYmFjayA9IG51bGwpIC0+XHJcbiAgICBpZiBAc3RhdGUubWV0YWRhdGFcclxuICAgICAgQF91aS5yZW5hbWVEaWFsb2cgQHN0YXRlLm1ldGFkYXRhLm5hbWUsIChuZXdOYW1lKSA9PlxyXG4gICAgICAgIGlmIG5ld05hbWUgaXNudCBAc3RhdGUubWV0YWRhdGEubmFtZVxyXG4gICAgICAgICAgQHN0YXRlLm1ldGFkYXRhLnByb3ZpZGVyLnJlbmFtZSBAc3RhdGUubWV0YWRhdGEsIG5ld05hbWUsIChlcnIsIG1ldGFkYXRhKSA9PlxyXG4gICAgICAgICAgICByZXR1cm4gQF9lcnJvcihlcnIpIGlmIGVyclxyXG4gICAgICAgICAgICBAX3NldFN0YXRlXHJcbiAgICAgICAgICAgICAgbWV0YWRhdGE6IG1ldGFkYXRhXHJcbiAgICAgICAgICAgIEBfZXZlbnQgJ3JlbmFtZWRGaWxlJywge21ldGFkYXRhOiBtZXRhZGF0YX1cclxuICAgICAgICAgICAgY2FsbGJhY2s/IGZpbGVuYW1lXHJcbiAgICBlbHNlXHJcbiAgICAgIGNhbGxiYWNrPyAnTm8gY3VycmVudGx5IGFjdGl2ZSBmaWxlJ1xyXG5cclxuICByZW9wZW46IChjYWxsYmFjayA9IG51bGwpIC0+XHJcbiAgICBpZiBAc3RhdGUubWV0YWRhdGFcclxuICAgICAgQG9wZW5GaWxlIEBzdGF0ZS5tZXRhZGF0YSwgY2FsbGJhY2tcclxuXHJcbiAgcmVvcGVuRGlhbG9nOiAoY2FsbGJhY2sgPSBudWxsKSAtPlxyXG4gICAgaWYgQHN0YXRlLm1ldGFkYXRhXHJcbiAgICAgIGlmIChub3QgQHN0YXRlLmRpcnR5KSBvciAoY29uZmlybSB0ciAnfkNPTkZJUk0uUkVPUEVOX0ZJTEUnKVxyXG4gICAgICAgIEBvcGVuRmlsZSBAc3RhdGUubWV0YWRhdGEsIGNhbGxiYWNrXHJcbiAgICBlbHNlXHJcbiAgICAgIGNhbGxiYWNrPyAnTm8gY3VycmVudGx5IGFjdGl2ZSBmaWxlJ1xyXG5cclxuICBkaXJ0eTogKGlzRGlydHkgPSB0cnVlKS0+XHJcbiAgICBAX3NldFN0YXRlXHJcbiAgICAgIGRpcnR5OiBpc0RpcnR5XHJcbiAgICAgIHNhdmVkOiBmYWxzZSBpZiBpc0RpcnR5XHJcblxyXG4gIGF1dG9TYXZlOiAoaW50ZXJ2YWwpIC0+XHJcbiAgICBpZiBAX2F1dG9TYXZlSW50ZXJ2YWxcclxuICAgICAgY2xlYXJJbnRlcnZhbCBAX2F1dG9TYXZlSW50ZXJ2YWxcclxuXHJcbiAgICAjIGluIGNhc2UgdGhlIGNhbGxlciB1c2VzIG1pbGxpc2Vjb25kc1xyXG4gICAgaWYgaW50ZXJ2YWwgPiAxMDAwXHJcbiAgICAgIGludGVydmFsID0gTWF0aC5yb3VuZChpbnRlcnZhbCAvIDEwMDApXHJcbiAgICBpZiBpbnRlcnZhbCA+IDBcclxuICAgICAgc2F2ZUlmRGlydHkgPSA9PlxyXG4gICAgICAgIGlmIEBzdGF0ZS5kaXJ0eSBhbmQgQHN0YXRlLm1ldGFkYXRhPy5wcm92aWRlcj8uY2FuICdzYXZlJ1xyXG4gICAgICAgICAgQHNhdmUoKVxyXG4gICAgICBAX2F1dG9TYXZlSW50ZXJ2YWwgPSBzZXRJbnRlcnZhbCBzYXZlSWZEaXJ0eSwgKGludGVydmFsICogMTAwMClcclxuXHJcbiAgaXNBdXRvU2F2aW5nOiAtPlxyXG4gICAgQF9hdXRvU2F2ZUludGVydmFsID4gMFxyXG5cclxuICBfZGlhbG9nU2F2ZTogKGNvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIGlmIGNvbnRlbnQgaXNudCBudWxsXHJcbiAgICAgIEBzYXZlRmlsZSBjb250ZW50LCBmYWxzZSwgbWV0YWRhdGEsIGNhbGxiYWNrXHJcbiAgICBlbHNlXHJcbiAgICAgIEBfZXZlbnQgJ2dldENvbnRlbnQnLCB7fSwgKGNvbnRlbnQpID0+XHJcbiAgICAgICAgQHNhdmVGaWxlIGNvbnRlbnQsIGZhbHNlLCBtZXRhZGF0YSwgY2FsbGJhY2tcclxuXHJcbiAgX2Vycm9yOiAobWVzc2FnZSkgLT5cclxuICAgICMgZm9yIG5vdyBhbiBhbGVydFxyXG4gICAgYWxlcnQgbWVzc2FnZVxyXG5cclxuICBfZmlsZUNoYW5nZWQ6ICh0eXBlLCBjb250ZW50LCBtZXRhZGF0YSkgLT5cclxuICAgIG1ldGFkYXRhLm92ZXJ3cml0YWJsZSA9IHRydWVcclxuICAgIEBfc2V0U3RhdGVcclxuICAgICAgY29udGVudDogY29udGVudFxyXG4gICAgICBtZXRhZGF0YTogbWV0YWRhdGFcclxuICAgICAgc2F2aW5nOiBudWxsXHJcbiAgICAgIHNhdmVkOiB0eXBlIGlzICdzYXZlZEZpbGUnXHJcbiAgICAgIGRpcnR5OiBmYWxzZVxyXG4gICAgQF9ldmVudCB0eXBlLCB7Y29udGVudDogY29udGVudCwgbWV0YWRhdGE6IG1ldGFkYXRhfVxyXG5cclxuICBfZXZlbnQ6ICh0eXBlLCBkYXRhID0ge30sIGV2ZW50Q2FsbGJhY2sgPSBudWxsKSAtPlxyXG4gICAgZXZlbnQgPSBuZXcgQ2xvdWRGaWxlTWFuYWdlckNsaWVudEV2ZW50IHR5cGUsIGRhdGEsIGV2ZW50Q2FsbGJhY2ssIEBzdGF0ZVxyXG4gICAgQGV2ZW50Q2FsbGJhY2s/IGV2ZW50XHJcbiAgICBAbGlzdGVuZXJDYWxsYmFjaz8gZXZlbnRcclxuXHJcbiAgX3NldFN0YXRlOiAob3B0aW9ucykgLT5cclxuICAgIGZvciBvd24ga2V5LCB2YWx1ZSBvZiBvcHRpb25zXHJcbiAgICAgIEBzdGF0ZVtrZXldID0gdmFsdWVcclxuICAgIEBfZXZlbnQgJ3N0YXRlQ2hhbmdlZCdcclxuXHJcbiAgX3Jlc2V0U3RhdGU6IC0+XHJcbiAgICBAX3NldFN0YXRlXHJcbiAgICAgIGNvbnRlbnQ6IG51bGxcclxuICAgICAgbWV0YWRhdGE6IG51bGxcclxuICAgICAgZGlydHk6IGZhbHNlXHJcbiAgICAgIHNhdmluZzogbnVsbFxyXG4gICAgICBzYXZlZDogZmFsc2VcclxuXHJcbm1vZHVsZS5leHBvcnRzID1cclxuICBDbG91ZEZpbGVNYW5hZ2VyQ2xpZW50RXZlbnQ6IENsb3VkRmlsZU1hbmFnZXJDbGllbnRFdmVudFxyXG4gIENsb3VkRmlsZU1hbmFnZXJDbGllbnQ6IENsb3VkRmlsZU1hbmFnZXJDbGllbnRcclxuIiwie2RpdiwgYnV0dG9uLCBzcGFufSA9IFJlYWN0LkRPTVxyXG5cclxuZG9jdW1lbnRTdG9yZSA9IFwiaHR0cDovL2RvY3VtZW50LXN0b3JlLmhlcm9rdWFwcC5jb21cIlxyXG5hdXRob3JpemVVcmwgICAgICA9IFwiI3tkb2N1bWVudFN0b3JlfS91c2VyL2F1dGhlbnRpY2F0ZVwiXHJcbmNoZWNrTG9naW5VcmwgICAgID0gXCIje2RvY3VtZW50U3RvcmV9L3VzZXIvaW5mb1wiXHJcbmxpc3RVcmwgICAgICAgICAgID0gXCIje2RvY3VtZW50U3RvcmV9L2RvY3VtZW50L2FsbFwiXHJcbmxvYWREb2N1bWVudFVybCAgID0gXCIje2RvY3VtZW50U3RvcmV9L2RvY3VtZW50L29wZW5cIlxyXG5zYXZlRG9jdW1lbnRVcmwgICA9IFwiI3tkb2N1bWVudFN0b3JlfS9kb2N1bWVudC9zYXZlXCJcclxucGF0Y2hEb2N1bWVudFVybCAgPSBcIiN7ZG9jdW1lbnRTdG9yZX0vZG9jdW1lbnQvcGF0Y2hcIlxyXG5yZW1vdmVEb2N1bWVudFVybCA9IFwiI3tkb2N1bWVudFN0b3JlfS9kb2N1bWVudC9kZWxldGVcIlxyXG5yZW5hbWVEb2N1bWVudFVybCA9IFwiI3tkb2N1bWVudFN0b3JlfS9kb2N1bWVudC9yZW5hbWVcIlxyXG5cclxudHIgPSByZXF1aXJlICcuLi91dGlscy90cmFuc2xhdGUnXHJcbmlzU3RyaW5nID0gcmVxdWlyZSAnLi4vdXRpbHMvaXMtc3RyaW5nJ1xyXG5cclxuUHJvdmlkZXJJbnRlcmZhY2UgPSAocmVxdWlyZSAnLi9wcm92aWRlci1pbnRlcmZhY2UnKS5Qcm92aWRlckludGVyZmFjZVxyXG5DbG91ZE1ldGFkYXRhID0gKHJlcXVpcmUgJy4vcHJvdmlkZXItaW50ZXJmYWNlJykuQ2xvdWRNZXRhZGF0YVxyXG5cclxuRG9jdW1lbnRTdG9yZUF1dGhvcml6YXRpb25EaWFsb2cgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IFJlYWN0LmNyZWF0ZUNsYXNzXHJcbiAgZGlzcGxheU5hbWU6ICdEb2N1bWVudFN0b3JlQXV0aG9yaXphdGlvbkRpYWxvZydcclxuXHJcbiAgZ2V0SW5pdGlhbFN0YXRlOiAtPlxyXG4gICAgZG9jU3RvcmVBdmFpbGFibGU6IGZhbHNlXHJcblxyXG4gIGNvbXBvbmVudFdpbGxNb3VudDogLT5cclxuICAgIEBwcm9wcy5wcm92aWRlci5fb25Eb2NTdG9yZUxvYWRlZCA9PlxyXG4gICAgICBAc2V0U3RhdGUgZG9jU3RvcmVBdmFpbGFibGU6IHRydWVcclxuXHJcbiAgYXV0aGVudGljYXRlOiAtPlxyXG4gICAgQHByb3BzLnByb3ZpZGVyLmF1dGhvcml6ZSgpXHJcblxyXG4gIHJlbmRlcjogLT5cclxuICAgIChkaXYge30sXHJcbiAgICAgIGlmIEBzdGF0ZS5kb2NTdG9yZUF2YWlsYWJsZVxyXG4gICAgICAgIChidXR0b24ge29uQ2xpY2s6IEBhdXRoZW50aWNhdGV9LCAnQXV0aG9yaXphdGlvbiBOZWVkZWQnKVxyXG4gICAgICBlbHNlXHJcbiAgICAgICAgJ1RyeWluZyB0byBsb2cgaW50byB0aGUgRG9jdW1lbnQgU3RvcmUuLi4nXHJcbiAgICApXHJcblxyXG5jbGFzcyBEb2N1bWVudFN0b3JlUHJvdmlkZXIgZXh0ZW5kcyBQcm92aWRlckludGVyZmFjZVxyXG5cclxuICBjb25zdHJ1Y3RvcjogKEBvcHRpb25zID0ge30pIC0+XHJcbiAgICBzdXBlclxyXG4gICAgICBuYW1lOiBEb2N1bWVudFN0b3JlUHJvdmlkZXIuTmFtZVxyXG4gICAgICBkaXNwbGF5TmFtZTogQG9wdGlvbnMuZGlzcGxheU5hbWUgb3IgKHRyICd+UFJPVklERVIuRE9DVU1FTlRfU1RPUkUnKVxyXG4gICAgICBjYXBhYmlsaXRpZXM6XHJcbiAgICAgICAgc2F2ZTogdHJ1ZVxyXG4gICAgICAgIGxvYWQ6IHRydWVcclxuICAgICAgICBsaXN0OiB0cnVlXHJcbiAgICAgICAgcmVtb3ZlOiB0cnVlXHJcbiAgICAgICAgcmVuYW1lOiB0cnVlXHJcbiAgICAgICAgcGF0Y2g6IHRydWVcclxuXHJcbiAgICBAdXNlciA9IG51bGxcclxuXHJcbiAgQE5hbWU6ICdkb2N1bWVudFN0b3JlJ1xyXG5cclxuICBhdXRob3JpemVkOiAoQGF1dGhDYWxsYmFjaykgLT5cclxuICAgIGlmIEBhdXRoQ2FsbGJhY2tcclxuICAgICAgaWYgQHVzZXJcclxuICAgICAgICBAYXV0aENhbGxiYWNrIHRydWVcclxuICAgICAgZWxzZVxyXG4gICAgICAgIEBfY2hlY2tMb2dpbigpXHJcbiAgICBlbHNlXHJcbiAgICAgIEB1c2VyIGlzbnQgbnVsbFxyXG5cclxuICBhdXRob3JpemU6IC0+XHJcbiAgICBAX3Nob3dMb2dpbldpbmRvdygpXHJcblxyXG4gIF9vbkRvY1N0b3JlTG9hZGVkOiAoQGRvY1N0b3JlTG9hZGVkQ2FsbGJhY2spIC0+XHJcbiAgICBpZiBAX2RvY1N0b3JlTG9hZGVkXHJcbiAgICAgIEBkb2NTdG9yZUxvYWRlZENhbGxiYWNrKClcclxuXHJcbiAgX2xvZ2luU3VjY2Vzc2Z1bDogKEB1c2VyKSAtPlxyXG4gICAgQF9sb2dpbldpbmRvdz8uY2xvc2UoKVxyXG4gICAgQGF1dGhDYWxsYmFjayB0cnVlXHJcblxyXG4gIF9jaGVja0xvZ2luOiAtPlxyXG4gICAgcHJvdmlkZXIgPSBAXHJcbiAgICAkLmFqYXhcclxuICAgICAgZGF0YVR5cGU6ICdqc29uJ1xyXG4gICAgICB1cmw6IGNoZWNrTG9naW5VcmxcclxuICAgICAgeGhyRmllbGRzOlxyXG4gICAgICAgIHdpdGhDcmVkZW50aWFsczogdHJ1ZVxyXG4gICAgICBzdWNjZXNzOiAoZGF0YSkgLT5cclxuICAgICAgICBwcm92aWRlci5kb2NTdG9yZUxvYWRlZENhbGxiYWNrKClcclxuICAgICAgICBwcm92aWRlci5fbG9naW5TdWNjZXNzZnVsKGRhdGEpXHJcbiAgICAgIGVycm9yOiAtPlxyXG4gICAgICAgIHByb3ZpZGVyLmRvY1N0b3JlTG9hZGVkQ2FsbGJhY2soKVxyXG5cclxuICBfbG9naW5XaW5kb3c6IG51bGxcclxuXHJcbiAgX3Nob3dMb2dpbldpbmRvdzogLT5cclxuICAgIGlmIEBfbG9naW5XaW5kb3cgYW5kIG5vdCBAX2xvZ2luV2luZG93LmNsb3NlZFxyXG4gICAgICBAX2xvZ2luV2luZG93LmZvY3VzKClcclxuICAgIGVsc2VcclxuXHJcbiAgICAgIGNvbXB1dGVTY3JlZW5Mb2NhdGlvbiA9ICh3LCBoKSAtPlxyXG4gICAgICAgIHNjcmVlbkxlZnQgPSB3aW5kb3cuc2NyZWVuTGVmdCBvciBzY3JlZW4ubGVmdFxyXG4gICAgICAgIHNjcmVlblRvcCAgPSB3aW5kb3cuc2NyZWVuVG9wICBvciBzY3JlZW4udG9wXHJcbiAgICAgICAgd2lkdGggID0gd2luZG93LmlubmVyV2lkdGggIG9yIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGllbnRXaWR0aCAgb3Igc2NyZWVuLndpZHRoXHJcbiAgICAgICAgaGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0IG9yIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGllbnRIZWlnaHQgb3Igc2NyZWVuLmhlaWdodFxyXG5cclxuICAgICAgICBsZWZ0ID0gKCh3aWR0aCAvIDIpIC0gKHcgLyAyKSkgKyBzY3JlZW5MZWZ0XHJcbiAgICAgICAgdG9wID0gKChoZWlnaHQgLyAyKSAtIChoIC8gMikpICsgc2NyZWVuVG9wXHJcbiAgICAgICAgcmV0dXJuIHtsZWZ0LCB0b3B9XHJcblxyXG4gICAgICB3aWR0aCA9IDEwMDBcclxuICAgICAgaGVpZ2h0ID0gNDgwXHJcbiAgICAgIHBvc2l0aW9uID0gY29tcHV0ZVNjcmVlbkxvY2F0aW9uIHdpZHRoLCBoZWlnaHRcclxuICAgICAgd2luZG93RmVhdHVyZXMgPSBbXHJcbiAgICAgICAgJ3dpZHRoPScgKyB3aWR0aFxyXG4gICAgICAgICdoZWlnaHQ9JyArIGhlaWdodFxyXG4gICAgICAgICd0b3A9JyArIHBvc2l0aW9uLnRvcCBvciAyMDBcclxuICAgICAgICAnbGVmdD0nICsgcG9zaXRpb24ubGVmdCBvciAyMDBcclxuICAgICAgICAnZGVwZW5kZW50PXllcydcclxuICAgICAgICAncmVzaXphYmxlPW5vJ1xyXG4gICAgICAgICdsb2NhdGlvbj1ubydcclxuICAgICAgICAnZGlhbG9nPXllcydcclxuICAgICAgICAnbWVudWJhcj1ubydcclxuICAgICAgXVxyXG5cclxuICAgICAgQF9sb2dpbldpbmRvdyA9IHdpbmRvdy5vcGVuKGF1dGhvcml6ZVVybCwgJ2F1dGgnLCB3aW5kb3dGZWF0dXJlcy5qb2luKCkpXHJcblxyXG4gICAgICBwb2xsQWN0aW9uID0gPT5cclxuICAgICAgICB0cnlcclxuICAgICAgICAgIGhyZWYgPSBAX2xvZ2luV2luZG93LmxvY2F0aW9uLmhyZWZcclxuICAgICAgICAgIGlmIChocmVmIGlzIHdpbmRvdy5sb2NhdGlvbi5ocmVmKVxyXG4gICAgICAgICAgICBjbGVhckludGVydmFsIHBvbGxcclxuICAgICAgICAgICAgQF9sb2dpbldpbmRvdy5jbG9zZSgpXHJcbiAgICAgICAgICAgIEBfY2hlY2tMb2dpbigpXHJcbiAgICAgICAgY2F0Y2ggZVxyXG4gICAgICAgICAgIyBjb25zb2xlLmxvZyBlXHJcblxyXG4gICAgICBwb2xsID0gc2V0SW50ZXJ2YWwgcG9sbEFjdGlvbiwgMjAwXHJcblxyXG4gIHJlbmRlckF1dGhvcml6YXRpb25EaWFsb2c6IC0+XHJcbiAgICAoRG9jdW1lbnRTdG9yZUF1dGhvcml6YXRpb25EaWFsb2cge3Byb3ZpZGVyOiBALCBhdXRoQ2FsbGJhY2s6IEBhdXRoQ2FsbGJhY2t9KVxyXG5cclxuICByZW5kZXJVc2VyOiAtPlxyXG4gICAgaWYgQHVzZXJcclxuICAgICAgKHNwYW4ge30sIChzcGFuIHtjbGFzc05hbWU6ICdkb2N1bWVudC1zdG9yZS1pY29uJ30pLCBAdXNlci5uYW1lKVxyXG4gICAgZWxzZVxyXG4gICAgICBudWxsXHJcblxyXG4gIGxpc3Q6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICAkLmFqYXhcclxuICAgICAgZGF0YVR5cGU6ICdqc29uJ1xyXG4gICAgICB1cmw6IGxpc3RVcmxcclxuICAgICAgY29udGV4dDogQFxyXG4gICAgICB4aHJGaWVsZHM6XHJcbiAgICAgICAgd2l0aENyZWRlbnRpYWxzOiB0cnVlXHJcbiAgICAgIHN1Y2Nlc3M6IChkYXRhKSAtPlxyXG4gICAgICAgIGxpc3QgPSBbXVxyXG4gICAgICAgIGZvciBvd24ga2V5LCBmaWxlIG9mIGRhdGFcclxuICAgICAgICAgIGxpc3QucHVzaCBuZXcgQ2xvdWRNZXRhZGF0YVxyXG4gICAgICAgICAgICBuYW1lOiBmaWxlLm5hbWVcclxuICAgICAgICAgICAgcHJvdmlkZXJEYXRhOiB7aWQ6IGZpbGUuaWR9XHJcbiAgICAgICAgICAgIHR5cGU6IENsb3VkTWV0YWRhdGEuRmlsZVxyXG4gICAgICAgICAgICBwcm92aWRlcjogQFxyXG4gICAgICAgIGNhbGxiYWNrIG51bGwsIGxpc3RcclxuICAgICAgZXJyb3I6IC0+XHJcbiAgICAgICAgY2FsbGJhY2sgbnVsbCwgW11cclxuXHJcbiAgbG9hZDogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgICQuYWpheFxyXG4gICAgICB1cmw6IGxvYWREb2N1bWVudFVybFxyXG4gICAgICBkYXRhOlxyXG4gICAgICAgIHJlY29yZGlkOiBtZXRhZGF0YS5wcm92aWRlckRhdGEuaWRcclxuICAgICAgY29udGV4dDogQFxyXG4gICAgICB4aHJGaWVsZHM6XHJcbiAgICAgICAgd2l0aENyZWRlbnRpYWxzOiB0cnVlXHJcbiAgICAgIHN1Y2Nlc3M6IChkYXRhKSAtPlxyXG4gICAgICAgIGNhbGxiYWNrIG51bGwsIGRhdGEuY29udGVudFxyXG4gICAgICBlcnJvcjogLT5cclxuICAgICAgICBjYWxsYmFjayBcIlVuYWJsZSB0byBsb2FkIFwiK21ldGFkYXRhLm5hbWVcclxuXHJcbiAgc2F2ZTogKGNvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIGNvbnRlbnQgPSBAX3ZhbGlkYXRlQ29udGVudCBjb250ZW50XHJcblxyXG4gICAgcGFyYW1zID0ge31cclxuICAgIGlmIG1ldGFkYXRhLnByb3ZpZGVyRGF0YS5pZCB0aGVuIHBhcmFtcy5yZWNvcmRpZCA9IG1ldGFkYXRhLnByb3ZpZGVyRGF0YS5pZFxyXG4gICAgaWYgbWV0YWRhdGEubmFtZSB0aGVuIHBhcmFtcy5yZWNvcmRuYW1lID0gbWV0YWRhdGEubmFtZVxyXG5cclxuICAgIHVybCA9IEBfYWRkUGFyYW1zKHNhdmVEb2N1bWVudFVybCwgcGFyYW1zKVxyXG5cclxuICAgICQuYWpheFxyXG4gICAgICBkYXRhVHlwZTogJ2pzb24nXHJcbiAgICAgIG1ldGhvZDogJ1BPU1QnXHJcbiAgICAgIHVybDogdXJsXHJcbiAgICAgIGRhdGE6IGNvbnRlbnRcclxuICAgICAgY29udGV4dDogQFxyXG4gICAgICB4aHJGaWVsZHM6XHJcbiAgICAgICAgd2l0aENyZWRlbnRpYWxzOiB0cnVlXHJcbiAgICAgIHN1Y2Nlc3M6IChkYXRhKSAtPlxyXG4gICAgICAgIGlmIGRhdGEuaWQgdGhlbiBtZXRhZGF0YS5wcm92aWRlckRhdGEuaWQgPSBkYXRhLmlkXHJcbiAgICAgICAgY2FsbGJhY2sgbnVsbCwgZGF0YVxyXG4gICAgICBlcnJvcjogLT5cclxuICAgICAgICBjYWxsYmFjayBcIlVuYWJsZSB0byBsb2FkIFwiK21ldGFkYXRhLm5hbWVcclxuXHJcbiAgcGF0Y2g6IChjb250ZW50LCBtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICB1bmxlc3MgbWV0YWRhdGE/Lm92ZXJ3cml0YWJsZSBhbmQgbWV0YWRhdGEucHJvdmlkZXJEYXRhLmlkXHJcbiAgICAgIHJldHVybiBAc2F2ZShjb250ZW50LCBtZXRhZGF0YSwgY2FsbGJhY2spXHJcblxyXG4gICAgdXJsID0gQF9hZGRQYXJhbXMocGF0Y2hEb2N1bWVudFVybCwge3JlY29yZGlkOiBtZXRhZGF0YS5wcm92aWRlckRhdGEuaWR9KVxyXG5cclxuICAgICQuYWpheFxyXG4gICAgICBkYXRhVHlwZTogJ2pzb24nXHJcbiAgICAgIG1ldGhvZDogJ1BPU1QnXHJcbiAgICAgIHVybDogdXJsXHJcbiAgICAgIGRhdGE6IGNvbnRlbnRcclxuICAgICAgY29udGV4dDogQFxyXG4gICAgICB4aHJGaWVsZHM6XHJcbiAgICAgICAgd2l0aENyZWRlbnRpYWxzOiB0cnVlXHJcbiAgICAgIHN1Y2Nlc3M6IChkYXRhKSAtPlxyXG4gICAgICAgIGNhbGxiYWNrIG51bGwsIGRhdGFcclxuICAgICAgZXJyb3I6IC0+XHJcbiAgICAgICAgY2FsbGJhY2sgXCJVbmFibGUgdG8gbG9hZCBcIittZXRhZGF0YS5uYW1lXHJcblxyXG5cclxuICByZW1vdmU6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICAkLmFqYXhcclxuICAgICAgdXJsOiByZW1vdmVEb2N1bWVudFVybFxyXG4gICAgICBkYXRhOlxyXG4gICAgICAgIHJlY29yZG5hbWU6IG1ldGFkYXRhLm5hbWVcclxuICAgICAgY29udGV4dDogQFxyXG4gICAgICB4aHJGaWVsZHM6XHJcbiAgICAgICAgd2l0aENyZWRlbnRpYWxzOiB0cnVlXHJcbiAgICAgIHN1Y2Nlc3M6IChkYXRhKSAtPlxyXG4gICAgICAgIGNhbGxiYWNrIG51bGwsIGRhdGFcclxuICAgICAgZXJyb3I6IC0+XHJcbiAgICAgICAgY2FsbGJhY2sgXCJVbmFibGUgdG8gbG9hZCBcIittZXRhZGF0YS5uYW1lXHJcblxyXG4gIHJlbmFtZTogKG1ldGFkYXRhLCBuZXdOYW1lLCBjYWxsYmFjaykgLT5cclxuICAgICQuYWpheFxyXG4gICAgICB1cmw6IHJlbmFtZURvY3VtZW50VXJsXHJcbiAgICAgIGRhdGE6XHJcbiAgICAgICAgcmVjb3JkaWQ6IG1ldGFkYXRhLnByb3ZpZGVyRGF0YS5pZFxyXG4gICAgICAgIG5ld1JlY29yZG5hbWU6IG5ld05hbWVcclxuICAgICAgY29udGV4dDogQFxyXG4gICAgICB4aHJGaWVsZHM6XHJcbiAgICAgICAgd2l0aENyZWRlbnRpYWxzOiB0cnVlXHJcbiAgICAgIHN1Y2Nlc3M6IChkYXRhKSAtPlxyXG4gICAgICAgIG1ldGFkYXRhLm5hbWUgPSBuZXdOYW1lXHJcbiAgICAgICAgY2FsbGJhY2sgbnVsbCwgbWV0YWRhdGFcclxuICAgICAgZXJyb3I6IC0+XHJcbiAgICAgICAgY2FsbGJhY2sgXCJVbmFibGUgdG8gcmVuYW1lIFwiK21ldGFkYXRhLm5hbWVcclxuXHJcbiAgX2FkZFBhcmFtczogKHVybCwgcGFyYW1zKSAtPlxyXG4gICAgcmV0dXJuIHVybCB1bmxlc3MgcGFyYW1zXHJcbiAgICBrdnAgPSBbXVxyXG4gICAgZm9yIGtleSwgdmFsdWUgb2YgcGFyYW1zXHJcbiAgICAgIGt2cC5wdXNoIFtrZXksIHZhbHVlXS5tYXAoZW5jb2RlVVJJKS5qb2luIFwiPVwiXHJcbiAgICByZXR1cm4gdXJsICsgXCI/XCIgKyBrdnAuam9pbiBcIiZcIlxyXG5cclxuICAjIFRoZSBkb2N1bWVudCBzZXJ2ZXIgcmVxdWlyZXMgdGhlIGNvbnRlbnQgdG8gYmUgSlNPTiwgYW5kIGl0IG11c3QgaGF2ZVxyXG4gICMgY2VydGFpbiBwcmUtZGVmaW5lZCBrZXlzIGluIG9yZGVyIHRvIGJlIGxpc3RlZCB3aGVuIHdlIHF1ZXJ5IHRoZSBsaXN0XHJcbiAgX3ZhbGlkYXRlQ29udGVudDogKGNvbnRlbnQpIC0+XHJcbiAgICAjIGZpcnN0IGNvbnZlcnQgdG8gYW4gb2JqZWN0IHRvIGVhc2lseSBhZGQgcHJvcGVydGllc1xyXG4gICAgdHJ5XHJcbiAgICAgIGNvbnRlbnQgPSBKU09OLnBhcnNlIGNvbnRlbnRcclxuICAgIGNhdGNoXHJcbiAgICAgIGNvbnRlbnQgPSB7Y29udGVudDogY29udGVudH1cclxuXHJcbiAgICBjb250ZW50LmFwcE5hbWUgICAgID89IEBvcHRpb25zLmFwcE5hbWVcclxuICAgIGNvbnRlbnQuYXBwVmVyc2lvbiAgPz0gQG9wdGlvbnMuYXBwVmVyc2lvblxyXG4gICAgY29udGVudC5hcHBCdWlsZE51bSA/PSBAb3B0aW9ucy5hcHBCdWlsZE51bVxyXG5cclxuICAgIHJldHVybiBKU09OLnN0cmluZ2lmeSBjb250ZW50XHJcblxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBEb2N1bWVudFN0b3JlUHJvdmlkZXJcclxuIiwie2RpdiwgYnV0dG9uLCBzcGFufSA9IFJlYWN0LkRPTVxyXG5cclxudHIgPSByZXF1aXJlICcuLi91dGlscy90cmFuc2xhdGUnXHJcbmlzU3RyaW5nID0gcmVxdWlyZSAnLi4vdXRpbHMvaXMtc3RyaW5nJ1xyXG5cclxuUHJvdmlkZXJJbnRlcmZhY2UgPSAocmVxdWlyZSAnLi9wcm92aWRlci1pbnRlcmZhY2UnKS5Qcm92aWRlckludGVyZmFjZVxyXG5DbG91ZE1ldGFkYXRhID0gKHJlcXVpcmUgJy4vcHJvdmlkZXItaW50ZXJmYWNlJykuQ2xvdWRNZXRhZGF0YVxyXG5cclxuR29vZ2xlRHJpdmVBdXRob3JpemF0aW9uRGlhbG9nID0gUmVhY3QuY3JlYXRlRmFjdG9yeSBSZWFjdC5jcmVhdGVDbGFzc1xyXG4gIGRpc3BsYXlOYW1lOiAnR29vZ2xlRHJpdmVBdXRob3JpemF0aW9uRGlhbG9nJ1xyXG5cclxuICBnZXRJbml0aWFsU3RhdGU6IC0+XHJcbiAgICBsb2FkZWRHQVBJOiBmYWxzZVxyXG5cclxuICBjb21wb25lbnRXaWxsTW91bnQ6IC0+XHJcbiAgICBAcHJvcHMucHJvdmlkZXIuX2xvYWRlZEdBUEkgPT5cclxuICAgICAgQHNldFN0YXRlIGxvYWRlZEdBUEk6IHRydWVcclxuXHJcbiAgYXV0aGVudGljYXRlOiAtPlxyXG4gICAgQHByb3BzLnByb3ZpZGVyLmF1dGhvcml6ZSBHb29nbGVEcml2ZVByb3ZpZGVyLlNIT1dfUE9QVVBcclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgKGRpdiB7fSxcclxuICAgICAgaWYgQHN0YXRlLmxvYWRlZEdBUElcclxuICAgICAgICAoYnV0dG9uIHtvbkNsaWNrOiBAYXV0aGVudGljYXRlfSwgJ0F1dGhvcml6YXRpb24gTmVlZGVkJylcclxuICAgICAgZWxzZVxyXG4gICAgICAgICdXYWl0aW5nIGZvciB0aGUgR29vZ2xlIENsaWVudCBBUEkgdG8gbG9hZC4uLidcclxuICAgIClcclxuXHJcbmNsYXNzIEdvb2dsZURyaXZlUHJvdmlkZXIgZXh0ZW5kcyBQcm92aWRlckludGVyZmFjZVxyXG5cclxuICBjb25zdHJ1Y3RvcjogKEBvcHRpb25zID0ge30pIC0+XHJcbiAgICBzdXBlclxyXG4gICAgICBuYW1lOiBHb29nbGVEcml2ZVByb3ZpZGVyLk5hbWVcclxuICAgICAgZGlzcGxheU5hbWU6IEBvcHRpb25zLmRpc3BsYXlOYW1lIG9yICh0ciAnflBST1ZJREVSLkdPT0dMRV9EUklWRScpXHJcbiAgICAgIGNhcGFiaWxpdGllczpcclxuICAgICAgICBzYXZlOiB0cnVlXHJcbiAgICAgICAgbG9hZDogdHJ1ZVxyXG4gICAgICAgIGxpc3Q6IHRydWVcclxuICAgICAgICByZW1vdmU6IHRydWVcclxuICAgICAgICByZW5hbWU6IHRydWVcclxuXHJcbiAgICBAYXV0aFRva2VuID0gbnVsbFxyXG4gICAgQHVzZXIgPSBudWxsXHJcbiAgICBAY2xpZW50SWQgPSBAb3B0aW9ucy5jbGllbnRJZFxyXG4gICAgaWYgbm90IEBjbGllbnRJZFxyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IgJ01pc3NpbmcgcmVxdWlyZWQgY2xpZW50SWQgaW4gZ29vZ2xlRHJpdmUgcHJvdmlkZXIgb3B0aW9ucydcclxuICAgIEBtaW1lVHlwZSA9IEBvcHRpb25zLm1pbWVUeXBlIG9yIFwidGV4dC9wbGFpblwiXHJcbiAgICBAX2xvYWRHQVBJKClcclxuXHJcbiAgQE5hbWU6ICdnb29nbGVEcml2ZSdcclxuXHJcbiAgIyBhbGlhc2VzIGZvciBib29sZWFuIHBhcmFtZXRlciB0byBhdXRob3JpemVcclxuICBASU1NRURJQVRFID0gdHJ1ZVxyXG4gIEBTSE9XX1BPUFVQID0gZmFsc2VcclxuXHJcbiAgYXV0aG9yaXplZDogKEBhdXRoQ2FsbGJhY2spIC0+XHJcbiAgICBpZiBAYXV0aENhbGxiYWNrXHJcbiAgICAgIGlmIEBhdXRoVG9rZW5cclxuICAgICAgICBAYXV0aENhbGxiYWNrIHRydWVcclxuICAgICAgZWxzZVxyXG4gICAgICAgIEBhdXRob3JpemUgR29vZ2xlRHJpdmVQcm92aWRlci5JTU1FRElBVEVcclxuICAgIGVsc2VcclxuICAgICAgQGF1dGhUb2tlbiBpc250IG51bGxcclxuXHJcbiAgYXV0aG9yaXplOiAoaW1tZWRpYXRlKSAtPlxyXG4gICAgQF9sb2FkZWRHQVBJID0+XHJcbiAgICAgIGFyZ3MgPVxyXG4gICAgICAgIGNsaWVudF9pZDogQGNsaWVudElkXHJcbiAgICAgICAgc2NvcGU6IFsnaHR0cHM6Ly93d3cuZ29vZ2xlYXBpcy5jb20vYXV0aC9kcml2ZScsICdodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS9hdXRoL3VzZXJpbmZvLnByb2ZpbGUnXVxyXG4gICAgICAgIGltbWVkaWF0ZTogaW1tZWRpYXRlXHJcbiAgICAgIGdhcGkuYXV0aC5hdXRob3JpemUgYXJncywgKGF1dGhUb2tlbikgPT5cclxuICAgICAgICBAYXV0aFRva2VuID0gaWYgYXV0aFRva2VuIGFuZCBub3QgYXV0aFRva2VuLmVycm9yIHRoZW4gYXV0aFRva2VuIGVsc2UgbnVsbFxyXG4gICAgICAgIEB1c2VyID0gbnVsbFxyXG4gICAgICAgIGlmIEBhdXRoVG9rZW5cclxuICAgICAgICAgIGdhcGkuY2xpZW50Lm9hdXRoMi51c2VyaW5mby5nZXQoKS5leGVjdXRlICh1c2VyKSA9PlxyXG4gICAgICAgICAgICBAdXNlciA9IHVzZXJcclxuICAgICAgICBAYXV0aENhbGxiYWNrIEBhdXRoVG9rZW4gaXNudCBudWxsXHJcblxyXG4gIHJlbmRlckF1dGhvcml6YXRpb25EaWFsb2c6IC0+XHJcbiAgICAoR29vZ2xlRHJpdmVBdXRob3JpemF0aW9uRGlhbG9nIHtwcm92aWRlcjogQH0pXHJcblxyXG4gIHJlbmRlclVzZXI6IC0+XHJcbiAgICBpZiBAdXNlclxyXG4gICAgICAoc3BhbiB7fSwgKHNwYW4ge2NsYXNzTmFtZTogJ2dkcml2ZS1pY29uJ30pLCBAdXNlci5uYW1lKVxyXG4gICAgZWxzZVxyXG4gICAgICBudWxsXHJcblxyXG4gIHNhdmU6ICAoY29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgQF9sb2FkZWRHQVBJID0+XHJcbiAgICAgIEBfc2VuZEZpbGUgY29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrXHJcblxyXG4gIGxvYWQ6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICBAX2xvYWRlZEdBUEkgPT5cclxuICAgICAgcmVxdWVzdCA9IGdhcGkuY2xpZW50LmRyaXZlLmZpbGVzLmdldFxyXG4gICAgICAgIGZpbGVJZDogbWV0YWRhdGEucHJvdmlkZXJEYXRhLmlkXHJcbiAgICAgIHJlcXVlc3QuZXhlY3V0ZSAoZmlsZSkgPT5cclxuICAgICAgICBpZiBmaWxlPy5kb3dubG9hZFVybFxyXG4gICAgICAgICAgQF9kb3dubG9hZEZyb21VcmwgZmlsZS5kb3dubG9hZFVybCwgQGF1dGhUb2tlbiwgY2FsbGJhY2tcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICBjYWxsYmFjayAnVW5hYmxlIHRvIGdldCBkb3dubG9hZCB1cmwnXHJcblxyXG4gIGxpc3Q6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICBAX2xvYWRlZEdBUEkgPT5cclxuICAgICAgcmVxdWVzdCA9IGdhcGkuY2xpZW50LmRyaXZlLmZpbGVzLmxpc3RcclxuICAgICAgICBxOiBcIm1pbWVUeXBlID0gJyN7QG1pbWVUeXBlfSdcIlxyXG4gICAgICByZXF1ZXN0LmV4ZWN1dGUgKHJlc3VsdCkgPT5cclxuICAgICAgICByZXR1cm4gY2FsbGJhY2soJ1VuYWJsZSB0byBsaXN0IGZpbGVzJykgaWYgbm90IHJlc3VsdFxyXG4gICAgICAgIGxpc3QgPSBbXVxyXG4gICAgICAgIGZvciBpdGVtIGluIHJlc3VsdD8uaXRlbXNcclxuICAgICAgICAgICMgVE9ETzogZm9yIG5vdyBkb24ndCBhbGxvdyBmb2xkZXJzXHJcbiAgICAgICAgICBpZiBpdGVtLm1pbWVUeXBlIGlzbnQgJ2FwcGxpY2F0aW9uL3ZuZC5nb29nbGUtYXBwcy5mb2xkZXInXHJcbiAgICAgICAgICAgIGxpc3QucHVzaCBuZXcgQ2xvdWRNZXRhZGF0YVxyXG4gICAgICAgICAgICAgIG5hbWU6IGl0ZW0udGl0bGVcclxuICAgICAgICAgICAgICBwYXRoOiBcIlwiXHJcbiAgICAgICAgICAgICAgdHlwZTogaWYgaXRlbS5taW1lVHlwZSBpcyAnYXBwbGljYXRpb24vdm5kLmdvb2dsZS1hcHBzLmZvbGRlcicgdGhlbiBDbG91ZE1ldGFkYXRhLkZvbGRlciBlbHNlIENsb3VkTWV0YWRhdGEuRmlsZVxyXG4gICAgICAgICAgICAgIHByb3ZpZGVyOiBAXHJcbiAgICAgICAgICAgICAgcHJvdmlkZXJEYXRhOlxyXG4gICAgICAgICAgICAgICAgaWQ6IGl0ZW0uaWRcclxuICAgICAgICBsaXN0LnNvcnQgKGEsIGIpIC0+XHJcbiAgICAgICAgICBsb3dlckEgPSBhLm5hbWUudG9Mb3dlckNhc2UoKVxyXG4gICAgICAgICAgbG93ZXJCID0gYi5uYW1lLnRvTG93ZXJDYXNlKClcclxuICAgICAgICAgIHJldHVybiAtMSBpZiBsb3dlckEgPCBsb3dlckJcclxuICAgICAgICAgIHJldHVybiAxIGlmIGxvd2VyQSA+IGxvd2VyQlxyXG4gICAgICAgICAgcmV0dXJuIDBcclxuICAgICAgICBjYWxsYmFjayBudWxsLCBsaXN0XHJcblxyXG4gIHJlbW92ZTogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIEBfbG9hZGVkR0FQSSAtPlxyXG4gICAgICByZXF1ZXN0ID0gZ2FwaS5jbGllbnQuZHJpdmUuZmlsZXMuZGVsZXRlXHJcbiAgICAgICAgZmlsZUlkOiBtZXRhZGF0YS5wcm92aWRlckRhdGEuaWRcclxuICAgICAgcmVxdWVzdC5leGVjdXRlIChyZXN1bHQpIC0+XHJcbiAgICAgICAgY2FsbGJhY2s/IHJlc3VsdD8uZXJyb3Igb3IgbnVsbFxyXG5cclxuICByZW5hbWU6IChtZXRhZGF0YSwgbmV3TmFtZSwgY2FsbGJhY2spIC0+XHJcbiAgICBAX2xvYWRlZEdBUEkgLT5cclxuICAgICAgcmVxdWVzdCA9IGdhcGkuY2xpZW50LmRyaXZlLmZpbGVzLnBhdGNoXHJcbiAgICAgICAgZmlsZUlkOiBtZXRhZGF0YS5wcm92aWRlckRhdGEuaWRcclxuICAgICAgICByZXNvdXJjZTpcclxuICAgICAgICAgIHRpdGxlOiBuZXdOYW1lXHJcbiAgICAgIHJlcXVlc3QuZXhlY3V0ZSAocmVzdWx0KSAtPlxyXG4gICAgICAgIGlmIHJlc3VsdD8uZXJyb3JcclxuICAgICAgICAgIGNhbGxiYWNrPyByZXN1bHQuZXJyb3JcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICBtZXRhZGF0YS5uYW1lID0gbmV3TmFtZVxyXG4gICAgICAgICAgY2FsbGJhY2sgbnVsbCwgbWV0YWRhdGFcclxuXHJcbiAgX2xvYWRHQVBJOiAtPlxyXG4gICAgaWYgbm90IHdpbmRvdy5fTG9hZGluZ0dBUElcclxuICAgICAgd2luZG93Ll9Mb2FkaW5nR0FQSSA9IHRydWVcclxuICAgICAgd2luZG93Ll9HQVBJT25Mb2FkID0gLT5cclxuICAgICAgICBAd2luZG93Ll9Mb2FkZWRHQVBJID0gdHJ1ZVxyXG4gICAgICBzY3JpcHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50ICdzY3JpcHQnXHJcbiAgICAgIHNjcmlwdC5zcmMgPSAnaHR0cHM6Ly9hcGlzLmdvb2dsZS5jb20vanMvY2xpZW50LmpzP29ubG9hZD1fR0FQSU9uTG9hZCdcclxuICAgICAgZG9jdW1lbnQuaGVhZC5hcHBlbmRDaGlsZCBzY3JpcHRcclxuXHJcbiAgX2xvYWRlZEdBUEk6IChjYWxsYmFjaykgLT5cclxuICAgIGlmIHdpbmRvdy5fTG9hZGVkR0FQSUNsaWVudHNcclxuICAgICAgY2FsbGJhY2soKVxyXG4gICAgZWxzZVxyXG4gICAgICBzZWxmID0gQFxyXG4gICAgICBjaGVjayA9IC0+XHJcbiAgICAgICAgaWYgd2luZG93Ll9Mb2FkZWRHQVBJXHJcbiAgICAgICAgICBnYXBpLmNsaWVudC5sb2FkICdkcml2ZScsICd2MicsIC0+XHJcbiAgICAgICAgICAgIGdhcGkuY2xpZW50LmxvYWQgJ29hdXRoMicsICd2MicsIC0+XHJcbiAgICAgICAgICAgICAgd2luZG93Ll9Mb2FkZWRHQVBJQ2xpZW50cyA9IHRydWVcclxuICAgICAgICAgICAgICBjYWxsYmFjay5jYWxsIHNlbGZcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICBzZXRUaW1lb3V0IGNoZWNrLCAxMFxyXG4gICAgICBzZXRUaW1lb3V0IGNoZWNrLCAxMFxyXG5cclxuICBfZG93bmxvYWRGcm9tVXJsOiAodXJsLCB0b2tlbiwgY2FsbGJhY2spIC0+XHJcbiAgICB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKVxyXG4gICAgeGhyLm9wZW4gJ0dFVCcsIHVybFxyXG4gICAgaWYgdG9rZW5cclxuICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIgJ0F1dGhvcml6YXRpb24nLCBcIkJlYXJlciAje3Rva2VuLmFjY2Vzc190b2tlbn1cIlxyXG4gICAgeGhyLm9ubG9hZCA9IC0+XHJcbiAgICAgIGNhbGxiYWNrIG51bGwsIHhoci5yZXNwb25zZVRleHRcclxuICAgIHhoci5vbmVycm9yID0gLT5cclxuICAgICAgY2FsbGJhY2sgXCJVbmFibGUgdG8gZG93bmxvYWQgI3t1cmx9XCJcclxuICAgIHhoci5zZW5kKClcclxuXHJcbiAgX3NlbmRGaWxlOiAoY29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgYm91bmRhcnkgPSAnLS0tLS0tLTMxNDE1OTI2NTM1ODk3OTMyMzg0NidcclxuICAgIGhlYWRlciA9IEpTT04uc3RyaW5naWZ5XHJcbiAgICAgIHRpdGxlOiBtZXRhZGF0YS5uYW1lXHJcbiAgICAgIG1pbWVUeXBlOiBAbWltZVR5cGVcclxuXHJcbiAgICBbbWV0aG9kLCBwYXRoXSA9IGlmIG1ldGFkYXRhLnByb3ZpZGVyRGF0YT8uaWRcclxuICAgICAgWydQVVQnLCBcIi91cGxvYWQvZHJpdmUvdjIvZmlsZXMvI3ttZXRhZGF0YS5wcm92aWRlckRhdGEuaWR9XCJdXHJcbiAgICBlbHNlXHJcbiAgICAgIFsnUE9TVCcsICcvdXBsb2FkL2RyaXZlL3YyL2ZpbGVzJ11cclxuXHJcbiAgICBib2R5ID0gW1xyXG4gICAgICBcIlxcclxcbi0tI3tib3VuZGFyeX1cXHJcXG5Db250ZW50LVR5cGU6IGFwcGxpY2F0aW9uL2pzb25cXHJcXG5cXHJcXG4je2hlYWRlcn1cIixcclxuICAgICAgXCJcXHJcXG4tLSN7Ym91bmRhcnl9XFxyXFxuQ29udGVudC1UeXBlOiAje0BtaW1lVHlwZX1cXHJcXG5cXHJcXG4je2NvbnRlbnR9XCIsXHJcbiAgICAgIFwiXFxyXFxuLS0je2JvdW5kYXJ5fS0tXCJcclxuICAgIF0uam9pbiAnJ1xyXG5cclxuICAgIHJlcXVlc3QgPSBnYXBpLmNsaWVudC5yZXF1ZXN0XHJcbiAgICAgIHBhdGg6IHBhdGhcclxuICAgICAgbWV0aG9kOiBtZXRob2RcclxuICAgICAgcGFyYW1zOiB7dXBsb2FkVHlwZTogJ211bHRpcGFydCd9XHJcbiAgICAgIGhlYWRlcnM6IHsnQ29udGVudC1UeXBlJzogJ211bHRpcGFydC9yZWxhdGVkOyBib3VuZGFyeT1cIicgKyBib3VuZGFyeSArICdcIid9XHJcbiAgICAgIGJvZHk6IGJvZHlcclxuXHJcbiAgICByZXF1ZXN0LmV4ZWN1dGUgKGZpbGUpIC0+XHJcbiAgICAgIGlmIGNhbGxiYWNrXHJcbiAgICAgICAgaWYgZmlsZT8uZXJyb3JcclxuICAgICAgICAgIGNhbGxiYWNrIFwiVW5hYmxlZCB0byB1cGxvYWQgZmlsZTogI3tmaWxlLmVycm9yLm1lc3NhZ2V9XCJcclxuICAgICAgICBlbHNlIGlmIGZpbGVcclxuICAgICAgICAgIGNhbGxiYWNrIG51bGwsIGZpbGVcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICBjYWxsYmFjayAnVW5hYmxlZCB0byB1cGxvYWQgZmlsZSdcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gR29vZ2xlRHJpdmVQcm92aWRlclxyXG4iLCJ0ciA9IHJlcXVpcmUgJy4uL3V0aWxzL3RyYW5zbGF0ZSdcclxuXHJcblByb3ZpZGVySW50ZXJmYWNlID0gKHJlcXVpcmUgJy4vcHJvdmlkZXItaW50ZXJmYWNlJykuUHJvdmlkZXJJbnRlcmZhY2VcclxuQ2xvdWRNZXRhZGF0YSA9IChyZXF1aXJlICcuL3Byb3ZpZGVyLWludGVyZmFjZScpLkNsb3VkTWV0YWRhdGFcclxuXHJcbmNsYXNzIExvY2FsU3RvcmFnZVByb3ZpZGVyIGV4dGVuZHMgUHJvdmlkZXJJbnRlcmZhY2VcclxuXHJcbiAgY29uc3RydWN0b3I6IChAb3B0aW9ucyA9IHt9KSAtPlxyXG4gICAgc3VwZXJcclxuICAgICAgbmFtZTogTG9jYWxTdG9yYWdlUHJvdmlkZXIuTmFtZVxyXG4gICAgICBkaXNwbGF5TmFtZTogQG9wdGlvbnMuZGlzcGxheU5hbWUgb3IgKHRyICd+UFJPVklERVIuTE9DQUxfU1RPUkFHRScpXHJcbiAgICAgIGNhcGFiaWxpdGllczpcclxuICAgICAgICBzYXZlOiB0cnVlXHJcbiAgICAgICAgbG9hZDogdHJ1ZVxyXG4gICAgICAgIGxpc3Q6IHRydWVcclxuICAgICAgICByZW1vdmU6IHRydWVcclxuICAgICAgICByZW5hbWU6IHRydWVcclxuXHJcbiAgQE5hbWU6ICdsb2NhbFN0b3JhZ2UnXHJcbiAgQEF2YWlsYWJsZTogLT5cclxuICAgIHJlc3VsdCA9IHRyeVxyXG4gICAgICB0ZXN0ID0gJ0xvY2FsU3RvcmFnZVByb3ZpZGVyOjphdXRoJ1xyXG4gICAgICB3aW5kb3cubG9jYWxTdG9yYWdlLnNldEl0ZW0odGVzdCwgdGVzdClcclxuICAgICAgd2luZG93LmxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKHRlc3QpXHJcbiAgICAgIHRydWVcclxuICAgIGNhdGNoXHJcbiAgICAgIGZhbHNlXHJcblxyXG4gIHNhdmU6IChjb250ZW50LCBtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICB0cnlcclxuICAgICAgd2luZG93LmxvY2FsU3RvcmFnZS5zZXRJdGVtIEBfZ2V0S2V5KG1ldGFkYXRhLm5hbWUpLCBjb250ZW50XHJcbiAgICAgIGNhbGxiYWNrPyBudWxsXHJcbiAgICBjYXRjaFxyXG4gICAgICBjYWxsYmFjaz8gJ1VuYWJsZSB0byBzYXZlJ1xyXG5cclxuICBsb2FkOiAobWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgdHJ5XHJcbiAgICAgIGNvbnRlbnQgPSB3aW5kb3cubG9jYWxTdG9yYWdlLmdldEl0ZW0gQF9nZXRLZXkgbWV0YWRhdGEubmFtZVxyXG4gICAgICBjYWxsYmFjayBudWxsLCBjb250ZW50XHJcbiAgICBjYXRjaFxyXG4gICAgICBjYWxsYmFjayAnVW5hYmxlIHRvIGxvYWQnXHJcblxyXG4gIGxpc3Q6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICBsaXN0ID0gW11cclxuICAgIHBhdGggPSBtZXRhZGF0YT8ucGF0aCBvciAnJ1xyXG4gICAgcHJlZml4ID0gQF9nZXRLZXkgcGF0aFxyXG4gICAgZm9yIG93biBrZXkgb2Ygd2luZG93LmxvY2FsU3RvcmFnZVxyXG4gICAgICBpZiBrZXkuc3Vic3RyKDAsIHByZWZpeC5sZW5ndGgpIGlzIHByZWZpeFxyXG4gICAgICAgIFtuYW1lLCByZW1haW5kZXIuLi5dID0ga2V5LnN1YnN0cihwcmVmaXgubGVuZ3RoKS5zcGxpdCgnLycpXHJcbiAgICAgICAgbGlzdC5wdXNoIG5ldyBDbG91ZE1ldGFkYXRhXHJcbiAgICAgICAgICBuYW1lOiBrZXkuc3Vic3RyKHByZWZpeC5sZW5ndGgpXHJcbiAgICAgICAgICBwYXRoOiBcIiN7cGF0aH0vI3tuYW1lfVwiXHJcbiAgICAgICAgICB0eXBlOiBpZiByZW1haW5kZXIubGVuZ3RoID4gMCB0aGVuIENsb3VkTWV0YWRhdGEuRm9sZGVyIGVsc2UgQ2xvdWRNZXRhZGF0YS5GaWxlXHJcbiAgICAgICAgICBwcm92aWRlcjogQFxyXG4gICAgY2FsbGJhY2sgbnVsbCwgbGlzdFxyXG5cclxuICByZW1vdmU6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICB0cnlcclxuICAgICAgd2luZG93LmxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtIEBfZ2V0S2V5KG1ldGFkYXRhLm5hbWUpXHJcbiAgICAgIGNhbGxiYWNrPyBudWxsXHJcbiAgICBjYXRjaFxyXG4gICAgICBjYWxsYmFjaz8gJ1VuYWJsZSB0byBkZWxldGUnXHJcblxyXG4gIHJlbmFtZTogKG1ldGFkYXRhLCBuZXdOYW1lLCBjYWxsYmFjaykgLT5cclxuICAgIHRyeVxyXG4gICAgICBjb250ZW50ID0gd2luZG93LmxvY2FsU3RvcmFnZS5nZXRJdGVtIEBfZ2V0S2V5IG1ldGFkYXRhLm5hbWVcclxuICAgICAgd2luZG93LmxvY2FsU3RvcmFnZS5zZXRJdGVtIEBfZ2V0S2V5KG5ld05hbWUpLCBjb250ZW50XHJcbiAgICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSBAX2dldEtleShtZXRhZGF0YS5uYW1lKVxyXG4gICAgICBtZXRhZGF0YS5uYW1lID0gbmV3TmFtZVxyXG4gICAgICBjYWxsYmFjayBudWxsLCBtZXRhZGF0YVxyXG4gICAgY2F0Y2hcclxuICAgICAgY2FsbGJhY2s/ICdVbmFibGUgdG8gcmVuYW1lJ1xyXG5cclxuICBfZ2V0S2V5OiAobmFtZSA9ICcnKSAtPlxyXG4gICAgXCJjZm06OiN7bmFtZX1cIlxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBMb2NhbFN0b3JhZ2VQcm92aWRlclxyXG4iLCJ7ZGl2fSA9IFJlYWN0LkRPTVxyXG5cclxuY2xhc3MgQ2xvdWRGaWxlXHJcbiAgY29udHJ1Y3RvcjogKG9wdGlvbnMpIC0+XHJcbiAgICB7QGNvbnRlbnQsIEBtZXRhZGF0YX0gPSBvcHRpb25zXHJcblxyXG5jbGFzcyBDbG91ZE1ldGFkYXRhXHJcbiAgY29uc3RydWN0b3I6IChvcHRpb25zKSAtPlxyXG4gICAge0BuYW1lLCBAcGF0aCwgQHR5cGUsIEBwcm92aWRlciwgQHByb3ZpZGVyRGF0YT17fSwgQG92ZXJ3cml0YWJsZX0gPSBvcHRpb25zXHJcbiAgQEZvbGRlcjogJ2ZvbGRlcidcclxuICBARmlsZTogJ2ZpbGUnXHJcblxyXG5BdXRob3JpemF0aW9uTm90SW1wbGVtZW50ZWREaWFsb2cgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IFJlYWN0LmNyZWF0ZUNsYXNzXHJcbiAgZGlzcGxheU5hbWU6ICdBdXRob3JpemF0aW9uTm90SW1wbGVtZW50ZWREaWFsb2cnXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgKGRpdiB7fSwgXCJBdXRob3JpemF0aW9uIGRpYWxvZyBub3QgeWV0IGltcGxlbWVudGVkIGZvciAje0Bwcm9wcy5wcm92aWRlci5kaXNwbGF5TmFtZX1cIilcclxuXHJcbmNsYXNzIFByb3ZpZGVySW50ZXJmYWNlXHJcblxyXG4gIGNvbnN0cnVjdG9yOiAob3B0aW9ucykgLT5cclxuICAgIHtAbmFtZSwgQGRpc3BsYXlOYW1lLCBAY2FwYWJpbGl0aWVzfSA9IG9wdGlvbnNcclxuXHJcbiAgQEF2YWlsYWJsZTogLT4gdHJ1ZVxyXG5cclxuICBjYW46IChjYXBhYmlsaXR5KSAtPlxyXG4gICAgQGNhcGFiaWxpdGllc1tjYXBhYmlsaXR5XVxyXG5cclxuICBhdXRob3JpemVkOiAoY2FsbGJhY2spIC0+XHJcbiAgICBpZiBjYWxsYmFja1xyXG4gICAgICBjYWxsYmFjayB0cnVlXHJcbiAgICBlbHNlXHJcbiAgICAgIHRydWVcclxuXHJcbiAgcmVuZGVyQXV0aG9yaXphdGlvbkRpYWxvZzogLT5cclxuICAgIChBdXRob3JpemF0aW9uTm90SW1wbGVtZW50ZWREaWFsb2cge3Byb3ZpZGVyOiBAfSlcclxuXHJcbiAgcmVuZGVyVXNlcjogLT5cclxuICAgIG51bGxcclxuXHJcbiAgZGlhbG9nOiAoY2FsbGJhY2spIC0+XHJcbiAgICBAX25vdEltcGxlbWVudGVkICdkaWFsb2cnXHJcblxyXG4gIHNhdmU6IChjb250ZW50LCBtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICBAX25vdEltcGxlbWVudGVkICdzYXZlJ1xyXG5cclxuICBsb2FkOiAoY2FsbGJhY2spIC0+XHJcbiAgICBAX25vdEltcGxlbWVudGVkICdsb2FkJ1xyXG5cclxuICBsaXN0OiAobWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgQF9ub3RJbXBsZW1lbnRlZCAnbGlzdCdcclxuXHJcbiAgcmVtb3ZlOiAobWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgQF9ub3RJbXBsZW1lbnRlZCAncmVtb3ZlJ1xyXG5cclxuICByZW5hbWU6IChtZXRhZGF0YSwgbmV3TmFtZSwgY2FsbGJhY2spIC0+XHJcbiAgICBAX25vdEltcGxlbWVudGVkICdyZW5hbWUnXHJcblxyXG4gIHBhdGNoOiAobWV0YWRhdGEsIG5ld05hbWUsIGNhbGxiYWNrKSAtPlxyXG4gICAgQF9ub3RJbXBsZW1lbnRlZCAncGF0Y2gnXHJcblxyXG4gIF9ub3RJbXBsZW1lbnRlZDogKG1ldGhvZE5hbWUpIC0+XHJcbiAgICBhbGVydCBcIiN7bWV0aG9kTmFtZX0gbm90IGltcGxlbWVudGVkIGZvciAje0BuYW1lfSBwcm92aWRlclwiXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9XHJcbiAgQ2xvdWRGaWxlOiBDbG91ZEZpbGVcclxuICBDbG91ZE1ldGFkYXRhOiBDbG91ZE1ldGFkYXRhXHJcbiAgUHJvdmlkZXJJbnRlcmZhY2U6IFByb3ZpZGVySW50ZXJmYWNlXHJcbiIsInRyID0gcmVxdWlyZSAnLi4vdXRpbHMvdHJhbnNsYXRlJ1xyXG5pc1N0cmluZyA9IHJlcXVpcmUgJy4uL3V0aWxzL2lzLXN0cmluZydcclxuXHJcblByb3ZpZGVySW50ZXJmYWNlID0gKHJlcXVpcmUgJy4vcHJvdmlkZXItaW50ZXJmYWNlJykuUHJvdmlkZXJJbnRlcmZhY2VcclxuQ2xvdWRNZXRhZGF0YSA9IChyZXF1aXJlICcuL3Byb3ZpZGVyLWludGVyZmFjZScpLkNsb3VkTWV0YWRhdGFcclxuXHJcbmNsYXNzIFJlYWRPbmx5UHJvdmlkZXIgZXh0ZW5kcyBQcm92aWRlckludGVyZmFjZVxyXG5cclxuICBjb25zdHJ1Y3RvcjogKEBvcHRpb25zID0ge30pIC0+XHJcbiAgICBzdXBlclxyXG4gICAgICBuYW1lOiBSZWFkT25seVByb3ZpZGVyLk5hbWVcclxuICAgICAgZGlzcGxheU5hbWU6IEBvcHRpb25zLmRpc3BsYXlOYW1lIG9yICh0ciAnflBST1ZJREVSLlJFQURfT05MWScpXHJcbiAgICAgIGNhcGFiaWxpdGllczpcclxuICAgICAgICBzYXZlOiBmYWxzZVxyXG4gICAgICAgIGxvYWQ6IHRydWVcclxuICAgICAgICBsaXN0OiB0cnVlXHJcbiAgICAgICAgcmVtb3ZlOiBmYWxzZVxyXG4gICAgICAgIHJlbmFtZTogZmFsc2VcclxuICAgIEB0cmVlID0gbnVsbFxyXG5cclxuICBATmFtZTogJ3JlYWRPbmx5J1xyXG5cclxuICBsb2FkOiAobWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgQF9sb2FkVHJlZSAoZXJyLCB0cmVlKSA9PlxyXG4gICAgICByZXR1cm4gY2FsbGJhY2sgZXJyIGlmIGVyclxyXG4gICAgICBwYXJlbnQgPSBAX2ZpbmRQYXJlbnQgbWV0YWRhdGFcclxuICAgICAgaWYgcGFyZW50XHJcbiAgICAgICAgaWYgcGFyZW50W21ldGFkYXRhLm5hbWVdXHJcbiAgICAgICAgICBpZiBwYXJlbnRbbWV0YWRhdGEubmFtZV0ubWV0YWRhdGEudHlwZSBpcyBDbG91ZE1ldGFkYXRhLkZpbGVcclxuICAgICAgICAgICAgY2FsbGJhY2sgbnVsbCwgcGFyZW50W21ldGFkYXRhLm5hbWVdLmNvbnRlbnRcclxuICAgICAgICAgIGVsc2VcclxuICAgICAgICAgICAgY2FsbGJhY2sgXCIje21ldGFkYXRhLm5hbWV9IGlzIGEgZm9sZGVyXCJcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICBjYWxsYmFjayBcIiN7bWV0YWRhdGEubmFtZX0gbm90IGZvdW5kIGluIGZvbGRlclwiXHJcbiAgICAgIGVsc2VcclxuICAgICAgICBjYWxsYmFjayBcIiN7bWV0YWRhdGEubmFtZX0gZm9sZGVyIG5vdCBmb3VuZFwiXHJcblxyXG4gIGxpc3Q6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICBAX2xvYWRUcmVlIChlcnIsIHRyZWUpID0+XHJcbiAgICAgIHJldHVybiBjYWxsYmFjayBlcnIgaWYgZXJyXHJcbiAgICAgIHBhcmVudCA9IEBfZmluZFBhcmVudCBtZXRhZGF0YVxyXG4gICAgICBpZiBwYXJlbnRcclxuICAgICAgICBsaXN0ID0gW11cclxuICAgICAgICBsaXN0LnB1c2ggZmlsZS5tZXRhZGF0YSBmb3Igb3duIGZpbGVuYW1lLCBmaWxlIG9mIHBhcmVudFxyXG4gICAgICAgIGNhbGxiYWNrIG51bGwsIGxpc3RcclxuICAgICAgZWxzZSBpZiBtZXRhZGF0YVxyXG4gICAgICAgIGNhbGxiYWNrIFwiI3ttZXRhZGF0YS5uYW1lfSBmb2xkZXIgbm90IGZvdW5kXCJcclxuXHJcbiAgX2xvYWRUcmVlOiAoY2FsbGJhY2spIC0+XHJcbiAgICBpZiBAdHJlZSBpc250IG51bGxcclxuICAgICAgY2FsbGJhY2sgbnVsbCwgQHRyZWVcclxuICAgIGVsc2UgaWYgQG9wdGlvbnMuanNvblxyXG4gICAgICBAdHJlZSA9IEBfY29udmVydEpTT05Ub01ldGFkYXRhVHJlZSBAb3B0aW9ucy5qc29uXHJcbiAgICAgIGNhbGxiYWNrIG51bGwsIEB0cmVlXHJcbiAgICBlbHNlIGlmIEBvcHRpb25zLmpzb25DYWxsYmFja1xyXG4gICAgICBAb3B0aW9ucy5qc29uQ2FsbGJhY2sgKGVyciwganNvbikgPT5cclxuICAgICAgICBpZiBlcnJcclxuICAgICAgICAgIGNhbGxiYWNrIGVyclxyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgIEB0cmVlID0gQF9jb252ZXJ0SlNPTlRvTWV0YWRhdGFUcmVlIEBvcHRpb25zLmpzb25cclxuICAgICAgICAgIGNhbGxiYWNrIG51bGwsIEB0cmVlXHJcbiAgICBlbHNlIGlmIEBvcHRpb25zLnNyY1xyXG4gICAgICAkLmFqYXhcclxuICAgICAgICBkYXRhVHlwZTogJ2pzb24nXHJcbiAgICAgICAgdXJsOiBAb3B0aW9ucy5zcmNcclxuICAgICAgICBzdWNjZXNzOiAoZGF0YSkgPT5cclxuICAgICAgICAgIEB0cmVlID0gQF9jb252ZXJ0SlNPTlRvTWV0YWRhdGFUcmVlIGRhdGFcclxuICAgICAgICAgIGNhbGxiYWNrIG51bGwsIEB0cmVlXHJcbiAgICAgICAgZXJyb3I6IC0+IGNhbGxiYWNrIFwiVW5hYmxlIHRvIGxvYWQganNvbiBmb3IgI3tAZGlzcGxheU5hbWV9IHByb3ZpZGVyXCJcclxuICAgIGVsc2VcclxuICAgICAgY29uc29sZS5lcnJvcj8gXCJObyBqc29uIG9yIHNyYyBvcHRpb24gZm91bmQgZm9yICN7QGRpc3BsYXlOYW1lfSBwcm92aWRlclwiXHJcbiAgICAgIGNhbGxiYWNrIG51bGwsIHt9XHJcblxyXG4gIF9jb252ZXJ0SlNPTlRvTWV0YWRhdGFUcmVlOiAoanNvbiwgcGF0aFByZWZpeCA9ICcvJykgLT5cclxuICAgIHRyZWUgPSB7fVxyXG4gICAgZm9yIG93biBmaWxlbmFtZSBvZiBqc29uXHJcbiAgICAgIHR5cGUgPSBpZiBpc1N0cmluZyBqc29uW2ZpbGVuYW1lXSB0aGVuIENsb3VkTWV0YWRhdGEuRmlsZSBlbHNlIENsb3VkTWV0YWRhdGEuRm9sZGVyXHJcbiAgICAgIG1ldGFkYXRhID0gbmV3IENsb3VkTWV0YWRhdGFcclxuICAgICAgICBuYW1lOiBmaWxlbmFtZVxyXG4gICAgICAgIHBhdGg6IHBhdGhQcmVmaXggKyBmaWxlbmFtZVxyXG4gICAgICAgIHR5cGU6IHR5cGVcclxuICAgICAgICBwcm92aWRlcjogQFxyXG4gICAgICAgIGNoaWxkcmVuOiBudWxsXHJcbiAgICAgIGlmIHR5cGUgaXMgQ2xvdWRNZXRhZGF0YS5Gb2xkZXJcclxuICAgICAgICBtZXRhZGF0YS5jaGlsZHJlbiA9IF9jb252ZXJ0SlNPTlRvTWV0YWRhdGFUcmVlIGpzb25bZmlsZW5hbWVdLCBwYXRoUHJlZml4ICsgZmlsZW5hbWUgKyAnLydcclxuICAgICAgdHJlZVtmaWxlbmFtZV0gPVxyXG4gICAgICAgIGNvbnRlbnQ6IGpzb25bZmlsZW5hbWVdXHJcbiAgICAgICAgbWV0YWRhdGE6IG1ldGFkYXRhXHJcbiAgICB0cmVlXHJcblxyXG4gIF9maW5kUGFyZW50OiAobWV0YWRhdGEpIC0+XHJcbiAgICBpZiBub3QgbWV0YWRhdGFcclxuICAgICAgQHRyZWVcclxuICAgIGVsc2VcclxuICAgICAgQHRyZWVcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUmVhZE9ubHlQcm92aWRlclxyXG4iLCJ0ciA9IHJlcXVpcmUgJy4vdXRpbHMvdHJhbnNsYXRlJ1xyXG5pc1N0cmluZyA9IHJlcXVpcmUgJy4vdXRpbHMvaXMtc3RyaW5nJ1xyXG5cclxuY2xhc3MgQ2xvdWRGaWxlTWFuYWdlclVJRXZlbnRcclxuXHJcbiAgY29uc3RydWN0b3I6IChAdHlwZSwgQGRhdGEgPSB7fSkgLT5cclxuXHJcbmNsYXNzIENsb3VkRmlsZU1hbmFnZXJVSU1lbnVcclxuXHJcbiAgQERlZmF1bHRNZW51OiBbJ25ld0ZpbGVEaWFsb2cnLCAnb3BlbkZpbGVEaWFsb2cnLCAncmVvcGVuRGlhbG9nJywgJ3NlcGFyYXRvcicsICdzYXZlJywgJ3NhdmVGaWxlQXNEaWFsb2cnLCAnZG93bmxvYWREaWFsb2cnLCAncmVuYW1lRGlhbG9nJ11cclxuXHJcbiAgY29uc3RydWN0b3I6IChvcHRpb25zLCBjbGllbnQpIC0+XHJcbiAgICBzZXRBY3Rpb24gPSAoYWN0aW9uKSAtPlxyXG4gICAgICBjbGllbnRbYWN0aW9uXT8uYmluZChjbGllbnQpIG9yICgtPiBhbGVydCBcIk5vICN7YWN0aW9ufSBhY3Rpb24gaXMgYXZhaWxhYmxlIGluIHRoZSBjbGllbnRcIilcclxuXHJcbiAgICBzZXRFbmFibGVkID0gKGFjdGlvbikgLT5cclxuICAgICAgc3dpdGNoIGFjdGlvblxyXG4gICAgICAgIHdoZW4gJ3Jlb3BlbkRpYWxvZydcclxuICAgICAgICAgIC0+IGNsaWVudC5zdGF0ZS5tZXRhZGF0YT8ucHJvdmlkZXIuY2FuICdsb2FkJ1xyXG4gICAgICAgIHdoZW4gJ3JlbmFtZURpYWxvZydcclxuICAgICAgICAgIC0+IGNsaWVudC5zdGF0ZS5tZXRhZGF0YT8ucHJvdmlkZXIuY2FuICdyZW5hbWUnXHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgdHJ1ZVxyXG5cclxuICAgIG5hbWVzID1cclxuICAgICAgbmV3RmlsZURpYWxvZzogdHIgXCJ+TUVOVS5ORVdcIlxyXG4gICAgICBvcGVuRmlsZURpYWxvZzogdHIgXCJ+TUVOVS5PUEVOXCJcclxuICAgICAgcmVvcGVuRGlhbG9nOiB0ciBcIn5NRU5VLlJFT1BFTlwiXHJcbiAgICAgIHNhdmU6IHRyIFwifk1FTlUuU0FWRVwiXHJcbiAgICAgIHNhdmVGaWxlQXNEaWFsb2c6IHRyIFwifk1FTlUuU0FWRV9BU1wiXHJcbiAgICAgIGRvd25sb2FkRGlhbG9nOiB0ciBcIn5NRU5VLkRPV05MT0FEXCJcclxuICAgICAgcmVuYW1lRGlhbG9nOiB0ciBcIn5NRU5VLlJFTkFNRVwiXHJcblxyXG4gICAgQGl0ZW1zID0gW11cclxuICAgIGZvciBpdGVtIGluIG9wdGlvbnMubWVudVxyXG4gICAgICBtZW51SXRlbSA9IGlmIGl0ZW0gaXMgJ3NlcGFyYXRvcidcclxuICAgICAgICBzZXBhcmF0b3I6IHRydWVcclxuICAgICAgZWxzZSBpZiBpc1N0cmluZyBpdGVtXHJcbiAgICAgICAgbmFtZTogb3B0aW9ucy5tZW51TmFtZXM/W2l0ZW1dIG9yIG5hbWVzW2l0ZW1dIG9yIFwiVW5rbm93biBpdGVtOiAje2l0ZW19XCJcclxuICAgICAgICBlbmFibGVkOiBzZXRFbmFibGVkIGl0ZW1cclxuICAgICAgICBhY3Rpb246IHNldEFjdGlvbiBpdGVtXHJcbiAgICAgIGVsc2VcclxuICAgICAgICAjIGNsaWVudHMgY2FuIHBhc3MgaW4gY3VzdG9tIHtuYW1lOi4uLiwgYWN0aW9uOi4uLn0gbWVudSBpdGVtcyB3aGVyZSB0aGUgYWN0aW9uIGNhbiBiZSBhIGNsaWVudCBmdW5jdGlvbiBuYW1lIG9yIG90aGVyd2lzZSBpdCBpcyBhc3N1bWVkIGFjdGlvbiBpcyBhIGZ1bmN0aW9uXHJcbiAgICAgICAgaWYgaXNTdHJpbmcgaXRlbS5hY3Rpb25cclxuICAgICAgICAgIGl0ZW0uZW5hYmxlZCA9IHNldEVuYWJsZWQgaXRlbS5hY3Rpb25cclxuICAgICAgICAgIGl0ZW0uYWN0aW9uID0gc2V0QWN0aW9uIGl0ZW0uYWN0aW9uXHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgaXRlbS5lbmFibGVkIG9yPSB0cnVlXHJcbiAgICAgICAgaXRlbVxyXG4gICAgICBpZiBtZW51SXRlbVxyXG4gICAgICAgIEBpdGVtcy5wdXNoIG1lbnVJdGVtXHJcblxyXG5jbGFzcyBDbG91ZEZpbGVNYW5hZ2VyVUlcclxuXHJcbiAgY29uc3RydWN0b3I6IChAY2xpZW50KS0+XHJcbiAgICBAbWVudSA9IG51bGxcclxuXHJcbiAgaW5pdDogKG9wdGlvbnMpIC0+XHJcbiAgICBvcHRpb25zID0gb3B0aW9ucyBvciB7fVxyXG4gICAgIyBza2lwIHRoZSBtZW51IGlmIGV4cGxpY2l0eSBzZXQgdG8gbnVsbCAobWVhbmluZyBubyBtZW51KVxyXG4gICAgaWYgb3B0aW9ucy5tZW51IGlzbnQgbnVsbFxyXG4gICAgICBpZiB0eXBlb2Ygb3B0aW9ucy5tZW51IGlzICd1bmRlZmluZWQnXHJcbiAgICAgICAgb3B0aW9ucy5tZW51ID0gQ2xvdWRGaWxlTWFuYWdlclVJTWVudS5EZWZhdWx0TWVudVxyXG4gICAgICBAbWVudSA9IG5ldyBDbG91ZEZpbGVNYW5hZ2VyVUlNZW51IG9wdGlvbnMsIEBjbGllbnRcclxuXHJcbiAgIyBmb3IgUmVhY3QgdG8gbGlzdGVuIGZvciBkaWFsb2cgY2hhbmdlc1xyXG4gIGxpc3RlbjogKEBsaXN0ZW5lckNhbGxiYWNrKSAtPlxyXG5cclxuICBhcHBlbmRNZW51SXRlbTogKGl0ZW0pIC0+XHJcbiAgICBAbGlzdGVuZXJDYWxsYmFjayBuZXcgQ2xvdWRGaWxlTWFuYWdlclVJRXZlbnQgJ2FwcGVuZE1lbnVJdGVtJywgaXRlbVxyXG5cclxuICBzZXRNZW51QmFySW5mbzogKGluZm8pIC0+XHJcbiAgICBAbGlzdGVuZXJDYWxsYmFjayBuZXcgQ2xvdWRGaWxlTWFuYWdlclVJRXZlbnQgJ3NldE1lbnVCYXJJbmZvJywgaW5mb1xyXG5cclxuICBzYXZlRmlsZURpYWxvZzogKGNhbGxiYWNrKSAtPlxyXG4gICAgQF9zaG93UHJvdmlkZXJEaWFsb2cgJ3NhdmVGaWxlJywgKHRyICd+RElBTE9HLlNBVkUnKSwgY2FsbGJhY2tcclxuXHJcbiAgc2F2ZUZpbGVBc0RpYWxvZzogKGNhbGxiYWNrKSAtPlxyXG4gICAgQF9zaG93UHJvdmlkZXJEaWFsb2cgJ3NhdmVGaWxlQXMnLCAodHIgJ35ESUFMT0cuU0FWRV9BUycpLCBjYWxsYmFja1xyXG5cclxuICBvcGVuRmlsZURpYWxvZzogKGNhbGxiYWNrKSAtPlxyXG4gICAgQF9zaG93UHJvdmlkZXJEaWFsb2cgJ29wZW5GaWxlJywgKHRyICd+RElBTE9HLk9QRU4nKSwgY2FsbGJhY2tcclxuXHJcbiAgZG93bmxvYWREaWFsb2c6IChmaWxlbmFtZSwgY29udGVudCwgY2FsbGJhY2spIC0+XHJcbiAgICBAbGlzdGVuZXJDYWxsYmFjayBuZXcgQ2xvdWRGaWxlTWFuYWdlclVJRXZlbnQgJ3Nob3dEb3dubG9hZERpYWxvZycsXHJcbiAgICAgIGZpbGVuYW1lOiBmaWxlbmFtZVxyXG4gICAgICBjb250ZW50OiBjb250ZW50XHJcbiAgICAgIGNhbGxiYWNrOiBjYWxsYmFja1xyXG5cclxuICByZW5hbWVEaWFsb2c6IChmaWxlbmFtZSwgY2FsbGJhY2spIC0+XHJcbiAgICBAbGlzdGVuZXJDYWxsYmFjayBuZXcgQ2xvdWRGaWxlTWFuYWdlclVJRXZlbnQgJ3Nob3dSZW5hbWVEaWFsb2cnLFxyXG4gICAgICBmaWxlbmFtZTogZmlsZW5hbWVcclxuICAgICAgY2FsbGJhY2s6IGNhbGxiYWNrXHJcblxyXG4gIF9zaG93UHJvdmlkZXJEaWFsb2c6IChhY3Rpb24sIHRpdGxlLCBjYWxsYmFjaykgLT5cclxuICAgIEBsaXN0ZW5lckNhbGxiYWNrIG5ldyBDbG91ZEZpbGVNYW5hZ2VyVUlFdmVudCAnc2hvd1Byb3ZpZGVyRGlhbG9nJyxcclxuICAgICAgYWN0aW9uOiBhY3Rpb25cclxuICAgICAgdGl0bGU6IHRpdGxlXHJcbiAgICAgIGNhbGxiYWNrOiBjYWxsYmFja1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPVxyXG4gIENsb3VkRmlsZU1hbmFnZXJVSUV2ZW50OiBDbG91ZEZpbGVNYW5hZ2VyVUlFdmVudFxyXG4gIENsb3VkRmlsZU1hbmFnZXJVSTogQ2xvdWRGaWxlTWFuYWdlclVJXHJcbiAgQ2xvdWRGaWxlTWFuYWdlclVJTWVudTogQ2xvdWRGaWxlTWFuYWdlclVJTWVudVxyXG4iLCJtb2R1bGUuZXhwb3J0cyA9IChwYXJhbSkgLT4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHBhcmFtKSBpcyAnW29iamVjdCBTdHJpbmddJ1xyXG4iLCJtb2R1bGUuZXhwb3J0cyA9XHJcbiAgXCJ+TUVOVUJBUi5VTlRJVExFX0RPQ1VNRU5UXCI6IFwiVW50aXRsZWQgRG9jdW1lbnRcIlxyXG5cclxuICBcIn5NRU5VLk5FV1wiOiBcIk5ld1wiXHJcbiAgXCJ+TUVOVS5PUEVOXCI6IFwiT3BlbiAuLi5cIlxyXG4gIFwifk1FTlUuUkVPUEVOXCI6IFwiUmVvcGVuXCJcclxuICBcIn5NRU5VLlNBVkVcIjogXCJTYXZlXCJcclxuICBcIn5NRU5VLlNBVkVfQVNcIjogXCJTYXZlIEFzIC4uLlwiXHJcbiAgXCJ+TUVOVS5ET1dOTE9BRFwiOiBcIkRvd25sb2FkXCJcclxuICBcIn5NRU5VLlJFTkFNRVwiOiBcIlJlbmFtZVwiXHJcblxyXG4gIFwifkRJQUxPRy5TQVZFXCI6IFwiU2F2ZVwiXHJcbiAgXCJ+RElBTE9HLlNBVkVfQVNcIjogXCJTYXZlIEFzIC4uLlwiXHJcbiAgXCJ+RElBTE9HLk9QRU5cIjogXCJPcGVuXCJcclxuICBcIn5ESUFMT0cuRE9XTkxPQURcIjogXCJEb3dubG9hZFwiXHJcbiAgXCJ+RElBTE9HLlJFTkFNRVwiOiBcIlJlbmFtZVwiXHJcblxyXG4gIFwiflBST1ZJREVSLkxPQ0FMX1NUT1JBR0VcIjogXCJMb2NhbCBTdG9yYWdlXCJcclxuICBcIn5QUk9WSURFUi5SRUFEX09OTFlcIjogXCJSZWFkIE9ubHlcIlxyXG4gIFwiflBST1ZJREVSLkdPT0dMRV9EUklWRVwiOiBcIkdvb2dsZSBEcml2ZVwiXHJcbiAgXCJ+UFJPVklERVIuRE9DVU1FTlRfU1RPUkVcIjogXCJEb2N1bWVudCBTdG9yZVwiXHJcblxyXG4gIFwifkZJTEVfRElBTE9HLkZJTEVOQU1FXCI6IFwiRmlsZW5hbWVcIlxyXG4gIFwifkZJTEVfRElBTE9HLk9QRU5cIjogXCJPcGVuXCJcclxuICBcIn5GSUxFX0RJQUxPRy5TQVZFXCI6IFwiU2F2ZVwiXHJcbiAgXCJ+RklMRV9ESUFMT0cuQ0FOQ0VMXCI6IFwiQ2FuY2VsXCJcclxuICBcIn5GSUxFX0RJQUxPRy5SRU1PVkVcIjogXCJEZWxldGVcIlxyXG4gIFwifkZJTEVfRElBTE9HLlJFTU9WRV9DT05GSVJNXCI6IFwiQXJlIHlvdSBzdXJlIHlvdSB3YW50IHRvIGRlbGV0ZSAle2ZpbGVuYW1lfT9cIlxyXG4gIFwifkZJTEVfRElBTE9HLkxPQURJTkdcIjogXCJMb2FkaW5nLi4uXCJcclxuXHJcbiAgXCJ+RE9XTkxPQURfRElBTE9HLkRPV05MT0FEXCI6IFwiRG93bmxvYWRcIlxyXG4gIFwifkRPV05MT0FEX0RJQUxPRy5DQU5DRUxcIjogXCJDYW5jZWxcIlxyXG5cclxuICBcIn5SRU5BTUVfRElBTE9HLlJFTkFNRVwiOiBcIlJlbmFtZVwiXHJcbiAgXCJ+UkVOQU1FX0RJQUxPRy5DQU5DRUxcIjogXCJDYW5jZWxcIlxyXG5cclxuICBcIn5DT05GSVJNLk9QRU5fRklMRVwiOiBcIllvdSBoYXZlIHVuc2F2ZWQgY2hhbmdlcy4gIEFyZSB5b3Ugc3VyZSB5b3Ugd2FudCBvcGVuIGEgbmV3IGZpbGU/XCJcclxuICBcIn5DT05GSVJNLk5FV19GSUxFXCI6IFwiWW91IGhhdmUgdW5zYXZlZCBjaGFuZ2VzLiAgQXJlIHlvdSBzdXJlIHlvdSB3YW50IGEgbmV3IGZpbGU/XCJcclxuICBcIn5DT05GSVJNLlJFT1BFTl9GSUxFXCI6IFwiWW91IGhhdmUgdW5zYXZlZCBjaGFuZ2VzLiAgQXJlIHlvdSBzdXJlIHlvdSB3YW50IHJlb3BlbiB0aGUgZmlsZSBhbmQgcmV0dXJuIHRvIGl0cyBsYXN0IHNhdmVkIHN0YXRlP1wiXHJcbiIsInRyYW5zbGF0aW9ucyA9ICB7fVxyXG50cmFuc2xhdGlvbnNbJ2VuJ10gPSByZXF1aXJlICcuL2xhbmcvZW4tdXMnXHJcbmRlZmF1bHRMYW5nID0gJ2VuJ1xyXG52YXJSZWdFeHAgPSAvJVxce1xccyooW159XFxzXSopXFxzKlxcfS9nXHJcblxyXG50cmFuc2xhdGUgPSAoa2V5LCB2YXJzPXt9LCBsYW5nPWRlZmF1bHRMYW5nKSAtPlxyXG4gIHRyYW5zbGF0aW9uID0gdHJhbnNsYXRpb25zW2xhbmddP1trZXldIG9yIGtleVxyXG4gIHRyYW5zbGF0aW9uLnJlcGxhY2UgdmFyUmVnRXhwLCAobWF0Y2gsIGtleSkgLT5cclxuICAgIGlmIHZhcnMuaGFzT3duUHJvcGVydHkga2V5IHRoZW4gdmFyc1trZXldIGVsc2UgXCInKiogVUtOT1dOIEtFWTogI3trZXl9ICoqXCJcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gdHJhbnNsYXRlXHJcbiIsIk1lbnVCYXIgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vbWVudS1iYXItdmlldydcclxuUHJvdmlkZXJUYWJiZWREaWFsb2cgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vcHJvdmlkZXItdGFiYmVkLWRpYWxvZy12aWV3J1xyXG5Eb3dubG9hZERpYWxvZyA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9kb3dubG9hZC1kaWFsb2ctdmlldydcclxuUmVuYW1lRGlhbG9nID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL3JlbmFtZS1kaWFsb2ctdmlldydcclxuXHJcbnRyID0gcmVxdWlyZSAnLi4vdXRpbHMvdHJhbnNsYXRlJ1xyXG5cclxue2RpdiwgaWZyYW1lfSA9IFJlYWN0LkRPTVxyXG5cclxuSW5uZXJBcHAgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IFJlYWN0LmNyZWF0ZUNsYXNzXHJcblxyXG4gIGRpc3BsYXlOYW1lOiAnQ2xvdWRGaWxlTWFuYWdlcklubmVyQXBwJ1xyXG5cclxuICBzaG91bGRDb21wb25lbnRVcGRhdGU6IChuZXh0UHJvcHMpIC0+XHJcbiAgICBuZXh0UHJvcHMuYXBwIGlzbnQgQHByb3BzLmFwcFxyXG5cclxuICByZW5kZXI6IC0+XHJcbiAgICAoZGl2IHtjbGFzc05hbWU6ICdpbm5lckFwcCd9LFxyXG4gICAgICAoaWZyYW1lIHtzcmM6IEBwcm9wcy5hcHB9KVxyXG4gICAgKVxyXG5cclxuQXBwID0gUmVhY3QuY3JlYXRlQ2xhc3NcclxuXHJcbiAgZGlzcGxheU5hbWU6ICdDbG91ZEZpbGVNYW5hZ2VyJ1xyXG5cclxuICBnZXRGaWxlbmFtZTogLT5cclxuICAgIGlmIEBwcm9wcy5jbGllbnQuc3RhdGUubWV0YWRhdGE/Lmhhc093blByb3BlcnR5KCduYW1lJykgdGhlbiBAcHJvcHMuY2xpZW50LnN0YXRlLm1ldGFkYXRhLm5hbWUgZWxzZSAodHIgXCJ+TUVOVUJBUi5VTlRJVExFX0RPQ1VNRU5UXCIpXHJcblxyXG4gIGdldFByb3ZpZGVyOiAtPlxyXG4gICAgQHByb3BzLmNsaWVudC5zdGF0ZS5tZXRhZGF0YT8ucHJvdmlkZXJcclxuXHJcbiAgZ2V0SW5pdGlhbFN0YXRlOiAtPlxyXG4gICAgZmlsZW5hbWU6IEBnZXRGaWxlbmFtZSgpXHJcbiAgICBwcm92aWRlcjogQGdldFByb3ZpZGVyKClcclxuICAgIG1lbnVJdGVtczogQHByb3BzLmNsaWVudC5fdWkubWVudT8uaXRlbXMgb3IgW11cclxuICAgIG1lbnVPcHRpb25zOiBAcHJvcHMudWk/Lm1lbnVCYXIgb3Ige31cclxuICAgIHByb3ZpZGVyRGlhbG9nOiBudWxsXHJcbiAgICBkb3dubG9hZERpYWxvZzogbnVsbFxyXG4gICAgcmVuYW1lRGlhbG9nOiBudWxsXHJcbiAgICBkaXJ0eTogZmFsc2VcclxuXHJcbiAgY29tcG9uZW50V2lsbE1vdW50OiAtPlxyXG4gICAgQHByb3BzLmNsaWVudC5saXN0ZW4gKGV2ZW50KSA9PlxyXG4gICAgICBmaWxlU3RhdHVzID0gaWYgZXZlbnQuc3RhdGUuc2F2aW5nXHJcbiAgICAgICAge21lc3NhZ2U6IFwiU2F2aW5nLi4uXCIsIHR5cGU6ICdpbmZvJ31cclxuICAgICAgZWxzZSBpZiBldmVudC5zdGF0ZS5zYXZlZFxyXG4gICAgICAgIHttZXNzYWdlOiBcIkFsbCBjaGFuZ2VzIHNhdmVkIHRvICN7ZXZlbnQuc3RhdGUubWV0YWRhdGEucHJvdmlkZXIuZGlzcGxheU5hbWV9XCIsIHR5cGU6ICdpbmZvJ31cclxuICAgICAgZWxzZSBpZiBldmVudC5zdGF0ZS5kaXJ0eVxyXG4gICAgICAgIHttZXNzYWdlOiAnVW5zYXZlZCcsIHR5cGU6ICdhbGVydCd9XHJcbiAgICAgIGVsc2VcclxuICAgICAgICBudWxsXHJcbiAgICAgIEBzZXRTdGF0ZVxyXG4gICAgICAgIGZpbGVuYW1lOiBAZ2V0RmlsZW5hbWUoKVxyXG4gICAgICAgIHByb3ZpZGVyOiBAZ2V0UHJvdmlkZXIoKVxyXG4gICAgICAgIGZpbGVTdGF0dXM6IGZpbGVTdGF0dXNcclxuXHJcbiAgICAgIHN3aXRjaCBldmVudC50eXBlXHJcbiAgICAgICAgd2hlbiAnY29ubmVjdGVkJ1xyXG4gICAgICAgICAgQHNldFN0YXRlIG1lbnVJdGVtczogQHByb3BzLmNsaWVudC5fdWkubWVudT8uaXRlbXMgb3IgW11cclxuXHJcbiAgICBAcHJvcHMuY2xpZW50Ll91aS5saXN0ZW4gKGV2ZW50KSA9PlxyXG4gICAgICBzd2l0Y2ggZXZlbnQudHlwZVxyXG4gICAgICAgIHdoZW4gJ3Nob3dQcm92aWRlckRpYWxvZydcclxuICAgICAgICAgIEBzZXRTdGF0ZSBwcm92aWRlckRpYWxvZzogZXZlbnQuZGF0YVxyXG4gICAgICAgIHdoZW4gJ3Nob3dEb3dubG9hZERpYWxvZydcclxuICAgICAgICAgIEBzZXRTdGF0ZSBkb3dubG9hZERpYWxvZzogZXZlbnQuZGF0YVxyXG4gICAgICAgIHdoZW4gJ3Nob3dSZW5hbWVEaWFsb2cnXHJcbiAgICAgICAgICBAc2V0U3RhdGUgcmVuYW1lRGlhbG9nOiBldmVudC5kYXRhXHJcbiAgICAgICAgd2hlbiAnYXBwZW5kTWVudUl0ZW0nXHJcbiAgICAgICAgICBAc3RhdGUubWVudUl0ZW1zLnB1c2ggZXZlbnQuZGF0YVxyXG4gICAgICAgICAgQHNldFN0YXRlIG1lbnVJdGVtczogQHN0YXRlLm1lbnVJdGVtc1xyXG4gICAgICAgIHdoZW4gJ3NldE1lbnVCYXJJbmZvJ1xyXG4gICAgICAgICAgQHN0YXRlLm1lbnVPcHRpb25zLmluZm8gPSBldmVudC5kYXRhXHJcbiAgICAgICAgICBAc2V0U3RhdGUgbWVudU9wdGlvbnM6IEBzdGF0ZS5tZW51T3B0aW9uc1xyXG5cclxuICBjbG9zZURpYWxvZ3M6IC0+XHJcbiAgICBAc2V0U3RhdGVcclxuICAgICAgcHJvdmlkZXJEaWFsb2c6IG51bGxcclxuICAgICAgZG93bmxvYWREaWFsb2c6IG51bGxcclxuICAgICAgcmVuYW1lRGlhbG9nOiBudWxsXHJcblxyXG4gIHJlbmRlckRpYWxvZ3M6IC0+XHJcbiAgICBpZiBAc3RhdGUucHJvdmlkZXJEaWFsb2dcclxuICAgICAgKFByb3ZpZGVyVGFiYmVkRGlhbG9nIHtjbGllbnQ6IEBwcm9wcy5jbGllbnQsIGRpYWxvZzogQHN0YXRlLnByb3ZpZGVyRGlhbG9nLCBjbG9zZTogQGNsb3NlRGlhbG9nc30pXHJcbiAgICBlbHNlIGlmIEBzdGF0ZS5kb3dubG9hZERpYWxvZ1xyXG4gICAgICAoRG93bmxvYWREaWFsb2cge2ZpbGVuYW1lOiBAc3RhdGUuZG93bmxvYWREaWFsb2cuZmlsZW5hbWUsIGNvbnRlbnQ6IEBzdGF0ZS5kb3dubG9hZERpYWxvZy5jb250ZW50LCBjbG9zZTogQGNsb3NlRGlhbG9nc30pXHJcbiAgICBlbHNlIGlmIEBzdGF0ZS5yZW5hbWVEaWFsb2dcclxuICAgICAgKFJlbmFtZURpYWxvZyB7ZmlsZW5hbWU6IEBzdGF0ZS5yZW5hbWVEaWFsb2cuZmlsZW5hbWUsIGNhbGxiYWNrOiBAc3RhdGUucmVuYW1lRGlhbG9nLmNhbGxiYWNrLCBjbG9zZTogQGNsb3NlRGlhbG9nc30pXHJcblxyXG4gIHJlbmRlcjogLT5cclxuICAgIGlmIEBwcm9wcy51c2luZ0lmcmFtZVxyXG4gICAgICAoZGl2IHtjbGFzc05hbWU6ICdhcHAnfSxcclxuICAgICAgICAoTWVudUJhciB7ZmlsZW5hbWU6IEBzdGF0ZS5maWxlbmFtZSwgcHJvdmlkZXI6IEBzdGF0ZS5wcm92aWRlciwgZmlsZVN0YXR1czogQHN0YXRlLmZpbGVTdGF0dXMsIGl0ZW1zOiBAc3RhdGUubWVudUl0ZW1zLCBvcHRpb25zOiBAc3RhdGUubWVudU9wdGlvbnN9KVxyXG4gICAgICAgIChJbm5lckFwcCB7YXBwOiBAcHJvcHMuYXBwfSlcclxuICAgICAgICBAcmVuZGVyRGlhbG9ncygpXHJcbiAgICAgIClcclxuICAgIGVsc2UgaWYgQHN0YXRlLnByb3ZpZGVyRGlhbG9nIG9yIEBzdGF0ZS5kb3dubG9hZERpYWxvZ1xyXG4gICAgICAoZGl2IHtjbGFzc05hbWU6ICdhcHAnfSxcclxuICAgICAgICBAcmVuZGVyRGlhbG9ncygpXHJcbiAgICAgIClcclxuICAgIGVsc2VcclxuICAgICAgbnVsbFxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBBcHBcclxuIiwiQXV0aG9yaXplTWl4aW4gPVxyXG4gIGdldEluaXRpYWxTdGF0ZTogLT5cclxuICAgIGF1dGhvcml6ZWQ6IGZhbHNlXHJcblxyXG4gIGNvbXBvbmVudFdpbGxNb3VudDogLT5cclxuICAgIEBwcm9wcy5wcm92aWRlci5hdXRob3JpemVkIChhdXRob3JpemVkKSA9PlxyXG4gICAgICBAc2V0U3RhdGUgYXV0aG9yaXplZDogYXV0aG9yaXplZFxyXG5cclxuICByZW5kZXI6IC0+XHJcbiAgICBpZiBAc3RhdGUuYXV0aG9yaXplZFxyXG4gICAgICBAcmVuZGVyV2hlbkF1dGhvcml6ZWQoKVxyXG4gICAgZWxzZVxyXG4gICAgICBAcHJvcHMucHJvdmlkZXIucmVuZGVyQXV0aG9yaXphdGlvbkRpYWxvZygpXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEF1dGhvcml6ZU1peGluXHJcbiIsIntkaXYsIGlucHV0LCBhLCBidXR0b259ID0gUmVhY3QuRE9NXHJcblxyXG5Nb2RhbERpYWxvZyA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9tb2RhbC1kaWFsb2ctdmlldydcclxuXHJcbnRyID0gcmVxdWlyZSAnLi4vdXRpbHMvdHJhbnNsYXRlJ1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzc1xyXG5cclxuICBkaXNwbGF5TmFtZTogJ0Rvd25sb2FkRGlhbG9nVmlldydcclxuXHJcbiAgZ2V0SW5pdGlhbFN0YXRlOiAtPlxyXG4gICAgZmlsZW5hbWUgPSBAcHJvcHMuZmlsZW5hbWUgb3IgJydcclxuICAgIHN0YXRlID1cclxuICAgICAgZmlsZW5hbWU6IGZpbGVuYW1lXHJcbiAgICAgIHRyaW1tZWRGaWxlbmFtZTogQHRyaW0gZmlsZW5hbWVcclxuXHJcbiAgY29tcG9uZW50RGlkTW91bnQ6IC0+XHJcbiAgICBAZmlsZW5hbWUgPSBSZWFjdC5maW5kRE9NTm9kZSBAcmVmcy5maWxlbmFtZVxyXG4gICAgQGZpbGVuYW1lLmZvY3VzKClcclxuXHJcbiAgdXBkYXRlRmlsZW5hbWU6IC0+XHJcbiAgICBmaWxlbmFtZSA9IEBmaWxlbmFtZS52YWx1ZVxyXG4gICAgQHNldFN0YXRlXHJcbiAgICAgIGZpbGVuYW1lOiBmaWxlbmFtZVxyXG4gICAgICB0cmltbWVkRmlsZW5hbWU6IEB0cmltIGZpbGVuYW1lXHJcblxyXG4gIHRyaW06IChzKSAtPlxyXG4gICAgcy5yZXBsYWNlIC9eXFxzK3xcXHMrJC8sICcnXHJcblxyXG4gIGRvd25sb2FkOiAoZSkgLT5cclxuICAgIGlmIEBzdGF0ZS50cmltbWVkRmlsZW5hbWUubGVuZ3RoID4gMFxyXG4gICAgICBlLnRhcmdldC5zZXRBdHRyaWJ1dGUgJ2hyZWYnLCBcImRhdGE6dGV4dC9wbGFpbiwje2VuY29kZVVSSUNvbXBvbmVudChAcHJvcHMuY29udGVudCl9XCJcclxuICAgICAgQHByb3BzLmNsb3NlKClcclxuICAgIGVsc2VcclxuICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXHJcbiAgICAgIEBmaWxlbmFtZS5mb2N1cygpXHJcblxyXG4gIHJlbmRlcjogLT5cclxuICAgIChNb2RhbERpYWxvZyB7dGl0bGU6ICh0ciAnfkRJQUxPRy5ET1dOTE9BRCcpLCBjbG9zZTogQHByb3BzLmNsb3NlfSxcclxuICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnZG93bmxvYWQtZGlhbG9nJ30sXHJcbiAgICAgICAgKGlucHV0IHtyZWY6ICdmaWxlbmFtZScsIHBsYWNlaG9sZGVyOiAnRmlsZW5hbWUnLCB2YWx1ZTogQHN0YXRlLmZpbGVuYW1lLCBvbkNoYW5nZTogQHVwZGF0ZUZpbGVuYW1lfSlcclxuICAgICAgICAoZGl2IHtjbGFzc05hbWU6ICdidXR0b25zJ30sXHJcbiAgICAgICAgICAoYSB7aHJlZjogJyMnLCBjbGFzc05hbWU6IChpZiBAc3RhdGUudHJpbW1lZEZpbGVuYW1lLmxlbmd0aCBpcyAwIHRoZW4gJ2Rpc2FibGVkJyBlbHNlICcnKSwgZG93bmxvYWQ6IEBzdGF0ZS50cmltbWVkRmlsZW5hbWUsIG9uQ2xpY2s6IEBkb3dubG9hZH0sIHRyICd+RE9XTkxPQURfRElBTE9HLkRPV05MT0FEJylcclxuICAgICAgICAgIChidXR0b24ge29uQ2xpY2s6IEBwcm9wcy5jbG9zZX0sIHRyICd+RE9XTkxPQURfRElBTE9HLkNBTkNFTCcpXHJcbiAgICAgICAgKVxyXG4gICAgICApXHJcbiAgICApXHJcbiIsIntkaXYsIGksIHNwYW4sIHVsLCBsaX0gPSBSZWFjdC5ET01cclxuXHJcbkRyb3Bkb3duSXRlbSA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgUmVhY3QuY3JlYXRlQ2xhc3NcclxuXHJcbiAgZGlzcGxheU5hbWU6ICdEcm9wZG93bkl0ZW0nXHJcblxyXG4gIGNsaWNrZWQ6IC0+XHJcbiAgICBAcHJvcHMuc2VsZWN0IEBwcm9wcy5pdGVtXHJcblxyXG4gIHJlbmRlcjogLT5cclxuICAgIGVuYWJsZWQgPSBpZiBAcHJvcHMuaXRlbS5oYXNPd25Qcm9wZXJ0eSAnZW5hYmxlZCdcclxuICAgICAgaWYgdHlwZW9mIEBwcm9wcy5pdGVtLmVuYWJsZWQgaXMgJ2Z1bmN0aW9uJ1xyXG4gICAgICAgIEBwcm9wcy5pdGVtLmVuYWJsZWQoKVxyXG4gICAgICBlbHNlXHJcbiAgICAgICAgQHByb3BzLml0ZW0uZW5hYmxlZFxyXG4gICAgZWxzZVxyXG4gICAgICB0cnVlXHJcblxyXG4gICAgY2xhc3NlcyA9IFsnbWVudUl0ZW0nXVxyXG4gICAgaWYgQHByb3BzLml0ZW0uc2VwYXJhdG9yXHJcbiAgICAgIGNsYXNzZXMucHVzaCAnc2VwYXJhdG9yJ1xyXG4gICAgICAobGkge2NsYXNzTmFtZTogY2xhc3Nlcy5qb2luKCcgJyl9LCAnJylcclxuICAgIGVsc2VcclxuICAgICAgY2xhc3Nlcy5wdXNoICdkaXNhYmxlZCcgaWYgbm90IGVuYWJsZWQgb3IgKEBwcm9wcy5pc0FjdGlvbk1lbnUgYW5kIG5vdCBAcHJvcHMuaXRlbS5hY3Rpb24pXHJcbiAgICAgIG5hbWUgPSBAcHJvcHMuaXRlbS5uYW1lIG9yIEBwcm9wcy5pdGVtXHJcbiAgICAgIChsaSB7Y2xhc3NOYW1lOiBjbGFzc2VzLmpvaW4oJyAnKSwgb25DbGljazogQGNsaWNrZWQgfSwgbmFtZSlcclxuXHJcbkRyb3BEb3duID0gUmVhY3QuY3JlYXRlQ2xhc3NcclxuXHJcbiAgZGlzcGxheU5hbWU6ICdEcm9wZG93bidcclxuXHJcbiAgZ2V0RGVmYXVsdFByb3BzOiAtPlxyXG4gICAgaXNBY3Rpb25NZW51OiB0cnVlICAgICAgICAgICAgICAjIFdoZXRoZXIgZWFjaCBpdGVtIGNvbnRhaW5zIGl0cyBvd24gYWN0aW9uXHJcbiAgICBvblNlbGVjdDogKGl0ZW0pIC0+ICAgICAgICAgICAgICMgSWYgbm90LCBAcHJvcHMub25TZWxlY3QgaXMgY2FsbGVkXHJcbiAgICAgIGxvZy5pbmZvIFwiU2VsZWN0ZWQgI3tpdGVtfVwiXHJcblxyXG4gIGdldEluaXRpYWxTdGF0ZTogLT5cclxuICAgIHNob3dpbmdNZW51OiBmYWxzZVxyXG4gICAgdGltZW91dDogbnVsbFxyXG5cclxuICBibHVyOiAtPlxyXG4gICAgQHVuYmx1cigpXHJcbiAgICB0aW1lb3V0ID0gc2V0VGltZW91dCAoID0+IEBzZXRTdGF0ZSB7c2hvd2luZ01lbnU6IGZhbHNlfSApLCA1MDBcclxuICAgIEBzZXRTdGF0ZSB7dGltZW91dDogdGltZW91dH1cclxuXHJcbiAgdW5ibHVyOiAtPlxyXG4gICAgaWYgQHN0YXRlLnRpbWVvdXRcclxuICAgICAgY2xlYXJUaW1lb3V0KEBzdGF0ZS50aW1lb3V0KVxyXG4gICAgQHNldFN0YXRlIHt0aW1lb3V0OiBudWxsfVxyXG5cclxuICBzZWxlY3Q6IChpdGVtKSAtPlxyXG4gICAgbmV4dFN0YXRlID0gKG5vdCBAc3RhdGUuc2hvd2luZ01lbnUpXHJcbiAgICBAc2V0U3RhdGUge3Nob3dpbmdNZW51OiBuZXh0U3RhdGV9XHJcbiAgICByZXR1cm4gdW5sZXNzIGl0ZW1cclxuICAgIGlmIEBwcm9wcy5pc0FjdGlvbk1lbnUgYW5kIGl0ZW0uYWN0aW9uXHJcbiAgICAgIGl0ZW0uYWN0aW9uKClcclxuICAgIGVsc2VcclxuICAgICAgQHByb3BzLm9uU2VsZWN0IGl0ZW1cclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgbWVudUNsYXNzID0gaWYgQHN0YXRlLnNob3dpbmdNZW51IHRoZW4gJ21lbnUtc2hvd2luZycgZWxzZSAnbWVudS1oaWRkZW4nXHJcbiAgICBzZWxlY3QgPSAoaXRlbSkgPT5cclxuICAgICAgKCA9PiBAc2VsZWN0KGl0ZW0pKVxyXG4gICAgKGRpdiB7Y2xhc3NOYW1lOiAnbWVudSd9LFxyXG4gICAgICAoc3BhbiB7Y2xhc3NOYW1lOiAnbWVudS1hbmNob3InLCBvbkNsaWNrOiA9PiBAc2VsZWN0KG51bGwpfSxcclxuICAgICAgICBAcHJvcHMuYW5jaG9yXHJcbiAgICAgICAgKGkge2NsYXNzTmFtZTogJ2ljb24tYXJyb3ctZXhwYW5kJ30pXHJcbiAgICAgIClcclxuICAgICAgaWYgQHByb3BzLml0ZW1zPy5sZW5ndGggPiAwXHJcbiAgICAgICAgKGRpdiB7Y2xhc3NOYW1lOiBtZW51Q2xhc3MsIG9uTW91c2VMZWF2ZTogQGJsdXIsIG9uTW91c2VFbnRlcjogQHVuYmx1cn0sXHJcbiAgICAgICAgICAodWwge30sXHJcbiAgICAgICAgICAgIChEcm9wZG93bkl0ZW0ge2tleTogaW5kZXgsIGl0ZW06IGl0ZW0sIHNlbGVjdDogQHNlbGVjdCwgaXNBY3Rpb25NZW51OiBAcHJvcHMuaXNBY3Rpb25NZW51fSkgZm9yIGl0ZW0sIGluZGV4IGluIEBwcm9wcy5pdGVtc1xyXG4gICAgICAgICAgKVxyXG4gICAgICAgIClcclxuICAgIClcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gRHJvcERvd25cclxuIiwiQXV0aG9yaXplTWl4aW4gPSByZXF1aXJlICcuL2F1dGhvcml6ZS1taXhpbidcclxuQ2xvdWRNZXRhZGF0YSA9IChyZXF1aXJlICcuLi9wcm92aWRlcnMvcHJvdmlkZXItaW50ZXJmYWNlJykuQ2xvdWRNZXRhZGF0YVxyXG5cclxudHIgPSByZXF1aXJlICcuLi91dGlscy90cmFuc2xhdGUnXHJcblxyXG57ZGl2LCBpbWcsIGksIHNwYW4sIGlucHV0LCBidXR0b259ID0gUmVhY3QuRE9NXHJcblxyXG5GaWxlTGlzdEZpbGUgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IFJlYWN0LmNyZWF0ZUNsYXNzXHJcbiAgZGlzcGxheU5hbWU6ICdGaWxlTGlzdEZpbGUnXHJcblxyXG4gIGNvbXBvbmVudFdpbGxNb3VudDogLT5cclxuICAgIEBsYXN0Q2xpY2sgPSAwXHJcblxyXG4gIGZpbGVTZWxlY3RlZDogIChlKSAtPlxyXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXHJcbiAgICBlLnN0b3BQcm9wYWdhdGlvbigpXHJcbiAgICBub3cgPSAobmV3IERhdGUoKSkuZ2V0VGltZSgpXHJcbiAgICBAcHJvcHMuZmlsZVNlbGVjdGVkIEBwcm9wcy5tZXRhZGF0YVxyXG4gICAgaWYgbm93IC0gQGxhc3RDbGljayA8PSAyNTBcclxuICAgICAgQHByb3BzLmZpbGVDb25maXJtZWQoKVxyXG4gICAgQGxhc3RDbGljayA9IG5vd1xyXG5cclxuICByZW5kZXI6IC0+XHJcbiAgICAoZGl2IHtrZXk6IEBwcm9wcy5rZXksIGNsYXNzTmFtZTogKGlmIEBwcm9wcy5zZWxlY3RlZCB0aGVuICdzZWxlY3RlZCcgZWxzZSAnJyksIG9uQ2xpY2s6IEBmaWxlU2VsZWN0ZWR9LCBAcHJvcHMubWV0YWRhdGEubmFtZSlcclxuXHJcbkZpbGVMaXN0ID0gUmVhY3QuY3JlYXRlRmFjdG9yeSBSZWFjdC5jcmVhdGVDbGFzc1xyXG4gIGRpc3BsYXlOYW1lOiAnRmlsZUxpc3QnXHJcblxyXG4gIGdldEluaXRpYWxTdGF0ZTogLT5cclxuICAgIGxvYWRpbmc6IHRydWVcclxuXHJcbiAgY29tcG9uZW50RGlkTW91bnQ6IC0+XHJcbiAgICBAbG9hZCgpXHJcblxyXG4gIGxvYWQ6IC0+XHJcbiAgICBAcHJvcHMucHJvdmlkZXIubGlzdCBAcHJvcHMuZm9sZGVyLCAoZXJyLCBsaXN0KSA9PlxyXG4gICAgICByZXR1cm4gYWxlcnQoZXJyKSBpZiBlcnJcclxuICAgICAgQHNldFN0YXRlXHJcbiAgICAgICAgbG9hZGluZzogZmFsc2VcclxuICAgICAgQHByb3BzLmxpc3RMb2FkZWQgbGlzdFxyXG5cclxuICByZW5kZXI6IC0+XHJcbiAgICAoZGl2IHtjbGFzc05hbWU6ICdmaWxlbGlzdCd9LFxyXG4gICAgICBpZiBAc3RhdGUubG9hZGluZ1xyXG4gICAgICAgIHRyIFwifkZJTEVfRElBTE9HLkxPQURJTkdcIlxyXG4gICAgICBlbHNlXHJcbiAgICAgICAgZm9yIG1ldGFkYXRhLCBpIGluIEBwcm9wcy5saXN0XHJcbiAgICAgICAgICAoRmlsZUxpc3RGaWxlIHtrZXk6IGksIG1ldGFkYXRhOiBtZXRhZGF0YSwgc2VsZWN0ZWQ6IEBwcm9wcy5zZWxlY3RlZEZpbGUgaXMgbWV0YWRhdGEsIGZpbGVTZWxlY3RlZDogQHByb3BzLmZpbGVTZWxlY3RlZCwgZmlsZUNvbmZpcm1lZDogQHByb3BzLmZpbGVDb25maXJtZWR9KVxyXG4gICAgKVxyXG5cclxuRmlsZURpYWxvZ1RhYiA9IFJlYWN0LmNyZWF0ZUNsYXNzXHJcbiAgZGlzcGxheU5hbWU6ICdGaWxlRGlhbG9nVGFiJ1xyXG5cclxuICBtaXhpbnM6IFtBdXRob3JpemVNaXhpbl1cclxuXHJcbiAgZ2V0SW5pdGlhbFN0YXRlOiAtPlxyXG4gICAgZm9sZGVyOiBAcHJvcHMuY2xpZW50LnN0YXRlLm1ldGFkYXRhPy5wYXJlbnQgb3IgbnVsbFxyXG4gICAgbWV0YWRhdGE6IEBwcm9wcy5jbGllbnQuc3RhdGUubWV0YWRhdGFcclxuICAgIGZpbGVuYW1lOiBAcHJvcHMuY2xpZW50LnN0YXRlLm1ldGFkYXRhPy5uYW1lIG9yICcnXHJcbiAgICBsaXN0OiBbXVxyXG5cclxuICBjb21wb25lbnRXaWxsTW91bnQ6IC0+XHJcbiAgICBAaXNPcGVuID0gQHByb3BzLmRpYWxvZy5hY3Rpb24gaXMgJ29wZW5GaWxlJ1xyXG5cclxuICBmaWxlbmFtZUNoYW5nZWQ6IChlKSAtPlxyXG4gICAgZmlsZW5hbWUgPSBlLnRhcmdldC52YWx1ZVxyXG4gICAgbWV0YWRhdGEgPSBAZmluZE1ldGFkYXRhIGZpbGVuYW1lXHJcbiAgICBAc2V0U3RhdGVcclxuICAgICAgZmlsZW5hbWU6IGZpbGVuYW1lXHJcbiAgICAgIG1ldGFkYXRhOiBtZXRhZGF0YVxyXG5cclxuICBsaXN0TG9hZGVkOiAobGlzdCkgLT5cclxuICAgIEBzZXRTdGF0ZSBsaXN0OiBsaXN0XHJcblxyXG4gIGZpbGVTZWxlY3RlZDogKG1ldGFkYXRhKSAtPlxyXG4gICAgaWYgbWV0YWRhdGE/LnR5cGUgaXMgQ2xvdWRNZXRhZGF0YS5GaWxlXHJcbiAgICAgIEBzZXRTdGF0ZSBmaWxlbmFtZTogbWV0YWRhdGEubmFtZVxyXG4gICAgQHNldFN0YXRlIG1ldGFkYXRhOiBtZXRhZGF0YVxyXG5cclxuICBjb25maXJtOiAtPlxyXG4gICAgaWYgbm90IEBzdGF0ZS5tZXRhZGF0YVxyXG4gICAgICBmaWxlbmFtZSA9ICQudHJpbSBAc3RhdGUuZmlsZW5hbWVcclxuICAgICAgQHN0YXRlLm1ldGFkYXRhID0gQGZpbmRNZXRhZGF0YSBmaWxlbmFtZVxyXG4gICAgICBpZiBub3QgQHN0YXRlLm1ldGFkYXRhXHJcbiAgICAgICAgaWYgQGlzT3BlblxyXG4gICAgICAgICAgYWxlcnQgXCIje0BzdGF0ZS5maWxlbmFtZX0gbm90IGZvdW5kXCJcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICBAc3RhdGUubWV0YWRhdGEgPSBuZXcgQ2xvdWRNZXRhZGF0YVxyXG4gICAgICAgICAgICBuYW1lOiBmaWxlbmFtZVxyXG4gICAgICAgICAgICBwYXRoOiBcIi8je2ZpbGVuYW1lfVwiICMgVE9ETzogRml4IHBhdGhcclxuICAgICAgICAgICAgdHlwZTogQ2xvdWRNZXRhZGF0YS5GaWxlXHJcbiAgICAgICAgICAgIHByb3ZpZGVyOiBAcHJvcHMucHJvdmlkZXJcclxuICAgIGlmIEBzdGF0ZS5tZXRhZGF0YVxyXG4gICAgICAjIGVuc3VyZSB0aGUgbWV0YWRhdGEgcHJvdmlkZXIgaXMgdGhlIGN1cnJlbnRseS1zaG93aW5nIHRhYlxyXG4gICAgICBAc3RhdGUubWV0YWRhdGEucHJvdmlkZXIgPSBAcHJvcHMucHJvdmlkZXJcclxuICAgICAgQHByb3BzLmRpYWxvZy5jYWxsYmFjayBAc3RhdGUubWV0YWRhdGFcclxuICAgICAgQHByb3BzLmNsb3NlKClcclxuXHJcbiAgcmVtb3ZlOiAtPlxyXG4gICAgaWYgQHN0YXRlLm1ldGFkYXRhIGFuZCBAc3RhdGUubWV0YWRhdGEudHlwZSBpc250IENsb3VkTWV0YWRhdGEuRm9sZGVyIGFuZCBjb25maXJtKHRyKFwifkZJTEVfRElBTE9HLlJFTU9WRV9DT05GSVJNXCIsIHtmaWxlbmFtZTogQHN0YXRlLm1ldGFkYXRhLm5hbWV9KSlcclxuICAgICAgQHByb3BzLnByb3ZpZGVyLnJlbW92ZSBAc3RhdGUubWV0YWRhdGEsIChlcnIpID0+XHJcbiAgICAgICAgaWYgbm90IGVyclxyXG4gICAgICAgICAgbGlzdCA9IEBzdGF0ZS5saXN0LnNsaWNlIDBcclxuICAgICAgICAgIGluZGV4ID0gbGlzdC5pbmRleE9mIEBzdGF0ZS5tZXRhZGF0YVxyXG4gICAgICAgICAgbGlzdC5zcGxpY2UgaW5kZXgsIDFcclxuICAgICAgICAgIEBzZXRTdGF0ZVxyXG4gICAgICAgICAgICBsaXN0OiBsaXN0XHJcbiAgICAgICAgICAgIG1ldGFkYXRhOiBudWxsXHJcbiAgICAgICAgICAgIGZpbGVuYW1lOiAnJ1xyXG5cclxuICBjYW5jZWw6IC0+XHJcbiAgICBAcHJvcHMuY2xvc2UoKVxyXG5cclxuICBmaW5kTWV0YWRhdGE6IChmaWxlbmFtZSkgLT5cclxuICAgIGZvciBtZXRhZGF0YSBpbiBAc3RhdGUubGlzdFxyXG4gICAgICBpZiBtZXRhZGF0YS5uYW1lIGlzIGZpbGVuYW1lXHJcbiAgICAgICAgcmV0dXJuIG1ldGFkYXRhXHJcbiAgICBudWxsXHJcblxyXG4gIHdhdGNoRm9yRW50ZXI6IChlKSAtPlxyXG4gICAgaWYgZS5rZXlDb2RlIGlzIDEzIGFuZCBub3QgQGNvbmZpcm1EaXNhYmxlZCgpXHJcbiAgICAgIEBjb25maXJtKClcclxuXHJcbiAgY29uZmlybURpc2FibGVkOiAtPlxyXG4gICAgKEBzdGF0ZS5maWxlbmFtZS5sZW5ndGggaXMgMCkgb3IgKEBpc09wZW4gYW5kIG5vdCBAc3RhdGUubWV0YWRhdGEpXHJcblxyXG4gIHJlbmRlcldoZW5BdXRob3JpemVkOiAtPlxyXG4gICAgY29uZmlybURpc2FibGVkID0gQGNvbmZpcm1EaXNhYmxlZCgpXHJcbiAgICByZW1vdmVEaXNhYmxlZCA9IChAc3RhdGUubWV0YWRhdGEgaXMgbnVsbCkgb3IgKEBzdGF0ZS5tZXRhZGF0YS50eXBlIGlzIENsb3VkTWV0YWRhdGEuRm9sZGVyKVxyXG5cclxuICAgIChkaXYge2NsYXNzTmFtZTogJ2RpYWxvZ1RhYid9LFxyXG4gICAgICAoaW5wdXQge3R5cGU6ICd0ZXh0JywgdmFsdWU6IEBzdGF0ZS5maWxlbmFtZSwgcGxhY2Vob2xkZXI6ICh0ciBcIn5GSUxFX0RJQUxPRy5GSUxFTkFNRVwiKSwgb25DaGFuZ2U6IEBmaWxlbmFtZUNoYW5nZWQsIG9uS2V5RG93bjogQHdhdGNoRm9yRW50ZXJ9KVxyXG4gICAgICAoRmlsZUxpc3Qge3Byb3ZpZGVyOiBAcHJvcHMucHJvdmlkZXIsIGZvbGRlcjogQHN0YXRlLmZvbGRlciwgc2VsZWN0ZWRGaWxlOiBAc3RhdGUubWV0YWRhdGEsIGZpbGVTZWxlY3RlZDogQGZpbGVTZWxlY3RlZCwgZmlsZUNvbmZpcm1lZDogQGNvbmZpcm0sIGxpc3Q6IEBzdGF0ZS5saXN0LCBsaXN0TG9hZGVkOiBAbGlzdExvYWRlZH0pXHJcbiAgICAgIChkaXYge2NsYXNzTmFtZTogJ2J1dHRvbnMnfSxcclxuICAgICAgICAoYnV0dG9uIHtvbkNsaWNrOiBAY29uZmlybSwgZGlzYWJsZWQ6IGNvbmZpcm1EaXNhYmxlZCwgY2xhc3NOYW1lOiBpZiBjb25maXJtRGlzYWJsZWQgdGhlbiAnZGlzYWJsZWQnIGVsc2UgJyd9LCBpZiBAaXNPcGVuIHRoZW4gKHRyIFwifkZJTEVfRElBTE9HLk9QRU5cIikgZWxzZSAodHIgXCJ+RklMRV9ESUFMT0cuU0FWRVwiKSlcclxuICAgICAgICBpZiBAcHJvcHMucHJvdmlkZXIuY2FuICdyZW1vdmUnXHJcbiAgICAgICAgICAoYnV0dG9uIHtvbkNsaWNrOiBAcmVtb3ZlLCBkaXNhYmxlZDogcmVtb3ZlRGlzYWJsZWQsIGNsYXNzTmFtZTogaWYgcmVtb3ZlRGlzYWJsZWQgdGhlbiAnZGlzYWJsZWQnIGVsc2UgJyd9LCAodHIgXCJ+RklMRV9ESUFMT0cuUkVNT1ZFXCIpKVxyXG4gICAgICAgIChidXR0b24ge29uQ2xpY2s6IEBjYW5jZWx9LCAodHIgXCJ+RklMRV9ESUFMT0cuQ0FOQ0VMXCIpKVxyXG4gICAgICApXHJcbiAgICApXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEZpbGVEaWFsb2dUYWJcclxuIiwie2RpdiwgaSwgc3Bhbn0gPSBSZWFjdC5ET01cclxuXHJcbkRyb3Bkb3duID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL2Ryb3Bkb3duLXZpZXcnXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzXHJcblxyXG4gIGRpc3BsYXlOYW1lOiAnTWVudUJhcidcclxuXHJcbiAgaGVscDogLT5cclxuICAgIHdpbmRvdy5vcGVuIEBwcm9wcy5vcHRpb25zLmhlbHAsICdfYmxhbmsnXHJcblxyXG4gIHJlbmRlcjogLT5cclxuICAgIChkaXYge2NsYXNzTmFtZTogJ21lbnUtYmFyJ30sXHJcbiAgICAgIChkaXYge2NsYXNzTmFtZTogJ21lbnUtYmFyLWxlZnQnfSxcclxuICAgICAgICAoRHJvcGRvd24ge1xyXG4gICAgICAgICAgYW5jaG9yOiBAcHJvcHMuZmlsZW5hbWVcclxuICAgICAgICAgIGl0ZW1zOiBAcHJvcHMuaXRlbXNcclxuICAgICAgICAgIGNsYXNzTmFtZTonbWVudS1iYXItY29udGVudC1maWxlbmFtZSd9KVxyXG4gICAgICAgIGlmIEBwcm9wcy5maWxlU3RhdHVzXHJcbiAgICAgICAgICAoc3BhbiB7Y2xhc3NOYW1lOiBcIm1lbnUtYmFyLWZpbGUtc3RhdHVzLSN7QHByb3BzLmZpbGVTdGF0dXMudHlwZX1cIn0sIEBwcm9wcy5maWxlU3RhdHVzLm1lc3NhZ2UpXHJcbiAgICAgIClcclxuICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnbWVudS1iYXItcmlnaHQnfSxcclxuICAgICAgICBpZiBAcHJvcHMub3B0aW9ucy5pbmZvXHJcbiAgICAgICAgICAoc3BhbiB7Y2xhc3NOYW1lOiAnbWVudS1iYXItaW5mbyd9LCBAcHJvcHMub3B0aW9ucy5pbmZvKVxyXG4gICAgICAgIGlmIEBwcm9wcy5wcm92aWRlciBhbmQgQHByb3BzLnByb3ZpZGVyLmF1dGhvcml6ZWQoKVxyXG4gICAgICAgICAgQHByb3BzLnByb3ZpZGVyLnJlbmRlclVzZXIoKVxyXG4gICAgICAgIGlmIEBwcm9wcy5vcHRpb25zLmhlbHBcclxuICAgICAgICAgIChpIHtzdHlsZToge2ZvbnRTaXplOiBcIjEzcHhcIn0sIGNsYXNzTmFtZTogJ2NsaWNrYWJsZSBpY29uLWhlbHAnLCBvbkNsaWNrOiBAaGVscH0pXHJcbiAgICAgIClcclxuICAgIClcclxuIiwiTW9kYWwgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vbW9kYWwtdmlldydcclxue2RpdiwgaX0gPSBSZWFjdC5ET01cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3NcclxuXHJcbiAgZGlzcGxheU5hbWU6ICdNb2RhbERpYWxvZydcclxuXHJcbiAgY2xvc2U6IC0+XHJcbiAgICBAcHJvcHMuY2xvc2U/KClcclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgKE1vZGFsIHtjbG9zZTogQHByb3BzLmNsb3NlfSxcclxuICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnbW9kYWwtZGlhbG9nJ30sXHJcbiAgICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnbW9kYWwtZGlhbG9nLXdyYXBwZXInfSxcclxuICAgICAgICAgIChkaXYge2NsYXNzTmFtZTogJ21vZGFsLWRpYWxvZy10aXRsZSd9LFxyXG4gICAgICAgICAgICAoaSB7Y2xhc3NOYW1lOiBcIm1vZGFsLWRpYWxvZy10aXRsZS1jbG9zZSBpY29uLWV4XCIsIG9uQ2xpY2s6IEBjbG9zZX0pXHJcbiAgICAgICAgICAgIEBwcm9wcy50aXRsZSBvciAnVW50aXRsZWQgRGlhbG9nJ1xyXG4gICAgICAgICAgKVxyXG4gICAgICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnbW9kYWwtZGlhbG9nLXdvcmtzcGFjZSd9LCBAcHJvcHMuY2hpbGRyZW4pXHJcbiAgICAgICAgKVxyXG4gICAgICApXHJcbiAgICApXHJcbiIsIk1vZGFsRGlhbG9nID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL21vZGFsLWRpYWxvZy12aWV3J1xyXG5UYWJiZWRQYW5lbCA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi90YWJiZWQtcGFuZWwtdmlldydcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3NcclxuXHJcbiAgZGlzcGxheU5hbWU6ICdNb2RhbFRhYmJlZERpYWxvZ1ZpZXcnXHJcblxyXG4gIHJlbmRlcjogLT5cclxuICAgIChNb2RhbERpYWxvZyB7dGl0bGU6IEBwcm9wcy50aXRsZSwgY2xvc2U6IEBwcm9wcy5jbG9zZX0sXHJcbiAgICAgIChUYWJiZWRQYW5lbCB7dGFiczogQHByb3BzLnRhYnMsIHNlbGVjdGVkVGFiSW5kZXg6IEBwcm9wcy5zZWxlY3RlZFRhYkluZGV4fSlcclxuICAgIClcclxuIiwie2Rpdn0gPSBSZWFjdC5ET01cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3NcclxuXHJcbiAgZGlzcGxheU5hbWU6ICdNb2RhbCdcclxuXHJcbiAgd2F0Y2hGb3JFc2NhcGU6IChlKSAtPlxyXG4gICAgaWYgZS5rZXlDb2RlIGlzIDI3XHJcbiAgICAgIEBwcm9wcy5jbG9zZT8oKVxyXG5cclxuICBjb21wb25lbnREaWRNb3VudDogLT5cclxuICAgICQod2luZG93KS5vbiAna2V5dXAnLCBAd2F0Y2hGb3JFc2NhcGVcclxuXHJcbiAgY29tcG9uZW50V2lsbFVubW91bnQ6IC0+XHJcbiAgICAkKHdpbmRvdykub2ZmICdrZXl1cCcsIEB3YXRjaEZvckVzY2FwZVxyXG5cclxuICByZW5kZXI6IC0+XHJcbiAgICAoZGl2IHtjbGFzc05hbWU6ICdtb2RhbCd9LFxyXG4gICAgICAoZGl2IHtjbGFzc05hbWU6ICdtb2RhbC1iYWNrZ3JvdW5kJ30pXHJcbiAgICAgIChkaXYge2NsYXNzTmFtZTogJ21vZGFsLWNvbnRlbnQnfSwgQHByb3BzLmNoaWxkcmVuKVxyXG4gICAgKVxyXG4iLCJNb2RhbFRhYmJlZERpYWxvZyA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9tb2RhbC10YWJiZWQtZGlhbG9nLXZpZXcnXHJcblRhYmJlZFBhbmVsID0gcmVxdWlyZSAnLi90YWJiZWQtcGFuZWwtdmlldydcclxuQ2xvdWRNZXRhZGF0YSA9IChyZXF1aXJlICcuLi9wcm92aWRlcnMvcHJvdmlkZXItaW50ZXJmYWNlJykuQ2xvdWRNZXRhZGF0YVxyXG5GaWxlRGlhbG9nVGFiID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL2ZpbGUtZGlhbG9nLXRhYi12aWV3J1xyXG5TZWxlY3RQcm92aWRlckRpYWxvZ1RhYiA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9zZWxlY3QtcHJvdmlkZXItZGlhbG9nLXRhYi12aWV3J1xyXG5cclxudHIgPSByZXF1aXJlICcuLi91dGlscy90cmFuc2xhdGUnXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzXHJcbiAgZGlzcGxheU5hbWU6ICdQcm92aWRlclRhYmJlZERpYWxvZydcclxuXHJcbiAgcmVuZGVyOiAgLT5cclxuICAgIFtjYXBhYmlsaXR5LCBUYWJDb21wb25lbnRdID0gc3dpdGNoIEBwcm9wcy5kaWFsb2cuYWN0aW9uXHJcbiAgICAgIHdoZW4gJ29wZW5GaWxlJyB0aGVuIFsnbGlzdCcsIEZpbGVEaWFsb2dUYWJdXHJcbiAgICAgIHdoZW4gJ3NhdmVGaWxlJywgJ3NhdmVGaWxlQXMnIHRoZW4gWydzYXZlJywgRmlsZURpYWxvZ1RhYl1cclxuICAgICAgd2hlbiAnc2VsZWN0UHJvdmlkZXInIHRoZW4gW251bGwsIFNlbGVjdFByb3ZpZGVyRGlhbG9nVGFiXVxyXG5cclxuICAgIHRhYnMgPSBbXVxyXG4gICAgc2VsZWN0ZWRUYWJJbmRleCA9IDBcclxuICAgIGZvciBwcm92aWRlciwgaSBpbiBAcHJvcHMuY2xpZW50LnN0YXRlLmF2YWlsYWJsZVByb3ZpZGVyc1xyXG4gICAgICBpZiBub3QgY2FwYWJpbGl0eSBvciBwcm92aWRlci5jYXBhYmlsaXRpZXNbY2FwYWJpbGl0eV1cclxuICAgICAgICBjb21wb25lbnQgPSBUYWJDb21wb25lbnRcclxuICAgICAgICAgIGNsaWVudDogQHByb3BzLmNsaWVudFxyXG4gICAgICAgICAgZGlhbG9nOiBAcHJvcHMuZGlhbG9nXHJcbiAgICAgICAgICBjbG9zZTogQHByb3BzLmNsb3NlXHJcbiAgICAgICAgICBwcm92aWRlcjogcHJvdmlkZXJcclxuICAgICAgICB0YWJzLnB1c2ggVGFiYmVkUGFuZWwuVGFiIHtrZXk6IGksIGxhYmVsOiAodHIgcHJvdmlkZXIuZGlzcGxheU5hbWUpLCBjb21wb25lbnQ6IGNvbXBvbmVudH1cclxuICAgICAgICBpZiBwcm92aWRlciBpcyBAcHJvcHMuY2xpZW50LnN0YXRlLm1ldGFkYXRhPy5wcm92aWRlclxyXG4gICAgICAgICAgc2VsZWN0ZWRUYWJJbmRleCA9IGlcclxuXHJcbiAgICAoTW9kYWxUYWJiZWREaWFsb2cge3RpdGxlOiAodHIgQHByb3BzLmRpYWxvZy50aXRsZSksIGNsb3NlOiBAcHJvcHMuY2xvc2UsIHRhYnM6IHRhYnMsIHNlbGVjdGVkVGFiSW5kZXg6IHNlbGVjdGVkVGFiSW5kZXh9KVxyXG4iLCJ7ZGl2LCBpbnB1dCwgYSwgYnV0dG9ufSA9IFJlYWN0LkRPTVxyXG5cclxuTW9kYWxEaWFsb2cgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vbW9kYWwtZGlhbG9nLXZpZXcnXHJcblxyXG50ciA9IHJlcXVpcmUgJy4uL3V0aWxzL3RyYW5zbGF0ZSdcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3NcclxuXHJcbiAgZGlzcGxheU5hbWU6ICdSZW5hbWVEaWFsb2dWaWV3J1xyXG5cclxuICBnZXRJbml0aWFsU3RhdGU6IC0+XHJcbiAgICBmaWxlbmFtZSA9IEBwcm9wcy5maWxlbmFtZSBvciAnJ1xyXG4gICAgc3RhdGUgPVxyXG4gICAgICBmaWxlbmFtZTogZmlsZW5hbWVcclxuICAgICAgdHJpbW1lZEZpbGVuYW1lOiBAdHJpbSBmaWxlbmFtZVxyXG5cclxuICBjb21wb25lbnREaWRNb3VudDogLT5cclxuICAgIEBmaWxlbmFtZSA9IFJlYWN0LmZpbmRET01Ob2RlIEByZWZzLmZpbGVuYW1lXHJcbiAgICBAZmlsZW5hbWUuZm9jdXMoKVxyXG5cclxuICB1cGRhdGVGaWxlbmFtZTogLT5cclxuICAgIGZpbGVuYW1lID0gQGZpbGVuYW1lLnZhbHVlXHJcbiAgICBAc2V0U3RhdGVcclxuICAgICAgZmlsZW5hbWU6IGZpbGVuYW1lXHJcbiAgICAgIHRyaW1tZWRGaWxlbmFtZTogQHRyaW0gZmlsZW5hbWVcclxuXHJcbiAgdHJpbTogKHMpIC0+XHJcbiAgICBzLnJlcGxhY2UgL15cXHMrfFxccyskLywgJydcclxuXHJcbiAgcmVuYW1lOiAoZSkgLT5cclxuICAgIGlmIEBzdGF0ZS50cmltbWVkRmlsZW5hbWUubGVuZ3RoID4gMFxyXG4gICAgICBAcHJvcHMuY2FsbGJhY2s/IEBzdGF0ZS5maWxlbmFtZVxyXG4gICAgICBAcHJvcHMuY2xvc2UoKVxyXG4gICAgZWxzZVxyXG4gICAgICBlLnByZXZlbnREZWZhdWx0KClcclxuICAgICAgQGZpbGVuYW1lLmZvY3VzKClcclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgKE1vZGFsRGlhbG9nIHt0aXRsZTogKHRyICd+RElBTE9HLkRPV05MT0FEJyksIGNsb3NlOiBAcHJvcHMuY2xvc2V9LFxyXG4gICAgICAoZGl2IHtjbGFzc05hbWU6ICdyZW5hbWUtZGlhbG9nJ30sXHJcbiAgICAgICAgKGlucHV0IHtyZWY6ICdmaWxlbmFtZScsIHBsYWNlaG9sZGVyOiAnRmlsZW5hbWUnLCB2YWx1ZTogQHN0YXRlLmZpbGVuYW1lLCBvbkNoYW5nZTogQHVwZGF0ZUZpbGVuYW1lfSlcclxuICAgICAgICAoZGl2IHtjbGFzc05hbWU6ICdidXR0b25zJ30sXHJcbiAgICAgICAgICAoYnV0dG9uIHtjbGFzc05hbWU6IChpZiBAc3RhdGUudHJpbW1lZEZpbGVuYW1lLmxlbmd0aCBpcyAwIHRoZW4gJ2Rpc2FibGVkJyBlbHNlICcnKSwgb25DbGljazogQHJlbmFtZX0sIHRyICd+UkVOQU1FX0RJQUxPRy5SRU5BTUUnKVxyXG4gICAgICAgICAgKGJ1dHRvbiB7b25DbGljazogQHByb3BzLmNsb3NlfSwgdHIgJ35SRU5BTUVfRElBTE9HLkNBTkNFTCcpXHJcbiAgICAgICAgKVxyXG4gICAgICApXHJcbiAgICApXHJcbiIsIntkaXZ9ID0gUmVhY3QuRE9NXHJcblxyXG5TZWxlY3RQcm92aWRlckRpYWxvZ1RhYiA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgUmVhY3QuY3JlYXRlQ2xhc3NcclxuICBkaXNwbGF5TmFtZTogJ1NlbGVjdFByb3ZpZGVyRGlhbG9nVGFiJ1xyXG4gIHJlbmRlcjogLT4gKGRpdiB7fSwgXCJUT0RPOiBTZWxlY3RQcm92aWRlckRpYWxvZ1RhYjogI3tAcHJvcHMucHJvdmlkZXIuZGlzcGxheU5hbWV9XCIpXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFNlbGVjdFByb3ZpZGVyRGlhbG9nVGFiXHJcbiIsIntkaXYsIHVsLCBsaSwgYX0gPSBSZWFjdC5ET01cclxuXHJcbmNsYXNzIFRhYkluZm9cclxuICBjb25zdHJ1Y3RvcjogKHNldHRpbmdzPXt9KSAtPlxyXG4gICAge0BsYWJlbCwgQGNvbXBvbmVudH0gPSBzZXR0aW5nc1xyXG5cclxuVGFiID0gUmVhY3QuY3JlYXRlRmFjdG9yeSBSZWFjdC5jcmVhdGVDbGFzc1xyXG5cclxuICBkaXNwbGF5TmFtZTogJ1RhYmJlZFBhbmVsVGFiJ1xyXG5cclxuICBjbGlja2VkOiAoZSkgLT5cclxuICAgIGUucHJldmVudERlZmF1bHQoKVxyXG4gICAgQHByb3BzLm9uU2VsZWN0ZWQgQHByb3BzLmluZGV4XHJcblxyXG4gIHJlbmRlcjogLT5cclxuICAgIGNsYXNzbmFtZSA9IGlmIEBwcm9wcy5zZWxlY3RlZCB0aGVuICd0YWItc2VsZWN0ZWQnIGVsc2UgJydcclxuICAgIChsaSB7Y2xhc3NOYW1lOiBjbGFzc25hbWUsIG9uQ2xpY2s6IEBjbGlja2VkfSwgQHByb3BzLmxhYmVsKVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzc1xyXG5cclxuICBkaXNwbGF5TmFtZTogJ1RhYmJlZFBhbmVsVmlldydcclxuXHJcbiAgZ2V0SW5pdGlhbFN0YXRlOiAtPlxyXG4gICAgc2VsZWN0ZWRUYWJJbmRleDogQHByb3BzLnNlbGVjdGVkVGFiSW5kZXggb3IgMFxyXG5cclxuICBzdGF0aWNzOlxyXG4gICAgVGFiOiAoc2V0dGluZ3MpIC0+IG5ldyBUYWJJbmZvIHNldHRpbmdzXHJcblxyXG4gIHNlbGVjdGVkVGFiOiAoaW5kZXgpIC0+XHJcbiAgICBAc2V0U3RhdGUgc2VsZWN0ZWRUYWJJbmRleDogaW5kZXhcclxuXHJcbiAgcmVuZGVyVGFiOiAodGFiLCBpbmRleCkgLT5cclxuICAgIChUYWJcclxuICAgICAgbGFiZWw6IHRhYi5sYWJlbFxyXG4gICAgICBrZXk6IGluZGV4XHJcbiAgICAgIGluZGV4OiBpbmRleFxyXG4gICAgICBzZWxlY3RlZDogKGluZGV4IGlzIEBzdGF0ZS5zZWxlY3RlZFRhYkluZGV4KVxyXG4gICAgICBvblNlbGVjdGVkOiBAc2VsZWN0ZWRUYWJcclxuICAgIClcclxuXHJcbiAgcmVuZGVyVGFiczogLT5cclxuICAgIChkaXYge2NsYXNzTmFtZTogJ3dvcmtzcGFjZS10YWJzJ30sXHJcbiAgICAgICh1bCB7a2V5OiBpbmRleH0sIEByZW5kZXJUYWIodGFiLCBpbmRleCkgZm9yIHRhYiwgaW5kZXggaW4gQHByb3BzLnRhYnMpXHJcbiAgICApXHJcblxyXG4gIHJlbmRlclNlbGVjdGVkUGFuZWw6IC0+XHJcbiAgICAoZGl2IHtjbGFzc05hbWU6ICd3b3Jrc3BhY2UtdGFiLWNvbXBvbmVudCd9LFxyXG4gICAgICBmb3IgdGFiLCBpbmRleCBpbiBAcHJvcHMudGFic1xyXG4gICAgICAgIChkaXYge1xyXG4gICAgICAgICAga2V5OiBpbmRleFxyXG4gICAgICAgICAgc3R5bGU6XHJcbiAgICAgICAgICAgIGRpc3BsYXk6IGlmIGluZGV4IGlzIEBzdGF0ZS5zZWxlY3RlZFRhYkluZGV4IHRoZW4gJ2Jsb2NrJyBlbHNlICdub25lJ1xyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIHRhYi5jb21wb25lbnRcclxuICAgICAgICApXHJcbiAgICApXHJcblxyXG4gIHJlbmRlcjogLT5cclxuICAgIChkaXYge2tleTogQHByb3BzLmtleSwgY2xhc3NOYW1lOiBcInRhYmJlZC1wYW5lbFwifSxcclxuICAgICAgQHJlbmRlclRhYnMoKVxyXG4gICAgICBAcmVuZGVyU2VsZWN0ZWRQYW5lbCgpXHJcbiAgICApXHJcbiJdfQ==
