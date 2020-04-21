// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
/*
 * decaffeinate suggestions:
 * DS001: Remove Babel/TypeScript constructor workaround
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__
 * DS203: Remove `|| {}` from converted for-own loops
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const tr = require('../utils/translate');
const isString = require('../utils/is-string');
const isArray = require('../utils/is-array');

const { ProviderInterface } = (require('./provider-interface'));
const { cloudContentFactory } = (require('./provider-interface'));
const { CloudMetadata } = (require('./provider-interface'));

class ReadOnlyProvider extends ProviderInterface {
  static initClass() {
  
    this.Name = 'readOnly';
  }

  constructor(options, client) {
    {
      // Hack: trick Babel/TypeScript into allowing this before super.
      if (false) { super(); }
      let thisFn = (() => { return this; }).toString();
      let thisName = thisFn.slice(thisFn.indexOf('return') + 6 + 1, thisFn.indexOf(';')).trim();
      eval(`${thisName} = this;`);
    }
    if (options == null) { options = {}; }
    this.options = options;
    this.client = client;
    super({
      name: ReadOnlyProvider.Name,
      displayName: this.options.displayName || (tr('~PROVIDER.READ_ONLY')),
      urlDisplayName: this.options.urlDisplayName,
      capabilities: {
        save: false,
        resave: false,
        export: false,
        load: true,
        list: true,
        remove: false,
        rename: false,
        close: false
      }
    });
    this.tree = null;
    this.promises = [];
  }

  load(metadata, callback) {
    if (metadata && !isArray(metadata && (metadata.type === CloudMetadata.File))) {
      if (metadata.content != null) {
        callback(null, metadata.content);
        return;
      } else if (metadata.url != null) {
        $.ajax({
          dataType: 'json',
          url: metadata.url,
          success(data) {
            return callback(null, cloudContentFactory.createEnvelopedCloudContent(data));
          },
          error() { return callback(`Unable to load '${metadata.name}'`); }
        });
        return;
      } else if ((metadata != null ? metadata.name : undefined) != null) {
        return this._loadTree((err, tree) => {
          if (err) { return callback(err); }
          const file = this._findFile(tree, metadata.name);
          if (file != null) {
            this.load(file, callback);          // call load again with found file, as it may be remote
          } else {
            callback(`Unable to load '${metadata.name}'`);
          }
        });
      }
    } else {
      return callback("Unable to load specified content");
    }
  }

  list(metadata, callback) {
    return this._loadTree((err, tree) => {
      if (err) { return callback(err); }
      const items = (metadata != null ? metadata.type : undefined) === CloudMetadata.Folder ? metadata.providerData.children : this.tree;
      // clone the metadata items so that any changes made to the filename or content in the edit is not cached
      return callback(null, _.map(items, metadataItem => new CloudMetadata(metadataItem)));
    });
  }

  canOpenSaved() { return true; }

  openSaved(openSavedParams, callback) {
    const metadata = new CloudMetadata({
      name: unescape(openSavedParams),
      type: CloudMetadata.File,
      parent: null,
      provider: this
    });
    return this.load(metadata, (err, content) => callback(err, content, metadata));
  }

  getOpenSavedParams(metadata) {
    return metadata.name;
  }

  _loadTree(callback) {
    // wait for all promises to be resolved before proceeding
    const complete = iTree => {
      return Promise.all(this.promises)
        .then((function() {
          if (iTree != null) {
            return callback(null, iTree);
          } else {
            // an empty folder is unusual but not necessarily an error
            if (typeof console.error === 'function') {
              console.error(`No contents found for ${this.displayName} provider`);
            }
            return callback(null, {});
          }
        }),
        // if a promise was rejected, then there was an error
        (function() { return callback(`No contents found for ${this.displayName} provider`); }));
    };

    if (this.tree !== null) {
      return complete(this.tree);
    } else if (this.options.json) {
      this.tree = this._convertJSONToMetadataTree(this.options.json);
      return complete(this.tree);
    } else if (this.options.jsonCallback) {
      return this.options.jsonCallback((err, json) => {
        if (err) {
          return callback(err);
        } else {
          this.tree = this._convertJSONToMetadataTree(this.options.json);
          return complete(this.tree);
        }
      });
    } else if (this.options.src) {
      return $.ajax({
        dataType: 'json',
        url: this.options.src,
        success: iResponse => {
          this.tree = this._convertJSONToMetadataTree(iResponse);
          // alphabetize remotely loaded folder contents if requested
          if (this.options.alphabetize) {
            this.tree.sort(function(iMeta1, iMeta2) {
              if (iMeta1.name < iMeta2.name) { return -1; }
              if (iMeta1.name > iMeta2.name) { return  1; }
              return  0;
            });
          }
          return complete(this.tree);
        },
        error: (jqXHR, textStatus, errorThrown) => {
          const errorMetadata = this._createErrorMetadata(null);
          this.tree = [ errorMetadata ];
          return complete(this.tree);
        }
      });
    } else {
      return complete(null);
    }
  }

  _convertJSONToMetadataTree(json, parent = null) {
    let metadata, type;
    const tree = [];

    if (isArray(json)) {
      // parse array format:
      // [{ name: "...", content: "..."}, { name: "...", type: 'folder', children: [...] }]
      for (let item of Array.from(json)) {
        type = CloudMetadata.mapTypeToCloudMetadataType(item.type);
        metadata = new CloudMetadata({
          name: item.name,
          type,
          description: item.description,
          mimeType: item.mimeType,
          content: (item.content != null) ? cloudContentFactory.createEnvelopedCloudContent(item.content) : undefined,
          url: item.url || item.location,
          parent,
          provider: this,
          providerData: {
            children: null
          }
        });
        if (type === CloudMetadata.Folder) {
          const newFolderPromise = (iItem, iMetadata) => {
            return new Promise((resolve, reject) => {
              if (iItem.children != null) {
                iMetadata.providerData.children = this._convertJSONToMetadataTree(iItem.children, iMetadata);
                return resolve(iMetadata);
              } else if (iItem.url != null) {
                return $.ajax({
                  dataType: 'json',
                  url: iItem.url,
                  success: iResponse => {
                    iMetadata.providerData.children = this._convertJSONToMetadataTree(iResponse, iMetadata);
                    // alphabetize remotely loaded folder contents if requested
                    if (this.options.alphabetize || iItem.alphabetize) {
                      iMetadata.providerData.children.sort(function(iMeta1, iMeta2) {
                        if (iMeta1.name < iMeta2.name) { return -1; }
                        if (iMeta1.name > iMeta2.name) { return  1; }
                        return  0;
                      });
                    }
                    return resolve(iMetadata);
                  },
                  error: (jqXHR, textStatus, errorThrown) => {
                    const errorMetadata = this._createErrorMetadata(iMetadata);
                    iMetadata.providerData.children = [ errorMetadata ];
                    return resolve(iMetadata);
                  }
                });
              }
            });
          };
          this.promises.push(newFolderPromise(item, metadata));
        }

        tree.push(metadata);
      }
    } else {
      // parse original format:
      // { filename: "file contents", folderName: {... contents ...} }
      for (let filename of Object.keys(json || {})) {
        const itemContent = json[filename];
        type = isString(itemContent) ? CloudMetadata.File : CloudMetadata.Folder;
        metadata = new CloudMetadata({
          name: filename,
          type,
          content: cloudContentFactory.createEnvelopedCloudContent(itemContent),
          parent,
          provider: this,
          providerData: {
            children: null
          }
        });
        if (type === CloudMetadata.Folder) {
          metadata.providerData.children = this._convertJSONToMetadataTree(itemContent, metadata);
        }
        tree.push(metadata);
      }
    }

    return tree;
  }

  _findFile(arr, filename) {
    for (let item of Array.from(arr)) {
      if (item.type === CloudMetadata.File) {
        if ((item != null ? item.name : undefined) === filename) {
          return item;
        }
      } else if (__guard__(item.providerData != null ? item.providerData.children : undefined, x => x.length)) {
        const foundChild = this._findFile(item.providerData.children, filename);
        if (foundChild != null) { return foundChild; }
      }
    }
    return null;
  }

  // Remote folder contents are likely to be loaded as part of
  // sample document hierarchies. The inability to load one subfolder
  // of examples shouldn't necessarily be treated as a fatal error.
  // Therefore, we put an item in the returned results which indicates
  // the error and which is non-selectable, but resolve the promise
  // so that the open can proceed without the missing folder contents.
  _createErrorMetadata(iParent) {
    return new CloudMetadata({
      name: tr("~FILE_DIALOG.LOAD_FOLDER_ERROR"),
      type: CloudMetadata.Label,
      content: "",
      parent: iParent,
      provider: this,
      providerData: {
        children: null
      }
    });
  }
}
ReadOnlyProvider.initClass();

module.exports = ReadOnlyProvider;

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}