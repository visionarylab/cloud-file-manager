"use strict";
// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
/*
 * decaffeinate suggestions:
 * DS201: Simplify complex destructure assignments
 * DS203: Remove `|| {}` from converted for-own loops
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
exports.__esModule = true;
var is_string_1 = require("../utils/is-string");
var lodash_1 = require("lodash");
var FILE_EXTENSION_DELIMETER = ".";
var ICloudFileTypes;
(function (ICloudFileTypes) {
    ICloudFileTypes["File"] = "file";
    ICloudFileTypes["Folder"] = "folder";
    ICloudFileTypes["Label"] = "label";
    ICloudFileTypes["Extension"] = "extension";
})(ICloudFileTypes || (ICloudFileTypes = {}));
var CloudFile = /** @class */ (function () {
    function CloudFile(options) {
        (this.content = options.content, this.metadata = options.metadata);
    }
    return CloudFile;
}());
exports.CloudFile = CloudFile;
var CloudMetadata = /** @class */ (function () {
    function CloudMetadata(options) {
        var provider, parent, providerData;
        this.name = options.name;
        this.type = options.type;
        this.description = options.description;
        this.content = options.content;
        this.url = options.url;
        provider = options.provider;
        this.provider = provider != null ? provider : null;
        parent = options.parent;
        this.parent = parent;
        providerData = options.providerData;
        this.providerData = providerData != null ? providerData : {};
        this.overwritable = options.overwritable;
        this.sharedContentId = options.sharedContentId;
        this.sharedContentSecretKey = options.sharedContentSecretKey;
        this.mimeType = options.mimeType;
        this._updateFilename();
    }
    CloudMetadata.mapTypeToCloudMetadataType = function (iType) {
        return iType || ICloudFileTypes.File;
    };
    CloudMetadata.nameIncludesExtension = function (name) {
        if (name.indexOf(FILE_EXTENSION_DELIMETER) === -1) {
            return false;
        }
        return true;
    };
    CloudMetadata.withExtension = function (name, defaultExtension, keepOriginalExtension) {
        // TODO:  Eslint doesn't like this bitwise not operator.
        // I feel the same.
        if (keepOriginalExtension && this.nameIncludesExtension(name)) {
            return name;
        }
        var extension = this.Extension || defaultExtension;
        if (extension) {
            return this.newExtension(name, extension);
        }
        else {
            return name;
        }
    };
    CloudMetadata.newExtension = function (name, extension) {
        // drop last extension, if there is one
        name = name.substr(0, name.lastIndexOf('.')) || name;
        return name + "." + extension;
    };
    CloudMetadata.prototype.path = function () {
        var _path = [];
        var parent = this.parent;
        while (parent !== null) {
            _path.unshift(parent);
            (parent = parent.parent);
        }
        return _path;
    };
    CloudMetadata.prototype.rename = function (newName) {
        this.name = newName;
        return this._updateFilename();
    };
    CloudMetadata.prototype._updateFilename = function () {
        this.filename = this.name;
        if (((this.name != null ? this.name.substr : undefined) != null) && (CloudMetadata.Extension != null) && (this.type === CloudMetadata.File)) {
            var extLen = CloudMetadata.Extension.length;
            if (extLen > 0) {
                // at this point the filename and name are the same so we now check for a file extension
                var hasCurrentExtension = this.name.substr(-extLen - 1) === "." + CloudMetadata.Extension;
                if (hasCurrentExtension) {
                    // remove extension from name for display purposes
                    return this.name = this.name.substr(0, this.name.length - (extLen + 1));
                }
                else {
                    // add extension to filename for saving purposes
                    return this.filename += "." + CloudMetadata.Extension;
                }
            }
        }
    };
    CloudMetadata.Folder = 'folder';
    CloudMetadata.File = 'file';
    CloudMetadata.Label = 'label';
    CloudMetadata.Extension = null;
    return CloudMetadata;
}());
exports.CloudMetadata = CloudMetadata;
// singleton that can create CloudContent wrapped with global options
var CloudContentFactory = /** @class */ (function () {
    function CloudContentFactory() {
        this.envelopeMetadata = {
            // replaced by version number at build time
            cfmVersion: '__PACKAGE_VERSION__',
            appName: '',
            appVersion: '',
            appBuildNum: ''
        };
    }
    // set initial envelopeMetadata or update individual properties
    CloudContentFactory.prototype.setEnvelopeMetadata = function (envelopeMetadata) {
        for (var key in envelopeMetadata) {
            this.envelopeMetadata[key] = this.envelopeMetadata[key];
        }
    };
    // returns new CloudContent containing enveloped data
    CloudContentFactory.prototype.createEnvelopedCloudContent = function (content) {
        return new CloudContent((this.envelopContent(content)), (this._identifyContentFormat(content)));
    };
    // envelops content with metadata, returns an object.
    // If content was already an object (Object or JSON) with metadata,
    // any existing metadata will be retained.
    // Note: calling `envelopContent` may be safely called on something that
    // has already had `envelopContent` called on it, and will be a no-op.
    CloudContentFactory.prototype.envelopContent = function (content) {
        var envelopedCloudContent = this._wrapIfNeeded(content);
        for (var key in this.envelopeMetadata) {
            if (envelopedCloudContent[key] == null) {
                envelopedCloudContent[key] = this.envelopeMetadata[key];
            }
        }
        return envelopedCloudContent;
    };
    CloudContentFactory.prototype._identifyContentFormat = function (content) {
        if ((content == null)) {
            return;
        }
        var result = { isCfmWrapped: false, isPreCfmFormat: false };
        if (is_string_1["default"](content)) {
            try {
                content = JSON.parse(content);
            }
            catch (error) {
                // noop, just cecking if it's valid json
            }
        }
        // Currently, we assume 'metadata' is top-level property in
        // non-CFM-wrapped documents. Could put in a client callback
        // that would identify whether the document required
        // conversion to eliminate this assumption from the CFM.
        if (content.metadata) {
            return result;
        }
        if (
        // 'cfmWrapped' means meta-data is top-level, and content
        // can be found inside content.content
        (content.cfmVersion != null) ||
            (content.content != null)) {
            result.isCfmWrapped = true;
        }
        else {
            result.isPreCfmFormat = true;
        }
        return result;
    };
    // envelops content in {content: content} if needed, returns an object
    CloudContentFactory.prototype._wrapIfNeeded = function (content) {
        if (is_string_1["default"](content)) {
            try {
                content = JSON.parse(content);
            }
            catch (error) {
                // noop, just cecking if it's json or plain text
            }
        }
        if (content.content != null) {
            return content;
        }
        else {
            return { content: content };
        }
    };
    return CloudContentFactory;
}());
var CloudContent = /** @class */ (function () {
    function CloudContent(_content, _contentFormat) {
        this.content = _content == null
            ? {}
            : _content;
        this.contentFormat = _contentFormat;
    }
    // getContent and getContentAsJSON return the file content as stored on disk
    CloudContent.prototype.getContent = function () {
        if (CloudContent.wrapFileContent) {
            return this.content;
        }
        else {
            return this.content.content;
        }
    };
    CloudContent.prototype.getContentAsJSON = function () {
        return JSON.stringify(CloudContent.wrapFileContent ? this.content : this.content.content);
    };
    // returns the client-visible content (excluding wrapper for wrapped clients)
    CloudContent.prototype.getClientContent = function () {
        return this.content.content;
    };
    CloudContent.prototype.requiresConversion = function () {
        return (CloudContent.wrapFileContent !== (this.contentFormat != null ? this.contentFormat.isCfmWrapped : undefined)) || (this.contentFormat != null ? this.contentFormat.isPreCfmFormat : undefined);
    };
    CloudContent.prototype.clone = function () {
        var newContent = lodash_1["default"].cloneDeep(this.content);
        var newContentFormat = lodash_1["default"].cloneDeep(this.contentFormat);
        return new CloudContent(newContent, newContentFormat);
    };
    CloudContent.prototype.setText = function (text) { return this.content.content = text; };
    CloudContent.prototype.getText = function () { if (this.content.content === null) {
        return '';
    }
    else if (is_string_1["default"](this.content.content)) {
        return this.content.content;
    }
    else {
        return JSON.stringify(this.content.content);
    } };
    CloudContent.prototype.addMetadata = function (metadata) {
        var result = [];
        for (var key in metadata) {
            result.push(this.content[key] = metadata[key]);
        }
        return result;
    };
    CloudContent.prototype.get = function (prop) {
        return this.content[prop];
    };
    CloudContent.prototype.set = function (prop, value) {
        this.content[prop] = value;
    };
    CloudContent.prototype.remove = function (prop) {
        delete this.content[prop];
    };
    CloudContent.prototype.getSharedMetadata = function () {
        // only include necessary fields
        var shared = {};
        if (this.content._permissions != null) {
            shared._permissions = this.content._permissions;
        }
        if (this.content.shareEditKey != null) {
            shared.shareEditKey = this.content.shareEditKey;
        }
        if (this.content.sharedDocumentId != null) {
            shared.sharedDocumentId = this.content.sharedDocumentId;
        }
        if (this.content.accessKeys != null) {
            shared.accessKeys = this.content.accessKeys;
        }
        return shared;
    };
    CloudContent.prototype.copyMetadataTo = function (to) {
        var metadata = {};
        for (var _i = 0, _a = Object.keys(this.content || {}); _i < _a.length; _i++) {
            var key = _a[_i];
            var value = this.content[key];
            if (key !== 'content') {
                // TOOD: We could probably enumerate the keys
                // and not have to do this any cast
                metadata[key] = value;
            }
        }
        return to.addMetadata(metadata);
    };
    CloudContent.wrapFileContent = true;
    return CloudContent;
}());
exports.CloudContent = CloudContent;
var ECapabilities;
(function (ECapabilities) {
    ECapabilities["save"] = "save";
    ECapabilities["resave"] = "resave";
    ECapabilities["load"] = "load";
    ECapabilities["list"] = "list";
    ECapabilities["remove"] = "remove";
    ECapabilities["rename"] = "rename";
    ECapabilities["close"] = "close";
})(ECapabilities || (ECapabilities = {}));
var ProviderInterface = /** @class */ (function () {
    function ProviderInterface(options) {
        (this.name = options.name, this.displayName = options.displayName, this.urlDisplayName = options.urlDisplayName, this.capabilities = options.capabilities);
    }
    ProviderInterface.Available = function () { return true; };
    // TODO: do we need metadata, saw two different sigs in code
    // see saveAsExport
    ProviderInterface.prototype.can = function (capability, metadata) {
        return !!this.capabilities[capability];
    };
    ProviderInterface.prototype.canAuto = function (capability) {
        return this.capabilities[capability] === 'auto';
    };
    ProviderInterface.prototype.isAuthorizationRequired = function () {
        return false;
    };
    ProviderInterface.prototype.authorized = function (callback) {
        if (callback) {
            return callback(true);
        }
        else {
            return true;
        }
    };
    ProviderInterface.prototype.renderAuthorizationDialog = function () {
        console.warn('renderAuthorizationDialog not implimented');
    };
    ProviderInterface.prototype.renderUser = function () {
        console.warn('renderUser not implimented');
    };
    ProviderInterface.prototype.filterTabComponent = function (capability, defaultComponent) {
        return defaultComponent;
    };
    ProviderInterface.prototype.matchesExtension = function (name) {
        if (!name) {
            return false;
        }
        if ((CloudMetadata.ReadableExtensions != null) && (CloudMetadata.ReadableExtensions.length > 0)) {
            for (var _i = 0, _a = CloudMetadata.ReadableExtensions; _i < _a.length; _i++) {
                var extension = _a[_i];
                if (name.substr(-extension.length) === extension) {
                    return true;
                }
                if (extension === "") {
                    // TODO:  Eslint doesn't like this bitwise not operator.
                    if (!~name.indexOf(".")) {
                        return true;
                    }
                }
            }
            return false;
        }
        else {
            // may seem weird but it means that without an extension specified all files match
            return true;
        }
    };
    ProviderInterface.prototype.handleUrlParams = function () {
        return false; // by default, no additional URL handling
    };
    ProviderInterface.prototype.dialog = function (callback) {
        return this._notImplemented('dialog');
    };
    ProviderInterface.prototype.save = function (content, metadata, callback) {
        return this._notImplemented('save');
    };
    ProviderInterface.prototype.saveAsExport = function (content, metadata, callback) {
        // default implementation invokes save
        if (this.can(ECapabilities.save, metadata)) {
            return this.save(content, metadata, callback);
        }
        else {
            return this._notImplemented('saveAsExport');
        }
    };
    ProviderInterface.prototype.load = function (callback) {
        return this._notImplemented('load');
    };
    ProviderInterface.prototype.list = function (metadata, callback) {
        return this._notImplemented('list');
    };
    ProviderInterface.prototype.remove = function (metadata, callback) {
        return this._notImplemented('remove');
    };
    ProviderInterface.prototype.rename = function (metadata, newName, callback) {
        return this._notImplemented('rename');
    };
    ProviderInterface.prototype.close = function (metadata, callback) {
        return this._notImplemented('close');
    };
    ProviderInterface.prototype.setFolder = function (metadata) {
        return this._notImplemented('setFolder');
    };
    ProviderInterface.prototype.canOpenSaved = function () { return false; };
    ProviderInterface.prototype.openSaved = function (openSavedParams, callback) {
        return this._notImplemented('openSaved');
    };
    ProviderInterface.prototype.getOpenSavedParams = function (metadata) {
        return this._notImplemented('getOpenSavedParams');
    };
    ProviderInterface.prototype.fileOpened = function () { };
    // do nothing by default
    ProviderInterface.prototype._notImplemented = function (methodName) {
        // this uses a browser alert instead of client.alert because this is just here for debugging
        // eslint-disable-next-line no-alert
        return alert(methodName + " not implemented for " + this.name + " provider");
    };
    return ProviderInterface;
}());
exports.ProviderInterface = ProviderInterface;
var cloudContentFactory = new CloudContentFactory();
exports.cloudContentFactory = cloudContentFactory;
