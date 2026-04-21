import { Image, View } from "react-native";

type Props = {
  iso2?: string | null;
  size?: "sm" | "md";
};

export default function CountryFlag({ iso2, size = "sm" }: Props) {
  const code = (iso2 || "").trim().toLowerCase();
  if (!/^[a-z]{2}$/.test(code)) return null;

  const width = size === "md" ? 20 : 16;
  const height = size === "md" ? 15 : 12;

  return (
    <View
      style={{
        width,
        height,
        borderRadius: 2,
        overflow: "hidden",
      }}
    >
      <Image
        source={{ uri: `https://flagcdn.com/w20/${code}.png` }}
        style={{ width, height }}
        resizeMode="cover"
      />
    </View>
  );
}
