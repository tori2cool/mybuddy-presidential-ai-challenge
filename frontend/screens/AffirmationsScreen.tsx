import { useState, useRef, useEffect } from "react";
import { View, StyleSheet, Dimensions, Pressable, FlatList, ViewToken } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { IconButton } from "@/components/IconButton";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useProgress } from "@/contexts/ProgressContext";
import { Spacing, Typography } from "@/constants/theme";
import { AsyncStatus } from "@/components/AsyncStatus";
import { getAffirmations } from "@/services/affirmationsService";
import { Affirmation } from "@/types/models";
import { useCurrentChildId } from "@/contexts/ChildContext";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function AffirmationsScreen() {
  const insets = useSafeAreaInsets();
  const { addAffirmationViewed, progress, getTodayStats } = useProgress();
  const { childId } = useCurrentChildId(); 
  const [favorites, setFavorites] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());
  const [affirmations, setAffirmations] = useState<Affirmation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  const todayStats = getTodayStats();

  const toggleFavorite = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((fav) => fav !== id) : [...prev, id]
    );
  };

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        const newIndex = viewableItems[0].index;
        setCurrentIndex(newIndex);
        
        const viewedItem = viewableItems[0].item;
        if (viewedItem && !viewedIds.has(viewedItem.id)) {
          setViewedIds(prev => new Set([...prev, viewedItem.id]));
          addAffirmationViewed();
        }
      }
    }
  ).current;

  useEffect(() => {
    if (!childId) {
      // No child yet (dev auto-create will set one soon). Avoid calling API.
      return;
    }

    const loadAffirmations = async () => {
      setIsLoading(true);
      try {
        const data = await getAffirmations(childId);   // <-- pass childId
        setAffirmations(data || []);                  // safeguard against undefined
        if (data && data.length > 0 && !viewedIds.has(data[0].id)) {
          setViewedIds(new Set([data[0].id]));
          addAffirmationViewed();
        }
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
                  {todayStats?.affirmationsViewed || 0} today
                </ThemedText>
              </View>
              <View style={styles.statBadge}>
                <Feather name="zap" size={14} color="white" />
                <ThemedText style={styles.statText}>
                  +{(todayStats?.affirmationsViewed || 0) * 5} pts
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
        showsVerticalScrollIndicator={false}
        snapToInterval={SCREEN_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
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
