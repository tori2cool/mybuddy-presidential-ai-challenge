import React, { JSX, useState } from 'react';
import {
  Modal,
  View,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import ColorPicker, { Panel1, Preview, HueSlider, SaturationSlider, BrightnessSlider } from 'reanimated-color-picker';
import { useTheme } from '@/hooks/useTheme';
import { ThemedText } from '@/components/ThemedText';
import { Feather } from '@expo/vector-icons';
import { Spacing, BorderRadius } from '@/constants/theme';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

interface CreateAffirmationModalProps {
  visible: boolean;
  onClose: () => void;
  text: string;
  onTextChange: (text: string) => void;
  onSave: (savedText: string, gradientColors?: string[]) => void; 
}

export function CreateAffirmationModal({
  visible,
  onClose,
  text,
  onTextChange,
  onSave,
}: CreateAffirmationModalProps): JSX.Element {
  const { theme } = useTheme();

  const modalStyles = StyleSheet.create({
    modalContainer: {
      flex: 1,
      backgroundColor: theme.backgroundSecondary,
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
      backgroundColor: theme.backgroundRoot,
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
      backgroundColor: text.trim() ? theme.primary : theme.primary + '80',
      borderWidth: text.trim() ? 2 : 0,
      borderColor: text.trim() ? '#6B7280' : 'transparent',
    },
    modalButtonText: {
      fontSize: 16,
      fontWeight: '600',
    },

    // ── NEW STYLES ADDED FOR GRADIENT & COLOR PICKER ──
    gradientBackground: {
      flex: 1,
      width: '100%',
      height: '100%',
    },
    colorPickerSection: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: Spacing.lg,
      gap: Spacing.md,
    },
    colorSwatch: {
      width: 50,
      height: 50,
      borderRadius: BorderRadius.md,
      borderWidth: 2,
      borderColor: theme.textSecondary + '80',
    },
    pickerButton: {
      padding: Spacing.sm,
      backgroundColor: theme.primary + '20',
      borderRadius: BorderRadius.sm,
    },
    pickerModalOverlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.6)',
    },
    pickerModalContent: {
      backgroundColor: 'white',
      padding: Spacing.lg,
      borderRadius: BorderRadius.lg,
      width: '85%',
      alignItems: 'center',
    },
  });

  const [color1, setColor1] = useState('#34ebde'); 
  const [color2, setColor2] = useState('#2c71e8'); 
  const [pickerVisible, setPickerVisible] = useState(false);
  const [editingColor, setEditingColor] = useState<'1' | '2'>('1');

  const openPicker = (which: '1' | '2') => {
    setEditingColor(which);
    setPickerVisible(true);
  };

  const handleColorSelect = (colorObj: { hex: any; }) => {
    const hex = colorObj.hex;
    if (editingColor === '1') setColor1(hex);
    else setColor2(hex);
  };

  return ( 
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
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

            {/* Color picker triggers */}
            <View style={modalStyles.colorPickerSection}>
              <TouchableOpacity onPress={() => openPicker('1')}>
                <LinearGradient colors={[color1, color2]} style={modalStyles.colorSwatch} />
              </TouchableOpacity>

              <TouchableOpacity
                style={modalStyles.pickerButton}
                onPress={() => openPicker('1')}
              >
                <ThemedText>Pick Color 1</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={modalStyles.pickerButton}
                onPress={() => openPicker('2')}
              >
                <ThemedText>Pick Color 2</ThemedText>
              </TouchableOpacity>
            </View>

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
                onPress={() => {
                  onSave(text, [color1, color2]);
                  onClose();
                }}
              >
                <ThemedText style={[modalStyles.modalButtonText, { color: 'white' }]}>Save</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </GestureHandlerRootView>

      {/* Color picker modal */}
      <Modal
        visible={pickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerVisible(false)}
      >
        <View style={modalStyles.pickerModalOverlay}>
          <View style={modalStyles.pickerModalContent}>
            <ThemedText type="headline">
              Pick {editingColor === '1' ? 'First' : 'Second'} Color
            </ThemedText>

            <ColorPicker
              value={editingColor === '1' ? color1 : color2}
              onChangeJS={handleColorSelect}
              style={{ width: '100%', height: 280 }}
            >
              <Preview />
                <Panel1 />
                <HueSlider />
              </ColorPicker>

            <View style={{ flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginTop: Spacing.lg }}>
              <TouchableOpacity onPress={() => setPickerVisible(false)}>
                <ThemedText style={{ color: theme.primary }}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setPickerVisible(false)}>
                <ThemedText style={{ color: theme.primary, fontWeight: 'bold' }}>Done</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}