import { View, Text, Pressable, Alert } from "react-native";
import { router } from "expo-router";
import { supabase } from "../../../src/lib/supabase";

export default function MeScreen() {
  const onLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        Alert.alert("Errore logout", error.message);
        return;
      }
      router.replace("/(auth)/login");
    } catch {
      Alert.alert("Errore", "Logout fallito");
    }
  };

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: "700" }}>Profilo (placeholder)</Text>

      <Pressable
        onPress={onLogout}
        style={{
          backgroundColor: "#0A66C2",
          paddingVertical: 12,
          paddingHorizontal: 18,
          borderRadius: 12,
        }}
      >
        <Text style={{ color: "white", fontWeight: "700" }}>Logout</Text>
      </Pressable>
    </View>
  );
}
