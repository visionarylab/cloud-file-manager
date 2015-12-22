{div, input, button} = React.DOM
tr = require '../utils/translate'

ProviderInterface = (require './provider-interface').ProviderInterface
cloudContentFactory = (require './provider-interface').cloudContentFactory
LocalFileListTab = React.createFactory require '../views/local-file-tab-view'

class LocalFileProvider extends ProviderInterface

  constructor: (@options = {}, @client) ->
    super
      name: LocalFileProvider.Name
      displayName: @options.displayName or (tr '~PROVIDER.LOCAL_FILE')
      capabilities:
        save: false
        load: true
        list: true
        remove: false
        rename: false
        close: false

  @Name: 'localFile'

  filterTabComponent: (capability, defaultComponent) ->
    if capability is 'list'
      LocalFileListTab
    else
      defaultComponent

  list: (metadata, callback) ->
    # no really implemented - we flag it as implemented so we show in the list dialog

  load: (metadata, callback) ->
    reader = new FileReader()
    reader.onload = (loaded) ->
      callback null, cloudContentFactory.createEnvelopedCloudContent loaded.target.result
    reader.readAsText metadata.providerData.file

  canOpenSaved: ->
    # this prevents the hash to be updated
    false

module.exports = LocalFileProvider
