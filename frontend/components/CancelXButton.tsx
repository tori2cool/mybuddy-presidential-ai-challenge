import React from "react";
import { Pressable, StyleSheet, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/ThemedText";
import { Spacing } from "@/constants/theme";

type Props = {
  onPress: () => void;
  color?: string;
  size?: number;
  style?: ViewStyle;
};

export function CancelXButton({
  onPress,
  color = "#FF3B30",
  size = 28,
  style,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Cancel"
      style={({ pressed }) => [
        styles.container,
        {
          top: insets.top + Spacing.md,
          opacity: pressed ? 0.7 : 1,
        },
        style,
      ]}
    >
      <ThemedText style={[styles.text, { color, fontSize: size, lineHeight: size }]}>
        ✕
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: Spacing.lg,
    zIndex: 10,
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontWeight: "700",
  },
});
