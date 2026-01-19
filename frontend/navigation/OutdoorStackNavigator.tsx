import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import OutdoorScreen from "@/screens/OutdoorScreen";
import { useTheme } from "@/hooks/useTheme";
import { getCommonScreenOptions } from "./screenOptions";
import { useProfileScroll } from "@/contexts/ProfileScrollContext";
import { TabHeader } from '@/components/TabHeader';

export type OutdoorStackParamList = {
  Outdoor: undefined;
};

const Stack = createNativeStackNavigator<OutdoorStackParamList>();

export default function OutdoorStackNavigator() {
  const { theme, isDark } = useTheme();
  const { triggerScrollToBottom } = useProfileScroll();

  return (
    <Stack.Navigator
      screenOptions={getCommonScreenOptions({ theme, isDark, transparent: true })}
    >
      <Stack.Screen
        name="Outdoor"
        component={OutdoorScreen}
        options={({ navigation }) => ({
          headerShown: true,
          header: () => (
            <TabHeader
              title="Outdoor Time"
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
