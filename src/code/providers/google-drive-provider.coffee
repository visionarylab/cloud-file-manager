{div} = React.DOM

tr = require '../utils/translate'
isString = require '../utils/is-string'

ProviderInterface = (require './provider-interface').ProviderInterface
CloudMetadata = (require './provider-interface').CloudMetadata

GoogleDriveAuthorizationDialog = React.createFactory React.createClass
  displayName: 'GoogleDriveAuthorizationDialog'
  render: ->
    (div {}, "TODO: GoogleDriveAuthorizationDialog")

class GoogleDriveProvider extends ProviderInterface

  constructor: (@options = {}) ->
    super
      name: GoogleDriveProvider.Name
      displayName: @options.displayName or (tr '~PROVIDER.GOOGLE_DRIVE')
      capabilities:
        save: true
        load: true
        list: true

  @Name: 'googleDrive'

  authorized: (callback) ->
    callback false

  authorizationDialog: GoogleDriveAuthorizationDialog

module.exports = GoogleDriveProvider
