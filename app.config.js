/** @type {import('expo/config').ExpoConfig} */
const config = {
  name: "Club & Player",
  slug: "clubandplayer",
  scheme: "clubandplayer",
  version: "3.0.4",
  orientation: "portrait",
  userInterfaceStyle: "automatic",

  icon: "./assets/icon.png",
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff",
  },
  
  notification: {
  icon: "./assets/notification-icon.png",
  color: "#036f9a",
},

  ios: {
    supportsTablet: false,
    bundleIdentifier: "com.clubandplayer.app",
    buildNumber: "44",
    infoPlist: {
      NSPhotoLibraryUsageDescription:
        "Club & Player accede alle tue foto per permetterti di caricare immagini nei post, nel profilo e nelle opportunità sportive.",
      NSPhotoLibraryAddUsageDescription:
        "Club & Player accede alle tue foto per permetterti di caricare immagini nei post, nel profilo e nelle opportunità sportive.",
    },
  },

      android: {
        package: "com.clubandplayer.app",
        googleServicesFile: "./google-services.json",
        versionCode: 44,
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

  plugins: [
    "expo-router",
    "expo-video",
    "expo-font",
    "expo-notifications",
    [
      "expo-splash-screen",
      {
        image: "./assets/splash-icon.png",
        resizeMode: "contain",
        backgroundColor: "#ffffff",
      },
    ],
  ],

  extra: {
    NEXT_PUBLIC_ADS_ENABLED: process.env.NEXT_PUBLIC_ADS_ENABLED ?? "false",
    eas: {
      projectId: "a7dfd4f0-0687-4503-9c73-17f0a294cfbc",
    },
  },
};

module.exports = config;
