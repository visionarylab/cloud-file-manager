AppView = React.createFactory require './views/app-view'

CloudFileManagerUIMenu = (require './ui').CloudFileManagerUIMenu
CloudFileManagerClient = (require './client').CloudFileManagerClient

class CloudFileManager

  @DefaultMenu: CloudFileManagerUIMenu.DefaultMenu

  constructor: (options) ->
    @client = new CloudFileManagerClient()

  setAppOptions: (appCptions) ->
    @client.setAppOptions appCptions

  createFrame: (appCptions, elemId) ->
    @setAppOptions appCptions
    appCptions.client = @client
    React.render (AppView appCptions), document.getElementById(elemId)

  clientConnect: (clientOptions, eventCallback) ->
    @client.connect  clientOptions, eventCallback

module.exports = new CloudFileManager()
