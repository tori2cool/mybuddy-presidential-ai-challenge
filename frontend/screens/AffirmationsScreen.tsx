import { useState, useRef, useEffect } from "react";
import { View, StyleSheet, Dimensions, Pressable, FlatList, ViewToken, Modal, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { IconButton } from "@/components/IconButton";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useProgress } from "@/contexts/ProgressContext";
import { Spacing, Typography, Gradients, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");

const defaultAffirmations = [
  { id: "1", text: "I am capable of amazing things", gradient: Gradients.sunset },
  { id: "2", text: "Today is full of possibilities", gradient: Gradients.ocean },
  { id: "3", text: "I am brave and strong", gradient: Gradients.forest },
  { id: "4", text: "I can learn anything I put my mind to", gradient: Gradients.sky },
  { id: "5", text: "I am kind to myself and others", gradient: Gradients.sunrise },
  { id: "6", text: "I believe in myself", gradient: Gradients.twilight },
  { id: "7", text: "I am proud of who I am", gradient: Gradients.sunset },
  { id: "8", text: "I spread positivity wherever I go", gradient: Gradients.ocean },
  { id: "9", text: "I am loved and appreciated", gradient: Gradients.forest },
  { id: "10", text: "Every day I grow stronger and wiser", gradient: Gradients.sky },
  { id: "11", text: "I choose to be happy today", gradient: Gradients.sunrise },
  { id: "12", text: "My potential is limitless", gradient: Gradients.twilight },
  { id: "13", text: "I am surrounded by love", gradient: Gradients.sunset },
  { id: "14", text: "I face challenges with courage", gradient: Gradients.ocean },
  { id: "15", text: "My voice matters", gradient: Gradients.forest },
];

const gradientOptions = [
  Gradients.sunset,
  Gradients.ocean,
  Gradients.forest,
  Gradients.sky,
  Gradients.sunrise,
  Gradients.twilight,
];

export default function AffirmationsScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { addAffirmationViewed, progress, getTodayStats, customAffirmations, addCustomAffirmation, removeCustomAffirmation } = useProgress();
  const [favorites, setFavorites] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAffirmation, setNewAffirmation] = useState("");
  const flatListRef = useRef<FlatList>(null);

  const todayStats = getTodayStats();

  const customAffirmationItems = customAffirmations.map((text, index) => ({
    id: `custom-${index}`,
    text,
    gradient: gradientOptions[index % gradientOptions.length],
    isCustom: true,
  }));

  const allAffirmations = [...customAffirmationItems, ...defaultAffirmations.map(a => ({ ...a, isCustom: false }))];

  const toggleFavorite = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((fav) => fav !== id) : [...prev, id]
    );
  };

  const handleCreateAffirmation = () => {
    if (newAffirmation.trim()) {
      addCustomAffirmation(newAffirmation.trim());
      setNewAffirmation("");
      setShowCreateModal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleDeleteCustom = (index: number) => {
    removeCustomAffirmation(index);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
    if (allAffirmations.length > 0 && !viewedIds.has(allAffirmations[0].id)) {
      setViewedIds(new Set([allAffirmations[0].id]));
      addAffirmationViewed();
    }
  }, []);

  const renderItem = ({ item, index }: { item: typeof allAffirmations[0]; index: number }) => {
    const isFavorite = favorites.includes(item.id);
    const isCustom = item.isCustom;
    const customIndex = isCustom ? parseInt(item.id.split("-")[1]) : -1;

    return (
      <View style={styles.itemContainer}>
        <LinearGradient
          colors={[...item.gradient] as any}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        >
          <View style={styles.content}>
            {isCustom ? (
              <View style={styles.customBadge}>
                <Feather name="star" size={14} color="white" />
                <ThemedText style={styles.customBadgeText}>My Affirmation</ThemedText>
              </View>
            ) : null}
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
                  name="heart"
                  size={28}
                  color={isFavorite ? "#EC4899" : "white"}
                />
              </Pressable>
              <Pressable 
                onPress={() => setShowCreateModal(true)}
                style={styles.actionButton}
              >
                <Feather name="plus-circle" size={28} color="white" />
              </Pressable>
              {isCustom ? (
                <Pressable 
                  onPress={() => handleDeleteCustom(customIndex)}
                  style={styles.actionButton}
                >
                  <Feather name="trash-2" size={28} color="white" />
                </Pressable>
              ) : (
                <Pressable style={styles.actionButton}>
                  <Feather name="share-2" size={28} color="white" />
                </Pressable>
              )}
            </View>
          </View>

          <View
            style={[
              styles.topOverlay,
              { paddingTop: insets.top + Spacing.lg },
            ]}
          >
            <View style={styles.counterBadge}>
              <ThemedText style={styles.counterText}>
                {index + 1} / {allAffirmations.length}
              </ThemedText>
            </View>
          </View>
        </LinearGradient>
      </View>
    );
  };

  const itemHeight = SCREEN_HEIGHT;

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={allAffirmations}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={itemHeight}
        snapToAlignment="start"
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{
          itemVisiblePercentThreshold: 50,
        }}
        getItemLayout={(_, index) => ({
          length: itemHeight,
          offset: itemHeight * index,
          index,
        })}
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 0 }}
      />

      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={[styles.modalContainer, { backgroundColor: theme.backgroundRoot }]}
        >
          <View style={styles.modalHeader}>
            <ThemedText type="headline">Create Your Affirmation</ThemedText>
            <Pressable onPress={() => setShowCreateModal(false)}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>
          
          <View style={styles.modalContent}>
            <ThemedText style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
              Write a positive message that inspires you
            </ThemedText>
            
            <TextInput
              style={[
                styles.affirmationInput,
                { 
                  backgroundColor: theme.backgroundDefault,
                  color: theme.text,
                  borderColor: theme.primary,
                },
              ]}
              placeholder="I am..."
              placeholderTextColor={theme.textSecondary}
              value={newAffirmation}
              onChangeText={setNewAffirmation}
              multiline
              maxLength={100}
              autoFocus
            />
            
            <ThemedText style={[styles.charCount, { color: theme.textSecondary }]}>
              {newAffirmation.length}/100
            </ThemedText>

            <Pressable
              onPress={handleCreateAffirmation}
              style={[
                styles.createButton,
                { 
                  backgroundColor: newAffirmation.trim() ? theme.primary : theme.backgroundSecondary,
                },
              ]}
              disabled={!newAffirmation.trim()}
            >
              <Feather name="plus" size={20} color={newAffirmation.trim() ? "white" : theme.textSecondary} />
              <ThemedText 
                style={[
                  styles.createButtonText,
                  { color: newAffirmation.trim() ? "white" : theme.textSecondary }
                ]}
              >
                Add Affirmation
              </ThemedText>
            </Pressable>

            {customAffirmations.length > 0 ? (
              <View style={styles.existingSection}>
                <ThemedText type="headline" style={styles.existingTitle}>
                  Your Affirmations ({customAffirmations.length})
                </ThemedText>
                {customAffirmations.map((text, index) => (
                  <View 
                    key={index}
                    style={[styles.existingItem, { backgroundColor: theme.backgroundDefault }]}
                  >
                    <ThemedText style={styles.existingText} numberOfLines={2}>
                      {text}
                    </ThemedText>
                    <Pressable onPress={() => handleDeleteCustom(index)}>
                      <Feather name="trash-2" size={18} color={theme.error} />
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  itemContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xxl,
  },
  customBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  customBadgeText: {
    color: "white",
    fontSize: 13,
    fontWeight: "600",
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
  counterBadge: {
    backgroundColor: "rgba(0,0,0,0.2)",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 12,
  },
  counterText: {
    color: "white",
    fontSize: 13,
    fontWeight: "600",
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  modalContent: {
    flex: 1,
    padding: Spacing.lg,
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: Spacing.lg,
  },
  affirmationInput: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    fontSize: 18,
    minHeight: 120,
    textAlignVertical: "top",
    borderWidth: 2,
  },
  charCount: {
    textAlign: "right",
    marginTop: Spacing.sm,
    fontSize: 12,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  existingSection: {
    marginTop: Spacing.xl,
  },
  existingTitle: {
    marginBottom: Spacing.md,
  },
  existingItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  existingText: {
    flex: 1,
    marginRight: Spacing.md,
  },
});
