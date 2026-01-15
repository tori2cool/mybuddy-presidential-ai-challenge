// frontend/components/CreateAffirmationModal.tsx
import React from 'react';
import {
  Modal,
  View,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { ThemedText } from '@/components/ThemedText';
import { Feather } from '@expo/vector-icons';
import { Spacing, BorderRadius } from '@/constants/theme';

interface CreateAffirmationModalProps {
  visible: boolean;
  onClose: () => void;
  text: string;
  onTextChange: (text: string) => void;
  onSave: () => void;
}

export function CreateAffirmationModal({
  visible,
  onClose,
  text,
  onTextChange,
  onSave,
}: CreateAffirmationModalProps) {
  const { theme } = useTheme();

  const modalStyles = StyleSheet.create({
    modalContainer: {
      flex: 1,
      backgroundColor: theme.backgroundSecondary, // ← secondary as main background
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.lg + (Platform.OS === 'ios' ? 20 : 0),
        paddingBottom: Spacing.md,
        backgroundColor: theme.primary + '50',
    },
    modalContent: {
      flex: 1,
      padding: Spacing.lg,
    },
    modalSubtitle: {
      fontSize: 15,
      color: theme.textSecondary,
      textAlign: 'center',
      marginBottom: Spacing.lg,
    },
    affirmationInput: {
      minHeight: 140,
      maxHeight: 240,
      borderWidth: 1,
      borderRadius: BorderRadius.md,
      padding: Spacing.md,
      fontSize: 17,
      textAlignVertical: 'top',
      marginBottom: Spacing.lg,
      backgroundColor: theme.backgroundRoot, // lighter background for input contrast
      color: theme.text,
      borderColor: theme.primary + '60',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 4,
    },
    modalButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: Spacing.md,
    },
    modalButton: {
      flex: 1,
      paddingVertical: Spacing.md,
      borderRadius: BorderRadius.md,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 3,
    },
    cancelButton: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: theme.textSecondary,
    },
    saveButton: {
      backgroundColor: text.trim() ?  theme.primary : theme.primary + '80' ,
      borderWidth: text.trim() ? 2 : 0,
      borderColor: text.trim() ? '#6B7280' : 'transparent', // hardcoded medium gray border when active
    },
    modalButtonText: {
      fontSize: 16,
      fontWeight: '600',
    },
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={modalStyles.modalContainer}>
          <View style={modalStyles.modalHeader}>
            <ThemedText type="headline" style={{ color: theme.text }}>
              Create Your Affirmation
            </ThemedText>
            <Pressable onPress={onClose}>
              <Feather name="x" size={28} color={theme.text} />
            </Pressable>
          </View>

          <View style={modalStyles.modalContent}>
            <ThemedText style={modalStyles.modalSubtitle}>
              Write a positive message that inspires you!
            </ThemedText>

            <TextInput
              style={modalStyles.affirmationInput}
              placeholder="I am..."
              placeholderTextColor={theme.textSecondary}
              value={text}
              onChangeText={onTextChange}
              multiline
              maxLength={100}
              autoFocus
            />

            <View style={modalStyles.modalButtons}>
              <Pressable
                style={[modalStyles.modalButton, modalStyles.cancelButton]}
                onPress={onClose}
              >
                <ThemedText style={[modalStyles.modalButtonText, { color: '#000000' }]}>Cancel</ThemedText>
              </Pressable>

              <Pressable
                style={[modalStyles.modalButton, modalStyles.saveButton]}
                disabled={!text.trim()}
                onPress={onSave}
              >
                <ThemedText style={[modalStyles.modalButtonText, { color: 'white' }]}>Save</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}