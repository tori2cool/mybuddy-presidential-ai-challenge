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
import { BorderRadius, Spacing, Typography } from "@/constants/theme";
import { getAffirmations } from "@/services/affirmationsService";
import { Affirmation } from "@/types/models";
import { useCurrentChildId } from "@/contexts/ChildContext";
import { ShareMenu } from "@/components/ShareMenu"; // Assuming you created this file as per previous instructions
import { useTheme } from "@react-navigation/native";
import { CreateAffirmationModal } from "@/components/CreateAffirmationModal";

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
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [selectedAffirmationText, setSelectedAffirmationText] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [customAffirmationText, setCustomAffirmationText] = useState('');

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

      if (first.index !== lastViewedIndexRef.current) {
        lastViewedIndexRef.current = first.index;
        const id = (first.item as Affirmation).id;
        markViewedRef.current(id);
      }
    },
  );

  const onScrollRafThrottledRef = useRef<ReturnType<typeof rafThrottle> | null>(null);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.floor(y / SCREEN_HEIGHT);

    if (index !== currentIndex) {
      setCurrentIndex(index);
    }
  };

  useEffect(() => {
    const throttled = rafThrottle(handleScroll);
    onScrollRafThrottledRef.current = throttled;
    return () => throttled.cancel();
  }, [currentIndex]);

  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / SCREEN_HEIGHT);
    setCurrentIndex(index);
  };

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

  const renderItem = ({ item }: { item: Affirmation }) => {
    const isFavorite = favorites.includes(item.id);
    const gradient = item.gradient || ["#8B5CF6", "#6366F1"]; // Primary purple

    const handleSharePress = () => {
      setSelectedAffirmationText(item.text);
      setShowShareMenu(true);
    };

    return (
      <View style={styles.itemContainer}>
        <LinearGradient colors={gradient} style={styles.gradient}>
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
              <Pressable style={styles.actionButton} onPress={handleSharePress}>
                <Feather name="share-2" size={28} color="white" />
              </Pressable>
              <Pressable style={styles.actionButton}
                onPress={() => {
                  setCustomAffirmationText('');
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
        onViewableItemsChanged={onViewableItemsChanged.current}
        viewabilityConfig={{
          itemVisiblePercentThreshold: 50,
        }}
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
          console.log('Saving custom affirmation:', customAffirmationText);

          // Temporary local add
          const newCustom: Affirmation = {
            id: `custom-${Date.now()}`,
            text: customAffirmationText,
            image: null,
            gradient: ["#4ADE80", "#22C55E"], // green for custom
            tags: ["custom"],
            ageRangeId: null,
          };

          setAffirmations((prev) => [newCustom, ...prev]); // add at top
          setShowCreateModal(false);
          setCustomAffirmationText('');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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