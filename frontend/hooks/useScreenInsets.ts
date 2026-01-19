import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

import { Spacing } from "@/constants/theme";

export function useScreenInsets() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  let tabBarHeight = 0;

  try {
    tabBarHeight = useBottomTabBarHeight();
  } catch {
    // If used outside of BottomTabNavigator, React Navigation throws.
    tabBarHeight = 0;
  }

  return {
    // Android/web headers are opaque so content is already laid out below the header.
    paddingTop: Platform.OS === "ios" ? headerHeight + Spacing.xl : Spacing.xl,
    paddingBottom: tabBarHeight + Spacing.xl,
    scrollInsetBottom: insets.bottom + 16,
  };
}
