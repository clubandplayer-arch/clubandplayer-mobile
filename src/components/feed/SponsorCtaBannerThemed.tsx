import { Pressable, StyleSheet, Text, View } from "react-native";

import { sponsorCtaTheme } from "../../theme/sponsorCtaTheme";

type SponsorCtaBannerThemedProps = {
  onRequestInfo: () => void;
};

export default function SponsorCtaBannerThemed({ onRequestInfo }: SponsorCtaBannerThemedProps) {
  return (
    <View style={styles.container}>
      <View style={styles.textBlock}>
        <Text style={styles.title} numberOfLines={2}>
          Sei un’attività e vuoi farti conoscere da club e player?
        </Text>
        <Text style={styles.subtitle} numberOfLines={3}>
          Sponsorizza su Club &amp; Player: richiedi informazioni in 30 secondi.
        </Text>
      </View>

      <Pressable
        onPress={onRequestInfo}
        accessibilityRole="button"
        accessibilityLabel="Vai alla pagina sponsor"
        style={styles.button}
      >
        <Text style={styles.buttonText}>Richiedi info</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginBottom: sponsorCtaTheme.spacing.bannerPy,
    paddingHorizontal: sponsorCtaTheme.spacing.bannerPx,
    paddingVertical: sponsorCtaTheme.spacing.bannerPy,
    borderRadius: sponsorCtaTheme.radius.banner,
    backgroundColor: sponsorCtaTheme.colors.bannerBg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: sponsorCtaTheme.spacing.bannerGap,
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...sponsorCtaTheme.typography.title,
    color: sponsorCtaTheme.colors.bannerText,
  },
  subtitle: {
    marginTop: sponsorCtaTheme.spacing.subtitleMt,
    ...sponsorCtaTheme.typography.subtitle,
    color: sponsorCtaTheme.colors.bannerSubtext,
  },
  button: {
    backgroundColor: sponsorCtaTheme.colors.ctaBg,
    borderRadius: sponsorCtaTheme.radius.cta,
    paddingHorizontal: sponsorCtaTheme.spacing.ctaPx,
    paddingVertical: sponsorCtaTheme.spacing.ctaPy,
    alignSelf: "flex-start",
    flexShrink: 0,
    minHeight: 40,
    justifyContent: "center",
  },
  buttonText: {
    ...sponsorCtaTheme.typography.cta,
    color: sponsorCtaTheme.colors.ctaText,
  },
});
