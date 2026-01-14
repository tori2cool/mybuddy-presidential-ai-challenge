import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  Linking,
  Platform,
} from 'react-native';
import CheckBox from 'expo-checkbox';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/hooks/useTheme';

const TERMS_KEY = 'terms_key';

interface FirstTimeTermsModalProps {
  visible: boolean;
  onAccept: () => void;
  onDecline?: () => void; // optional: logout or close
}

export function FirstTimeTermsModal({
  visible,
  onAccept,
  onDecline,
}: FirstTimeTermsModalProps) {
  const { theme } = useTheme();
  const [checked, setChecked] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(false);

  useEffect(() => {
    const checkAcceptance = async () => {
      let value: string | null = null;

      if (Platform.OS !== 'web') {
        value = await SecureStore.getItemAsync(TERMS_KEY);
      } else {
        value = await AsyncStorage.getItem(TERMS_KEY);
      }

      const isFirst = value !== 'true';
      setIsFirstTime(isFirst);
    };

    checkAcceptance();
  }, []);

  const handleAccept = async () => {
    if (!checked) return;

    if (Platform.OS !== 'web') {
      await SecureStore.setItemAsync(TERMS_KEY, 'true');
    } else {
      await AsyncStorage.setItem(TERMS_KEY, 'true');
    }

    onAccept();
  };

  if (!visible || !isFirstTime) return null;

  return (
    <Modal
      visible={true}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.65)' }]}>
        <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
          <ThemedText type="title" style={styles.title}>
            Welcome to MyBuddy
          </ThemedText>

          <ScrollView style={styles.scroll}>
            <ThemedText style={styles.text}>
              This app uses AI to support your child's learning. All interactions are supervised by parents.
            </ThemedText>

            <ThemedText style={styles.text}>
              Please review and accept our policies to continue:
            </ThemedText>

            <Pressable onPress={() => Linking.openURL('https://mybuddy-ai.com/privacy')}>
              <ThemedText style={[styles.link, { color: theme.primary }]}>
                Privacy Policy
              </ThemedText>
            </Pressable>

            <Pressable onPress={() => Linking.openURL('https://mybuddy-ai.com/terms')}>
              <ThemedText style={[styles.link, { color: theme.primary }]}>
                Terms of Service
              </ThemedText>
            </Pressable>

            <View style={styles.checkboxContainer}>
              <CheckBox
                value={checked}
                onValueChange={setChecked}
                color={checked ? theme.primary : theme.textSecondary}
                style={styles.checkbox}
              />
              <ThemedText style={styles.checkboxText}>
                I have read and agree to the Privacy Policy and Terms of Service
              </ThemedText>
            </View>
          </ScrollView>

          <View style={styles.buttons}>
            {onDecline && (
              <Pressable
                style={[styles.button, styles.declineButton]}
                onPress={onDecline}
              >
                <ThemedText style={{ color: theme.text }}>Decline</ThemedText>
              </Pressable>
            )}

            <Pressable
              style={[
                styles.button,
                styles.acceptButton,
                { backgroundColor: checked ? theme.primary : theme.textSecondary + '80' },
              ]}
              onPress={handleAccept}
              disabled={!checked}
            >
              <ThemedText style={styles.buttonText}>Continue</ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: {
    width: '88%',
    maxHeight: '82%',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 12,
  },
  title: { textAlign: 'center', marginBottom: 20 },
  scroll: { marginBottom: 24 },
  text: { marginBottom: 16, lineHeight: 22 },
  link: { marginBottom: 12, textDecorationLine: 'underline' },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 20,
    gap: 12,
  },
  checkbox: { marginTop: 4 },
  checkboxText: { flex: 1, lineHeight: 20 },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  declineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  acceptButton: {},
  buttonText: { color: 'white', fontWeight: '600', fontSize: 16 },
});