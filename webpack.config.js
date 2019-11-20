const webpack = require('webpack');
const htmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');

const parsePath = path.parse(__filename);
module.exports = {
    // Webpack config goes here
    devtool: 'eval',
    entry: './src/index.js',
    output: {
        filename: 'bundle.js',
        path: parsePath.dir + '/dist'
    },
    plugins: [
        new htmlWebpackPlugin({
            template: parsePath.dir + '/src/index.html'
        })
    ],
    module: {
        rules: [
            {
                test: /\.css$/,
                use: [ 'style-loader', 'css-loader?sourceMap' ]
            },
            {
                test: /\.jpg$/,
                use: [ 'url-loader' ]
            },
            {
                test: /\.jpeg$/,
                use: ['url-loader']
            },
            {
                test: /\.png$/,
                use: [ 'url-loader' ]
            },
            {
                test: /\.html$/,
                use: [ 'html-loader' ]
            }
        ]
    },
    devServer: {
        contentBase: 'dist',
        port: 9000,
        watchContentBase: true
    },
    node: {
        fs: "empty"
    }
}