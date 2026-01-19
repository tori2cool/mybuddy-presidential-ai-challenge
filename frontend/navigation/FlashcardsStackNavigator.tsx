import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import FlashcardsScreen from "@/screens/FlashcardsScreen";
import { useTheme } from "@/hooks/useTheme";
import { getCommonScreenOptions } from "./screenOptions";
import { useProfileScroll } from "@/contexts/ProfileScrollContext";
import { TabHeader } from "@/components/TabHeader";

export type FlashcardsStackParamList = {
  Flashcards: undefined;
};

const Stack = createNativeStackNavigator<FlashcardsStackParamList>();

export default function FlashcardsStackNavigator() {
  const { theme, isDark } = useTheme();
  const { triggerScrollToBottom } = useProfileScroll();

  return (
    <Stack.Navigator
      screenOptions={getCommonScreenOptions({ theme, isDark, transparent: true })}
    >
      <Stack.Screen
        name="Flashcards"
        component={FlashcardsScreen}
        options={({ navigation }) => ({
          headerShown: true,
          header: () => (
            <TabHeader
              title="Flashcards"
              onSettingsPress={() => {
                navigation.dispatch({
                  type: 'NAVIGATE',
                  payload: {
                    name: 'Main',
                    params: {
                      screen: 'ProfileTab',
                    },
                  },
                });
                setTimeout(() => {
                  triggerScrollToBottom();
                }, 400);
              }}
            />
          ),
        })}
      />
    </Stack.Navigator>
  );
}