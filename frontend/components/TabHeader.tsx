import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { Spacing } from '@/constants/theme';
import { Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface TabHeaderProps {
    title: string;
    onSettingsPress?: () => void;
    onLogoutPress?: () => void;
}

export function TabHeader({ title, onSettingsPress, onLogoutPress }: TabHeaderProps) {
    const insets = useSafeAreaInsets();
    const { theme } = useTheme();

    return (
        <View
            style={{
                height: 56 + insets.top,
                backgroundColor: theme.backgroundRoot,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: Spacing.lg,
                paddingTop: insets.top,
                paddingBottom: 8,
                borderBottomColor: theme.border,
            }}
        >
            {/* Centered title */}
            <ThemedText
                type="title"
                style={{
                    fontSize: 17,
                    textAlign: 'center',
                }}
            >
                {title}
            </ThemedText>

            {onLogoutPress ? (
                <Pressable onPress={onLogoutPress} style={{ position: 'absolute', right: Spacing.xl }}>
                    <ThemedText style={{ color: theme.text, fontWeight: '600' }}>Logout</ThemedText>
                </Pressable>
            ) : onSettingsPress ? (
                <Pressable
                    onPress={onSettingsPress}
                    style={{
                        position: 'absolute',
                        right: Spacing.xl - 8,
                        top: insets.top + 24,
                        transform: [{ translateY: -22 }],
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        backgroundColor: 'rgba(128,128,128,0.18)',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                    hitSlop={16}
                >
                    <Feather name="settings" size={22} color={theme.text} />
                </Pressable>
            ) : null}
        </View>
    );
}