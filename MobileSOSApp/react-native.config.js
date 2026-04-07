/**
 * iOS: use the Google Maps subspec so PROVIDER_GOOGLE matches Android.
 * The pod is declared explicitly in ios/Podfile.
 */
module.exports = {
  dependencies: {
    'react-native-maps': {
      platforms: {
        ios: null,
      },
    },
  },
};
