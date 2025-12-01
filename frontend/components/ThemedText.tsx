import { Text, type TextProps } from "react-native";

import { useTheme } from "@/hooks/useTheme";
import { Typography } from "@/constants/theme";

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: "hero" | "title" | "headline" | "body" | "caption";
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = "body",
  ...rest
}: ThemedTextProps) {
  const { theme, isDark } = useTheme();

  const getColor = () => {
    if (isDark && darkColor) {
      return darkColor;
    }

    if (!isDark && lightColor) {
      return lightColor;
    }

    return theme.text;
  };

  const getTypeStyle = () => {
    switch (type) {
      case "hero":
        return Typography.hero;
      case "title":
        return Typography.title;
      case "headline":
        return Typography.headline;
      case "body":
        return Typography.body;
      case "caption":
        return Typography.caption;
      default:
        return Typography.body;
    }
  };

  return (
    <Text style={[{ color: getColor() }, getTypeStyle(), style]} {...rest} />
  );
}
