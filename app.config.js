// app.config.js
export default ({ config }) => ({
  ...config,
  name: 'PokerSplitter',
  slug: 'PokerSplitter',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  ios: {
    ...config.ios,
    supportsTablet: true,
    bundleIdentifier: 'com.inonber.pokersplitter',
    buildNumber: '2',
    infoPlist: {
      ...(config.ios?.infoPlist ?? {}),
      LSApplicationQueriesSchemes: ['whatsapp'],
    },
  },
  android: {
    ...config.android,
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    package: 'com.inonber.pokersplitter',
  },
  web: { favicon: './assets/favicon.png' },
  plugins: [
    // Filter out bare 'expo-build-properties' from app.json so our configured version is authoritative
    ...(config.plugins ?? []).filter((p) => p !== 'expo-build-properties'),
    // react-native-purchases v9 does not ship an app.plugin.js; native setup is via autolinking
    [
      'expo-build-properties',
      {
        android: { minSdkVersion: 24 },
      },
    ],
  ],
});
