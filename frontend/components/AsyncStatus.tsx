import React from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";

interface AsyncStatusProps {
  loading: boolean;
  error?: string | null;
  loadingMessage?: string;
  color?: string;
  fullScreen?: boolean;
}

export function AsyncStatus({
  loading,
  error,
  loadingMessage,
  color,
  fullScreen = false,
}: AsyncStatusProps) {
  const { theme } = useTheme();
  const spinnerColor = color ?? theme.primary;

  if (!loading && !error) return null;

  if (error) {
    return (
      <View style={[styles.container, !fullScreen && styles.inlineContainer]}>
        <ThemedText style={styles.errorText}>{error}</ThemedText>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        fullScreen ? styles.fullScreen : styles.inlineContainer,
      ]}
    >
      <ActivityIndicator size={fullScreen ? "large" : "small"} color={spinnerColor} />
      {loadingMessage ? (
        <ThemedText style={styles.loadingText}>{loadingMessage}</ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  fullScreen: {
    flex: 1,
  },
  inlineContainer: {
    marginTop: Spacing.md,
  },
  loadingText: {
    marginTop: Spacing.xs,
    fontSize: 14,
  },
  errorText: {
    marginTop: Spacing.xs,
    fontSize: 14,
  },
});

export type { AsyncStatusProps };
