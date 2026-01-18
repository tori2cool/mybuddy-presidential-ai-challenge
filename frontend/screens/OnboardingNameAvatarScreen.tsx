import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Image,
  Pressable,
  ScrollView,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp, NativeStackScreenProps } from "@react-navigation/native-stack";
import { createChild } from "@/services/childrenService";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { CancelXButton } from "@/components/CancelXButton";
import { Button } from "@/components/Button";
import { OnboardingParamList } from "@/navigation/OnboardingNavigator";
import { Spacing, Typography, BorderRadius } from "@/constants/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";
import { DatePicker } from "@/components/DatePicker/index";
import { getAvatars } from "@/services/avatarsService";
import { getInterests } from "@/services/interestsService";

// IMPORTANT: use the API types you showed (no Avatar.key / Interest.key)
import type { Avatar, Interest, UUID } from "@/types/models";

type NameAvatarNav = NativeStackNavigationProp<OnboardingParamList, "NameAvatar">;

type Props = NativeStackScreenProps<OnboardingParamList, "NameAvatar"> & {
  onComplete: (childId: string) => void | Promise<void>;
};

export default function OnboardingNameAvatarScreen({ route, onComplete }: Props) {
  const navigation = useNavigation<NameAvatarNav>();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const handleCancel = () => {
    // NameAvatar is inside the nested onboarding navigator; reset the parent root stack
    const parent = navigation.getParent();
    if (parent) {
      parent.reset({ index: 0, routes: [{ name: "ChildSelect" as never }] });
      return;
    }

    navigation.navigate("ChildSelect" as never);
  };

  // Assumption based on your previous code: route params contains a list of interest IDs.
  // If it's actually "keys" (like "sports"), then fix that at the source and pass UUIDs instead.
  const { interests } = route.params as Readonly<{ interests: UUID[] }>;

  const interestIds: UUID[] | null = interests && interests.length > 0 ? interests : null;

  const [name, setName] = useState("");
  const [birthday, setBirthday] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [selectedAvatarId, setSelectedAvatarId] = useState<UUID | null>(null);

  const [isLoadingAvatars, setIsLoadingAvatars] = useState(true);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  // You don't actually need the full interests list for submission anymore
  // (since we should submit IDs), but keeping it if you display labels elsewhere.
  const [interestsList, setInterestsList] = useState<Interest[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let aborted = false;

    const fetchAvatars = async () => {
      try {
        const data = await getAvatars();
        if (aborted) return;

        setAvatars(data);
        setAvatarError(null);

        // Default to first avatar ID if none selected
        if (data.length > 0 && !selectedAvatarId) {
          setSelectedAvatarId(data[0].id);
        }
      } catch (err: any) {
        if (!aborted) {
          setAvatarError(err?.message ?? "Failed to load avatars");
        }
      } finally {
        if (!aborted) {
          setIsLoadingAvatars(false);
        }
      }
    };

    fetchAvatars();

    return () => {
      aborted = true;
    };
    // selectedAvatarId intentionally omitted to avoid re-fetch loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let aborted = false;

    const fetchInterests = async () => {
      try {
        const data = await getInterests();
        if (!aborted) setInterestsList(data);
      } catch (err: any) {
        console.warn("Failed to load interests:", err);
      }
    };

    fetchInterests();

    return () => {
      aborted = true;
    };
  }, []);

  const handleFinish = async () => {
    setSubmitting(true);
    setError(null);

    if (!birthday) {
      setError("Please pick your birthday");
      setSubmitting(false);
      return;
    }

    try {
      const birthdayIso = birthday
      ? `${birthday.getFullYear()}-${String(birthday.getMonth() + 1).padStart(2, '0')}-${String(birthday.getDate()).padStart(2, '0')}`
      : '';

      const created = await createChild({
        name: name.trim(),
        birthday: birthdayIso,
        avatarId: selectedAvatarId,
        interests: interestIds,
      });

      await onComplete(created.id);
    } catch (e: any) {
      setError(e?.message ?? "Failed to create child");
      return;
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <CancelXButton onPress={handleCancel} />
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

          {isLoadingAvatars ? (
            <ThemedText style={styles.centeredText}>Loading avatars...</ThemedText>
          ) : avatarError ? (
            <ThemedText style={[styles.centeredText, { color: theme.error }]}>
              {avatarError}
            </ThemedText>
          ) : avatars.length === 0 ? (
            <ThemedText style={styles.centeredText}>No avatars available</ThemedText>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.avatarScroll}
            >
              {avatars.map((avatar) => (
                <Pressable
                  key={avatar.id}
                  onPress={() => setSelectedAvatarId(avatar.id)}
                  style={[
                    styles.avatarContainer,
                    {
                      borderColor:
                        selectedAvatarId === avatar.id ? theme.primary : "transparent",
                    },
                  ]}
                >
                  <Image source={{ uri: avatar.imagePath }} style={styles.avatar} />
                </Pressable>
              ))}
            </ScrollView>
          )}
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
              {birthday ? `${birthday.getFullYear()}-${String(birthday.getMonth() + 1).padStart(2, '0')}-${String(birthday.getDate()).padStart(2, '0')}` 
              : 'Tap to pick your birthday'}
            </ThemedText>
          </Pressable>

          {showPicker ? (
            <DatePicker
              value={birthday ?? new Date(2018, 0, 1)}
              maximumDate={new Date()}
              onChange={(selectedDate: Date | null) => {
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
  centeredText: {
    ...Typography.body,
    textAlign: "center",
    paddingVertical: Spacing.xl,
  },
});
