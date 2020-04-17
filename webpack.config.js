const path = require('path')
const CopyPlugin = require('copy-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const stringReplacement = require('./build-support/string-replacement')
const {
  entry,
  dest,
  assetDest,
  assets,
  outputFileName
} = require('./build-support/build-opts')

module.exports = (env) => ({
  performance: { hints: false },
  context: path.resolve(__dirname, 'src'),
  entry: entry,
  output: {
    filename: outputFileName,
    path: path.resolve(__dirname, dest)
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
    extensions: [ '.coffee', '.js', '.json', '.styl' ]
  },
  plugins: [
    new MiniCssExtractPlugin(),
    new CopyPlugin(
      assets.map(name => {
        return ({
          from: path.resolve(__dirname, `./src/assets/${name}`),
          to: path.resolve(__dirname, `${dest}/${name}`),
          transform: stringReplacement
        })
      })
    )
  ],
  devServer: {
    port: 8080
  }
})
