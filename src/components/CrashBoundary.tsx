import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

type CrashBoundaryProps = {
  children: React.ReactNode;
};

type CrashBoundaryState = {
  hasError: boolean;
  error?: Error;
  boundaryKey: number;
};

export class CrashBoundary extends React.Component<
  CrashBoundaryProps,
  CrashBoundaryState
> {
  state: CrashBoundaryState = {
    hasError: false,
    error: undefined,
    boundaryKey: 0,
  };

  static getDerivedStateFromError(error: Error): Partial<CrashBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error) {
    this.setState({ hasError: true, error });
  }

  private handleRetry = () => {
    this.setState((prev) => ({
      hasError: false,
      error: undefined,
      boundaryKey: prev.boundaryKey + 1,
    }));
  };

  render() {
    const { hasError, error, boundaryKey } = this.state;

    if (hasError) {
      return (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            padding: 24,
            gap: 12,
          }}
        >
          <Text style={{ fontSize: 24, fontWeight: "800" }}>
            Si è verificato un errore
          </Text>
          {!!error?.message && <Text style={{ color: "#374151" }}>{error.message}</Text>}

          {__DEV__ && !!error && (
            <View style={{ gap: 8 }}>
              <Text style={{ fontWeight: "700" }}>Dettagli (DEV)</Text>
              <Text style={{ color: "#111827" }} selectable>
                {JSON.stringify(
                  {
                    name: error.name,
                    message: error.message,
                    stack: error.stack,
                  },
                  null,
                  2,
                )}
              </Text>
            </View>
          )}

          <Pressable
            onPress={this.handleRetry}
            style={{
              marginTop: 8,
              paddingVertical: 10,
              paddingHorizontal: 14,
              borderRadius: 8,
              backgroundColor: "#111827",
              alignSelf: "flex-start",
            }}
          >
            <Text style={{ color: "#ffffff", fontWeight: "700" }}>Riprova</Text>
          </Pressable>
        </ScrollView>
      );
    }

    return <View key={boundaryKey} style={{ flex: 1 }}>{this.props.children}</View>;
  }
}
