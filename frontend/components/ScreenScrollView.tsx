import React, { forwardRef } from 'react';
import { Platform, ScrollView, ScrollViewProps, StyleSheet, View } from 'react-native';

import { useTheme } from "@/hooks/useTheme";
import { useScreenInsets } from "@/hooks/useScreenInsets";
import { Spacing } from "@/constants/theme";

// Use forwardRef to expose the inner ScrollView ref
export const ScreenScrollView = forwardRef<ScrollView, ScrollViewProps>(
  ({ children, contentContainerStyle, style, ...scrollViewProps }, ref) => {
    const { theme } = useTheme();
    const { paddingTop, paddingBottom, scrollInsetBottom } = useScreenInsets();

    return (
      <ScrollView
        ref={ref} 
        style={[
          styles.container,
          { backgroundColor: theme.backgroundRoot },
          style,
        ]}
        contentContainerStyle={[
          {
            paddingTop,
            paddingBottom,
          },
          styles.contentContainer,
          contentContainerStyle,
        ]}
        scrollIndicatorInsets={{ bottom: scrollInsetBottom }}
        {...scrollViewProps}
      >
        <View style={[styles.inner, Platform.OS === "web" && styles.innerWeb]}>
          {children}
        </View>
      </ScrollView>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Spacing.xl,
  },
  inner: {
    width: "100%",
  },
  innerWeb: {
    maxWidth: 960,
    alignSelf: "center",
  },
});