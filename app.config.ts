import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "Club & Player",
  slug: "clubandplayer",
  scheme: "clubandplayer",
  version: "1.2.7",
  orientation: "portrait",
  userInterfaceStyle: "automatic",

  ios: {
    supportsTablet: false,
    bundleIdentifier: "com.clubandplayer.app",
  },

  android: {
    package: "com.clubandplayer.app",
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

      // NEW: Android App Links for https://www.clubandplayer.com/s/<token>
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

  plugins: ["expo-router", "expo-video"],

  // ✅ NECESSARIO per collegare il progetto locale a EAS (dynamic config)
  extra: {
    NEXT_PUBLIC_ADS_ENABLED: process.env.NEXT_PUBLIC_ADS_ENABLED ?? "false",
    eas: {
      projectId: "a7dfd4f0-0687-4503-9c73-17f0a294cfbc",
    },
  },
};

export default config;
