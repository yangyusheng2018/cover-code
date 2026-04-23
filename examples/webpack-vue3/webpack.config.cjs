const path = require("node:path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { VueLoaderPlugin } = require("vue-loader");
const { IstanbulLiveWebpackPlugin } = require("@istanbul-live/webpack-plugin");

/** @type {import('webpack').Configuration} */
module.exports = {
  mode: "development",
  context: __dirname,
  entry: "./src/main.js",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "bundle.js",
    clean: true,
  },
  /** 较 eval-cheap-module-source-map 更易对齐到原始源码行 */
  devtool: "eval-source-map",
  resolve: {
    extensions: [".js", ".vue", ".json"],
  },
  module: {
    rules: [
      {
        test: /\.vue$/,
        loader: "vue-loader",
        options: { sourceMap: true },
      },
      {
        test: /\.css$/i,
        use: [
          "style-loader",
          { loader: "css-loader", options: { sourceMap: true } },
        ],
      },
    ],
  },
  plugins: [
    new VueLoaderPlugin(),
    new HtmlWebpackPlugin({ template: "index.html" }),
    new IstanbulLiveWebpackPlugin({
      project_code: "cover_test_webpack",
      cwd: __dirname,
      include: ["src/**/*"],
      exclude: ["node_modules/**"],
      extension: [".js", ".vue"],
      coverage: true,
      upload: {
        endpoint: "http://localhost:3001/api/coverage/upload",
        intervalMs: 10000,
      },
    }),
  ],
  devServer: {
    port: 5176,
    hot: true,
  },
};
