{div} = React.DOM

tr = require '../utils/translate'
isString = require '../utils/is-string'

ProviderInterface = (require './provider-interface').ProviderInterface
CloudMetadata = (require './provider-interface').CloudMetadata

{button} = React.DOM

AUTH =
  APP_ID : '1095918012594'
  DEVELOPER_KEY: 'AIzaSyAUobrEXqtbZHBvr24tamdE6JxmPYTRPEA'
  CLIENT_ID: '1095918012594-svs72eqfalasuc4t1p1ps1m8r9b8psso.apps.googleusercontent.com'
  SCOPES: 'https://www.googleapis.com/auth/drive'

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
        'Waiting for gapi...'
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
    @authToken = null
    @_loadGAPI()

  @Name: 'googleDrive'

  # aliases for boolean parameter to authorize
  @IMMEDIATE = true
  @SHOW_POPUP = false

  authorized: (@authCallback) ->
    if @authToken
      @authCallback true
    else
      @authorize GoogleDriveProvider.IMMEDIATE

  authorize: (immediate) ->
    @_loadedGAPI =>
      args =
        client_id: AUTH.CLIENT_ID
        scope: AUTH.SCOPES
        immediate: immediate
      gapi.auth.authorize args, (authToken) =>
        @authToken = if authToken and not authToken.error then authToken else null
        @authCallback @authToken isnt null

  renderAuthorizationDialog: ->
    (GoogleDriveAuthorizationDialog {provider: @})

  @_LoadingGAPI: false

  _loadGAPI: ->
    if not GoogleDriveProvider._LoadingGAPI
      GoogleDriveProvider._LoadingGAPI = true
      script = document.createElement 'script'
      script.src = 'https://apis.google.com/js/client.js'
      document.head.appendChild script

  _loadedGAPI: (callback) ->
    check = ->
      if window.gapi
        callback window.gapi
      else
        setTimeout check, 10
    setTimeout check, 10


module.exports = GoogleDriveProvider
