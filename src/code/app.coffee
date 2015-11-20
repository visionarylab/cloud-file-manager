AppView  = React.createFactory require './views/app-view'

module.exports =

  createFrame: (options, elemId) ->
    React.render (AppView options), document.getElementById(elemId)

  frameLoaded: (frameOptions, callback) ->
