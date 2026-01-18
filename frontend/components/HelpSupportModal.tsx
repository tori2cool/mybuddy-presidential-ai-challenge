import React from 'react';
import {
  View,
  TouchableOpacity,
  Linking,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemedText } from '@/components/ThemedText';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Spacing, BorderRadius } from '@/constants/theme';
import * as Clipboard from 'expo-clipboard'
import Toast from 'react-native-toast-message';

type HelpSupportModalProps = {
  visible: boolean;
  onClose: () => void;
};

export function HelpSupportModal({ visible, onClose }: HelpSupportModalProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  if (!visible) return null;

  const openUrl = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        // Fallback: maybe show a toast "Link not supported"
        console.warn("Can't open URL:", url);
      }
    } catch (err) {
      console.error('Error opening URL:', err);
    }
  };

  const openEmail = () => {
    const email = 'support@MyBuddy-and-Me.com';
    const subject = 'Help & Support Request';
    const body = 'Describe your issue here...';
    const mailto = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    openUrl(mailto);
  };

  return (
    <TouchableOpacity
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
      }}
      activeOpacity={1}
      onPress={onClose}
    >
      <View
        style={{
          backgroundColor: theme.backgroundRoot,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          padding: 24,
          paddingBottom: insets.bottom + 80,
          maxHeight: '60%',
          width: '100%',
          maxWidth: Platform.OS === 'web' ? 500 : '100%', 
          alignSelf: 'center',
        }}
      >
        <ThemedText
          type="headline"
          style={{ textAlign: 'center', marginBottom: 24, color: theme.text }}
        >
          Help & Support
        </ThemedText>

        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 16,
            borderBottomWidth: 1,
            borderBottomColor: theme.textSecondary + '30',
          }}
          onPress={() => openUrl('https://mybuddy-ai.com/terms')}
        >
          <Feather name="file-text" size={24} color={theme.primary} style={{ marginRight: 16 }} />
          <ThemedText style={{ fontSize: 18, color: theme.text, flex: 1 }}>
            View Terms of Service
          </ThemedText>
          <Feather name="external-link" size={20} color={theme.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 16,
            borderBottomWidth: 1,
            borderBottomColor: theme.textSecondary + '30',
          }}
          onPress={() => openUrl('https://mybuddy-ai.com/privacy')}
        >
          <Feather name="shield" size={24} color={theme.primary} style={{ marginRight: 16 }} />
          <ThemedText style={{ fontSize: 18, color: theme.text, flex: 1 }}>
            View Privacy Policy
          </ThemedText>
          <Feather name="external-link" size={20} color={theme.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 16,
          }}
          onPress={openEmail}
        >
          <Feather name="mail" size={24} color={theme.primary} style={{ marginRight: 16 }} />
          <View style={{ flex: 1 }}>
            <ThemedText style={{ fontSize: 18, color: theme.text }}>
              Contact Support
            </ThemedText>
            <ThemedText style={{ fontSize: 14, color: theme.textSecondary, marginTop: 4 }}>
              Email us at support@MyBuddy-and-Me.com
            </ThemedText>
          </View>
          <Feather name="arrow-right" size={20} color={theme.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 16,
                borderBottomWidth: 1,
                borderBottomColor: theme.textSecondary + '30',
            }}
            onPress={async () => {
                const email = 'support@MyBuddy-and-Me.com';
                try {
                await Clipboard.setStringAsync(email);
                Toast.show({ type: 'success', text1: 'Copied to clipboard!' });
                console.log('Email copied');  // temp debug
                } catch (err) {
                console.error('Failed to copy email', err);
                }
            }}
            >
            <Feather name="copy" size={24} color={theme.primary} style={{ marginRight: 16 }} />
            <ThemedText style={{ fontSize: 18, color: theme.text, flex: 1 }}>
                Copy Support Email
            </ThemedText>
            </TouchableOpacity>

        <TouchableOpacity
          onPress={onClose}
          style={{
            marginTop: 24,
            paddingVertical: 12,
            backgroundColor: theme.backgroundSecondary,
            borderRadius: BorderRadius.md,
            alignItems: 'center',
          }}
        >
          <ThemedText style={{ color: theme.text, fontWeight: '600' }}>
            Close
          </ThemedText>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}