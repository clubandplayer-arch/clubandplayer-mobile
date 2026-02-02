import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import { router } from "expo-router";
import { supabase } from "../../src/lib/supabase";
import { signInWithApple } from "../../src/lib/appleAuth";
import { signInWithGoogle } from "../../src/lib/auth";

export default function SignupScreen() {
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const navigateToFeed = () => {
      setTimeout(() => {
        router.replace("/(tabs)/feed/index");
      }, 0);
    };

    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        navigateToFeed();
        return;
      }

      if (isMounted) {
        setCheckingSession(false);
      }
    };

    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) {
          navigateToFeed();
        }
      }
    );

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

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

  if (checkingSession) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

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
