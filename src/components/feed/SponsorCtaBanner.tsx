import { Pressable, StyleSheet, Text, View } from "react-native";

type SponsorCtaBannerProps = {
  onRequestInfo: () => void;
};

export default function SponsorCtaBanner({ onRequestInfo }: SponsorCtaBannerProps) {
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
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
      >
        <Text style={styles.buttonText}>Richiedi info</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#036F9A",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 20,
    color: "rgba(255,255,255,0.90)",
  },
  button: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: "flex-start",
    flexShrink: 0,
    minHeight: 40,
    justifyContent: "center",
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#036F9A",
  },
});
