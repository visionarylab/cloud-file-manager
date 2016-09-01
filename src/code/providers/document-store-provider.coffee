{div, button, span} = React.DOM

tr = require '../utils/translate'
isString = require '../utils/is-string'
jiff = require 'jiff'
pako = require 'pako'

ProviderInterface = (require './provider-interface').ProviderInterface
cloudContentFactory = (require './provider-interface').cloudContentFactory
CloudMetadata = (require './provider-interface').CloudMetadata

DocumentStoreUrl = require './document-store-url'

DocumentStoreAuthorizationDialog = React.createFactory React.createClass
  displayName: 'DocumentStoreAuthorizationDialog'

  getInitialState: ->
    docStoreAvailable: false

  componentWillMount: ->
    @props.provider._onDocStoreLoaded =>
      @setState docStoreAvailable: true

  authenticate: ->
    @props.provider.authorize()

  render: ->
    (div {className: 'document-store-auth'},
      (div {className: 'document-store-concord-logo'}, '')
      (div {className: 'document-store-footer'},
        if @state.docStoreAvailable
          (button {onClick: @authenticate}, 'Login to Concord')
        else
          'Trying to log into Concord...'
      )
    )

class DocumentStoreProvider extends ProviderInterface

  constructor: (@options = {}, @client) ->
    super
      name: DocumentStoreProvider.Name
      displayName: @options.displayName or (tr '~PROVIDER.DOCUMENT_STORE')
      urlDisplayName: @options.urlDisplayName
      capabilities:
        save: true
        load: true
        list: true
        remove: true
        rename: true
        close: false

    @docStoreUrl = new DocumentStoreUrl @client.appOptions.hashParams.documentServer

    @user = null

  @Name: 'documentStore'

  previouslySavedContent: null

  # if 'runAsGuest' is specified, we don't need to authenticate at all
  isAuthorizationRequired: ->
    not (@client.appOptions.hashParams.runKey and @client.appOptions.hashParams.runAsGuest)

  authorized: (@authCallback) ->
    if @authCallback
      if @user
        @authCallback true
      else
        @_checkLogin()
    else
      @user isnt null

  authorize: (completionCallback) ->
    @_showLoginWindow(completionCallback)

  _onDocStoreLoaded: (@docStoreLoadedCallback) ->
    if @_docStoreLoaded
      @docStoreLoadedCallback()

  _checkLogin: ->
    loggedIn = (user) =>
      @user = user
      @_docStoreLoaded = true
      @docStoreLoadedCallback?()
      if user
        @_loginWindow?.close()
      @authCallback (user isnt null) if @authCallback

    $.ajax
      dataType: 'json'
      url: @docStoreUrl.checkLogin()
      xhrFields:
        withCredentials: true
      success: (data) -> loggedIn data
      error: -> loggedIn null

  _loginWindow: null

  _showLoginWindow: (completionCallback) ->
    if @_loginWindow and not @_loginWindow.closed
      @_loginWindow.focus()
    else

      computeScreenLocation = (w, h) ->
        screenLeft = window.screenLeft or screen.left
        screenTop  = window.screenTop  or screen.top
        width  = window.innerWidth  or document.documentElement.clientWidth  or screen.width
        height = window.innerHeight or document.documentElement.clientHeight or screen.height

        left = ((width / 2) - (w / 2)) + screenLeft
        top = ((height / 2) - (h / 2)) + screenTop
        return {left, top}

      width = 1000
      height = 480
      position = computeScreenLocation width, height
      windowFeatures = [
        'width=' + width
        'height=' + height
        'top=' + position.top or 200
        'left=' + position.left or 200
        'dependent=yes'
        'resizable=no'
        'location=no'
        'dialog=yes'
        'menubar=no'
      ]

      @_loginWindow = window.open(@docStoreUrl.authorize(), 'auth', windowFeatures.join())

      if @_loginWindow
        pollAction = =>
          try
            if (@_loginWindow.location.host is window.location.host)
              clearInterval poll
              @_loginWindow.close()
              @_checkLogin()
              completionCallback() if completionCallback
          catch e
            # console.log e

        poll = setInterval pollAction, 200

    @_loginWindow

  renderAuthorizationDialog: ->
    (DocumentStoreAuthorizationDialog {provider: @, authCallback: @authCallback})

  renderUser: ->
    if @user
      (span {}, (span {className: 'document-store-icon'}), @user.name)
    else
      null

  list: (metadata, callback) ->
    $.ajax
      dataType: 'json'
      url: @docStoreUrl.listDocuments()
      context: @
      xhrFields:
        withCredentials: true
      success: (data) ->
        list = []
        for own key, file of data
          if @matchesExtension file.name
            list.push new CloudMetadata
              name: file.name
              providerData: {id: file.id}
              type: CloudMetadata.File
              provider: @
        callback null, list
      error: ->
        callback null, []
      statusCode:
        403: =>
          @user = null
          @authCallback false

  load: (metadata, callback) ->
    withCredentials = unless metadata.sharedContentId then true else false
    $.ajax
      url: @docStoreUrl.loadDocument()
      dataType: 'json'
      data:
        recordid: metadata.providerData?.id or metadata.sharedContentId
        runKey: if @client.appOptions.hashParams.runKey then @client.appOptions.hashParams.runKey else undefined
      context: @
      xhrFields:
        {withCredentials}
      success: (data) ->
        content = cloudContentFactory.createEnvelopedCloudContent data

        # for documents loaded by id or other means (besides name),
        # capture the name for use in the CFM interface.
        # 'docName' at the top level for CFM-wrapped documents
        # 'name' at the top level for unwrapped documents (e.g. CODAP)
        # 'name' at the top level of 'content' for wrapped CODAP documents
        metadata.rename metadata.name or data.docName or data.name or data.content?.name
        if metadata.name
          content.addMetadata docName: metadata.filename

        callback null, content
      statusCode:
        403: =>
          @user = null
          callback "Unable to load '#{metadata.name}' due to a permissions error.\nYou may need to log in again.", 403
      error: (jqXHR) ->
        return if jqXHR.status is 403 # let statusCode handler deal with it
        message = if metadata.sharedContentId
          "Unable to load document '#{metadata.sharedContentId}'. Perhaps the file was not shared?"
        else
          "Unable to load #{metadata.name or metadata.providerData?.id or 'file'}"
        callback message

  save: (cloudContent, metadata, callback) ->
    content = cloudContent.getContent()

    params = {}
    if metadata.providerData.id then params.recordid = metadata.providerData.id
    # pass the runKey if one is provided
    if @client.appOptions.hashParams.runKey
      params.runKey = @client.appOptions.hashParams.runKey

    # See if we can patch
    willPatch = false
    mimeType = 'application/json' # Document Store requires JSON currently
    contentJson = JSON.stringify content
    canOverwrite = metadata.overwritable and @previouslySavedContent?
    if canOverwrite and diff = @_createDiff @previouslySavedContent, content
      diffJson = JSON.stringify diff
    # only patch if the diff is smaller than saving the entire file
    # e.g. when large numbers of cases are deleted the diff can be larger
    if diff? and diffJson.length < contentJson.length
      if diff.length is 0
        # no reason to patch if there are no diffs
        callback null # no error indicates success
        return
      sendContent = diffJson
      mimeType = 'application/json-patch+json'
      willPatch = true
    else
      if metadata.filename then params.recordname = metadata.filename
      sendContent = contentJson

    if not willPatch
      # If we are saving for the first time as a student in a LARA activity, then we do not have
      # authorization on the current document. However, we should have a runKey query parameter.
      # When we save with this runKey, the document will save our changes to a copy of the document,
      # owned by us.
      #
      # When we successfully save, we will get the id of the new document in the response, and use
      # this id for future saving. We can then save via patches, and don't need the runKey.
      #
      # `willPatch` will always be false for an individual user's first save of a session. There
      # does not seem to be a way to see if we've launched a document that we own, so we just
      # assume we don't own it.
      if @client.appOptions.hashParams.runKey
        params.runKey = @client.appOptions.hashParams.runKey

    $.ajax
      dataType: 'json'
      type: 'POST'
      url: if willPatch then @docStoreUrl.patchDocument(params) else @docStoreUrl.saveDocument(params)
      data: pako.deflate sendContent
      contentType: mimeType
      processData: false
      beforeSend: (xhr) ->
        xhr.setRequestHeader('Content-Encoding', 'deflate')
      context: @
      xhrFields:
        withCredentials: true
      success: (data) ->
        @previouslySavedContent = if @options.patch then _.cloneDeep(content) else null
        if data.id then metadata.providerData.id = data.id

        callback null, data
      statusCode:
        403: =>
          @user = null
          callback "Unable to save '#{metadata.name}' due to a permissions error.\nYou may need to log in again.", 403
      error: (jqXHR) ->
        try
          return if jqXHR.status is 403 # let statusCode handler deal with it
          responseJson = JSON.parse jqXHR.responseText
          if responseJson.message is 'error.duplicate'
            callback "Unable to create #{metadata.name}.  File already exists."
          else
            callback "Unable to save #{metadata.name}: [#{responseJson.message}]"
        catch
          callback "Unable to save #{metadata.name}"

  remove: (metadata, callback) ->
    $.ajax
      url: @docStoreUrl.deleteDocument()
      data:
        recordname: metadata.filename
      context: @
      xhrFields:
        withCredentials: true
      success: (data) ->
        callback null, data
      statusCode:
        403: =>
          @user = null
          callback "Unable to remove '#{metadata.name}' due to a permissions error.\nYou may need to log in again.", 403
      error: (jqXHR) ->
        return if jqXHR.status is 403 # let statusCode handler deal with it
        callback "Unable to remove #{metadata.name}"

  rename: (metadata, newName, callback) ->
    $.ajax
      url: @docStoreUrl.renameDocument()
      data:
        recordid: metadata.providerData.id
        newRecordname: CloudMetadata.withExtension newName
      context: @
      xhrFields:
        withCredentials: true
      success: (data) ->
        metadata.rename newName
        callback null, metadata
      statusCode:
        403: =>
          @user = null
          callback "Unable to rename '#{metadata.name}' due to a permissions error.\nYou may need to log in again.", 403
      error: (jqXHR) ->
        return if jqXHR.status is 403 # let statusCode handler deal with it
        callback "Unable to rename #{metadata.name}"

  canOpenSaved: -> true

  openSaved: (openSavedParams, callback) ->
    metadata = new CloudMetadata
      type: CloudMetadata.File
      provider: @
      providerData:
        id: openSavedParams
    @load metadata, (err, content) ->
      callback err, content, metadata

  getOpenSavedParams: (metadata) ->
    metadata.providerData.id

  _createDiff: (obj1, obj2) ->
    try
      opts = {
        hash: @options.patchObjectHash if typeof @options.patchObjectHash is "function"
        invertible: false # smaller patches are worth more than invertibility
      }
      # clean objects before diffing
      cleanedObj1 = JSON.parse JSON.stringify obj1
      cleanedObj2 = JSON.parse JSON.stringify obj2
      diff = jiff.diff(cleanedObj1, cleanedObj2, opts)
      return diff
    catch
      return null

module.exports = DocumentStoreProvider
