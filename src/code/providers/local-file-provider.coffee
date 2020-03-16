{createReactFactory} = require '../utils/react'
{div, input, button} = React.DOM
tr = require '../utils/translate'

ProviderInterface = (require './provider-interface').ProviderInterface
cloudContentFactory = (require './provider-interface').cloudContentFactory
LocalFileListTab = createReactFactory require '../views/local-file-tab-list-view'
LocalFileSaveTab = createReactFactory require '../views/local-file-tab-save-view'

class LocalFileProvider extends ProviderInterface

  constructor: (@options = {}, @client) ->
    super
      name: LocalFileProvider.Name
      displayName: @options.displayName or (tr '~PROVIDER.LOCAL_FILE')
      capabilities:
        save: true
        resave: false
        export: true
        load: true
        list: true
        remove: false
        rename: false
        close: false

  @Name: 'localFile'

  filterTabComponent: (capability, defaultComponent) ->
    if capability is 'list'
      LocalFileListTab
    else if (capability is 'save') or (capability is 'export')
      LocalFileSaveTab
    else
      defaultComponent

  list: (metadata, callback) ->
    # not really implemented - we flag it as implemented so we show in the list dialog

  save: (content, metadata, callback) ->
    # not really implemented - we flag it as implemented so we can add the download button to the save dialog
    callback? null

  load: (metadata, callback) ->
    reader = new FileReader()
    reader.onload = (loaded) ->
      callback null, cloudContentFactory.createEnvelopedCloudContent loaded.target.result
    reader.readAsText metadata.providerData.file

  canOpenSaved: ->
    # this prevents the hash to be updated
    false

module.exports = LocalFileProvider
