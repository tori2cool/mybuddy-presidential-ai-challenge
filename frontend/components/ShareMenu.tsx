// frontend/components/ShareMenu.tsx
import React from 'react';
import {
  Modal,
  View,
  Pressable,
  StyleSheet,
  Share,
  Platform,
  Dimensions
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, BorderRadius } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ShareMenuProps {
  visible: boolean;
  onClose: () => void;
  affirmationText: string;
}

export function ShareMenu({ visible, onClose, affirmationText }: ShareMenuProps) {
  const { theme } = useTheme();

  const appUrl = 'https://mybuddy-and-me.com'; // or your app store / website link
  const shareText = `I just read this positive affirmation in MyBuddy:\n\n“${affirmationText}”\n\nDownload MyBuddy and get your daily affirmations!`;

  const encodedText = encodeURIComponent(shareText);
  const encodedUrl = encodeURIComponent(appUrl);

  const shareUrls = {
    x: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    instagram: `https://www.instagram.com/`, // Instagram doesn't have a direct web share; user opens app
    tiktok: `https://www.tiktok.com/`, // TikTok also lacks direct web share link
  };

  const handleShare = async (platform: keyof typeof shareUrls) => {
    if (Platform.OS === 'web') {
      // Web: open share link in new tab
      const url = shareUrls[platform];
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
      onClose();
    } else {
      // Mobile: use native share
      try {
        await Share.share({
          message: `${shareText}\n\n${appUrl}`,
          url: appUrl,
          title: 'MyBuddy Affirmation',
        });
        onClose();
      } catch (error) {
        console.error('Share failed:', error);
      }
    }
  };

  const brandColors = {
    x: '#000000',
    facebook: '#1877F2',
    instagram: '#E1306C', // approximate IG pink-purple
    tiktok: '#000000', // TikTok is mostly black
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
          <View style={styles.handle} />

          <ThemedText style={styles.title}>Share this affirmation</ThemedText>

          <Pressable style={styles.option} onPress={() => handleShare('x')}>
            <Ionicons name="logo-twitter" size={26} color={brandColors.x} />
            <ThemedText style={styles.optionText}>Share to X</ThemedText>
          </Pressable>

          <Pressable style={styles.option} onPress={() => handleShare('facebook')}>
            <Ionicons name="logo-facebook" size={26} color={brandColors.facebook} />
            <ThemedText style={styles.optionText}>Share to Facebook</ThemedText>
          </Pressable>

          <Pressable style={styles.option} onPress={() => handleShare('instagram')}>
            <Ionicons name="logo-instagram" size={26} color={brandColors.instagram} />
            <ThemedText style={styles.optionText}>Share to Instagram</ThemedText>
          </Pressable>

          <Pressable style={styles.option} onPress={() => handleShare('tiktok')}>
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