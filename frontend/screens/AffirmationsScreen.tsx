/**
 * AFFIRMATIONS SCREEN
 * 
 * This screen displays swipeable affirmations with heart favorite toggle.
 * 
 * Favorites logic: 
 * - Uses favoritesService.ts for loading/toggling favorites (currently local placeholder with AsyncStorage)
 * - Heart tap → calls handleToggleFavorite → updates local state + persists ID
 * - No changes needed here for backend — swap happens in favoritesService.ts:
 *   - Replace getFavorites/toggleFavorite with API calls (GET/POST /favorites/affirmations)
 *   - Service already returns IDs for state; screens don't care about backend vs local
 * 
 * To connect backend (once endpoints ready):
 * 1. Update favoritesService.ts (see comments there)
 * 2. Test: Heart toggle → persist across sessions/devices via backend
 *
*/

import { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  Pressable,
  FlatList,
  ViewToken,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  ScrollView,
} from "react-native";

type RafThrottleFn<T extends (...args: any[]) => void> = {
  (...args: Parameters<T>): void;
  cancel: () => void;
};

function rafThrottle<T extends (...args: any[]) => void>(fn: T): RafThrottleFn<T> {
  let rafId: number | null = null;
  let lastArgs: Parameters<T> | null = null;

  const throttled = ((...args: Parameters<T>) => {
    lastArgs = args;
    if (rafId != null) return;
    rafId = requestAnimationFrame(() => {
      rafId = null;
      if (lastArgs) fn(...lastArgs);
    });
  }) as RafThrottleFn<T>;

  throttled.cancel = () => {
    if (rafId != null) cancelAnimationFrame(rafId);
    rafId = null;
    lastArgs = null;
  };

  return throttled;
}

import { LinearGradient } from "expo-linear-gradient";
import { Feather, FontAwesome } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { IconButton } from "@/components/IconButton";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDashboard } from "@/contexts/DashboardContext";
import { Spacing, Typography } from "@/constants/theme";
import { getAffirmations } from "@/services/affirmationsService";
import { Affirmation } from "@/types/models";
import { useCurrentChildId } from "@/contexts/ChildContext";
import { ShareMenu } from "@/components/ShareMenu";
import { NavigatorScreenParams, RouteProp, useNavigation, useRoute, useTheme } from "@react-navigation/native";
import { CreateAffirmationModal } from "@/components/CreateAffirmationModal";
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import AffirmationSharePreview, { AffirmationSharePreviewRef } from '@/components/AffirmationSharePreview';
import Share from 'react-native-share';
import { inlineStyles } from "react-native-svg";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { RootStackParamList, TabParamList } from "@/navigation/RootNavigator";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useProfileScroll } from "@/contexts/ProfileScrollContext";
import { getFavorites, toggleFavorite } from "@/services/favoritesService";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function AffirmationsScreen() {
  const { data: dashboard, postEvent } = useDashboard();
  const { childId } = useCurrentChildId();

  const [favorites, setFavorites] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [affirmations, setAffirmations] = useState<Affirmation[]>([]);
  const affirmationsRef = useRef<Affirmation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const flatListRef = useRef<FlatList>(null);

  const [showShareMenu, setShowShareMenu] = useState(false);
  const [selectedAffirmationText, setSelectedAffirmationText] = useState("");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [customAffirmationText, setCustomAffirmationText] = useState('');
  const [selectedGradient, setSelectedGradient] = useState<string[]>([]);
  const [selectedImageUri, setSelectedImageUri] = useState<string>('');
  const viewShotRef = useRef<ViewShot>(null);
  const previewRef = useRef<any>(null);
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const usableHeight = SCREEN_HEIGHT - tabBarHeight;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'ProfileTab'>>();
  const scrollRef = useRef<ScrollView>(null);
  const settingsRef = useRef<View>(null);
  const { triggerScrollToBottom } = useProfileScroll();

  // Implement Favorite Affirmations
  const handleToggleFavorite = async (id: string) => {
    try {
      const updatedIds = await toggleFavorite(id, favorites);
      setFavorites(updatedIds);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (err) {
      console.error('Failed to toggle favorite', err);
    }
  };

  useEffect(() => {
    const load = async () => {
      const loadedIds = await getFavorites();
      setFavorites(loadedIds);
    };
    load();
  }, []);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    itemContainer: {
      height: usableHeight,
    },
    gradient: {
      flex: 1,
    },
    centerContent: {
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "#8B5CF6", // Using primary color as background for loading
    },
    content: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: Spacing.xxl,
    },
    affirmationText: {
      ...Typography.hero,
      color: "white",
      textAlign: "center",
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 4,
    },
    bottomOverlay: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      paddingHorizontal: Spacing.xl,
      paddingTop: Spacing.lg,
    },
    statsContainer: {
      flexDirection: "row",
      justifyContent: "center",
      gap: Spacing.md,
      marginBottom: Spacing.lg,
    },
    statBadge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(0,0,0,0.3)",
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
      borderRadius: 20,
      gap: Spacing.xs,
    },
    statText: {
      color: "white",
      fontSize: 13,
      fontWeight: "600",
    },
    actionsRow: {
      flexDirection: "row",
      justifyContent: "space-around",
    },
    actionButton: {
      width: 56,
      height: 56,
      alignItems: "center",
      justifyContent: "center",
    },
    topOverlay: {
      position: "absolute",
      top: 0,
      right: 0,
      paddingRight: Spacing.lg,
    },
    settingsButton: {
      backgroundColor: "rgba(0,0,0,0.2)",
      borderRadius: 22,
    },
  });

  const debugApiEnabled =
    typeof process !== "undefined" &&
    typeof process.env !== "undefined" &&
    ["1", "true", "yes"].includes(
      String(process.env.EXPO_PUBLIC_DEBUG_API ?? "").trim().toLowerCase(),
    );

  const debug = useCallback(
    (...args: any[]) => {
      if (!debugApiEnabled) return;
      // eslint-disable-next-line no-console
      console.debug("[AffirmationsScreen]", ...args);
    },
    [debugApiEnabled],
  );

  const affirmationsToday = dashboard?.today?.affirmationsViewed ?? 0;

  // -----------------------------
  // Viewed tracking (deduped)
  // -----------------------------
  const lastViewedIndexRef = useRef<number>(-1);
  const postedViewedIdsRef = useRef<Set<string>>(new Set());

  const markViewed = useCallback(
    (affirmationId: string) => {
      if (!affirmationId) return;

      if (postedViewedIdsRef.current.has(affirmationId)) {
        debug("markViewed: deduped", { affirmationId });
        return;
      }
      postedViewedIdsRef.current.add(affirmationId);

      debug("markViewed: posting", { childId, affirmationId });

      if (!childId) {
        debug("markViewed: skipped (missing childId)", { affirmationId });
        return;
      }

      postEvent({
        kind: "affirmation",
        body: { affirmationId },
      }).catch((err) => {
        debug("markViewed: postEvent failed", { affirmationId, err: String(err) });
      });
    },
    [childId, postEvent, debug],
  );

  // Keep a stable ref so scroll/viewability callbacks never go stale.
  const markViewedRef = useRef<(id: string) => void>(() => {});
  useEffect(() => {
    markViewedRef.current = markViewed;
  }, [markViewed]);

  useEffect(() => {
    return () => {
      onScrollRafThrottledRef.current?.cancel?.();
    };
  }, []);

  const onViewableItemsChanged = useRef<
    ({ viewableItems }: { viewableItems: ViewToken[] }) => void
  >(({ viewableItems }) => {
    const first = viewableItems[0];
    if (!first || first.index == null) return;

    debug("onViewableItemsChanged", {
      childId,
      affirmations_len: affirmationsRef.current.length,
      index: first.index,
      id: (first.item as any)?.id,
    });

    setCurrentIndex(first.index);

    const viewedItem = first.item as Affirmation | undefined;
    if (!viewedItem) return;

    markViewedRef.current(viewedItem.id);
  }).current;

  const handleScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = e?.nativeEvent?.contentOffset?.y ?? 0;
      const index = Math.round(offsetY / SCREEN_HEIGHT);
      const item = affirmationsRef.current[index];

      debug("handleScrollEnd", {
        offsetY,
        index,
        id: item?.id,
        childId,
        affirmations_len: affirmationsRef.current.length,
      });

      setCurrentIndex(index);
      if (item) markViewedRef.current(item.id);
    },
    [debug, childId],
  );

  const handleScrollIndexChanged = useCallback(
    (index: number, source: string, offsetY?: number) => {
      const items = affirmationsRef.current;
      if (!items || items.length === 0) {
        debug("scrollIndexChanged: no items", { source, index, offsetY });
        return;
      }

      const boundedIndex = Math.max(0, Math.min(index, items.length - 1));
      if (boundedIndex === lastViewedIndexRef.current) return;
      lastViewedIndexRef.current = boundedIndex;

      const item = items[boundedIndex];
      debug("scrollIndexChanged", { source, offsetY, index: boundedIndex, id: item?.id });

      setCurrentIndex(boundedIndex);
      if (item?.id) markViewedRef.current(item.id);
    },
    [debug],
  );

  const onScrollRafThrottledRef = useRef<
    RafThrottleFn<(e: NativeSyntheticEvent<NativeScrollEvent>) => void> | undefined
  >(undefined);

  if (!onScrollRafThrottledRef.current) {
    onScrollRafThrottledRef.current = rafThrottle((e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = e?.nativeEvent?.contentOffset?.y;
      if (typeof offsetY !== 'number') return;
      const index = Math.round(offsetY / SCREEN_HEIGHT);
      handleScrollIndexChanged(index, "onScroll", offsetY);
    });
  }

  useEffect(() => {
    return () => {
      onScrollRafThrottledRef.current?.cancel?.();
    };
  }, []);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    onScrollRafThrottledRef.current?.(e);
  }, []);

  useEffect(() => {
    const throttled = rafThrottle(handleScroll);
    onScrollRafThrottledRef.current = throttled;
    return () => throttled.cancel();
  }, [currentIndex]);

  useEffect(() => {
    if (!childId) return;
    let cancelled = false;

    (async () => {
      setIsLoading(true);
      try {
        const data = await getAffirmations(childId);
        affirmationsRef.current = data;
        if (cancelled) return;
        setAffirmations(data);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [childId]);

  // -----------------------------
  // Render
  // -----------------------------
  const renderItem = ({ item }: { item: Affirmation }) => {
    const isFavorite = favorites.includes(item.id);
    const fallbackGradient = ["#8B5CF6", "#6366F1"] as const;
    const gradient = item.gradient ?? fallbackGradient;

    const handleSharePress = async () => {
      console.log('Share button pressed');
      const currentItem = affirmations[currentIndex];
      if (!currentItem) return;

      setSelectedAffirmationText(currentItem.text);
      setSelectedGradient(currentItem.gradient ?? ['#8B5CF6', '#6366F1']);

      await new Promise(resolve => setTimeout(resolve, 120));

      let imageUri: string;

      if (Platform.OS === 'web') {
        console.log('Web capture starting');
        // Web canvas capture (your existing code, but set imageUri = dataUrl, no download here)
        try {
          const width = 360;
          const height = 640;
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            throw new Error('Canvas context not available');
          }

          const colors = currentItem.gradient ?? ['#8B5CF6', '#6366F1'];
          const gradient = ctx.createLinearGradient(0, 0, width, height);
          colors.forEach((color, index) => {
            gradient.addColorStop(index / (colors.length - 1), color);
          });
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, width, height);

          const text = currentItem.text;
          const fontSize = 48;
          ctx.font = `${fontSize}px sans-serif`;
          ctx.fillStyle = 'white';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          ctx.shadowColor = 'rgba(0,0,0,0.5)';
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 2;
          ctx.shadowBlur = 8;

          const maxWidth = width - 2 * 32;
          const lines = [];
          const words = text.split(' ');
          let currentLine = words[0];
          for (let i = 1; i < words.length; i++) {
            const testLine = currentLine + ' ' + words[i];
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth) {
              lines.push(currentLine);
              currentLine = words[i];
            } else {
              currentLine = testLine;
            }
          }
          lines.push(currentLine);

          const lineHeight = fontSize * 1.2;
          const totalTextHeight = lines.length * lineHeight;
          let y = (height - totalTextHeight) / 2 + lineHeight / 2;

          lines.forEach(line => {
            ctx.fillText(line, width / 2, y);
            y += lineHeight;
          });

          imageUri = canvas.toDataURL('image/png');
        } catch (err) {
          console.error('Web canvas capture failed:', err);
          alert('Could not create share image on web.');
          return;
        }
      } else {
        // Mobile capture
        console.log('Mobile capture starting');
        if (!previewRef.current) {
          console.warn('Cannot capture: no preview ref');
          alert('Could not capture the image');
          return;
        }

        try {
          const tempUri = await previewRef.current.capture();

          // Optional extra guard (in case future library changes)
          if (typeof tempUri !== 'string' || !tempUri) {
            throw new Error('Capture returned invalid URI');
          }

          const fileName = `mybuddy-affirmation-${Date.now()}.png`;
          imageUri = `${FileSystem.cacheDirectory}${fileName}`;
          await FileSystem.copyAsync({ from: tempUri, to: imageUri });
        } catch (error) {
          console.error('Mobile share capture failed:', error);
          alert('Could not prepare image for sharing');
          return;
        }
      }
      setSelectedImageUri(imageUri);
      setShowShareMenu(true);
    }
    return (
      <View style={styles.itemContainer}>
        <LinearGradient
          colors={
            (item.gradient ?? ["#8B5CF6", "#6366F1"]) as unknown as readonly [string, string, ...string[]]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <View style={styles.content}>
            <ThemedText style={styles.affirmationText}>
              {item.text}
            </ThemedText>
          </View>

          <View style={styles.bottomOverlay}>
            <View style={styles.statsContainer}>
              <View style={styles.statBadge}>
                <Feather name="eye" size={14} color="white" />
                <ThemedText style={styles.statText}>
                  {affirmationsToday} viewed today
                </ThemedText>
              </View>
              <View style={styles.statBadge}>
                <Feather name="zap" size={14} color="white" />
                <ThemedText style={styles.statText}>+{affirmationsToday * 5} pts</ThemedText>
              </View>
            </View>


            <View style={styles.actionsRow}>
              <Pressable onPress={() => handleToggleFavorite(item.id)}>
                <FontAwesome
                  name={favorites.includes(item.id) ? "heart" : "heart-o"}  // heart = filled, heart-o = outline
                  size={28}
                  color={favorites.includes(item.id) ? "#EC4899" : "white"}
                  style={{ marginTop: 12 }}
                />
              </Pressable>

              <Pressable style={styles.actionButton} onPress={() => handleSharePress()}>
                <Feather name="share-2" size={28} color="white" />
              </Pressable>

              <Pressable
                style={styles.actionButton}
                onPress={() => {
                  setCustomAffirmationText("");
                  setShowCreateModal(true);
                }}
              >
                <Feather name="edit" size={28} color="white" />
              </Pressable>
            </View>
          </View>

          <View
            style={[
              styles.topOverlay,
              { paddingTop: insets.top + Spacing.lg },
            ]}
          >
            <IconButton
              name="settings"
              color="white"
              size={24}
              style={styles.settingsButton}
              onPress={() => {
                console.log('Settings tapped - navigating to Profile tab');
                navigation.navigate('Main', {
                  screen: 'ProfileTab',
                } as NavigatorScreenParams<TabParamList>);
                // Give ProfileScreen a moment to mount and register the scroll function
                setTimeout(() => {
                  triggerScrollToBottom();
                }, 400);  // 400ms usually works well; try 300 or 600 if needed
              }}
            />
          </View>
        </LinearGradient >
      </View >
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={affirmations}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        pagingEnabled
        scrollEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={usableHeight}
        snapToOffsets={[...Array(affirmations.length)].map((_, i) => i * usableHeight)}
        snapToAlignment="start"
        decelerationRate="fast"
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={handleScrollEnd}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{
          itemVisiblePercentThreshold: 50,
        }}
      />

      <View style={{
        position: 'absolute',
        left: -9999,
        width: 360,
        height: 640,           // hard-code height
        overflow: 'hidden'     // clip anything outside
      }}>
        <AffirmationSharePreview
          ref={previewRef as React.Ref<AffirmationSharePreviewRef>}
          text={selectedAffirmationText}
          gradientColors={selectedGradient}
        />
      </View>

      <ShareMenu
        visible={showShareMenu}
        onClose={() => {
          setShowShareMenu(false);
          setSelectedImageUri('');
        }}
        affirmationText={selectedAffirmationText}
        affirmationImageUri={selectedImageUri}
      />

      <CreateAffirmationModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        text={customAffirmationText}
        onTextChange={setCustomAffirmationText}
        onSave={(savedText, gradientColors) => {
          if (!savedText.trim()) return;

          console.log('Saving custom affirmation:', savedText, 'with gradient:', gradientColors);

          const newCustom: Affirmation = {
            id: `custom-${Date.now()}`,
            text: savedText,
            image: null,
            gradient: gradientColors ?? ["#4ADE80", "#22C55E"], // fallback if no colors chosen
            tags: ["custom"],
            ageRangeId: null,
          };

          setAffirmations((prev) => [newCustom, ...prev]);
          affirmationsRef.current = [newCustom, ...affirmationsRef.current];

          setShowCreateModal(false);
          setCustomAffirmationText("");
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }}
      />
    </View>
  );
}