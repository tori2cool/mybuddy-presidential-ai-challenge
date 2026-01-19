import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ChoresScreen from "@/screens/ChoresScreen";
import { useTheme } from "@/hooks/useTheme";
import { getCommonScreenOptions } from "./screenOptions";
import { useProfileScroll } from "@/contexts/ProfileScrollContext";
import { TabHeader } from "@/components/TabHeader";

export type ChoresStackParamList = {
  Chores: undefined;
};

const Stack = createNativeStackNavigator<ChoresStackParamList>();

export default function ChoresStackNavigator() {
  const { theme, isDark } = useTheme();
  const { triggerScrollToBottom } = useProfileScroll();

  return (
    <Stack.Navigator
      screenOptions={getCommonScreenOptions({ theme, isDark, transparent: true })}
    >
      <Stack.Screen
        name="Chores"
        component={ChoresScreen}
        options={({ navigation }) => ({
          headerShown: true,
          header: () => (
            <TabHeader
              title="My Chores"
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
