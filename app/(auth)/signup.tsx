import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import { supabase } from "../../src/lib/supabase";
import { signInWithApple } from "../../src/lib/appleAuth";
import { signInWithGoogle } from "../../src/lib/auth";

export default function SignupScreen() {
  const [loading, setLoading] = useState(false);

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
    <View style={{ flex: 1, padding: 24, justifyContent: "center", gap: 12 }}>
      <Text style={{ fontSize: 28, fontWeight: "700", marginBottom: 12 }}>
        Club & Player
      </Text>

      <Text style={{ fontSize: 18, fontWeight: "600" }}>Registrati</Text>

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
        {loading ? (
          <ActivityIndicator />
        ) : (
          <Text style={{ fontWeight: "700" }}>Continua con Google</Text>
        )}
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
    </View>
  );
}
