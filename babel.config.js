// babel.config.js (create this file in your root folder)
module.exports = {
  // Use the standard Expo preset
  presets: ["babel-preset-expo"],
  // Add the necessary plugins here
  plugins: [
    "react-native-reanimated/plugin", // Often needed for Worklets
    ["react-native-worklets-core/plugin"],
  ],
};
