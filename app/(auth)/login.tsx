import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import { router } from "expo-router";
import { supabase } from "../../src/lib/supabase";
import { signInWithGoogle } from "../../src/lib/auth";
import { signInWithApple } from "../../src/lib/appleAuth";

export default function LoginScreen() {
  const [email, setEmail] = useState("playm@test.it");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) router.replace("/(tabs)/feed/index");
    };
    check();
  }, []);

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

      router.replace("/(tabs)/feed/index");
    } catch {
      Alert.alert("Errore", "Qualcosa è andato storto");
    } finally {
      setLoading(false);
    }
  };

  const onSignUp = async () => {
    if (!email || !password) {
      Alert.alert("Errore", "Inserisci email e password");
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail(email),
        password,
      });

      if (error) {
        Alert.alert("Registrazione fallita", error.message);
        return;
      }

      if (!data.session) {
        Alert.alert(
          "Controlla la mail",
          "Ti ho inviato una mail di conferma. Dopo la conferma, torna qui e fai login."
        );
        return;
      }

      router.replace("/(tabs)/feed/index");
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
      router.replace("/(tabs)/feed/index");
    } catch (e: any) {
      Alert.alert("Google login fallito", e?.message ?? "Errore");
    } finally {
      setLoading(false);
    }
  };

  const onApple = async () => {
    try {
      setLoading(true);
      await signInWithApple();
      router.replace("/(tabs)/feed/index");
    } catch (e: any) {
      Alert.alert("Apple login fallito", e?.message ?? "Errore");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 24, justifyContent: "center", gap: 12 }}>
      <Text style={{ fontSize: 28, fontWeight: "700", marginBottom: 12 }}>
        Club & Player
      </Text>

      <TextInput
        placeholder="Email"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        style={{ borderWidth: 1, borderRadius: 12, padding: 12 }}
      />

      <TextInput
        placeholder="Password"
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        value={password}
        onChangeText={setPassword}
        style={{ borderWidth: 1, borderRadius: 12, padding: 12 }}
      />

      <Pressable
        onPress={onLogin}
        disabled={loading}
        style={{
          backgroundColor: "#0A66C2",
          padding: 14,
          borderRadius: 12,
          alignItems: "center",
          marginTop: 8,
          opacity: loading ? 0.8 : 1,
        }}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={{ color: "white", fontWeight: "700" }}>Accedi</Text>
        )}
      </Pressable>

      <Pressable
        onPress={onGoogle}
        disabled={loading}
        style={{
          borderWidth: 1,
          padding: 14,
          borderRadius: 12,
          alignItems: "center",
          opacity: loading ? 0.8 : 1,
        }}
      >
        <Text style={{ fontWeight: "700" }}>Continua con Google</Text>
      </Pressable>

      {Platform.OS === "ios" && (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={12}
          style={{ height: 44 }}
          onPress={onApple}
        />
      )}

      <Pressable
        onPress={onSignUp}
        disabled={loading}
        style={{
          borderWidth: 1,
          padding: 14,
          borderRadius: 12,
          alignItems: "center",
          opacity: loading ? 0.8 : 1,
        }}
      >
        <Text style={{ fontWeight: "700" }}>Registrati (test)</Text>
      </Pressable>
    </View>
  );
}
