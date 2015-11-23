(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.CloudFileManager = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var AppView, CloudFileManager, CloudFileManagerClient, CloudFileManagerClientEvent, CloudFileManagerUI, CloudFileManagerUIEvent, CloudFileManagerUIMenu, DocumentStoreProvider, GoogleDriveProvider, LocalStorageProvider, ReadOnlyProvider, isString, tr,
  hasProp = {}.hasOwnProperty;

tr = require('./utils/translate');

isString = require('./utils/is-string');

AppView = React.createFactory(require('./views/app-view'));

LocalStorageProvider = require('./providers/localstorage-provider');

ReadOnlyProvider = require('./providers/readonly-provider');

GoogleDriveProvider = require('./providers/google-drive-provider');

DocumentStoreProvider = require('./providers/document-store-provider');

CloudFileManagerUIEvent = (function() {
  function CloudFileManagerUIEvent(type1, data1) {
    this.type = type1;
    this.data = data1 != null ? data1 : {};
  }

  return CloudFileManagerUIEvent;

})();

CloudFileManagerUI = (function() {
  function CloudFileManagerUI(client1) {
    this.client = client1;
    this.menu = null;
  }

  CloudFileManagerUI.prototype.init = function(options1) {
    this.options = options1;
    if (this.options.menu !== null) {
      if (typeof this.options.menu === 'undefined') {
        this.options.menu = CloudFileManager.DefaultMenu;
      }
      return this.menu = new CloudFileManagerUIMenu(this.options, this.client);
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

  CloudFileManagerUI.prototype.selectProviderDialog = function(callback) {
    return this._showProviderDialog('selectProvider', tr('~DIALOG.SELECT_PROVIDER'), callback);
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
      availableProviders: [],
      currentProvider: null
    };
    this._ui = new CloudFileManagerUI(this);
  }

  CloudFileManagerClient.prototype.setAppOptions = function(appOptions) {
    var Provider, allProviders, i, j, len, len1, provider, providerName, providerOptions, ref, ref1, ref2, results;
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
    results = [];
    for (j = 0, len1 = ref1.length; j < len1; j++) {
      provider = ref1[j];
      ref2 = isString(provider) ? [provider, {}] : [provider.name, provider], providerName = ref2[0], providerOptions = ref2[1];
      if (!providerName) {
        results.push(this._error("Invalid provider spec - must either be string or object with name property"));
      } else {
        if (allProviders[providerName]) {
          Provider = allProviders[providerName];
          results.push(this.state.availableProviders.push(new Provider(providerOptions)));
        } else {
          results.push(this._error("Unknown provider: " + providerName));
        }
      }
    }
    return results;
  };

  CloudFileManagerClient.prototype.connect = function(options, eventCallback1) {
    this.eventCallback = eventCallback1;
    this._ui.init(options);
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
    if (callback == null) {
      callback = null;
    }
    return this._ensureProviderCan('load', metadata != null ? metadata.provider : void 0, (function(_this) {
      return function(provider) {
        return provider.load(metadata, function(err, content) {
          if (err) {
            return _this._error(err);
          }
          _this._fileChanged('openedFile', content, metadata);
          return typeof callback === "function" ? callback(content, metadata) : void 0;
        });
      };
    })(this));
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
    if (callback == null) {
      callback = null;
    }
    return this._ensureProviderCan('save', metadata != null ? metadata.provider : void 0, (function(_this) {
      return function(provider) {
        return provider.save(content, metadata, function(err) {
          if (err) {
            return _this._error(err);
          }
          _this._fileChanged('savedFile', content, metadata);
          return typeof callback === "function" ? callback(content, metadata) : void 0;
        });
      };
    })(this));
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

  CloudFileManagerClient.prototype._ensureProviderCan = function(capability, provider, callback) {
    if (provider != null ? provider.capabilities[capability] : void 0) {
      return callback(provider);
    } else {
      return this._ui.selectProviderDialog(function(err, provider) {
        if (!err) {
          return callback(provider);
        }
      });
    }
  };

  return CloudFileManagerClient;

})();

CloudFileManager = (function() {
  CloudFileManager.DefaultMenu = CloudFileManagerUIMenu.DefaultMenu;

  function CloudFileManager(options) {
    this.client = new CloudFileManagerClient();
  }

  CloudFileManager.prototype.setAppOptions = function(appCptions) {
    return this.client.setAppOptions(appCptions);
  };

  CloudFileManager.prototype.createFrame = function(appCptions, elemId) {
    this.setAppOptions(appCptions);
    appCptions.client = this.client;
    return React.render(AppView(appCptions), document.getElementById(elemId));
  };

  CloudFileManager.prototype.clientConnect = function(clientOptions, eventCallback) {
    return this.client.connect(clientOptions, eventCallback);
  };

  return CloudFileManager;

})();

module.exports = new CloudFileManager();



},{"./providers/document-store-provider":2,"./providers/google-drive-provider":3,"./providers/localstorage-provider":4,"./providers/readonly-provider":6,"./utils/is-string":7,"./utils/translate":9,"./views/app-view":10}],2:[function(require,module,exports){
var CloudMetadata, DocumentStoreAuthorizationDialog, DocumentStoreProvider, ProviderInterface, div, isString, tr,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

div = React.DOM.div;

tr = require('../utils/translate');

isString = require('../utils/is-string');

ProviderInterface = (require('./provider-interface')).ProviderInterface;

CloudMetadata = (require('./provider-interface')).CloudMetadata;

DocumentStoreAuthorizationDialog = React.createFactory(React.createClass({
  displayName: 'DocumentStoreAuthorizationDialog',
  render: function() {
    return div({}, "TODO: DocumentStoreAuthorizationDialog");
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

  DocumentStoreProvider.prototype.authorized = function(callback) {
    return callback(false);
  };

  DocumentStoreProvider.prototype.authorizationDialog = DocumentStoreAuthorizationDialog;

  return DocumentStoreProvider;

})(ProviderInterface);

module.exports = DocumentStoreProvider;



},{"../utils/is-string":7,"../utils/translate":9,"./provider-interface":5}],3:[function(require,module,exports){
var CloudMetadata, GoogleDriveAuthorizationDialog, GoogleDriveProvider, ProviderInterface, div, isString, tr,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

div = React.DOM.div;

tr = require('../utils/translate');

isString = require('../utils/is-string');

ProviderInterface = (require('./provider-interface')).ProviderInterface;

CloudMetadata = (require('./provider-interface')).CloudMetadata;

GoogleDriveAuthorizationDialog = React.createFactory(React.createClass({
  displayName: 'GoogleDriveAuthorizationDialog',
  render: function() {
    return div({}, "TODO: GoogleDriveAuthorizationDialog");
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
  }

  GoogleDriveProvider.Name = 'googleDrive';

  GoogleDriveProvider.prototype.authorized = function(callback) {
    return callback(false);
  };

  GoogleDriveProvider.prototype.authorizationDialog = GoogleDriveAuthorizationDialog;

  return GoogleDriveProvider;

})(ProviderInterface);

module.exports = GoogleDriveProvider;



},{"../utils/is-string":7,"../utils/translate":9,"./provider-interface":5}],4:[function(require,module,exports){
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

  LocalStorageProvider.prototype.authorized = function(callback) {
    return callback(true);
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



},{"../utils/translate":9,"./provider-interface":5}],5:[function(require,module,exports){
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
    this.name = options.name, this.path = options.path, this.type = options.type, this.provider = options.provider, this.parent = options.parent;
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

  ProviderInterface.prototype.authorized = function(callback) {
    return callback(false);
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



},{}],6:[function(require,module,exports){
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

  ReadOnlyProvider.prototype.authorized = function(callback) {
    return callback(true);
  };

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



},{"../utils/is-string":7,"../utils/translate":9,"./provider-interface":5}],7:[function(require,module,exports){
module.exports = function(param) {
  return Object.prototype.toString.call(param) === '[object String]';
};



},{}],8:[function(require,module,exports){
module.exports = {
  "~MENUBAR.UNTITLE_DOCUMENT": "Untitled Document",
  "~MENU.NEW": "New",
  "~MENU.OPEN": "Open ...",
  "~MENU.SAVE": "Save",
  "~MENU.SAVE_AS": "Save As ...",
  "~DIALOG.SAVE": "Save",
  "~DIALOG.SAVE_AS": "Save As ...",
  "~DIALOG.OPEN": "Open",
  "~DIALOG.SELECT_PROVIDER": "Select Provider",
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



},{}],9:[function(require,module,exports){
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



},{"./lang/en-us":8}],10:[function(require,module,exports){
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
    console.log("****");
    console.log(this.state.menuItems);
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



},{"../utils/translate":9,"./menu-bar-view":14,"./provider-tabbed-dialog-view":18}],11:[function(require,module,exports){
var AuthorizeMixin;

AuthorizeMixin = {
  render: function() {
    return this.props.provider.authorized((function(_this) {
      return function(authorized) {
        if (authorized) {
          return _this.renderWhenAuthorized();
        } else {
          return _this.props.provider.authorizationDialog({
            provider: _this.props.provider
          });
        }
      };
    })(this));
  }
};

module.exports = AuthorizeMixin;



},{}],12:[function(require,module,exports){
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



},{}],13:[function(require,module,exports){
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



},{"../providers/provider-interface":5,"../utils/translate":9,"./authorize-mixin":11}],14:[function(require,module,exports){
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



},{"./dropdown-view":12}],15:[function(require,module,exports){
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



},{"./modal-view":17}],16:[function(require,module,exports){
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
      tabs: this.props.tabs
    }));
  }
});



},{"./modal-dialog-view":15,"./tabbed-panel-view":20}],17:[function(require,module,exports){
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



},{}],18:[function(require,module,exports){
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
    var TabComponent, capability, component, i, j, len, provider, ref, ref1, tabs;
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
      }
    }
    return ModalTabbedDialog({
      title: tr(this.props.dialog.title),
      close: this.props.close,
      tabs: tabs
    });
  }
});



},{"../providers/provider-interface":5,"../utils/translate":9,"./file-dialog-tab-view":13,"./modal-tabbed-dialog-view":16,"./select-provider-dialog-tab-view":19,"./tabbed-panel-view":20}],19:[function(require,module,exports){
var SelectProviderDialogTab, div;

div = React.DOM.div;

SelectProviderDialogTab = React.createFactory(React.createClass({
  displayName: 'SelectProviderDialogTab',
  render: function() {
    return div({}, "TODO: SelectProviderDialogTab: " + this.props.provider.displayName);
  }
}));

module.exports = SelectProviderDialogTab;



},{}],20:[function(require,module,exports){
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
      selectedTabIndex: 0
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvc2ZlbnRyZXNzL3Byb2plY3RzL2Nsb3VkLWZpbGUtbWFuYWdlci9zcmMvY29kZS9hcHAuY29mZmVlIiwiL1VzZXJzL3NmZW50cmVzcy9wcm9qZWN0cy9jbG91ZC1maWxlLW1hbmFnZXIvc3JjL2NvZGUvcHJvdmlkZXJzL2RvY3VtZW50LXN0b3JlLXByb3ZpZGVyLmNvZmZlZSIsIi9Vc2Vycy9zZmVudHJlc3MvcHJvamVjdHMvY2xvdWQtZmlsZS1tYW5hZ2VyL3NyYy9jb2RlL3Byb3ZpZGVycy9nb29nbGUtZHJpdmUtcHJvdmlkZXIuY29mZmVlIiwiL1VzZXJzL3NmZW50cmVzcy9wcm9qZWN0cy9jbG91ZC1maWxlLW1hbmFnZXIvc3JjL2NvZGUvcHJvdmlkZXJzL2xvY2Fsc3RvcmFnZS1wcm92aWRlci5jb2ZmZWUiLCIvVXNlcnMvc2ZlbnRyZXNzL3Byb2plY3RzL2Nsb3VkLWZpbGUtbWFuYWdlci9zcmMvY29kZS9wcm92aWRlcnMvcHJvdmlkZXItaW50ZXJmYWNlLmNvZmZlZSIsIi9Vc2Vycy9zZmVudHJlc3MvcHJvamVjdHMvY2xvdWQtZmlsZS1tYW5hZ2VyL3NyYy9jb2RlL3Byb3ZpZGVycy9yZWFkb25seS1wcm92aWRlci5jb2ZmZWUiLCIvVXNlcnMvc2ZlbnRyZXNzL3Byb2plY3RzL2Nsb3VkLWZpbGUtbWFuYWdlci9zcmMvY29kZS91dGlscy9pcy1zdHJpbmcuY29mZmVlIiwiL1VzZXJzL3NmZW50cmVzcy9wcm9qZWN0cy9jbG91ZC1maWxlLW1hbmFnZXIvc3JjL2NvZGUvdXRpbHMvbGFuZy9lbi11cy5jb2ZmZWUiLCIvVXNlcnMvc2ZlbnRyZXNzL3Byb2plY3RzL2Nsb3VkLWZpbGUtbWFuYWdlci9zcmMvY29kZS91dGlscy90cmFuc2xhdGUuY29mZmVlIiwiL1VzZXJzL3NmZW50cmVzcy9wcm9qZWN0cy9jbG91ZC1maWxlLW1hbmFnZXIvc3JjL2NvZGUvdmlld3MvYXBwLXZpZXcuY29mZmVlIiwiL1VzZXJzL3NmZW50cmVzcy9wcm9qZWN0cy9jbG91ZC1maWxlLW1hbmFnZXIvc3JjL2NvZGUvdmlld3MvYXV0aG9yaXplLW1peGluLmNvZmZlZSIsIi9Vc2Vycy9zZmVudHJlc3MvcHJvamVjdHMvY2xvdWQtZmlsZS1tYW5hZ2VyL3NyYy9jb2RlL3ZpZXdzL2Ryb3Bkb3duLXZpZXcuY29mZmVlIiwiL1VzZXJzL3NmZW50cmVzcy9wcm9qZWN0cy9jbG91ZC1maWxlLW1hbmFnZXIvc3JjL2NvZGUvdmlld3MvZmlsZS1kaWFsb2ctdGFiLXZpZXcuY29mZmVlIiwiL1VzZXJzL3NmZW50cmVzcy9wcm9qZWN0cy9jbG91ZC1maWxlLW1hbmFnZXIvc3JjL2NvZGUvdmlld3MvbWVudS1iYXItdmlldy5jb2ZmZWUiLCIvVXNlcnMvc2ZlbnRyZXNzL3Byb2plY3RzL2Nsb3VkLWZpbGUtbWFuYWdlci9zcmMvY29kZS92aWV3cy9tb2RhbC1kaWFsb2ctdmlldy5jb2ZmZWUiLCIvVXNlcnMvc2ZlbnRyZXNzL3Byb2plY3RzL2Nsb3VkLWZpbGUtbWFuYWdlci9zcmMvY29kZS92aWV3cy9tb2RhbC10YWJiZWQtZGlhbG9nLXZpZXcuY29mZmVlIiwiL1VzZXJzL3NmZW50cmVzcy9wcm9qZWN0cy9jbG91ZC1maWxlLW1hbmFnZXIvc3JjL2NvZGUvdmlld3MvbW9kYWwtdmlldy5jb2ZmZWUiLCIvVXNlcnMvc2ZlbnRyZXNzL3Byb2plY3RzL2Nsb3VkLWZpbGUtbWFuYWdlci9zcmMvY29kZS92aWV3cy9wcm92aWRlci10YWJiZWQtZGlhbG9nLXZpZXcuY29mZmVlIiwiL1VzZXJzL3NmZW50cmVzcy9wcm9qZWN0cy9jbG91ZC1maWxlLW1hbmFnZXIvc3JjL2NvZGUvdmlld3Mvc2VsZWN0LXByb3ZpZGVyLWRpYWxvZy10YWItdmlldy5jb2ZmZWUiLCIvVXNlcnMvc2ZlbnRyZXNzL3Byb2plY3RzL2Nsb3VkLWZpbGUtbWFuYWdlci9zcmMvY29kZS92aWV3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RjtVQUVILEtBQUEsRUFDRTtZQUFBLE9BQUEsRUFBWSxLQUFBLEtBQVMsSUFBQyxDQUFBLEtBQUssQ0FBQyxnQkFBbkIsR0FBeUMsT0FBekMsR0FBc0QsTUFBL0Q7V0FIQztTQUFKLEVBS0MsR0FBRyxDQUFDLFNBTEw7QUFESDs7aUJBREQ7RUFEa0IsQ0F6QnJCO0VBcUNBLE1BQUEsRUFBUSxTQUFBO1dBQ0wsR0FBQSxDQUFJO01BQUMsR0FBQSxFQUFLLElBQUMsQ0FBQSxLQUFLLENBQUMsR0FBYjtNQUFrQixTQUFBLEVBQVcsY0FBN0I7S0FBSixFQUNDLElBQUMsQ0FBQSxVQUFELENBQUEsQ0FERCxFQUVDLElBQUMsQ0FBQSxtQkFBRCxDQUFBLENBRkQ7RUFESyxDQXJDUjtDQUZlIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInRyID0gcmVxdWlyZSAnLi91dGlscy90cmFuc2xhdGUnXG5pc1N0cmluZyA9IHJlcXVpcmUgJy4vdXRpbHMvaXMtc3RyaW5nJ1xuXG5BcHBWaWV3ID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL3ZpZXdzL2FwcC12aWV3J1xuXG5Mb2NhbFN0b3JhZ2VQcm92aWRlciA9IHJlcXVpcmUgJy4vcHJvdmlkZXJzL2xvY2Fsc3RvcmFnZS1wcm92aWRlcidcblJlYWRPbmx5UHJvdmlkZXIgPSByZXF1aXJlICcuL3Byb3ZpZGVycy9yZWFkb25seS1wcm92aWRlcidcbkdvb2dsZURyaXZlUHJvdmlkZXIgPSByZXF1aXJlICcuL3Byb3ZpZGVycy9nb29nbGUtZHJpdmUtcHJvdmlkZXInXG5Eb2N1bWVudFN0b3JlUHJvdmlkZXIgPSByZXF1aXJlICcuL3Byb3ZpZGVycy9kb2N1bWVudC1zdG9yZS1wcm92aWRlcidcblxuY2xhc3MgQ2xvdWRGaWxlTWFuYWdlclVJRXZlbnRcblxuICBjb25zdHJ1Y3RvcjogKEB0eXBlLCBAZGF0YSA9IHt9KSAtPlxuXG5jbGFzcyBDbG91ZEZpbGVNYW5hZ2VyVUlcblxuICBjb25zdHJ1Y3RvcjogKEBjbGllbnQpLT5cbiAgICBAbWVudSA9IG51bGxcblxuICBpbml0OiAoQG9wdGlvbnMpIC0+XG4gICAgIyBza2lwIHRoZSBtZW51IGlmIGV4cGxpY2l0eSBzZXQgdG8gbnVsbCAobWVhbmluZyBubyBtZW51KVxuICAgIGlmIEBvcHRpb25zLm1lbnUgaXNudCBudWxsXG4gICAgICBpZiB0eXBlb2YgQG9wdGlvbnMubWVudSBpcyAndW5kZWZpbmVkJ1xuICAgICAgICBAb3B0aW9ucy5tZW51ID0gQ2xvdWRGaWxlTWFuYWdlci5EZWZhdWx0TWVudVxuICAgICAgQG1lbnUgPSBuZXcgQ2xvdWRGaWxlTWFuYWdlclVJTWVudSBAb3B0aW9ucywgQGNsaWVudFxuXG4gICMgZm9yIFJlYWN0IHRvIGxpc3RlbiBmb3IgZGlhbG9nIGNoYW5nZXNcbiAgbGlzdGVuOiAoQGxpc3RlbmVyQ2FsbGJhY2spIC0+XG5cbiAgc2F2ZUZpbGVEaWFsb2c6IChjYWxsYmFjaykgLT5cbiAgICBAX3Nob3dQcm92aWRlckRpYWxvZyAnc2F2ZUZpbGUnLCAodHIgJ35ESUFMT0cuU0FWRScpLCBjYWxsYmFja1xuXG4gIHNhdmVGaWxlQXNEaWFsb2c6IChjYWxsYmFjaykgLT5cbiAgICBAX3Nob3dQcm92aWRlckRpYWxvZyAnc2F2ZUZpbGVBcycsICh0ciAnfkRJQUxPRy5TQVZFX0FTJyksIGNhbGxiYWNrXG5cbiAgb3BlbkZpbGVEaWFsb2c6IChjYWxsYmFjaykgLT5cbiAgICBAX3Nob3dQcm92aWRlckRpYWxvZyAnb3BlbkZpbGUnLCAodHIgJ35ESUFMT0cuT1BFTicpLCBjYWxsYmFja1xuXG4gIHNlbGVjdFByb3ZpZGVyRGlhbG9nOiAoY2FsbGJhY2spIC0+XG4gICAgQF9zaG93UHJvdmlkZXJEaWFsb2cgJ3NlbGVjdFByb3ZpZGVyJywgKHRyICd+RElBTE9HLlNFTEVDVF9QUk9WSURFUicpLCBjYWxsYmFja1xuXG4gIF9zaG93UHJvdmlkZXJEaWFsb2c6IChhY3Rpb24sIHRpdGxlLCBjYWxsYmFjaykgLT5cbiAgICBAbGlzdGVuZXJDYWxsYmFjayBuZXcgQ2xvdWRGaWxlTWFuYWdlclVJRXZlbnQgJ3Nob3dQcm92aWRlckRpYWxvZycsXG4gICAgICBhY3Rpb246IGFjdGlvblxuICAgICAgdGl0bGU6IHRpdGxlXG4gICAgICBjYWxsYmFjazogY2FsbGJhY2tcblxuY2xhc3MgQ2xvdWRGaWxlTWFuYWdlclVJTWVudVxuXG4gIEBEZWZhdWx0TWVudTogWyduZXdGaWxlRGlhbG9nJywgJ29wZW5GaWxlRGlhbG9nJywgJ3NhdmUnLCAnc2F2ZUZpbGVBc0RpYWxvZyddXG5cbiAgY29uc3RydWN0b3I6IChvcHRpb25zLCBjbGllbnQpIC0+XG4gICAgc2V0QWN0aW9uID0gKGFjdGlvbikgLT5cbiAgICAgIGNsaWVudFthY3Rpb25dPy5iaW5kKGNsaWVudCkgb3IgKC0+IGFsZXJ0IFwiTm8gI3thY3Rpb259IGFjdGlvbiBpcyBhdmFpbGFibGUgaW4gdGhlIGNsaWVudFwiKVxuXG4gICAgQGl0ZW1zID0gW11cbiAgICBmb3IgaXRlbSBpbiBvcHRpb25zLm1lbnVcbiAgICAgIG1lbnVJdGVtID0gaWYgaXNTdHJpbmcgaXRlbVxuICAgICAgICBuYW1lID0gb3B0aW9ucy5tZW51TmFtZXM/W2l0ZW1dXG4gICAgICAgIG1lbnVJdGVtID0gc3dpdGNoIGl0ZW1cbiAgICAgICAgICB3aGVuICduZXdGaWxlRGlhbG9nJ1xuICAgICAgICAgICAgbmFtZTogbmFtZSBvciB0ciBcIn5NRU5VLk5FV1wiXG4gICAgICAgICAgd2hlbiAnb3BlbkZpbGVEaWFsb2cnXG4gICAgICAgICAgICBuYW1lOiBuYW1lIG9yIHRyIFwifk1FTlUuT1BFTlwiXG4gICAgICAgICAgd2hlbiAnc2F2ZSdcbiAgICAgICAgICAgIG5hbWU6IG5hbWUgb3IgdHIgXCJ+TUVOVS5TQVZFXCJcbiAgICAgICAgICB3aGVuICdzYXZlRmlsZUFzRGlhbG9nJ1xuICAgICAgICAgICAgbmFtZTogbmFtZSBvciB0ciBcIn5NRU5VLlNBVkVfQVNcIlxuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIG5hbWU6IFwiVW5rbm93biBpdGVtOiAje2l0ZW19XCJcbiAgICAgICAgbWVudUl0ZW0uYWN0aW9uID0gc2V0QWN0aW9uIGl0ZW1cbiAgICAgICAgbWVudUl0ZW1cbiAgICAgIGVsc2VcbiAgICAgICAgIyBjbGllbnRzIGNhbiBwYXNzIGluIGN1c3RvbSB7bmFtZTouLi4sIGFjdGlvbjouLi59IG1lbnUgaXRlbXMgd2hlcmUgdGhlIGFjdGlvbiBjYW4gYmUgYSBjbGllbnQgZnVuY3Rpb24gbmFtZSBvciBpdCBpcyBhc3N1Z21lZCBpdCBpcyBhIGZ1bmN0aW9uXG4gICAgICAgIGlmIGlzU3RyaW5nIGl0ZW0uYWN0aW9uXG4gICAgICAgICAgaXRlbS5hY3Rpb24gPSBzZXRBY3Rpb24gaXRlbS5hY3Rpb25cbiAgICAgICAgaXRlbVxuICAgICAgaWYgbWVudUl0ZW1cbiAgICAgICAgQGl0ZW1zLnB1c2ggbWVudUl0ZW1cblxuY2xhc3MgQ2xvdWRGaWxlTWFuYWdlckNsaWVudEV2ZW50XG5cbiAgY29uc3RydWN0b3I6IChAdHlwZSwgQGRhdGEgPSB7fSwgQGNhbGxiYWNrID0gbnVsbCwgQHN0YXRlID0ge30pIC0+XG5cbmNsYXNzIENsb3VkRmlsZU1hbmFnZXJDbGllbnRcblxuICBjb25zdHJ1Y3RvcjogKG9wdGlvbnMpIC0+XG4gICAgQHN0YXRlID1cbiAgICAgIGNvbnRlbnQ6IG51bGxcbiAgICAgIG1ldGFkYXRhOiBudWxsXG4gICAgICBhdmFpbGFibGVQcm92aWRlcnM6IFtdXG4gICAgICBjdXJyZW50UHJvdmlkZXI6IG51bGxcbiAgICBAX3VpID0gbmV3IENsb3VkRmlsZU1hbmFnZXJVSSBAXG5cbiAgc2V0QXBwT3B0aW9uczogKGFwcE9wdGlvbnMgPSB7fSktPlxuICAgICMgZmx0ZXIgZm9yIGF2YWlsYWJsZSBwcm92aWRlcnNcbiAgICBhbGxQcm92aWRlcnMgPSB7fVxuICAgIGZvciBQcm92aWRlciBpbiBbUmVhZE9ubHlQcm92aWRlciwgTG9jYWxTdG9yYWdlUHJvdmlkZXIsIEdvb2dsZURyaXZlUHJvdmlkZXIsIERvY3VtZW50U3RvcmVQcm92aWRlcl1cbiAgICAgIGlmIFByb3ZpZGVyLkF2YWlsYWJsZSgpXG4gICAgICAgIGFsbFByb3ZpZGVyc1tQcm92aWRlci5OYW1lXSA9IFByb3ZpZGVyXG5cbiAgICAjIGRlZmF1bHQgdG8gYWxsIHByb3ZpZGVycyBpZiBub24gc3BlY2lmaWVkXG4gICAgaWYgbm90IGFwcE9wdGlvbnMucHJvdmlkZXJzXG4gICAgICBhcHBPcHRpb25zLnByb3ZpZGVycyA9IFtdXG4gICAgICBmb3Igb3duIHByb3ZpZGVyTmFtZSBvZiBhbGxQcm92aWRlcnNcbiAgICAgICAgYXBwT3B0aW9ucy5wcm92aWRlcnMucHVzaCBwcm92aWRlck5hbWVcblxuICAgICMgY2hlY2sgdGhlIHByb3ZpZGVyc1xuICAgIGZvciBwcm92aWRlciBpbiBhcHBPcHRpb25zLnByb3ZpZGVyc1xuICAgICAgW3Byb3ZpZGVyTmFtZSwgcHJvdmlkZXJPcHRpb25zXSA9IGlmIGlzU3RyaW5nIHByb3ZpZGVyIHRoZW4gW3Byb3ZpZGVyLCB7fV0gZWxzZSBbcHJvdmlkZXIubmFtZSwgcHJvdmlkZXJdXG4gICAgICBpZiBub3QgcHJvdmlkZXJOYW1lXG4gICAgICAgIEBfZXJyb3IgXCJJbnZhbGlkIHByb3ZpZGVyIHNwZWMgLSBtdXN0IGVpdGhlciBiZSBzdHJpbmcgb3Igb2JqZWN0IHdpdGggbmFtZSBwcm9wZXJ0eVwiXG4gICAgICBlbHNlXG4gICAgICAgIGlmIGFsbFByb3ZpZGVyc1twcm92aWRlck5hbWVdXG4gICAgICAgICAgUHJvdmlkZXIgPSBhbGxQcm92aWRlcnNbcHJvdmlkZXJOYW1lXVxuICAgICAgICAgIEBzdGF0ZS5hdmFpbGFibGVQcm92aWRlcnMucHVzaCBuZXcgUHJvdmlkZXIgcHJvdmlkZXJPcHRpb25zXG4gICAgICAgIGVsc2VcbiAgICAgICAgICBAX2Vycm9yIFwiVW5rbm93biBwcm92aWRlcjogI3twcm92aWRlck5hbWV9XCJcblxuICAjIHNpbmdsZSBjbGllbnQgLSB1c2VkIGJ5IHRoZSBjbGllbnQgYXBwIHRvIHJlZ2lzdGVyIGFuZCByZWNlaXZlIGNhbGxiYWNrIGV2ZW50c1xuICBjb25uZWN0OiAob3B0aW9ucywgQGV2ZW50Q2FsbGJhY2spIC0+XG4gICAgQF91aS5pbml0IG9wdGlvbnNcbiAgICBAX2V2ZW50ICdjb25uZWN0ZWQnLCB7Y2xpZW50OiBAfVxuXG4gICMgc2luZ2xlIGxpc3RlbmVyIC0gdXNlZCBieSB0aGUgUmVhY3QgbWVudSB2aWEgdG8gd2F0Y2ggY2xpZW50IHN0YXRlIGNoYW5nZXNcbiAgbGlzdGVuOiAoQGxpc3RlbmVyQ2FsbGJhY2spIC0+XG5cbiAgbmV3RmlsZTogKGNhbGxiYWNrID0gbnVsbCkgLT5cbiAgICBAc3RhdGUuY29udGVudCA9IG51bGxcbiAgICBAc3RhdGUubWV0YWRhdGEgPSBudWxsXG4gICAgQF9ldmVudCAnbmV3ZWRGaWxlJ1xuXG4gIG5ld0ZpbGVEaWFsb2c6IChjYWxsYmFjayA9IG51bGwpIC0+XG4gICAgIyBmb3Igbm93IGp1c3QgY2FsbCBuZXcgLSBsYXRlciB3ZSBjYW4gYWRkIGNoYW5nZSBub3RpZmljYXRpb24gZnJvbSB0aGUgY2xpZW50IHNvIHdlIGNhbiBwcm9tcHQgZm9yIFwiQXJlIHlvdSBzdXJlP1wiXG4gICAgQG5ld0ZpbGUoKVxuXG4gIG9wZW5GaWxlOiAobWV0YWRhdGEsIGNhbGxiYWNrID0gbnVsbCkgLT5cbiAgICBAX2Vuc3VyZVByb3ZpZGVyQ2FuICdsb2FkJywgbWV0YWRhdGE/LnByb3ZpZGVyLCAocHJvdmlkZXIpID0+XG4gICAgICBwcm92aWRlci5sb2FkIG1ldGFkYXRhLCAoZXJyLCBjb250ZW50KSA9PlxuICAgICAgICByZXR1cm4gQF9lcnJvcihlcnIpIGlmIGVyclxuICAgICAgICBAX2ZpbGVDaGFuZ2VkICdvcGVuZWRGaWxlJywgY29udGVudCwgbWV0YWRhdGFcbiAgICAgICAgY2FsbGJhY2s/IGNvbnRlbnQsIG1ldGFkYXRhXG5cbiAgb3BlbkZpbGVEaWFsb2c6IChjYWxsYmFjayA9IG51bGwpIC0+XG4gICAgQF91aS5vcGVuRmlsZURpYWxvZyAobWV0YWRhdGEpID0+XG4gICAgICBAb3BlbkZpbGUgbWV0YWRhdGEsIGNhbGxiYWNrXG5cbiAgc2F2ZTogKGNhbGxiYWNrID0gbnVsbCkgLT5cbiAgICBAX2V2ZW50ICdnZXRDb250ZW50Jywge30sIChjb250ZW50KSA9PlxuICAgICAgQHNhdmVDb250ZW50IGNvbnRlbnQsIGNhbGxiYWNrXG5cbiAgc2F2ZUNvbnRlbnQ6IChjb250ZW50LCBjYWxsYmFjayA9IG51bGwpIC0+XG4gICAgaWYgQHN0YXRlLm1ldGFkYXRhXG4gICAgICBAc2F2ZUZpbGUgY29udGVudCwgQHN0YXRlLm1ldGFkYXRhLCBjYWxsYmFja1xuICAgIGVsc2VcbiAgICAgIEBzYXZlRmlsZURpYWxvZyBjb250ZW50LCBjYWxsYmFja1xuXG4gIHNhdmVGaWxlOiAoY29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrID0gbnVsbCkgLT5cbiAgICBAX2Vuc3VyZVByb3ZpZGVyQ2FuICdzYXZlJywgbWV0YWRhdGE/LnByb3ZpZGVyLCAocHJvdmlkZXIpID0+XG4gICAgICBwcm92aWRlci5zYXZlIGNvbnRlbnQsIG1ldGFkYXRhLCAoZXJyKSA9PlxuICAgICAgICByZXR1cm4gQF9lcnJvcihlcnIpIGlmIGVyclxuICAgICAgICBAX2ZpbGVDaGFuZ2VkICdzYXZlZEZpbGUnLCBjb250ZW50LCBtZXRhZGF0YVxuICAgICAgICBjYWxsYmFjaz8gY29udGVudCwgbWV0YWRhdGFcblxuICBzYXZlRmlsZURpYWxvZzogKGNvbnRlbnQgPSBudWxsLCBjYWxsYmFjayA9IG51bGwpIC0+XG4gICAgQF91aS5zYXZlRmlsZURpYWxvZyAobWV0YWRhdGEpID0+XG4gICAgICBAX2RpYWxvZ1NhdmUgY29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrXG5cbiAgc2F2ZUZpbGVBc0RpYWxvZzogKGNvbnRlbnQgPSBudWxsLCBjYWxsYmFjayA9IG51bGwpIC0+XG4gICAgQF91aS5zYXZlRmlsZUFzRGlhbG9nIChtZXRhZGF0YSkgPT5cbiAgICAgIEBfZGlhbG9nU2F2ZSBjb250ZW50LCBtZXRhZGF0YSwgY2FsbGJhY2tcblxuICBfZGlhbG9nU2F2ZTogKGNvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cbiAgICBpZiBjb250ZW50IGlzbnQgbnVsbFxuICAgICAgQHNhdmVGaWxlIGNvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFja1xuICAgIGVsc2VcbiAgICAgIEBfZXZlbnQgJ2dldENvbnRlbnQnLCB7fSwgKGNvbnRlbnQpID0+XG4gICAgICAgIEBzYXZlRmlsZSBjb250ZW50LCBtZXRhZGF0YSwgY2FsbGJhY2tcblxuICBfZXJyb3I6IChtZXNzYWdlKSAtPlxuICAgICMgZm9yIG5vdyBhbiBhbGVydFxuICAgIGFsZXJ0IG1lc3NhZ2VcblxuICBfZmlsZUNoYW5nZWQ6ICh0eXBlLCBjb250ZW50LCBtZXRhZGF0YSkgLT5cbiAgICBAc3RhdGUuY29udGVudCA9IGNvbnRlbnRcbiAgICBAc3RhdGUubWV0YWRhdGEgPSBtZXRhZGF0YVxuICAgIEBfZXZlbnQgdHlwZSwge2NvbnRlbnQ6IGNvbnRlbnQsIG1ldGFkYXRhOiBtZXRhZGF0YX1cblxuICBfZXZlbnQ6ICh0eXBlLCBkYXRhID0ge30sIGV2ZW50Q2FsbGJhY2sgPSBudWxsKSAtPlxuICAgIGV2ZW50ID0gbmV3IENsb3VkRmlsZU1hbmFnZXJDbGllbnRFdmVudCB0eXBlLCBkYXRhLCBldmVudENhbGxiYWNrLCBAc3RhdGVcbiAgICBAZXZlbnRDYWxsYmFjaz8gZXZlbnRcbiAgICBAbGlzdGVuZXJDYWxsYmFjaz8gZXZlbnRcblxuICBfZW5zdXJlUHJvdmlkZXJDYW46IChjYXBhYmlsaXR5LCBwcm92aWRlciwgY2FsbGJhY2spIC0+XG4gICAgaWYgcHJvdmlkZXI/LmNhcGFiaWxpdGllc1tjYXBhYmlsaXR5XVxuICAgICAgY2FsbGJhY2sgcHJvdmlkZXJcbiAgICBlbHNlXG4gICAgICBAX3VpLnNlbGVjdFByb3ZpZGVyRGlhbG9nIChlcnIsIHByb3ZpZGVyKSAtPlxuICAgICAgICBpZiBub3QgZXJyXG4gICAgICAgICAgY2FsbGJhY2sgcHJvdmlkZXJcblxuY2xhc3MgQ2xvdWRGaWxlTWFuYWdlclxuXG4gIEBEZWZhdWx0TWVudTogQ2xvdWRGaWxlTWFuYWdlclVJTWVudS5EZWZhdWx0TWVudVxuXG4gIGNvbnN0cnVjdG9yOiAob3B0aW9ucykgLT5cbiAgICBAY2xpZW50ID0gbmV3IENsb3VkRmlsZU1hbmFnZXJDbGllbnQoKVxuXG4gIHNldEFwcE9wdGlvbnM6IChhcHBDcHRpb25zKSAtPlxuICAgIEBjbGllbnQuc2V0QXBwT3B0aW9ucyBhcHBDcHRpb25zXG5cbiAgY3JlYXRlRnJhbWU6IChhcHBDcHRpb25zLCBlbGVtSWQpIC0+XG4gICAgQHNldEFwcE9wdGlvbnMgYXBwQ3B0aW9uc1xuICAgIGFwcENwdGlvbnMuY2xpZW50ID0gQGNsaWVudFxuICAgIFJlYWN0LnJlbmRlciAoQXBwVmlldyBhcHBDcHRpb25zKSwgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoZWxlbUlkKVxuXG4gIGNsaWVudENvbm5lY3Q6IChjbGllbnRPcHRpb25zLCBldmVudENhbGxiYWNrKSAtPlxuICAgIEBjbGllbnQuY29ubmVjdCAgY2xpZW50T3B0aW9ucywgZXZlbnRDYWxsYmFja1xuXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBDbG91ZEZpbGVNYW5hZ2VyKClcbiIsIntkaXZ9ID0gUmVhY3QuRE9NXG5cbnRyID0gcmVxdWlyZSAnLi4vdXRpbHMvdHJhbnNsYXRlJ1xuaXNTdHJpbmcgPSByZXF1aXJlICcuLi91dGlscy9pcy1zdHJpbmcnXG5cblByb3ZpZGVySW50ZXJmYWNlID0gKHJlcXVpcmUgJy4vcHJvdmlkZXItaW50ZXJmYWNlJykuUHJvdmlkZXJJbnRlcmZhY2VcbkNsb3VkTWV0YWRhdGEgPSAocmVxdWlyZSAnLi9wcm92aWRlci1pbnRlcmZhY2UnKS5DbG91ZE1ldGFkYXRhXG5cbkRvY3VtZW50U3RvcmVBdXRob3JpemF0aW9uRGlhbG9nID0gUmVhY3QuY3JlYXRlRmFjdG9yeSBSZWFjdC5jcmVhdGVDbGFzc1xuICBkaXNwbGF5TmFtZTogJ0RvY3VtZW50U3RvcmVBdXRob3JpemF0aW9uRGlhbG9nJ1xuICByZW5kZXI6IC0+XG4gICAgKGRpdiB7fSwgXCJUT0RPOiBEb2N1bWVudFN0b3JlQXV0aG9yaXphdGlvbkRpYWxvZ1wiKVxuXG5jbGFzcyBEb2N1bWVudFN0b3JlUHJvdmlkZXIgZXh0ZW5kcyBQcm92aWRlckludGVyZmFjZVxuXG4gIGNvbnN0cnVjdG9yOiAoQG9wdGlvbnMgPSB7fSkgLT5cbiAgICBzdXBlclxuICAgICAgbmFtZTogRG9jdW1lbnRTdG9yZVByb3ZpZGVyLk5hbWVcbiAgICAgIGRpc3BsYXlOYW1lOiBAb3B0aW9ucy5kaXNwbGF5TmFtZSBvciAodHIgJ35QUk9WSURFUi5ET0NVTUVOVF9TVE9SRScpXG4gICAgICBjYXBhYmlsaXRpZXM6XG4gICAgICAgIHNhdmU6IHRydWVcbiAgICAgICAgbG9hZDogdHJ1ZVxuICAgICAgICBsaXN0OiB0cnVlXG5cbiAgQE5hbWU6ICdkb2N1bWVudFN0b3JlJ1xuXG4gIGF1dGhvcml6ZWQ6IChjYWxsYmFjaykgLT5cbiAgICBjYWxsYmFjayBmYWxzZVxuXG4gIGF1dGhvcml6YXRpb25EaWFsb2c6IERvY3VtZW50U3RvcmVBdXRob3JpemF0aW9uRGlhbG9nXG5cbm1vZHVsZS5leHBvcnRzID0gRG9jdW1lbnRTdG9yZVByb3ZpZGVyXG4iLCJ7ZGl2fSA9IFJlYWN0LkRPTVxuXG50ciA9IHJlcXVpcmUgJy4uL3V0aWxzL3RyYW5zbGF0ZSdcbmlzU3RyaW5nID0gcmVxdWlyZSAnLi4vdXRpbHMvaXMtc3RyaW5nJ1xuXG5Qcm92aWRlckludGVyZmFjZSA9IChyZXF1aXJlICcuL3Byb3ZpZGVyLWludGVyZmFjZScpLlByb3ZpZGVySW50ZXJmYWNlXG5DbG91ZE1ldGFkYXRhID0gKHJlcXVpcmUgJy4vcHJvdmlkZXItaW50ZXJmYWNlJykuQ2xvdWRNZXRhZGF0YVxuXG5Hb29nbGVEcml2ZUF1dGhvcml6YXRpb25EaWFsb2cgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IFJlYWN0LmNyZWF0ZUNsYXNzXG4gIGRpc3BsYXlOYW1lOiAnR29vZ2xlRHJpdmVBdXRob3JpemF0aW9uRGlhbG9nJ1xuICByZW5kZXI6IC0+XG4gICAgKGRpdiB7fSwgXCJUT0RPOiBHb29nbGVEcml2ZUF1dGhvcml6YXRpb25EaWFsb2dcIilcblxuY2xhc3MgR29vZ2xlRHJpdmVQcm92aWRlciBleHRlbmRzIFByb3ZpZGVySW50ZXJmYWNlXG5cbiAgY29uc3RydWN0b3I6IChAb3B0aW9ucyA9IHt9KSAtPlxuICAgIHN1cGVyXG4gICAgICBuYW1lOiBHb29nbGVEcml2ZVByb3ZpZGVyLk5hbWVcbiAgICAgIGRpc3BsYXlOYW1lOiBAb3B0aW9ucy5kaXNwbGF5TmFtZSBvciAodHIgJ35QUk9WSURFUi5HT09HTEVfRFJJVkUnKVxuICAgICAgY2FwYWJpbGl0aWVzOlxuICAgICAgICBzYXZlOiB0cnVlXG4gICAgICAgIGxvYWQ6IHRydWVcbiAgICAgICAgbGlzdDogdHJ1ZVxuXG4gIEBOYW1lOiAnZ29vZ2xlRHJpdmUnXG5cbiAgYXV0aG9yaXplZDogKGNhbGxiYWNrKSAtPlxuICAgIGNhbGxiYWNrIGZhbHNlXG5cbiAgYXV0aG9yaXphdGlvbkRpYWxvZzogR29vZ2xlRHJpdmVBdXRob3JpemF0aW9uRGlhbG9nXG5cbm1vZHVsZS5leHBvcnRzID0gR29vZ2xlRHJpdmVQcm92aWRlclxuIiwidHIgPSByZXF1aXJlICcuLi91dGlscy90cmFuc2xhdGUnXG5cblByb3ZpZGVySW50ZXJmYWNlID0gKHJlcXVpcmUgJy4vcHJvdmlkZXItaW50ZXJmYWNlJykuUHJvdmlkZXJJbnRlcmZhY2VcbkNsb3VkTWV0YWRhdGEgPSAocmVxdWlyZSAnLi9wcm92aWRlci1pbnRlcmZhY2UnKS5DbG91ZE1ldGFkYXRhXG5cbmNsYXNzIExvY2FsU3RvcmFnZVByb3ZpZGVyIGV4dGVuZHMgUHJvdmlkZXJJbnRlcmZhY2VcblxuICBjb25zdHJ1Y3RvcjogKEBvcHRpb25zID0ge30pIC0+XG4gICAgc3VwZXJcbiAgICAgIG5hbWU6IExvY2FsU3RvcmFnZVByb3ZpZGVyLk5hbWVcbiAgICAgIGRpc3BsYXlOYW1lOiBAb3B0aW9ucy5kaXNwbGF5TmFtZSBvciAodHIgJ35QUk9WSURFUi5MT0NBTF9TVE9SQUdFJylcbiAgICAgIGNhcGFiaWxpdGllczpcbiAgICAgICAgc2F2ZTogdHJ1ZVxuICAgICAgICBsb2FkOiB0cnVlXG4gICAgICAgIGxpc3Q6IHRydWVcblxuICBATmFtZTogJ2xvY2FsU3RvcmFnZSdcbiAgQEF2YWlsYWJsZTogLT5cbiAgICByZXN1bHQgPSB0cnlcbiAgICAgIHRlc3QgPSAnTG9jYWxTdG9yYWdlUHJvdmlkZXI6OmF1dGgnXG4gICAgICB3aW5kb3cubG9jYWxTdG9yYWdlLnNldEl0ZW0odGVzdCwgdGVzdClcbiAgICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSh0ZXN0KVxuICAgICAgdHJ1ZVxuICAgIGNhdGNoXG4gICAgICBmYWxzZVxuXG4gIGF1dGhvcml6ZWQ6IChjYWxsYmFjaykgLT5cbiAgICBjYWxsYmFjayB0cnVlXG5cbiAgc2F2ZTogKGNvbnRlbnQsIG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cbiAgICB0cnlcbiAgICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2Uuc2V0SXRlbSBAX2dldEtleShtZXRhZGF0YS5uYW1lKSwgY29udGVudFxuICAgICAgY2FsbGJhY2sgbnVsbFxuICAgIGNhdGNoXG4gICAgICBjYWxsYmFjayAnVW5hYmxlIHRvIHNhdmUnXG5cbiAgbG9hZDogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cbiAgICB0cnlcbiAgICAgIGNvbnRlbnQgPSB3aW5kb3cubG9jYWxTdG9yYWdlLmdldEl0ZW0gQF9nZXRLZXkgbWV0YWRhdGEubmFtZVxuICAgICAgY2FsbGJhY2sgbnVsbCwgY29udGVudFxuICAgIGNhdGNoXG4gICAgICBjYWxsYmFjayAnVW5hYmxlIHRvIGxvYWQnXG5cbiAgbGlzdDogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cbiAgICBsaXN0ID0gW11cbiAgICBwYXRoID0gbWV0YWRhdGE/LnBhdGggb3IgJydcbiAgICBwcmVmaXggPSBAX2dldEtleSBwYXRoXG4gICAgZm9yIG93biBrZXkgb2Ygd2luZG93LmxvY2FsU3RvcmFnZVxuICAgICAgaWYga2V5LnN1YnN0cigwLCBwcmVmaXgubGVuZ3RoKSBpcyBwcmVmaXhcbiAgICAgICAgW25hbWUsIHJlbWFpbmRlci4uLl0gPSBrZXkuc3Vic3RyKHByZWZpeC5sZW5ndGgpLnNwbGl0KCcvJylcbiAgICAgICAgbGlzdC5wdXNoIG5ldyBDbG91ZE1ldGFkYXRhXG4gICAgICAgICAgbmFtZToga2V5LnN1YnN0cihwcmVmaXgubGVuZ3RoKVxuICAgICAgICAgIHBhdGg6IFwiI3twYXRofS8je25hbWV9XCJcbiAgICAgICAgICB0eXBlOiBpZiByZW1haW5kZXIubGVuZ3RoID4gMCB0aGVuIENsb3VkTWV0YWRhdGEuRm9sZGVyIGVsc2UgQ2xvdWRNZXRhZGF0YS5GaWxlXG4gICAgICAgICAgcHJvdmlkZXI6IEBcbiAgICBjYWxsYmFjayBudWxsLCBsaXN0XG5cbiAgX2dldEtleTogKG5hbWUgPSAnJykgLT5cbiAgICBcImNmbTo6I3tuYW1lfVwiXG5cbm1vZHVsZS5leHBvcnRzID0gTG9jYWxTdG9yYWdlUHJvdmlkZXJcbiIsIntkaXZ9ID0gUmVhY3QuRE9NXG5cbmNsYXNzIENsb3VkRmlsZVxuICBjb250cnVjdG9yOiAob3B0aW9ucykgLT5cbiAgICB7QGNvbnRlbnQsIEBtZXRhZGF0YX0gPSBvcHRpb25zXG5cbmNsYXNzIENsb3VkTWV0YWRhdGFcbiAgY29uc3RydWN0b3I6IChvcHRpb25zKSAtPlxuICAgIHtAbmFtZSwgQHBhdGgsIEB0eXBlLCBAcHJvdmlkZXIsIEBwYXJlbnR9ID0gb3B0aW9uc1xuICBARm9sZGVyOiAnZm9sZGVyJ1xuICBARmlsZTogJ2ZpbGUnXG5cbkF1dGhvcml6YXRpb25Ob3RJbXBsZW1lbnRlZERpYWxvZyA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgUmVhY3QuY3JlYXRlQ2xhc3NcbiAgZGlzcGxheU5hbWU6ICdBdXRob3JpemF0aW9uTm90SW1wbGVtZW50ZWREaWFsb2cnXG4gIHJlbmRlcjogLT5cbiAgICAoZGl2IHt9LCBcIkF1dGhvcml6YXRpb24gZGlhbG9nIG5vdCB5ZXQgaW1wbGVtZW50ZWQgZm9yICN7QHByb3BzLnByb3ZpZGVyLmRpc3BsYXlOYW1lfVwiKVxuXG5jbGFzcyBQcm92aWRlckludGVyZmFjZVxuXG4gIGNvbnN0cnVjdG9yOiAob3B0aW9ucykgLT5cbiAgICB7QG5hbWUsIEBkaXNwbGF5TmFtZSwgQGNhcGFiaWxpdGllc30gPSBvcHRpb25zXG4gICAgQHVzZXIgPSBudWxsXG5cbiAgQEF2YWlsYWJsZTogLT4gdHJ1ZVxuXG4gIGF1dGhvcml6ZWQ6IChjYWxsYmFjaykgLT5cbiAgICBjYWxsYmFjayBmYWxzZVxuXG4gIGF1dGhvcml6YXRpb25EaWFsb2c6IEF1dGhvcml6YXRpb25Ob3RJbXBsZW1lbnRlZERpYWxvZ1xuXG4gIGRpYWxvZzogKGNhbGxiYWNrKSAtPlxuICAgIEBfbm90SW1wbGVtZW50ZWQgJ2RpYWxvZydcblxuICBzYXZlOiAoY29udGVudCwgbWV0YWRhdGEsIGNhbGxiYWNrKSAtPlxuICAgIEBfbm90SW1wbGVtZW50ZWQgJ3NhdmUnXG5cbiAgbG9hZDogKGNhbGxiYWNrKSAtPlxuICAgIEBfbm90SW1wbGVtZW50ZWQgJ2xvYWQnXG5cbiAgbGlzdDogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cbiAgICBAX25vdEltcGxlbWVudGVkICdsaXN0J1xuXG4gIF9ub3RJbXBsZW1lbnRlZDogKG1ldGhvZE5hbWUpIC0+XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiI3ttZXRob2ROYW1lfSBub3QgaW1wbGVtZW50ZWQgZm9yICN7QG5hbWV9IHByb3ZpZGVyXCIpXG5cbm1vZHVsZS5leHBvcnRzID1cbiAgQ2xvdWRGaWxlOiBDbG91ZEZpbGVcbiAgQ2xvdWRNZXRhZGF0YTogQ2xvdWRNZXRhZGF0YVxuICBQcm92aWRlckludGVyZmFjZTogUHJvdmlkZXJJbnRlcmZhY2VcbiIsInRyID0gcmVxdWlyZSAnLi4vdXRpbHMvdHJhbnNsYXRlJ1xuaXNTdHJpbmcgPSByZXF1aXJlICcuLi91dGlscy9pcy1zdHJpbmcnXG5cblByb3ZpZGVySW50ZXJmYWNlID0gKHJlcXVpcmUgJy4vcHJvdmlkZXItaW50ZXJmYWNlJykuUHJvdmlkZXJJbnRlcmZhY2VcbkNsb3VkTWV0YWRhdGEgPSAocmVxdWlyZSAnLi9wcm92aWRlci1pbnRlcmZhY2UnKS5DbG91ZE1ldGFkYXRhXG5cbmNsYXNzIFJlYWRPbmx5UHJvdmlkZXIgZXh0ZW5kcyBQcm92aWRlckludGVyZmFjZVxuXG4gIGNvbnN0cnVjdG9yOiAoQG9wdGlvbnMgPSB7fSkgLT5cbiAgICBzdXBlclxuICAgICAgbmFtZTogUmVhZE9ubHlQcm92aWRlci5OYW1lXG4gICAgICBkaXNwbGF5TmFtZTogQG9wdGlvbnMuZGlzcGxheU5hbWUgb3IgKHRyICd+UFJPVklERVIuUkVBRF9PTkxZJylcbiAgICAgIGNhcGFiaWxpdGllczpcbiAgICAgICAgc2F2ZTogZmFsc2VcbiAgICAgICAgbG9hZDogdHJ1ZVxuICAgICAgICBsaXN0OiB0cnVlXG4gICAgQHRyZWUgPSBudWxsXG5cbiAgQE5hbWU6ICdyZWFkT25seSdcblxuICBhdXRob3JpemVkOiAoY2FsbGJhY2spIC0+XG4gICAgY2FsbGJhY2sgdHJ1ZVxuXG4gIGxvYWQ6IChtZXRhZGF0YSwgY2FsbGJhY2spIC0+XG4gICAgQF9sb2FkVHJlZSAoZXJyLCB0cmVlKSA9PlxuICAgICAgcmV0dXJuIGNhbGxiYWNrIGVyciBpZiBlcnJcbiAgICAgIHBhcmVudCA9IEBfZmluZFBhcmVudCBtZXRhZGF0YVxuICAgICAgaWYgcGFyZW50XG4gICAgICAgIGlmIHBhcmVudFttZXRhZGF0YS5uYW1lXVxuICAgICAgICAgIGlmIHBhcmVudFttZXRhZGF0YS5uYW1lXS5tZXRhZGF0YS50eXBlIGlzIENsb3VkTWV0YWRhdGEuRmlsZVxuICAgICAgICAgICAgY2FsbGJhY2sgbnVsbCwgcGFyZW50W21ldGFkYXRhLm5hbWVdLmNvbnRlbnRcbiAgICAgICAgICBlbHNlXG4gICAgICAgICAgICBjYWxsYmFjayBcIiN7bWV0YWRhdGEubmFtZX0gaXMgYSBmb2xkZXJcIlxuICAgICAgICBlbHNlXG4gICAgICAgICAgY2FsbGJhY2sgXCIje21ldGFkYXRhLm5hbWV9IG5vdCBmb3VuZCBpbiBmb2xkZXJcIlxuICAgICAgZWxzZVxuICAgICAgICBjYWxsYmFjayBcIiN7bWV0YWRhdGEubmFtZX0gZm9sZGVyIG5vdCBmb3VuZFwiXG5cbiAgbGlzdDogKG1ldGFkYXRhLCBjYWxsYmFjaykgLT5cbiAgICBAX2xvYWRUcmVlIChlcnIsIHRyZWUpID0+XG4gICAgICByZXR1cm4gY2FsbGJhY2sgZXJyIGlmIGVyclxuICAgICAgcGFyZW50ID0gQF9maW5kUGFyZW50IG1ldGFkYXRhXG4gICAgICBpZiBwYXJlbnRcbiAgICAgICAgbGlzdCA9IFtdXG4gICAgICAgIGxpc3QucHVzaCBmaWxlLm1ldGFkYXRhIGZvciBvd24gZmlsZW5hbWUsIGZpbGUgb2YgcGFyZW50XG4gICAgICAgIGNhbGxiYWNrIG51bGwsIGxpc3RcbiAgICAgIGVsc2UgaWYgbWV0YWRhdGFcbiAgICAgICAgY2FsbGJhY2sgXCIje21ldGFkYXRhLm5hbWV9IGZvbGRlciBub3QgZm91bmRcIlxuXG4gIF9sb2FkVHJlZTogKGNhbGxiYWNrKSAtPlxuICAgIGlmIEB0cmVlIGlzbnQgbnVsbFxuICAgICAgY2FsbGJhY2sgbnVsbCwgQHRyZWVcbiAgICBlbHNlIGlmIEBvcHRpb25zLmpzb25cbiAgICAgIEB0cmVlID0gQF9jb252ZXJ0SlNPTlRvTWV0YWRhdGFUcmVlIEBvcHRpb25zLmpzb25cbiAgICAgIGNhbGxiYWNrIG51bGwsIEB0cmVlXG4gICAgZWxzZSBpZiBAb3B0aW9ucy5qc29uQ2FsbGJhY2tcbiAgICAgIEBvcHRpb25zLmpzb25DYWxsYmFjayAoZXJyLCBqc29uKSA9PlxuICAgICAgICBpZiBlcnJcbiAgICAgICAgICBjYWxsYmFjayBlcnJcbiAgICAgICAgZWxzZVxuICAgICAgICAgIEB0cmVlID0gQF9jb252ZXJ0SlNPTlRvTWV0YWRhdGFUcmVlIEBvcHRpb25zLmpzb25cbiAgICAgICAgICBjYWxsYmFjayBudWxsLCBAdHJlZVxuICAgIGVsc2UgaWYgQG9wdGlvbnMuc3JjXG4gICAgICAkLmFqYXhcbiAgICAgICAgZGF0YVR5cGU6ICdqc29uJ1xuICAgICAgICB1cmw6IEBvcHRpb25zLnNyY1xuICAgICAgICBzdWNjZXNzOiAoZGF0YSkgPT5cbiAgICAgICAgICBAdHJlZSA9IEBfY29udmVydEpTT05Ub01ldGFkYXRhVHJlZSBkYXRhXG4gICAgICAgICAgY2FsbGJhY2sgbnVsbCwgQHRyZWVcbiAgICAgICAgZXJyb3I6IC0+IGNhbGxiYWNrIFwiVW5hYmxlIHRvIGxvYWQganNvbiBmb3IgI3tAZGlzcGxheU5hbWV9IHByb3ZpZGVyXCJcbiAgICBlbHNlXG4gICAgICBjb25zb2xlLmVycm9yPyBcIk5vIGpzb24gb3Igc3JjIG9wdGlvbiBmb3VuZCBmb3IgI3tAZGlzcGxheU5hbWV9IHByb3ZpZGVyXCJcbiAgICAgIGNhbGxiYWNrIG51bGwsIHt9XG5cbiAgX2NvbnZlcnRKU09OVG9NZXRhZGF0YVRyZWU6IChqc29uLCBwYXRoUHJlZml4ID0gJy8nKSAtPlxuICAgIHRyZWUgPSB7fVxuICAgIGZvciBvd24gZmlsZW5hbWUgb2YganNvblxuICAgICAgdHlwZSA9IGlmIGlzU3RyaW5nIGpzb25bZmlsZW5hbWVdIHRoZW4gQ2xvdWRNZXRhZGF0YS5GaWxlIGVsc2UgQ2xvdWRNZXRhZGF0YS5Gb2xkZXJcbiAgICAgIG1ldGFkYXRhID0gbmV3IENsb3VkTWV0YWRhdGFcbiAgICAgICAgbmFtZTogZmlsZW5hbWVcbiAgICAgICAgcGF0aDogcGF0aFByZWZpeCArIGZpbGVuYW1lXG4gICAgICAgIHR5cGU6IHR5cGVcbiAgICAgICAgcHJvdmlkZXI6IEBcbiAgICAgICAgY2hpbGRyZW46IG51bGxcbiAgICAgIGlmIHR5cGUgaXMgQ2xvdWRNZXRhZGF0YS5Gb2xkZXJcbiAgICAgICAgbWV0YWRhdGEuY2hpbGRyZW4gPSBfY29udmVydEpTT05Ub01ldGFkYXRhVHJlZSBqc29uW2ZpbGVuYW1lXSwgcGF0aFByZWZpeCArIGZpbGVuYW1lICsgJy8nXG4gICAgICB0cmVlW2ZpbGVuYW1lXSA9XG4gICAgICAgIGNvbnRlbnQ6IGpzb25bZmlsZW5hbWVdXG4gICAgICAgIG1ldGFkYXRhOiBtZXRhZGF0YVxuICAgIHRyZWVcblxuICBfZmluZFBhcmVudDogKG1ldGFkYXRhKSAtPlxuICAgIGlmIG5vdCBtZXRhZGF0YVxuICAgICAgQHRyZWVcbiAgICBlbHNlXG4gICAgICBAdHJlZVxuXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWRPbmx5UHJvdmlkZXJcbiIsIm1vZHVsZS5leHBvcnRzID0gKHBhcmFtKSAtPiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwocGFyYW0pIGlzICdbb2JqZWN0IFN0cmluZ10nXG4iLCJtb2R1bGUuZXhwb3J0cyA9XG4gIFwifk1FTlVCQVIuVU5USVRMRV9ET0NVTUVOVFwiOiBcIlVudGl0bGVkIERvY3VtZW50XCJcblxuICBcIn5NRU5VLk5FV1wiOiBcIk5ld1wiXG4gIFwifk1FTlUuT1BFTlwiOiBcIk9wZW4gLi4uXCJcbiAgXCJ+TUVOVS5TQVZFXCI6IFwiU2F2ZVwiXG4gIFwifk1FTlUuU0FWRV9BU1wiOiBcIlNhdmUgQXMgLi4uXCJcblxuICBcIn5ESUFMT0cuU0FWRVwiOiBcIlNhdmVcIlxuICBcIn5ESUFMT0cuU0FWRV9BU1wiOiBcIlNhdmUgQXMgLi4uXCJcbiAgXCJ+RElBTE9HLk9QRU5cIjogXCJPcGVuXCJcbiAgXCJ+RElBTE9HLlNFTEVDVF9QUk9WSURFUlwiOiBcIlNlbGVjdCBQcm92aWRlclwiXG5cbiAgXCJ+UFJPVklERVIuTE9DQUxfU1RPUkFHRVwiOiBcIkxvY2FsIFN0b3JhZ2VcIlxuICBcIn5QUk9WSURFUi5SRUFEX09OTFlcIjogXCJSZWFkIE9ubHlcIlxuICBcIn5QUk9WSURFUi5HT09HTEVfRFJJVkVcIjogXCJHb29nbGUgRHJpdmVcIlxuICBcIn5QUk9WSURFUi5ET0NVTUVOVF9TVE9SRVwiOiBcIkRvY3VtZW50IFN0b3JlXCJcblxuICBcIn5GSUxFX0RJQUxPRy5GSUxFTkFNRVwiOiBcIkZpbGVuYW1lXCJcbiAgXCJ+RklMRV9ESUFMT0cuT1BFTlwiOiBcIk9wZW5cIlxuICBcIn5GSUxFX0RJQUxPRy5TQVZFXCI6IFwiU2F2ZVwiXG4gIFwifkZJTEVfRElBTE9HLkNBTkNFTFwiOiBcIkNhbmNlbFwiXG4gIFwifkZJTEVfRElBTE9HLkxPQURJTkdcIjogXCJMb2FkaW5nLi4uXCJcbiIsInRyYW5zbGF0aW9ucyA9ICB7fVxudHJhbnNsYXRpb25zWydlbiddID0gcmVxdWlyZSAnLi9sYW5nL2VuLXVzJ1xuZGVmYXVsdExhbmcgPSAnZW4nXG52YXJSZWdFeHAgPSAvJVxce1xccyooW159XFxzXSopXFxzKlxcfS9nXG5cbnRyYW5zbGF0ZSA9IChrZXksIHZhcnM9e30sIGxhbmc9ZGVmYXVsdExhbmcpIC0+XG4gIHRyYW5zbGF0aW9uID0gdHJhbnNsYXRpb25zW2xhbmddP1trZXldIG9yIGtleVxuICB0cmFuc2xhdGlvbi5yZXBsYWNlIHZhclJlZ0V4cCwgKG1hdGNoLCBrZXkpIC0+XG4gICAgaWYgdmFycy5oYXNPd25Qcm9wZXJ0eSBrZXkgdGhlbiB2YXJzW2tleV0gZWxzZSBcIicqKiBVS05PV04gS0VZOiAje2tleX0gKipcIlxuXG5tb2R1bGUuZXhwb3J0cyA9IHRyYW5zbGF0ZVxuIiwiTWVudUJhciA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9tZW51LWJhci12aWV3J1xuUHJvdmlkZXJUYWJiZWREaWFsb2cgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vcHJvdmlkZXItdGFiYmVkLWRpYWxvZy12aWV3J1xuXG50ciA9IHJlcXVpcmUgJy4uL3V0aWxzL3RyYW5zbGF0ZSdcblxue2RpdiwgaWZyYW1lfSA9IFJlYWN0LkRPTVxuXG5Jbm5lckFwcCA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgUmVhY3QuY3JlYXRlQ2xhc3NcblxuICBkaXNwbGF5TmFtZTogJ0Nsb3VkRmlsZU1hbmFnZXJJbm5lckFwcCdcblxuICBzaG91bGRDb21wb25lbnRVcGRhdGU6IChuZXh0UHJvcHMpIC0+XG4gICAgbmV4dFByb3BzLmFwcCBpc250IEBwcm9wcy5hcHBcblxuICByZW5kZXI6IC0+XG4gICAgKGRpdiB7Y2xhc3NOYW1lOiAnaW5uZXJBcHAnfSxcbiAgICAgIChpZnJhbWUge3NyYzogQHByb3BzLmFwcH0pXG4gICAgKVxuXG5BcHAgPSBSZWFjdC5jcmVhdGVDbGFzc1xuXG4gIGRpc3BsYXlOYW1lOiAnQ2xvdWRGaWxlTWFuYWdlcidcblxuICBnZXRGaWxlbmFtZTogLT5cbiAgICBpZiBAcHJvcHMuY2xpZW50LnN0YXRlLm1ldGFkYXRhPy5oYXNPd25Qcm9wZXJ0eSgnbmFtZScpIHRoZW4gQHByb3BzLmNsaWVudC5zdGF0ZS5tZXRhZGF0YS5uYW1lIGVsc2UgKHRyIFwifk1FTlVCQVIuVU5USVRMRV9ET0NVTUVOVFwiKVxuXG4gIGdldEluaXRpYWxTdGF0ZTogLT5cbiAgICBmaWxlbmFtZTogQGdldEZpbGVuYW1lKClcbiAgICBtZW51SXRlbXM6IEBwcm9wcy5jbGllbnQuX3VpLm1lbnU/Lml0ZW1zIG9yIFtdXG4gICAgcHJvdmlkZXJEaWFsb2c6IG51bGxcblxuICBjb21wb25lbnRXaWxsTW91bnQ6IC0+XG4gICAgQHByb3BzLmNsaWVudC5saXN0ZW4gKGV2ZW50KSA9PlxuICAgICAgQHNldFN0YXRlIGZpbGVuYW1lOiBAZ2V0RmlsZW5hbWUoKVxuXG4gICAgICBzd2l0Y2ggZXZlbnQudHlwZVxuICAgICAgICB3aGVuICdjb25uZWN0ZWQnXG4gICAgICAgICAgQHNldFN0YXRlIG1lbnVJdGVtczogQHByb3BzLmNsaWVudC5fdWkubWVudT8uaXRlbXMgb3IgW11cblxuICAgIEBwcm9wcy5jbGllbnQuX3VpLmxpc3RlbiAoZXZlbnQpID0+XG4gICAgICBpZiBldmVudC50eXBlIGlzICdzaG93UHJvdmlkZXJEaWFsb2cnXG4gICAgICAgIEBzZXRTdGF0ZSBwcm92aWRlckRpYWxvZzogZXZlbnQuZGF0YVxuXG4gIGNsb3NlUHJvdmlkZXJEaWFsb2c6IC0+XG4gICAgQHNldFN0YXRlIHByb3ZpZGVyRGlhbG9nOiBudWxsXG5cbiAgcmVuZGVyOiAtPlxuICAgIGNvbnNvbGUubG9nKFwiKioqKlwiKVxuICAgIGNvbnNvbGUubG9nKEBzdGF0ZS5tZW51SXRlbXMpXG4gICAgKGRpdiB7Y2xhc3NOYW1lOiAnYXBwJ30sXG4gICAgICAoTWVudUJhciB7ZmlsZW5hbWU6IEBzdGF0ZS5maWxlbmFtZSwgaXRlbXM6IEBzdGF0ZS5tZW51SXRlbXN9KVxuICAgICAgKElubmVyQXBwIChhcHA6IEBwcm9wcy5hcHApKVxuICAgICAgaWYgQHN0YXRlLnByb3ZpZGVyRGlhbG9nXG4gICAgICAgIChQcm92aWRlclRhYmJlZERpYWxvZyB7Y2xpZW50OiBAcHJvcHMuY2xpZW50LCBkaWFsb2c6IEBzdGF0ZS5wcm92aWRlckRpYWxvZywgY2xvc2U6IEBjbG9zZVByb3ZpZGVyRGlhbG9nfSlcbiAgICApXG5cbm1vZHVsZS5leHBvcnRzID0gQXBwXG4iLCJBdXRob3JpemVNaXhpbiA9XG4gIHJlbmRlcjogLT5cbiAgICBAcHJvcHMucHJvdmlkZXIuYXV0aG9yaXplZCAoYXV0aG9yaXplZCkgPT5cbiAgICAgIGlmIGF1dGhvcml6ZWRcbiAgICAgICAgQHJlbmRlcldoZW5BdXRob3JpemVkKClcbiAgICAgIGVsc2VcbiAgICAgICAgKEBwcm9wcy5wcm92aWRlci5hdXRob3JpemF0aW9uRGlhbG9nIHtwcm92aWRlcjogQHByb3BzLnByb3ZpZGVyfSlcblxubW9kdWxlLmV4cG9ydHMgPSBBdXRob3JpemVNaXhpblxuIiwie2RpdiwgaSwgc3BhbiwgdWwsIGxpfSA9IFJlYWN0LkRPTVxuXG5Ecm9wZG93bkl0ZW0gPSBSZWFjdC5jcmVhdGVGYWN0b3J5IFJlYWN0LmNyZWF0ZUNsYXNzXG5cbiAgZGlzcGxheU5hbWU6ICdEcm9wZG93bkl0ZW0nXG5cbiAgY2xpY2tlZDogLT5cbiAgICBAcHJvcHMuc2VsZWN0IEBwcm9wcy5pdGVtXG5cbiAgcmVuZGVyOiAtPlxuICAgIGNsYXNzTmFtZSA9IFwibWVudUl0ZW0gI3tpZiBAcHJvcHMuaXNBY3Rpb25NZW51IGFuZCBub3QgQHByb3BzLml0ZW0uYWN0aW9uIHRoZW4gJ2Rpc2FibGVkJyBlbHNlICcnfVwiXG4gICAgbmFtZSA9IEBwcm9wcy5pdGVtLm5hbWUgb3IgQHByb3BzLml0ZW1cbiAgICAobGkge2NsYXNzTmFtZTogY2xhc3NOYW1lLCBvbkNsaWNrOiBAY2xpY2tlZCB9LCBuYW1lKVxuXG5Ecm9wRG93biA9IFJlYWN0LmNyZWF0ZUNsYXNzXG5cbiAgZGlzcGxheU5hbWU6ICdEcm9wZG93bidcblxuICBnZXREZWZhdWx0UHJvcHM6IC0+XG4gICAgaXNBY3Rpb25NZW51OiB0cnVlICAgICAgICAgICAgICAjIFdoZXRoZXIgZWFjaCBpdGVtIGNvbnRhaW5zIGl0cyBvd24gYWN0aW9uXG4gICAgb25TZWxlY3Q6IChpdGVtKSAtPiAgICAgICAgICAgICAjIElmIG5vdCwgQHByb3BzLm9uU2VsZWN0IGlzIGNhbGxlZFxuICAgICAgbG9nLmluZm8gXCJTZWxlY3RlZCAje2l0ZW19XCJcblxuICBnZXRJbml0aWFsU3RhdGU6IC0+XG4gICAgc2hvd2luZ01lbnU6IGZhbHNlXG4gICAgdGltZW91dDogbnVsbFxuXG4gIGJsdXI6IC0+XG4gICAgQHVuYmx1cigpXG4gICAgdGltZW91dCA9IHNldFRpbWVvdXQgKCA9PiBAc2V0U3RhdGUge3Nob3dpbmdNZW51OiBmYWxzZX0gKSwgNTAwXG4gICAgQHNldFN0YXRlIHt0aW1lb3V0OiB0aW1lb3V0fVxuXG4gIHVuYmx1cjogLT5cbiAgICBpZiBAc3RhdGUudGltZW91dFxuICAgICAgY2xlYXJUaW1lb3V0KEBzdGF0ZS50aW1lb3V0KVxuICAgIEBzZXRTdGF0ZSB7dGltZW91dDogbnVsbH1cblxuICBzZWxlY3Q6IChpdGVtKSAtPlxuICAgIG5leHRTdGF0ZSA9IChub3QgQHN0YXRlLnNob3dpbmdNZW51KVxuICAgIEBzZXRTdGF0ZSB7c2hvd2luZ01lbnU6IG5leHRTdGF0ZX1cbiAgICByZXR1cm4gdW5sZXNzIGl0ZW1cbiAgICBpZiBAcHJvcHMuaXNBY3Rpb25NZW51IGFuZCBpdGVtLmFjdGlvblxuICAgICAgaXRlbS5hY3Rpb24oKVxuICAgIGVsc2VcbiAgICAgIEBwcm9wcy5vblNlbGVjdCBpdGVtXG5cbiAgcmVuZGVyOiAtPlxuICAgIG1lbnVDbGFzcyA9IGlmIEBzdGF0ZS5zaG93aW5nTWVudSB0aGVuICdtZW51LXNob3dpbmcnIGVsc2UgJ21lbnUtaGlkZGVuJ1xuICAgIHNlbGVjdCA9IChpdGVtKSA9PlxuICAgICAgKCA9PiBAc2VsZWN0KGl0ZW0pKVxuICAgIChkaXYge2NsYXNzTmFtZTogJ21lbnUnfSxcbiAgICAgIChzcGFuIHtjbGFzc05hbWU6ICdtZW51LWFuY2hvcicsIG9uQ2xpY2s6ID0+IEBzZWxlY3QobnVsbCl9LFxuICAgICAgICBAcHJvcHMuYW5jaG9yXG4gICAgICAgIChpIHtjbGFzc05hbWU6ICdpY29uLWNvZGFwLWFycm93LWV4cGFuZCd9KVxuICAgICAgKVxuICAgICAgaWYgQHByb3BzLml0ZW1zPy5sZW5ndGggPiAwXG4gICAgICAgIChkaXYge2NsYXNzTmFtZTogbWVudUNsYXNzLCBvbk1vdXNlTGVhdmU6IEBibHVyLCBvbk1vdXNlRW50ZXI6IEB1bmJsdXJ9LFxuICAgICAgICAgICh1bCB7fSxcbiAgICAgICAgICAgIChEcm9wZG93bkl0ZW0ge2tleTogaXRlbS5uYW1lIG9yIGl0ZW0sIGl0ZW06IGl0ZW0sIHNlbGVjdDogQHNlbGVjdCwgaXNBY3Rpb25NZW51OiBAcHJvcHMuaXNBY3Rpb25NZW51fSkgZm9yIGl0ZW0gaW4gQHByb3BzLml0ZW1zXG4gICAgICAgICAgKVxuICAgICAgICApXG4gICAgKVxuXG5tb2R1bGUuZXhwb3J0cyA9IERyb3BEb3duXG4iLCJBdXRob3JpemVNaXhpbiA9IHJlcXVpcmUgJy4vYXV0aG9yaXplLW1peGluJ1xuQ2xvdWRNZXRhZGF0YSA9IChyZXF1aXJlICcuLi9wcm92aWRlcnMvcHJvdmlkZXItaW50ZXJmYWNlJykuQ2xvdWRNZXRhZGF0YVxuXG50ciA9IHJlcXVpcmUgJy4uL3V0aWxzL3RyYW5zbGF0ZSdcblxue2RpdiwgaW1nLCBpLCBzcGFuLCBpbnB1dCwgYnV0dG9ufSA9IFJlYWN0LkRPTVxuXG5GaWxlTGlzdEZpbGUgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IFJlYWN0LmNyZWF0ZUNsYXNzXG4gIGRpc3BsYXlOYW1lOiAnRmlsZUxpc3RGaWxlJ1xuXG4gIGZpbGVTZWxlY3RlZDogLT5cbiAgICBAcHJvcHMuZmlsZVNlbGVjdGVkIEBwcm9wcy5tZXRhZGF0YVxuXG4gIHJlbmRlcjogLT5cbiAgICAoZGl2IHt0aXRsZTogQHByb3BzLm1ldGFkYXRhLnBhdGgsIG9uQ2xpY2s6IEBmaWxlU2VsZWN0ZWR9LCBAcHJvcHMubWV0YWRhdGEubmFtZSlcblxuRmlsZUxpc3QgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IFJlYWN0LmNyZWF0ZUNsYXNzXG4gIGRpc3BsYXlOYW1lOiAnRmlsZUxpc3QnXG5cbiAgZ2V0SW5pdGlhbFN0YXRlOiAtPlxuICAgIGxvYWRpbmc6IHRydWVcbiAgICBsaXN0OiBbXVxuXG4gIGNvbXBvbmVudERpZE1vdW50OiAtPlxuICAgIEBsb2FkKClcblxuICBsb2FkOiAtPlxuICAgIEBwcm9wcy5wcm92aWRlci5saXN0IEBwcm9wcy5mb2xkZXIsIChlcnIsIGxpc3QpID0+XG4gICAgICByZXR1cm4gYWxlcnQoZXJyKSBpZiBlcnJcbiAgICAgIEBzZXRTdGF0ZVxuICAgICAgICBsb2FkaW5nOiBmYWxzZVxuICAgICAgICBsaXN0OiBsaXN0XG4gICAgICBAcHJvcHMubGlzdExvYWRlZCBsaXN0XG5cbiAgcmVuZGVyOiAtPlxuICAgIChkaXYge2NsYXNzTmFtZTogJ2ZpbGVsaXN0J30sXG4gICAgICBpZiBAc3RhdGUubG9hZGluZ1xuICAgICAgICB0ciBcIn5GSUxFX0RJQUxPRy5MT0FESU5HXCJcbiAgICAgIGVsc2VcbiAgICAgICAgZm9yIG1ldGFkYXRhIGluIEBzdGF0ZS5saXN0XG4gICAgICAgICAgKEZpbGVMaXN0RmlsZSB7bWV0YWRhdGE6IG1ldGFkYXRhLCBmaWxlU2VsZWN0ZWQ6IEBwcm9wcy5maWxlU2VsZWN0ZWR9KVxuICAgIClcblxuRmlsZURpYWxvZ1RhYiA9IFJlYWN0LmNyZWF0ZUNsYXNzXG4gIGRpc3BsYXlOYW1lOiAnRmlsZURpYWxvZ1RhYidcblxuICBtaXhpbnM6IFtBdXRob3JpemVNaXhpbl1cblxuICBnZXRJbml0aWFsU3RhdGU6IC0+XG4gICAgZm9sZGVyOiBAcHJvcHMuY2xpZW50LnN0YXRlLm1ldGFkYXRhPy5wYXJlbnQgb3IgbnVsbFxuICAgIG1ldGFkYXRhOiBAcHJvcHMuY2xpZW50LnN0YXRlLm1ldGFkYXRhXG4gICAgZmlsZW5hbWU6IEBwcm9wcy5jbGllbnQuc3RhdGUubWV0YWRhdGE/Lm5hbWUgb3IgJydcblxuICBjb21wb25lbnRXaWxsTW91bnQ6IC0+XG4gICAgQGlzT3BlbiA9IEBwcm9wcy5kaWFsb2cuYWN0aW9uIGlzICdvcGVuRmlsZSdcbiAgICBAbGlzdCA9IFtdXG5cbiAgZmlsZW5hbWVDaGFuZ2VkOiAoZSkgLT5cbiAgICBmaWxlbmFtZSA9IGUudGFyZ2V0LnZhbHVlXG4gICAgbWV0YWRhdGEgPSBudWxsXG4gICAgQHNldFN0YXRlXG4gICAgICBmaWxlbmFtZTogZmlsZW5hbWVcbiAgICAgIG1ldGFkYXRhOiBtZXRhZGF0YVxuXG4gIGxpc3RMb2FkZWQ6IChsaXN0KSAtPlxuICAgIEBsaXN0ID0gbGlzdFxuXG4gIGZpbGVTZWxlY3RlZDogKG1ldGFkYXRhKSAtPlxuICAgIGlmIG1ldGFkYXRhPy50eXBlIGlzIENsb3VkTWV0YWRhdGEuRmlsZVxuICAgICAgQHNldFN0YXRlIGZpbGVuYW1lOiBtZXRhZGF0YS5uYW1lXG4gICAgQHNldFN0YXRlIG1ldGFkYXRhOiBtZXRhZGF0YVxuXG4gIGNvbmZpcm06IC0+XG4gICAgIyBpZiBmaWxlbmFtZSBjaGFuZ2VkIGZpbmQgdGhlIGZpbGUgaW4gdGhlIGxpc3RcbiAgICBmaWxlbmFtZSA9ICQudHJpbSBAc3RhdGUuZmlsZW5hbWVcbiAgICBpZiBub3QgQHN0YXRlLm1ldGFkYXRhXG4gICAgICBmb3IgbWV0YWRhdGEgaW4gQGxpc3RcbiAgICAgICAgaWYgbWV0YWRhdGEubmFtZSBpcyBmaWxlbmFtZVxuICAgICAgICAgIEBzdGF0ZS5tZXRhZGF0YSA9IG1ldGFkYXRhXG4gICAgICAgICAgYnJlYWtcbiAgICAgIGlmIG5vdCBAc3RhdGUubWV0YWRhdGFcbiAgICAgICAgaWYgQGlzT3BlblxuICAgICAgICAgIGFsZXJ0IFwiI3tAc3RhdGUuZmlsZW5hbWV9IG5vdCBmb3VuZFwiXG4gICAgICAgIGVsc2VcbiAgICAgICAgICBAc3RhdGUubWV0YWRhdGEgPSBuZXcgQ2xvdWRNZXRhZGF0YVxuICAgICAgICAgICAgbmFtZTogZmlsZW5hbWVcbiAgICAgICAgICAgIHBhdGg6IFwiLyN7ZmlsZW5hbWV9XCIgIyBUT0RPOiBGaXggcGF0aFxuICAgICAgICAgICAgdHlwZTogQ2xvdWRNZXRhZGF0YS5GaWxlXG4gICAgICAgICAgICBwcm92aWRlcjogQHByb3BzLnByb3ZpZGVyXG4gICAgaWYgQHN0YXRlLm1ldGFkYXRhXG4gICAgICBAcHJvcHMuZGlhbG9nLmNhbGxiYWNrIEBzdGF0ZS5tZXRhZGF0YVxuICAgICAgQHByb3BzLmNsb3NlKClcblxuICBjYW5jZWw6IC0+XG4gICAgQHByb3BzLmNsb3NlKClcblxuICByZW5kZXJXaGVuQXV0aG9yaXplZDogLT5cbiAgICAoZGl2IHtjbGFzc05hbWU6ICdkaWFsb2dUYWInfSxcbiAgICAgIChpbnB1dCB7dHlwZTogJ3RleHQnLCB2YWx1ZTogQHN0YXRlLmZpbGVuYW1lLCBwbGFjZWhvbGRlcjogKHRyIFwifkZJTEVfRElBTE9HLkZJTEVOQU1FXCIpLCBvbkNoYW5nZTogQGZpbGVuYW1lQ2hhbmdlZH0pXG4gICAgICAoRmlsZUxpc3Qge3Byb3ZpZGVyOiBAcHJvcHMucHJvdmlkZXIsIGZvbGRlcjogQHN0YXRlLmZvbGRlciwgZmlsZVNlbGVjdGVkOiBAZmlsZVNlbGVjdGVkLCBsaXN0TG9hZGVkOiBAbGlzdExvYWRlZH0pXG4gICAgICAoZGl2IHtjbGFzc05hbWU6ICdidXR0b25zJ30sXG4gICAgICAgIChidXR0b24ge29uQ2xpY2s6IEBjb25maXJtLCBkaXNhYmxlZDogQHN0YXRlLmZpbGVuYW1lLmxlbmd0aCBpcyAwfSwgaWYgQGlzT3BlbiB0aGVuICh0ciBcIn5GSUxFX0RJQUxPRy5PUEVOXCIpIGVsc2UgKHRyIFwifkZJTEVfRElBTE9HLlNBVkVcIikpXG4gICAgICAgIChidXR0b24ge29uQ2xpY2s6IEBjYW5jZWx9LCAodHIgXCJ+RklMRV9ESUFMT0cuQ0FOQ0VMXCIpKVxuICAgICAgKVxuICAgIClcblxubW9kdWxlLmV4cG9ydHMgPSBGaWxlRGlhbG9nVGFiXG4iLCJ7ZGl2LCBpLCBzcGFufSA9IFJlYWN0LkRPTVxuXG5Ecm9wZG93biA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9kcm9wZG93bi12aWV3J1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzXG5cbiAgZGlzcGxheU5hbWU6ICdNZW51QmFyJ1xuXG4gIHJlbmRlcjogLT5cbiAgICAoZGl2IHtjbGFzc05hbWU6ICdtZW51LWJhcid9LFxuICAgICAgKGRpdiB7fSxcbiAgICAgICAgKERyb3Bkb3duIHtcbiAgICAgICAgICBhbmNob3I6IEBwcm9wcy5maWxlbmFtZVxuICAgICAgICAgIGl0ZW1zOiBAcHJvcHMuaXRlbXNcbiAgICAgICAgICBjbGFzc05hbWU6J21lbnUtYmFyLWNvbnRlbnQtZmlsZW5hbWUnfSlcbiAgICAgIClcbiAgICApXG4iLCJNb2RhbCA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9tb2RhbC12aWV3J1xue2RpdiwgaX0gPSBSZWFjdC5ET01cblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzc1xuXG4gIGRpc3BsYXlOYW1lOiAnTW9kYWxEaWFsb2cnXG5cbiAgY2xvc2U6IC0+XG4gICAgQHByb3BzLmNsb3NlPygpXG5cbiAgcmVuZGVyOiAtPlxuICAgIChNb2RhbCB7Y2xvc2U6IEBwcm9wcy5jbG9zZX0sXG4gICAgICAoZGl2IHtjbGFzc05hbWU6ICdtb2RhbC1kaWFsb2cnfSxcbiAgICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnbW9kYWwtZGlhbG9nLXdyYXBwZXInfSxcbiAgICAgICAgICAoZGl2IHtjbGFzc05hbWU6ICdtb2RhbC1kaWFsb2ctdGl0bGUnfSxcbiAgICAgICAgICAgIChpIHtjbGFzc05hbWU6IFwibW9kYWwtZGlhbG9nLXRpdGxlLWNsb3NlIGljb24tY29kYXAtZXhcIiwgb25DbGljazogQGNsb3NlfSlcbiAgICAgICAgICAgIEBwcm9wcy50aXRsZSBvciAnVW50aXRsZWQgRGlhbG9nJ1xuICAgICAgICAgIClcbiAgICAgICAgICAoZGl2IHtjbGFzc05hbWU6ICdtb2RhbC1kaWFsb2ctd29ya3NwYWNlJ30sIEBwcm9wcy5jaGlsZHJlbilcbiAgICAgICAgKVxuICAgICAgKVxuICAgIClcbiIsIk1vZGFsRGlhbG9nID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL21vZGFsLWRpYWxvZy12aWV3J1xuVGFiYmVkUGFuZWwgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vdGFiYmVkLXBhbmVsLXZpZXcnXG5cbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3NcblxuICBkaXNwbGF5TmFtZTogJ01vZGFsVGFiYmVkRGlhbG9nVmlldydcblxuICByZW5kZXI6IC0+XG4gICAgKE1vZGFsRGlhbG9nIHt0aXRsZTogQHByb3BzLnRpdGxlLCBjbG9zZTogQHByb3BzLmNsb3NlfSxcbiAgICAgIChUYWJiZWRQYW5lbCB7dGFiczogQHByb3BzLnRhYnN9KVxuICAgIClcbiIsIntkaXZ9ID0gUmVhY3QuRE9NXG5cbm1vZHVsZS5leHBvcnRzID0gUmVhY3QuY3JlYXRlQ2xhc3NcblxuICBkaXNwbGF5TmFtZTogJ01vZGFsJ1xuXG4gIHdhdGNoRm9yRXNjYXBlOiAoZSkgLT5cbiAgICBpZiBlLmtleUNvZGUgaXMgMjdcbiAgICAgIEBwcm9wcy5jbG9zZT8oKVxuXG4gIGNvbXBvbmVudERpZE1vdW50OiAtPlxuICAgICQod2luZG93KS5vbiAna2V5dXAnLCBAd2F0Y2hGb3JFc2NhcGVcblxuICBjb21wb25lbnRXaWxsVW5tb3VudDogLT5cbiAgICAkKHdpbmRvdykub2ZmICdrZXl1cCcsIEB3YXRjaEZvckVzY2FwZVxuXG4gIHJlbmRlcjogLT5cbiAgICAoZGl2IHtjbGFzc05hbWU6ICdtb2RhbCd9LFxuICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnbW9kYWwtYmFja2dyb3VuZCd9KVxuICAgICAgKGRpdiB7Y2xhc3NOYW1lOiAnbW9kYWwtY29udGVudCd9LCBAcHJvcHMuY2hpbGRyZW4pXG4gICAgKVxuIiwiTW9kYWxUYWJiZWREaWFsb2cgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IHJlcXVpcmUgJy4vbW9kYWwtdGFiYmVkLWRpYWxvZy12aWV3J1xuVGFiYmVkUGFuZWwgPSByZXF1aXJlICcuL3RhYmJlZC1wYW5lbC12aWV3J1xuQ2xvdWRNZXRhZGF0YSA9IChyZXF1aXJlICcuLi9wcm92aWRlcnMvcHJvdmlkZXItaW50ZXJmYWNlJykuQ2xvdWRNZXRhZGF0YVxuRmlsZURpYWxvZ1RhYiA9IFJlYWN0LmNyZWF0ZUZhY3RvcnkgcmVxdWlyZSAnLi9maWxlLWRpYWxvZy10YWItdmlldydcblNlbGVjdFByb3ZpZGVyRGlhbG9nVGFiID0gUmVhY3QuY3JlYXRlRmFjdG9yeSByZXF1aXJlICcuL3NlbGVjdC1wcm92aWRlci1kaWFsb2ctdGFiLXZpZXcnXG5cbnRyID0gcmVxdWlyZSAnLi4vdXRpbHMvdHJhbnNsYXRlJ1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJlYWN0LmNyZWF0ZUNsYXNzXG4gIGRpc3BsYXlOYW1lOiAnUHJvdmlkZXJUYWJiZWREaWFsb2cnXG5cbiAgcmVuZGVyOiAgLT5cbiAgICBbY2FwYWJpbGl0eSwgVGFiQ29tcG9uZW50XSA9IHN3aXRjaCBAcHJvcHMuZGlhbG9nLmFjdGlvblxuICAgICAgd2hlbiAnb3BlbkZpbGUnIHRoZW4gWydsaXN0JywgRmlsZURpYWxvZ1RhYl1cbiAgICAgIHdoZW4gJ3NhdmVGaWxlJywgJ3NhdmVGaWxlQXMnIHRoZW4gWydzYXZlJywgRmlsZURpYWxvZ1RhYl1cbiAgICAgIHdoZW4gJ3NlbGVjdFByb3ZpZGVyJyB0aGVuIFtudWxsLCBTZWxlY3RQcm92aWRlckRpYWxvZ1RhYl1cblxuICAgIHRhYnMgPSBbXVxuICAgIGZvciBwcm92aWRlciwgaSBpbiBAcHJvcHMuY2xpZW50LnN0YXRlLmF2YWlsYWJsZVByb3ZpZGVyc1xuICAgICAgaWYgbm90IGNhcGFiaWxpdHkgb3IgcHJvdmlkZXIuY2FwYWJpbGl0aWVzW2NhcGFiaWxpdHldXG4gICAgICAgIGNvbXBvbmVudCA9IFRhYkNvbXBvbmVudFxuICAgICAgICAgIGNsaWVudDogQHByb3BzLmNsaWVudFxuICAgICAgICAgIGRpYWxvZzogQHByb3BzLmRpYWxvZ1xuICAgICAgICAgIGNsb3NlOiBAcHJvcHMuY2xvc2VcbiAgICAgICAgICBwcm92aWRlcjogcHJvdmlkZXJcbiAgICAgICAgdGFicy5wdXNoIFRhYmJlZFBhbmVsLlRhYiB7a2V5OiBpLCBsYWJlbDogKHRyIHByb3ZpZGVyLmRpc3BsYXlOYW1lKSwgY29tcG9uZW50OiBjb21wb25lbnR9XG5cbiAgICAoTW9kYWxUYWJiZWREaWFsb2cge3RpdGxlOiAodHIgQHByb3BzLmRpYWxvZy50aXRsZSksIGNsb3NlOiBAcHJvcHMuY2xvc2UsIHRhYnM6IHRhYnN9KVxuIiwie2Rpdn0gPSBSZWFjdC5ET01cblxuU2VsZWN0UHJvdmlkZXJEaWFsb2dUYWIgPSBSZWFjdC5jcmVhdGVGYWN0b3J5IFJlYWN0LmNyZWF0ZUNsYXNzXG4gIGRpc3BsYXlOYW1lOiAnU2VsZWN0UHJvdmlkZXJEaWFsb2dUYWInXG4gIHJlbmRlcjogLT4gKGRpdiB7fSwgXCJUT0RPOiBTZWxlY3RQcm92aWRlckRpYWxvZ1RhYjogI3tAcHJvcHMucHJvdmlkZXIuZGlzcGxheU5hbWV9XCIpXG5cbm1vZHVsZS5leHBvcnRzID0gU2VsZWN0UHJvdmlkZXJEaWFsb2dUYWJcbiIsIntkaXYsIHVsLCBsaSwgYX0gPSBSZWFjdC5ET01cblxuY2xhc3MgVGFiSW5mb1xuICBjb25zdHJ1Y3RvcjogKHNldHRpbmdzPXt9KSAtPlxuICAgIHtAbGFiZWwsIEBjb21wb25lbnR9ID0gc2V0dGluZ3NcblxuVGFiID0gUmVhY3QuY3JlYXRlRmFjdG9yeSBSZWFjdC5jcmVhdGVDbGFzc1xuXG4gIGRpc3BsYXlOYW1lOiAnVGFiYmVkUGFuZWxUYWInXG5cbiAgY2xpY2tlZDogKGUpIC0+XG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgQHByb3BzLm9uU2VsZWN0ZWQgQHByb3BzLmluZGV4XG5cbiAgcmVuZGVyOiAtPlxuICAgIGNsYXNzbmFtZSA9IGlmIEBwcm9wcy5zZWxlY3RlZCB0aGVuICd0YWItc2VsZWN0ZWQnIGVsc2UgJydcbiAgICAobGkge2NsYXNzTmFtZTogY2xhc3NuYW1lLCBvbkNsaWNrOiBAY2xpY2tlZH0sIEBwcm9wcy5sYWJlbClcblxubW9kdWxlLmV4cG9ydHMgPSBSZWFjdC5jcmVhdGVDbGFzc1xuXG4gIGRpc3BsYXlOYW1lOiAnVGFiYmVkUGFuZWxWaWV3J1xuXG4gIGdldEluaXRpYWxTdGF0ZTogLT5cbiAgICBzZWxlY3RlZFRhYkluZGV4OiAwXG5cbiAgc3RhdGljczpcbiAgICBUYWI6IChzZXR0aW5ncykgLT4gbmV3IFRhYkluZm8gc2V0dGluZ3NcblxuICBzZWxlY3RlZFRhYjogKGluZGV4KSAtPlxuICAgIEBzZXRTdGF0ZSBzZWxlY3RlZFRhYkluZGV4OiBpbmRleFxuXG4gIHJlbmRlclRhYjogKHRhYiwgaW5kZXgpIC0+XG4gICAgKFRhYlxuICAgICAgbGFiZWw6IHRhYi5sYWJlbFxuICAgICAga2V5OiBpbmRleFxuICAgICAgaW5kZXg6IGluZGV4XG4gICAgICBzZWxlY3RlZDogKGluZGV4IGlzIEBzdGF0ZS5zZWxlY3RlZFRhYkluZGV4KVxuICAgICAgb25TZWxlY3RlZDogQHNlbGVjdGVkVGFiXG4gICAgKVxuXG4gIHJlbmRlclRhYnM6IC0+XG4gICAgKGRpdiB7Y2xhc3NOYW1lOiAnd29ya3NwYWNlLXRhYnMnfSxcbiAgICAgICh1bCB7fSwgQHJlbmRlclRhYih0YWIsaW5kZXgpIGZvciB0YWIsIGluZGV4IGluIEBwcm9wcy50YWJzKVxuICAgIClcblxuICByZW5kZXJTZWxlY3RlZFBhbmVsOiAtPlxuICAgIChkaXYge2NsYXNzTmFtZTogJ3dvcmtzcGFjZS10YWItY29tcG9uZW50J30sXG4gICAgICBmb3IgdGFiLCBpbmRleCBpbiBAcHJvcHMudGFic1xuICAgICAgICAoZGl2IHtcbiAgICAgICAgICBrZXk6IGluZGV4XG4gICAgICAgICAgc3R5bGU6XG4gICAgICAgICAgICBkaXNwbGF5OiBpZiBpbmRleCBpcyBAc3RhdGUuc2VsZWN0ZWRUYWJJbmRleCB0aGVuICdibG9jaycgZWxzZSAnbm9uZSdcbiAgICAgICAgICB9LFxuICAgICAgICAgIHRhYi5jb21wb25lbnRcbiAgICAgICAgKVxuICAgIClcblxuICByZW5kZXI6IC0+XG4gICAgKGRpdiB7a2V5OiBAcHJvcHMua2V5LCBjbGFzc05hbWU6IFwidGFiYmVkLXBhbmVsXCJ9LFxuICAgICAgQHJlbmRlclRhYnMoKVxuICAgICAgQHJlbmRlclNlbGVjdGVkUGFuZWwoKVxuICAgIClcbiJdfQ==
