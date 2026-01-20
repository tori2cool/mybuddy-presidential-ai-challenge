import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { AvatarThumb } from "@/components/AvatarThumb";
import { listChildren } from "@/services/childrenService";
import { getInterests } from "@/services/interestsService";
import { getAvatars } from "@/services/avatarsService";
import type { Avatar, Child, Interest } from "@/types/models";
import { useCurrentChildId } from "@/contexts/ChildContext";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { RootStackParamList } from "@/navigation/RootNavigator";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = NativeStackScreenProps<RootStackParamList, "ChildSelect">;

export default function ChildSelectScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { setChildId } = useCurrentChildId();
  const { loading: authLoading, isAuthenticated } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [children, setChildren] = useState<Child[]>([]);

  const [interestsById, setInterestsById] = useState<Map<string, Interest> | null>(null);
  const [interestsError, setInterestsError] = useState<string | null>(null);

  const [avatarsById, setAvatarsById] = useState<Map<string, Avatar> | null>(null);
  const [avatarsError, setAvatarsError] = useState<string | null>(null);

  // In-flight guards (StrictMode-safe)
  const interestsFetchInFlight = useRef(false);
  const avatarsFetchInFlight = useRef(false);
  const childrenFetchInFlight = useRef(false);

  const styles = StyleSheet.create({
    container: { flex: 1, padding: Spacing.lg },
    header: { marginTop: Spacing.xl, marginBottom: Spacing.xl },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    list: { gap: Spacing.md },
    card: {
      padding: Spacing.lg,
      borderRadius: BorderRadius.md,
      borderWidth: 2,
    },
    cardRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: Spacing.md,
    },
    avatar: {
      marginLeft: Spacing.md,
    },
    cardText: {
      flex: 1,
    },
    addKidButtonWrap: {
      marginTop: Spacing.lg,
    },
    addKidButton: {
      backgroundColor: theme.backgroundDefault,     
      borderColor: theme.backgroundSecondary,      
      borderWidth: 2,
      borderRadius: BorderRadius.md,                
    },
    inner: {
      width: "100%",
    },
    innerWeb: {
      maxWidth: 960,
      alignSelf: "center",
    },
  });

  const loadChildren = useCallback(async () => {
    if (authLoading || !isAuthenticated) return;
    if (childrenFetchInFlight.current) return;

    childrenFetchInFlight.current = true;
    setLoading(true);
    setError(null);

    try {
      const list = await listChildren();
      setChildren(list);

      if (list.length === 0) {
        navigation.reset({
          index: 0,
          routes: [{ name: "Onboarding" }],
        });
      }
    } catch (e: any) {
      setError(e?.message ?? "Failed to load children");
    } finally {
      childrenFetchInFlight.current = false;
      setLoading(false);
    }
  }, [authLoading, isAuthenticated, navigation]);

  // Load children list when auth is ready.
  useEffect(() => {
    let cancelled = false;
    if (authLoading || !isAuthenticated) return;

    void (async () => {
      await loadChildren();
      if (cancelled) return;
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, loadChildren]);

  // Fetch interests catalog once when auth is ready.
  useEffect(() => {
    let cancelled = false;
    if (authLoading || !isAuthenticated) return;
    if (interestsById || interestsFetchInFlight.current) return;

    interestsFetchInFlight.current = true;
    void (async () => {
      try {
        const list = await getInterests();
        if (cancelled) return;
        setInterestsById(new Map(list.map((i) => [i.id, i])));
        setInterestsError(null);
      } catch (e: any) {
        if (cancelled) return;
        setInterestsError(e?.message ?? "Failed to load interests");
      } finally {
        interestsFetchInFlight.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, interestsById]);

  // Fetch avatars catalog once when auth is ready.
  useEffect(() => {
    let cancelled = false;
    if (authLoading || !isAuthenticated) return;
    if (avatarsById || avatarsFetchInFlight.current) return;

    avatarsFetchInFlight.current = true;
    void (async () => {
      try {
        const list = await getAvatars();
        if (cancelled) return;
        setAvatarsById(new Map(list.map((a) => [a.id, a])));
        setAvatarsError(null);
      } catch (e: any) {
        if (cancelled) return;
        setAvatarsError(e?.message ?? "Failed to load avatars");
      } finally {
        avatarsFetchInFlight.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, avatarsById]);

  const handlePick = useCallback(
    async (id: string) => {
      await setChildId(id);
      navigation.reset({
        index: 0,
        routes: [{ name: "Main" }],
      });
    },
    [navigation, setChildId],
  );

  const handleAddNewKid = useCallback(() => {
    // Navigate (do not reset) so the user can come back to this list.
    navigation.navigate("Onboarding");
  }, [navigation]);

  const formatInterests = useCallback(
    (ids: string[] | null | undefined) => {
      if (!ids?.length) return null;
      return ids
        .map(
          (id) =>
            interestsById?.get(id)?.label ?? interestsById?.get(id)?.name ?? id,
        )
        .join(", ");
    },
    [interestsById],
  );

  const catalogsBanner = useMemo(() => {
    if (!interestsError && !avatarsError) return null;

    const parts: string[] = [];
    if (interestsError) parts.push(`Interests failed to load (${interestsError}).`);
    if (avatarsError) parts.push(`Avatars failed to load (${avatarsError}).`);

    return (
      <ThemedText style={{ color: theme.textSecondary, marginBottom: 8 }}>
        Note: {parts.join(" ")}
      </ThemedText>
    );
  }, [avatarsError, interestsError, theme.textSecondary]);

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={[styles.inner, Platform.OS === "web" && styles.innerWeb]}>
          <View style={styles.header}>
          <ThemedText type="title">Who is using MyBuddy?</ThemedText>
        <ThemedText style={{ color: theme.textSecondary, marginTop: 8 }}>
          Please select a child to continue.
        </ThemedText>
        </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <ThemedText style={{ color: theme.error, marginBottom: 12 }}>
            {error}
          </ThemedText>
          <Button onPress={loadChildren}>Try again</Button>
        </View>
      ) : (
        <View style={styles.list}>
          {catalogsBanner}

          {children.map((c) => {
            const interestsText = formatInterests(c.interests);
            const avatar = c.avatarId ? avatarsById?.get(c.avatarId) : null;

            return (
              <Pressable
                key={c.id}
                onPress={() => handlePick(c.id)}
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.backgroundDefault,
                    borderColor: theme.backgroundSecondary,
                  },
                ]}
              >
                <View style={styles.cardRow}>
                  <View style={styles.cardText}>
                    <ThemedText type="headline">{c.name}</ThemedText>
                    {interestsText ? (
                      <ThemedText
                        style={{ color: theme.textSecondary, marginTop: 4 }}
                      >
                        Interests: {interestsText}
                      </ThemedText>
                    ) : null}
                  </View>

                  <View style={styles.avatar}>
                    <AvatarThumb
                      name={c.name}
                      imageUri={avatar?.imagePath ?? null}
                      backgroundColor={theme.backgroundSecondary}
                      size={64}
                      borderRadius={10}
                    />
                  </View>
                </View>
              </Pressable>
            );
          })}

          <Button
            onPress={handleAddNewKid}
            style={styles.addKidButton}
          >
            <ThemedText type="body" style={{ color: theme.text }}>
              Add New Kid
            </ThemedText>
          </Button>
        </View>
      )}
      </View>
    </ThemedView>
  );
}