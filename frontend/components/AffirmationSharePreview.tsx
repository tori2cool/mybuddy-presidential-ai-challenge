import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { View, StyleSheet, Text, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import ViewShot from 'react-native-view-shot';
import { Spacing, Typography } from '@/constants/theme';

export interface AffirmationSharePreviewRef {
  capture: () => Promise<string>;
  getInnerNode?: () => View | null;
}

interface AffirmationSharePreviewProps {
  text: string;
  gradientColors: string[];
}

const AffirmationSharePreview = forwardRef<AffirmationSharePreviewRef, AffirmationSharePreviewProps>(
  ({ text, gradientColors }, forwardedRef) => {
    const viewShotRef = useRef<ViewShot>(null);
    const innerRef = useRef<View>(null);

    useImperativeHandle(forwardedRef, () => ({
      capture: async () => {
        if (Platform.OS === 'web') {
          throw new Error('Capture via ViewShot not supported on web - use canvas fallback in parent');
        }

        const uri = await viewShotRef.current?.capture?.();

        if (typeof uri !== 'string' || !uri) {
          throw new Error('ViewShot capture failed - no valid URI returned');
        }

        return uri;
      },
      getInnerNode: () => innerRef.current,
    }));

    const safeColors = (gradientColors.length >= 2
      ? gradientColors
      : ['#8B5CF6', '#6366F1']) as unknown as readonly [string, string, ...string[]];

    return (
      <ViewShot
        ref={viewShotRef}
        options={{
          format: 'png',
          quality: 0.95,
          width: 360,
          height: 640,
        }}
      >
        <LinearGradient
          colors={safeColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <View ref={innerRef} style={styles.content} collapsable={false}>
            <Text style={styles.text}>{text}</Text>
          </View>
        </LinearGradient>
      </ViewShot>
    );
  }
);

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  text: {
    ...Typography.hero,
    color: 'white',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
});

export default AffirmationSharePreview;