import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import OnboardingWelcomeScreen from "@/screens/OnboardingWelcomeScreen";
import OnboardingQuizScreen from "@/screens/OnboardingQuizScreen";
import OnboardingNameAvatarScreen from "@/screens/OnboardingNameAvatarScreen";
import type { UUID } from "@/types/models";

export type OnboardingParamList = {
  Welcome: undefined;
  Quiz: undefined;
  NameAvatar: { interests: UUID[] };
};

const Stack = createNativeStackNavigator<OnboardingParamList>();

interface OnboardingNavigatorProps {
  onComplete: (childId: string) => void | Promise<void>;
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
      <Stack.Screen name="NameAvatar" initialParams={{ interests: [] }}>
        {(props) => (
          <OnboardingNameAvatarScreen
            {...props}
            onComplete={onComplete}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
