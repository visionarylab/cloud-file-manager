import tr from './utils/translate';
import isString from './utils/is-string';

class CloudFileManagerUIEvent {

  constructor(type, data) {
    this.type = type;
    if (data == null) { data = {}; }
    this.data = data;
  }
}

class CloudFileManagerUIMenu {
  static initClass() {
  
    this.DefaultMenu = ['newFileDialog', 'openFileDialog', 'revertSubMenu', 'separator', 'save', 'createCopy', 'shareSubMenu', 'renameDialog'];
  }

  constructor(options, client) {
    this.options = options;
    this.items = this.parseMenuItems(options.menu, client);
  }

  parseMenuItems(menuItems, client) {
    let setAction = action => __guard__(client[action], x => x.bind(client)) || (() => client.alert(`No ${action} action is available in the client`));

    let setEnabled = function(action) {
      switch (action) {
        case 'revertSubMenu':
          // revert sub-menu state depends on presence of shareEditKey
          return () => ((client.state.openedContent != null) && (client.state.metadata != null)) || client.canEditShared();
        case 'revertToLastOpenedDialog':
          return () => (client.state.openedContent != null) && (client.state.metadata != null);
        case 'shareGetLink': case 'shareSubMenu':
          return () => client.state.shareProvider != null;
        case 'revertToSharedDialog':
          // revert to shared menu item state depends on sharedDocumentId
          return () => client.isShared();
        case 'shareUpdate':
          // shareUpdate menu item state depends on presence of shareEditKey or readWrite accessKey
          return () => client.canEditShared();
        default:
          return true;
      }
    };

    let getItems = subMenuItems => {
      if (subMenuItems) {
        return this.parseMenuItems(subMenuItems, client);
      } else {
        return null;
      }
    };

    let names = {
      newFileDialog: tr("~MENU.NEW"),
      openFileDialog: tr("~MENU.OPEN"),
      closeFileDialog: tr("~MENU.CLOSE"),
      revertToLastOpenedDialog: tr("~MENU.REVERT_TO_LAST_OPENED"),
      revertToSharedDialog: tr("~MENU.REVERT_TO_SHARED_VIEW"),
      save: tr("~MENU.SAVE"),
      saveFileAsDialog: tr("~MENU.SAVE_AS"),
      saveSecondaryFileAsDialog: tr("~MENU.EXPORT_AS"),
      createCopy: tr("~MENU.CREATE_COPY"),
      shareGetLink: tr("~MENU.SHARE_GET_LINK"),
      shareUpdate: tr("~MENU.SHARE_UPDATE"),
      downloadDialog: tr("~MENU.DOWNLOAD"),
      renameDialog: tr("~MENU.RENAME"),
      revertSubMenu: tr("~MENU.REVERT_TO"),
      shareSubMenu: tr("~MENU.SHARE")
    };

    let subMenus = {
      revertSubMenu: ['revertToLastOpenedDialog', 'revertToSharedDialog'],
      shareSubMenu: ['shareGetLink', 'shareUpdate']
    };

    let items = [];
    for (let i = 0; i < menuItems.length; i++) {
      var menuItem;
      var item = menuItems[i];
      if (item === 'separator') {
        menuItem = {
          key: `seperator${i}`,
          separator: true
        };
      } else if (isString(item)) {
        menuItem = {
          key: item,
          name: __guard__(this.options.menuNames, x => x[item]) || names[item] || `Unknown item: ${item}`,
          enabled: setEnabled(item),
          items: getItems(subMenus[item]),
          action: setAction(item)
        };
      } else {
        menuItem = item;
        // clients can pass in custom {name:..., action:...} menu items where the action can be a client function name or otherwise it is assumed action is a function
        if (isString(item.action)) {
          menuItem.key = item.action;
          menuItem.enabled = setEnabled(item.action);
          menuItem.action = setAction(item.action);
        } else {
          if (!menuItem.enabled) { menuItem.enabled = true; }
        }
        if (item.items) { menuItem.items = getItems(item.items); }
      }
      items.push(menuItem);
    }
    return items;
  }
}
CloudFileManagerUIMenu.initClass();

class CloudFileManagerUI {

  constructor(client){
    this.client = client;
    this.menu = null;
    this.listenerCallbacks = [];
  }

  init(options) {
    options = options || {};
    // skip the menu if explicity set to null (meaning no menu)
    if (options.menu !== null) {
      if (typeof options.menu === 'undefined') {
        options.menu = CloudFileManagerUIMenu.DefaultMenu;
      }
      return this.menu = new CloudFileManagerUIMenu(options, this.client);
    }
  }

  // for React to listen for dialog changes
  listen(callback) {
    return this.listenerCallbacks.push(callback);
  }

  listenerCallback(evt) {
    return Array.from(this.listenerCallbacks).map((callback) =>
      callback(evt));
  }

  appendMenuItem(item) {
    return this.listenerCallback(new CloudFileManagerUIEvent('appendMenuItem', item));
  }

  prependMenuItem(item) {
    return this.listenerCallback(new CloudFileManagerUIEvent('prependMenuItem', item));
  }

  replaceMenuItem(key, item) {
    return this.listenerCallback(new CloudFileManagerUIEvent('replaceMenuItem', {
      key,
      item
    }
    )
    );
  }

  insertMenuItemBefore(key, item) {
    return this.listenerCallback(new CloudFileManagerUIEvent('insertMenuItemBefore', {
      key,
      item
    }
    )
    );
  }

  insertMenuItemAfter(key, item) {
    return this.listenerCallback(new CloudFileManagerUIEvent('insertMenuItemAfter', {
      key,
      item
    }
    )
    );
  }

  setMenuBarInfo(info) {
    return this.listenerCallback(new CloudFileManagerUIEvent('setMenuBarInfo', info));
  }

  saveFileDialog(callback) {
    return this._showProviderDialog('saveFile', (tr('~DIALOG.SAVE')), callback);
  }

  saveFileAsDialog(callback) {
    return this._showProviderDialog('saveFileAs', (tr('~DIALOG.SAVE_AS')), callback);
  }

  saveSecondaryFileAsDialog(data, callback) {
    return this._showProviderDialog('saveSecondaryFileAs', (tr('~DIALOG.EXPORT_AS')), callback, data);
  }

  openFileDialog(callback) {
    return this._showProviderDialog('openFile', (tr('~DIALOG.OPEN')), callback);
  }

  importDataDialog(callback) {
    return this.listenerCallback(new CloudFileManagerUIEvent('showImportDialog',
      {callback})
    );
  }

  downloadDialog(filename, content, callback) {
    return this.listenerCallback(new CloudFileManagerUIEvent('showDownloadDialog', {
      filename,
      content,
      callback
    }
    )
    );
  }

  renameDialog(filename, callback) {
    return this.listenerCallback(new CloudFileManagerUIEvent('showRenameDialog', {
      filename,
      callback
    }
    )
    );
  }

  shareDialog(client, enableLaraSharing) {
    if (enableLaraSharing == null) { enableLaraSharing = false; }
    return this.listenerCallback(new CloudFileManagerUIEvent('showShareDialog', {
      client,
      enableLaraSharing
    }
    )
    );
  }

  showBlockingModal(modalProps) {
    return this.listenerCallback(new CloudFileManagerUIEvent('showBlockingModal', modalProps));
  }

  hideBlockingModal() {
    return this.listenerCallback(new CloudFileManagerUIEvent('hideBlockingModal'));
  }

  editInitialFilename() {
    return this.listenerCallback(new CloudFileManagerUIEvent('editInitialFilename'));
  }

  alertDialog(message, title, callback) {
    return this.listenerCallback(new CloudFileManagerUIEvent('showAlertDialog', {
      title,
      message,
      callback
    }
    )
    );
  }

  confirmDialog(params) {
    return this.listenerCallback(new CloudFileManagerUIEvent('showConfirmDialog', params));
  }

  _showProviderDialog(action, title, callback, data) {
    return this.listenerCallback(new CloudFileManagerUIEvent('showProviderDialog', {
      action,
      title,
      callback,
      data
    }
    )
    );
  }
}

export { CloudFileManagerUIEvent, CloudFileManagerUI, CloudFileManagerUIMenu };

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}