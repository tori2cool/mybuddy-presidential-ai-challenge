import { useState } from "react";
import { View, StyleSheet, Pressable, ScrollView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { OnboardingParamList } from "@/navigation/OnboardingNavigator";
import { Spacing, Typography, BorderRadius } from "@/constants/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";
import { ProgressBar } from "@/components/ProgressBar";

type QuizScreenNavigationProp = NativeStackNavigationProp<
  OnboardingParamList,
  "Quiz"
>;

const interests = [
  { id: "animals", label: "Animals", icon: "🐾" },
  { id: "trucks", label: "Monster Trucks", icon: "🚚" },
  { id: "ponies", label: "Ponies", icon: "🐴" },
  { id: "dinosaurs", label: "Dinosaurs", icon: "🦕" },
  { id: "sports", label: "Sports", icon: "⚽" },
  { id: "horseback", label: "Horseback Riding", icon: "🏇" },
  { id: "space", label: "Space", icon: "🚀" },
  { id: "art", label: "Art", icon: "🎨" },
];

export default function OnboardingQuizScreen() {
  const navigation = useNavigation<QuizScreenNavigationProp>();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const [selected, setSelected] = useState<string[]>([]);

  const toggleInterest = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return (
    <ThemedView style={styles.container}>
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
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
      >
        <ThemedText style={styles.question}>
          Pick your favorites! (Choose as many as you like)
        </ThemedText>
        <View style={styles.grid}>
          {interests.map((interest) => {
            const isSelected = selected.includes(interest.id);
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
                    borderColor: isSelected ? theme.primary : theme.backgroundSecondary,
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
      </ScrollView>
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
          onPress={() => navigation.navigate("NameAvatar", { interests: selected })}
          disabled={selected.length === 0}
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
});
