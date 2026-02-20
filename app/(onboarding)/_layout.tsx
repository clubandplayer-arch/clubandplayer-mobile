import { Stack } from "expo-router";

export default function OnboardingLayout() {
  // Guard: evita header automatici e impedisce title leakage del route-group.
  return <Stack screenOptions={{ headerShown: false }} />;
}
