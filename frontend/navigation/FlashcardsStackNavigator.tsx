import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import FlashcardsScreen from "@/screens/FlashcardsScreen";
import { useTheme } from "@/hooks/useTheme";
import { getCommonScreenOptions } from "./screenOptions";
import { IconButton } from "@/components/IconButton";
import { Spacing } from "@/constants/theme";
import { NavigatorScreenParams } from "@react-navigation/native";
import { RootStackParamList, TabParamList } from "@/navigation/RootNavigator";
import { View } from "react-native";
import { useProfileScroll } from "@/contexts/ProfileScrollContext";

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
        options={({ navigation }) => ({
          title: "Flashcards",
          headerRight: () => {
            const { triggerScrollToBottom } = useProfileScroll();

            return (
              <View style={{ paddingRight: 0 }}>
                <IconButton
                  name="settings"
                  color="white"
                  size={24}
                  style={{
                    backgroundColor: "rgba(0,0,0,0.2)",
                    borderRadius: 22,
                    marginTop: -5,
                  }}
                  onPress={() => {
                    console.log('Settings tapped - navigating to Profile tab');

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
              </View>
            );
          },
        })}
      />
    </Stack.Navigator>
  );
}