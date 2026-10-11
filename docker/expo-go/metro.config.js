// Docker-only Metro config (copied into apps/mobile by the `metro` image). Same as Expo's default, plus an
// expo-notifications stub when EXPO_GO_STUB_NOTIFICATIONS=1, because Expo Go on Android refuses that module.
const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

if (process.env.EXPO_GO_STUB_NOTIFICATIONS === '1') {
  const stub = path.join(__dirname, 'expo-notifications-stub.js');
  const resolve = config.resolver.resolveRequest;
  config.resolver.resolveRequest = (context, moduleName, platform) =>
    moduleName === 'expo-notifications'
      ? { type: 'sourceFile', filePath: stub }
      : (resolve ?? context.resolveRequest)(context, moduleName, platform);
}

module.exports = config;
