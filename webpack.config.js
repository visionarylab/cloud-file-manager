const path = require('path')
const CopyPlugin = require('copy-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const ReplaceInFileWebpackPlugin = require('replace-in-file-webpack-plugin')
const {
  entry,
  dest,
  assets,
  outputFileName,
  replacementStrings
} = require('./build-support/build-opts')

module.exports = (env) => ({
  performance: { hints: false },
  devtool: 'inline-source-map',
  context: path.resolve(__dirname, 'src'),
  entry: entry,
  output: {
    filename: outputFileName,
    path: path.resolve(__dirname, dest)
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
    new MiniCssExtractPlugin(),
    new CopyPlugin(
      assets.map(name => {
        return ({
          from: path.resolve(__dirname, `./src/assets/${name}`),
          to: path.resolve(__dirname, `${dest}/${name}`)
        })
      })
    ),
    new ReplaceInFileWebpackPlugin([
      {
        dir: path.resolve(__dirname, dest),
        test: /.html/,
        rules: replacementStrings.html
      },
      {
        dir: path.resolve(__dirname, dest),
        test: /.css/,
        rules: replacementStrings.css
      },
      {
        dir: path.resolve(__dirname, dest),
        test: /.js/,
        rules: replacementStrings.js
      }
    ])
  ]
})
