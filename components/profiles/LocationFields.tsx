import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
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

function PickerRow({
  label,
  options,
  value,
  onSelect,
}: {
  label: string;
  options: LocationOption[];
  value: number | null;
  onSelect: (next: LocationOption | null) => void;
}) {
  const selected = useMemo(() => options.find((o) => o.id === value) ?? null, [options, value]);

  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontWeight: "600" }}>{label}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <Pressable
          onPress={() => onSelect(null)}
          style={{ borderWidth: 1, borderColor: value == null ? "#111827" : "#d1d5db", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 }}
        >
          <Text>Nessuno</Text>
        </Pressable>
        {options.slice(0, 30).map((option) => (
          <Pressable
            key={option.id}
            onPress={() => onSelect(option)}
            style={{
              borderWidth: 1,
              borderColor: selected?.id === option.id ? "#111827" : "#d1d5db",
              borderRadius: 999,
              paddingHorizontal: 10,
              paddingVertical: 6,
            }}
          >
            <Text>{option.name}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function LocationFields({ mode, title, values, onChange }: Props) {
  const [regions, setRegions] = useState<LocationOption[]>([]);
  const [provinces, setProvinces] = useState<LocationOption[]>([]);
  const [municipalities, setMunicipalities] = useState<LocationOption[]>([]);

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

  return (
    <View style={{ borderWidth: 1, borderRadius: 12, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 16, fontWeight: "700" }}>{title ?? "Location"}</Text>
      <PickerRow
        label="Regione"
        options={regions}
        value={values.region_id ?? null}
        onSelect={(option) =>
          onChange({
            region_id: option?.id ?? null,
            province_id: null,
            municipality_id: null,
            region_label: option?.name ?? null,
            province_label: null,
            city_label: null,
          })
        }
      />
      <PickerRow
        label="Provincia"
        options={provinces}
        value={values.province_id ?? null}
        onSelect={(option) =>
          onChange({
            region_id: values.region_id ?? null,
            province_id: option?.id ?? null,
            municipality_id: null,
            region_label: values.region_label ?? null,
            province_label: option?.name ?? null,
            city_label: null,
          })
        }
      />
      <PickerRow
        label={mode === "club" ? "Città" : "Comune"}
        options={municipalities}
        value={values.municipality_id ?? null}
        onSelect={(option) =>
          onChange({
            region_id: values.region_id ?? null,
            province_id: values.province_id ?? null,
            municipality_id: option?.id ?? null,
            region_label: values.region_label ?? null,
            province_label: values.province_label ?? null,
            city_label: option?.name ?? null,
          })
        }
      />
    </View>
  );
}
