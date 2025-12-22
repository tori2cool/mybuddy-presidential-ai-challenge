import React, { useEffect } from 'react';
import { View, StyleSheet, Pressable, Dimensions, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
  SharedValue,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBuddy } from '@/contexts/BuddyContext';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, BorderRadius } from '@/constants/theme';
import { BuddyAppearance } from '@/constants/buddyCustomization';
import { BuddyPreview } from '@/components/BuddyPreview';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BUDDY_SIZE = 64;
const TAB_WIDTH = 32;
const TAB_HEIGHT = 80;
const HIDE_THRESHOLD = 80;

function BuddyFace({ appearance, size }: { appearance: BuddyAppearance; size: number }) {
  const eyeSize = size * 0.2;
  const pupilSize = eyeSize * 0.5;
  const mouthWidth = size * 0.3;
  const mouthHeight = size * 0.12;

  return (
    <View style={faceStyles.container}>
      <View style={faceStyles.eyesContainer}>
        <View style={[faceStyles.eye, { width: eyeSize, height: eyeSize, borderRadius: eyeSize / 2 }]}>
          <View style={[faceStyles.pupil, { width: pupilSize, height: pupilSize, borderRadius: pupilSize / 2, backgroundColor: appearance.eyeColor }]} />
        </View>
        <View style={[faceStyles.eye, { width: eyeSize, height: eyeSize, borderRadius: eyeSize / 2 }]}>
          <View style={[faceStyles.pupil, { width: pupilSize, height: pupilSize, borderRadius: pupilSize / 2, backgroundColor: appearance.eyeColor }]} />
        </View>
      </View>
      <View style={[faceStyles.mouth, { width: mouthWidth, height: mouthHeight, borderBottomLeftRadius: mouthHeight, borderBottomRightRadius: mouthHeight }]} />
    </View>
  );
}

const faceStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyesContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  eye: {
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pupil: {},
  mouth: {
    backgroundColor: 'white',
  },
});

function TabIcon({ hiddenOnLeft }: { hiddenOnLeft: SharedValue<boolean> }) {
  const animatedProps = useAnimatedStyle(() => ({
    transform: [{ rotate: hiddenOnLeft.value ? '180deg' : '0deg' }],
  }));
  
  return (
    <Animated.View style={animatedProps}>
      <Feather name="chevron-left" size={20} color="white" />
    </Animated.View>
  );
}

export function FloatingBuddy() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { isVisible, setIsVisible, setIsChatOpen, setIsCustomizerOpen, buddyData } = useBuddy();
  const appearance = buddyData.appearance || {
    skinColor: '#FFB347',
    eyeColor: '#4A90D9',
  };

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const bobOffset = useSharedValue(0);
  const scale = useSharedValue(1);
  const hideProgress = useSharedValue(isVisible ? 0 : 1);
  const hiddenOnLeft = useSharedValue(false);
  const lastPositionY = useSharedValue(0);

  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  const leftEdge = Spacing.md;
  const rightEdge = SCREEN_WIDTH - BUDDY_SIZE - Spacing.md;
  const topEdge = insets.top + 80;
  const bottomEdge = SCREEN_HEIGHT - insets.bottom - BUDDY_SIZE - 120;
  const defaultPositionY = topEdge;

  useEffect(() => {
    translateX.value = rightEdge;
    translateY.value = defaultPositionY;
  }, []);

  useEffect(() => {
    bobOffset.value = withRepeat(
      withSequence(
        withTiming(-4, { duration: 1500 }),
        withTiming(4, { duration: 1500 })
      ),
      -1,
      true
    );
  }, []);

  useEffect(() => {
    hideProgress.value = withSpring(isVisible ? 0 : 1, {
      damping: 15,
      stiffness: 150,
    });
  }, [isVisible]);

  const handleOpenChat = () => {
    setIsChatOpen(true);
  };

  const handleOpenCustomizer = () => {
    setIsCustomizerOpen(true);
  };

  const handleShowBuddy = () => {
    const targetX = hiddenOnLeft.value ? leftEdge : rightEdge;
    const targetY = Math.max(topEdge, Math.min(bottomEdge, lastPositionY.value || defaultPositionY));
    translateX.value = withSpring(targetX, { damping: 18, stiffness: 180 });
    translateY.value = withSpring(targetY, { damping: 18, stiffness: 180 });
    setIsVisible(true);
  };

  const panGesture = Gesture.Pan()
    .onStart(() => {
      startX.value = translateX.value;
      startY.value = translateY.value;
      scale.value = withSpring(1.1);
    })
    .onUpdate((event) => {
      translateX.value = startX.value + event.translationX;
      translateY.value = startY.value + event.translationY;
    })
    .onEnd((event) => {
      scale.value = withSpring(1);

      const currentX = translateX.value;
      const currentY = translateY.value;
      const velocityX = event.velocityX;

      if (velocityX > 500 || event.translationX > HIDE_THRESHOLD) {
        hiddenOnLeft.value = false;
        lastPositionY.value = currentY;
        translateX.value = withSpring(SCREEN_WIDTH + BUDDY_SIZE);
        runOnJS(setIsVisible)(false);
      } else if (velocityX < -500 || event.translationX < -HIDE_THRESHOLD) {
        hiddenOnLeft.value = true;
        lastPositionY.value = currentY;
        translateX.value = withSpring(-BUDDY_SIZE - 20);
        runOnJS(setIsVisible)(false);
      } else {
        const snapToRight = currentX > SCREEN_WIDTH / 2;
        const snapToBottom = currentY > SCREEN_HEIGHT / 2;

        const targetX = snapToRight ? rightEdge : leftEdge;
        const targetY = snapToBottom ? bottomEdge : topEdge;

        translateX.value = withSpring(targetX, { damping: 18, stiffness: 180 });
        translateY.value = withSpring(targetY, { damping: 18, stiffness: 180 });
      }
    });

  const tapGesture = Gesture.Tap()
    .onEnd(() => {
      runOnJS(handleOpenChat)();
    });

  const longPressGesture = Gesture.LongPress()
    .minDuration(600)
    .onEnd(() => {
      runOnJS(handleOpenCustomizer)();
    });

  const tapLongPress = Gesture.Exclusive(longPressGesture, tapGesture);
  const combinedGesture = Gesture.Simultaneous(panGesture, tapLongPress);

  const buddyAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      hideProgress.value,
      [0, 1],
      [1, 0],
      Extrapolation.CLAMP
    );

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value + bobOffset.value },
        { scale: scale.value },
      ],
      opacity,
    };
  });

  const isTabVisible = !isVisible;
  
  const tabAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      hideProgress.value,
      [0, 1],
      [0, 1],
      Extrapolation.CLAMP
    );

    const tabY = lastPositionY.value || defaultPositionY;

    return {
      opacity,
      top: tabY,
      left: hiddenOnLeft.value ? 0 : undefined,
      right: hiddenOnLeft.value ? undefined : 0,
      borderTopLeftRadius: hiddenOnLeft.value ? 0 : BorderRadius.md,
      borderBottomLeftRadius: hiddenOnLeft.value ? 0 : BorderRadius.md,
      borderTopRightRadius: hiddenOnLeft.value ? BorderRadius.md : 0,
      borderBottomRightRadius: hiddenOnLeft.value ? BorderRadius.md : 0,
    };
  });

  return (
    <>
      <GestureDetector gesture={combinedGesture}>
        <Animated.View style={[styles.buddyContainer, buddyAnimatedStyle]}>
          <View style={[styles.buddyBubble, { backgroundColor: appearance.skinColor || theme.primary }]}>
            <BuddyFace appearance={appearance as any} size={BUDDY_SIZE * 0.8} />
          </View>
          <View style={[styles.statusIndicator, { backgroundColor: theme.success }]} />
        </Animated.View>
      </GestureDetector>

      {isTabVisible ? (
        <Animated.View 
          style={[
            styles.restoreTab, 
            { backgroundColor: theme.primary },
            tabAnimatedStyle
          ]}
        >
          <Pressable 
            style={styles.tabTouchable}
            onPress={handleShowBuddy}
          >
            <TabIcon hiddenOnLeft={hiddenOnLeft} />
          </Pressable>
        </Animated.View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  buddyContainer: {
    position: 'absolute',
    width: BUDDY_SIZE,
    height: BUDDY_SIZE,
    zIndex: 1000,
  },
  buddyBubble: {
    width: BUDDY_SIZE,
    height: BUDDY_SIZE,
    borderRadius: BUDDY_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  buddyFace: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyesContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  eye: {
    width: 12,
    height: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pupil: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1a1a2e',
  },
  mouth: {
    width: 16,
    height: 8,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: 'white',
  },
  restoreTab: {
    position: 'absolute',
    width: TAB_WIDTH,
    height: TAB_HEIGHT,
    borderTopLeftRadius: BorderRadius.md,
    borderBottomLeftRadius: BorderRadius.md,
    zIndex: 999,
  },
  tabTouchable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
