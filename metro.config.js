// metro.config.js
const { getDefaultConfig, mergeConfig } = require("@react-native/metro-config");
const defaultConfig = getDefaultConfig(__dirname);
const { assetExts, sourceExts } = defaultConfig.resolver;

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  resolver: {
    assetExts: assetExts.filter((ext) => ext !== "svg"),
    sourceExts: [...sourceExts]
  }
};

// Merging the default config with your custom config
module.exports = mergeConfig(defaultConfig, config);
