import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Image,
  Pressable,
  ScrollView,
  Platform,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { createChild } from "@/services/childrenService";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { OnboardingParamList } from "@/navigation/OnboardingNavigator";
import { Spacing, Typography, BorderRadius } from "@/constants/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "@/navigation/RootNavigator"; // Assuming this export exists; add if not

// Conditional import — automatically picks the right DatePicker based on platform
const DatePicker = Platform.select({
  web: require("@/components/DatePicker.web").DatePicker,
  default: require("@/components/DatePicker.native").DatePicker,
});

const avatars = [
  { id: "astronaut", source: require("@/assets/avatars/astronaut_avatar.png") },
  { id: "artist", source: require("@/assets/avatars/artist_avatar.png") },
  { id: "athlete", source: require("@/assets/avatars/athlete_avatar.png") },
  { id: "explorer", source: require("@/assets/avatars/explorer_avatar.png") },
  { id: "scientist", source: require("@/assets/avatars/scientist_avatar.png") },
  { id: "musician", source: require("@/assets/avatars/musician_avatar.png") },
] as const;

type Props = NativeStackScreenProps<OnboardingParamList, "NameAvatar">;

export default function OnboardingNameAvatarScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const { interests } = route.params;

  const rootNavigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [name, setName] = useState("");
  const [birthday, setBirthday] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<(typeof avatars)[number]["id"]>(
    "astronaut"
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFinish = async () => {
    setSubmitting(true);
    setError(null);

    if (!birthday) {
      setError("Please pick your birthday");
      setSubmitting(false);
      return;
    }

    try {
      const birthdayIso = birthday.toISOString().slice(0, 10); // YYYY-MM-DD
      const created = await createChild({
        name: name.trim(),
        birthday: birthdayIso,
        avatar: selectedAvatar,
        interests: interests ?? [],
      });

      // Instead of calling onComplete, navigate directly to Main
    rootNavigation.reset({
      index: 0,
      routes: [{ name: "Main" }],
    });
    } catch (e: any) {
      setError(e?.message ?? "Failed to create child");
    } finally {
      setSubmitting(false);
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
                      selectedAvatar === avatar.id ? theme.primary : "transparent",
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

        <View style={styles.section}>
          <ThemedText type="headline" style={styles.sectionTitle}>
            When is your birthday?
          </ThemedText>

          <Pressable
            onPress={() => setShowPicker(true)}
            style={[
              styles.input,
              {
                justifyContent: "center",
                backgroundColor: theme.backgroundDefault,
                borderColor: theme.backgroundSecondary,
              },
            ]}
          >
            <ThemedText style={{ color: birthday ? theme.text : theme.textSecondary }}>
              {birthday ? birthday.toLocaleDateString() : "Tap to pick your birthday"}
            </ThemedText>
          </Pressable>

          {showPicker ? (
            <DatePicker
              value={birthday ?? new Date(2018, 0, 1)}
              maximumDate={new Date()}
              onChange={(selectedDate) => {
                setBirthday(selectedDate);
                if (Platform.OS !== "ios") setShowPicker(false);
              }}
              textColor={theme.text}
              bgColor={theme.backgroundDefault}
              borderColor={theme.backgroundSecondary}
            />
          ) : null}

          {showPicker && Platform.OS === "ios" ? (
            <View style={{ marginTop: Spacing.md }}>
              <Button onPress={() => setShowPicker(false)}>Done</Button>
            </View>
          ) : null}
        </View>

        {error ? (
          <ThemedText style={{ color: theme.error, marginBottom: Spacing.md }}>
            {error}
          </ThemedText>
        ) : null}

        <Button
          onPress={handleFinish}
          disabled={name.trim().length === 0 || !birthday || submitting}
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