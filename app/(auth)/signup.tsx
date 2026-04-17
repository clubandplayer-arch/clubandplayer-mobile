import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
  TextInput,
  View,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BrandLogo } from "../../components/brand/BrandLogo";
import { signInWithApple, signInWithGoogle } from "../../src/lib/auth";
import { supabase } from "../../src/lib/supabase";
import { theme } from "../../src/theme";

export default function SignupScreen() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const router = useRouter();

  const normalizedEmail = (value: string) => value.trim().toLowerCase();

  const onSignup = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert("Errore", "Inserisci email, password e conferma password");
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
        Crea il tuo account
      </Text>

      <TextInput
        placeholder="Email"
        placeholderTextColor={theme.colors.muted}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 12, padding: 12 }}
      />

      <TextInput
        placeholder="Password"
        placeholderTextColor={theme.colors.muted}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        value={password}
        onChangeText={setPassword}
        style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 12, padding: 12 }}
      />

      <TextInput
        placeholder="Conferma password"
        placeholderTextColor={theme.colors.muted}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        style={{ borderWidth: 1, borderColor: theme.colors.neutral200, borderRadius: 12, padding: 12 }}
      />

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

      <Text
        style={{ textAlign: "center", color: theme.colors.muted, fontWeight: "600" }}
      >
        ----- oppure -----
      </Text>

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
