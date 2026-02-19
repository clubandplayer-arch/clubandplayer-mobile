import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

type CrashBoundaryProps = {
  children: React.ReactNode;
};

type CrashBoundaryState = {
  hasError: boolean;
  error?: Error;
  componentStack?: string;
  boundaryKey: number;
};

function trimLines(value: string | undefined, maxLines: number) {
  if (!value) return "";
  return value.split("\n").slice(0, maxLines).join("\n");
}

export class CrashBoundary extends React.Component<
  CrashBoundaryProps,
  CrashBoundaryState
> {
  state: CrashBoundaryState = {
    hasError: false,
    error: undefined,
    componentStack: undefined,
    boundaryKey: 0,
  };

  static getDerivedStateFromError(error: Error): Partial<CrashBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("CrashBoundary caught an error", error, errorInfo);

    this.setState({
      componentStack: errorInfo.componentStack,
    });
    // TODO: integrate remote crash reporting (e.g. Sentry) in production.
  }

  private handleRetry = () => {
    this.setState((prev) => ({
      hasError: false,
      error: undefined,
      componentStack: undefined,
      boundaryKey: prev.boundaryKey + 1,
    }));
  };

  render() {
    const { hasError, error, componentStack, boundaryKey } = this.state;

    if (hasError) {
      const stackPreview = trimLines(error?.stack, 30);
      const componentStackPreview = trimLines(componentStack, 30);

      return (
        <ScrollView
          style={{ flex: 1, backgroundColor: "#ffffff" }}
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            padding: 24,
            gap: 12,
          }}
        >
          <Text style={{ fontSize: 24, fontWeight: "800", color: "#b91c1c" }}>
            CRASHBOUNDARY
          </Text>

          <Text style={{ color: "#111827", fontWeight: "700" }}>Errore</Text>
          <Text style={{ color: "#111827" }} selectable>
            {error?.message || "Errore sconosciuto"}
          </Text>

          <Text style={{ color: "#111827", fontWeight: "700" }}>Stack (prime righe)</Text>
          <Text style={{ color: "#111827" }} selectable>
            {stackPreview || "Stack non disponibile"}
          </Text>

          <Text style={{ color: "#111827", fontWeight: "700" }}>Component stack</Text>
          <Text style={{ color: "#111827" }} selectable>
            {componentStackPreview || "Component stack non disponibile"}
          </Text>

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
