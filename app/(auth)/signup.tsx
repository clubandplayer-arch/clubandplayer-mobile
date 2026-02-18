import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import * as AppleAuthentication from "expo-apple-authentication";
import { Ionicons } from "@expo/vector-icons";
import { BrandLogo } from "../../components/brand/BrandLogo";
import { signInWithApple } from "../../src/lib/appleAuth";
import { signInWithGoogle } from "../../src/lib/auth";
import { theme } from "../../src/theme";

export default function SignupScreen() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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
            <Ionicons name="logo-google" size={18} color={theme.colors.text} />
            <Text style={{ fontWeight: "700" }}>Registrati con Google</Text>
          </>
        )}
      </Pressable>

      {Platform.OS === "ios" && (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={12}
          style={{ height: 44 }}
          onPress={onApple}
        />
      )}

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
