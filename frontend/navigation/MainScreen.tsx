import React from "react";

import MainTabNavigator from "@/navigation/MainTabNavigator";
import { FloatingBuddy } from "@/components/FloatingBuddy";
import { BuddyChatSheet } from "@/components/BuddyChatSheet";
import { BuddyCustomizer } from "@/components/BuddyCustomizer";

export default function MainScreen() {
  return (
    <>
      <MainTabNavigator />
      <FloatingBuddy />
      <BuddyChatSheet />
      <BuddyCustomizer />
    </>
  );
}