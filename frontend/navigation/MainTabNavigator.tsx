import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet } from "react-native";
import AffirmationsStackNavigator from "@/navigation/AffirmationsStackNavigator";
import FlashcardsStackNavigator from "@/navigation/FlashcardsStackNavigator";
import OutdoorStackNavigator from "@/navigation/OutdoorStackNavigator";
import ChoresStackNavigator from "@/navigation/ChoresStackNavigator";
import ProfileStackNavigator from "@/navigation/ProfileStackNavigator";
import { useTheme } from "@/hooks/useTheme";

export type MainTabParamList = {
  AffirmationsTab: undefined;
  FlashcardsTab: undefined;
  OutdoorTab: undefined;
  ChoresTab: undefined;
  ProfileTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Tab.Navigator
      initialRouteName="AffirmationsTab"
      screenOptions={{
        tabBarActiveTintColor: isDark ? '#079D8E' : theme.tabIconSelected,
        tabBarInactiveTintColor: isDark ? '#D1D5DB' : theme.tabIconDefault,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: Platform.select({
            web: theme.backgroundRoot,
            ios: 'transparent',
            android: isDark ? '#0F172A' : theme.backgroundDefault,
          }),
          borderTopWidth: Platform.OS === 'web' ? 1 : 0, 
          borderTopColor: Platform.OS === 'web'
            ? theme.tabIconDefault
            : 'transparent',
          elevation: 0,
        },
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView
              intensity={isDark ? 80 : 100}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : null,
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="AffirmationsTab"
        component={AffirmationsStackNavigator}
        options={{
          title: "Affirmations",
          tabBarIcon: ({ color, size }) => (
            <Feather name="heart" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="FlashcardsTab"
        component={FlashcardsStackNavigator}
        options={{
          title: "Flashcards",
          tabBarIcon: ({ color, size }) => (
            <Feather name="book" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="OutdoorTab"
        component={OutdoorStackNavigator}
        options={{
          title: "Outdoor",
          tabBarIcon: ({ color, size }) => (
            <Feather name="sun" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ChoresTab"
        component={ChoresStackNavigator}
        options={{
          title: "Chores",
          tabBarIcon: ({ color, size }) => (
            <Feather name="check-circle" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStackNavigator}
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Feather name="user" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
