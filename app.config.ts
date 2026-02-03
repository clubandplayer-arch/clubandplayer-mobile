import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "Club & Player",
  slug: "clubandplayer",
  scheme: "clubandplayer",
  version: "1.0.6",
  orientation: "portrait",
  userInterfaceStyle: "automatic",

  ios: {
    supportsTablet: false,
    bundleIdentifier: "com.clubandplayer.app",
  },

  android: {
    package: "com.clubandplayer.app",
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
    ],
  },

  plugins: ["expo-router"],

  // ✅ NECESSARIO per collegare il progetto locale a EAS (dynamic config)
  extra: {
    eas: {
      projectId: "a7dfd4f0-0687-4503-9c73-17f0a294cfbc",
    },
  },
};

export default config;
