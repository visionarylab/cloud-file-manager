{div, button} = React.DOM

authorizeUrl  = "http://document-store.herokuapp.com/user/authenticate"
checkLoginUrl = "http://document-store.herokuapp.com/user/info"

tr = require '../utils/translate'
isString = require '../utils/is-string'

ProviderInterface = (require './provider-interface').ProviderInterface
CloudMetadata = (require './provider-interface').CloudMetadata

DocumentStoreAuthorizationDialog = React.createFactory React.createClass
  displayName: 'DocumentStoreAuthorizationDialog'

  authenticate: ->
    @props.provider.authorize()

  render: ->
    (div {},
      (button {onClick: @authenticate}, 'Authorization Needed')
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

  authorize: ->
    @_showLoginWindow()
    @_checkLogin()

  _loginSuccessful: (data) ->
    if @_loginWindow then @_loginWindow.close()
    alert("Welcome #{data.name}")
    @authCallback true

  _checkLogin: ->
    provider = @
    $.ajax
      dataType: 'json'
      url: checkLoginUrl
      xhrFields:
        withCredentials: true
      success: (data) ->
        provider._loginSuccessful(data)
      error: ->
        # nothing yet

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
          console.log e

      poll = setInterval pollAction, 200

  renderAuthorizationDialog: ->
    (DocumentStoreAuthorizationDialog {provider: @, authCallback: @authCallback})

module.exports = DocumentStoreProvider
