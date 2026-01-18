import { BaseToast, ErrorToast, InfoToast } from 'react-native-toast-message';
import { useTheme } from '@/hooks/useTheme';

export const toastConfig = {
  success: (props: any) => {
    const { theme } = useTheme();
    return (
      <BaseToast
        {...props}
        style={{ borderLeftColor: theme.success, backgroundColor: theme.backgroundSecondary }}
        contentContainerStyle={{ paddingHorizontal: 15 }}
        text1Style={{ fontSize: 16, fontWeight: '600', color: theme.text }}
        text2Style={{ fontSize: 14, color: theme.textSecondary }}
      />
    );
  },

  error: (props: any) => {
    const { theme } = useTheme();
    return (
      <ErrorToast
        {...props}
        style={{ borderLeftColor: theme.error, backgroundColor: theme.backgroundSecondary }}
        contentContainerStyle={{ paddingHorizontal: 15 }}
        text1Style={{ fontSize: 16, fontWeight: '600', color: theme.text }}
        text2Style={{ fontSize: 14, color: theme.textSecondary }}
      />
    );
  },

  info: (props: any) => {
    const { theme } = useTheme();
    return (
      <InfoToast
        {...props}
        style={{ borderLeftColor: theme.primary, backgroundColor: theme.backgroundSecondary }}
        contentContainerStyle={{ paddingHorizontal: 15 }}
        text1Style={{ fontSize: 16, fontWeight: '600', color: theme.text }}
        text2Style={{ fontSize: 14, color: theme.textSecondary }}
      />
    );
  },
};