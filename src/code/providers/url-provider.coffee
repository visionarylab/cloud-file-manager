ProviderInterface = (require './provider-interface').ProviderInterface
cloudContentFactory = (require './provider-interface').cloudContentFactory
CloudMetadata = (require './provider-interface').CloudMetadata

# This provider gets created by the client when needed to open a url directly.
# It cannot be added as one of the app's list of providers

class URLProvider extends ProviderInterface

  constructor: (options = {}, client) ->
    super
      capabilities:
        save: false
        resave: false
        export: false
        load: false
        list: false
        remove: false
        rename: false
        close: false
    @options = options
    @client = client

  canOpenSaved: -> false

  openFileFromUrl: (url, callback) ->
    metadata = new CloudMetadata
      type: CloudMetadata.File
      url: url
      parent: null
      provider: @

    $.ajax
      dataType: 'json'
      url: metadata.url
      success: (data) ->
        callback null, cloudContentFactory.createEnvelopedCloudContent(data), metadata
      error: -> callback "Unable to load document from '#{metadata.url}'"

module.exports = URLProvider
