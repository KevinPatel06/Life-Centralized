import type { ConfigContext, ExpoConfig } from 'expo/config';

// Identity must stay stable across builds so LiveContainer treats each IPA as an update.
// CI sets BUILD_NUMBER to the GitHub Actions run number.
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Life Centralized',
  slug: 'life-centralized',
  version: '0.1.0',
  scheme: 'lifecentralized',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: 'com.lifecentralized.app',
    buildNumber: process.env.BUILD_NUMBER ?? '1',
    supportsTablet: false,
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#F8F4ED',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    [
      'expo-calendar',
      {
        calendarPermission:
          'Life Centralized shows your calendar events next to your routine and adds your plans to a Centralized calendar.',
      },
    ],
    'expo-sqlite',
    'expo-sharing',
    'expo-router',
    'expo-font',
    '@react-native-community/datetimepicker',
  ],
});
