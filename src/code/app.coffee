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

  # usingIframe: if true, client app is wrapped in an iframe within the CFM-managed div
  # appOrMenuElemId: if appOrMenuElemId is passed and usingIframe is true, then the CFM
  #   presents its UI and the wrapped client app within the specified element. If
  #   appOrMenuElemId is set and usingIframe is false, then the CFM presents its menubar
  #   UI within the specified element, but there is no iframe or wrapped client app.
  init: (@appOptions) ->
    @appOptions.hashParams = {
      sharedContentId: getHashParam "shared"
      fileParams: getHashParam "file"
      copyParams: getHashParam "copy"
      newInFolderParams: getHashParam "newInFolder"
    }

    @client.setAppOptions @appOptions

  # Convenience function for setting up CFM with an iframe-wrapped client app
  createFrame: (@appOptions, appElemId, eventCallback = null) ->
    @appOptions.usingIframe = true
    @appOptions.appOrMenuElemId = appElemId
    @init @appOptions
    @client.listen eventCallback
    @_renderApp document.getElementById(appElemId)

  clientConnect: (eventCallback) ->
    try
      if @appOptions.appOrMenuElemId?
        @_renderApp document.getElementById(@appOptions.appOrMenuElemId)
      else
        @_createHiddenApp()
    catch e
      console.error "Unable render app: #{e}"
    @client.listen eventCallback
    @client.connect()

    # open any initial document (if any specified) and signal ready()
    @client.processUrlParams()

    # if iframed let the parent know about the connect
    if window.parent
      window.parent.postMessage({type: "cfm::iframedClientConnected"})

  _createHiddenApp: ->
    anchor = document.createElement("div")
    document.body.appendChild(anchor)
    @_renderApp anchor

  _renderApp: (anchor) ->
    @appOptions.client = @client
    ReactDOM.render (AppView @appOptions), anchor
    @client.iframe = anchor.getElementsByTagName('iframe')[0]
    @client.rendered()

module.exports = new CloudFileManager()
