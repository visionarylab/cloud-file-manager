// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const ModalTabbedDialog = createReactFactory(require('./modal-tabbed-dialog-view'))
const TabbedPanel = require('./tabbed-panel-view')
const LocalFileTab = createReactFactory(require('./local-file-tab-list-view'))
const UrlTab = createReactFactory(require('./url-tab-view'))

const tr = require('../utils/translate')

const LocalFileImportTab = createReactClassFactory

module.exports = createReactClass({
  displayName: 'ImportTabbedDialog',

  importFile(metadata, via) {
    switch (metadata.provider) {
      case 'localFile':
        var reader = new FileReader()
        reader.onload = loaded => {
          const data = {
            file: {
              name: metadata.providerData.file.name,
              content: loaded.target.result,
              object: metadata.providerData.file
            },
            via
          }
          return (typeof this.props.dialog.callback === 'function' ? this.props.dialog.callback(data) : undefined)
        }
        return reader.readAsText(metadata.providerData.file)
    }
  },

  importUrl(url, via) {
    return (typeof this.props.dialog.callback === 'function' ? this.props.dialog.callback({url, via}) : undefined)
  },

  render() {
    const tabs = [
      TabbedPanel.Tab({
        key: 0,
        label: (tr("~IMPORT.LOCAL_FILE")),
        component: LocalFileTab({
          client: this.props.client,
          dialog: {
            callback: this.importFile
          },
          provider: 'localFile', // we are faking the provider here so we can reuse the local file tab
          close: this.props.close
        })
      }),
      TabbedPanel.Tab({
        key: 1,
        label: (tr("~IMPORT.URL")),
        component: UrlTab({
          client: this.props.client,
          dialog: {
            callback: this.importUrl
          },
          close: this.props.close
        })
      })
    ]
    return (ModalTabbedDialog({title: (tr("~DIALOG.IMPORT_DATA")), close: this.props.close, tabs, selectedTabIndex: 0}))
  }
})
