export const sponsorCtaTheme = {
  colors: {
    bannerBg: "#036F9A",
    bannerText: "#FFFFFF",
    bannerSubtext: "rgba(255,255,255,0.90)",
    ctaBg: "#FFFFFF",
    ctaText: "#036F9A",
  },
  spacing: {
    bannerPx: 16,
    bannerPy: 12,
    bannerGap: 12,
    subtitleMt: 2,
    ctaPx: 12,
    ctaPy: 8,
  },
  radius: {
    banner: 12,
    cta: 8,
  },
  typography: {
    title: {
      fontSize: 14,
      fontWeight: "600" as const,
    },
    subtitle: {
      fontSize: 12,
      lineHeight: 20,
      fontWeight: "400" as const,
    },
    cta: {
      fontSize: 14,
      fontWeight: "600" as const,
    },
  },
} as const;
