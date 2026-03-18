import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { patchProfileMe } from "../../src/lib/api";
import { theme } from "../../src/theme";

const ROLE_OPTIONS = [
  { value: "athlete", title: "Sono un atleta", subtitle: "Creo il mio profilo giocatore e completo i dati sportivi." },
  { value: "club", title: "Rappresento un club", subtitle: "Configuro il profilo club e gestisco opportunità e candidature." },
] as const;

export default function ChooseRoleScreen() {
  const router = useRouter();
  const [loadingRole, setLoadingRole] = useState<string | null>(null);

  const onChooseRole = async (accountType: "athlete" | "club") => {
    try {
      setLoadingRole(accountType);
      const response = await patchProfileMe({ account_type: accountType });
      if (!response.ok) {
        Alert.alert("Errore", response.errorText ?? "Impossibile salvare il ruolo");
        return;
      }
      router.replace(accountType === "club" ? "/club/profile" : "/player/profile");
    } catch (error: any) {
      Alert.alert("Errore", error?.message ?? "Impossibile salvare il ruolo");
    } finally {
      setLoadingRole(null);
    }
  };

  return (
    <View style={{ flex: 1, padding: 24, justifyContent: "center", gap: 16, backgroundColor: theme.colors.background }}>
      <Text style={{ fontSize: 28, color: theme.colors.primary, fontFamily: theme.fonts.brand }}>Scegli il tuo ruolo</Text>
      <Text style={{ color: theme.colors.muted, lineHeight: 22 }}>Useremo <Text style={{ fontWeight: "700", color: theme.colors.text }}>account_type</Text> come discriminante principale per personalizzare accessi, redirect e onboarding.</Text>
      {ROLE_OPTIONS.map((option) => {
        const busy = loadingRole === option.value;
        return (
          <Pressable key={option.value} onPress={() => void onChooseRole(option.value)} disabled={Boolean(loadingRole)} style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 16, padding: 18, gap: 8, backgroundColor: theme.colors.background, opacity: loadingRole && !busy ? 0.65 : 1 }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: theme.colors.text }}>{option.title}</Text>
            <Text style={{ color: theme.colors.muted }}>{option.subtitle}</Text>
            {busy ? <ActivityIndicator /> : <Text style={{ fontWeight: "700", color: theme.colors.primary }}>Continua</Text>}
          </Pressable>
        );
      })}
    </View>
  );
}
