{div, button, span} = React.DOM

tr = require '../utils/translate'
isString = require '../utils/is-string'
jsdiff = require 'diff'

ProviderInterface = (require './provider-interface').ProviderInterface
CloudContent = (require './provider-interface').CloudContent
CloudMetadata = (require './provider-interface').CloudMetadata

class RealTimeInfo extends Error
  constructor: -> @name = 'RealTimeInfo'

class RealTimeError extends Error
  constructor: -> @name = 'RealTimeError'

GoogleDriveAuthorizationDialog = React.createFactory React.createClass
  displayName: 'GoogleDriveAuthorizationDialog'

  getInitialState: ->
    loadedGAPI: false

  componentWillMount: ->
    @props.provider._loadedGAPI =>
      @setState loadedGAPI: true

  authenticate: ->
    @props.provider.authorize GoogleDriveProvider.SHOW_POPUP

  render: ->
    (div {},
      if @state.loadedGAPI
        (button {onClick: @authenticate}, 'Authorization Needed')
      else
        'Waiting for the Google Client API to load...'
    )

class GoogleDriveProvider extends ProviderInterface

  constructor: (@options = {}) ->
    super
      name: GoogleDriveProvider.Name
      displayName: @options.displayName or (tr '~PROVIDER.GOOGLE_DRIVE')
      capabilities:
        save: true
        load: true
        list: true
        remove: true
        rename: true
        close: true

    @authToken = null
    @user = null
    @clientId = @options.clientId
    if not @clientId
      throw new Error 'Missing required clientId in googleDrive provider options'
    @mimeType = @options.mimeType or "text/plain"
    @useRealTimeAPI = @options.useRealTimeAPI or false
    if @useRealTimeAPI
      @mimeType += '+cfm_realtime'
    @_loadGAPI()

  @Name: 'googleDrive'

  # aliases for boolean parameter to authorize
  @IMMEDIATE = true
  @SHOW_POPUP = false

  authorized: (@authCallback) ->
    if @authCallback
      if @authToken
        @authCallback true
      else
        @authorize GoogleDriveProvider.IMMEDIATE
    else
      @authToken isnt null

  authorize: (immediate) ->
    @_loadedGAPI =>
      args =
        client_id: @clientId
        scope: ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/userinfo.profile']
        immediate: immediate
      gapi.auth.authorize args, (authToken) =>
        @authToken = if authToken and not authToken.error then authToken else null
        @user = null
        @autoRenewToken @authToken
        if @authToken
          gapi.client.oauth2.userinfo.get().execute (user) =>
            @user = user
        @authCallback @authToken isnt null

  autoRenewToken: (authToken) ->
    if @_autoRenewTimeout
      clearTimeout @_autoRenewTimeout
    if authToken and not authToken.error
      @_autoRenewTimeout = setTimeout (=> @authorize GoogleDriveProvider.IMMEDIATE), (parseInt(authToken.expires_in, 10) * 0.75) * 1000

  renderAuthorizationDialog: ->
    (GoogleDriveAuthorizationDialog {provider: @})

  renderUser: ->
    if @user
      (span {}, (span {className: 'gdrive-icon'}), @user.name)
    else
      null

  save:  (content, metadata, callback) ->
    @_loadedGAPI =>
      if @useRealTimeAPI
        @_saveRealTimeFile content, metadata, callback
      else
        @_saveFile content, metadata, callback

  load: (metadata, callback) ->
    @_loadedGAPI =>
      if @useRealTimeAPI
        @_loadOrCreateRealTimeFile metadata, callback
      else
        @_loadFile metadata, callback

  list: (metadata, callback) ->
    @_loadedGAPI =>
      request = gapi.client.drive.files.list
        q: query = "((mimeType = '#{@mimeType}') or (mimeType = 'application/vnd.google-apps.folder')) and '#{if metadata then metadata.providerData.id else 'root'}' in parents"
      request.execute (result) =>
        return callback('Unable to list files') if not result
        list = []
        for item in result?.items
          list.push new CloudMetadata
            name: item.title
            type: if item.mimeType is 'application/vnd.google-apps.folder' then CloudMetadata.Folder else CloudMetadata.File
            parent: metadata
            overwritable: item.editable
            provider: @
            providerData:
              id: item.id
        list.sort (a, b) ->
          lowerA = a.name.toLowerCase()
          lowerB = b.name.toLowerCase()
          return -1 if lowerA < lowerB
          return 1 if lowerA > lowerB
          return 0
        callback null, list

  remove: (metadata, callback) ->
    @_loadedGAPI ->
      request = gapi.client.drive.files.delete
        fileId: metadata.providerData.id
      request.execute (result) ->
        callback? result?.error or null

  rename: (metadata, newName, callback) ->
    @_loadedGAPI ->
      request = gapi.client.drive.files.patch
        fileId: metadata.providerData.id
        resource:
          title: newName
      request.execute (result) ->
        if result?.error
          callback? result.error
        else
          metadata.name = newName
          callback null, metadata

  close: (metadata, callback) ->
    if metadata.providerData?.realTime?.doc?
      metadata.providerData.realTime.doc.close()

  _loadGAPI: ->
    if not window._LoadingGAPI
      window._LoadingGAPI = true
      window._GAPIOnLoad = ->
        @window._LoadedGAPI = true
      script = document.createElement 'script'
      script.src = 'https://apis.google.com/js/client.js?onload=_GAPIOnLoad'
      document.head.appendChild script

  _loadedGAPI: (callback) ->
    if window._LoadedGAPIClients
      callback()
    else
      self = @
      check = ->
        if window._LoadedGAPI
          gapi.client.load 'drive', 'v2', ->
            gapi.client.load 'oauth2', 'v2', ->
              gapi.load 'drive-realtime', ->
                window._LoadedGAPIClients = true
                callback.call self
        else
          setTimeout check, 10
      setTimeout check, 10

  _loadFile: (metadata, callback) ->
    request = gapi.client.drive.files.get
      fileId: metadata.providerData.id
    request.execute (file) =>
      if file?.downloadUrl
        xhr = new XMLHttpRequest()
        xhr.open 'GET', file.downloadUrl
        if @authToken
          xhr.setRequestHeader 'Authorization', "Bearer #{@authToken.access_token}"
        xhr.onload = ->
          callback null, new CloudContent xhr.responseText
        xhr.onerror = ->
          callback "Unable to download #{url}"
        xhr.send()
      else
        callback 'Unable to get download url'

  _saveFile: (content, metadata, callback) ->
    boundary = '-------314159265358979323846'
    header = JSON.stringify
      title: metadata.name
      mimeType: @mimeType
      parents: [{id: if metadata.parent?.providerData?.id? then metadata.parent.providerData.id else 'root'}]
    header = JSON.stringify headerData

    [method, path] = if metadata.providerData?.id
      ['PUT', "/upload/drive/v2/files/#{metadata.providerData.id}"]
    else
      ['POST', '/upload/drive/v2/files']

    body = [
      "\r\n--#{boundary}\r\nContent-Type: application/json\r\n\r\n#{header}",
      "\r\n--#{boundary}\r\nContent-Type: #{@mimeType}\r\n\r\n#{content.getText()}",
      "\r\n--#{boundary}--"
    ].join ''

    request = gapi.client.request
      path: path
      method: method
      params: {uploadType: 'multipart'}
      headers: {'Content-Type': 'multipart/related; boundary="' + boundary + '"'}
      body: body

    request.execute (file) ->
      if callback
        if file?.error
          callback "Unabled to upload file: #{file.error.message}"
        else if file
          callback null, file
        else
          callback 'Unabled to upload file'

  _loadOrCreateRealTimeFile: (metadata, callback) ->
    fileLoaded = (doc) ->
      content = doc.getModel().getRoot().get 'content'
      if metadata.overwritable
        throwError = (e) ->
          if not e.isLocal
            throw new RealTimeError 'Another user has made edits to this file'
        #content.addEventListener gapi.drive.realtime.EventType.TEXT_INSERTED, throwError
        #content.addEventListener gapi.drive.realtime.EventType.TEXT_DELETED, throwError
      metadata.providerData.realTime =
        doc: doc
        content: content
      callback null, new CloudContent content.getText()

    init = (model) ->
      content = model.createString ''
      model.getRoot().set 'content', content

    error = (err) =>
      if err.type is 'TOKEN_REFRESH_REQUIRED'
        @authorize GoogleDriveProvider.IMMEDIATE
      else
        alert err.message

    if metadata.providerData?.id
      request = gapi.client.drive.files.get
        fileId: metadata.providerData.id
    else
      request = gapi.client.drive.files.insert
        title: metadata.name
        mimeType: @mimeType
        parents: [{id: if metadata.parent?.providerData?.id? then metadata.parent.providerData.id else 'root'}]

    request.execute (file) ->
      if file?.id
        metadata.overwritable = file.editable
        metadata.providerData = id: file.id
        gapi.drive.realtime.load file.id, fileLoaded, init, error
      else
        callback 'Unable to load file'

  _saveRealTimeFile: (content, metadata, callback) ->
    if metadata.providerData?.model
      @_diffAndUpdateRealTimeModel content, metadata, callback
    else
      @_loadOrCreateRealTimeFile metadata, (err) =>
        return callback err if err
        @_diffAndUpdateRealTimeModel content, metadata, callback

  _diffAndUpdateRealTimeModel: (content, metadata, callback) ->
    index = 0
    realTimeContent = metadata.providerData.realTime.content
    diffs = jsdiff.diffChars realTimeContent.getText(), content.getText()
    for diff in diffs
      if diff.removed
        realTimeContent.removeRange index, index + diff.value.length
      else
        if diff.added
          realTimeContent.insertString index, diff.value
        index += diff.count
    callback null

module.exports = GoogleDriveProvider
