const path = require('path')
const { NODE_ENV, dest, codap, noGlobals, noMap } = process.env;
const CopyPlugin = require('copy-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const ReplaceInFileWebpackPlugin = require('replace-in-file-webpack-plugin')
const { assets, replacementStrings } = require('./build-support/build-opts')

const isProduction = NODE_ENV === 'production'

const srcDir = path.resolve(__dirname, 'src')
const destDir = path.resolve(__dirname, dest || './dist')

// Base configuration shared between configurations for each entry point.
// Note that the env passed in to these configuration functions is the webpack
// environment, as controlled via --env command-line arguments, which we are not
// currently making use of. By convention, the node.js environment (i.e. process.env)
// is used for configuration purposes instead.
const baseConfig = (env) => ({
  mode: isProduction ? 'production' : 'development',
  performance: { hints: false },
  devtool: noMap
            ? false
            : isProduction
                ? 'source-map'
                : 'eval-cheap-module-source-map',
  context: srcDir,
  output: {
    filename: '[name]',
    path: destDir
  },
  module: {
    rules: [
      {
        test: /(\.tsx?|\.jsx?)$/,
        use: 'ts-loader',
        exclude: [/node_modules/,/\.test\./]
      },
      {
        test: /\.styl$/,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader', // translates CSS into CommonJS
            options: {
              url: false
            }
          },
          {
            loader: 'stylus-loader' // compiles Stylus to CSS
          }
        ]
      }
    ]
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx', '.json', '.styl']
  },
  plugins: [
    new MiniCssExtractPlugin({
      moduleFilename: ({ name }) =>
        `${name.replace(/js\//, 'css/').replace(/\.js$/, '.css')}`
    }),
    new CopyPlugin(
      assets.map(name => {
        return ({
          from: path.resolve(__dirname, `./src/assets/${name}`),
          to: `${destDir}/${name}`
        })
      })
    ),
    new ReplaceInFileWebpackPlugin([
      {
        dir: destDir,
        test: /.html/,
        rules: replacementStrings.html
      },
      {
        dir: destDir,
        test: /.css/,
        rules: replacementStrings.css
      },
      {
        dir: destDir,
        test: /.js/,
        rules: replacementStrings.js
      }
    ])
  ]
})

//
const appConfig = (env) => ({
  // for now we use simple destructuring to merge configurations
  // webpack-merge is available if merge becomes more complicated
  // https://www.npmjs.com/package/webpack-merge
  ...baseConfig(env),
  entry: {
    'js/app.js': './code/app.jsx'
    // 'app.js': './code/app.jsx' to put at top level rather than in js/css subdirs
  },
  externals : {
    'create-react-class': {
      root: 'createReactClass',
      commonjs2: 'create-react-class',
      commonjs: 'create-react-class',
      amd: 'create-react-class'
    },
    'jquery' : {
      root: '$',
      commonjs2: 'jquery',
      commonjs: 'jquery',
      amd: 'jquery'
    },
    'lodash' : {
      root: '_',
      commonjs2: 'lodash',
      commonjs: 'lodash',
      amd: 'lodash'
    },
    'react': {
      root: 'React',
      commonjs2: 'react',
      commonjs: 'react',
      amd: 'react'
    },
    'react-dom': {
      root: 'ReactDOM',
      commonjs2: 'react-dom',
      commonjs: 'react-dom',
      amd: 'react-dom'
		},
    'react-dom-factories': {
      root: 'ReactDOMFactories',
      commonjs2: 'react-dom-factories',
      commonjs: 'react-dom-factories',
      amd: 'react-dom-factories'
		}
  }
})

const globalsConfig = (env) => ({
  ...baseConfig(env),
  entry: {
    'js/globals.js': './code/globals.js'
    // 'globals.js': './code/globals.js' to put at top level rather than in js/css subdirs
  }
})

const autolaunchConfig = (env) => ({
  ...baseConfig(env),
  entry: {
    'autolaunch/autolaunch.js': './code/autolaunch/autolaunch.js',
  }
})

module.exports = (env) => {
  const _appConfig = appConfig(env)
  const _globalsConfig = codap || noGlobals ? [] : [globalsConfig(env)]
  return codap
          ? _appConfig
          : [autolaunchConfig(env), ..._globalsConfig, _appConfig]
}
