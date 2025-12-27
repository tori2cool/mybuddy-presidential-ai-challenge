import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import OnboardingWelcomeScreen from "@/screens/OnboardingWelcomeScreen";
import OnboardingQuizScreen from "@/screens/OnboardingQuizScreen";
import OnboardingNameAvatarScreen from "@/screens/OnboardingNameAvatarScreen";

export type OnboardingParamList = {
  Welcome: undefined;
  Quiz: undefined;
  NameAvatar: { onComplete: () => void };
};

const Stack = createNativeStackNavigator<OnboardingParamList>();

interface OnboardingNavigatorProps {
  onComplete: () => void;
}

export default function OnboardingNavigator({ onComplete }: OnboardingNavigatorProps) {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
      initialRouteName="Welcome"
    >
      <Stack.Screen name="Welcome" component={OnboardingWelcomeScreen} />
      <Stack.Screen name="Quiz" component={OnboardingQuizScreen} />
      <Stack.Screen 
        name="NameAvatar" 
        component={OnboardingNameAvatarScreen}
        initialParams={{ onComplete }}
      />
    </Stack.Navigator>
  );
}
