import { Pressable, ScrollView, Text, View } from "react-native";
import { Link, useRouter } from "expo-router";

import { theme } from "../../src/theme";

export default function LocationSettingsInfoScreen() {
  const router = useRouter();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40, gap: 14 }}
    >
      <Pressable
        onPress={() => router.back()}
        style={{ alignSelf: "flex-start", borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 }}
      >
        <Text style={{ fontWeight: "600" }}>Indietro</Text>
      </Pressable>

      <View style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 12, padding: 16, gap: 10 }}>
        <Text style={{ fontSize: 18, fontWeight: "700" }}>Location settings</Text>
        <Text>
          Su mobile questa non è una schermata di editing separata: la zona di interesse si aggiorna da Settings e i dati profilo restano nei percorsi profilo dedicati.
        </Text>
        <Text>
          Il salvataggio passa comunque dai campi ufficiali del profilo sincronizzati con /api/profiles/me, come sul web.
        </Text>
      </View>

      <Link href="/settings" asChild>
        <Pressable style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 12, padding: 16 }}>
          <Text style={{ color: theme.colors.primary, fontWeight: "700" }}>Apri Settings → Zona di interesse</Text>
        </Pressable>
      </Link>

      <Link href="/player/profile" asChild>
        <Pressable style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 12, padding: 16 }}>
          <Text style={{ color: theme.colors.primary, fontWeight: "700" }}>Apri profilo athlete</Text>
        </Pressable>
      </Link>

      <Link href="/club/profile" asChild>
        <Pressable style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 12, padding: 16 }}>
          <Text style={{ color: theme.colors.primary, fontWeight: "700" }}>Apri profilo club</Text>
        </Pressable>
      </Link>
    </ScrollView>
  );
}
