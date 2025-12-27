import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LessonsScreen from "@/screens/LessonsScreen";
import SchoolDashboardScreen from "@/screens/SchoolDashboardScreen";
import SubjectDetailScreen from "@/screens/SubjectDetailScreen";
import LevelActivityScreen from "@/screens/LevelActivityScreen";
import ParentPortalScreen from "@/screens/ParentPortalScreen";
import SchoolForumScreen from "@/screens/SchoolForumScreen";
import { useTheme } from "@/hooks/useTheme";
import { getCommonScreenOptions } from "./screenOptions";

export type LessonsStackParamList = {
  Lessons: undefined;
  SchoolDashboard: undefined;
  SubjectDetail: { subjectId: string };
  LevelActivity: { subjectId: string; level: number; starNumber: number };
  ParentPortal: undefined;
  SchoolForum: undefined;
};

const Stack = createNativeStackNavigator<LessonsStackParamList>();

export default function LessonsStackNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={getCommonScreenOptions({ theme, isDark, transparent: true })}
    >
      <Stack.Screen
        name="Lessons"
        component={LessonsScreen}
        options={{ title: "Lessons" }}
      />
      <Stack.Screen
        name="SchoolDashboard"
        component={SchoolDashboardScreen}
        options={{ title: "Online School" }}
      />
      <Stack.Screen
        name="SubjectDetail"
        component={SubjectDetailScreen}
        options={{ title: "Subject" }}
      />
      <Stack.Screen
        name="LevelActivity"
        component={LevelActivityScreen}
        options={{ title: "Learning" }}
      />
      <Stack.Screen
        name="ParentPortal"
        component={ParentPortalScreen}
        options={{ title: "Parent Portal" }}
      />
      <Stack.Screen
        name="SchoolForum"
        component={SchoolForumScreen}
        options={{ title: "Forum" }}
      />
    </Stack.Navigator>
  );
}
