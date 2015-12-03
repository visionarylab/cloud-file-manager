(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.CloudFileManager = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var AppView, CloudFileManager, CloudFileManagerClient, CloudFileManagerUIMenu;

AppView = React.createFactory(require('./views/app-view'));

CloudFileManagerUIMenu = (require('./ui')).CloudFileManagerUIMenu;

CloudFileManagerClient = (require('./client')).CloudFileManagerClient;

CloudFileManager = (function() {
  function CloudFileManager(options) {
    this.DefaultMenu = CloudFileManagerUIMenu.DefaultMenu;
    this.AutoSaveMenu = CloudFileManagerUIMenu.AutoSaveMenu;
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

  CloudFileManagerClient.prototype.saveCopyDialog = function(content, callback) {
    var saveCopy;
    if (content == null) {
      content = null;
    }
    if (callback == null) {
      callback = null;
    }
    saveCopy = (function(_this) {
      return function(content, metadata) {
        return metadata.provider.save(content, metadata, function(err) {
          if (err) {
            return _this._error(err);
          }
          return typeof callback === "function" ? callback(content, metadata) : void 0;
        });
      };
    })(this);
    return this._ui.saveCopyDialog((function(_this) {
      return function(metadata) {
        if (content === null) {
          return _this._event('getContent', {}, function(content) {
            return saveCopy(content, metadata);
          });
        } else {
          return saveCopy(content, metadata);
        }
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
        return callback(null, JSON.stringify(data));
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

  CloudFileManagerUIMenu.AutoSaveMenu = ['newFileDialog', 'openFileDialog', 'reopenDialog', 'separator', 'saveCopyDialog', 'downloadDialog', 'renameDialog'];

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
        case 'saveCopyDialog':
          return function() {
            return client.state.metadata != null;
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
      saveCopyDialog: tr("~MENU.SAVE_COPY"),
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

  CloudFileManagerUI.prototype.saveCopyDialog = function(callback) {
    return this._showProviderDialog('saveFileCopy', tr('~DIALOG.SAVE_COPY'), callback);
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
  "~MENU.SAVE_COPY": "Save A Copy ...",
  "~MENU.DOWNLOAD": "Download",
  "~MENU.RENAME": "Rename",
  "~DIALOG.SAVE": "Save",
  "~DIALOG.SAVE_AS": "Save As ...",
  "~DIALOG.SAVE_COPY": "Save A Copy ...",
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
    var base, filename;
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
      if (typeof (base = this.props.dialog).callback === "function") {
        base.callback(this.state.metadata);
      }
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
        case 'saveFileCopy':
        case 'saveFileCopy':
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
      title: tr('~DIALOG.RENAME'),
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFxhcHAuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxcY2xpZW50LmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHByb3ZpZGVyc1xcZG9jdW1lbnQtc3RvcmUtcHJvdmlkZXIuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxccHJvdmlkZXJzXFxnb29nbGUtZHJpdmUtcHJvdmlkZXIuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxccHJvdmlkZXJzXFxsb2NhbHN0b3JhZ2UtcHJvdmlkZXIuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxccHJvdmlkZXJzXFxwcm92aWRlci1pbnRlcmZhY2UuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxccHJvdmlkZXJzXFxyZWFkb25seS1wcm92aWRlci5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx1aS5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx1dGlsc1xcaXMtc3RyaW5nLmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHV0aWxzXFxsYW5nXFxlbi11cy5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx1dGlsc1xcdHJhbnNsYXRlLmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHZpZXdzXFxhcHAtdmlldy5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx2aWV3c1xcYXV0aG9yaXplLW1peGluLmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHZpZXdzXFxkb3dubG9hZC1kaWFsb2ctdmlldy5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx2aWV3c1xcZHJvcGRvd24tdmlldy5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx2aWV3c1xcZmlsZS1kaWFsb2ctdGFiLXZpZXcuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxcdmlld3NcXG1lbnUtYmFyLXZpZXcuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxcdmlld3NcXG1vZGFsLWRpYWxvZy12aWV3LmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHZpZXdzXFxtb2RhbC10YWJiZWQtZGlhbG9nLXZpZXcuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxcdmlld3NcXG1vZGFsLXZpZXcuY29mZmVlIiwiQzpcXFVzZXJzXFxkb3VnXFxEZXNrdG9wXFx6b29wZG9vcFxcY29udHJhY3RpbmdcXGNvbmNvcmRcXHByb2plY3RzXFxjbG91ZC1maWxlLW1hbmFnZXJcXHNyY1xcY29kZVxcdmlld3NcXHByb3ZpZGVyLXRhYmJlZC1kaWFsb2ctdmlldy5jb2ZmZWUiLCJDOlxcVXNlcnNcXGRvdWdcXERlc2t0b3BcXHpvb3Bkb29wXFxjb250cmFjdGluZ1xcY29uY29yZFxccHJvamVjdHNcXGNsb3VkLWZpbGUtbWFuYWdlclxcc3JjXFxjb2RlXFx2aWV3c1xccmVuYW1lLWRpYWxvZy12aWV3LmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHZpZXdzXFxzZWxlY3QtcHJvdmlkZXItZGlhbG9nLXRhYi12aWV3LmNvZmZlZSIsIkM6XFxVc2Vyc1xcZG91Z1xcRGVza3RvcFxcem9vcGRvb3BcXGNvbnRyYWN0aW5nXFxjb25jb3JkXFxwcm9qZWN0c1xcY2xvdWQtZmlsZS1tYW5hZ2VyXFxzcmNcXGNvZGVcXHZpZXdzXFx0YWJiZWQtcGFuZWwtdmlldy5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQSxJQUFBOztBQUFBLE9BQUEsR0FBVSxLQUFLLENBQUMsYUFBTixDQUFvQixPQUFBLENBQVEsa0JBQVIsQ0FBcEI7O0FBRVYsc0JBQUEsR0FBeUIsQ0FBQyxPQUFBLENBQVEsTUFBUixDQUFELENBQWdCLENBQUM7O0FBQzFDLHNCQUFBLEdBQXlCLENBQUMsT0FBQSxDQUFRLFVBQVIsQ0FBRCxDQUFvQixDQUFDOztBQUV4QztFQUVTLDBCQUFDLE9BQUQ7SUFFWCxJQUFDLENBQUEsV0FBRCxHQUFlLHNCQUFzQixDQUFDO0lBQ3RDLElBQUMsQ0FBQSxZQUFELEdBQWdCLHNCQUFzQixDQUFDO0lBRXZDLElBQUMsQ0FBQSxNQUFELEdBQWMsSUFBQSxzQkFBQSxDQUFBO0lBQ2QsSUFB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LEtBQUEsS0FBUyxJQUFDLENBQUEsS0FBSyxDQUFDLGdCQUgzQjtNQUlBLFVBQUEsRUFBWSxJQUFDLENBQUEsV0FKYjtLQUREO0VBRFEsQ0FYWDtFQW9CQSxVQUFBLEVBQVksU0FBQTtBQUNWLFFBQUE7V0FBQyxHQUFBLENBQUk7TUFBQyxTQUFBLEVBQVcsZ0JBQVo7S0FBSjs7QUFDRTtBQUFBO1dBQUEsc0RBQUE7O3FCQUFBLEVBQUEsQ0FBRztVQUFDLEdBQUEsRUFBSyxLQUFOO1NBQUgsRUFBaUIsSUFBQyxDQUFBLFNBQUQsQ0FBVyxHQUFYLEVBQWdCLEtBQWhCLENBQWpCO0FBQUE7O2lCQURGO0VBRFMsQ0FwQlo7RUF5QkEsbUJBQUEsRUFBcUIsU0FBQTtBQUNuQixRQUFBO1dBQUMsR0FBQSxDQUFJO01BQUMsU0FBQSxFQUFXLHlCQUFaO0tBQUo7O0FBQ0M7QUFBQTtXQUFBLHNEQUFBOztxQkFDRyxHQUFBLENBQUk7VUFDSCxHQUFBLEVBQUssS0FERjtVQUVILEtBQUEsRUFDRTtZQUFBLE9BQUEsRUFBWSxLQUFBLEtBQVMsSUFBQyxDQUFBLEtBQUssQ0FBQyxnQkFBbkIsR0FBeUMsT0FBekMsR0FBc0QsTUFBL0Q7V0FIQztTQUFKLEVBS0MsR0FBRyxDQUFDLFNBTEw7QUFESDs7aUJBREQ7RUFEa0IsQ0F6QnJCO0VBcUNBLE1BQUEsRUFBUSxTQUFBO1dBQ0wsR0FBQSxDQUFJO01BQUMsR0FBQSxFQUFLLElBQUMsQ0FBQSxLQUFLLENBQUMsR0FBYjtNQUFrQixTQUFBLEVBQVcsY0FBN0I7S0FBSixFQUNDLElBQUMsQ0FBQSxVQUFELENBQUEsQ0FERCxFQUVDLElBQUMsQ0FBQSxtQkFBRCxDQUFBLENBRkQ7RUFESyxDQXJDUjtDQUZlIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIkFwcFZpZXcgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vdmlld3MvYXBwLXZpZXcnXHJcblxyXG5DbG91ZEZpbGVNYW5hZ2VyVUlNZW51ID0gKHJlcXVpcmUgJy4vdWknKS5DbG91ZEZpbGVNYW5hZ2VyVUlNZW51XHJcbkNsb3VkRmlsZU1hbmFnZXJDbGllbnQgPSAocmVxdWlyZSAnLi9jbGllbnQnKS5DbG91ZEZpbGVNYW5hZ2VyQ2xpZW50XHJcblxyXG5jbGFzcyBDbG91ZEZpbGVNYW5hZ2VyXHJcblxyXG4gIGNvbnN0cnVjdG9yOiAob3B0aW9ucykgLT5cclxuICAgICMgc2luY2UgdGhlIG1vZHVsZSBleHBvcnRzIGFuIGluc3RhbmNlIG9mIHRoZSBjbGFzcyB3ZSBuZWVkIHRvIGZha2UgYSBjbGFzcyB2YXJpYWJsZSBhcyBhbiBpbnN0YW5jZSB2YXJpYWJsZVxyXG4gICAgQERlZmF1bHRNZW51ID0gQ2xvdWRGaWxlTWFuYWdlclVJTWVudS5EZWZhdWx0TWVudVxyXG4gICAgQEF1dG9TYXZlTWVudSA9IENsb3VkRmlsZU1hbmFnZXJVSU1lbnUuQXV0b1NhdmVNZW51XHJcblxyXG4gICAgQGNsaWVudCA9IG5ldyBDbG91ZEZpbGVNYW5hZ2VyQ2xpZW50KClcclxuICAgIEBhcHBPcHRpb25zID0ge31cclxuXHJcbiAgaW5pdDogKEBhcHBPcHRpb25zLCB1c2luZ0lmcmFtZSA9IGZhbHNlKSAtPlxyXG4gICAgQGFwcE9wdGlvbnMudXNpbmdJZnJhbWUgPSB1c2luZ0lmcmFtZVxyXG4gICAgQGNsaWVudC5zZXRBcHBPcHRpb25zIEBhcHBPcHRpb25zXHJcblxyXG4gIGNyZWF0ZUZyYW1lOiAoQGFwcE9wdGlvbnMsIGVsZW1JZCkgLT5cclxuICAgIEBpbml0IEBhcHBPcHRpb25zLCB0cnVlXHJcbiAgICBAX3JlbmRlckFwcCBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChlbGVtSWQpXHJcblxyXG4gIGNsaWVudENvbm5lY3Q6IChldmVudENhbGxiYWNrKSAtPlxyXG4gICAgaWYgbm90IEBhcHBPcHRpb25zLnVzaW5nSWZyYW1lXHJcbiAgICAgIEBfY3JlYXRlSGlkZGVuQXBwKClcclxuICAgIEBjbGllbnQuY29ubmVjdCBldmVudENhbGxiYWNrXHJcblxyXG4gIF9jcmVhdGVIaWRkZW5BcHA6IC0+XHJcbiAgICBhbmNob3IgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpXHJcbiAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGFuY2hvcilcclxuICAgIEBfcmVuZGVyQXBwIGFuY2hvclxyXG5cclxuICBfcmVuZGVyQXBwOiAoYW5jaG9yKSAtPlxyXG4gICAgQGFwcE9wdGlvbnMuY2xpZW50ID0gQGNsaWVudFxyXG4gICAgUmVhY3QucmVuZGVyIChBcHBWaWV3IEBhcHBPcHRpb25zKSwgYW5jaG9yXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBDbG91ZEZpbGVNYW5hZ2VyKClcclxuIiwidHIgPSByZXF1aXJlICcuL3V0aWxzL3RyYW5zbGF0ZSdcclxuaXNTdHJpbmcgPSByZXF1aXJlICcuL3V0aWxzL2lzLXN0cmluZydcclxuXHJcbkNsb3VkRmlsZU1hbmFnZXJVSSA9IChyZXF1aXJlICcuL3VpJykuQ2xvdWRGaWxlTWFuYWdlclVJXHJcblxyXG5Mb2NhbFN0b3JhZ2VQcm92aWRlciA9IHJlcXVpcmUgJy4vcHJvdmlkZXJzL2xvY2Fsc3RvcmFnZS1wcm92aWRlcidcclxuUmVhZE9ubHlQcm92aWRlciA9IHJlcXVpcmUgJy4vcHJvdmlkZXJzL3JlYWRvbmx5LXByb3ZpZGVyJ1xyXG5Hb29nbGVEcml2ZVByb3ZpZGVyID0gcmVxdWlyZSAnLi9wcm92aWRlcnMvZ29vZ2xlLWRyaXZlLXByb3ZpZGVyJ1xyXG5Eb2N1bWVudFN0b3JlUHJvdmlkZXIgPSByZXF1aXJlICcuL3Byb3ZpZGVycy9kb2N1bWVudC1zdG9yZS1wcm92aWRlcidcclxuXHJcbmNsYXNzIENsb3VkRmlsZU1hbmFnZXJDbGllbnRFdmVudFxyXG5cclxuICBjb25zdHJ1Y3RvcjogKEB0eXBlLCBAZGF0YSA9IHt9LCBAY2FsbGJhY2sgPSBudWxsLCBAc3RhdGUgPSB7fSkgLT5cclxuXHJcbmNsYXNzIENsb3VkRmlsZU1hbmFnZXJDbGllbnRcclxuXHJcbiAgY29uc3RydWN0b3I6IChvcHRpb25zKSAtPlxyXG4gICAgQHN0YXRlID1cclxuICAgICAgYXZhaWxhYmxlUHJvdmlkZXJzOiBbXVxyXG4gICAgQF9yZXNldFN0YXRlKClcclxuICAgIEBfdWkgPSBuZXcgQ2xvdWRGaWxlTWFuYWdlclVJIEBcclxuXHJcbiAgc2V0QXBwT3B0aW9uczogKEBhcHBPcHRpb25zID0ge30pLT5cclxuICAgICMgZmx0ZXIgZm9yIGF2YWlsYWJsZSBwcm92aWRlcnNcclxuICAgIGFsbFByb3ZpZGVycyA9IHt9XHJcbiAgICBmb3IgUHJvdmlkZXIgaW4gW1JlYWRPbmx5UHJvdmlkZXIsIExvY2FsU3RvcmFnZVByb3ZpZGVyLCBHb29nbGVEcml2ZVByb3ZpZGVyLCBEb2N1bWVudFN0b3JlUHJvdmlkZXJdXHJcbiAgICAgIGlmIFByb3ZpZGVyLkF2YWlsYWJsZSgpXHJcbiAgICAgICAgYWxsUHJvdmlkZXJzW1Byb3ZpZGVyLk5hbWVdID0gUHJvdmlkZXJcclxuXHJcbiAgICAjIGRlZmF1bHQgdG8gYWxsIHByb3ZpZGVycyBpZiBub24gc3BlY2lmaWVkXHJcbiAgICBpZiBub3QgQGFwcE9wdGlvbnMucHJvdmlkZXJzXHJcbiAgICAgIEBhcHBPcHRpb25zLnByb3ZpZGVycyA9IFtdXHJcbiAgICAgIGZvciBvd24gcHJvdmlkZXJOYW1lIG9mIGFsbFByb3ZpZGVyc1xyXG4gICAgICAgIGFwcE9wdGlvbnMucHJvdmlkZXJzLnB1c2ggcHJvdmlkZXJOYW1lXHJcblxyXG4gICAgIyBjaGVjayB0aGUgcHJvdmlkZXJzXHJcbiAgICBhdmFpbGFibGVQcm92aWRlcnMgPSBbXVxyXG4gICAgZm9yIHByb3ZpZGVyIGluIEBhcHBPcHRpb25zLnByb3ZpZGVyc1xyXG4gICAgICBbcHJvdmlkZXJOYW1lLCBwcm92aWRlck9wdGlvbnNdID0gaWYgaXNTdHJpbmcgcHJvdmlkZXIgdGhlbiBbcHJvdmlkZXIsIHt9XSBlbHNlIFtwcm92aWRlci5uYW1lLCBwcm92aWRlcl1cclxuICAgICAgIyBtZXJnZSBpbiBvdGhlciBvcHRpb25zIGFzIG5lZWRlZFxyXG4gICAgICBwcm92aWRlck9wdGlvbnMubWltZVR5cGUgPz0gQGFwcE9wdGlvbnMubWltZVR5cGVcclxuICAgICAgaWYgbm90IHByb3ZpZGVyTmFtZVxyXG4gICAgICAgIEBfZXJyb3IgXCJJbnZhbGlkIHByb3ZpZGVyIHNwZWMgLSBtdXN0IGVpdGhlciBiZSBzdHJpbmcgb3Igb2JqZWN0IHdpdGggbmFtZSBwcm9wZXJ0eVwiXHJcbiAgICAgIGVsc2VcclxuICAgICAgICBpZiBhbGxQcm92aWRlcnNbcHJvdmlkZXJOYW1lXVxyXG4gICAgICAgICAgUHJvdmlkZXIgPSBhbGxQcm92aWRlcnNbcHJvdmlkZXJOYW1lXVxyXG4gICAgICAgICAgYXZhaWxhYmxlUHJvdmlkZXJzLnB1c2ggbmV3IFByb3ZpZGVyIHByb3ZpZGVyT3B0aW9uc1xyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgIEBfZXJyb3IgXCJVbmtub3duIHByb3ZpZGVyOiAje3Byb3ZpZGVyTmFtZX1cIlxyXG4gICAgQF9zZXRTdGF0ZSBhdmFpbGFibGVQcm92aWRlcnM6IGF2YWlsYWJsZVByb3ZpZGVyc1xyXG4gICAgQF91aS5pbml0IEBhcHBPcHRpb25zLnVpXHJcblxyXG4gICAgIyBjaGVjayBmb3IgYXV0b3NhdmVcclxuICAgIGlmIG9wdGlvbnMuYXV0b1NhdmVJbnRlcnZhbFxyXG4gICAgICBAYXV0b1NhdmUgb3B0aW9ucy5hdXRvU2F2ZUludGVydmFsXHJcblxyXG4gICMgc2luZ2xlIGNsaWVudCAtIHVzZWQgYnkgdGhlIGNsaWVudCBhcHAgdG8gcmVnaXN0ZXIgYW5kIHJlY2VpdmUgY2FsbGJhY2sgZXZlbnRzXHJcbiAgY29ubmVjdDogKEBldmVudENhbGxiYWNrKSAtPlxyXG4gICAgQF9ldmVudCAnY29ubmVjdGVkJywge2NsaWVudDogQH1cclxuXHJcbiAgIyBzaW5nbGUgbGlzdGVuZXIgLSB1c2VkIGJ5IHRoZSBSZWFjdCBtZW51IHZpYSB0byB3YXRjaCBjbGllbnQgc3RhdGUgY2hhbmdlc1xyXG4gIGxpc3RlbjogKEBsaXN0ZW5lckNhbGxiYWNrKSAtPlxyXG5cclxuICBhcHBlbmRNZW51SXRlbTogKGl0ZW0pIC0+XHJcbiAgICBAX3VpLmFwcGVuZE1lbnVJdGVtIGl0ZW1cclxuXHJcbiAgc2V0TWVudUJhckluZm86IChpbmZvKSAtPlxyXG4gICAgQF91aS5zZXRNZW51QmFySW5mbyBpbmZvXHJcblxyXG4gIG5ld0ZpbGU6IChjYWxsYmFjayA9IG51bGwpIC0+XHJcbiAgICBAX3Jlc2V0U3RhdGUoKVxyXG4gICAgQF9ldmVudCAnbmV3ZWRGaWxlJ1xyXG5cclxuICBuZXdGaWxlRGlhbG9nOiAoY2FsbGJhY2sgPSBudWxsKSAtPlxyXG4gICAgaWYgQGFwcE9wdGlvbnMudWk/Lm5ld0ZpbGVPcGVuc0luTmV3VGFiXHJcbiAgICAgIHdpbmRvdy5vcGVuIHdpbmRvdy5sb2NhdGlvbiwgJ19ibGFuaydcclxuICAgIGVsc2UgaWYgQHN0YXRlLmRpcnR5XHJcbiAgICAgIGlmIEBfYXV0b1NhdmVJbnRlcnZhbCBhbmQgQHN0YXRlLm1ldGFkYXRhXHJcbiAgICAgICAgQHNhdmUoKVxyXG4gICAgICAgIEBuZXdGaWxlKClcclxuICAgICAgZWxzZSBpZiBjb25maXJtIHRyICd+Q09ORklSTS5ORVdfRklMRSdcclxuICAgICAgICBAbmV3RmlsZSgpXHJcbiAgICBlbHNlXHJcbiAgICAgIEBuZXdGaWxlKClcclxuXHJcbiAgb3BlbkZpbGU6IChtZXRhZGF0YSwgY2FsbGJhY2sgPSBudWxsKSAtPlxyXG4gICAgaWYgbWV0YWRhdGE/LnByb3ZpZGVyPy5jYW4gJ2xvYWQnXHJcbiAgICAgIG1ldGFkYXRhLnByb3ZpZGVyLmxvYWQgbWV0YWRhdGEsIChlcnIsIGNvbnRlbnQpID0+XHJcbiAgICAgICAgcmV0dXJuIEBfZXJyb3IoZXJyKSBpZiBlcnJcclxuICAgICAgICBAX2ZpbGVDaGFuZ2VkICdvcGVuZWRGaWxlJywgY29udGVudCwgbWV0YWRhdGFcclxuICAgICAgICBjYWxsYmFjaz8gY29udGVudCwgbWV0YWRhdGFcclxuICAgIGVsc2VcclxuICAgICAgQG9wZW5GaWxlRGlhbG9nIGNhbGxiYWNrXHJcblxyXG4gIG9wZW5GaWxlRGlhbG9nOiAoY2FsbGJhY2sgPSBudWxsKSAtPlxyXG4gICAgaWYgKG5vdCBAc3RhdGUuZGlydHkpIG9yIChjb25maXJtIHRyICd+Q09ORklSTS5PUEVOX0ZJTEUnKVxyXG4gICAgICBAX3VpLm9wZW5GaWxlRGlhbG9nIChtZXRhZGF0YSkgPT5cclxuICAgICAgICBAb3BlbkZpbGUgbWV0YWRhdGEsIGNhbGxiYWNrXHJcblxyXG4gIHNhdmU6IChjYWxsYmFjayA9IG51bGwpIC0+XHJcbiAgICBwYXRjaGFibGUgPSBAc3RhdGUubWV0YWRhdGE/Lm92ZXJ3cml0YWJsZSBhbmQgQHN0YXRlLm1ldGFkYXRhPy5wcm92aWRlci5jYW4gJ3BhdGNoJ1xyXG4gICAgQF9ldmVudCAnZ2V0Q29udGVudCcsIHtwYXRjaGFibGV9LCAoY29udGVudCwgaXNQYXRjaCkgPT5cclxuICAgICAgQHNhdmVDb250ZW50IGNvbnRlbnQsIGlzUGF0Y2gsIGNhbGxiYWNrXHJcblxyXG4gIHNhdmVDb250ZW50OiAoY29udGVudCwgaXNQYXRjaCwgY2FsbGJhY2sgPSBudWxsKSAtPlxyXG4gICAgaWYgQHN0YXRlLm1ldGFkYXRhXHJcbiAgICAgIEBzYXZlRmlsZSBjb250ZW50LCBpc1BhdGNoLCBAc3RhdGUubWV0YWRhdGEsIGNhbGxiYWNrXHJcbiAgICBlbHNlXHJcbiAgICAgIEBzYXZlRmlsZURpYWxvZyBjb250ZW50LCBjYWxsYmFja1xyXG5cclxuICBzYXZlRmlsZTogKGNvbnRlbnQsIGlzUGF0Y2gsIG1ldGFkYXRhLCBjYWxsYmFjayA9IG51bGwpIC0+XHJcbiAgICBpZiBpc1BhdGNoIGFuZCBtZXRhZGF0YT8ucHJvdmlkZXI/LmNhbihtZXRob2Q9J3BhdGNoJykgb3JcclxuICAgICAgIG1ldGFkYXRhPy5wcm92aWRlcj8uY2FuKG1ldGhvZD0nc2F2ZScpXHJcbiAgICAgIEBfc2V0U3RhdGVcclxuICAgICAgICBzYXZpbmc6IG1ldGFkYXRhXHJcbiAgICAgIG1ldGFkYXRhLnByb3ZpZGVyW21ldGhvZF0gY29udGVudCwgbWV0YWRhdGEsIChlcnIpID0+XHJcbiAgICAgICAgcmV0dXJuIEBfZXJyb3IoZXJyKSBpZiBlcnJcclxuICAgICAgICBAX2ZpbGVDaGFuZ2VkICdzYXZlZEZpbGUnLCBjb250ZW50LCBtZXRhZGF0YVxyXG4gICAgICAgIGNhbGxiYWNrPyBjb250ZW50LCBtZXRhZGF0YVxyXG4gICAgZWxzZVxyXG4gICAgICBAc2F2ZUZpbGVEaWFsb2cgY29udGVudCwgY2FsbGJhY2tcclxuXHJcbiAgc2F2ZUZpbGVEaWFsb2c6IChjb250ZW50ID0gbnVsbCwgY2FsbGJhY2sgPSBudWxsKSAtPlxyXG4gICAgQF91aS5zYXZlRmlsZURpYWxvZyAobWV0YWRhdGEpID0+XHJcbiAgICAgIEBfZGlhbG9nU2F2ZSBjb250ZW50LCBtZXRhZGF0YSwgY2FsbGJhY2tcclxuXHJcbiAgc2F2ZUZpbGVBc0RpYWxvZzogKGNvbnRlbnQgPSBudWxsLCBjYWxsYmFjayA9IG51bGwpIC0+XHJcbiAgICBAX3VpLnNhdmVGaWxlQXNEaWFsb2cgKG1ldGFkYXRhKSA9PlxyXG4gICAgICBAX2RpYWxvZ1NhdmUgY29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrXHJcblxyXG4gIHNhdmVDb3B5RGlhbG9nOiAoY29udGVudCA9IG51bGwsIGNhbGxiYWNrID0gbnVsbCkgLT5cclxuICAgIHNhdmVDb3B5ID0gKGNvbnRlbnQsIG1ldGFkYXRhKSA9PlxyXG4gICAgICBtZXRhZGF0YS5wcm92aWRlci5zYXZlIGNvbnRlbnQsIG1ldGFkYXRhLCAoZXJyKSA9PlxyXG4gICAgICAgIHJldHVybiBAX2Vycm9yKGVycikgaWYgZXJyXHJcbiAgICAgICAgY2FsbGJhY2s/IGNvbnRlbnQsIG1ldGFkYXRhXHJcbiAgICBAX3VpLnNhdmVDb3B5RGlhbG9nIChtZXRhZGF0YSkgPT5cclxuICAgICAgaWYgY29udGVudCBpcyBudWxsXHJcbiAgICAgICAgQF9ldmVudCAnZ2V0Q29udGVudCcsIHt9LCAoY29udGVudCkgLT5cclxuICAgICAgICAgIHNhdmVDb3B5IGNvbnRlbnQsIG1ldGFkYXRhXHJcbiAgICAgIGVsc2VcclxuICAgICAgICBzYXZlQ29weSBjb250ZW50LCBtZXRhZGF0YVxyXG5cclxuICBkb3dubG9hZERpYWxvZzogKGNhbGxiYWNrID0gbnVsbCkgLT5cclxuICAgIEBfZXZlbnQgJ2dldENvbnRlbnQnLCB7fSwgKGNvbnRlbnQpID0+XHJcbiAgICAgIEBfdWkuZG93bmxvYWREaWFsb2cgQHN0YXRlLm1ldGFkYXRhPy5uYW1lLCBjb250ZW50LCBjYWxsYmFja1xyXG5cclxuICByZW5hbWVEaWFsb2c6IChjYWxsYmFjayA9IG51bGwpIC0+XHJcbiAgICBpZiBAc3RhdGUubWV0YWRhdGFcclxuICAgICAgQF91aS5yZW5hbWVEaWFsb2cgQHN0YXRlLm1ldGFkYXRhLm5hbWUsIChuZXdOYW1lKSA9PlxyXG4gICAgICAgIGlmIG5ld05hbWUgaXNudCBAc3RhdGUubWV0YWRhdGEubmFtZVxyXG4gICAgICAgICAgQHN0YXRlLm1ldGFkYXRhLnByb3ZpZGVyLnJlbmFtZSBAc3RhdGUubWV0YWRhdGEsIG5ld05hbWUsIChlcnIsIG1ldGFkYXRhKSA9PlxyXG4gICAgICAgICAgICByZXR1cm4gQF9lcnJvcihlcnIpIGlmIGVyclxyXG4gICAgICAgICAgICBAX3NldFN0YXRlXHJcbiAgICAgICAgICAgICAgbWV0YWRhdGE6IG1ldGFkYXRhXHJcbiAgICAgICAgICAgIEBfZXZlbnQgJ3JlbmFtZWRGaWxlJywge21ldGFkYXRhOiBtZXRhZGF0YX1cclxuICAgICAgICAgICAgY2FsbGJhY2s/IGZpbGVuYW1lXHJcbiAgICBlbHNlXHJcbiAgICAgIGNhbGxiYWNrPyAnTm8gY3VycmVudGx5IGFjdGl2ZSBmaWxlJ1xyXG5cclxuICByZW9wZW46IChjYWxsYmFjayA9IG51bGwpIC0+XHJcbiAgICBpZiBAc3RhdGUubWV0YWRhdGFcclxuICAgICAgQG9wZW5GaWxlIEBzdGF0ZS5tZXRhZGF0YSwgY2FsbGJhY2tcclxuXHJcbiAgcmVvcGVuRGlhbG9nOiAoY2FsbGJhY2sgPSBudWxsKSAtPlxyXG4gICAgaWYgQHN0YXRlLm1ldGFkYXRhXHJcbiAgICAgIGlmIChub3QgQHN0YXRlLmRpcnR5KSBvciAoY29uZmlybSB0ciAnfkNPTkZJUk0uUkVPUEVOX0ZJTEUnKVxyXG4gICAgICAgIEBvcGVuRmlsZSBAc3RhdGUubWV0YWRhdGEsIGNhbGxiYWNrXHJcbiAgICBlbHNlXHJcbiAgICAgIGNhbGxiYWNrPyAnTm8gY3VycmVudGx5IGFjdGl2ZSBmaWxlJ1xyXG5cclxuICBkaXJ0eTogKGlzRGlydHkgPSB0cnVlKS0+XHJcbiAgICBAX3NldFN0YXRlXHJcbiAgICAgIGRpcnR5OiBpc0RpcnR5XHJcbiAgICAgIHNhdmVkOiBmYWxzZSBpZiBpc0RpcnR5XHJcblxyXG4gIGF1dG9TYXZlOiAoaW50ZXJ2YWwpIC0+XHJcbiAgICBpZiBAX2F1dG9TYXZlSW50ZXJ2YWxcclxuICAgICAgY2xlYXJJbnRlcnZhbCBAX2F1dG9TYXZlSW50ZXJ2YWxcclxuXHJcbiAgICAjIGluIGNhc2UgdGhlIGNhbGxlciB1c2VzIG1pbGxpc2Vjb25kc1xyXG4gICAgaWYgaW50ZXJ2YWwgPiAxMDAwXHJcbiAgICAgIGludGVydmFsID0gTWF0aC5yb3VuZChpbnRlcnZhbCAvIDEwMDApXHJcbiAgICBpZiBpbnRlcnZhbCA+IDBcclxuICAgICAgc2F2ZUlmRGlydHkgPSA9PlxyXG4gICAgICAgIGlmIEBzdGF0ZS5kaXJ0eSBhbmQgQHN0YXRlLm1ldGFkYXRhPy5wcm92aWRlcj8uY2FuICdzYXZlJ1xyXG4gICAgICAgICAgQHNhdmUoKVxyXG4gICAgICBAX2F1dG9TYXZlSW50ZXJ2YWwgPSBzZXRJbnRlcnZhbCBzYXZlSWZEaXJ0eSwgKGludGVydmFsICogMTAwMClcclxuXHJcbiAgaXNBdXRvU2F2aW5nOiAtPlxyXG4gICAgQF9hdXRvU2F2ZUludGVydmFsID4gMFxyXG5cclxuICBfZGlhbG9nU2F2ZTogKGNvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIGlmIGNvbnRlbnQgaXNudCBudWxsXHJcbiAgICAgIEBzYXZlRmlsZSBjb250ZW50LCBmYWxzZSwgbWV0YWRhdGEsIGNhbGxiYWNrXHJcbiAgICBlbHNlXHJcbiAgICAgIEBfZXZlbnQgJ2dldENvbnRlbnQnLCB7fSwgKGNvbnRlbnQpID0+XHJcbiAgICAgICAgQHNhdmVGaWxlIGNvbnRlbnQsIGZhbHNlLCBtZXRhZGF0YSwgY2FsbGJhY2tcclxuXHJcbiAgX2Vycm9yOiAobWVzc2FnZSkgLT5cclxuICAgICMgZm9yIG5vdyBhbiBhbGVydFxyXG4gICAgYWxlcnQgbWVzc2FnZVxyXG5cclxuICBfZmlsZUNoYW5nZWQ6ICh0eXBlLCBjb250ZW50LCBtZXRhZGF0YSkgLT5cclxuICAgIG1ldGFkYXRhLm92ZXJ3cml0YWJsZSA9IHRydWVcclxuICAgIEBfc2V0U3RhdGVcclxuICAgICAgY29udGVudDogY29udGVudFxyXG4gICAgICBtZXRhZGF0YTogbWV0YWRhdGFcclxuICAgICAgc2F2aW5nOiBudWxsXHJcbiAgICAgIHNhdmVkOiB0eXBlIGlzICdzYXZlZEZpbGUnXHJcbiAgICAgIGRpcnR5OiBmYWxzZVxyXG4gICAgQF9ldmVudCB0eXBlLCB7Y29udGVudDogY29udGVudCwgbWV0YWRhdGE6IG1ldGFkYXRhfVxyXG5cclxuICBfZXZlbnQ6ICh0eXBlLCBkYXRhID0ge30sIGV2ZW50Q2FsbGJhY2sgPSBudWxsKSAtPlxyXG4gICAgZXZlbnQgPSBuZXcgQ2xvdWRGaWxlTWFuYWdlckNsaWVudEV2ZW50IHR5cGUsIGRhdGEsIGV2ZW50Q2FsbGJhY2ssIEBzdGF0ZVxyXG4gICAgQGV2ZW50Q2FsbGJhY2s/IGV2ZW50XHJcbiAgICBAbGlzdGVuZXJDYWxsYmFjaz8gZXZlbnRcclxuXHJcbiAgX3NldFN0YXRlOiAob3B0aW9ucykgLT5cclxuICAgIGZvciBvd24ga2V5LCB2YWx1ZSBvZiBvcHRpb25zXHJcbiAgICAgIEBzdGF0ZVtrZXldID0gdmFsdWVcclxuICAgIEBfZXZlbnQgJ3N0YXRlQ2hhbmdlZCdcclxuXHJcbiAgX3Jlc2V0U3RhdGU6IC0+XHJcbiAgICBAX3NldFN0YXRlXHJcbiAgICAgIGNvbnRlbnQ6IG51bGxcclxuICAgICAgbWV0YWRhdGE6IG51bGxcclxuICAgICAgZGlydHk6IGZhbHNlXHJcbiAgICAgIHNhdmluZzogbnVsbFxyXG4gICAgICBzYXZlZDogZmFsc2VcclxuXHJcbm1vZHVsZS5leHBvcnRzID1cclxuICBDbG91ZEZpbGVNYW5hZ2VyQ2xpZW50RXZlbnQ6IENsb3VkRmlsZU1hbmFnZXJDbGllbnRFdmVudFxyXG4gIENsb3VkRmlsZU1hbmFnZXJDbGllbnQ6IENsb3VkRmlsZU1hbmFnZXJDbGllbnRcclxuIiwie2RpdiwgYnV0dG9uLCBzcGFufSA9IFJlYWN0LkRPTVxyXG5cclxuZG9jdW1lbnRTdG9yZSA9IFwiaHR0cDovL2RvY3VtZW50LXN0b3JlLmhlcm9rdWFwcC5jb21cIlxyXG5hdXRob3JpemVVcmwgICAgICA9IFwiI3tkb2N1bWVudFN0b3JlfS91c2VyL2F1dGhlbnRpY2F0ZVwiXHJcbmNoZWNrTG9naW5VcmwgICAgID0gXCIje2RvY3VtZW50U3RvcmV9L3VzZXIvaW5mb1wiXHJcbmxpc3RVcmwgICAgICAgICAgID0gXCIje2RvY3VtZW50U3RvcmV9L2RvY3VtZW50L2FsbFwiXHJcbmxvYWREb2N1bWVudFVybCAgID0gXCIje2RvY3VtZW50U3RvcmV9L2RvY3VtZW50L29wZW5cIlxyXG5zYXZlRG9jdW1lbnRVcmwgICA9IFwiI3tkb2N1bWVudFN0b3JlfS9kb2N1bWVudC9zYXZlXCJcclxucGF0Y2hEb2N1bWVudFVybCAgPSBcIiN7ZG9jdW1lbnRTdG9yZX0vZG9jdW1lbnQvcGF0Y2hcIlxyXG5yZW1vdmVEb2N1bWVudFVybCA9IFwiI3tkb2N1bWVudFN0b3JlfS9kb2N1bWVudC9kZWxldGVcIlxyXG5yZW5hbWVEb2N1bWVudFVybCA9IFwiI3tkb2N1bWVudFN0b3JlfS9kb2N1bWVudC9yZW5hbWVcIlxyXG5cclxudHIgPSByZXF1aXJlICcuLi91dGlscy90cmFuc2xhdGUnXHJcbmlzU3RyaW5nID0gcmVxdWlyZSAnLi4vdXRpbHMvaXMtc3RyaW5nJ1xyXG5cclxuUHJvdmlkZXJJbnRlcmZhY2UgPSAocmVxdWlyZSAnLi9wcm92aWRlci1pbnRlcmZhY2UnKS5Qcm92aWRlckludGVyZmFjZVxyXG5DbG91ZE1ldGFkYXRhID0gKHJlcXVpcmUgJy4vcHJvdmlkZXItaW50ZXJmYWNlJykuQ2xvdWRNZXRhZGF0YVxyXG5cclxuRG9jdW1lbnRTdG9yZUF1dGhvcml6YXRpb25EaWFsb2cgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IFJlYWN0LmNyZWF0ZUNsYXNzXHJcbiAgZGlzcGxheU5hbWU6ICdEb2N1bWVudFN0b3JlQXV0aG9yaXphdGlvbkRpYWxvZydcclxuXHJcbiAgZ2V0SW5pdGlhbFN0YXRlOiAtPlxyXG4gICAgZG9jU3RvcmVBdmFpbGFibGU6IGZhbHNlXHJcblxyXG4gIGNvbXBvbmVudFdpbGxNb3VudDogLT5cclxuICAgIEBwcm9wcy5wcm92aWRlci5fb25Eb2NTdG9yZUxvYWRlZCA9PlxyXG4gICAgICBAc2V0U3RhdGUgZG9jU3RvcmVBdmFpbGFibGU6IHRydWVcclxuXHJcbiAgYXV0aGVudGljYXRlOiAtPlxyXG4gICAgQHByb3BzLnByb3ZpZGVyLmF1dGhvcml6ZSgpXHJcblxyXG4gIHJlbmRlcjogLT5cclxuICAgIChkaXYge30sXHJcbiAgICAgIGlmIEBzdGF0ZS5kb2NTdG9yZUF2YWlsYWJsZVxyXG4gICAgICAgIChidXR0b24ge29uQ2xpY2s6IEBhdXRoZW50aWNhdGV9LCAnQXV0aG9yaXphdGlvbiBOZWVkZWQnKVxyXG4gICAgICBlbHNlXHJcbiAgICAgICAgJ1RyeWluZyB0byBsb2cgaW50byB0aGUgRG9jdW1lbnQgU3RvcmUuLi4nXHJcbiAgICApXHJcblxyXG5jbGFzcyBEb2N1bWVudFN0b3JlUHJvdmlkZXIgZXh0ZW5kcyBQcm92aWRlckludGVyZmFjZVxyXG5cclxuICBjb25zdHJ1Y3RvcjogKEBvcHRpb25zID0ge30pIC0+XHJcbiAgICBzdXBlclxyXG4gICAgICBuYW1lOiBEb2N1bWVudFN0b3JlUHJvdmlkZXIuTmFtZVxyXG4gICAgICBkaXNwbGF5TmFtZTogQG9wdGlvbnMuZGlzcGxheU5hbWUgb3IgKHRyICd+UFJPVklERVIuRE9DVU1FTlRfU1RPUkUnKVxyXG4gICAgICBjYXBhYmlsaXRpZXM6XHJcbiAgICAgICAgc2F2ZTogdHJ1ZVxyXG4gICAgICAgIGxvYWQ6IHRydWVcclxuICAgICAgICBsaXN0OiB0cnVlXHJcbiAgICAgICAgcmVtb3ZlOiB0cnVlXHJcbiAgICAgICAgcmVuYW1lOiB0cnVlXHJcbiAgICAgICAgcGF0Y2g6IHRydWVcclxuXHJcbiAgICBAdXNlciA9IG51bGxcclxuXHJcbiAgQE5hbWU6ICdkb2N1bWVudFN0b3JlJ1xyXG5cclxuICBhdXRob3JpemVkOiAoQGF1dGhDYWxsYmFjaykgLT5cclxuICAgIGlmIEBhdXRoQ2FsbGJhY2tcclxuICAgICAgaWYgQHVzZXJcclxuICAgICAgICBAYXV0aENhbGxiYWNrIHRydWVcclxuICAgICAgZWxzZVxyXG4gICAgICAgIEBfY2hlY2tMb2dpbigpXHJcbiAgICBlbHNlXHJcbiAgICAgIEB1c2VyIGlzbnQgbnVsbFxyXG5cclxuICBhdXRob3JpemU6IC0+XHJcbiAgICBAX3Nob3dMb2dpbldpbmRvdygpXHJcblxyXG4gIF9vbkRvY1N0b3JlTG9hZGVkOiAoQGRvY1N0b3JlTG9hZGVkQ2FsbGJhY2spIC0+XHJcbiAgICBpZiBAX2RvY1N0b3JlTG9hZGVkXHJcbiAgICAgIEBkb2NTdG9yZUxvYWRlZENhbGxiYWNrKClcclxuXHJcbiAgX2xvZ2luU3VjY2Vzc2Z1bDogKEB1c2VyKSAtPlxyXG4gICAgQF9sb2dpbldpbmRvdz8uY2xvc2UoKVxyXG4gICAgQGF1dGhDYWxsYmFjayB0cnVlXHJcblxyXG4gIF9jaGVja0xvZ2luOiAtPlxyXG4gICAgcHJvdmlkZXIgPSBAXHJcbiAgICAkLmFqYXhcclxuICAgICAgZGF0YVR5cGU6ICdqc29uJ1xyXG4gICAgICB1cmw6IGNoZWNrTG9naW5VcmxcclxuICAgICAgeGhyRmllbGRzOlxyXG4gICAgICAgIHdpdGhDcmVkZW50aWFsczogdHJ1ZVxyXG4gICAgICBzdWNjZXNzOiAoZGF0YSkgLT5cclxuICAgICAgICBwcm92aWRlci5kb2NTdG9yZUxvYWRlZENhbGxiYWNrKClcclxuICAgICAgICBwcm92aWRlci5fbG9naW5TdWNjZXNzZnVsKGRhdGEpXHJcbiAgICAgIGVycm9yOiAtPlxyXG4gICAgICAgIHByb3ZpZGVyLmRvY1N0b3JlTG9hZGVkQ2FsbGJhY2soKVxyXG5cclxuICBfbG9naW5XaW5kb3c6IG51bGxcclxuXHJcbiAgX3Nob3dMb2dpbldpbmRvdzogLT5cclxuICAgIGlmIEBfbG9naW5XaW5kb3cgYW5kIG5vdCBAX2xvZ2luV2luZG93LmNsb3NlZFxyXG4gICAgICBAX2xvZ2luV2luZG93LmZvY3VzKClcclxuICAgIGVsc2VcclxuXHJcbiAgICAgIGNvbXB1dGVTY3JlZW5Mb2NhdGlvbiA9ICh3LCBoKSAtPlxyXG4gICAgICAgIHNjcmVlbkxlZnQgPSB3aW5kb3cuc2NyZWVuTGVmdCBvciBzY3JlZW4ubGVmdFxyXG4gICAgICAgIHNjcmVlblRvcCAgPSB3aW5kb3cuc2NyZWVuVG9wICBvciBzY3JlZW4udG9wXHJcbiAgICAgICAgd2lkdGggID0gd2luZG93LmlubmVyV2lkdGggIG9yIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGllbnRXaWR0aCAgb3Igc2NyZWVuLndpZHRoXHJcbiAgICAgICAgaGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0IG9yIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGllbnRIZWlnaHQgb3Igc2NyZWVuLmhlaWdodFxyXG5cclxuICAgICAgICBsZWZ0ID0gKCh3aWR0aCAvIDIpIC0gKHcgLyAyKSkgKyBzY3JlZW5MZWZ0XHJcbiAgICAgICAgdG9wID0gKChoZWlnaHQgLyAyKSAtIChoIC8gMikpICsgc2NyZWVuVG9wXHJcbiAgICAgICAgcmV0dXJuIHtsZWZ0LCB0b3B9XHJcblxyXG4gICAgICB3aWR0aCA9IDEwMDBcclxuICAgICAgaGVpZ2h0ID0gNDgwXHJcbiAgICAgIHBvc2l0aW9uID0gY29tcHV0ZVNjcmVlbkxvY2F0aW9uIHdpZHRoLCBoZWlnaHRcclxuICAgICAgd2luZG93RmVhdHVyZXMgPSBbXHJcbiAgICAgICAgJ3dpZHRoPScgKyB3aWR0aFxyXG4gICAgICAgICdoZWlnaHQ9JyArIGhlaWdodFxyXG4gICAgICAgICd0b3A9JyArIHBvc2l0aW9uLnRvcCBvciAyMDBcclxuICAgICAgICAnbGVmdD0nICsgcG9zaXRpb24ubGVmdCBvciAyMDBcclxuICAgICAgICAnZGVwZW5kZW50PXllcydcclxuICAgICAgICAncmVzaXphYmxlPW5vJ1xyXG4gICAgICAgICdsb2NhdGlvbj1ubydcclxuICAgICAgICAnZGlhbG9nPXllcydcclxuICAgICAgICAnbWVudWJhcj1ubydcclxuICAgICAgXVxyXG5cclxuICAgICAgQF9sb2dpbldpbmRvdyA9IHdpbmRvdy5vcGVuKGF1dGhvcml6ZVVybCwgJ2F1dGgnLCB3aW5kb3dGZWF0dXJlcy5qb2luKCkpXHJcblxyXG4gICAgICBwb2xsQWN0aW9uID0gPT5cclxuICAgICAgICB0cnlcclxuICAgICAgICAgIGhyZWYgPSBAX2xvZ2luV2luZG93LmxvY2F0aW9uLmhyZWZcclxuICAgICAgICAgIGlmIChocmVmIGlzIHdpbmRvdy5sb2NhdGlvbi5ocmVmKVxyXG4gICAgICAgICAgICBjbGVhckludGVydmFsIHBvbGxcclxuICAgICAgICAgICAgQF9sb2dpbldpbmRvdy5jbG9zZSgpXHJcbiAgICAgICAgICAgIEBfY2hlY2tMb2dpbigpXHJcbiAgICAgICAgY2F0Y2ggZVxyXG4gICAgICAgICAgIyBjb25zb2xlLmxvZyBlXHJcblxyXG4gICAgICBwb2xsID0gc2V0SW50ZXJ2YWwgcG9sbEFjdGlvbiwgMjAwXHJcblxyXG4gIHJlbmRlckF1dGhvcml6YXRpb25EaWFsb2c6IC0+XHJcbiAgICAoRG9jdW1lbnRTdG9yZUF1dGhvcml6YXRpb25EaWFsb2cge3Byb3ZpZGVyOiBALCBhdXRoQ2FsbGJhY2s6IEBhdXRoQ2FsbGJhY2t9KVxyXG5cclxuICByZW5kZXJVc2VyOiAtPlxyXG4gICAgaWYgQHVzZXJcclxuICAgICAgKHNwYW4ge30sIChzcGFuIHtjbGFzc05hbWU6ICdkb2N1bWVudC1zdG9yZS1pY29uJ30pLCBAdXNlci5uYW1lKVxyXG4gICAgZWxzZVxyXG4gICAgICBudWxsXHJcblxyXG4gIGxpc3Q6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICAkLmFqYXhcclxuICAgICAgZGF0YVR5cGU6ICdqc29uJ1xyXG4gICAgICB1cmw6IGxpc3RVcmxcclxuICAgICAgY29udGV4dDogQFxyXG4gICAgICB4aHJGaWVsZHM6XHJcbiAgICAgICAgd2l0aENyZWRlbnRpYWxzOiB0cnVlXHJcbiAgICAgIHN1Y2Nlc3M6IChkYXRhKSAtPlxyXG4gICAgICAgIGxpc3QgPSBbXVxyXG4gICAgICAgIGZvciBvd24ga2V5LCBmaWxlIG9mIGRhdGFcclxuICAgICAgICAgIGxpc3QucHVzaCBuZXcgQ2xvdWRNZXRhZGF0YVxyXG4gICAgICAgICAgICBuYW1lOiBmaWxlLm5hbWVcclxuICAgICAgICAgICAgcHJvdmlkZXJEYXRhOiB7aWQ6IGZpbGUuaWR9XHJcbiAgICAgICAgICAgIHR5cGU6IENsb3VkTWV0YWRhdGEuRmlsZVxyXG4gICAgICAgICAgICBwcm92aWRlcjogQFxyXG4gICAgICAgIGNhbGxiYWNrIG51bGwsIGxpc3RcclxuICAgICAgZXJyb3I6IC0+XHJcbiAgICAgICAgY2FsbGJhY2sgbnVsbCwgW11cclxuXHJcbiAgbG9hZDogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgICQuYWpheFxyXG4gICAgICB1cmw6IGxvYWREb2N1bWVudFVybFxyXG4gICAgICBkYXRhOlxyXG4gICAgICAgIHJlY29yZGlkOiBtZXRhZGF0YS5wcm92aWRlckRhdGEuaWRcclxuICAgICAgY29udGV4dDogQFxyXG4gICAgICB4aHJGaWVsZHM6XHJcbiAgICAgICAgd2l0aENyZWRlbnRpYWxzOiB0cnVlXHJcbiAgICAgIHN1Y2Nlc3M6IChkYXRhKSAtPlxyXG4gICAgICAgIGNhbGxiYWNrIG51bGwsIEpTT04uc3RyaW5naWZ5IGRhdGFcclxuICAgICAgZXJyb3I6IC0+XHJcbiAgICAgICAgY2FsbGJhY2sgXCJVbmFibGUgdG8gbG9hZCBcIittZXRhZGF0YS5uYW1lXHJcblxyXG4gIHNhdmU6IChjb250ZW50LCBtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICBjb250ZW50ID0gQF92YWxpZGF0ZUNvbnRlbnQgY29udGVudFxyXG5cclxuICAgIHBhcmFtcyA9IHt9XHJcbiAgICBpZiBtZXRhZGF0YS5wcm92aWRlckRhdGEuaWQgdGhlbiBwYXJhbXMucmVjb3JkaWQgPSBtZXRhZGF0YS5wcm92aWRlckRhdGEuaWRcclxuICAgIGlmIG1ldGFkYXRhLm5hbWUgdGhlbiBwYXJhbXMucmVjb3JkbmFtZSA9IG1ldGFkYXRhLm5hbWVcclxuXHJcbiAgICB1cmwgPSBAX2FkZFBhcmFtcyhzYXZlRG9jdW1lbnRVcmwsIHBhcmFtcylcclxuXHJcbiAgICAkLmFqYXhcclxuICAgICAgZGF0YVR5cGU6ICdqc29uJ1xyXG4gICAgICBtZXRob2Q6ICdQT1NUJ1xyXG4gICAgICB1cmw6IHVybFxyXG4gICAgICBkYXRhOiBjb250ZW50XHJcbiAgICAgIGNvbnRleHQ6IEBcclxuICAgICAgeGhyRmllbGRzOlxyXG4gICAgICAgIHdpdGhDcmVkZW50aWFsczogdHJ1ZVxyXG4gICAgICBzdWNjZXNzOiAoZGF0YSkgLT5cclxuICAgICAgICBpZiBkYXRhLmlkIHRoZW4gbWV0YWRhdGEucHJvdmlkZXJEYXRhLmlkID0gZGF0YS5pZFxyXG4gICAgICAgIGNhbGxiYWNrIG51bGwsIGRhdGFcclxuICAgICAgZXJyb3I6IC0+XHJcbiAgICAgICAgY2FsbGJhY2sgXCJVbmFibGUgdG8gbG9hZCBcIittZXRhZGF0YS5uYW1lXHJcblxyXG4gIHBhdGNoOiAoY29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgdW5sZXNzIG1ldGFkYXRhPy5vdmVyd3JpdGFibGUgYW5kIG1ldGFkYXRhLnByb3ZpZGVyRGF0YS5pZFxyXG4gICAgICByZXR1cm4gQHNhdmUoY29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrKVxyXG5cclxuICAgIHVybCA9IEBfYWRkUGFyYW1zKHBhdGNoRG9jdW1lbnRVcmwsIHtyZWNvcmRpZDogbWV0YWRhdGEucHJvdmlkZXJEYXRhLmlkfSlcclxuXHJcbiAgICAkLmFqYXhcclxuICAgICAgZGF0YVR5cGU6ICdqc29uJ1xyXG4gICAgICBtZXRob2Q6ICdQT1NUJ1xyXG4gICAgICB1cmw6IHVybFxyXG4gICAgICBkYXRhOiBjb250ZW50XHJcbiAgICAgIGNvbnRleHQ6IEBcclxuICAgICAgeGhyRmllbGRzOlxyXG4gICAgICAgIHdpdGhDcmVkZW50aWFsczogdHJ1ZVxyXG4gICAgICBzdWNjZXNzOiAoZGF0YSkgLT5cclxuICAgICAgICBjYWxsYmFjayBudWxsLCBkYXRhXHJcbiAgICAgIGVycm9yOiAtPlxyXG4gICAgICAgIGNhbGxiYWNrIFwiVW5hYmxlIHRvIGxvYWQgXCIrbWV0YWRhdGEubmFtZVxyXG5cclxuXHJcbiAgcmVtb3ZlOiAobWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgJC5hamF4XHJcbiAgICAgIHVybDogcmVtb3ZlRG9jdW1lbnRVcmxcclxuICAgICAgZGF0YTpcclxuICAgICAgICByZWNvcmRuYW1lOiBtZXRhZGF0YS5uYW1lXHJcbiAgICAgIGNvbnRleHQ6IEBcclxuICAgICAgeGhyRmllbGRzOlxyXG4gICAgICAgIHdpdGhDcmVkZW50aWFsczogdHJ1ZVxyXG4gICAgICBzdWNjZXNzOiAoZGF0YSkgLT5cclxuICAgICAgICBjYWxsYmFjayBudWxsLCBkYXRhXHJcbiAgICAgIGVycm9yOiAtPlxyXG4gICAgICAgIGNhbGxiYWNrIFwiVW5hYmxlIHRvIGxvYWQgXCIrbWV0YWRhdGEubmFtZVxyXG5cclxuICByZW5hbWU6IChtZXRhZGF0YSwgbmV3TmFtZSwgY2FsbGJhY2spIC0+XHJcbiAgICAkLmFqYXhcclxuICAgICAgdXJsOiByZW5hbWVEb2N1bWVudFVybFxyXG4gICAgICBkYXRhOlxyXG4gICAgICAgIHJlY29yZGlkOiBtZXRhZGF0YS5wcm92aWRlckRhdGEuaWRcclxuICAgICAgICBuZXdSZWNvcmRuYW1lOiBuZXdOYW1lXHJcbiAgICAgIGNvbnRleHQ6IEBcclxuICAgICAgeGhyRmllbGRzOlxyXG4gICAgICAgIHdpdGhDcmVkZW50aWFsczogdHJ1ZVxyXG4gICAgICBzdWNjZXNzOiAoZGF0YSkgLT5cclxuICAgICAgICBtZXRhZGF0YS5uYW1lID0gbmV3TmFtZVxyXG4gICAgICAgIGNhbGxiYWNrIG51bGwsIG1ldGFkYXRhXHJcbiAgICAgIGVycm9yOiAtPlxyXG4gICAgICAgIGNhbGxiYWNrIFwiVW5hYmxlIHRvIHJlbmFtZSBcIittZXRhZGF0YS5uYW1lXHJcblxyXG4gIF9hZGRQYXJhbXM6ICh1cmwsIHBhcmFtcykgLT5cclxuICAgIHJldHVybiB1cmwgdW5sZXNzIHBhcmFtc1xyXG4gICAga3ZwID0gW11cclxuICAgIGZvciBrZXksIHZhbHVlIG9mIHBhcmFtc1xyXG4gICAgICBrdnAucHVzaCBba2V5LCB2YWx1ZV0ubWFwKGVuY29kZVVSSSkuam9pbiBcIj1cIlxyXG4gICAgcmV0dXJuIHVybCArIFwiP1wiICsga3ZwLmpvaW4gXCImXCJcclxuXHJcbiAgIyBUaGUgZG9jdW1lbnQgc2VydmVyIHJlcXVpcmVzIHRoZSBjb250ZW50IHRvIGJlIEpTT04sIGFuZCBpdCBtdXN0IGhhdmVcclxuICAjIGNlcnRhaW4gcHJlLWRlZmluZWQga2V5cyBpbiBvcmRlciB0byBiZSBsaXN0ZWQgd2hlbiB3ZSBxdWVyeSB0aGUgbGlzdFxyXG4gIF92YWxpZGF0ZUNvbnRlbnQ6IChjb250ZW50KSAtPlxyXG4gICAgIyBmaXJzdCBjb252ZXJ0IHRvIGFuIG9iamVjdCB0byBlYXNpbHkgYWRkIHByb3BlcnRpZXNcclxuICAgIHRyeVxyXG4gICAgICBjb250ZW50ID0gSlNPTi5wYXJzZSBjb250ZW50XHJcbiAgICBjYXRjaFxyXG4gICAgICBjb250ZW50ID0ge2NvbnRlbnQ6IGNvbnRlbnR9XHJcblxyXG4gICAgY29udGVudC5hcHBOYW1lICAgICA/PSBAb3B0aW9ucy5hcHBOYW1lXHJcbiAgICBjb250ZW50LmFwcFZlcnNpb24gID89IEBvcHRpb25zLmFwcFZlcnNpb25cclxuICAgIGNvbnRlbnQuYXBwQnVpbGROdW0gPz0gQG9wdGlvbnMuYXBwQnVpbGROdW1cclxuXHJcbiAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkgY29udGVudFxyXG5cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gRG9jdW1lbnRTdG9yZVByb3ZpZGVyXHJcbiIsIntkaXYsIGJ1dHRvbiwgc3Bhbn0gPSBSZWFjdC5ET01cclxuXHJcbnRyID0gcmVxdWlyZSAnLi4vdXRpbHMvdHJhbnNsYXRlJ1xyXG5pc1N0cmluZyA9IHJlcXVpcmUgJy4uL3V0aWxzL2lzLXN0cmluZydcclxuXHJcblByb3ZpZGVySW50ZXJmYWNlID0gKHJlcXVpcmUgJy4vcHJvdmlkZXItaW50ZXJmYWNlJykuUHJvdmlkZXJJbnRlcmZhY2VcclxuQ2xvdWRNZXRhZGF0YSA9IChyZXF1aXJlICcuL3Byb3ZpZGVyLWludGVyZmFjZScpLkNsb3VkTWV0YWRhdGFcclxuXHJcbkdvb2dsZURyaXZlQXV0aG9yaXphdGlvbkRpYWxvZyA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgUmVhY3QuY3JlYXRlQ2xhc3NcclxuICBkaXNwbGF5TmFtZTogJ0dvb2dsZURyaXZlQXV0aG9yaXphdGlvbkRpYWxvZydcclxuXHJcbiAgZ2V0SW5pdGlhbFN0YXRlOiAtPlxyXG4gICAgbG9hZGVkR0FQSTogZmFsc2VcclxuXHJcbiAgY29tcG9uZW50V2lsbE1vdW50OiAtPlxyXG4gICAgQHByb3BzLnByb3ZpZGVyLl9sb2FkZWRHQVBJID0+XHJcbiAgICAgIEBzZXRTdGF0ZSBsb2FkZWRHQVBJOiB0cnVlXHJcblxyXG4gIGF1dGhlbnRpY2F0ZTogLT5cclxuICAgIEBwcm9wcy5wcm92aWRlci5hdXRob3JpemUgR29vZ2xlRHJpdmVQcm92aWRlci5TSE9XX1BPUFVQXHJcblxyXG4gIHJlbmRlcjogLT5cclxuICAgIChkaXYge30sXHJcbiAgICAgIGlmIEBzdGF0ZS5sb2FkZWRHQVBJXHJcbiAgICAgICAgKGJ1dHRvbiB7b25DbGljazogQGF1dGhlbnRpY2F0ZX0sICdBdXRob3JpemF0aW9uIE5lZWRlZCcpXHJcbiAgICAgIGVsc2VcclxuICAgICAgICAnV2FpdGluZyBmb3IgdGhlIEdvb2dsZSBDbGllbnQgQVBJIHRvIGxvYWQuLi4nXHJcbiAgICApXHJcblxyXG5jbGFzcyBHb29nbGVEcml2ZVByb3ZpZGVyIGV4dGVuZHMgUHJvdmlkZXJJbnRlcmZhY2VcclxuXHJcbiAgY29uc3RydWN0b3I6IChAb3B0aW9ucyA9IHt9KSAtPlxyXG4gICAgc3VwZXJcclxuICAgICAgbmFtZTogR29vZ2xlRHJpdmVQcm92aWRlci5OYW1lXHJcbiAgICAgIGRpc3BsYXlOYW1lOiBAb3B0aW9ucy5kaXNwbGF5TmFtZSBvciAodHIgJ35QUk9WSURFUi5HT09HTEVfRFJJVkUnKVxyXG4gICAgICBjYXBhYmlsaXRpZXM6XHJcbiAgICAgICAgc2F2ZTogdHJ1ZVxyXG4gICAgICAgIGxvYWQ6IHRydWVcclxuICAgICAgICBsaXN0OiB0cnVlXHJcbiAgICAgICAgcmVtb3ZlOiB0cnVlXHJcbiAgICAgICAgcmVuYW1lOiB0cnVlXHJcblxyXG4gICAgQGF1dGhUb2tlbiA9IG51bGxcclxuICAgIEB1c2VyID0gbnVsbFxyXG4gICAgQGNsaWVudElkID0gQG9wdGlvbnMuY2xpZW50SWRcclxuICAgIGlmIG5vdCBAY2xpZW50SWRcclxuICAgICAgdGhyb3cgbmV3IEVycm9yICdNaXNzaW5nIHJlcXVpcmVkIGNsaWVudElkIGluIGdvb2dsZURyaXZlIHByb3ZpZGVyIG9wdGlvbnMnXHJcbiAgICBAbWltZVR5cGUgPSBAb3B0aW9ucy5taW1lVHlwZSBvciBcInRleHQvcGxhaW5cIlxyXG4gICAgQF9sb2FkR0FQSSgpXHJcblxyXG4gIEBOYW1lOiAnZ29vZ2xlRHJpdmUnXHJcblxyXG4gICMgYWxpYXNlcyBmb3IgYm9vbGVhbiBwYXJhbWV0ZXIgdG8gYXV0aG9yaXplXHJcbiAgQElNTUVESUFURSA9IHRydWVcclxuICBAU0hPV19QT1BVUCA9IGZhbHNlXHJcblxyXG4gIGF1dGhvcml6ZWQ6IChAYXV0aENhbGxiYWNrKSAtPlxyXG4gICAgaWYgQGF1dGhDYWxsYmFja1xyXG4gICAgICBpZiBAYXV0aFRva2VuXHJcbiAgICAgICAgQGF1dGhDYWxsYmFjayB0cnVlXHJcbiAgICAgIGVsc2VcclxuICAgICAgICBAYXV0aG9yaXplIEdvb2dsZURyaXZlUHJvdmlkZXIuSU1NRURJQVRFXHJcbiAgICBlbHNlXHJcbiAgICAgIEBhdXRoVG9rZW4gaXNudCBudWxsXHJcblxyXG4gIGF1dGhvcml6ZTogKGltbWVkaWF0ZSkgLT5cclxuICAgIEBfbG9hZGVkR0FQSSA9PlxyXG4gICAgICBhcmdzID1cclxuICAgICAgICBjbGllbnRfaWQ6IEBjbGllbnRJZFxyXG4gICAgICAgIHNjb3BlOiBbJ2h0dHBzOi8vd3d3Lmdvb2dsZWFwaXMuY29tL2F1dGgvZHJpdmUnLCAnaHR0cHM6Ly93d3cuZ29vZ2xlYXBpcy5jb20vYXV0aC91c2VyaW5mby5wcm9maWxlJ11cclxuICAgICAgICBpbW1lZGlhdGU6IGltbWVkaWF0ZVxyXG4gICAgICBnYXBpLmF1dGguYXV0aG9yaXplIGFyZ3MsIChhdXRoVG9rZW4pID0+XHJcbiAgICAgICAgQGF1dGhUb2tlbiA9IGlmIGF1dGhUb2tlbiBhbmQgbm90IGF1dGhUb2tlbi5lcnJvciB0aGVuIGF1dGhUb2tlbiBlbHNlIG51bGxcclxuICAgICAgICBAdXNlciA9IG51bGxcclxuICAgICAgICBpZiBAYXV0aFRva2VuXHJcbiAgICAgICAgICBnYXBpLmNsaWVudC5vYXV0aDIudXNlcmluZm8uZ2V0KCkuZXhlY3V0ZSAodXNlcikgPT5cclxuICAgICAgICAgICAgQHVzZXIgPSB1c2VyXHJcbiAgICAgICAgQGF1dGhDYWxsYmFjayBAYXV0aFRva2VuIGlzbnQgbnVsbFxyXG5cclxuICByZW5kZXJBdXRob3JpemF0aW9uRGlhbG9nOiAtPlxyXG4gICAgKEdvb2dsZURyaXZlQXV0aG9yaXphdGlvbkRpYWxvZyB7cHJvdmlkZXI6IEB9KVxyXG5cclxuICByZW5kZXJVc2VyOiAtPlxyXG4gICAgaWYgQHVzZXJcclxuICAgICAgKHNwYW4ge30sIChzcGFuIHtjbGFzc05hbWU6ICdnZHJpdmUtaWNvbid9KSwgQHVzZXIubmFtZSlcclxuICAgIGVsc2VcclxuICAgICAgbnVsbFxyXG5cclxuICBzYXZlOiAgKGNvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIEBfbG9hZGVkR0FQSSA9PlxyXG4gICAgICBAX3NlbmRGaWxlIGNvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFja1xyXG5cclxuICBsb2FkOiAobWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgQF9sb2FkZWRHQVBJID0+XHJcbiAgICAgIHJlcXVlc3QgPSBnYXBpLmNsaWVudC5kcml2ZS5maWxlcy5nZXRcclxuICAgICAgICBmaWxlSWQ6IG1ldGFkYXRhLnByb3ZpZGVyRGF0YS5pZFxyXG4gICAgICByZXF1ZXN0LmV4ZWN1dGUgKGZpbGUpID0+XHJcbiAgICAgICAgaWYgZmlsZT8uZG93bmxvYWRVcmxcclxuICAgICAgICAgIEBfZG93bmxvYWRGcm9tVXJsIGZpbGUuZG93bmxvYWRVcmwsIEBhdXRoVG9rZW4sIGNhbGxiYWNrXHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgY2FsbGJhY2sgJ1VuYWJsZSB0byBnZXQgZG93bmxvYWQgdXJsJ1xyXG5cclxuICBsaXN0OiAobWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgQF9sb2FkZWRHQVBJID0+XHJcbiAgICAgIHJlcXVlc3QgPSBnYXBpLmNsaWVudC5kcml2ZS5maWxlcy5saXN0XHJcbiAgICAgICAgcTogXCJtaW1lVHlwZSA9ICcje0BtaW1lVHlwZX0nXCJcclxuICAgICAgcmVxdWVzdC5leGVjdXRlIChyZXN1bHQpID0+XHJcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrKCdVbmFibGUgdG8gbGlzdCBmaWxlcycpIGlmIG5vdCByZXN1bHRcclxuICAgICAgICBsaXN0ID0gW11cclxuICAgICAgICBmb3IgaXRlbSBpbiByZXN1bHQ/Lml0ZW1zXHJcbiAgICAgICAgICAjIFRPRE86IGZvciBub3cgZG9uJ3QgYWxsb3cgZm9sZGVyc1xyXG4gICAgICAgICAgaWYgaXRlbS5taW1lVHlwZSBpc250ICdhcHBsaWNhdGlvbi92bmQuZ29vZ2xlLWFwcHMuZm9sZGVyJ1xyXG4gICAgICAgICAgICBsaXN0LnB1c2ggbmV3IENsb3VkTWV0YWRhdGFcclxuICAgICAgICAgICAgICBuYW1lOiBpdGVtLnRpdGxlXHJcbiAgICAgICAgICAgICAgcGF0aDogXCJcIlxyXG4gICAgICAgICAgICAgIHR5cGU6IGlmIGl0ZW0ubWltZVR5cGUgaXMgJ2FwcGxpY2F0aW9uL3ZuZC5nb29nbGUtYXBwcy5mb2xkZXInIHRoZW4gQ2xvdWRNZXRhZGF0YS5Gb2xkZXIgZWxzZSBDbG91ZE1ldGFkYXRhLkZpbGVcclxuICAgICAgICAgICAgICBwcm92aWRlcjogQFxyXG4gICAgICAgICAgICAgIHByb3ZpZGVyRGF0YTpcclxuICAgICAgICAgICAgICAgIGlkOiBpdGVtLmlkXHJcbiAgICAgICAgbGlzdC5zb3J0IChhLCBiKSAtPlxyXG4gICAgICAgICAgbG93ZXJBID0gYS5uYW1lLnRvTG93ZXJDYXNlKClcclxuICAgICAgICAgIGxvd2VyQiA9IGIubmFtZS50b0xvd2VyQ2FzZSgpXHJcbiAgICAgICAgICByZXR1cm4gLTEgaWYgbG93ZXJBIDwgbG93ZXJCXHJcbiAgICAgICAgICByZXR1cm4gMSBpZiBsb3dlckEgPiBsb3dlckJcclxuICAgICAgICAgIHJldHVybiAwXHJcbiAgICAgICAgY2FsbGJhY2sgbnVsbCwgbGlzdFxyXG5cclxuICByZW1vdmU6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XHJcbiAgICBAX2xvYWRlZEdBUEkgLT5cclxuICAgICAgcmVxdWVzdCA9IGdhcGkuY2xpZW50LmRyaXZlLmZpbGVzLmRlbGV0ZVxyXG4gICAgICAgIGZpbGVJZDogbWV0YWRhdGEucHJvdmlkZXJEYXRhLmlkXHJcbiAgICAgIHJlcXVlc3QuZXhlY3V0ZSAocmVzdWx0KSAtPlxyXG4gICAgICAgIGNhbGxiYWNrPyByZXN1bHQ/LmVycm9yIG9yIG51bGxcclxuXHJcbiAgcmVuYW1lOiAobWV0YWRhdGEsIG5ld05hbWUsIGNhbGxiYWNrKSAtPlxyXG4gICAgQF9sb2FkZWRHQVBJIC0+XHJcbiAgICAgIHJlcXVlc3QgPSBnYXBpLmNsaWVudC5kcml2ZS5maWxlcy5wYXRjaFxyXG4gICAgICAgIGZpbGVJZDogbWV0YWRhdGEucHJvdmlkZXJEYXRhLmlkXHJcbiAgICAgICAgcmVzb3VyY2U6XHJcbiAgICAgICAgICB0aXRsZTogbmV3TmFtZVxyXG4gICAgICByZXF1ZXN0LmV4ZWN1dGUgKHJlc3VsdCkgLT5cclxuICAgICAgICBpZiByZXN1bHQ/LmVycm9yXHJcbiAgICAgICAgICBjYWxsYmFjaz8gcmVzdWx0LmVycm9yXHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgbWV0YWRhdGEubmFtZSA9IG5ld05hbWVcclxuICAgICAgICAgIGNhbGxiYWNrIG51bGwsIG1ldGFkYXRhXHJcblxyXG4gIF9sb2FkR0FQSTogLT5cclxuICAgIGlmIG5vdCB3aW5kb3cuX0xvYWRpbmdHQVBJXHJcbiAgICAgIHdpbmRvdy5fTG9hZGluZ0dBUEkgPSB0cnVlXHJcbiAgICAgIHdpbmRvdy5fR0FQSU9uTG9hZCA9IC0+XHJcbiAgICAgICAgQHdpbmRvdy5fTG9hZGVkR0FQSSA9IHRydWVcclxuICAgICAgc2NyaXB0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCAnc2NyaXB0J1xyXG4gICAgICBzY3JpcHQuc3JjID0gJ2h0dHBzOi8vYXBpcy5nb29nbGUuY29tL2pzL2NsaWVudC5qcz9vbmxvYWQ9X0dBUElPbkxvYWQnXHJcbiAgICAgIGRvY3VtZW50LmhlYWQuYXBwZW5kQ2hpbGQgc2NyaXB0XHJcblxyXG4gIF9sb2FkZWRHQVBJOiAoY2FsbGJhY2spIC0+XHJcbiAgICBpZiB3aW5kb3cuX0xvYWRlZEdBUElDbGllbnRzXHJcbiAgICAgIGNhbGxiYWNrKClcclxuICAgIGVsc2VcclxuICAgICAgc2VsZiA9IEBcclxuICAgICAgY2hlY2sgPSAtPlxyXG4gICAgICAgIGlmIHdpbmRvdy5fTG9hZGVkR0FQSVxyXG4gICAgICAgICAgZ2FwaS5jbGllbnQubG9hZCAnZHJpdmUnLCAndjInLCAtPlxyXG4gICAgICAgICAgICBnYXBpLmNsaWVudC5sb2FkICdvYXV0aDInLCAndjInLCAtPlxyXG4gICAgICAgICAgICAgIHdpbmRvdy5fTG9hZGVkR0FQSUNsaWVudHMgPSB0cnVlXHJcbiAgICAgICAgICAgICAgY2FsbGJhY2suY2FsbCBzZWxmXHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgc2V0VGltZW91dCBjaGVjaywgMTBcclxuICAgICAgc2V0VGltZW91dCBjaGVjaywgMTBcclxuXHJcbiAgX2Rvd25sb2FkRnJvbVVybDogKHVybCwgdG9rZW4sIGNhbGxiYWNrKSAtPlxyXG4gICAgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KClcclxuICAgIHhoci5vcGVuICdHRVQnLCB1cmxcclxuICAgIGlmIHRva2VuXHJcbiAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyICdBdXRob3JpemF0aW9uJywgXCJCZWFyZXIgI3t0b2tlbi5hY2Nlc3NfdG9rZW59XCJcclxuICAgIHhoci5vbmxvYWQgPSAtPlxyXG4gICAgICBjYWxsYmFjayBudWxsLCB4aHIucmVzcG9uc2VUZXh0XHJcbiAgICB4aHIub25lcnJvciA9IC0+XHJcbiAgICAgIGNhbGxiYWNrIFwiVW5hYmxlIHRvIGRvd25sb2FkICN7dXJsfVwiXHJcbiAgICB4aHIuc2VuZCgpXHJcblxyXG4gIF9zZW5kRmlsZTogKGNvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIGJvdW5kYXJ5ID0gJy0tLS0tLS0zMTQxNTkyNjUzNTg5NzkzMjM4NDYnXHJcbiAgICBoZWFkZXIgPSBKU09OLnN0cmluZ2lmeVxyXG4gICAgICB0aXRsZTogbWV0YWRhdGEubmFtZVxyXG4gICAgICBtaW1lVHlwZTogQG1pbWVUeXBlXHJcblxyXG4gICAgW21ldGhvZCwgcGF0aF0gPSBpZiBtZXRhZGF0YS5wcm92aWRlckRhdGE/LmlkXHJcbiAgICAgIFsnUFVUJywgXCIvdXBsb2FkL2RyaXZlL3YyL2ZpbGVzLyN7bWV0YWRhdGEucHJvdmlkZXJEYXRhLmlkfVwiXVxyXG4gICAgZWxzZVxyXG4gICAgICBbJ1BPU1QnLCAnL3VwbG9hZC9kcml2ZS92Mi9maWxlcyddXHJcblxyXG4gICAgYm9keSA9IFtcclxuICAgICAgXCJcXHJcXG4tLSN7Ym91bmRhcnl9XFxyXFxuQ29udGVudC1UeXBlOiBhcHBsaWNhdGlvbi9qc29uXFxyXFxuXFxyXFxuI3toZWFkZXJ9XCIsXHJcbiAgICAgIFwiXFxyXFxuLS0je2JvdW5kYXJ5fVxcclxcbkNvbnRlbnQtVHlwZTogI3tAbWltZVR5cGV9XFxyXFxuXFxyXFxuI3tjb250ZW50fVwiLFxyXG4gICAgICBcIlxcclxcbi0tI3tib3VuZGFyeX0tLVwiXHJcbiAgICBdLmpvaW4gJydcclxuXHJcbiAgICByZXF1ZXN0ID0gZ2FwaS5jbGllbnQucmVxdWVzdFxyXG4gICAgICBwYXRoOiBwYXRoXHJcbiAgICAgIG1ldGhvZDogbWV0aG9kXHJcbiAgICAgIHBhcmFtczoge3VwbG9hZFR5cGU6ICdtdWx0aXBhcnQnfVxyXG4gICAgICBoZWFkZXJzOiB7J0NvbnRlbnQtVHlwZSc6ICdtdWx0aXBhcnQvcmVsYXRlZDsgYm91bmRhcnk9XCInICsgYm91bmRhcnkgKyAnXCInfVxyXG4gICAgICBib2R5OiBib2R5XHJcblxyXG4gICAgcmVxdWVzdC5leGVjdXRlIChmaWxlKSAtPlxyXG4gICAgICBpZiBjYWxsYmFja1xyXG4gICAgICAgIGlmIGZpbGU/LmVycm9yXHJcbiAgICAgICAgICBjYWxsYmFjayBcIlVuYWJsZWQgdG8gdXBsb2FkIGZpbGU6ICN7ZmlsZS5lcnJvci5tZXNzYWdlfVwiXHJcbiAgICAgICAgZWxzZSBpZiBmaWxlXHJcbiAgICAgICAgICBjYWxsYmFjayBudWxsLCBmaWxlXHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgY2FsbGJhY2sgJ1VuYWJsZWQgdG8gdXBsb2FkIGZpbGUnXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEdvb2dsZURyaXZlUHJvdmlkZXJcclxuIiwidHIgPSByZXF1aXJlICcuLi91dGlscy90cmFuc2xhdGUnXHJcblxyXG5Qcm92aWRlckludGVyZmFjZSA9IChyZXF1aXJlICcuL3Byb3ZpZGVyLWludGVyZmFjZScpLlByb3ZpZGVySW50ZXJmYWNlXHJcbkNsb3VkTWV0YWRhdGEgPSAocmVxdWlyZSAnLi9wcm92aWRlci1pbnRlcmZhY2UnKS5DbG91ZE1ldGFkYXRhXHJcblxyXG5jbGFzcyBMb2NhbFN0b3JhZ2VQcm92aWRlciBleHRlbmRzIFByb3ZpZGVySW50ZXJmYWNlXHJcblxyXG4gIGNvbnN0cnVjdG9yOiAoQG9wdGlvbnMgPSB7fSkgLT5cclxuICAgIHN1cGVyXHJcbiAgICAgIG5hbWU6IExvY2FsU3RvcmFnZVByb3ZpZGVyLk5hbWVcclxuICAgICAgZGlzcGxheU5hbWU6IEBvcHRpb25zLmRpc3BsYXlOYW1lIG9yICh0ciAnflBST1ZJREVSLkxPQ0FMX1NUT1JBR0UnKVxyXG4gICAgICBjYXBhYmlsaXRpZXM6XHJcbiAgICAgICAgc2F2ZTogdHJ1ZVxyXG4gICAgICAgIGxvYWQ6IHRydWVcclxuICAgICAgICBsaXN0OiB0cnVlXHJcbiAgICAgICAgcmVtb3ZlOiB0cnVlXHJcbiAgICAgICAgcmVuYW1lOiB0cnVlXHJcblxyXG4gIEBOYW1lOiAnbG9jYWxTdG9yYWdlJ1xyXG4gIEBBdmFpbGFibGU6IC0+XHJcbiAgICByZXN1bHQgPSB0cnlcclxuICAgICAgdGVzdCA9ICdMb2NhbFN0b3JhZ2VQcm92aWRlcjo6YXV0aCdcclxuICAgICAgd2luZG93LmxvY2FsU3RvcmFnZS5zZXRJdGVtKHRlc3QsIHRlc3QpXHJcbiAgICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSh0ZXN0KVxyXG4gICAgICB0cnVlXHJcbiAgICBjYXRjaFxyXG4gICAgICBmYWxzZVxyXG5cclxuICBzYXZlOiAoY29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgdHJ5XHJcbiAgICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2Uuc2V0SXRlbSBAX2dldEtleShtZXRhZGF0YS5uYW1lKSwgY29udGVudFxyXG4gICAgICBjYWxsYmFjaz8gbnVsbFxyXG4gICAgY2F0Y2hcclxuICAgICAgY2FsbGJhY2s/ICdVbmFibGUgdG8gc2F2ZSdcclxuXHJcbiAgbG9hZDogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIHRyeVxyXG4gICAgICBjb250ZW50ID0gd2luZG93LmxvY2FsU3RvcmFnZS5nZXRJdGVtIEBfZ2V0S2V5IG1ldGFkYXRhLm5hbWVcclxuICAgICAgY2FsbGJhY2sgbnVsbCwgY29udGVudFxyXG4gICAgY2F0Y2hcclxuICAgICAgY2FsbGJhY2sgJ1VuYWJsZSB0byBsb2FkJ1xyXG5cclxuICBsaXN0OiAobWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgbGlzdCA9IFtdXHJcbiAgICBwYXRoID0gbWV0YWRhdGE/LnBhdGggb3IgJydcclxuICAgIHByZWZpeCA9IEBfZ2V0S2V5IHBhdGhcclxuICAgIGZvciBvd24ga2V5IG9mIHdpbmRvdy5sb2NhbFN0b3JhZ2VcclxuICAgICAgaWYga2V5LnN1YnN0cigwLCBwcmVmaXgubGVuZ3RoKSBpcyBwcmVmaXhcclxuICAgICAgICBbbmFtZSwgcmVtYWluZGVyLi4uXSA9IGtleS5zdWJzdHIocHJlZml4Lmxlbmd0aCkuc3BsaXQoJy8nKVxyXG4gICAgICAgIGxpc3QucHVzaCBuZXcgQ2xvdWRNZXRhZGF0YVxyXG4gICAgICAgICAgbmFtZToga2V5LnN1YnN0cihwcmVmaXgubGVuZ3RoKVxyXG4gICAgICAgICAgcGF0aDogXCIje3BhdGh9LyN7bmFtZX1cIlxyXG4gICAgICAgICAgdHlwZTogaWYgcmVtYWluZGVyLmxlbmd0aCA+IDAgdGhlbiBDbG91ZE1ldGFkYXRhLkZvbGRlciBlbHNlIENsb3VkTWV0YWRhdGEuRmlsZVxyXG4gICAgICAgICAgcHJvdmlkZXI6IEBcclxuICAgIGNhbGxiYWNrIG51bGwsIGxpc3RcclxuXHJcbiAgcmVtb3ZlOiAobWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgdHJ5XHJcbiAgICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSBAX2dldEtleShtZXRhZGF0YS5uYW1lKVxyXG4gICAgICBjYWxsYmFjaz8gbnVsbFxyXG4gICAgY2F0Y2hcclxuICAgICAgY2FsbGJhY2s/ICdVbmFibGUgdG8gZGVsZXRlJ1xyXG5cclxuICByZW5hbWU6IChtZXRhZGF0YSwgbmV3TmFtZSwgY2FsbGJhY2spIC0+XHJcbiAgICB0cnlcclxuICAgICAgY29udGVudCA9IHdpbmRvdy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbSBAX2dldEtleSBtZXRhZGF0YS5uYW1lXHJcbiAgICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2Uuc2V0SXRlbSBAX2dldEtleShuZXdOYW1lKSwgY29udGVudFxyXG4gICAgICB3aW5kb3cubG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0gQF9nZXRLZXkobWV0YWRhdGEubmFtZSlcclxuICAgICAgbWV0YWRhdGEubmFtZSA9IG5ld05hbWVcclxuICAgICAgY2FsbGJhY2sgbnVsbCwgbWV0YWRhdGFcclxuICAgIGNhdGNoXHJcbiAgICAgIGNhbGxiYWNrPyAnVW5hYmxlIHRvIHJlbmFtZSdcclxuXHJcbiAgX2dldEtleTogKG5hbWUgPSAnJykgLT5cclxuICAgIFwiY2ZtOjoje25hbWV9XCJcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gTG9jYWxTdG9yYWdlUHJvdmlkZXJcclxuIiwie2Rpdn0gPSBSZWFjdC5ET01cclxuXHJcbmNsYXNzIENsb3VkRmlsZVxyXG4gIGNvbnRydWN0b3I6IChvcHRpb25zKSAtPlxyXG4gICAge0Bjb250ZW50LCBAbWV0YWRhdGF9ID0gb3B0aW9uc1xyXG5cclxuY2xhc3MgQ2xvdWRNZXRhZGF0YVxyXG4gIGNvbnN0cnVjdG9yOiAob3B0aW9ucykgLT5cclxuICAgIHtAbmFtZSwgQHBhdGgsIEB0eXBlLCBAcHJvdmlkZXIsIEBwcm92aWRlckRhdGE9e30sIEBvdmVyd3JpdGFibGV9ID0gb3B0aW9uc1xyXG4gIEBGb2xkZXI6ICdmb2xkZXInXHJcbiAgQEZpbGU6ICdmaWxlJ1xyXG5cclxuQXV0aG9yaXphdGlvbk5vdEltcGxlbWVudGVkRGlhbG9nID0gUmVhY3QuY3JlYXRlRmFjdG9yeSBSZWFjdC5jcmVhdGVDbGFzc1xyXG4gIGRpc3BsYXlOYW1lOiAnQXV0aG9yaXphdGlvbk5vdEltcGxlbWVudGVkRGlhbG9nJ1xyXG4gIHJlbmRlcjogLT5cclxuICAgIChkaXYge30sIFwiQXV0aG9yaXphdGlvbiBkaWFsb2cgbm90IHlldCBpbXBsZW1lbnRlZCBmb3IgI3tAcHJvcHMucHJvdmlkZXIuZGlzcGxheU5hbWV9XCIpXHJcblxyXG5jbGFzcyBQcm92aWRlckludGVyZmFjZVxyXG5cclxuICBjb25zdHJ1Y3RvcjogKG9wdGlvbnMpIC0+XHJcbiAgICB7QG5hbWUsIEBkaXNwbGF5TmFtZSwgQGNhcGFiaWxpdGllc30gPSBvcHRpb25zXHJcblxyXG4gIEBBdmFpbGFibGU6IC0+IHRydWVcclxuXHJcbiAgY2FuOiAoY2FwYWJpbGl0eSkgLT5cclxuICAgIEBjYXBhYmlsaXRpZXNbY2FwYWJpbGl0eV1cclxuXHJcbiAgYXV0aG9yaXplZDogKGNhbGxiYWNrKSAtPlxyXG4gICAgaWYgY2FsbGJhY2tcclxuICAgICAgY2FsbGJhY2sgdHJ1ZVxyXG4gICAgZWxzZVxyXG4gICAgICB0cnVlXHJcblxyXG4gIHJlbmRlckF1dGhvcml6YXRpb25EaWFsb2c6IC0+XHJcbiAgICAoQXV0aG9yaXphdGlvbk5vdEltcGxlbWVudGVkRGlhbG9nIHtwcm92aWRlcjogQH0pXHJcblxyXG4gIHJlbmRlclVzZXI6IC0+XHJcbiAgICBudWxsXHJcblxyXG4gIGRpYWxvZzogKGNhbGxiYWNrKSAtPlxyXG4gICAgQF9ub3RJbXBsZW1lbnRlZCAnZGlhbG9nJ1xyXG5cclxuICBzYXZlOiAoY29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgQF9ub3RJbXBsZW1lbnRlZCAnc2F2ZSdcclxuXHJcbiAgbG9hZDogKGNhbGxiYWNrKSAtPlxyXG4gICAgQF9ub3RJbXBsZW1lbnRlZCAnbG9hZCdcclxuXHJcbiAgbGlzdDogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIEBfbm90SW1wbGVtZW50ZWQgJ2xpc3QnXHJcblxyXG4gIHJlbW92ZTogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIEBfbm90SW1wbGVtZW50ZWQgJ3JlbW92ZSdcclxuXHJcbiAgcmVuYW1lOiAobWV0YWRhdGEsIG5ld05hbWUsIGNhbGxiYWNrKSAtPlxyXG4gICAgQF9ub3RJbXBsZW1lbnRlZCAncmVuYW1lJ1xyXG5cclxuICBwYXRjaDogKG1ldGFkYXRhLCBuZXdOYW1lLCBjYWxsYmFjaykgLT5cclxuICAgIEBfbm90SW1wbGVtZW50ZWQgJ3BhdGNoJ1xyXG5cclxuICBfbm90SW1wbGVtZW50ZWQ6IChtZXRob2ROYW1lKSAtPlxyXG4gICAgYWxlcnQgXCIje21ldGhvZE5hbWV9IG5vdCBpbXBsZW1lbnRlZCBmb3IgI3tAbmFtZX0gcHJvdmlkZXJcIlxyXG5cclxubW9kdWxlLmV4cG9ydHMgPVxyXG4gIENsb3VkRmlsZTogQ2xvdWRGaWxlXHJcbiAgQ2xvdWRNZXRhZGF0YTogQ2xvdWRNZXRhZGF0YVxyXG4gIFByb3ZpZGVySW50ZXJmYWNlOiBQcm92aWRlckludGVyZmFjZVxyXG4iLCJ0ciA9IHJlcXVpcmUgJy4uL3V0aWxzL3RyYW5zbGF0ZSdcclxuaXNTdHJpbmcgPSByZXF1aXJlICcuLi91dGlscy9pcy1zdHJpbmcnXHJcblxyXG5Qcm92aWRlckludGVyZmFjZSA9IChyZXF1aXJlICcuL3Byb3ZpZGVyLWludGVyZmFjZScpLlByb3ZpZGVySW50ZXJmYWNlXHJcbkNsb3VkTWV0YWRhdGEgPSAocmVxdWlyZSAnLi9wcm92aWRlci1pbnRlcmZhY2UnKS5DbG91ZE1ldGFkYXRhXHJcblxyXG5jbGFzcyBSZWFkT25seVByb3ZpZGVyIGV4dGVuZHMgUHJvdmlkZXJJbnRlcmZhY2VcclxuXHJcbiAgY29uc3RydWN0b3I6IChAb3B0aW9ucyA9IHt9KSAtPlxyXG4gICAgc3VwZXJcclxuICAgICAgbmFtZTogUmVhZE9ubHlQcm92aWRlci5OYW1lXHJcbiAgICAgIGRpc3BsYXlOYW1lOiBAb3B0aW9ucy5kaXNwbGF5TmFtZSBvciAodHIgJ35QUk9WSURFUi5SRUFEX09OTFknKVxyXG4gICAgICBjYXBhYmlsaXRpZXM6XHJcbiAgICAgICAgc2F2ZTogZmFsc2VcclxuICAgICAgICBsb2FkOiB0cnVlXHJcbiAgICAgICAgbGlzdDogdHJ1ZVxyXG4gICAgICAgIHJlbW92ZTogZmFsc2VcclxuICAgICAgICByZW5hbWU6IGZhbHNlXHJcbiAgICBAdHJlZSA9IG51bGxcclxuXHJcbiAgQE5hbWU6ICdyZWFkT25seSdcclxuXHJcbiAgbG9hZDogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cclxuICAgIEBfbG9hZFRyZWUgKGVyciwgdHJlZSkgPT5cclxuICAgICAgcmV0dXJuIGNhbGxiYWNrIGVyciBpZiBlcnJcclxuICAgICAgcGFyZW50ID0gQF9maW5kUGFyZW50IG1ldGFkYXRhXHJcbiAgICAgIGlmIHBhcmVudFxyXG4gICAgICAgIGlmIHBhcmVudFttZXRhZGF0YS5uYW1lXVxyXG4gICAgICAgICAgaWYgcGFyZW50W21ldGFkYXRhLm5hbWVdLm1ldGFkYXRhLnR5cGUgaXMgQ2xvdWRNZXRhZGF0YS5GaWxlXHJcbiAgICAgICAgICAgIGNhbGxiYWNrIG51bGwsIHBhcmVudFttZXRhZGF0YS5uYW1lXS5jb250ZW50XHJcbiAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgIGNhbGxiYWNrIFwiI3ttZXRhZGF0YS5uYW1lfSBpcyBhIGZvbGRlclwiXHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgY2FsbGJhY2sgXCIje21ldGFkYXRhLm5hbWV9IG5vdCBmb3VuZCBpbiBmb2xkZXJcIlxyXG4gICAgICBlbHNlXHJcbiAgICAgICAgY2FsbGJhY2sgXCIje21ldGFkYXRhLm5hbWV9IGZvbGRlciBub3QgZm91bmRcIlxyXG5cclxuICBsaXN0OiAobWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxyXG4gICAgQF9sb2FkVHJlZSAoZXJyLCB0cmVlKSA9PlxyXG4gICAgICByZXR1cm4gY2FsbGJhY2sgZXJyIGlmIGVyclxyXG4gICAgICBwYXJlbnQgPSBAX2ZpbmRQYXJlbnQgbWV0YWRhdGFcclxuICAgICAgaWYgcGFyZW50XHJcbiAgICAgICAgbGlzdCA9IFtdXHJcbiAgICAgICAgbGlzdC5wdXNoIGZpbGUubWV0YWRhdGEgZm9yIG93biBmaWxlbmFtZSwgZmlsZSBvZiBwYXJlbnRcclxuICAgICAgICBjYWxsYmFjayBudWxsLCBsaXN0XHJcbiAgICAgIGVsc2UgaWYgbWV0YWRhdGFcclxuICAgICAgICBjYWxsYmFjayBcIiN7bWV0YWRhdGEubmFtZX0gZm9sZGVyIG5vdCBmb3VuZFwiXHJcblxyXG4gIF9sb2FkVHJlZTogKGNhbGxiYWNrKSAtPlxyXG4gICAgaWYgQHRyZWUgaXNudCBudWxsXHJcbiAgICAgIGNhbGxiYWNrIG51bGwsIEB0cmVlXHJcbiAgICBlbHNlIGlmIEBvcHRpb25zLmpzb25cclxuICAgICAgQHRyZWUgPSBAX2NvbnZlcnRKU09OVG9NZXRhZGF0YVRyZWUgQG9wdGlvbnMuanNvblxyXG4gICAgICBjYWxsYmFjayBudWxsLCBAdHJlZVxyXG4gICAgZWxzZSBpZiBAb3B0aW9ucy5qc29uQ2FsbGJhY2tcclxuICAgICAgQG9wdGlvbnMuanNvbkNhbGxiYWNrIChlcnIsIGpzb24pID0+XHJcbiAgICAgICAgaWYgZXJyXHJcbiAgICAgICAgICBjYWxsYmFjayBlcnJcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICBAdHJlZSA9IEBfY29udmVydEpTT05Ub01ldGFkYXRhVHJlZSBAb3B0aW9ucy5qc29uXHJcbiAgICAgICAgICBjYWxsYmFjayBudWxsLCBAdHJlZVxyXG4gICAgZWxzZSBpZiBAb3B0aW9ucy5zcmNcclxuICAgICAgJC5hamF4XHJcbiAgICAgICAgZGF0YVR5cGU6ICdqc29uJ1xyXG4gICAgICAgIHVybDogQG9wdGlvbnMuc3JjXHJcbiAgICAgICAgc3VjY2VzczogKGRhdGEpID0+XHJcbiAgICAgICAgICBAdHJlZSA9IEBfY29udmVydEpTT05Ub01ldGFkYXRhVHJlZSBkYXRhXHJcbiAgICAgICAgICBjYWxsYmFjayBudWxsLCBAdHJlZVxyXG4gICAgICAgIGVycm9yOiAtPiBjYWxsYmFjayBcIlVuYWJsZSB0byBsb2FkIGpzb24gZm9yICN7QGRpc3BsYXlOYW1lfSBwcm92aWRlclwiXHJcbiAgICBlbHNlXHJcbiAgICAgIGNvbnNvbGUuZXJyb3I/IFwiTm8ganNvbiBvciBzcmMgb3B0aW9uIGZvdW5kIGZvciAje0BkaXNwbGF5TmFtZX0gcHJvdmlkZXJcIlxyXG4gICAgICBjYWxsYmFjayBudWxsLCB7fVxyXG5cclxuICBfY29udmVydEpTT05Ub01ldGFkYXRhVHJlZTogKGpzb24sIHBhdGhQcmVmaXggPSAnLycpIC0+XHJcbiAgICB0cmVlID0ge31cclxuICAgIGZvciBvd24gZmlsZW5hbWUgb2YganNvblxyXG4gICAgICB0eXBlID0gaWYgaXNTdHJpbmcganNvbltmaWxlbmFtZV0gdGhlbiBDbG91ZE1ldGFkYXRhLkZpbGUgZWxzZSBDbG91ZE1ldGFkYXRhLkZvbGRlclxyXG4gICAgICBtZXRhZGF0YSA9IG5ldyBDbG91ZE1ldGFkYXRhXHJcbiAgICAgICAgbmFtZTogZmlsZW5hbWVcclxuICAgICAgICBwYXRoOiBwYXRoUHJlZml4ICsgZmlsZW5hbWVcclxuICAgICAgICB0eXBlOiB0eXBlXHJcbiAgICAgICAgcHJvdmlkZXI6IEBcclxuICAgICAgICBjaGlsZHJlbjogbnVsbFxyXG4gICAgICBpZiB0eXBlIGlzIENsb3VkTWV0YWRhdGEuRm9sZGVyXHJcbiAgICAgICAgbWV0YWRhdGEuY2hpbGRyZW4gPSBfY29udmVydEpTT05Ub01ldGFkYXRhVHJlZSBqc29uW2ZpbGVuYW1lXSwgcGF0aFByZWZpeCArIGZpbGVuYW1lICsgJy8nXHJcbiAgICAgIHRyZWVbZmlsZW5hbWVdID1cclxuICAgICAgICBjb250ZW50OiBqc29uW2ZpbGVuYW1lXVxyXG4gICAgICAgIG1ldGFkYXRhOiBtZXRhZGF0YVxyXG4gICAgdHJlZVxyXG5cclxuICBfZmluZFBhcmVudDogKG1ldGFkYXRhKSAtPlxyXG4gICAgaWYgbm90IG1ldGFkYXRhXHJcbiAgICAgIEB0cmVlXHJcbiAgICBlbHNlXHJcbiAgICAgIEB0cmVlXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWRPbmx5UHJvdmlkZXJcclxuIiwidHIgPSByZXF1aXJlICcuL3V0aWxzL3RyYW5zbGF0ZSdcclxuaXNTdHJpbmcgPSByZXF1aXJlICcuL3V0aWxzL2lzLXN0cmluZydcclxuXHJcbmNsYXNzIENsb3VkRmlsZU1hbmFnZXJVSUV2ZW50XHJcblxyXG4gIGNvbnN0cnVjdG9yOiAoQHR5cGUsIEBkYXRhID0ge30pIC0+XHJcblxyXG5jbGFzcyBDbG91ZEZpbGVNYW5hZ2VyVUlNZW51XHJcblxyXG4gIEBEZWZhdWx0TWVudTogWyduZXdGaWxlRGlhbG9nJywgJ29wZW5GaWxlRGlhbG9nJywgJ3Jlb3BlbkRpYWxvZycsICdzZXBhcmF0b3InLCAnc2F2ZScsICdzYXZlRmlsZUFzRGlhbG9nJywgJ2Rvd25sb2FkRGlhbG9nJywgJ3JlbmFtZURpYWxvZyddXHJcbiAgQEF1dG9TYXZlTWVudTogWyduZXdGaWxlRGlhbG9nJywgJ29wZW5GaWxlRGlhbG9nJywgJ3Jlb3BlbkRpYWxvZycsICdzZXBhcmF0b3InLCAnc2F2ZUNvcHlEaWFsb2cnLCAnZG93bmxvYWREaWFsb2cnLCAncmVuYW1lRGlhbG9nJ11cclxuXHJcbiAgY29uc3RydWN0b3I6IChvcHRpb25zLCBjbGllbnQpIC0+XHJcbiAgICBzZXRBY3Rpb24gPSAoYWN0aW9uKSAtPlxyXG4gICAgICBjbGllbnRbYWN0aW9uXT8uYmluZChjbGllbnQpIG9yICgtPiBhbGVydCBcIk5vICN7YWN0aW9ufSBhY3Rpb24gaXMgYXZhaWxhYmxlIGluIHRoZSBjbGllbnRcIilcclxuXHJcbiAgICBzZXRFbmFibGVkID0gKGFjdGlvbikgLT5cclxuICAgICAgc3dpdGNoIGFjdGlvblxyXG4gICAgICAgIHdoZW4gJ3Jlb3BlbkRpYWxvZydcclxuICAgICAgICAgIC0+IGNsaWVudC5zdGF0ZS5tZXRhZGF0YT8ucHJvdmlkZXIuY2FuICdsb2FkJ1xyXG4gICAgICAgIHdoZW4gJ3JlbmFtZURpYWxvZydcclxuICAgICAgICAgIC0+IGNsaWVudC5zdGF0ZS5tZXRhZGF0YT8ucHJvdmlkZXIuY2FuICdyZW5hbWUnXHJcbiAgICAgICAgd2hlbiAnc2F2ZUNvcHlEaWFsb2cnXHJcbiAgICAgICAgICAtPiBjbGllbnQuc3RhdGUubWV0YWRhdGE/XHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgdHJ1ZVxyXG5cclxuICAgIG5hbWVzID1cclxuICAgICAgbmV3RmlsZURpYWxvZzogdHIgXCJ+TUVOVS5ORVdcIlxyXG4gICAgICBvcGVuRmlsZURpYWxvZzogdHIgXCJ+TUVOVS5PUEVOXCJcclxuICAgICAgcmVvcGVuRGlhbG9nOiB0ciBcIn5NRU5VLlJFT1BFTlwiXHJcbiAgICAgIHNhdmU6IHRyIFwifk1FTlUuU0FWRVwiXHJcbiAgICAgIHNhdmVGaWxlQXNEaWFsb2c6IHRyIFwifk1FTlUuU0FWRV9BU1wiXHJcbiAgICAgIHNhdmVDb3B5RGlhbG9nOiB0ciBcIn5NRU5VLlNBVkVfQ09QWVwiXHJcbiAgICAgIGRvd25sb2FkRGlhbG9nOiB0ciBcIn5NRU5VLkRPV05MT0FEXCJcclxuICAgICAgcmVuYW1lRGlhbG9nOiB0ciBcIn5NRU5VLlJFTkFNRVwiXHJcblxyXG4gICAgQGl0ZW1zID0gW11cclxuICAgIGZvciBpdGVtIGluIG9wdGlvbnMubWVudVxyXG4gICAgICBtZW51SXRlbSA9IGlmIGl0ZW0gaXMgJ3NlcGFyYXRvcidcclxuICAgICAgICBzZXBhcmF0b3I6IHRydWVcclxuICAgICAgZWxzZSBpZiBpc1N0cmluZyBpdGVtXHJcbiAgICAgICAgbmFtZTogb3B0aW9ucy5tZW51TmFtZXM/W2l0ZW1dIG9yIG5hbWVzW2l0ZW1dIG9yIFwiVW5rbm93biBpdGVtOiAje2l0ZW19XCJcclxuICAgICAgICBlbmFibGVkOiBzZXRFbmFibGVkIGl0ZW1cclxuICAgICAgICBhY3Rpb246IHNldEFjdGlvbiBpdGVtXHJcbiAgICAgIGVsc2VcclxuICAgICAgICAjIGNsaWVudHMgY2FuIHBhc3MgaW4gY3VzdG9tIHtuYW1lOi4uLiwgYWN0aW9uOi4uLn0gbWVudSBpdGVtcyB3aGVyZSB0aGUgYWN0aW9uIGNhbiBiZSBhIGNsaWVudCBmdW5jdGlvbiBuYW1lIG9yIG90aGVyd2lzZSBpdCBpcyBhc3N1bWVkIGFjdGlvbiBpcyBhIGZ1bmN0aW9uXHJcbiAgICAgICAgaWYgaXNTdHJpbmcgaXRlbS5hY3Rpb25cclxuICAgICAgICAgIGl0ZW0uZW5hYmxlZCA9IHNldEVuYWJsZWQgaXRlbS5hY3Rpb25cclxuICAgICAgICAgIGl0ZW0uYWN0aW9uID0gc2V0QWN0aW9uIGl0ZW0uYWN0aW9uXHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgaXRlbS5lbmFibGVkIG9yPSB0cnVlXHJcbiAgICAgICAgaXRlbVxyXG4gICAgICBpZiBtZW51SXRlbVxyXG4gICAgICAgIEBpdGVtcy5wdXNoIG1lbnVJdGVtXHJcblxyXG5jbGFzcyBDbG91ZEZpbGVNYW5hZ2VyVUlcclxuXHJcbiAgY29uc3RydWN0b3I6IChAY2xpZW50KS0+XHJcbiAgICBAbWVudSA9IG51bGxcclxuXHJcbiAgaW5pdDogKG9wdGlvbnMpIC0+XHJcbiAgICBvcHRpb25zID0gb3B0aW9ucyBvciB7fVxyXG4gICAgIyBza2lwIHRoZSBtZW51IGlmIGV4cGxpY2l0eSBzZXQgdG8gbnVsbCAobWVhbmluZyBubyBtZW51KVxyXG4gICAgaWYgb3B0aW9ucy5tZW51IGlzbnQgbnVsbFxyXG4gICAgICBpZiB0eXBlb2Ygb3B0aW9ucy5tZW51IGlzICd1bmRlZmluZWQnXHJcbiAgICAgICAgb3B0aW9ucy5tZW51ID0gQ2xvdWRGaWxlTWFuYWdlclVJTWVudS5EZWZhdWx0TWVudVxyXG4gICAgICBAbWVudSA9IG5ldyBDbG91ZEZpbGVNYW5hZ2VyVUlNZW51IG9wdGlvbnMsIEBjbGllbnRcclxuXHJcbiAgIyBmb3IgUmVhY3QgdG8gbGlzdGVuIGZvciBkaWFsb2cgY2hhbmdlc1xyXG4gIGxpc3RlbjogKEBsaXN0ZW5lckNhbGxiYWNrKSAtPlxyXG5cclxuICBhcHBlbmRNZW51SXRlbTogKGl0ZW0pIC0+XHJcbiAgICBAbGlzdGVuZXJDYWxsYmFjayBuZXcgQ2xvdWRGaWxlTWFuYWdlclVJRXZlbnQgJ2FwcGVuZE1lbnVJdGVtJywgaXRlbVxyXG5cclxuICBzZXRNZW51QmFySW5mbzogKGluZm8pIC0+XHJcbiAgICBAbGlzdGVuZXJDYWxsYmFjayBuZXcgQ2xvdWRGaWxlTWFuYWdlclVJRXZlbnQgJ3NldE1lbnVCYXJJbmZvJywgaW5mb1xyXG5cclxuICBzYXZlRmlsZURpYWxvZzogKGNhbGxiYWNrKSAtPlxyXG4gICAgQF9zaG93UHJvdmlkZXJEaWFsb2cgJ3NhdmVGaWxlJywgKHRyICd+RElBTE9HLlNBVkUnKSwgY2FsbGJhY2tcclxuXHJcbiAgc2F2ZUZpbGVBc0RpYWxvZzogKGNhbGxiYWNrKSAtPlxyXG4gICAgQF9zaG93UHJvdmlkZXJEaWFsb2cgJ3NhdmVGaWxlQXMnLCAodHIgJ35ESUFMT0cuU0FWRV9BUycpLCBjYWxsYmFja1xyXG5cclxuICBzYXZlQ29weURpYWxvZzogKGNhbGxiYWNrKSAtPlxyXG4gICAgQF9zaG93UHJvdmlkZXJEaWFsb2cgJ3NhdmVGaWxlQ29weScsICh0ciAnfkRJQUxPRy5TQVZFX0NPUFknKSwgY2FsbGJhY2tcclxuXHJcbiAgb3BlbkZpbGVEaWFsb2c6IChjYWxsYmFjaykgLT5cclxuICAgIEBfc2hvd1Byb3ZpZGVyRGlhbG9nICdvcGVuRmlsZScsICh0ciAnfkRJQUxPRy5PUEVOJyksIGNhbGxiYWNrXHJcblxyXG4gIGRvd25sb2FkRGlhbG9nOiAoZmlsZW5hbWUsIGNvbnRlbnQsIGNhbGxiYWNrKSAtPlxyXG4gICAgQGxpc3RlbmVyQ2FsbGJhY2sgbmV3IENsb3VkRmlsZU1hbmFnZXJVSUV2ZW50ICdzaG93RG93bmxvYWREaWFsb2cnLFxyXG4gICAgICBmaWxlbmFtZTogZmlsZW5hbWVcclxuICAgICAgY29udGVudDogY29udGVudFxyXG4gICAgICBjYWxsYmFjazogY2FsbGJhY2tcclxuXHJcbiAgcmVuYW1lRGlhbG9nOiAoZmlsZW5hbWUsIGNhbGxiYWNrKSAtPlxyXG4gICAgQGxpc3RlbmVyQ2FsbGJhY2sgbmV3IENsb3VkRmlsZU1hbmFnZXJVSUV2ZW50ICdzaG93UmVuYW1lRGlhbG9nJyxcclxuICAgICAgZmlsZW5hbWU6IGZpbGVuYW1lXHJcbiAgICAgIGNhbGxiYWNrOiBjYWxsYmFja1xyXG5cclxuICBfc2hvd1Byb3ZpZGVyRGlhbG9nOiAoYWN0aW9uLCB0aXRsZSwgY2FsbGJhY2spIC0+XHJcbiAgICBAbGlzdGVuZXJDYWxsYmFjayBuZXcgQ2xvdWRGaWxlTWFuYWdlclVJRXZlbnQgJ3Nob3dQcm92aWRlckRpYWxvZycsXHJcbiAgICAgIGFjdGlvbjogYWN0aW9uXHJcbiAgICAgIHRpdGxlOiB0aXRsZVxyXG4gICAgICBjYWxsYmFjazogY2FsbGJhY2tcclxuXHJcbm1vZHVsZS5leHBvcnRzID1cclxuICBDbG91ZEZpbGVNYW5hZ2VyVUlFdmVudDogQ2xvdWRGaWxlTWFuYWdlclVJRXZlbnRcclxuICBDbG91ZEZpbGVNYW5hZ2VyVUk6IENsb3VkRmlsZU1hbmFnZXJVSVxyXG4gIENsb3VkRmlsZU1hbmFnZXJVSU1lbnU6IENsb3VkRmlsZU1hbmFnZXJVSU1lbnVcclxuIiwibW9kdWxlLmV4cG9ydHMgPSAocGFyYW0pIC0+IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChwYXJhbSkgaXMgJ1tvYmplY3QgU3RyaW5nXSdcclxuIiwibW9kdWxlLmV4cG9ydHMgPVxyXG4gIFwifk1FTlVCQVIuVU5USVRMRV9ET0NVTUVOVFwiOiBcIlVudGl0bGVkIERvY3VtZW50XCJcclxuXHJcbiAgXCJ+TUVOVS5ORVdcIjogXCJOZXdcIlxyXG4gIFwifk1FTlUuT1BFTlwiOiBcIk9wZW4gLi4uXCJcclxuICBcIn5NRU5VLlJFT1BFTlwiOiBcIlJlb3BlblwiXHJcbiAgXCJ+TUVOVS5TQVZFXCI6IFwiU2F2ZVwiXHJcbiAgXCJ+TUVOVS5TQVZFX0FTXCI6IFwiU2F2ZSBBcyAuLi5cIlxyXG4gIFwifk1FTlUuU0FWRV9DT1BZXCI6IFwiU2F2ZSBBIENvcHkgLi4uXCJcclxuICBcIn5NRU5VLkRPV05MT0FEXCI6IFwiRG93bmxvYWRcIlxyXG4gIFwifk1FTlUuUkVOQU1FXCI6IFwiUmVuYW1lXCJcclxuXHJcbiAgXCJ+RElBTE9HLlNBVkVcIjogXCJTYXZlXCJcclxuICBcIn5ESUFMT0cuU0FWRV9BU1wiOiBcIlNhdmUgQXMgLi4uXCJcclxuICBcIn5ESUFMT0cuU0FWRV9DT1BZXCI6IFwiU2F2ZSBBIENvcHkgLi4uXCJcclxuICBcIn5ESUFMT0cuT1BFTlwiOiBcIk9wZW5cIlxyXG4gIFwifkRJQUxPRy5ET1dOTE9BRFwiOiBcIkRvd25sb2FkXCJcclxuICBcIn5ESUFMT0cuUkVOQU1FXCI6IFwiUmVuYW1lXCJcclxuXHJcbiAgXCJ+UFJPVklERVIuTE9DQUxfU1RPUkFHRVwiOiBcIkxvY2FsIFN0b3JhZ2VcIlxyXG4gIFwiflBST1ZJREVSLlJFQURfT05MWVwiOiBcIlJlYWQgT25seVwiXHJcbiAgXCJ+UFJPVklERVIuR09PR0xFX0RSSVZFXCI6IFwiR29vZ2xlIERyaXZlXCJcclxuICBcIn5QUk9WSURFUi5ET0NVTUVOVF9TVE9SRVwiOiBcIkRvY3VtZW50IFN0b3JlXCJcclxuXHJcbiAgXCJ+RklMRV9ESUFMT0cuRklMRU5BTUVcIjogXCJGaWxlbmFtZVwiXHJcbiAgXCJ+RklMRV9ESUFMT0cuT1BFTlwiOiBcIk9wZW5cIlxyXG4gIFwifkZJTEVfRElBTE9HLlNBVkVcIjogXCJTYXZlXCJcclxuICBcIn5GSUxFX0RJQUxPRy5DQU5DRUxcIjogXCJDYW5jZWxcIlxyXG4gIFwifkZJTEVfRElBTE9HLlJFTU9WRVwiOiBcIkRlbGV0ZVwiXHJcbiAgXCJ+RklMRV9ESUFMT0cuUkVNT1ZFX0NPTkZJUk1cIjogXCJBcmUgeW91IHN1cmUgeW91IHdhbnQgdG8gZGVsZXRlICV7ZmlsZW5hbWV9P1wiXHJcbiAgXCJ+RklMRV9ESUFMT0cuTE9BRElOR1wiOiBcIkxvYWRpbmcuLi5cIlxyXG5cclxuICBcIn5ET1dOTE9BRF9ESUFMT0cuRE9XTkxPQURcIjogXCJEb3dubG9hZFwiXHJcbiAgXCJ+RE9XTkxPQURfRElBTE9HLkNBTkNFTFwiOiBcIkNhbmNlbFwiXHJcblxyXG4gIFwiflJFTkFNRV9ESUFMT0cuUkVOQU1FXCI6IFwiUmVuYW1lXCJcclxuICBcIn5SRU5BTUVfRElBTE9HLkNBTkNFTFwiOiBcIkNhbmNlbFwiXHJcblxyXG4gIFwifkNPTkZJUk0uT1BFTl9GSUxFXCI6IFwiWW91IGhhdmUgdW5zYXZlZCBjaGFuZ2VzLiAgQXJlIHlvdSBzdXJlIHlvdSB3YW50IG9wZW4gYSBuZXcgZmlsZT9cIlxyXG4gIFwifkNPTkZJUk0uTkVXX0ZJTEVcIjogXCJZb3UgaGF2ZSB1bnNhdmVkIGNoYW5nZXMuICBBcmUgeW91IHN1cmUgeW91IHdhbnQgYSBuZXcgZmlsZT9cIlxyXG4gIFwifkNPTkZJUk0uUkVPUEVOX0ZJTEVcIjogXCJZb3UgaGF2ZSB1bnNhdmVkIGNoYW5nZXMuICBBcmUgeW91IHN1cmUgeW91IHdhbnQgcmVvcGVuIHRoZSBmaWxlIGFuZCByZXR1cm4gdG8gaXRzIGxhc3Qgc2F2ZWQgc3RhdGU/XCJcclxuIiwidHJhbnNsYXRpb25zID0gIHt9XHJcbnRyYW5zbGF0aW9uc1snZW4nXSA9IHJlcXVpcmUgJy4vbGFuZy9lbi11cydcclxuZGVmYXVsdExhbmcgPSAnZW4nXHJcbnZhclJlZ0V4cCA9IC8lXFx7XFxzKihbXn1cXHNdKilcXHMqXFx9L2dcclxuXHJcbnRyYW5zbGF0ZSA9IChrZXksIHZhcnM9e30sIGxhbmc9ZGVmYXVsdExhbmcpIC0+XHJcbiAgdHJhbnNsYXRpb24gPSB0cmFuc2xhdGlvbnNbbGFuZ10/W2tleV0gb3Iga2V5XHJcbiAgdHJhbnNsYXRpb24ucmVwbGFjZSB2YXJSZWdFeHAsIChtYXRjaCwga2V5KSAtPlxyXG4gICAgaWYgdmFycy5oYXNPd25Qcm9wZXJ0eSBrZXkgdGhlbiB2YXJzW2tleV0gZWxzZSBcIicqKiBVS05PV04gS0VZOiAje2tleX0gKipcIlxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSB0cmFuc2xhdGVcclxuIiwiTWVudUJhciA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9tZW51LWJhci12aWV3J1xyXG5Qcm92aWRlclRhYmJlZERpYWxvZyA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9wcm92aWRlci10YWJiZWQtZGlhbG9nLXZpZXcnXHJcbkRvd25sb2FkRGlhbG9nID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL2Rvd25sb2FkLWRpYWxvZy12aWV3J1xyXG5SZW5hbWVEaWFsb2cgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vcmVuYW1lLWRpYWxvZy12aWV3J1xyXG5cclxudHIgPSByZXF1aXJlICcuLi91dGlscy90cmFuc2xhdGUnXHJcblxyXG57ZGl2LCBpZnJhbWV9ID0gUmVhY3QuRE9NXHJcblxyXG5Jbm5lckFwcCA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgUmVhY3QuY3JlYXRlQ2xhc3NcclxuXHJcbiAgZGlzcGxheU5hbWU6ICdDbG91ZEZpbGVNYW5hZ2VySW5uZXJBcHAnXHJcblxyXG4gIHNob3VsZENvbXBvbmVudFVwZGF0ZTogKG5leHRQcm9wcykgLT5cclxuICAgIG5leHRQcm9wcy5hcHAgaXNudCBAcHJvcHMuYXBwXHJcblxyXG4gIHJlbmRlcjogLT5cclxuICAgIChkaXYge2NsYXNzTmFtZTogJ2lubmVyQXBwJ30sXHJcbiAgICAgIChpZnJhbWUge3NyYzogQHByb3BzLmFwcH0pXHJcbiAgICApXHJcblxyXG5BcHAgPSBSZWFjdC5jcmVhdGVDbGFzc1xyXG5cclxuICBkaXNwbGF5TmFtZTogJ0Nsb3VkRmlsZU1hbmFnZXInXHJcblxyXG4gIGdldEZpbGVuYW1lOiAtPlxyXG4gICAgaWYgQHByb3BzLmNsaWVudC5zdGF0ZS5tZXRhZGF0YT8uaGFzT3duUHJvcGVydHkoJ25hbWUnKSB0aGVuIEBwcm9wcy5jbGllbnQuc3RhdGUubWV0YWRhdGEubmFtZSBlbHNlICh0ciBcIn5NRU5VQkFSLlVOVElUTEVfRE9DVU1FTlRcIilcclxuXHJcbiAgZ2V0UHJvdmlkZXI6IC0+XHJcbiAgICBAcHJvcHMuY2xpZW50LnN0YXRlLm1ldGFkYXRhPy5wcm92aWRlclxyXG5cclxuICBnZXRJbml0aWFsU3RhdGU6IC0+XHJcbiAgICBmaWxlbmFtZTogQGdldEZpbGVuYW1lKClcclxuICAgIHByb3ZpZGVyOiBAZ2V0UHJvdmlkZXIoKVxyXG4gICAgbWVudUl0ZW1zOiBAcHJvcHMuY2xpZW50Ll91aS5tZW51Py5pdGVtcyBvciBbXVxyXG4gICAgbWVudU9wdGlvbnM6IEBwcm9wcy51aT8ubWVudUJhciBvciB7fVxyXG4gICAgcHJvdmlkZXJEaWFsb2c6IG51bGxcclxuICAgIGRvd25sb2FkRGlhbG9nOiBudWxsXHJcbiAgICByZW5hbWVEaWFsb2c6IG51bGxcclxuICAgIGRpcnR5OiBmYWxzZVxyXG5cclxuICBjb21wb25lbnRXaWxsTW91bnQ6IC0+XHJcbiAgICBAcHJvcHMuY2xpZW50Lmxpc3RlbiAoZXZlbnQpID0+XHJcbiAgICAgIGZpbGVTdGF0dXMgPSBpZiBldmVudC5zdGF0ZS5zYXZpbmdcclxuICAgICAgICB7bWVzc2FnZTogXCJTYXZpbmcuLi5cIiwgdHlwZTogJ2luZm8nfVxyXG4gICAgICBlbHNlIGlmIGV2ZW50LnN0YXRlLnNhdmVkXHJcbiAgICAgICAge21lc3NhZ2U6IFwiQWxsIGNoYW5nZXMgc2F2ZWQgdG8gI3tldmVudC5zdGF0ZS5tZXRhZGF0YS5wcm92aWRlci5kaXNwbGF5TmFtZX1cIiwgdHlwZTogJ2luZm8nfVxyXG4gICAgICBlbHNlIGlmIGV2ZW50LnN0YXRlLmRpcnR5XHJcbiAgICAgICAge21lc3NhZ2U6ICdVbnNhdmVkJywgdHlwZTogJ2FsZXJ0J31cclxuICAgICAgZWxzZVxyXG4gICAgICAgIG51bGxcclxuICAgICAgQHNldFN0YXRlXHJcbiAgICAgICAgZmlsZW5hbWU6IEBnZXRGaWxlbmFtZSgpXHJcbiAgICAgICAgcHJvdmlkZXI6IEBnZXRQcm92aWRlcigpXHJcbiAgICAgICAgZmlsZVN0YXR1czogZmlsZVN0YXR1c1xyXG5cclxuICAgICAgc3dpdGNoIGV2ZW50LnR5cGVcclxuICAgICAgICB3aGVuICdjb25uZWN0ZWQnXHJcbiAgICAgICAgICBAc2V0U3RhdGUgbWVudUl0ZW1zOiBAcHJvcHMuY2xpZW50Ll91aS5tZW51Py5pdGVtcyBvciBbXVxyXG5cclxuICAgIEBwcm9wcy5jbGllbnQuX3VpLmxpc3RlbiAoZXZlbnQpID0+XHJcbiAgICAgIHN3aXRjaCBldmVudC50eXBlXHJcbiAgICAgICAgd2hlbiAnc2hvd1Byb3ZpZGVyRGlhbG9nJ1xyXG4gICAgICAgICAgQHNldFN0YXRlIHByb3ZpZGVyRGlhbG9nOiBldmVudC5kYXRhXHJcbiAgICAgICAgd2hlbiAnc2hvd0Rvd25sb2FkRGlhbG9nJ1xyXG4gICAgICAgICAgQHNldFN0YXRlIGRvd25sb2FkRGlhbG9nOiBldmVudC5kYXRhXHJcbiAgICAgICAgd2hlbiAnc2hvd1JlbmFtZURpYWxvZydcclxuICAgICAgICAgIEBzZXRTdGF0ZSByZW5hbWVEaWFsb2c6IGV2ZW50LmRhdGFcclxuICAgICAgICB3aGVuICdhcHBlbmRNZW51SXRlbSdcclxuICAgICAgICAgIEBzdGF0ZS5tZW51SXRlbXMucHVzaCBldmVudC5kYXRhXHJcbiAgICAgICAgICBAc2V0U3RhdGUgbWVudUl0ZW1zOiBAc3RhdGUubWVudUl0ZW1zXHJcbiAgICAgICAgd2hlbiAnc2V0TWVudUJhckluZm8nXHJcbiAgICAgICAgICBAc3RhdGUubWVudU9wdGlvbnMuaW5mbyA9IGV2ZW50LmRhdGFcclxuICAgICAgICAgIEBzZXRTdGF0ZSBtZW51T3B0aW9uczogQHN0YXRlLm1lbnVPcHRpb25zXHJcblxyXG4gIGNsb3NlRGlhbG9nczogLT5cclxuICAgIEBzZXRTdGF0ZVxyXG4gICAgICBwcm92aWRlckRpYWxvZzogbnVsbFxyXG4gICAgICBkb3dubG9hZERpYWxvZzogbnVsbFxyXG4gICAgICByZW5hbWVEaWFsb2c6IG51bGxcclxuXHJcbiAgcmVuZGVyRGlhbG9nczogLT5cclxuICAgIGlmIEBzdGF0ZS5wcm92aWRlckRpYWxvZ1xyXG4gICAgICAoUHJvdmlkZXJUYWJiZWREaWFsb2cge2NsaWVudDogQHByb3BzLmNsaWVudCwgZGlhbG9nOiBAc3RhdGUucHJvdmlkZXJEaWFsb2csIGNsb3NlOiBAY2xvc2VEaWFsb2dzfSlcclxuICAgIGVsc2UgaWYgQHN0YXRlLmRvd25sb2FkRGlhbG9nXHJcbiAgICAgIChEb3dubG9hZERpYWxvZyB7ZmlsZW5hbWU6IEBzdGF0ZS5kb3dubG9hZERpYWxvZy5maWxlbmFtZSwgY29udGVudDogQHN0YXRlLmRvd25sb2FkRGlhbG9nLmNvbnRlbnQsIGNsb3NlOiBAY2xvc2VEaWFsb2dzfSlcclxuICAgIGVsc2UgaWYgQHN0YXRlLnJlbmFtZURpYWxvZ1xyXG4gICAgICAoUmVuYW1lRGlhbG9nIHtmaWxlbmFtZTogQHN0YXRlLnJlbmFtZURpYWxvZy5maWxlbmFtZSwgY2FsbGJhY2s6IEBzdGF0ZS5yZW5hbWVEaWFsb2cuY2FsbGJhY2ssIGNsb3NlOiBAY2xvc2VEaWFsb2dzfSlcclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgaWYgQHByb3BzLnVzaW5nSWZyYW1lXHJcbiAgICAgIChkaXYge2NsYXNzTmFtZTogJ2FwcCd9LFxyXG4gICAgICAgIChNZW51QmFyIHtmaWxlbmFtZTogQHN0YXRlLmZpbGVuYW1lLCBwcm92aWRlcjogQHN0YXRlLnByb3ZpZGVyLCBmaWxlU3RhdHVzOiBAc3RhdGUuZmlsZVN0YXR1cywgaXRlbXM6IEBzdGF0ZS5tZW51SXRlbXMsIG9wdGlvbnM6IEBzdGF0ZS5tZW51T3B0aW9uc30pXHJcbiAgICAgICAgKElubmVyQXBwIHthcHA6IEBwcm9wcy5hcHB9KVxyXG4gICAgICAgIEByZW5kZXJEaWFsb2dzKClcclxuICAgICAgKVxyXG4gICAgZWxzZSBpZiBAc3RhdGUucHJvdmlkZXJEaWFsb2cgb3IgQHN0YXRlLmRvd25sb2FkRGlhbG9nXHJcbiAgICAgIChkaXYge2NsYXNzTmFtZTogJ2FwcCd9LFxyXG4gICAgICAgIEByZW5kZXJEaWFsb2dzKClcclxuICAgICAgKVxyXG4gICAgZWxzZVxyXG4gICAgICBudWxsXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEFwcFxyXG4iLCJBdXRob3JpemVNaXhpbiA9XHJcbiAgZ2V0SW5pdGlhbFN0YXRlOiAtPlxyXG4gICAgYXV0aG9yaXplZDogZmFsc2VcclxuXHJcbiAgY29tcG9uZW50V2lsbE1vdW50OiAtPlxyXG4gICAgQHByb3BzLnByb3ZpZGVyLmF1dGhvcml6ZWQgKGF1dGhvcml6ZWQpID0+XHJcbiAgICAgIEBzZXRTdGF0ZSBhdXRob3JpemVkOiBhdXRob3JpemVkXHJcblxyXG4gIHJlbmRlcjogLT5cclxuICAgIGlmIEBzdGF0ZS5hdXRob3JpemVkXHJcbiAgICAgIEByZW5kZXJXaGVuQXV0aG9yaXplZCgpXHJcbiAgICBlbHNlXHJcbiAgICAgIEBwcm9wcy5wcm92aWRlci5yZW5kZXJBdXRob3JpemF0aW9uRGlhbG9nKClcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQXV0aG9yaXplTWl4aW5cclxuIiwie2RpdiwgaW5wdXQsIGEsIGJ1dHRvbn0gPSBSZWFjdC5ET01cclxuXHJcbk1vZGFsRGlhbG9nID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL21vZGFsLWRpYWxvZy12aWV3J1xyXG5cclxudHIgPSByZXF1aXJlICcuLi91dGlscy90cmFuc2xhdGUnXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzXHJcblxyXG4gIGRpc3BsYXlOYW1lOiAnRG93bmxvYWREaWFsb2dWaWV3J1xyXG5cclxuICBnZXRJbml0aWFsU3RhdGU6IC0+XHJcbiAgICBmaWxlbmFtZSA9IEBwcm9wcy5maWxlbmFtZSBvciAnJ1xyXG4gICAgc3RhdGUgPVxyXG4gICAgICBmaWxlbmFtZTogZmlsZW5hbWVcclxuICAgICAgdHJpbW1lZEZpbGVuYW1lOiBAdHJpbSBmaWxlbmFtZVxyXG5cclxuICBjb21wb25lbnREaWRNb3VudDogLT5cclxuICAgIEBmaWxlbmFtZSA9IFJlYWN0LmZpbmRET01Ob2RlIEByZWZzLmZpbGVuYW1lXHJcbiAgICBAZmlsZW5hbWUuZm9jdXMoKVxyXG5cclxuICB1cGRhdGVGaWxlbmFtZTogLT5cclxuICAgIGZpbGVuYW1lID0gQGZpbGVuYW1lLnZhbHVlXHJcbiAgICBAc2V0U3RhdGVcclxuICAgICAgZmlsZW5hbWU6IGZpbGVuYW1lXHJcbiAgICAgIHRyaW1tZWRGaWxlbmFtZTogQHRyaW0gZmlsZW5hbWVcclxuXHJcbiAgdHJpbTogKHMpIC0+XHJcbiAgICBzLnJlcGxhY2UgL15cXHMrfFxccyskLywgJydcclxuXHJcbiAgZG93bmxvYWQ6IChlKSAtPlxyXG4gICAgaWYgQHN0YXRlLnRyaW1tZWRGaWxlbmFtZS5sZW5ndGggPiAwXHJcbiAgICAgIGUudGFyZ2V0LnNldEF0dHJpYnV0ZSAnaHJlZicsIFwiZGF0YTp0ZXh0L3BsYWluLCN7ZW5jb2RlVVJJQ29tcG9uZW50KEBwcm9wcy5jb250ZW50KX1cIlxyXG4gICAgICBAcHJvcHMuY2xvc2UoKVxyXG4gICAgZWxzZVxyXG4gICAgICBlLnByZXZlbnREZWZhdWx0KClcclxuICAgICAgQGZpbGVuYW1lLmZvY3VzKClcclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgKE1vZGFsRGlhbG9nIHt0aXRsZTogKHRyICd+RElBTE9HLkRPV05MT0FEJyksIGNsb3NlOiBAcHJvcHMuY2xvc2V9LFxyXG4gICAgICAoZGl2IHtjbGFzc05hbWU6ICdkb3dubG9hZC1kaWFsb2cnfSxcclxuICAgICAgICAoaW5wdXQge3JlZjogJ2ZpbGVuYW1lJywgcGxhY2Vob2xkZXI6ICdGaWxlbmFtZScsIHZhbHVlOiBAc3RhdGUuZmlsZW5hbWUsIG9uQ2hhbmdlOiBAdXBkYXRlRmlsZW5hbWV9KVxyXG4gICAgICAgIChkaXYge2NsYXNzTmFtZTogJ2J1dHRvbnMnfSxcclxuICAgICAgICAgIChhIHtocmVmOiAnIycsIGNsYXNzTmFtZTogKGlmIEBzdGF0ZS50cmltbWVkRmlsZW5hbWUubGVuZ3RoIGlzIDAgdGhlbiAnZGlzYWJsZWQnIGVsc2UgJycpLCBkb3dubG9hZDogQHN0YXRlLnRyaW1tZWRGaWxlbmFtZSwgb25DbGljazogQGRvd25sb2FkfSwgdHIgJ35ET1dOTE9BRF9ESUFMT0cuRE9XTkxPQUQnKVxyXG4gICAgICAgICAgKGJ1dHRvbiB7b25DbGljazogQHByb3BzLmNsb3NlfSwgdHIgJ35ET1dOTE9BRF9ESUFMT0cuQ0FOQ0VMJylcclxuICAgICAgICApXHJcbiAgICAgIClcclxuICAgIClcclxuIiwie2RpdiwgaSwgc3BhbiwgdWwsIGxpfSA9IFJlYWN0LkRPTVxyXG5cclxuRHJvcGRvd25JdGVtID0gUmVhY3QuY3JlYXRlRmFjdG9yeSBSZWFjdC5jcmVhdGVDbGFzc1xyXG5cclxuICBkaXNwbGF5TmFtZTogJ0Ryb3Bkb3duSXRlbSdcclxuXHJcbiAgY2xpY2tlZDogLT5cclxuICAgIEBwcm9wcy5zZWxlY3QgQHByb3BzLml0ZW1cclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgZW5hYmxlZCA9IGlmIEBwcm9wcy5pdGVtLmhhc093blByb3BlcnR5ICdlbmFibGVkJ1xyXG4gICAgICBpZiB0eXBlb2YgQHByb3BzLml0ZW0uZW5hYmxlZCBpcyAnZnVuY3Rpb24nXHJcbiAgICAgICAgQHByb3BzLml0ZW0uZW5hYmxlZCgpXHJcbiAgICAgIGVsc2VcclxuICAgICAgICBAcHJvcHMuaXRlbS5lbmFibGVkXHJcbiAgICBlbHNlXHJcbiAgICAgIHRydWVcclxuXHJcbiAgICBjbGFzc2VzID0gWydtZW51SXRlbSddXHJcbiAgICBpZiBAcHJvcHMuaXRlbS5zZXBhcmF0b3JcclxuICAgICAgY2xhc3Nlcy5wdXNoICdzZXBhcmF0b3InXHJcbiAgICAgIChsaSB7Y2xhc3NOYW1lOiBjbGFzc2VzLmpvaW4oJyAnKX0sICcnKVxyXG4gICAgZWxzZVxyXG4gICAgICBjbGFzc2VzLnB1c2ggJ2Rpc2FibGVkJyBpZiBub3QgZW5hYmxlZCBvciAoQHByb3BzLmlzQWN0aW9uTWVudSBhbmQgbm90IEBwcm9wcy5pdGVtLmFjdGlvbilcclxuICAgICAgbmFtZSA9IEBwcm9wcy5pdGVtLm5hbWUgb3IgQHByb3BzLml0ZW1cclxuICAgICAgKGxpIHtjbGFzc05hbWU6IGNsYXNzZXMuam9pbignICcpLCBvbkNsaWNrOiBAY2xpY2tlZCB9LCBuYW1lKVxyXG5cclxuRHJvcERvd24gPSBSZWFjdC5jcmVhdGVDbGFzc1xyXG5cclxuICBkaXNwbGF5TmFtZTogJ0Ryb3Bkb3duJ1xyXG5cclxuICBnZXREZWZhdWx0UHJvcHM6IC0+XHJcbiAgICBpc0FjdGlvbk1lbnU6IHRydWUgICAgICAgICAgICAgICMgV2hldGhlciBlYWNoIGl0ZW0gY29udGFpbnMgaXRzIG93biBhY3Rpb25cclxuICAgIG9uU2VsZWN0OiAoaXRlbSkgLT4gICAgICAgICAgICAgIyBJZiBub3QsIEBwcm9wcy5vblNlbGVjdCBpcyBjYWxsZWRcclxuICAgICAgbG9nLmluZm8gXCJTZWxlY3RlZCAje2l0ZW19XCJcclxuXHJcbiAgZ2V0SW5pdGlhbFN0YXRlOiAtPlxyXG4gICAgc2hvd2luZ01lbnU6IGZhbHNlXHJcbiAgICB0aW1lb3V0OiBudWxsXHJcblxyXG4gIGJsdXI6IC0+XHJcbiAgICBAdW5ibHVyKClcclxuICAgIHRpbWVvdXQgPSBzZXRUaW1lb3V0ICggPT4gQHNldFN0YXRlIHtzaG93aW5nTWVudTogZmFsc2V9ICksIDUwMFxyXG4gICAgQHNldFN0YXRlIHt0aW1lb3V0OiB0aW1lb3V0fVxyXG5cclxuICB1bmJsdXI6IC0+XHJcbiAgICBpZiBAc3RhdGUudGltZW91dFxyXG4gICAgICBjbGVhclRpbWVvdXQoQHN0YXRlLnRpbWVvdXQpXHJcbiAgICBAc2V0U3RhdGUge3RpbWVvdXQ6IG51bGx9XHJcblxyXG4gIHNlbGVjdDogKGl0ZW0pIC0+XHJcbiAgICBuZXh0U3RhdGUgPSAobm90IEBzdGF0ZS5zaG93aW5nTWVudSlcclxuICAgIEBzZXRTdGF0ZSB7c2hvd2luZ01lbnU6IG5leHRTdGF0ZX1cclxuICAgIHJldHVybiB1bmxlc3MgaXRlbVxyXG4gICAgaWYgQHByb3BzLmlzQWN0aW9uTWVudSBhbmQgaXRlbS5hY3Rpb25cclxuICAgICAgaXRlbS5hY3Rpb24oKVxyXG4gICAgZWxzZVxyXG4gICAgICBAcHJvcHMub25TZWxlY3QgaXRlbVxyXG5cclxuICByZW5kZXI6IC0+XHJcbiAgICBtZW51Q2xhc3MgPSBpZiBAc3RhdGUuc2hvd2luZ01lbnUgdGhlbiAnbWVudS1zaG93aW5nJyBlbHNlICdtZW51LWhpZGRlbidcclxuICAgIHNlbGVjdCA9IChpdGVtKSA9PlxyXG4gICAgICAoID0+IEBzZWxlY3QoaXRlbSkpXHJcbiAgICAoZGl2IHtjbGFzc05hbWU6ICdtZW51J30sXHJcbiAgICAgIChzcGFuIHtjbGFzc05hbWU6ICdtZW51LWFuY2hvcicsIG9uQ2xpY2s6ID0+IEBzZWxlY3QobnVsbCl9LFxyXG4gICAgICAgIEBwcm9wcy5hbmNob3JcclxuICAgICAgICAoaSB7Y2xhc3NOYW1lOiAnaWNvbi1hcnJvdy1leHBhbmQnfSlcclxuICAgICAgKVxyXG4gICAgICBpZiBAcHJvcHMuaXRlbXM/Lmxlbmd0aCA+IDBcclxuICAgICAgICAoZGl2IHtjbGFzc05hbWU6IG1lbnVDbGFzcywgb25Nb3VzZUxlYXZlOiBAYmx1ciwgb25Nb3VzZUVudGVyOiBAdW5ibHVyfSxcclxuICAgICAgICAgICh1bCB7fSxcclxuICAgICAgICAgICAgKERyb3Bkb3duSXRlbSB7a2V5OiBpbmRleCwgaXRlbTogaXRlbSwgc2VsZWN0OiBAc2VsZWN0LCBpc0FjdGlvbk1lbnU6IEBwcm9wcy5pc0FjdGlvbk1lbnV9KSBmb3IgaXRlbSwgaW5kZXggaW4gQHByb3BzLml0ZW1zXHJcbiAgICAgICAgICApXHJcbiAgICAgICAgKVxyXG4gICAgKVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBEcm9wRG93blxyXG4iLCJBdXRob3JpemVNaXhpbiA9IHJlcXVpcmUgJy4vYXV0aG9yaXplLW1peGluJ1xyXG5DbG91ZE1ldGFkYXRhID0gKHJlcXVpcmUgJy4uL3Byb3ZpZGVycy9wcm92aWRlci1pbnRlcmZhY2UnKS5DbG91ZE1ldGFkYXRhXHJcblxyXG50ciA9IHJlcXVpcmUgJy4uL3V0aWxzL3RyYW5zbGF0ZSdcclxuXHJcbntkaXYsIGltZywgaSwgc3BhbiwgaW5wdXQsIGJ1dHRvbn0gPSBSZWFjdC5ET01cclxuXHJcbkZpbGVMaXN0RmlsZSA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgUmVhY3QuY3JlYXRlQ2xhc3NcclxuICBkaXNwbGF5TmFtZTogJ0ZpbGVMaXN0RmlsZSdcclxuXHJcbiAgY29tcG9uZW50V2lsbE1vdW50OiAtPlxyXG4gICAgQGxhc3RDbGljayA9IDBcclxuXHJcbiAgZmlsZVNlbGVjdGVkOiAgKGUpIC0+XHJcbiAgICBlLnByZXZlbnREZWZhdWx0KClcclxuICAgIGUuc3RvcFByb3BhZ2F0aW9uKClcclxuICAgIG5vdyA9IChuZXcgRGF0ZSgpKS5nZXRUaW1lKClcclxuICAgIEBwcm9wcy5maWxlU2VsZWN0ZWQgQHByb3BzLm1ldGFkYXRhXHJcbiAgICBpZiBub3cgLSBAbGFzdENsaWNrIDw9IDI1MFxyXG4gICAgICBAcHJvcHMuZmlsZUNvbmZpcm1lZCgpXHJcbiAgICBAbGFzdENsaWNrID0gbm93XHJcblxyXG4gIHJlbmRlcjogLT5cclxuICAgIChkaXYge2tleTogQHByb3BzLmtleSwgY2xhc3NOYW1lOiAoaWYgQHByb3BzLnNlbGVjdGVkIHRoZW4gJ3NlbGVjdGVkJyBlbHNlICcnKSwgb25DbGljazogQGZpbGVTZWxlY3RlZH0sIEBwcm9wcy5tZXRhZGF0YS5uYW1lKVxyXG5cclxuRmlsZUxpc3QgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IFJlYWN0LmNyZWF0ZUNsYXNzXHJcbiAgZGlzcGxheU5hbWU6ICdGaWxlTGlzdCdcclxuXHJcbiAgZ2V0SW5pdGlhbFN0YXRlOiAtPlxyXG4gICAgbG9hZGluZzogdHJ1ZVxyXG5cclxuICBjb21wb25lbnREaWRNb3VudDogLT5cclxuICAgIEBsb2FkKClcclxuXHJcbiAgbG9hZDogLT5cclxuICAgIEBwcm9wcy5wcm92aWRlci5saXN0IEBwcm9wcy5mb2xkZXIsIChlcnIsIGxpc3QpID0+XHJcbiAgICAgIHJldHVybiBhbGVydChlcnIpIGlmIGVyclxyXG4gICAgICBAc2V0U3RhdGVcclxuICAgICAgICBsb2FkaW5nOiBmYWxzZVxyXG4gICAgICBAcHJvcHMubGlzdExvYWRlZCBsaXN0XHJcblxyXG4gIHJlbmRlcjogLT5cclxuICAgIChkaXYge2NsYXNzTmFtZTogJ2ZpbGVsaXN0J30sXHJcbiAgICAgIGlmIEBzdGF0ZS5sb2FkaW5nXHJcbiAgICAgICAgdHIgXCJ+RklMRV9ESUFMT0cuTE9BRElOR1wiXHJcbiAgICAgIGVsc2VcclxuICAgICAgICBmb3IgbWV0YWRhdGEsIGkgaW4gQHByb3BzLmxpc3RcclxuICAgICAgICAgIChGaWxlTGlzdEZpbGUge2tleTogaSwgbWV0YWRhdGE6IG1ldGFkYXRhLCBzZWxlY3RlZDogQHByb3BzLnNlbGVjdGVkRmlsZSBpcyBtZXRhZGF0YSwgZmlsZVNlbGVjdGVkOiBAcHJvcHMuZmlsZVNlbGVjdGVkLCBmaWxlQ29uZmlybWVkOiBAcHJvcHMuZmlsZUNvbmZpcm1lZH0pXHJcbiAgICApXHJcblxyXG5GaWxlRGlhbG9nVGFiID0gUmVhY3QuY3JlYXRlQ2xhc3NcclxuICBkaXNwbGF5TmFtZTogJ0ZpbGVEaWFsb2dUYWInXHJcblxyXG4gIG1peGluczogW0F1dGhvcml6ZU1peGluXVxyXG5cclxuICBnZXRJbml0aWFsU3RhdGU6IC0+XHJcbiAgICBmb2xkZXI6IEBwcm9wcy5jbGllbnQuc3RhdGUubWV0YWRhdGE/LnBhcmVudCBvciBudWxsXHJcbiAgICBtZXRhZGF0YTogQHByb3BzLmNsaWVudC5zdGF0ZS5tZXRhZGF0YVxyXG4gICAgZmlsZW5hbWU6IEBwcm9wcy5jbGllbnQuc3RhdGUubWV0YWRhdGE/Lm5hbWUgb3IgJydcclxuICAgIGxpc3Q6IFtdXHJcblxyXG4gIGNvbXBvbmVudFdpbGxNb3VudDogLT5cclxuICAgIEBpc09wZW4gPSBAcHJvcHMuZGlhbG9nLmFjdGlvbiBpcyAnb3BlbkZpbGUnXHJcblxyXG4gIGZpbGVuYW1lQ2hhbmdlZDogKGUpIC0+XHJcbiAgICBmaWxlbmFtZSA9IGUudGFyZ2V0LnZhbHVlXHJcbiAgICBtZXRhZGF0YSA9IEBmaW5kTWV0YWRhdGEgZmlsZW5hbWVcclxuICAgIEBzZXRTdGF0ZVxyXG4gICAgICBmaWxlbmFtZTogZmlsZW5hbWVcclxuICAgICAgbWV0YWRhdGE6IG1ldGFkYXRhXHJcblxyXG4gIGxpc3RMb2FkZWQ6IChsaXN0KSAtPlxyXG4gICAgQHNldFN0YXRlIGxpc3Q6IGxpc3RcclxuXHJcbiAgZmlsZVNlbGVjdGVkOiAobWV0YWRhdGEpIC0+XHJcbiAgICBpZiBtZXRhZGF0YT8udHlwZSBpcyBDbG91ZE1ldGFkYXRhLkZpbGVcclxuICAgICAgQHNldFN0YXRlIGZpbGVuYW1lOiBtZXRhZGF0YS5uYW1lXHJcbiAgICBAc2V0U3RhdGUgbWV0YWRhdGE6IG1ldGFkYXRhXHJcblxyXG4gIGNvbmZpcm06IC0+XHJcbiAgICBpZiBub3QgQHN0YXRlLm1ldGFkYXRhXHJcbiAgICAgIGZpbGVuYW1lID0gJC50cmltIEBzdGF0ZS5maWxlbmFtZVxyXG4gICAgICBAc3RhdGUubWV0YWRhdGEgPSBAZmluZE1ldGFkYXRhIGZpbGVuYW1lXHJcbiAgICAgIGlmIG5vdCBAc3RhdGUubWV0YWRhdGFcclxuICAgICAgICBpZiBAaXNPcGVuXHJcbiAgICAgICAgICBhbGVydCBcIiN7QHN0YXRlLmZpbGVuYW1lfSBub3QgZm91bmRcIlxyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgIEBzdGF0ZS5tZXRhZGF0YSA9IG5ldyBDbG91ZE1ldGFkYXRhXHJcbiAgICAgICAgICAgIG5hbWU6IGZpbGVuYW1lXHJcbiAgICAgICAgICAgIHBhdGg6IFwiLyN7ZmlsZW5hbWV9XCIgIyBUT0RPOiBGaXggcGF0aFxyXG4gICAgICAgICAgICB0eXBlOiBDbG91ZE1ldGFkYXRhLkZpbGVcclxuICAgICAgICAgICAgcHJvdmlkZXI6IEBwcm9wcy5wcm92aWRlclxyXG4gICAgaWYgQHN0YXRlLm1ldGFkYXRhXHJcbiAgICAgICMgZW5zdXJlIHRoZSBtZXRhZGF0YSBwcm92aWRlciBpcyB0aGUgY3VycmVudGx5LXNob3dpbmcgdGFiXHJcbiAgICAgIEBzdGF0ZS5tZXRhZGF0YS5wcm92aWRlciA9IEBwcm9wcy5wcm92aWRlclxyXG4gICAgICBAcHJvcHMuZGlhbG9nLmNhbGxiYWNrPyBAc3RhdGUubWV0YWRhdGFcclxuICAgICAgQHByb3BzLmNsb3NlKClcclxuXHJcbiAgcmVtb3ZlOiAtPlxyXG4gICAgaWYgQHN0YXRlLm1ldGFkYXRhIGFuZCBAc3RhdGUubWV0YWRhdGEudHlwZSBpc250IENsb3VkTWV0YWRhdGEuRm9sZGVyIGFuZCBjb25maXJtKHRyKFwifkZJTEVfRElBTE9HLlJFTU9WRV9DT05GSVJNXCIsIHtmaWxlbmFtZTogQHN0YXRlLm1ldGFkYXRhLm5hbWV9KSlcclxuICAgICAgQHByb3BzLnByb3ZpZGVyLnJlbW92ZSBAc3RhdGUubWV0YWRhdGEsIChlcnIpID0+XHJcbiAgICAgICAgaWYgbm90IGVyclxyXG4gICAgICAgICAgbGlzdCA9IEBzdGF0ZS5saXN0LnNsaWNlIDBcclxuICAgICAgICAgIGluZGV4ID0gbGlzdC5pbmRleE9mIEBzdGF0ZS5tZXRhZGF0YVxyXG4gICAgICAgICAgbGlzdC5zcGxpY2UgaW5kZXgsIDFcclxuICAgICAgICAgIEBzZXRTdGF0ZVxyXG4gICAgICAgICAgICBsaXN0OiBsaXN0XHJcbiAgICAgICAgICAgIG1ldGFkYXRhOiBudWxsXHJcbiAgICAgICAgICAgIGZpbGVuYW1lOiAnJ1xyXG5cclxuICBjYW5jZWw6IC0+XHJcbiAgICBAcHJvcHMuY2xvc2UoKVxyXG5cclxuICBmaW5kTWV0YWRhdGE6IChmaWxlbmFtZSkgLT5cclxuICAgIGZvciBtZXRhZGF0YSBpbiBAc3RhdGUubGlzdFxyXG4gICAgICBpZiBtZXRhZGF0YS5uYW1lIGlzIGZpbGVuYW1lXHJcbiAgICAgICAgcmV0dXJuIG1ldGFkYXRhXHJcbiAgICBudWxsXHJcblxyXG4gIHdhdGNoRm9yRW50ZXI6IChlKSAtPlxyXG4gICAgaWYgZS5rZXlDb2RlIGlzIDEzIGFuZCBub3QgQGNvbmZpcm1EaXNhYmxlZCgpXHJcbiAgICAgIEBjb25maXJtKClcclxuXHJcbiAgY29uZmlybURpc2FibGVkOiAtPlxyXG4gICAgKEBzdGF0ZS5maWxlbmFtZS5sZW5ndGggaXMgMCkgb3IgKEBpc09wZW4gYW5kIG5vdCBAc3RhdGUubWV0YWRhdGEpXHJcblxyXG4gIHJlbmRlcldoZW5BdXRob3JpemVkOiAtPlxyXG4gICAgY29uZmlybURpc2FibGVkID0gQGNvbmZpcm1EaXNhYmxlZCgpXHJcbiAgICByZW1vdmVEaXNhYmxlZCA9IChAc3RhdGUubWV0YWRhdGEgaXMgbnVsbCkgb3IgKEBzdGF0ZS5tZXRhZGF0YS50eXBlIGlzIENsb3VkTWV0YWRhdGEuRm9sZGVyKVxyXG5cclxuICAgIChkaXYge2NsYXNzTmFtZTogJ2RpYWxvZ1RhYid9LFxyXG4gICAgICAoaW5wdXQge3R5cGU6ICd0ZXh0JywgdmFsdWU6IEBzdGF0ZS5maWxlbmFtZSwgcGxhY2Vob2xkZXI6ICh0ciBcIn5GSUxFX0RJQUxPRy5GSUxFTkFNRVwiKSwgb25DaGFuZ2U6IEBmaWxlbmFtZUNoYW5nZWQsIG9uS2V5RG93bjogQHdhdGNoRm9yRW50ZXJ9KVxyXG4gICAgICAoRmlsZUxpc3Qge3Byb3ZpZGVyOiBAcHJvcHMucHJvdmlkZXIsIGZvbGRlcjogQHN0YXRlLmZvbGRlciwgc2VsZWN0ZWRGaWxlOiBAc3RhdGUubWV0YWRhdGEsIGZpbGVTZWxlY3RlZDogQGZpbGVTZWxlY3RlZCwgZmlsZUNvbmZpcm1lZDogQGNvbmZpcm0sIGxpc3Q6IEBzdGF0ZS5saXN0LCBsaXN0TG9hZGVkOiBAbGlzdExvYWRlZH0pXHJcbiAgICAgIChkaXYge2NsYXNzTmFtZTogJ2J1dHRvbnMnfSxcclxuICAgICAgICAoYnV0dG9uIHtvbkNsaWNrOiBAY29uZmlybSwgZGlzYWJsZWQ6IGNvbmZpcm1EaXNhYmxlZCwgY2xhc3NOYW1lOiBpZiBjb25maXJtRGlzYWJsZWQgdGhlbiAnZGlzYWJsZWQnIGVsc2UgJyd9LCBpZiBAaXNPcGVuIHRoZW4gKHRyIFwifkZJTEVfRElBTE9HLk9QRU5cIikgZWxzZSAodHIgXCJ+RklMRV9ESUFMT0cuU0FWRVwiKSlcclxuICAgICAgICBpZiBAcHJvcHMucHJvdmlkZXIuY2FuICdyZW1vdmUnXHJcbiAgICAgICAgICAoYnV0dG9uIHtvbkNsaWNrOiBAcmVtb3ZlLCBkaXNhYmxlZDogcmVtb3ZlRGlzYWJsZWQsIGNsYXNzTmFtZTogaWYgcmVtb3ZlRGlzYWJsZWQgdGhlbiAnZGlzYWJsZWQnIGVsc2UgJyd9LCAodHIgXCJ+RklMRV9ESUFMT0cuUkVNT1ZFXCIpKVxyXG4gICAgICAgIChidXR0b24ge29uQ2xpY2s6IEBjYW5jZWx9LCAodHIgXCJ+RklMRV9ESUFMT0cuQ0FOQ0VMXCIpKVxyXG4gICAgICApXHJcbiAgICApXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEZpbGVEaWFsb2dUYWJcclxuIiwie2RpdiwgaSwgc3Bhbn0gPSBSZWFjdC5ET01cclxuXHJcbkRyb3Bkb3duID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL2Ryb3Bkb3duLXZpZXcnXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzXHJcblxyXG4gIGRpc3BsYXlOYW1lOiAnTWVudUJhcidcclxuXHJcbiAgaGVscDogLT5cclxuICAgIHdpbmRvdy5vcGVuIEBwcm9wcy5vcHRpb25zLmhlbHAsICdfYmxhbmsnXHJcblxyXG4gIHJlbmRlcjogLT5cclxuICAgIChkaXYge2NsYXNzTmFtZTogJ21lbnUtYmFyJ30sXHJcbiAgICAgIChkaXYge2NsYXNzTmFtZTogJ21lbnUtYmFyLWxlZnQnfSxcclxuICAgICAgICAoRHJvcGRvd24ge1xyXG4gICAgICAgICAgYW5jaG9yOiBAcHJvcHMuZmlsZW5hbWVcclxuICAgICAgICAgIGl0ZW1zOiBAcHJvcHMuaXRlbXNcclxuICAgICAgICAgIGNsYXNzTmFtZTonbWVudS1iYXItY29udGVudC1maWxlbmFtZSd9KVxyXG4gICAgICAgIGlmIEBwcm9wcy5maWxlU3RhdHVzXHJcbiAgICAgICAgICAoc3BhbiB7Y2xhc3NOYW1lOiBcIm1lbnUtYmFyLWZpbGUtc3RhdHVzLSN7QHByb3BzLmZpbGVTdGF0dXMudHlwZX1cIn0sIEBwcm9wcy5maWxlU3RhdHVzLm1lc3NhZ2UpXHJcbiAgICAgIClcclxuICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnbWVudS1iYXItcmlnaHQnfSxcclxuICAgICAgICBpZiBAcHJvcHMub3B0aW9ucy5pbmZvXHJcbiAgICAgICAgICAoc3BhbiB7Y2xhc3NOYW1lOiAnbWVudS1iYXItaW5mbyd9LCBAcHJvcHMub3B0aW9ucy5pbmZvKVxyXG4gICAgICAgIGlmIEBwcm9wcy5wcm92aWRlciBhbmQgQHByb3BzLnByb3ZpZGVyLmF1dGhvcml6ZWQoKVxyXG4gICAgICAgICAgQHByb3BzLnByb3ZpZGVyLnJlbmRlclVzZXIoKVxyXG4gICAgICAgIGlmIEBwcm9wcy5vcHRpb25zLmhlbHBcclxuICAgICAgICAgIChpIHtzdHlsZToge2ZvbnRTaXplOiBcIjEzcHhcIn0sIGNsYXNzTmFtZTogJ2NsaWNrYWJsZSBpY29uLWhlbHAnLCBvbkNsaWNrOiBAaGVscH0pXHJcbiAgICAgIClcclxuICAgIClcclxuIiwiTW9kYWwgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vbW9kYWwtdmlldydcclxue2RpdiwgaX0gPSBSZWFjdC5ET01cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3NcclxuXHJcbiAgZGlzcGxheU5hbWU6ICdNb2RhbERpYWxvZydcclxuXHJcbiAgY2xvc2U6IC0+XHJcbiAgICBAcHJvcHMuY2xvc2U/KClcclxuXHJcbiAgcmVuZGVyOiAtPlxyXG4gICAgKE1vZGFsIHtjbG9zZTogQHByb3BzLmNsb3NlfSxcclxuICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnbW9kYWwtZGlhbG9nJ30sXHJcbiAgICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnbW9kYWwtZGlhbG9nLXdyYXBwZXInfSxcclxuICAgICAgICAgIChkaXYge2NsYXNzTmFtZTogJ21vZGFsLWRpYWxvZy10aXRsZSd9LFxyXG4gICAgICAgICAgICAoaSB7Y2xhc3NOYW1lOiBcIm1vZGFsLWRpYWxvZy10aXRsZS1jbG9zZSBpY29uLWV4XCIsIG9uQ2xpY2s6IEBjbG9zZX0pXHJcbiAgICAgICAgICAgIEBwcm9wcy50aXRsZSBvciAnVW50aXRsZWQgRGlhbG9nJ1xyXG4gICAgICAgICAgKVxyXG4gICAgICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnbW9kYWwtZGlhbG9nLXdvcmtzcGFjZSd9LCBAcHJvcHMuY2hpbGRyZW4pXHJcbiAgICAgICAgKVxyXG4gICAgICApXHJcbiAgICApXHJcbiIsIk1vZGFsRGlhbG9nID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL21vZGFsLWRpYWxvZy12aWV3J1xyXG5UYWJiZWRQYW5lbCA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi90YWJiZWQtcGFuZWwtdmlldydcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3NcclxuXHJcbiAgZGlzcGxheU5hbWU6ICdNb2RhbFRhYmJlZERpYWxvZ1ZpZXcnXHJcblxyXG4gIHJlbmRlcjogLT5cclxuICAgIChNb2RhbERpYWxvZyB7dGl0bGU6IEBwcm9wcy50aXRsZSwgY2xvc2U6IEBwcm9wcy5jbG9zZX0sXHJcbiAgICAgIChUYWJiZWRQYW5lbCB7dGFiczogQHByb3BzLnRhYnMsIHNlbGVjdGVkVGFiSW5kZXg6IEBwcm9wcy5zZWxlY3RlZFRhYkluZGV4fSlcclxuICAgIClcclxuIiwie2Rpdn0gPSBSZWFjdC5ET01cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3NcclxuXHJcbiAgZGlzcGxheU5hbWU6ICdNb2RhbCdcclxuXHJcbiAgd2F0Y2hGb3JFc2NhcGU6IChlKSAtPlxyXG4gICAgaWYgZS5rZXlDb2RlIGlzIDI3XHJcbiAgICAgIEBwcm9wcy5jbG9zZT8oKVxyXG5cclxuICBjb21wb25lbnREaWRNb3VudDogLT5cclxuICAgICQod2luZG93KS5vbiAna2V5dXAnLCBAd2F0Y2hGb3JFc2NhcGVcclxuXHJcbiAgY29tcG9uZW50V2lsbFVubW91bnQ6IC0+XHJcbiAgICAkKHdpbmRvdykub2ZmICdrZXl1cCcsIEB3YXRjaEZvckVzY2FwZVxyXG5cclxuICByZW5kZXI6IC0+XHJcbiAgICAoZGl2IHtjbGFzc05hbWU6ICdtb2RhbCd9LFxyXG4gICAgICAoZGl2IHtjbGFzc05hbWU6ICdtb2RhbC1iYWNrZ3JvdW5kJ30pXHJcbiAgICAgIChkaXYge2NsYXNzTmFtZTogJ21vZGFsLWNvbnRlbnQnfSwgQHByb3BzLmNoaWxkcmVuKVxyXG4gICAgKVxyXG4iLCJNb2RhbFRhYmJlZERpYWxvZyA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9tb2RhbC10YWJiZWQtZGlhbG9nLXZpZXcnXHJcblRhYmJlZFBhbmVsID0gcmVxdWlyZSAnLi90YWJiZWQtcGFuZWwtdmlldydcclxuQ2xvdWRNZXRhZGF0YSA9IChyZXF1aXJlICcuLi9wcm92aWRlcnMvcHJvdmlkZXItaW50ZXJmYWNlJykuQ2xvdWRNZXRhZGF0YVxyXG5GaWxlRGlhbG9nVGFiID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL2ZpbGUtZGlhbG9nLXRhYi12aWV3J1xyXG5TZWxlY3RQcm92aWRlckRpYWxvZ1RhYiA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9zZWxlY3QtcHJvdmlkZXItZGlhbG9nLXRhYi12aWV3J1xyXG5cclxudHIgPSByZXF1aXJlICcuLi91dGlscy90cmFuc2xhdGUnXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzXHJcbiAgZGlzcGxheU5hbWU6ICdQcm92aWRlclRhYmJlZERpYWxvZydcclxuXHJcbiAgcmVuZGVyOiAgLT5cclxuICAgIFtjYXBhYmlsaXR5LCBUYWJDb21wb25lbnRdID0gc3dpdGNoIEBwcm9wcy5kaWFsb2cuYWN0aW9uXHJcbiAgICAgIHdoZW4gJ29wZW5GaWxlJyB0aGVuIFsnbGlzdCcsIEZpbGVEaWFsb2dUYWJdXHJcbiAgICAgIHdoZW4gJ3NhdmVGaWxlJywgJ3NhdmVGaWxlQXMnIHRoZW4gWydzYXZlJywgRmlsZURpYWxvZ1RhYl1cclxuICAgICAgd2hlbiAnc2F2ZUZpbGVDb3B5JywgJ3NhdmVGaWxlQ29weScgdGhlbiBbJ3NhdmUnLCBGaWxlRGlhbG9nVGFiXVxyXG4gICAgICB3aGVuICdzZWxlY3RQcm92aWRlcicgdGhlbiBbbnVsbCwgU2VsZWN0UHJvdmlkZXJEaWFsb2dUYWJdXHJcblxyXG4gICAgdGFicyA9IFtdXHJcbiAgICBzZWxlY3RlZFRhYkluZGV4ID0gMFxyXG4gICAgZm9yIHByb3ZpZGVyLCBpIGluIEBwcm9wcy5jbGllbnQuc3RhdGUuYXZhaWxhYmxlUHJvdmlkZXJzXHJcbiAgICAgIGlmIG5vdCBjYXBhYmlsaXR5IG9yIHByb3ZpZGVyLmNhcGFiaWxpdGllc1tjYXBhYmlsaXR5XVxyXG4gICAgICAgIGNvbXBvbmVudCA9IFRhYkNvbXBvbmVudFxyXG4gICAgICAgICAgY2xpZW50OiBAcHJvcHMuY2xpZW50XHJcbiAgICAgICAgICBkaWFsb2c6IEBwcm9wcy5kaWFsb2dcclxuICAgICAgICAgIGNsb3NlOiBAcHJvcHMuY2xvc2VcclxuICAgICAgICAgIHByb3ZpZGVyOiBwcm92aWRlclxyXG4gICAgICAgIHRhYnMucHVzaCBUYWJiZWRQYW5lbC5UYWIge2tleTogaSwgbGFiZWw6ICh0ciBwcm92aWRlci5kaXNwbGF5TmFtZSksIGNvbXBvbmVudDogY29tcG9uZW50fVxyXG4gICAgICAgIGlmIHByb3ZpZGVyIGlzIEBwcm9wcy5jbGllbnQuc3RhdGUubWV0YWRhdGE/LnByb3ZpZGVyXHJcbiAgICAgICAgICBzZWxlY3RlZFRhYkluZGV4ID0gaVxyXG5cclxuICAgIChNb2RhbFRhYmJlZERpYWxvZyB7dGl0bGU6ICh0ciBAcHJvcHMuZGlhbG9nLnRpdGxlKSwgY2xvc2U6IEBwcm9wcy5jbG9zZSwgdGFiczogdGFicywgc2VsZWN0ZWRUYWJJbmRleDogc2VsZWN0ZWRUYWJJbmRleH0pXHJcbiIsIntkaXYsIGlucHV0LCBhLCBidXR0b259ID0gUmVhY3QuRE9NXHJcblxyXG5Nb2RhbERpYWxvZyA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9tb2RhbC1kaWFsb2ctdmlldydcclxuXHJcbnRyID0gcmVxdWlyZSAnLi4vdXRpbHMvdHJhbnNsYXRlJ1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzc1xyXG5cclxuICBkaXNwbGF5TmFtZTogJ1JlbmFtZURpYWxvZ1ZpZXcnXHJcblxyXG4gIGdldEluaXRpYWxTdGF0ZTogLT5cclxuICAgIGZpbGVuYW1lID0gQHByb3BzLmZpbGVuYW1lIG9yICcnXHJcbiAgICBzdGF0ZSA9XHJcbiAgICAgIGZpbGVuYW1lOiBmaWxlbmFtZVxyXG4gICAgICB0cmltbWVkRmlsZW5hbWU6IEB0cmltIGZpbGVuYW1lXHJcblxyXG4gIGNvbXBvbmVudERpZE1vdW50OiAtPlxyXG4gICAgQGZpbGVuYW1lID0gUmVhY3QuZmluZERPTU5vZGUgQHJlZnMuZmlsZW5hbWVcclxuICAgIEBmaWxlbmFtZS5mb2N1cygpXHJcblxyXG4gIHVwZGF0ZUZpbGVuYW1lOiAtPlxyXG4gICAgZmlsZW5hbWUgPSBAZmlsZW5hbWUudmFsdWVcclxuICAgIEBzZXRTdGF0ZVxyXG4gICAgICBmaWxlbmFtZTogZmlsZW5hbWVcclxuICAgICAgdHJpbW1lZEZpbGVuYW1lOiBAdHJpbSBmaWxlbmFtZVxyXG5cclxuICB0cmltOiAocykgLT5cclxuICAgIHMucmVwbGFjZSAvXlxccyt8XFxzKyQvLCAnJ1xyXG5cclxuICByZW5hbWU6IChlKSAtPlxyXG4gICAgaWYgQHN0YXRlLnRyaW1tZWRGaWxlbmFtZS5sZW5ndGggPiAwXHJcbiAgICAgIEBwcm9wcy5jYWxsYmFjaz8gQHN0YXRlLmZpbGVuYW1lXHJcbiAgICAgIEBwcm9wcy5jbG9zZSgpXHJcbiAgICBlbHNlXHJcbiAgICAgIGUucHJldmVudERlZmF1bHQoKVxyXG4gICAgICBAZmlsZW5hbWUuZm9jdXMoKVxyXG5cclxuICByZW5kZXI6IC0+XHJcbiAgICAoTW9kYWxEaWFsb2cge3RpdGxlOiAodHIgJ35ESUFMT0cuUkVOQU1FJyksIGNsb3NlOiBAcHJvcHMuY2xvc2V9LFxyXG4gICAgICAoZGl2IHtjbGFzc05hbWU6ICdyZW5hbWUtZGlhbG9nJ30sXHJcbiAgICAgICAgKGlucHV0IHtyZWY6ICdmaWxlbmFtZScsIHBsYWNlaG9sZGVyOiAnRmlsZW5hbWUnLCB2YWx1ZTogQHN0YXRlLmZpbGVuYW1lLCBvbkNoYW5nZTogQHVwZGF0ZUZpbGVuYW1lfSlcclxuICAgICAgICAoZGl2IHtjbGFzc05hbWU6ICdidXR0b25zJ30sXHJcbiAgICAgICAgICAoYnV0dG9uIHtjbGFzc05hbWU6IChpZiBAc3RhdGUudHJpbW1lZEZpbGVuYW1lLmxlbmd0aCBpcyAwIHRoZW4gJ2Rpc2FibGVkJyBlbHNlICcnKSwgb25DbGljazogQHJlbmFtZX0sIHRyICd+UkVOQU1FX0RJQUxPRy5SRU5BTUUnKVxyXG4gICAgICAgICAgKGJ1dHRvbiB7b25DbGljazogQHByb3BzLmNsb3NlfSwgdHIgJ35SRU5BTUVfRElBTE9HLkNBTkNFTCcpXHJcbiAgICAgICAgKVxyXG4gICAgICApXHJcbiAgICApXHJcbiIsIntkaXZ9ID0gUmVhY3QuRE9NXHJcblxyXG5TZWxlY3RQcm92aWRlckRpYWxvZ1RhYiA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgUmVhY3QuY3JlYXRlQ2xhc3NcclxuICBkaXNwbGF5TmFtZTogJ1NlbGVjdFByb3ZpZGVyRGlhbG9nVGFiJ1xyXG4gIHJlbmRlcjogLT4gKGRpdiB7fSwgXCJUT0RPOiBTZWxlY3RQcm92aWRlckRpYWxvZ1RhYjogI3tAcHJvcHMucHJvdmlkZXIuZGlzcGxheU5hbWV9XCIpXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFNlbGVjdFByb3ZpZGVyRGlhbG9nVGFiXHJcbiIsIntkaXYsIHVsLCBsaSwgYX0gPSBSZWFjdC5ET01cclxuXHJcbmNsYXNzIFRhYkluZm9cclxuICBjb25zdHJ1Y3RvcjogKHNldHRpbmdzPXt9KSAtPlxyXG4gICAge0BsYWJlbCwgQGNvbXBvbmVudH0gPSBzZXR0aW5nc1xyXG5cclxuVGFiID0gUmVhY3QuY3JlYXRlRmFjdG9yeSBSZWFjdC5jcmVhdGVDbGFzc1xyXG5cclxuICBkaXNwbGF5TmFtZTogJ1RhYmJlZFBhbmVsVGFiJ1xyXG5cclxuICBjbGlja2VkOiAoZSkgLT5cclxuICAgIGUucHJldmVudERlZmF1bHQoKVxyXG4gICAgQHByb3BzLm9uU2VsZWN0ZWQgQHByb3BzLmluZGV4XHJcblxyXG4gIHJlbmRlcjogLT5cclxuICAgIGNsYXNzbmFtZSA9IGlmIEBwcm9wcy5zZWxlY3RlZCB0aGVuICd0YWItc2VsZWN0ZWQnIGVsc2UgJydcclxuICAgIChsaSB7Y2xhc3NOYW1lOiBjbGFzc25hbWUsIG9uQ2xpY2s6IEBjbGlja2VkfSwgQHByb3BzLmxhYmVsKVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzc1xyXG5cclxuICBkaXNwbGF5TmFtZTogJ1RhYmJlZFBhbmVsVmlldydcclxuXHJcbiAgZ2V0SW5pdGlhbFN0YXRlOiAtPlxyXG4gICAgc2VsZWN0ZWRUYWJJbmRleDogQHByb3BzLnNlbGVjdGVkVGFiSW5kZXggb3IgMFxyXG5cclxuICBzdGF0aWNzOlxyXG4gICAgVGFiOiAoc2V0dGluZ3MpIC0+IG5ldyBUYWJJbmZvIHNldHRpbmdzXHJcblxyXG4gIHNlbGVjdGVkVGFiOiAoaW5kZXgpIC0+XHJcbiAgICBAc2V0U3RhdGUgc2VsZWN0ZWRUYWJJbmRleDogaW5kZXhcclxuXHJcbiAgcmVuZGVyVGFiOiAodGFiLCBpbmRleCkgLT5cclxuICAgIChUYWJcclxuICAgICAgbGFiZWw6IHRhYi5sYWJlbFxyXG4gICAgICBrZXk6IGluZGV4XHJcbiAgICAgIGluZGV4OiBpbmRleFxyXG4gICAgICBzZWxlY3RlZDogKGluZGV4IGlzIEBzdGF0ZS5zZWxlY3RlZFRhYkluZGV4KVxyXG4gICAgICBvblNlbGVjdGVkOiBAc2VsZWN0ZWRUYWJcclxuICAgIClcclxuXHJcbiAgcmVuZGVyVGFiczogLT5cclxuICAgIChkaXYge2NsYXNzTmFtZTogJ3dvcmtzcGFjZS10YWJzJ30sXHJcbiAgICAgICh1bCB7a2V5OiBpbmRleH0sIEByZW5kZXJUYWIodGFiLCBpbmRleCkgZm9yIHRhYiwgaW5kZXggaW4gQHByb3BzLnRhYnMpXHJcbiAgICApXHJcblxyXG4gIHJlbmRlclNlbGVjdGVkUGFuZWw6IC0+XHJcbiAgICAoZGl2IHtjbGFzc05hbWU6ICd3b3Jrc3BhY2UtdGFiLWNvbXBvbmVudCd9LFxyXG4gICAgICBmb3IgdGFiLCBpbmRleCBpbiBAcHJvcHMudGFic1xyXG4gICAgICAgIChkaXYge1xyXG4gICAgICAgICAga2V5OiBpbmRleFxyXG4gICAgICAgICAgc3R5bGU6XHJcbiAgICAgICAgICAgIGRpc3BsYXk6IGlmIGluZGV4IGlzIEBzdGF0ZS5zZWxlY3RlZFRhYkluZGV4IHRoZW4gJ2Jsb2NrJyBlbHNlICdub25lJ1xyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIHRhYi5jb21wb25lbnRcclxuICAgICAgICApXHJcbiAgICApXHJcblxyXG4gIHJlbmRlcjogLT5cclxuICAgIChkaXYge2tleTogQHByb3BzLmtleSwgY2xhc3NOYW1lOiBcInRhYmJlZC1wYW5lbFwifSxcclxuICAgICAgQHJlbmRlclRhYnMoKVxyXG4gICAgICBAcmVuZGVyU2VsZWN0ZWRQYW5lbCgpXHJcbiAgICApXHJcbiJdfQ==
