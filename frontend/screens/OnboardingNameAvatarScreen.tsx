import { useState } from "react";
import { View, StyleSheet, TextInput, Image, Pressable, ScrollView } from "react-native";
import { useRoute, RouteProp } from "@react-navigation/native";
import { createChild } from "@/services/childrenService";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { OnboardingParamList } from "@/navigation/OnboardingNavigator";
import { Spacing, Typography, BorderRadius } from "@/constants/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";

const avatars = [
  { id: "astronaut", source: require("@/assets/avatars/astronaut_avatar.png") },
  { id: "artist", source: require("@/assets/avatars/artist_avatar.png") },
  { id: "athlete", source: require("@/assets/avatars/athlete_avatar.png") },
  { id: "explorer", source: require("@/assets/avatars/explorer_avatar.png") },
  { id: "scientist", source: require("@/assets/avatars/scientist_avatar.png") },
  { id: "musician", source: require("@/assets/avatars/musician_avatar.png") },
];

type NameAvatarScreenRouteProp = RouteProp<OnboardingParamList, "NameAvatar">;

export default function OnboardingNameAvatarScreen() {
  const route = useRoute<NameAvatarScreenRouteProp>();
  const { onComplete, interests } = route.params;
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const [name, setName] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("astronaut");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFinish = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const created = await createChild({
        name: name.trim(),
        avatar: selectedAvatar,
        interests: interests ?? [],
      });
      onComplete(created.id);
      setSubmitting(false);
    } catch (e: any) {
      setError(e?.message ?? "Failed to create child");
      setSubmitting(false);
      return;
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + Spacing.xl,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
      >
        <ThemedText type="title" style={styles.title}>
          Create Your Profile
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          Choose your avatar and tell us your name
        </ThemedText>
        
        <View style={styles.section}>
          <ThemedText type="headline" style={styles.sectionTitle}>
            Pick Your Avatar
          </ThemedText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.avatarScroll}
          >
            {avatars.map((avatar) => (
              <Pressable
                key={avatar.id}
                onPress={() => setSelectedAvatar(avatar.id)}
                style={[
                  styles.avatarContainer,
                  {
                    borderColor:
                      selectedAvatar === avatar.id
                        ? theme.primary
                        : "transparent",
                  },
                ]}
              >
                <Image source={avatar.source} style={styles.avatar} />
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <ThemedText type="headline" style={styles.sectionTitle}>
            What's Your Name?
          </ThemedText>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Enter your name"
            placeholderTextColor={theme.textSecondary}
            style={[
              styles.input,
              {
                backgroundColor: theme.backgroundDefault,
                color: theme.text,
                borderColor: theme.backgroundSecondary,
              },
            ]}
          />
        </View>

        {error ? (
          <ThemedText style={{ color: theme.error, marginBottom: Spacing.md }}>
            {error}
          </ThemedText>
        ) : null}

        <Button
          onPress={handleFinish}
          disabled={name.trim().length === 0 || submitting}
          style={styles.button}
        >
          {submitting ? "Saving..." : "Finish Setup"}
        </Button>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.body,
    textAlign: "center",
    marginBottom: Spacing.xxl,
  },
  section: {
    marginBottom: Spacing.xxl,
  },
  sectionTitle: {
    marginBottom: Spacing.lg,
  },
  avatarScroll: {
    gap: Spacing.md,
    paddingHorizontal: 4,
  },
  avatarContainer: {
    borderWidth: 4,
    borderRadius: BorderRadius.lg,
    padding: 4,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.md,
  },
  input: {
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    fontSize: 16,
    borderWidth: 2,
  },
  button: {
    marginTop: Spacing.lg,
  },
});
