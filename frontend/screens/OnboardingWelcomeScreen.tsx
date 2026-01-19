import { View, StyleSheet, Image, Platform } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { ThemedText } from "@/components/ThemedText";
import { CancelXButton } from "@/components/CancelXButton";
import { Button } from "@/components/Button";
import { OnboardingParamList } from "@/navigation/OnboardingNavigator";
import { Spacing, Typography, Gradients } from "@/constants/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/theme";

type WelcomeScreenNavigationProp = NativeStackNavigationProp<
  OnboardingParamList,
  "Welcome"
>;

export default function OnboardingWelcomeScreen() {
  const navigation = useNavigation<WelcomeScreenNavigationProp>();
  const insets = useSafeAreaInsets();

  const handleCancel = () => {
    const parent = navigation.getParent();
    if (parent) {
      parent.reset({ index: 0, routes: [{ name: "ChildSelect" as never }] });
      return;
    }

    // Fallback in case the screen isn't inside the expected nested navigator
    navigation.navigate("ChildSelect" as never);
  };

  return (
    <LinearGradient
      colors={["#C4C4C4", "#079D8E"]}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <CancelXButton onPress={handleCancel} />
      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + Spacing.xl,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
      >
        <View style={styles.iconContainer}>
          <Image
            source={require("@/assets/images/logo.png")}
            style={styles.icon}
            resizeMode="contain"
          />
        </View>
        <ThemedText
          style={[styles.title, { color: "white" }]}
          type="hero"
        >
          Welcome to MyBuddy!
        </ThemedText>
        <ThemedText
          style={[styles.subtitle, { color: "white" }]}
          type="body"
        >
          Your fun learning companion
        </ThemedText>
        <View style={styles.buttonContainer}>
          <Button
            onPress={() => navigation.navigate("Quiz")}
            style={{
              width: "100%",
              backgroundColor: Colors.light.secondary
            }}
          >
            Let's Get Started
          </Button>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  gradientWeb: {
    maxWidth: 960,
    width: "100%",
    alignSelf: "center",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  iconContainer: {
    marginBottom: Spacing.xxl,
  },
  icon: {
    width: 120,
    height: 120,
  },
  title: {
    ...Typography.hero,
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  subtitle: {
    ...Typography.body,
    textAlign: "center",
    marginBottom: Spacing.xxl,
  },
  buttonContainer: {
    width: "100%",
    marginTop: Spacing.xxl,
  },
  button: {
    width: "100%",
  },
});
