import React, { useEffect } from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius } from "@/constants/theme";

export interface ProgressBarProps {
  progress: number;
  height?: number;
  color?: string;
  style?: ViewStyle;
}

export function ProgressBar({ progress, height = 8, color, style }: ProgressBarProps) {
  const { theme } = useTheme();
  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withSpring(Math.max(0, Math.min(1, progress)), {
      damping: 15,
      stiffness: 100,
    });
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${animatedProgress.value * 100}%`,
  }));

  return (
    <View
      style={[
        styles.container,
        { height, backgroundColor: theme.backgroundSecondary },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.fill,
          { backgroundColor: color || theme.primary },
          animatedStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    borderRadius: BorderRadius.full,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: BorderRadius.full,
  },
});
