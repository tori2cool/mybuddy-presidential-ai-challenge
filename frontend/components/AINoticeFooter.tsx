import React from "react";
import { StyleSheet, View } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";

export function AINoticeFooter() {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <ThemedText style={[styles.text, { color: theme.textSecondary }]}>
        MyBuddy is an AI learning helper, always supervised by parents.
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignItems: "center",
  },
  text: {
    fontSize: 12,
    textAlign: "center",
    opacity: 0.7,
  },
});