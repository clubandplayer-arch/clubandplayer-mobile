import { useEffect, useMemo, useState } from "react";
import { FlatList, Modal, Pressable, Text, View } from "react-native";
import {
  getMunicipalities,
  getProvinces,
  getRegions,
  type LocationOption,
} from "../../src/lib/geo/location";

type Mode = "club" | "player";

type Values = {
  region_id: number | null;
  province_id: number | null;
  municipality_id: number | null;
  region_label: string | null;
  province_label: string | null;
  city_label: string | null;
};

type Props = {
  mode: Mode;
  title?: string;
  values: Values;
  onChange: (next: Values) => void;
};

type PickerType = "region" | "province" | "municipality";

function SelectInput({
  label,
  value,
  disabled,
  onPress,
}: {
  label: string;
  value: string | null;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontWeight: "600" }}>{label}</Text>
      <Pressable
        disabled={disabled}
        onPress={onPress}
        style={{
          borderWidth: 1,
          borderColor: "#d1d5db",
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 11,
          backgroundColor: disabled ? "#f3f4f6" : "#fff",
        }}
      >
        <Text style={{ color: value ? "#111827" : "#6b7280" }}>{value ?? "Seleziona"}</Text>
      </Pressable>
    </View>
  );
}

function PickerModal({
  visible,
  title,
  options,
  selectedId,
  onClose,
  onSelect,
}: {
  visible: boolean;
  title: string;
  options: LocationOption[];
  selectedId: number | null;
  onClose: () => void;
  onSelect: (option: LocationOption) => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.35)",
          justifyContent: "flex-end",
        }}
      >
        <View
          style={{
            backgroundColor: "#fff",
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            padding: 16,
            gap: 12,
            maxHeight: "75%",
            paddingBottom: 12,
          }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontSize: 18, fontWeight: "700" }}>{title}</Text>
            <Pressable
              onPress={onClose}
              style={{ borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}
            >
              <Text>Chiudi</Text>
            </Pressable>
          </View>

          <FlatList
            data={options}
            keyExtractor={(item) => String(item.id)}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 24 }}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => onSelect(item)}
                style={{
                  borderWidth: 1,
                  borderColor: selectedId === item.id ? "#111827" : "#e5e7eb",
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  marginBottom: 8,
                }}
              >
                <Text>{item.name}</Text>
              </Pressable>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

export function LocationFields({ mode, title, values, onChange }: Props) {
  const [regions, setRegions] = useState<LocationOption[]>([]);
  const [provinces, setProvinces] = useState<LocationOption[]>([]);
  const [municipalities, setMunicipalities] = useState<LocationOption[]>([]);
  const [openPicker, setOpenPicker] = useState<PickerType | null>(null);

  useEffect(() => {
    void (async () => {
      const next = await getRegions();
      setRegions(next);
    })();
  }, []);

  useEffect(() => {
    void (async () => {
      const next = await getProvinces(values.region_id ?? null);
      setProvinces(next);
    })();
  }, [values.region_id]);

  useEffect(() => {
    void (async () => {
      const next = await getMunicipalities(values.province_id ?? null);
      setMunicipalities(next);
    })();
  }, [values.province_id]);

  const modalTitle = useMemo(() => {
    if (openPicker === "region") return "Seleziona regione";
    if (openPicker === "province") return "Seleziona provincia";
    if (openPicker === "municipality") return mode === "club" ? "Seleziona città" : "Seleziona comune";
    return "Seleziona";
  }, [mode, openPicker]);

  const modalOptions = useMemo(() => {
    if (openPicker === "region") return regions;
    if (openPicker === "province") return provinces;
    if (openPicker === "municipality") return municipalities;
    return [];
  }, [municipalities, openPicker, provinces, regions]);

  const selectedId = useMemo(() => {
    if (openPicker === "region") return values.region_id;
    if (openPicker === "province") return values.province_id;
    if (openPicker === "municipality") return values.municipality_id;
    return null;
  }, [openPicker, values.municipality_id, values.province_id, values.region_id]);

  return (
    <View style={{ borderWidth: 1, borderRadius: 12, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 16, fontWeight: "700" }}>{title ?? "Location"}</Text>

      <SelectInput label="Regione" value={values.region_label} onPress={() => setOpenPicker("region")} />

      <SelectInput
        label="Provincia"
        value={values.province_label}
        disabled={!values.region_id}
        onPress={() => setOpenPicker("province")}
      />

      <SelectInput
        label={mode === "club" ? "Città" : "Comune"}
        value={values.city_label}
        disabled={!values.province_id}
        onPress={() => setOpenPicker("municipality")}
      />

      <PickerModal
        visible={openPicker !== null}
        title={modalTitle}
        options={modalOptions}
        selectedId={selectedId}
        onClose={() => setOpenPicker(null)}
        onSelect={(option) => {
          if (openPicker === "region") {
            onChange({
              region_id: option.id,
              province_id: null,
              municipality_id: null,
              region_label: option.name,
              province_label: null,
              city_label: null,
            });
          } else if (openPicker === "province") {
            onChange({
              region_id: values.region_id,
              province_id: option.id,
              municipality_id: null,
              region_label: values.region_label,
              province_label: option.name,
              city_label: null,
            });
          } else if (openPicker === "municipality") {
            onChange({
              region_id: values.region_id,
              province_id: values.province_id,
              municipality_id: option.id,
              region_label: values.region_label,
              province_label: values.province_label,
              city_label: option.name,
            });
          }
          setOpenPicker(null);
        }}
      />
    </View>
  );
}
