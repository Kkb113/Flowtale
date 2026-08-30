const path = require("path");
const webpack = require("webpack");
const CopyPlugin = require("copy-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

const envKeys = Object.keys(process.env).reduce((prev, next) => {
  prev[`process.env.${next}`] = JSON.stringify(process.env[next]);
  return prev;
}, {});

const config = {
  entry: {
    background: "./src/background.ts",
    popup: "./src/popup/index.tsx",
    content: "./src/content.ts",
    client_content: "./src/client_content.ts"
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /(node_modules)/,
        loader: "babel-loader",
        options: { presets: ["@babel/env"] },
      },
      {
        test: /\.(ts|tsx)$/,
        exclude: /(node_modules)/,
        use: [
          {
            loader: "babel-loader",
            options: { presets: ["@babel/env"] },
          },
          {
            loader: "ts-loader",
          },
        ],
      },
      {
        test: /\.(less|css)$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
          },
          "css-loader",
          "less-loader",
        ],
      },
    ],
  },
  resolve: { extensions: [".ts", ".tsx", ".js", ".jsx"] },
  output: {
    path: path.resolve(__dirname, "build/"),
    filename: "[name].js",
  },
  plugins: [
    new CopyPlugin({
      patterns: [{ from: "public", to: "./" }]
    }),
    new MiniCssExtractPlugin({
      filename: "[name].css",
    }),
    new webpack.DefinePlugin(envKeys),
  ],
};

if (process.env.NODE_ENV === "production") {
  config.mode = "production";
} else {
  config.mode = "development";
}

config.devtool = "source-map";

module.exports = config;
