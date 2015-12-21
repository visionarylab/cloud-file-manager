{div, input} = React.DOM
tr = require '../utils/translate'

ProviderInterface = (require './provider-interface').ProviderInterface
cloudContentFactory = (require './provider-interface').cloudContentFactory
CloudMetadata = (require './provider-interface').CloudMetadata

LocalFileListTab = React.createFactory React.createClass

  displayName: 'LocalFileListTab'

  changed: (e) ->
    files = e.target.files
    if files.length > 1
      alert "Sorry, you can choose only one file to open."
    else if files.length is 1
      metadata = new CloudMetadata
        name: files[0].name.split('.')[0]
        type: CloudMetadata.File
        parent: null
        provider: @props.provider
        providerData:
          file: files[0]
      @props.dialog.callback? metadata
      @props.close()

  render: ->
    (div {className: 'dialogTab'},
      (input {type: 'file', onChange: @changed})
    )

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
