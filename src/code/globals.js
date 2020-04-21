// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
// global vars

require('es6-promise').polyfill()
global._ = require('lodash')
global.$ = require('jquery')
global.React = require('react')
global.ReactDOM = require('react-dom')
global.ReactDOMFactories = require('react-dom-factories')

// https://reactjs.org/docs/react-without-es6.html
global.createReactClass = require('create-react-class')

// https://reactjs.org/blog/2020/02/26/react-v16.13.0.html#deprecating-reactcreatefactory
global.createReactFactory = type => React.createElement.bind(null, type)

global.createReactClassFactory = classDef => createReactFactory(createReactClass(classDef))
