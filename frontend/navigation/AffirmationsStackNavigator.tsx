import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AffirmationsScreen from "@/screens/AffirmationsScreen";

export type AffirmationsStackParamList = {
  Affirmations: undefined;
};

const Stack = createNativeStackNavigator<AffirmationsStackParamList>();

export default function AffirmationsStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Affirmations" component={AffirmationsScreen} />
    </Stack.Navigator>
  );
}
