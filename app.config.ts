import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "Club & Player",
  slug: "clubandplayer",
  scheme: "clubandplayer",

  // 🔥 VERSIONE VISIBILE
  version: "2.0.2",

  orientation: "portrait",
  userInterfaceStyle: "automatic",

  ios: {
    supportsTablet: false,
    bundleIdentifier: "com.clubandplayer.app",
  },

  android: {
    package: "com.clubandplayer.app",

    // 🔥 CRITICO PER PLAY STORE (DEVE SEMPRE SALIRE)
    versionCode: 30,

    intentFilters: [
      // Existing custom-scheme callback deep links
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

      // Android App Links per condivisioni
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

export default config;