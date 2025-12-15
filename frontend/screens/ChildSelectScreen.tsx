import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { listChildren, ChildModel } from "@/services/childrenService";
import { useCurrentChildId } from "@/contexts/ChildContext";
import { useTheme } from "@/hooks/useTheme";
import { RootStackParamList } from "@/navigation/RootNavigator";
import { Spacing, BorderRadius } from "@/constants/theme";

type Props = NativeStackScreenProps<RootStackParamList, "ChildSelect">;

export default function ChildSelectScreen({ navigation }: Props) {
  const { setChildId } = useCurrentChildId();
  const { theme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [children, setChildren] = useState<ChildModel[]>([]);

  const load = useCallback(async () => {
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
      setLoading(false);
    }
  }, [navigation]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await load();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

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

  return (
    <ThemedView style={styles.container}>
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
          <Button onPress={load}>Try again</Button>
        </View>
      ) : (
        <View style={styles.list}>
          {children.map((c) => (
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
              <ThemedText type="headline">{c.name}</ThemedText>
              {c.interests?.length ? (
                <ThemedText style={{ color: theme.textSecondary, marginTop: 4 }}>
                  Interests: {c.interests.join(", ")}
                </ThemedText>
              ) : null}
            </Pressable>
          ))}
        </View>
      )}
    </ThemedView>
  );
}

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
});
