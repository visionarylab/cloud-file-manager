AppView  = React.createFactory require './views/app-view'


module.exports =

  createFrame: (opts, elemId) ->
    appView = AppView opts
    React.render appView, document.getElementById(elemId)
