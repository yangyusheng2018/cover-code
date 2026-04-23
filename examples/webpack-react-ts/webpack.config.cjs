const path = require("node:path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { IstanbulLiveWebpackPlugin } = require("@istanbul-live/webpack-plugin");

/** @type {import('webpack').Configuration} */
module.exports = {
  mode: "development",
  context: __dirname,
  entry: "./src/index.tsx",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "bundle.js",
    clean: true,
  },
  devtool: "eval-source-map",
  resolve: {
    extensions: [".tsx", ".ts", ".jsx", ".js"],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: [
          {
            loader: "ts-loader",
            options: { transpileOnly: false },
          },
        ],
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
    new HtmlWebpackPlugin({ template: "index.html" }),
    new IstanbulLiveWebpackPlugin({
      project_code: "react_webpack",
      cwd: __dirname,
      include: ["src/**/*"],
      exclude: ["node_modules/**"],
      extension: [".ts", ".tsx", ".js", ".jsx"],
      coverage: true,
      upload: {
        endpoint: "http://localhost:3001/api/coverage/upload",
        intervalMs: 10000,
      },
    }),
  ],
  devServer: {
    port: 5177,
    hot: true,
  },
};
