declare module "expo-image-picker" {
  export type MediaType = "image" | "video";
  export type ImagePickerAsset = { uri: string; type?: MediaType | string };
  export type ImagePickerResult = { canceled: true; assets: null } | { canceled: false; assets: ImagePickerAsset[] };

  export function requestMediaLibraryPermissionsAsync(): Promise<{ granted: boolean }>;
  export function launchImageLibraryAsync(options?: Record<string, unknown>): Promise<ImagePickerResult>;
}
