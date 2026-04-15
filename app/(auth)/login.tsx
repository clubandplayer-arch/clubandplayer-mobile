import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BrandLogo } from "../../components/brand/BrandLogo";
import { fetchProfileMe, fetchWhoami, syncSession } from "../../src/lib/api";
import { supabase } from "../../src/lib/supabase";
import { signInWithApple, signInWithGoogle } from "../../src/lib/auth";
import { theme } from "../../src/theme";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const normalizedEmail = (v: string) => v.trim().toLowerCase();

  const onLogin = async () => {
    if (!email || !password) {
      Alert.alert("Errore", "Inserisci email e password");
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail(email),
        password,
      });

      if (error) {
        Alert.alert("Login fallito", error.message);
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;

      if (!session) {
        Alert.alert("Login fallito", "Sessione non disponibile dopo il login");
        return;
      }

      const syncRes = await syncSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });

      if (!syncRes.ok) {
        Alert.alert("Login fallito", syncRes.errorText ?? "Sync sessione web fallita");
        return;
      }

      void fetchWhoami();
      void fetchProfileMe();

      // redirect gestito da layout / guard
    } catch {
      Alert.alert("Errore", "Qualcosa è andato storto");
    } finally {
      setLoading(false);
    }
  };


  const onApple = async () => {
    try {
      setLoading(true);
      await signInWithApple();
    } catch (e: any) {
      Alert.alert("Apple login fallito", e?.message ?? "Errore");
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
        Accedi
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

      <Pressable
        onPress={onLogin}
        disabled={loading}
        style={{
          backgroundColor: theme.colors.primary,
          padding: 14,
          borderRadius: 12,
          alignItems: "center",
          marginTop: 8,
          opacity: loading ? 0.8 : 1,
        }}
      >
        {loading ? (
          <ActivityIndicator color={theme.colors.background} />
        ) : (
          <Text style={{ color: theme.colors.background, fontWeight: "700" }}>Accedi</Text>
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
        <Ionicons name="logo-google" size={18} color={theme.colors.primary} />
        <Text style={{ fontWeight: "700", color: theme.colors.primary }}>Continua con Google</Text>
      </Pressable>

      {Platform.OS === "ios" ? (
        <Pressable
          onPress={onApple}
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
          <Ionicons name="logo-apple" size={22} color={theme.colors.primary} />
          <Text style={{ fontWeight: "700", color: theme.colors.primary }}>Continua con Apple</Text>
        </Pressable>
      ) : null}


      <Pressable
        onPress={() => router.push("/(auth)/signup")}
        disabled={loading}
        style={{ paddingVertical: 10, alignItems: "center" }}
      >
        <Text>
          Non hai un account?{" "}
          <Text style={{ fontWeight: "700", color: theme.colors.primary }}>
            Registrati
          </Text>
        </Text>
      </Pressable>
    </View>
  );
}
