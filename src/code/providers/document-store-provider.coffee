{div, button} = React.DOM

documentStore = "http://document-store.herokuapp.com"
authorizeUrl     = "#{documentStore}/user/authenticate"
checkLoginUrl    = "#{documentStore}/user/info"
listUrl          = "#{documentStore}/document/all"
loadDocumentUrl      = "#{documentStore}/document/open"
saveDocumentUrl      = "#{documentStore}/document/save"

tr = require '../utils/translate'
isString = require '../utils/is-string'

ProviderInterface = (require './provider-interface').ProviderInterface
CloudMetadata = (require './provider-interface').CloudMetadata

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
    (div {},
      if @state.docStoreAvailable
        (button {onClick: @authenticate}, 'Authorization Needed')
      else
        'Trying to log into the Document Store...'
    )

class DocumentStoreProvider extends ProviderInterface

  constructor: (@options = {}) ->
    super
      name: DocumentStoreProvider.Name
      displayName: @options.displayName or (tr '~PROVIDER.DOCUMENT_STORE')
      capabilities:
        save: true
        load: true
        list: true

  @Name: 'documentStore'

  authorized: (@authCallback) ->
    @_checkLogin()

  authorize: ->
    @_showLoginWindow()

  _onDocStoreLoaded: (@docStoreLoadedCallback) ->
    if @_docStoreLoaded
      @docStoreLoadedCallback()

  _loginSuccessful: (data) ->
    if @_loginWindow then @_loginWindow.close()
    @authCallback true

  _checkLogin: ->
    provider = @
    $.ajax
      dataType: 'json'
      url: checkLoginUrl
      xhrFields:
        withCredentials: true
      success: (data) ->
        provider.docStoreLoadedCallback()
        provider._loginSuccessful(data)
      error: ->
        provider.docStoreLoadedCallback()

  _loginWindow: null

  _showLoginWindow: ->
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

      @_loginWindow = window.open(authorizeUrl, 'auth', windowFeatures.join())

      pollAction = =>
        try
          href = @_loginWindow.location.href
          if (href is window.location.href)
            clearInterval poll
            @_loginWindow.close()
            @_checkLogin()
        catch e
          # console.log e

      poll = setInterval pollAction, 200

  renderAuthorizationDialog: ->
    (DocumentStoreAuthorizationDialog {provider: @, authCallback: @authCallback})

  list: (metadata, callback) ->
    $.ajax
      dataType: 'json'
      url: listUrl
      context: @
      xhrFields:
        withCredentials: true
      success: (data) ->
        list = []
        for own key, file of data
          list.push new CloudMetadata
            name: file.name
            fileId: file.id
            type: CloudMetadata.File
            provider: @
        callback null, list
      error: ->
        callback null, []

  load: (metadata, callback) ->
    $.ajax
      dataType: 'json'
      url: loadDocumentUrl
      data:
        recordid: metadata.fileId
      context: @
      xhrFields:
        withCredentials: true
      success: (data) ->
        callback null, data
      error: ->
        callback "Unable to load "+metadata.name

  save: (content, metadata, callback) ->
    content = @_validateContent content

    params = {}
    if metadata.fileId then params.recordid = metadata.fileId
    if metadata.name then params.recordname = metadata.name

    url = @_addParams(saveDocumentUrl, params)

    $.ajax
      dataType: 'json'
      method: 'POST'
      url: url
      data: content
      context: @
      xhrFields:
        withCredentials: true
      success: (data) ->
        if data.id then metadata.fileId = data.id
        callback null, data
      error: ->
        callback "Unable to load "+metadata.name

  _addParams: (url, params) ->
    return url unless params
    kvp = []
    for key, value of params
      kvp.push [key, value].map(encodeURI).join "="
    return url + "?" + kvp.join "&"

  # The document server requires the content to be JSON, and it must have
  # certain pre-defined keys in order to be listed when we query the list
  _validateContent: (content) ->
    if typeof content isnt "object"
      try
        content = JSON.parse content
      catch
        content = {content: content}
    content.appName     ?= @options.appName
    content.appVersion  ?= @options.appVersion
    content.appBuildNum ?= @options.appBuildNum

    return JSON.stringify content


module.exports = DocumentStoreProvider
