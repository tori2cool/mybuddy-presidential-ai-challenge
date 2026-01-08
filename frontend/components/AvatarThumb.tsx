import React, { useEffect, useMemo, useState } from "react";
import { Image, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/ThemedText";

export type AvatarThumbProps = {
  name: string;
  imageUri: string | null;
  backgroundColor: string;
  size?: number;
  borderRadius?: number;
  accessibilityLabel?: string;
};

export function AvatarThumb({
  name,
  imageUri,
  backgroundColor,
  size = 48,
  borderRadius,
  accessibilityLabel,
}: AvatarThumbProps) {
  const [failed, setFailed] = useState(false);

  const normalizedUri = useMemo(() => {
    if (!imageUri) return null;

    // Absolute URL - use as-is
    if (/^https?:\/\//i.test(imageUri)) return imageUri;

    // Relative URL - prefix with backend image base
    const base = process.env.EXPO_PUBLIC_BACKEND_IMG_URL;
    console.log('Backend IMG URL from env:', process.env.EXPO_PUBLIC_BACKEND_IMG_URL);
    if (!base) return imageUri;

    const baseTrimmed = base.replace(/\/+$/, "");
    const pathTrimmed = imageUri.replace(/^\/+/, "");
    return `${baseTrimmed}/${pathTrimmed}`;
  }, [imageUri]);

  const initials = useMemo(() => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    const first = parts[0]?.[0] ?? "";
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
    return (first + last).toUpperCase();
  }, [name]);

  // If avatar changes (or becomes available), allow retrying load
  useEffect(() => {
    setFailed(false);
  }, [normalizedUri]);

  const resolvedBorderRadius = borderRadius ?? Math.max(0, Math.round(size / 6));

  console.log('Full thumbnail URL being requested:', normalizedUri);

  return (
    <View
      style={[
        styles.avatar,
        {
          backgroundColor,
          width: size,
          height: size,
          borderRadius: resolvedBorderRadius,
        },
      ]}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel ?? `${name} avatar`}
    >
      {normalizedUri && !failed ? (
        <Image
          source={{ uri: normalizedUri }}
          style={{ width: size, height: size }}
          resizeMode="cover"
          accessibilityLabel={accessibilityLabel ?? `${name} avatar`}
          onLoad={() => {
            setFailed(false);
          }}
          onError={(evt) => {
            console.warn("[AvatarThumb] Avatar failed to load", {
              uri: normalizedUri,
              nativeEvent: (evt as any)?.nativeEvent,
            });
            setFailed(true);
          }}
        />
      ) : (
        <ThemedText type="headline" style={[styles.avatarInitials, { fontSize: Math.max(12, Math.round(size * 0.28)) }]}>
          {initials}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    // fontSize set dynamically
  },
});
