import { Modal, Pressable, Text, TextInput, View } from "react-native";
import { useEffect, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";

import { theme } from "../../theme";

type MobileSearchOverlayProps = {
  isOpen: boolean;
  query: string;
  onQueryChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export default function MobileSearchOverlay({
  isOpen,
  query,
  onQueryChange,
  onClose,
  onSubmit,
}: MobileSearchOverlayProps) {
  const inputRef = useRef<TextInput | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, [isOpen]);

  return (
    <Modal visible={isOpen} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            paddingHorizontal: 16,
            paddingTop: 18,
            paddingBottom: 12,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.neutral200,
          }}
        >
          <View style={{ flex: 1 }}>
            <View
              style={{
                position: "relative",
                justifyContent: "center",
              }}
            >
              <Ionicons
                name="search-outline"
                size={20}
                color={theme.colors.muted}
                style={{ position: "absolute", left: 14, zIndex: 1 }}
              />
              <TextInput
                ref={inputRef}
                value={query}
                onChangeText={onQueryChange}
                placeholder="Cerca club, player, opportunità, post, eventi…"
                placeholderTextColor={theme.colors.muted}
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
                onSubmitEditing={onSubmit}
                style={{
                  height: 48,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: theme.colors.neutral200,
                  backgroundColor: theme.colors.background,
                  paddingLeft: 42,
                  paddingRight: 16,
                  color: theme.colors.text,
                  fontSize: 16,
                }}
              />
            </View>
          </View>

          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={{ color: theme.colors.muted, fontWeight: "600" }}>Annulla</Text>
          </Pressable>
        </View>

        <View style={{ paddingHorizontal: 16, paddingVertical: 16 }}>
          <Text style={{ color: theme.colors.muted, fontSize: 14 }}>Inizia a digitare per cercare.</Text>
        </View>
      </View>
    </Modal>
  );
}
