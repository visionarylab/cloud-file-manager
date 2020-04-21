// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
/*
 * decaffeinate suggestions:
 * DS001: Remove Babel/TypeScript constructor workaround
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const {div, button, span} = ReactDOMFactories

const tr = require('../utils/translate')
const { ProviderInterface } = (require('./provider-interface'))
const { cloudContentFactory } = (require('./provider-interface'))
const { CloudMetadata } = (require('./provider-interface'))

const GoogleDriveAuthorizationDialog = createReactClassFactory({
  displayName: 'GoogleDriveAuthorizationDialog',

  getInitialState() {
    return {loadedGAPI: window._LoadedGAPIClients}
  },

  // See comments in AuthorizeMixin for detailed description of the issues here.
  // The short version is that we need to maintain synchronized instance variable
  // and state to track authorization status while avoiding calling setState on
  // unmounted components, which doesn't work and triggers a React warning.

  UNSAFE_componentWillMount() {
    return this.props.provider._loadedGAPI(() => {
      if (this._isMounted) {
        return this.setState({loadedGAPI: true})
      }
    })
  },

  componentDidMount() {
    this._isMounted = true
    if (this.state.loadedGAPI !== window._LoadedGAPIClients) {
      return this.setState({loadedGAPI: window._LoadedGAPIClients})
    }
  },

  componentWillUnmount() {
    return this._isMounted = false
  },

  authenticate() {
    return this.props.provider.authorize(GoogleDriveProvider.SHOW_POPUP)
  },

  render() {
    return (div({className: 'google-drive-auth'},
      (div({className: 'google-drive-concord-logo'}, '')),
      (div({className: 'google-drive-footer'},
        window._LoadedGAPIClients || this.state.loadedGAPI ?
          (button({onClick: this.authenticate}, (tr("~GOOGLE_DRIVE.LOGIN_BUTTON_LABEL"))))
        :
          (tr("~GOOGLE_DRIVE.CONNECTING_MESSAGE"))
      ))
    ))
  }
})

class GoogleDriveProvider extends ProviderInterface {
  static initClass() {
  
    this.Name = 'googleDrive'
  
    // aliases for boolean parameter to authorize
    this.IMMEDIATE = true
    this.SHOW_POPUP = false
  }

  constructor(options, client) {
    const opts = options || {}
    super({
      name: GoogleDriveProvider.Name,
      displayName: opts.displayName || (tr('~PROVIDER.GOOGLE_DRIVE')),
      urlDisplayName: opts.urlDisplayName,
      capabilities: {
        save: true,
        resave: true,
        "export": true,
        load: true,
        list: true,
        remove: false,
        rename: true,
        close: true,
        setFolder: true
      }
    })
    this.options = opts
    this.client = client
    this.authToken = null
    this.user = null
    this.clientId = this.options.clientId
    if (!this.clientId) {
      throw new Error((tr("~GOOGLE_DRIVE.ERROR_MISSING_CLIENTID")))
    }
    this.scopes = this.options.scopes || [
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/drive.install',
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/userinfo.profile'
    ]
    this.mimeType = this.options.mimeType || "text/plain"
    this.readableMimetypes = this.options.readableMimetypes
    this._loadGAPI()
  }

  authorized(authCallback) {
    if (!(authCallback == null)) { this.authCallback = authCallback }
    if (authCallback) {
      if (this.authToken) {
        return authCallback(true)
      } else {
        return this.authorize(GoogleDriveProvider.IMMEDIATE)
      }
    } else {
      return this.authToken !== null
    }
  }

  authorize(immediate) {
    return this._loadedGAPI(() => {
      const args = {
        client_id: this.clientId,
        scope: this.scopes,
        immediate
      }
      return gapi.auth.authorize(args, authToken => {
        this.authToken = authToken && !authToken.error ? authToken : null
        this.user = null
        this.autoRenewToken(this.authToken)
        if (this.authToken) {
          gapi.client.oauth2.userinfo.get().execute(user => {
            return this.user = user
          })
        }
        return (typeof this.authCallback === 'function' ? this.authCallback(this.authToken !== null) : undefined)
      })
    })
  }

  autoRenewToken(authToken) {
    if (this._autoRenewTimeout) {
      clearTimeout(this._autoRenewTimeout)
    }
    if (authToken && !authToken.error) {
      return this._autoRenewTimeout = setTimeout((() => this.authorize(GoogleDriveProvider.IMMEDIATE)), (parseInt(authToken.expires_in, 10) * 0.75) * 1000)
    }
  }

  renderAuthorizationDialog() {
    return (GoogleDriveAuthorizationDialog({provider: this}))
  }

  renderUser() {
    if (this.user) {
      return (span({className: 'gdrive-user'}, (span({className: 'gdrive-icon'})), this.user.name))
    } else {
      return null
    }
  }

  save(content, metadata, callback) {
    return this._loadedGAPI(() => {
      return this._saveFile(content, metadata, callback)
    })
  }

  load(metadata, callback) {
    return this._loadedGAPI(() => {
      return this._loadFile(metadata, callback)
    })
  }

  list(metadata, callback) {
    return this._loadedGAPI(() => {
      let query
      let mimeType
      const mimeTypesQuery = ((() => {
        const result = []
        for (mimeType of Array.from(this.readableMimetypes)) {           result.push(`mimeType = '${mimeType}'`)
        }
        return result
      })()).join(" or ")
      const request = gapi.client.drive.files.list({
        q: (query = `trashed = false and (${mimeTypesQuery} or mimeType = 'application/vnd.google-apps.folder') and '${metadata ? metadata.providerData.id : 'root'}' in parents`)})
      return request.execute(result => {
        if (!result || result.error) { return callback(this._apiError(result, 'Unable to list files')) }
        const list = []
        for (let item of Array.from((result != null ? result.items : undefined))) {
          const type = item.mimeType === 'application/vnd.google-apps.folder' ? CloudMetadata.Folder : CloudMetadata.File
          if ((type === CloudMetadata.Folder) || this.matchesExtension(item.title)) {
            list.push(new CloudMetadata({
              name: item.title,
              type,
              parent: metadata,
              overwritable: item.editable,
              provider: this,
              providerData: {
                id: item.id
              }
            })
            )
          }
        }
        list.sort(function(a, b) {
          const lowerA = a.name.toLowerCase()
          const lowerB = b.name.toLowerCase()
          if (lowerA < lowerB) { return -1 }
          if (lowerA > lowerB) { return 1 }
          return 0
        })
        return callback(null, list)
      })
    })
  }

  remove(metadata, callback) {
    return this._loadedGAPI(function() {
      const request = gapi.client.drive.files["delete"]({
        fileId: metadata.providerData.id})
      return request.execute(result => typeof callback === 'function' ? callback((result != null ? result.error : undefined) || null) : undefined)
    })
  }

  rename(metadata, newName, callback) {
    return this._loadedGAPI(function() {
      const request = gapi.client.drive.files.patch({
        fileId: metadata.providerData.id,
        resource: {
          title: CloudMetadata.withExtension(newName)
        }
      })
      return request.execute(function(result) {
        if (result != null ? result.error : undefined) {
          return (typeof callback === 'function' ? callback(result.error) : undefined)
        } else {
          metadata.rename(newName)
          return callback(null, metadata)
        }
      })
    })
  }

  close(metadata, callback) {}
    // nothing to do now that the realtime library was removed

  canOpenSaved() { return true }

  openSaved(openSavedParams, callback) {
    const metadata = new CloudMetadata({
      type: CloudMetadata.File,
      provider: this,
      providerData: {
        id: openSavedParams
      }
    })
    return this.load(metadata, (err, content) => callback(err, content, metadata))
  }

  getOpenSavedParams(metadata) {
    return metadata.providerData.id
  }

  isAuthorizationRequired() {
    return true
  }

  _loadGAPI() {
    if (!window._LoadingGAPI) {
      window._LoadingGAPI = true
      window._GAPIOnLoad = () => {
        window._LoadedGAPI = true
        // preload clients to avoid user delay later
        return this._loadedGAPI(function() {})
      }
      const script = document.createElement('script')
      script.src = 'https://apis.google.com/js/client.js?onload=_GAPIOnLoad'
      return document.head.appendChild(script)
    }
  }

  _loadedGAPI(callback) {
    if (window._LoadedGAPIClients) {
      return callback()
    } else {
      const self = this
      var check = function() {
        if (window._LoadedGAPI) {
          return gapi.client.load('drive', 'v2', () =>
            gapi.client.load('oauth2', 'v2', function() {
              window._LoadedGAPIClients = true
              return callback.call(self)
            })
          )
        } else {
          return setTimeout(check, 10)
        }
      }
      return setTimeout(check, 10)
    }
  }

  _loadFile(metadata, callback) {
    const request = gapi.client.drive.files.get({
      fileId: metadata.providerData.id})
    return request.execute(file => {
      if (file != null ? file.downloadUrl : undefined) {
        metadata.rename(file.title)
        metadata.overwritable = file.editable
        metadata.providerData = {id: file.id}
        metadata.mimeType = file.mimeType
        if ((metadata.parent == null) && ((file.parents != null ? file.parents.length : undefined) > 0)) {
          metadata.parent = new CloudMetadata({
            type: CloudMetadata.Folder,
            provider: this,
            providerData: {
              id: file.parents[0].id
            }
          })
        }
        var download = (url, fallback) => {
          const xhr = new XMLHttpRequest()
          xhr.open('GET', url)
          xhr.setRequestHeader("Authorization", `Bearer ${this.authToken.access_token}`)
          xhr.onload = () => callback(null, cloudContentFactory.createEnvelopedCloudContent(xhr.responseText))
          xhr.onerror = function() {
            // try second request after changing the domain (https://issuetracker.google.com/issues/149891169)
            if (fallback) {
              return download(url.replace(/^https:\/\/content\.googleapis\.com/, "https://www.googleapis.com"), false)
            } else {
              return callback("Unable to download file content")
            }
          }
          return xhr.send()
        }
        return download(file.downloadUrl, true)
      } else {
        return callback(this._apiError(file, 'Unable to get download url'))
      }
    })
  }

  _saveFile(content, metadata, callback) {
    const boundary = '-------314159265358979323846'
    const mimeType = metadata.mimeType || this.mimeType
    const header = JSON.stringify({
      title: metadata.filename,
      mimeType,
      parents: [{id: (__guard__(metadata.parent != null ? metadata.parent.providerData : undefined, x => x.id) != null) ? metadata.parent.providerData.id : 'root'}]})

    const [method, path] = Array.from((metadata.providerData != null ? metadata.providerData.id : undefined) ?
      ['PUT', `/upload/drive/v2/files/${metadata.providerData.id}`]
    :
      ['POST', '/upload/drive/v2/files'])

    let transferEncoding = ""
    if (mimeType.indexOf("image/") === 0) {
      // assume we're transfering any images as base64
      transferEncoding = "\r\nContent-Transfer-Encoding: base64"
    }

    const body = [
      `\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${header}`,
      `\r\n--${boundary}\r\nContent-Type: ${mimeType}${transferEncoding}\r\n\r\n${(typeof content.getContentAsJSON === 'function' ? content.getContentAsJSON() : undefined) || content}`,
      `\r\n--${boundary}--`
    ].join('')

    const request = gapi.client.request({
      path,
      method,
      params: {uploadType: 'multipart'},
      headers: {'Content-Type': `multipart/related; boundary="${boundary}"`},
      body
    })

    return request.execute(file => {
      if (callback) {
        if (file != null ? file.error : undefined) {
          return callback(`Unabled to upload file: ${file.error.message}`)
        } else if (file) {
          metadata.providerData = {id: file.id}
          return callback(null, file)
        } else {
          return callback(this._apiError(file, 'Unabled to upload file'))
        }
      }
    })
  }

  _apiError(result, prefix) {
    if ((result != null ? result.message : undefined) != null) {
      return `${prefix}: ${result.message}`
    } else {
      return prefix
    }
  }
}
GoogleDriveProvider.initClass()

module.exports = GoogleDriveProvider

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined
}