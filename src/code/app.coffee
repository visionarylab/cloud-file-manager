AppView = React.createFactory require './views/app-view'

CloudFileManagerUIMenu = (require './ui').CloudFileManagerUIMenu
CloudFileManagerClient = (require './client').CloudFileManagerClient

getHashParam = require './utils/get-hash-param'

class CloudFileManager

  constructor: (options) ->
    # since the module exports an instance of the class we need to fake a class variable as an instance variable
    @DefaultMenu = CloudFileManagerUIMenu.DefaultMenu

    @client = new CloudFileManagerClient()
    @appOptions = {}

  init: (@appOptions, usingIframe = false) ->
    @appOptions.usingIframe = usingIframe
    @client.setAppOptions @appOptions

  createFrame: (@appOptions, elemId, eventCallback = null) ->
    @init @appOptions, true
    @client.listen eventCallback
    @_renderApp document.getElementById(elemId)

  clientConnect: (eventCallback) ->
    if not @appOptions.usingIframe
      @_createHiddenApp()
    @client.listen eventCallback
    @client.connect()

    sharedContentId = getHashParam "shared"
    fileParams = getHashParam "file"
    copyParams = getHashParam "copy"
    if sharedContentId
      @client.openSharedContent sharedContentId
    else if fileParams
      [providerName, providerParams] = fileParams.split ':'
      @client.openProviderFile providerName, providerParams
    else if copyParams
      @client.openCopiedFile copyParams

  _createHiddenApp: ->
    anchor = document.createElement("div")
    document.body.appendChild(anchor)
    @_renderApp anchor

  _renderApp: (anchor) ->
    @appOptions.client = @client
    React.render (AppView @appOptions), anchor

module.exports = new CloudFileManager()
