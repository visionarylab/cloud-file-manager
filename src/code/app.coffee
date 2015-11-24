AppView = React.createFactory require './views/app-view'

CloudFileManagerUIMenu = (require './ui').CloudFileManagerUIMenu
CloudFileManagerClient = (require './client').CloudFileManagerClient

class CloudFileManager

  @DefaultMenu: CloudFileManagerUIMenu.DefaultMenu

  constructor: (options) ->
    @client = new CloudFileManagerClient()

  setAppOptions: (appOptions) ->
    @client.setAppOptions appOptions

  createFrame: (appOptions, elemId) ->
    @setAppOptions appOptions
    appOptions.client = @client
    React.render (AppView appOptions), document.getElementById(elemId)

  clientConnect: (eventCallback) ->
    @client.connect eventCallback

module.exports = new CloudFileManager()
