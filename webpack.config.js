const path = require('path');
const webpack = require('webpack');

module.exports = {
  target: 'node',
  entry: './index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }
    ]
  },
  resolve: {
    fallback: {
      "stream": require.resolve("stream-browserify"),
      "zlib": require.resolve("browserify-zlib"),
      "url": require.resolve("url"),
      "querystring": require.resolve("querystring"),
      "crypto": require.resolve("crypto-browserify"),
      "os": require.resolve("os-browserify"),
      "http": require.resolve("stream-http"),
      "path": require.resolve("path-browserify"),
      "util": require.resolve("util"),
      "timers": require.resolve("timers-browserify"),
      "constants": require.resolve("constants-browserify")
    }
  },  
  mode: 'production',
  stats: {
    errorDetails: true
  },
  plugins: [
    new webpack.IgnorePlugin({
      resourceRegExp: /express/,
    })
  ]
};
