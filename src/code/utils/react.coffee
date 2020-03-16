# https://reactjs.org/docs/react-without-es6.html
createReactClass = require 'create-react-class'

# https://reactjs.org/blog/2020/02/26/react-v16.13.0.html#deprecating-reactcreatefactory
createReactFactory = (type) -> React.createElement.bind(null, type)

createReactClassFactory = (classDef) -> createReactFactory(createReactClass(classDef))

module.exports =
  createReactClass: createReactClass
  createReactFactory: createReactFactory
  createReactClassFactory: createReactClassFactory
