import React from 'react';
import {
  Modal,
  View,
  Pressable,
  StyleSheet,
  Platform,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, BorderRadius } from '@/constants/theme';
import * as Sharing from 'expo-sharing';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ShareMenuProps {
  visible: boolean;
  onClose: () => void;
  affirmationText: string;
  affirmationImageUri?: string;
}

export function ShareMenu({
  visible,
  onClose,
  affirmationText,
  affirmationImageUri,
}: ShareMenuProps) {
  const { theme } = useTheme();

  const appUrl = 'https://mybuddy-and-me.com';
  const shareMessage = `I just read this positive affirmation in MyBuddy:\n\n“${affirmationText}”\n\nDownload MyBuddy and get your daily affirmations!`;

  const brandColors = {
    x: '#000000',
    facebook: '#1877F2',
    instagram: '#E1306C',
    tiktok: '#000000',
  };

  // Dynamic container width based on platform
  const containerWidth = Platform.OS === 'web'
    ? Math.min(SCREEN_WIDTH * 0.55, 400)  // wider on large screens, cap at 400px
    : '100%';  // full width on mobile

  const shareToPlatform = async (platform: 'x' | 'facebook' | 'instagram' | 'tiktok') => {
    if (!affirmationImageUri) {
      Alert.alert('No image', 'Image not ready for sharing.');
      return;
    }

    if (Platform.OS === 'web') {
      try {
        if (navigator.share) {
          const response = await fetch(affirmationImageUri);
          const blob = await response.blob();
          const file = new File([blob], 'affirmation.png', { type: 'image/png' });
          await navigator.share({
            files: [file],
            title: 'MyBuddy Affirmation',
            text: shareMessage,
          });
        } else {
          const link = document.createElement('a');
          link.href = affirmationImageUri;
          link.download = `mybuddy-affirmation-${Date.now()}.png`;
          link.click();

          let shareUrl = '';
          const encodedText = encodeURIComponent(shareMessage);
          const encodedUrl = encodeURIComponent(appUrl);

          switch (platform) {
            case 'x':
              shareUrl = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
              break;
            case 'facebook':
              shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`;
              break;
            case 'instagram':
              shareUrl = 'https://www.instagram.com/';
              break;
            case 'tiktok':
              shareUrl = 'https://www.tiktok.com/';
              break;
          }

          if (shareUrl) {
            window.open(shareUrl, '_blank', 'noopener,noreferrer');
          }
          Alert.alert('Image downloaded', `Upload it manually to ${platform}.`);
        }
      } catch (err) {
        console.error('Web share failed:', err);
        Alert.alert('Share failed on web', 'Try downloading the image manually.');
      }
      onClose();
      return;
    }

    else {
      // Mobile: show "coming soon" message instead of sharing for now
      Alert.alert(
        'Coming in Version 2.0',
        'Full sharing with image preview is coming in the next major version!\n\nFor now you can copy the text manually or screenshot the affirmation.',
        [
          { text: 'OK', style: 'default' },
        ]
      );
      onClose(); // still close the menu after alert
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={[styles.container, { 
          backgroundColor: theme.backgroundRoot,
          width: containerWidth }]}>
          <View style={styles.handle} />

          <ThemedText style={styles.title}>Share this affirmation</ThemedText>

          <Pressable style={styles.option} onPress={() => shareToPlatform('x')}>
            <Ionicons name="logo-twitter" size={26} color={brandColors.x} />
            <ThemedText style={styles.optionText}>Share to X</ThemedText>
          </Pressable>

          <Pressable style={styles.option} onPress={() => shareToPlatform('facebook')}>
            <Ionicons name="logo-facebook" size={26} color={brandColors.facebook} />
            <ThemedText style={styles.optionText}>Share to Facebook</ThemedText>
          </Pressable>

          <Pressable style={styles.option} onPress={() => shareToPlatform('instagram')}>
            <Ionicons name="logo-instagram" size={26} color={brandColors.instagram} />
            <ThemedText style={styles.optionText}>Share to Instagram</ThemedText>
          </Pressable>

          <Pressable style={styles.option} onPress={() => shareToPlatform('tiktok')}>
            <Ionicons name="logo-tiktok" size={26} color={brandColors.tiktok} />
            <ThemedText style={styles.optionText}>Share to TikTok</ThemedText>
          </Pressable>

          <Pressable style={styles.cancel} onPress={onClose}>
            <ThemedText style={[styles.cancelText, { color: theme.textSecondary }]}>
              Cancel
            </ThemedText>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  container: {
    width: Math.min(SCREEN_WIDTH * 0.55, 280),
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: '#ccc',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  optionText: {
    fontSize: 16,
  },
  cancel: {
    marginTop: Spacing.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '500',
  },
});