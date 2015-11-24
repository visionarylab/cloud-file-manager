AppView = React.createFactory require './views/app-view'

CloudFileManagerUIMenu = (require './ui').CloudFileManagerUIMenu
CloudFileManagerClient = (require './client').CloudFileManagerClient

class CloudFileManager

  @DefaultMenu: CloudFileManagerUIMenu.DefaultMenu

  @isUsingIframe: false

  constructor: (options) ->
    @client = new CloudFileManagerClient()

  init: (appOptions) ->
    @client.setAppOptions appOptions

  createFrame: (appOptions, elemId) ->
    @init appOptions
    appOptions.client = @client
    React.render (AppView appOptions), document.getElementById(elemId)
    @isUsingIframe = true

  _createHeadlessApp: ->
    anchor = document.createElement("div")
    anchor.setAttribute("class", "headless-file-manager")
    document.body.appendChild(anchor)
    React.render (AppView {headless: true, client: @client}), anchor

  clientConnect: (eventCallback) ->
    if not @isUsingIframe
      @_createHeadlessApp()
    @client.connect eventCallback

module.exports = new CloudFileManager()
