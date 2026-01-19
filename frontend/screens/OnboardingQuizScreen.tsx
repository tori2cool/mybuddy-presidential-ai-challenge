import { useState, useEffect } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { CancelXButton } from "@/components/CancelXButton";
import { Button } from "@/components/Button";
import type { OnboardingParamList } from "@/navigation/OnboardingNavigator";
import { Spacing, Typography, BorderRadius } from "@/constants/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";
import { ProgressBar } from "@/components/ProgressBar";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { getInterests } from "@/services/interestsService";
import type { Interest, UUID } from "@/types/models";

type QuizScreenNavigationProp = NativeStackNavigationProp<OnboardingParamList>;

export default function OnboardingQuizScreen() {
  const navigation = useNavigation<QuizScreenNavigationProp>();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const handleCancel = () => {
    const parent = navigation.getParent();
    if (parent) {
      parent.reset({ index: 0, routes: [{ name: "ChildSelect" as never }] });
      return;
    }

    navigation.navigate("ChildSelect" as never);
  };

  // ✅ store selected interest UUIDs
  const [selectedIds, setSelectedIds] = useState<UUID[]>([]);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let aborted = false;

    const fetchInterests = async () => {
      try {
        const data = await getInterests();
        if (!aborted) {
          setInterests(data);
          setError(null);
        }
      } catch (err: any) {
        if (!aborted) {
          setError(err?.message ?? "Failed to load interests");
        }
      } finally {
        if (!aborted) {
          setIsLoading(false);
        }
      }
    };

    fetchInterests();

    return () => {
      aborted = true;
    };
  }, []);

  const toggleInterest = (id: UUID) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <ThemedView style={styles.container}>
      <CancelXButton onPress={handleCancel} />
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + Spacing.lg,
            backgroundColor: theme.backgroundRoot,
          },
        ]}
      >
        <ThemedText type="title" style={styles.headerTitle}>
          What do you love?
        </ThemedText>
        <View style={styles.progressContainer}>
          <ProgressBar progress={0.5} />
        </View>
      </View>

      <ScreenScrollView
        style={[styles.scrollView, { backgroundColor: "transparent" }]}
        contentContainerStyle={[styles.content, { paddingBottom: Spacing.xl }]}
      >
        <ThemedText style={styles.question}>
          Pick your favorites! (Choose as many as you like)
        </ThemedText>

        {isLoading ? (
          <ThemedText style={styles.centeredText}>Loading interests...</ThemedText>
        ) : error ? (
          <ThemedText style={[styles.centeredText, { color: theme.error }]}>
            {error}
          </ThemedText>
        ) : (
          <View style={styles.grid}>
            {interests.map((interest) => {
              const isSelected = selectedIds.includes(interest.id);

              return (
                <Pressable
                  key={interest.id}
                  onPress={() => toggleInterest(interest.id)}
                  style={[
                    styles.card,
                    {
                      backgroundColor: isSelected
                        ? theme.primary
                        : theme.backgroundDefault,
                      borderColor: isSelected
                        ? theme.primary
                        : theme.backgroundSecondary,
                    },
                  ]}
                >
                  <ThemedText style={styles.icon}>{interest.icon}</ThemedText>
                  <ThemedText
                    style={[
                      styles.label,
                      { color: isSelected ? "white" : theme.text },
                    ]}
                  >
                    {interest.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScreenScrollView>

      <View
        style={[
          styles.footer,
          {
            paddingBottom: insets.bottom + Spacing.lg,
            backgroundColor: theme.backgroundRoot,
          },
        ]}
      >
        <Button
          onPress={() => navigation.navigate("NameAvatar", { interests: selectedIds })}
          disabled={selectedIds.length === 0}
        >
          Next
        </Button>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  headerTitle: {
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  progressContainer: {
    paddingHorizontal: Spacing.xl,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
  },
  question: {
    ...Typography.body,
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  card: {
    width: "47%",
    aspectRatio: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  icon: {
    fontSize: 48,
    marginBottom: Spacing.sm,
  },
  label: {
    ...Typography.body,
    textAlign: "center",
    fontWeight: "600",
  },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  centeredText: {
    ...Typography.body,
    textAlign: "center",
    paddingVertical: Spacing.xl,
  },
});
