import { Redirect } from "expo-router";

export default function LegacyProfileRedirect() {
  return <Redirect href="/(tabs)/me" />;
}
