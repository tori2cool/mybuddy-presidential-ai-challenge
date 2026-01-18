import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ChoresScreen from "@/screens/ChoresScreen";
import { useTheme } from "@/hooks/useTheme";
import { getCommonScreenOptions } from "./screenOptions";
import { useProfileScroll } from "@/contexts/ProfileScrollContext";
import { View } from "react-native";
import { IconButton } from "@/components/IconButton";

export type ChoresStackParamList = {
  Chores: undefined;
};

const Stack = createNativeStackNavigator<ChoresStackParamList>();

export default function ChoresStackNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={getCommonScreenOptions({ theme, isDark, transparent: true })}
    >
      <Stack.Screen
        name="Chores"
        component={ChoresScreen}
        options={({ navigation }) => ({
          title: "My Chores",
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
