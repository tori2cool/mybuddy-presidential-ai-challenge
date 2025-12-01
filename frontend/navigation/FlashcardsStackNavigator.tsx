import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import FlashcardsScreen from "@/screens/FlashcardsScreen";
import { useTheme } from "@/hooks/useTheme";
import { getCommonScreenOptions } from "./screenOptions";

export type FlashcardsStackParamList = {
  Flashcards: undefined;
};

const Stack = createNativeStackNavigator<FlashcardsStackParamList>();

export default function FlashcardsStackNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={getCommonScreenOptions({ theme, isDark, transparent: true })}
    >
      <Stack.Screen
        name="Flashcards"
        component={FlashcardsScreen}
        options={{ title: "Flashcards" }}
      />
    </Stack.Navigator>
  );
}
