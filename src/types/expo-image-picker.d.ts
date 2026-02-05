declare module "expo-image-picker" {
  export function requestMediaLibraryPermissionsAsync(): Promise<{ granted: boolean }>;
  export function launchImageLibraryAsync(options?: unknown): Promise<{
    canceled: boolean;
    assets?: Array<{
      uri: string;
      type?: "image" | "video" | string;
      fileSize?: number;
    }>;
  }>;
}
