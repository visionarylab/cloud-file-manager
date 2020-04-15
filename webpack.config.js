const path = require('path')
const CopyPlugin = require('copy-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const buildOpts = require('./build-opts.js')

// TODO: load this function from somewhere else …
const macroExpansion = (content, path) => {
  let contentString = content.toString()
  // Only process html files ... TBD
  if (path.match(/\.html$/)) {
    buildOpts.replacementStrings.forEach(replacement => {
      contentString = contentString.replace(replacement.pattern, replacement.value)
    })
  }
  return contentString
}

module.exports = {
  context: path.resolve(__dirname, 'src'),
  mode: 'development',
  entry: {
    'js/app.js': './code/app.coffee',
    'js/globals.js': './code/globals.coffee',
    'css/app': './style/app.styl'
  },
  output: {
    filename: '[name]',
    path: path.resolve(__dirname, './dist/')
  },
  module: {
    rules: [
      {
        test: /\.coffee$/,
        use: ['coffee-loader']
      },
      {
        test: /\.styl$/,
        use: [
          /*
             TODO: When we want to put CSS into JS bundled resource, turn this on:
            {
              loader: 'style-loader' // creates style nodes from JS strings
            },
            {
              loader: 'file-loader' // translates CSS into CommonJS
            },
          */
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
      /*
         TODO:  Right now we are just using CopyPlugin to move assetts:
      {
        test: /\.(png|svg|jpg|gif)$/,
        use: [{
          loader: 'file-loader'
          // options: {
          //   context: path.resolve(__dirname, './src/assets')
          // }
        }]
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/,
        use: [{
          loader: 'file-loader'
          // options: {
          //   context: path.resolve(__dirname, './src/assets')
          // }
        }]
      }
      */
    ]
  },
  resolve: {
    alias: {
      'fonts': path.resolve(__dirname, './src/assets/fonts'),
      'img': path.resolve(__dirname, './src/assets/img')
    },
    extensions: [ '.coffee', '.js', '.json', '.styl' ]
  },
  plugins: [
    new CopyPlugin(['examples', 'fonts', 'img', 'index.html']
      .map(name => {
        return ({
          from: path.resolve(__dirname, `./src/assets/${name}`),
          to: path.resolve(__dirname, `./dist/${name}`),
          transform: macroExpansion
        })
      })
    ),
    new MiniCssExtractPlugin()
  ]
}
