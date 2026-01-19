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
  Platform,
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
import { ShareMenu } from "@/components/ShareMenu";
import { CreateAffirmationModal } from "@/components/CreateAffirmationModal";
import { useTheme } from "@/hooks/useTheme";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function AffirmationsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
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
  const [customAffirmationText, setCustomAffirmationText] = useState("");

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

  const toggleFavorite = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setFavorites((prev) => (prev.includes(id) ? prev.filter((fav) => fav !== id) : [...prev, id]));
  };

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

  // ONE throttled scroll handler for the lifetime of the component.
  const onScrollRafThrottledRef = useRef<RafThrottleFn<(offsetY: number) => void> | null>(null);
  if (!onScrollRafThrottledRef.current) {
    onScrollRafThrottledRef.current = rafThrottle((offsetY: number) => {
      if (!Number.isFinite(offsetY) || SCREEN_HEIGHT <= 0) return;
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
    const offsetY = e?.nativeEvent?.contentOffset?.y;
    if (typeof offsetY !== "number") return;
    onScrollRafThrottledRef.current?.(offsetY);
  }, []);

  // ONE handleScrollEnd (used for both momentum + drag end)
  const handleScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = e?.nativeEvent?.contentOffset?.y ?? 0;
      const index = Math.round(offsetY / SCREEN_HEIGHT);
      handleScrollIndexChanged(index, "scrollEnd", offsetY);
    },
    [handleScrollIndexChanged],
  );

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems[0];
      if (!first || first.index == null) return;

      setCurrentIndex(first.index);

      const viewedItem = first.item as Affirmation | undefined;
      if (!viewedItem?.id) return;

      debug("onViewableItemsChanged", {
        index: first.index,
        id: viewedItem.id,
        affirmations_len: affirmationsRef.current.length,
      });

      markViewedRef.current(viewedItem.id);
    },
  );

  // -----------------------------
  // Load affirmations
  // -----------------------------
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
    const gradient = item.gradient || ["#8B5CF6", "#6366F1"];

    const handleSharePress = () => {
      setSelectedAffirmationText(item.text);
      setShowShareMenu(true);
    };

    return (
      <View style={[styles.itemOuter, { backgroundColor: theme.backgroundRoot }]}>
        <View style={[styles.itemInner, Platform.OS === "web" && styles.itemInnerWeb]}>
          <LinearGradient colors={gradient} style={styles.gradient}>
            <View style={styles.contentColumn}>
            <View style={styles.content}>
              <ThemedText style={[styles.affirmationText, { textShadowColor: "rgba(0,0,0,0.3)" }]}>
                {item.text}
              </ThemedText>
            </View>
          </View>

          <View
            style={[
              styles.bottomOverlay,
              { paddingBottom: insets.bottom + Spacing.tabBarHeight + Spacing.lg },
            ]}
          >
            <View style={styles.contentColumn}>
              <View style={styles.statsContainer}>
                <View style={styles.statBadge}>
                  <Feather name="heart" size={14} color="white" />
                  <ThemedText style={styles.statText}>{affirmationsToday} today</ThemedText>
                </View>
                <View style={styles.statBadge}>
                  <Feather name="zap" size={14} color="white" />
                  <ThemedText style={styles.statText}>+{affirmationsToday * 5} pts</ThemedText>
                </View>
              </View>

              <View style={styles.actionsRow}>
                <Pressable onPress={() => toggleFavorite(item.id)} style={styles.actionButton}>
                  <Feather
                    name="heart"
                    size={28}
                    color={isFavorite ? "#EC4899" : "white"}
                    // @ts-ignore (Feather doesn't type fill, but RN supports it)
                    fill={isFavorite ? "#EC4899" : "none"}
                  />
                </Pressable>

                <Pressable style={styles.actionButton} onPress={handleSharePress}>
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
          </View>

          <View style={[styles.topOverlay, { paddingTop: insets.top + Spacing.lg }]}>
            <View style={styles.contentColumn}>
              <IconButton name="settings" color="white" size={24} style={styles.settingsButton} />
            </View>
          </View>
                  </LinearGradient>
        </View>
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
        onViewableItemsChanged={onViewableItemsChanged.current}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
      />

      <ShareMenu
        visible={showShareMenu}
        onClose={() => setShowShareMenu(false)}
        affirmationText={selectedAffirmationText}
      />

      <CreateAffirmationModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        text={customAffirmationText}
        onTextChange={setCustomAffirmationText}
        onSave={() => {
          if (!customAffirmationText.trim()) return;

          // TODO: Call your backend API here to save the custom affirmation
          // eslint-disable-next-line no-console
          console.log("Saving custom affirmation:", customAffirmationText);

          const newCustom: Affirmation = {
            id: `custom-${Date.now()}`,
            text: customAffirmationText,
            image: null,
            gradient: ["#4ADE80", "#22C55E"],
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  itemOuter: {
    height: SCREEN_HEIGHT,
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  itemInner: {
    width: "100%",
    height: "100%",
  },
  itemInnerWeb: {
    maxWidth: 960,
    alignSelf: "center",
  },
  gradient: { flex: 1 },
  contentColumn: {
    width: "100%",
    flex: 1,
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
  statText: { color: "white", fontSize: 13, fontWeight: "600" },
  actionsRow: { flexDirection: "row", justifyContent: "space-around" },
  actionButton: { width: 56, height: 56, alignItems: "center", justifyContent: "center" },
  topOverlay: { position: "absolute", top: 0, left: 0, right: 0, paddingHorizontal: Spacing.lg },
  settingsButton: { backgroundColor: "rgba(0,0,0,0.2)", borderRadius: 22 },
});
