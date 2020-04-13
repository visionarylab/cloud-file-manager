const path = require('path')

module.exports = {
  context: path.resolve(__dirname, 'src'),
  mode: 'development',
  entry: {
    app: ['./code/app.coffee', './style/app.styl'],
    globals: './code/globals.coffee'
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, './dist/js')
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
          {
            loader: 'style-loader' // creates style nodes from JS strings
          },
          {
            loader: 'css-loader' // translates CSS into CommonJS
          },
          {
            loader: 'stylus-loader' // compiles Stylus to CSS
          }
        ]
      },
      {
        test: /\.(png|svg|jpg|gif)$/,
        use: [{
          loader: 'file-loader',
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
    ]
  },
  resolve: {
    alias: {
      'fonts': path.resolve(__dirname, './src/assets/fonts'),
      'img': path.resolve(__dirname, './src/assets/img')
    },
    extensions: [ '.coffee', '.js', '.json', '.styl' ]
  }
}
