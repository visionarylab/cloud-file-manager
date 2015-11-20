class File
  contructor: (options) ->
    {@content, @metadata} = options

class Metadata
  contructor: (options) ->
    {@name, @path, @type} = options
  @Folder: 'folder'
  @File: 'file'

class ProviderInterface

  constructor: (options) ->
    {@name, @displayName, @capabilities} = options
    @user = null

  @Available: -> true

  auth: (callback) ->
    @_notImplemented 'auth'

  save: (content, metadata, callback) ->
    @_notImplemented 'save'

  load: (callback) ->
    @_notImplemented 'load'

  list: (metadata, callback) ->
    @_notImplemented 'list'

  _notImplemented: (methodName) ->
    throw new Error("#{methodName} not implemented for #{@name} provider")
