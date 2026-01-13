import { useBuddy } from "@/contexts/BuddyContext";
import { useCurrentChild } from "@/contexts/ChildContext";
import { NavigationRoute, ParamListBase, useNavigationState } from "@react-navigation/native";
import { FloatingBuddy } from "./FloatingBuddy";
import { BuddyChatSheet } from "./BuddyChatSheet";
import { BuddyCustomizer } from "./BuddyCustomizer";


export function BuddyOverlays() {
  const { isChatOpen, isCustomizerOpen } = useBuddy();
  const { childId, isSessionActive } = useCurrentChild();

  const shouldShowBuddy = !!childId && isSessionActive;

  console.log(
    'BuddyOverlays check →',
    'childId:', childId,
    'isSessionActive:', isSessionActive,
    '→ shouldShowBuddy:', shouldShowBuddy
  );

  if (!shouldShowBuddy) {
    return null;
  }

  return (
    <>
      <FloatingBuddy />
      {isChatOpen && <BuddyChatSheet />}
      {isCustomizerOpen && <BuddyCustomizer />}
    </>
  );
}