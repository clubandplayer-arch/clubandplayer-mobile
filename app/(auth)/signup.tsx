import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BrandLogo } from "../../components/brand/BrandLogo";
import { signInWithGoogle } from "../../src/lib/auth";
import { supabase } from "../../src/lib/supabase";
import { theme } from "../../src/theme";

type SignupRole = "athlete" | "club";

export default function SignupScreen() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<SignupRole | null>(null);
  const router = useRouter();

  const normalizedEmail = (value: string) => value.trim().toLowerCase();

  const onSignup = async () => {
    if (!email || !password || !confirmPassword || !role) {
      Alert.alert("Errore", "Inserisci email, password, conferma password e ruolo");
      return;
    }

    if (password.length < 8) {
      Alert.alert("Errore", "La password deve contenere almeno 8 caratteri");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Errore", "Le password non coincidono");
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.auth.signUp({
        email: normalizedEmail(email),
        password,
        options: {
          data: {
            role,
            account_type: role,
          },
        },
      });

      if (error) {
        Alert.alert("Signup fallita", error.message);
        return;
      }

      Alert.alert("Registrazione completata", "Controlla la tua email per confermare l'account.");
      router.replace("/(auth)/login");
    } catch {
      Alert.alert("Errore", "Qualcosa è andato storto");
    } finally {
      setLoading(false);
    }
  };

  const onGoogle = async () => {
    try {
      setLoading(true);
      await signInWithGoogle();
    } catch (e: any) {
      Alert.alert("Google login fallito", e?.message ?? "Errore");
    } finally {
      setLoading(false);
    }
  };


  return (
    <View
      style={{
        flex: 1,
        padding: 24,
        justifyContent: "center",
        gap: 12,
        backgroundColor: theme.colors.background,
      }}
    >
      <BrandLogo />

      <Text
        style={{
          fontSize: 28,
          marginBottom: 12,
          color: theme.colors.primary,
          fontFamily: theme.fonts.brand,
        }}
      >
        Crea il tuo account
      </Text>

      <TextInput
        placeholder="Email"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 12, padding: 12 }}
      />

      <TextInput
        placeholder="Password"
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        value={password}
        onChangeText={setPassword}
        style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 12, padding: 12 }}
      />

      <TextInput
        placeholder="Conferma password"
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 12, padding: 12 }}
      />

      <View style={{ gap: 8 }}>
        <Text style={{ fontWeight: "700", color: theme.colors.text }}>Seleziona ruolo</Text>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable
            onPress={() => setRole("athlete")}
            disabled={loading}
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: role === "athlete" ? theme.colors.primary : theme.colors.neutral200,
              backgroundColor: role === "athlete" ? theme.colors.neutral100 : theme.colors.background,
              padding: 14,
              borderRadius: 12,
              alignItems: "center",
              opacity: loading ? 0.8 : 1,
            }}
          >
            <Text style={{ fontWeight: "700", color: theme.colors.text }}>Athlete</Text>
          </Pressable>

          <Pressable
            onPress={() => setRole("club")}
            disabled={loading}
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: role === "club" ? theme.colors.primary : theme.colors.neutral200,
              backgroundColor: role === "club" ? theme.colors.neutral100 : theme.colors.background,
              padding: 14,
              borderRadius: 12,
              alignItems: "center",
              opacity: loading ? 0.8 : 1,
            }}
          >
            <Text style={{ fontWeight: "700", color: theme.colors.text }}>Club</Text>
          </Pressable>
        </View>
      </View>

      <Pressable
        onPress={onSignup}
        disabled={loading}
        style={{
          backgroundColor: theme.colors.primary,
          padding: 14,
          borderRadius: 12,
          alignItems: "center",
          opacity: loading ? 0.8 : 1,
        }}
      >
        {loading ? (
          <ActivityIndicator color={theme.colors.background} />
        ) : (
          <Text style={{ color: theme.colors.background, fontWeight: "700" }}>Registrati</Text>
        )}
      </Pressable>

      <Pressable
        onPress={onGoogle}
        disabled={loading}
        style={{
          borderWidth: 1,
          borderColor: theme.colors.neutral200,
          padding: 14,
          borderRadius: 12,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: 10,
          opacity: loading ? 0.8 : 1,
        }}
      >
        {loading ? (
          <ActivityIndicator />
        ) : (
          <>
            <Ionicons name="logo-google" size={18} color={theme.colors.primary} />
            <Text style={{ fontWeight: "700", color: theme.colors.primary }}>Registrati con Google</Text>
          </>
        )}
      </Pressable>

      <Pressable
        onPress={() => router.replace("/(auth)/login")}
        disabled={loading}
        style={{ paddingVertical: 10, alignItems: "center" }}
      >
        <Text>
          Hai già un account?{" "}
          <Text style={{ fontWeight: "700", color: theme.colors.primary }}>
            Accedi
          </Text>
        </Text>
      </Pressable>
    </View>
  );
}
