// src/theme.ts
export const theme = {
  colors: {
    // WEB tokens (globals.css)
    primary: "#00527a", // --brand
    primarySoft: "#3ba3d4", // --brand-soft
    borderBrand: "rgba(0, 82, 122, 0.18)", // --brand-border
    accent: "#EF2B2D", // --accent
    background: "#ffffff", // --bg
    text: "#111827", // --fg
    muted: "#6B7280", // --muted

    // WEB uses a lot of tailwind neutral-*
    neutral50: "#f9fafb",
    neutral100: "#f3f4f6",
    neutral200: "#e5e7eb",

    danger: "#b91c1c",
    dangerBg: "#fff5f5",
    dangerBorder: "#fecaca",
    borderSubtle: "#d1d5db",
    textSoft: "#374151",
    textStrong: "#1f2937",
    textMutedStrong: "#4b5563",
    mutedSoft: "#9ca3af",
    info: "#2563eb",
    infoBg: "#eff6ff",
    infoBorder: "#bfdbfe",
    successBg: "#f0fdf4",
    successBorder: "#86efac",
    successText: "#166534",
    dangerTint: "#fef2f2",
    primaryHover: "#0369a1",
    primarySoftStrong: "#0284c7",
    overlay: "rgba(0,0,0,0.45)",
  },

  radius: {
    sm: 10,
    md: 12,
    lg: 14,
    pill: 999,
  },

  spacing: {
    xs: 6,
    sm: 10,
    md: 14,
    lg: 18,
    xl: 24,
  },

  typography: {
    // Intended for Righteous 400 (brand headings). Actual font wiring stays separate.
    h1: { fontSize: 28, fontWeight: "400" as const },
    h2: { fontSize: 18, fontWeight: "400" as const },

    // UI text
    body: { fontSize: 14, fontWeight: "400" as const },
    strong: { fontSize: 14, fontWeight: "700" as const },
    small: { fontSize: 12, fontWeight: "400" as const },
    smallStrong: { fontSize: 12, fontWeight: "700" as const },
  },
} as const;
