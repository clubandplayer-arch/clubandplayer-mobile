import React from "react";
import { Link } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { setCrashLog } from "../lib/crashlog";

type CrashBoundaryProps = {
  children: React.ReactNode;
};

type CrashBoundaryState = {
  error: Error | null;
};

export class CrashBoundary extends React.Component<
  CrashBoundaryProps,
  CrashBoundaryState
> {
  state: CrashBoundaryState = { error: null };

  componentDidCatch(error: Error) {
    this.setState({ error });
    void setCrashLog({
      message: error.message || "Unknown error",
      stack: error.stack ?? null,
      name: error.name ?? null,
    });
  }

  render() {
    const { error } = this.state;
    if (!error) {
      return this.props.children;
    }

    return (
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 24, gap: 16, paddingBottom: 32 }}
      >
        <Text style={{ fontSize: 24, fontWeight: "800" }}>Errore</Text>
        <View style={{ gap: 8 }}>
          <Text style={{ fontWeight: "700" }}>Message</Text>
          <Text style={{ color: "#b91c1c" }}>{error.message || "—"}</Text>
        </View>
        <View style={{ gap: 8 }}>
          <Text style={{ fontWeight: "700" }}>Stack</Text>
          <Text style={{ fontFamily: "Courier", color: "#111827" }}>
            {error.stack || "—"}
          </Text>
        </View>
        <Link href="/(tabs)/me/debug" asChild>
          <Pressable
            style={{
              paddingVertical: 10,
              paddingHorizontal: 14,
              borderRadius: 8,
              backgroundColor: "#111827",
              alignSelf: "flex-start",
            }}
          >
            <Text style={{ color: "#ffffff", fontWeight: "700" }}>
              Torna al debug
            </Text>
          </Pressable>
        </Link>
      </ScrollView>
    );
  }
}
