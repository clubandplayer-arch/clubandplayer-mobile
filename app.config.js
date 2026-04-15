/** @type {import('expo/config').ExpoConfig} */
const config = {
  name: "Club & Player",
  slug: "clubandplayer",
  scheme: "clubandplayer",
  version: "2.0.5",
  orientation: "portrait",
  userInterfaceStyle: "automatic",

  ios: {
    supportsTablet: false,
    bundleIdentifier: "com.clubandplayer.app",
  },

  android: {
    package: "com.clubandplayer.app",
    versionCode: 33,
    intentFilters: [
      {
        action: "VIEW",
        data: [
          {
            scheme: "clubandplayer",
            host: "callback",
          },
          {
            scheme: "clubandplayer",
            pathPrefix: "/callback",
          },
        ],
        category: ["BROWSABLE", "DEFAULT"],
      },
      {
        action: "VIEW",
        autoVerify: true,
        data: [
          {
            scheme: "https",
            host: "www.clubandplayer.com",
            pathPrefix: "/s",
          },
        ],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
  },

  plugins: ["expo-router", "expo-video", "expo-font"],

  extra: {
    NEXT_PUBLIC_ADS_ENABLED: process.env.NEXT_PUBLIC_ADS_ENABLED ?? "false",
    eas: {
      projectId: "a7dfd4f0-0687-4503-9c73-17f0a294cfbc",
    },
  },
};

module.exports = config;
