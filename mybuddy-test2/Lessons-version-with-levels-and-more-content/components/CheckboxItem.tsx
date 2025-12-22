import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedText } from "./ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface CheckboxItemProps {
  label: string;
  checked: boolean;
  onToggle: () => void;
  icon?: keyof typeof Feather.glyphMap;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function CheckboxItem({
  label,
  checked,
  onToggle,
  icon,
}: CheckboxItemProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    scale.value = withSpring(0.95, undefined, () => {
      scale.value = withSpring(1);
    });
    onToggle();
  };

  return (
    <AnimatedPressable
      onPress={handleToggle}
      style={[
        styles.container,
        {
          backgroundColor: theme.backgroundDefault,
          borderColor: checked ? theme.success : theme.backgroundSecondary,
        },
        animatedStyle,
      ]}
    >
      <View
        style={[
          styles.checkbox,
          {
            backgroundColor: checked ? theme.success : "transparent",
            borderColor: checked ? theme.success : theme.textSecondary,
          },
        ]}
      >
        {checked ? <Feather name="check" size={18} color="white" /> : null}
      </View>
      <View style={styles.content}>
        {icon ? (
          <Feather
            name={icon}
            size={20}
            color={theme.textSecondary}
            style={styles.icon}
          />
        ) : null}
        <ThemedText
          style={[
            styles.label,
            checked && { color: theme.textSecondary, textDecorationLine: "line-through" },
          ]}
        >
          {label}
        </ThemedText>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    marginBottom: Spacing.md,
  },
  checkbox: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  content: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  icon: {
    marginRight: Spacing.sm,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
  },
});
