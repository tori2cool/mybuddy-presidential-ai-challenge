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
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { IconButton } from "@/components/IconButton";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDashboard } from "@/contexts/DashboardContext";
import { Spacing, Typography } from "@/constants/theme";
import { getAffirmations } from "@/services/affirmationsService";
import { Affirmation } from "@/types/models";
import { useCurrentChildId } from "@/contexts/ChildContext";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function AffirmationsScreen() {
  const insets = useSafeAreaInsets();
  const { data: dashboard, postEvent } = useDashboard();
  const { childId } = useCurrentChildId();
  const [favorites, setFavorites] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [affirmations, setAffirmations] = useState<Affirmation[]>([]);
  const affirmationsRef = useRef<Affirmation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  const debugApiEnabled =
    typeof process !== "undefined" &&
    typeof process.env !== "undefined" &&
    ["1", "true", "yes"].includes(
      String(process.env.EXPO_PUBLIC_DEBUG_API ?? "")
        .trim()
        .toLowerCase(),
    );

  const debug = useCallback(
    (...args: any[]) => {
      if (!debugApiEnabled) return;
      // eslint-disable-next-line no-console
      console.debug("[AffirmationsScreen]", ...args);
    },
    [debugApiEnabled],
  );

  const lastViewedIndexRef = useRef<number>(-1);

  // Track which affirmationIds have been posted as viewed during this session.
  // (Set is stored in a ref to avoid stale-closure issues in viewability callbacks.)
  const postedViewedIdsRef = useRef<Set<string>>(new Set());

  const affirmationsToday = dashboard?.today?.affirmationsViewed ?? 0;
  const toggleFavorite = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((fav) => fav !== id) : [...prev, id]
    );
  };

  const markViewed = useCallback(
    (affirmationId: string) => {
      if (!affirmationId) return;

      // Exactly-once-per-session semantics.
      if (postedViewedIdsRef.current.has(affirmationId)) {
        debug("markViewed: deduped", { affirmationId });
        return;
      }
      postedViewedIdsRef.current.add(affirmationId);

      debug("markViewed: posting", { childId, affirmationId });


      if (childId) {
        postEvent({
          kind: "affirmation",
          body: { affirmationId },
        }).catch((err) => {
          debug("markViewed: postEvent failed", {
            affirmationId,
            err: String(err),
          });
        });
      } else {
        debug("markViewed: skipped (missing childId)", { affirmationId });
      }
    },
    [childId, postEvent, debug],
  );

  // Keep FlatList callback stable while always using the latest markViewed.
  const markViewedRef = useRef<(id: string) => void>(() => {});
  useEffect(() => {
    markViewedRef.current = markViewed;
  }, [markViewed]);

  useEffect(() => {
    return () => {
      onScrollRafThrottledRef.current?.cancel?.();
    };
  }, []);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
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

      // Secondary signal (e.g. native). Dedupe is handled inside markViewed.
      markViewedRef.current(viewedItem.id);
    },
  ).current;

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
      if (index < 0) return;
      const items = affirmationsRef.current;
      if (!items || items.length === 0) {
        debug("scrollIndexChanged: no items", { source, index, offsetY });
        return;
      }

      const boundedIndex = Math.max(0, Math.min(index, items.length - 1));
      if (boundedIndex === lastViewedIndexRef.current) return;
      lastViewedIndexRef.current = boundedIndex;

      const item = items[boundedIndex];
      debug("scrollIndexChanged", {
        source,
        offsetY,
        index: boundedIndex,
        id: item?.id,
      });

      setCurrentIndex(boundedIndex);
      if (item?.id) markViewedRef.current(item.id);
    },
    [debug],
  );

  const onScrollRafThrottledRef = useRef<
    RafThrottleFn<(offsetY: number) => void> | undefined
  >(undefined);

  if (!onScrollRafThrottledRef.current) {
    onScrollRafThrottledRef.current = rafThrottle((offsetY: number) => {
      if (!Number.isFinite(offsetY) || SCREEN_HEIGHT <= 0) return;
      const index = Math.round(offsetY / SCREEN_HEIGHT);
      handleScrollIndexChanged(index, "onScroll", offsetY);
    });
  }

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    // Extract primitive synchronously to avoid RN synthetic event pooling issues.
    const offsetY = e?.nativeEvent?.contentOffset?.y;
    if (typeof offsetY !== "number") return;
    onScrollRafThrottledRef.current?.(offsetY);
  }, []);

  useEffect(() => {
    affirmationsRef.current = affirmations;
    debug("affirmations updated", {
      childId,
      affirmations_len: affirmations.length,
      first_id: affirmations[0]?.id,
    });
  }, [affirmations, debug, childId]);

  useEffect(() => {
    debug("childId", { childId });
  }, [childId, debug]);

  // Reset per-session dedupe state when switching children so views are counted
  // once per session per child.
  useEffect(() => {
    postedViewedIdsRef.current.clear();
    lastViewedIndexRef.current = -1;
    debug("reset view dedupe state", { childId });
  }, [childId, debug]);

  useEffect(() => {
    if (!childId) {
      // No child yet (dev auto-create will set one soon). Avoid calling API.
      return;
    }

    const loadAffirmations = async () => {
      setIsLoading(true);
      try {
        const data = await getAffirmations(childId); // <-- pass childId
        setAffirmations(data || []); // safeguard against undefined
        // Rely on FlatList viewability to mark items as viewed (avoids double-posting the first item).
      } catch (error) {
        console.error("Failed to load affirmations:", error);
        setAffirmations([]); // avoid undefined.length
      } finally {
        setIsLoading(false);
      }
    };

    loadAffirmations();
  }, [childId]); 

  const renderItem = ({ item }: { item: Affirmation }) => {
    const isFavorite = favorites.includes(item.id);

    return (
      <View style={styles.itemContainer}>
        <LinearGradient
          colors={[...item.gradient] as any}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        >
          <View style={styles.content}>
            <ThemedText
              style={[
                styles.affirmationText,
                { textShadowColor: "rgba(0,0,0,0.3)" },
              ]}
            >
              {item.text}
            </ThemedText>
          </View>
          
          <View
            style={[
              styles.bottomOverlay,
              { paddingBottom: insets.bottom + Spacing.tabBarHeight + Spacing.lg },
            ]}
          >
            <View style={styles.statsContainer}>
              <View style={styles.statBadge}>
                <Feather name="heart" size={14} color="white" />
                <ThemedText style={styles.statText}>
                  {affirmationsToday} today
                </ThemedText>
              </View>
              <View style={styles.statBadge}>
                <Feather name="zap" size={14} color="white" />
                <ThemedText style={styles.statText}>
                  +{affirmationsToday * 5} pts
                </ThemedText>
              </View>
            </View>
            <View style={styles.actionsRow}>
              <Pressable
                onPress={() => toggleFavorite(item.id)}
                style={styles.actionButton}
              >
                <Feather
                  name={isFavorite ? "heart" : "heart"}
                  size={28}
                  color={isFavorite ? "#EC4899" : "white"}
                  fill={isFavorite ? "#EC4899" : "none"}
                />
              </Pressable>
              <Pressable style={styles.actionButton}>
                <Feather name="share-2" size={28} color="white" />
              </Pressable>
              <Pressable style={styles.actionButton}>
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
            />
          </View>
        </LinearGradient>
      </View>
    );
  };

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
        snapToInterval={SCREEN_HEIGHT}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  itemContainer: {
    height: SCREEN_HEIGHT,
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
