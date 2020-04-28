// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
/*
 * decaffeinate suggestions:
 * DS001: Remove Babel/TypeScript constructor workaround
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__
 * DS203: Remove `|| {}` from converted for-own loops
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const {div, button, span} = ReactDOMFactories

import getQueryParam  from '../utils/get-query-param'
import getHashParam  from '../utils/get-hash-param'
import tr  from '../utils/translate'
import pako  from 'pako'

import { ProviderInterface }  from './provider-interface'
import { cloudContentFactory }  from './provider-interface'
import { CloudMetadata }  from './provider-interface'

import DocumentStoreUrl  from './document-store-url'
import PatchableContent  from './patchable-content'
import { reportError } from '../utils/report-error'

const DocumentStoreAuthorizationDialog = createReactClassFactory({
  displayName: 'DocumentStoreAuthorizationDialog',

  getInitialState() {
    return {docStoreAvailable: false}
  },

  UNSAFE_componentWillMount() {
    return this.props.provider._onDocStoreLoaded(() => {
      return this.setState({docStoreAvailable: true})
    })
  },

  authenticate() {
    return this.props.provider.authorize()
  },

  render() {
    return (div({className: 'document-store-auth'},
      (div({className: 'document-store-concord-logo'}, '')),
      (div({className: 'document-store-footer'},
        this.state.docStoreAvailable ?
          (button({onClick: this.authenticate}, 'Login to Concord'))
        :
          'Trying to log into Concord...'
      ))
    ))
  }
})

class DocumentStoreProvider extends ProviderInterface {
  static initClass() {
  
    this.Name = 'documentStore'
  
    this.prototype._loginWindow = null
  }

  static get deprecationPhase() {
    return 3
  }

  static isNotDeprecated(capability) {
    if (capability === 'save') {
      return DocumentStoreProvider.deprecationPhase < 2
    } else {
      return DocumentStoreProvider.deprecationPhase < 3
    }
  }
  constructor(options, client) {
    const opts = options || {}

    super({
      name: DocumentStoreProvider.Name,
      displayName: opts.displayName || (tr('~PROVIDER.DOCUMENT_STORE')),
      urlDisplayName: opts.urlDisplayName,
      capabilities: {
        save: DocumentStoreProvider.isNotDeprecated('save'),
        resave: DocumentStoreProvider.isNotDeprecated('save'),
        "export": false,
        load: DocumentStoreProvider.isNotDeprecated('load'),
        list: DocumentStoreProvider.isNotDeprecated('list'),
        remove: DocumentStoreProvider.isNotDeprecated('remove'),
        rename: DocumentStoreProvider.isNotDeprecated('rename'),
        close: false
      }
    })

    this.options = opts
    this.client = client
    this.urlParams = {
      documentServer: getQueryParam("documentServer"),
      recordid: getQueryParam("recordid"),
      runKey: getQueryParam("runKey"),
      docName: getQueryParam("doc"),
      docOwner: getQueryParam("owner")
    }
    // query params that can be removed after initial processing
    this.removableQueryParams = ['recordid', 'doc', 'owner']

    this.docStoreUrl = new DocumentStoreUrl(this.urlParams.documentServer)

    this.user = null

    this.savedContent = new PatchableContent(this.options.patchObjectHash)
  }

  can(capability, metadata) {
    // legacy sharing support - can't save to old-style shared documents
    if (((capability === 'save') || (capability === 'resave')) && __guard__(metadata != null ? metadata.providerData : undefined, x => x.owner)) { return false }
    return super.can(capability, metadata)
  }

  // if a runKey is specified, we don't need to authenticate at all
  isAuthorizationRequired() {
    return !(this.urlParams.runKey || (this.urlParams.docName && this.urlParams.docOwner))
  }

  authorized(authCallback) {
    this.authCallback = authCallback
    if (this.authCallback) {
      if (this.user) {
        return this.authCallback(true)
      } else {
        return this._checkLogin()
      }
    } else {
      return this.user !== null
    }
  }

  authorize(completionCallback) {
    return this._showLoginWindow(completionCallback)
  }

  _onDocStoreLoaded(docStoreLoadedCallback) {
    this.docStoreLoadedCallback = docStoreLoadedCallback
    if (this._docStoreLoaded) {
      return this.docStoreLoadedCallback()
    }
  }

  _checkLogin() {
    const loggedIn = user => {
      this.user = user
      this._docStoreLoaded = true
      if (typeof this.docStoreLoadedCallback === 'function') {
        this.docStoreLoadedCallback()
      }
      if (user) {
        if (this._loginWindow != null) {
          this._loginWindow.close()
        }
      }
      if (this.authCallback) { return this.authCallback((user !== null)) }
    }

    return $.ajax({
      dataType: 'json',
      url: this.docStoreUrl.checkLogin(),
      xhrFields: {
        withCredentials: true
      },
      success(data) { return loggedIn(data) },
      error() { return loggedIn(null) }
    })
  }

  _showLoginWindow(completionCallback) {
    if (this._loginWindow && !this._loginWindow.closed) {
      this._loginWindow.focus()
    } else {

      const computeScreenLocation = function(w, h) {
        const screenLeft = window.screenLeft || screen.left
        const screenTop  = window.screenTop  || screen.top
        const width  = window.innerWidth  || document.documentElement.clientWidth  || screen.width
        const height = window.innerHeight || document.documentElement.clientHeight || screen.height

        const left = ((width / 2) - (w / 2)) + screenLeft
        const top = ((height / 2) - (h / 2)) + screenTop
        return {left, top}
      }

      const width = 1000
      const height = 480
      const position = computeScreenLocation(width, height)
      const windowFeatures = [
        `width=${width}`,
        `height=${height}`,
        (`top=${position.top}`) || 200,
        (`left=${position.left}`) || 200,
        'dependent=yes',
        'resizable=no',
        'location=no',
        'dialog=yes',
        'menubar=no'
      ]

      this._loginWindow = window.open(this.docStoreUrl.authorize(), 'auth', windowFeatures.join())

      if (this._loginWindow) {
        const pollAction = () => {
          try {
            if (this._loginWindow.location.host === window.location.host) {
              clearInterval(poll)
              this._loginWindow.close()
              this._checkLogin()
              if (completionCallback) { return completionCallback() }
            }
          } catch (e) {
            reportError(e)
          }
        }
            // console.log e

        var poll = setInterval(pollAction, 200)
      }
    }

    return this._loginWindow
  }

  renderAuthorizationDialog() {
    return (DocumentStoreAuthorizationDialog({provider: this, authCallback: this.authCallback}))
  }

  renderUser() {
    if (this.user) {
      return (span({}, (span({className: 'document-store-icon'})), this.user.name))
    } else {
      return null
    }
  }

  filterTabComponent(capability, defaultComponent) {
    // allow the save elsewhere button to hide the document provider tab in save
    if ((capability === 'save') && this.disableForNextSave) {
      this.disableForNextSave = false
      return null
    } else {
      return defaultComponent
    }
  }



  deprecationMessage() {
    return `\
<div style="text-align: left">
  <p style="margin: 10px 0;">
    <strong>${tr('~CONCORD_CLOUD_DEPRECATION.SHUT_DOWN_MESSAGE')}</strong>
  </p>
  <p style="margin: 10px 0;">
    ${tr('~CONCORD_CLOUD_DEPRECATION.PLEASE_SAVE_ELSEWHERE')}
  </p>
</div>\
`
  }

  onProviderTabSelected(capability) {
    if ((capability === 'save') && this.deprecationMessage()) {
      return this.client.alert(this.deprecationMessage(), (tr('~CONCORD_CLOUD_DEPRECATION.ALERT_SAVE_TITLE')))
    }
  }

  handleUrlParams() {
    if (this.urlParams.recordid) {
      this.client.openProviderFile(this.name, { id: this.urlParams.recordid })
      return true // signal that the provider is handling the params
    } else if (this.urlParams.docName && this.urlParams.docOwner) {
      this.client.openProviderFile(this.name, { name: this.urlParams.docName, owner: this.urlParams.docOwner })
      return true // signal that the provider is handling the params
    } else {
      return false
    }
  }

  list(metadata, callback) {
    return $.ajax({
      dataType: 'json',
      url: this.docStoreUrl.listDocuments(),
      context: this,
      xhrFields: {
        withCredentials: true
      },
      success(data) {
        const list = []
        for (let key of Object.keys(data || {})) {
          const file = data[key]
          if (this.matchesExtension(file.name)) {
            list.push(new CloudMetadata({
              name: file.name,
              providerData: {id: file.id},
              type: CloudMetadata.File,
              provider: this
            })
            )
          }
        }
        return callback(null, list)
      },
      error() {
        return callback(null, [])
      },
      statusCode: {
        403: () => {
          this.user = null
          return this.authCallback(false)
        }
      }
    })
  }

  load(metadata, callback) {
    const withCredentials = !metadata.sharedContentId
    const recordid = (metadata.providerData != null ? metadata.providerData.id : undefined) || metadata.sharedContentId
    const requestData = {}
    if (recordid) { requestData.recordid = recordid }
    if (this.urlParams.runKey) { requestData.runKey = this.urlParams.runKey }
    if (!recordid) {
      if (metadata.providerData != null ? metadata.providerData.name : undefined) { requestData.recordname = metadata.providerData != null ? metadata.providerData.name : undefined }
      if (metadata.providerData != null ? metadata.providerData.owner : undefined) { requestData.owner = metadata.providerData != null ? metadata.providerData.owner : undefined }
    }
    return $.ajax({
      url: this.docStoreUrl.loadDocument(),
      dataType: 'json',
      data: requestData,
      context: this,
      xhrFields:
        {withCredentials},
      success(data) {
        const content = cloudContentFactory.createEnvelopedCloudContent(data)

        // for documents loaded by id or other means (besides name),
        // capture the name for use in the CFM interface.
        // 'docName' at the top level for CFM-wrapped documents
        // 'name' at the top level for unwrapped documents (e.g. CODAP)
        // 'name' at the top level of 'content' for wrapped CODAP documents
        metadata.rename(metadata.name || metadata.providerData.name ||
                        data.docName || data.name || (data.content != null ? data.content.name : undefined)
        )
        if (metadata.name) {
          content.addMetadata({docName: metadata.filename})
        }

        return callback(null, content)
      },
      statusCode: {
        403: () => {
          this.user = null
          return callback(tr("~DOCSTORE.LOAD_403_ERROR", {filename: metadata.name || 'the file'}), 403)
        }
      },

      error(jqXHR) {
        if (jqXHR.status === 403) { return } // let statusCode handler deal with it
        const message = metadata.sharedContentId ?
          tr("~DOCSTORE.LOAD_SHARED_404_ERROR")
        :
          tr("~DOCSTORE.LOAD_404_ERROR", {filename: metadata.name || (metadata.providerData != null ? metadata.providerData.id : undefined) || 'the file'})
        return callback(message)
      }
    })
  }

  save(cloudContent, metadata, callback) {
    const content = cloudContent.getContent()

    // See if we can patch
    const patchResults = this.savedContent.createPatch(content, this.options.patch && metadata.overwritable)

    if (patchResults.shouldPatch && !patchResults.diffLength) {
      // no reason to patch if there are no diffs
      callback(null) // no error indicates success
      return
    }

    const params = {}
    if (metadata.providerData.id) { params.recordid = metadata.providerData.id }

    if (!patchResults.shouldPatch && metadata.filename) {
      params.recordname = metadata.filename
    }

    // If we are saving for the first time as a student in a LARA activity, then we do not have
    // authorization on the current document. However, we should have a runKey query parameter.
    // When we save with this runKey, the document will save our changes to a copy of the document,
    // owned by us.
    //
    // When we successfully save, we will get the id of the new document in the response, and use
    // this id for future saving. We can then save via patches, and don't need the runKey.
    if (this.urlParams.runKey) {
      params.runKey = this.urlParams.runKey
    }

    const method = 'POST'
    const url = patchResults.shouldPatch 
            ? this.docStoreUrl.patchDocument(params) 
            : this.docStoreUrl.saveDocument(params)

    const logData = {
      operation: 'save',
      provider: 'DocumentStoreProvider',
      shouldPatch: patchResults.shouldPatch,
      method,
      url,
      params: JSON.stringify(params),
      content: patchResults.sendContent.substr(0, 512)
    }
    this.client.log('save', logData)

    return $.ajax({
      dataType: 'json',
      type: method,
      url,
      data: pako.deflate(patchResults.sendContent),
      contentType: patchResults.mimeType,
      processData: false,
      beforeSend(xhr) {
        return xhr.setRequestHeader('Content-Encoding', 'deflate')
      },
      context: this,
      xhrFields: {
        withCredentials: true
      },
      success(data) {
        this.savedContent.updateContent(this.options.patch ? _.cloneDeep(content) : null)
        if (data.id) { metadata.providerData.id = data.id }

        return callback(null, data)
      },
      statusCode: {
        403: () => {
          this.user = null
          return callback(tr("~DOCSTORE.SAVE_403_ERROR", {filename: metadata.name}), 403)
        }
      },
      error(jqXHR) {
        try {
          if (jqXHR.status === 403) { return } // let statusCode handler deal with it
          const responseJson = JSON.parse(jqXHR.responseText)
          if (responseJson.message === 'error.duplicate') {
            return callback(tr("~DOCSTORE.SAVE_DUPLICATE_ERROR", {filename: metadata.name}))
          } else {
            return callback(tr("~DOCSTORE.SAVE_ERROR_WITH_MESSAGE", {filename: metadata.name, message: responseJson.message}))
          }
        } catch (error) {
          return callback(tr("~DOCSTORE.SAVE_ERROR", {filename: metadata.name}))
        }
      }})
  }

  remove(metadata, callback) {
    return $.ajax({
      url: this.docStoreUrl.deleteDocument(),
      data: {
        recordname: metadata.filename
      },
      context: this,
      xhrFields: {
        withCredentials: true
      },
      success(data) {
        return callback(null, data)
      },
      statusCode: {
        403: () => {
          this.user = null
          return callback(tr("~DOCSTORE.REMOVE_403_ERROR", {filename: metadata.name}), 403)
        }
      },
      error(jqXHR) {
        if (jqXHR.status === 403) { return } // let statusCode handler deal with it
        return callback(tr("~DOCSTORE.REMOVE_ERROR", {filename: metadata.name}))
      }})
  }

  rename(metadata, newName, callback) {
    return $.ajax({
      url: this.docStoreUrl.renameDocument(),
      data: {
        recordid: metadata.providerData.id,
        newRecordname: CloudMetadata.withExtension(newName)
      },
      context: this,
      xhrFields: {
        withCredentials: true
      },
      success(data) {
        metadata.rename(newName)
        return callback(null, metadata)
      },
      statusCode: {
        403: () => {
          this.user = null
          return callback(tr("~DOCSTORE.RENAME_403_ERROR", {filename: metadata.name}), 403)
        }
      },
      error(jqXHR) {
        if (jqXHR.status === 403) { return } // let statusCode handler deal with it
        return callback(tr("~DOCSTORE.RENAME_ERROR", {filename: metadata.name}))
      }})
  }

  canOpenSaved() { return true }

  openSaved(openSavedParams, callback) {
    const providerData = typeof openSavedParams === "object" 
                      ? openSavedParams 
                      : { id: openSavedParams }
    const metadata = new CloudMetadata({
      type: CloudMetadata.File,
      provider: this,
      providerData
    })

    return this.load(metadata, (err, content) => {
      this.client.removeQueryParams(this.removableQueryParams)
      return callback(err, content, metadata)
    })
  }

  getOpenSavedParams(metadata) {
    return metadata.providerData.id
  }

  fileOpened(content, metadata) {
    const deprecationPhase = this.options.deprecationPhase || 0
    const fromLara = !!getQueryParam("launchFromLara") || !!getHashParam("lara")
    if (!deprecationPhase || fromLara) { return }
    return this.client.confirmDialog({
      title: tr('~CONCORD_CLOUD_DEPRECATION.CONFIRM_SAVE_TITLE'),
      message: this.deprecationMessage(),
      yesTitle: tr('~CONCORD_CLOUD_DEPRECATION.CONFIRM_SAVE_ELSEWHERE'),
      noTitle: tr('~CONCORD_CLOUD_DEPRECATION.CONFIRM_DO_IT_LATER'),
      hideNoButton: deprecationPhase >= 3,
      callback: () => {
        this.disableForNextSave = true
        return this.client.saveFileAsDialog()
      },
      rejectCallback: () => {
        if (deprecationPhase > 1) {
          return this.client.appOptions.autoSaveInterval = null
        }
      }
    })
  }
}
DocumentStoreProvider.initClass()

export default DocumentStoreProvider

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined
}