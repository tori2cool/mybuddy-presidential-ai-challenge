// components/MainAppOverlays.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BuddyOverlays } from './BuddyOverlays';

export function MainAppOverlays() {
    console.log('MainAppOverlays mounted')
  return (
    <View style={styles.overlayContainer}>
      <BuddyOverlays />
    </View>
  );
}

const styles = StyleSheet.create({
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,     // full screen
    pointerEvents: 'box-none',            // touches pass through to underlying UI
  },
});