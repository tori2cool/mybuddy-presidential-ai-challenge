import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  Modal,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { BlurView } from 'expo-blur';
import { ThemedText } from '@/components/ThemedText';
import { useBuddy, ConversationMessage } from '@/contexts/BuddyContext';
import { useTheme } from '@/hooks/useTheme';
import { getBuddyResponse, extractLearningsFromMessage } from '@/services/aiService';
import { Spacing, BorderRadius } from '@/constants/theme';
import { useDashboard } from '@/contexts/DashboardContext';
import { DashboardOut } from '@/types/models';

const QUICK_ACTIONS = [
  { id: 'flashcards', label: 'Help with flashcards', icon: 'book' },
  { id: 'chores', label: 'My chores today', icon: 'check-square' },
  { id: 'outdoor', label: 'Outdoor fun', icon: 'sun' },
  { id: 'diary', label: 'Diary mode', icon: 'edit-3' },
  { id: 'progress', label: 'My progress', icon: 'trending-up' },
];

interface MessageBubbleProps {
  message: ConversationMessage;
  isUser: boolean;
  theme: any;
}

export function BuddyChatSheet() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const {
    isChatOpen,
    setIsChatOpen,
    setIsCustomizerOpen,
    buddyData,
    addMessage,
    addLearnedFact,
    getRecentMessages
  } = useBuddy();

  const dashboard = useDashboard();

  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDiaryMode, setIsDiaryMode] = useState(false);
  const [showOptionsPanel, setShowOptionsPanel] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    dismissArea: {
      flex: 1,
    },
    sheetContainer: {
      borderTopLeftRadius: BorderRadius.lg,
      borderTopRightRadius: BorderRadius.lg,
      maxHeight: '90%',
      minHeight: '60%',
    },
    handleBar: {
      alignItems: 'center',
      paddingVertical: Spacing.sm,
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg,
      paddingBottom: Spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(0,0,0,0.1)',
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
    },
    buddyAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    miniEyes: {
      flexDirection: 'row',
      gap: 8,
    },
    miniEye: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: 'white',
    },
    statusText: {
      fontSize: 12,
    },
    headerButtons: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
    },
    customizeButton: {
      padding: Spacing.sm,
    },
    closeButton: {
      padding: Spacing.sm,
    },
    welcomeContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: Spacing.xl,
    },
    largeBuddyAvatar: {
      width: 100,
      height: 100,
      borderRadius: 50,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.lg,
    },
    largeEyes: {
      flexDirection: 'row',
      gap: 16,
      marginBottom: 8,
    },
    largeEye: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: 'white',
      alignItems: 'center',
      justifyContent: 'center',
    },
    largePupil: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: '#1a1a2e',
    },
    largeMouth: {
      width: 24,
      height: 12,
      backgroundColor: 'white',
      borderBottomLeftRadius: 12,
      borderBottomRightRadius: 12,
    },
    welcomeTitle: {
      textAlign: 'center',
      marginBottom: Spacing.sm,
    },
    welcomeText: {
      textAlign: 'center',
      marginBottom: Spacing.xl,
      lineHeight: 22,
    },
    quickActions: {
      width: '100%',
      gap: Spacing.sm,
      flex: 1
    },
    quickActionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: Spacing.md,
      borderRadius: BorderRadius.md,
      gap: Spacing.md,
    },
    quickActionText: {
      fontSize: 15,
    },
    messagesContainer: {
      padding: Spacing.md,
      paddingBottom: Spacing.xxl + insets.bottom + keyboardHeight + 60,
    },
    messageBubble: {
      maxWidth: '80%',
      padding: Spacing.md,
      borderRadius: BorderRadius.md,
      marginBottom: Spacing.sm,
    },
    userBubble: {
      alignSelf: 'flex-end',
      borderBottomRightRadius: 4,
    },
    buddyBubble: {
      alignSelf: 'flex-start',
      borderBottomLeftRadius: 4,
    },
    messageText: {
      fontSize: 15,
      lineHeight: 21,
    },
    typingIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm,
    },
    inputContainer: {
      borderTopWidth: 1,
      paddingTop: Spacing.sm,
      paddingHorizontal: Spacing.md,
    },
    diaryModeIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      paddingHorizontal: Spacing.sm,
      paddingVertical: 4,
      borderRadius: BorderRadius.sm,
      gap: 4,
      marginBottom: Spacing.xs,
    },
    diaryModeText: {
      fontSize: 12,
      fontWeight: '500',
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: Spacing.sm,
      paddingBottom: Spacing.sm,
    },
    textInput: {
      flex: 1,
      minHeight: 44,
      maxHeight: 120,
      borderRadius: BorderRadius.md,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      fontSize: 16,
    },
    sendButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chatArea: {
      flex: 1,
    },
    backToOptionsButton: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
      borderRadius: BorderRadius.md,
      marginHorizontal: Spacing.md,
      marginTop: Spacing.sm,
      gap: Spacing.xs,
    },
    backToOptionsText: {
      fontSize: 13,
      fontWeight: '500',
    },
    backToChatButton: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.md,
      marginBottom: Spacing.md,
      gap: Spacing.xs,
    },
    backToChatText: {
      fontSize: 14,
      fontWeight: '500',
    },
  });

  function MessageBubble({ message, isUser, theme }: MessageBubbleProps) {
    return (
      <View style={[
        styles.messageBubble,
        isUser ? styles.userBubble : styles.buddyBubble,
        { backgroundColor: isUser ? theme.primary : theme.backgroundSecondary }
      ]}>
        <ThemedText style={[
          styles.messageText,
          { color: isUser ? 'white' : theme.text }
        ]}>
          {message.content}
        </ThemedText>
      </View>
    );
  }
  
useEffect(() => {
  if (keyboardHeight > 0) {
    // Scroll when height changes (after layout has updated)
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100); // small delay to let KeyboardAvoidingView settle
  }
}, [keyboardHeight]);

  // useEffect(() => {
  //   const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
  //     setKeyboardHeight(e.endCoordinates.height);
  //     // setTimeout(() => {
  //     //   flatListRef.current?.scrollToEnd({ animated: true });
  //     // }, 150);  // small delay to let layout settle
  //   });

  //   const hideSub = Keyboard.addListener('keyboardDidHide', () => {
  //     setKeyboardHeight(0);
  //     setTimeout(() => {
  //       flatListRef.current?.scrollToEnd({ animated: true });
  //     }, 100);
  //   });

  //   return () => {
  //     showSub.remove();
  //     hideSub.remove();
  //   };
  // }, []);

  const translateY = useSharedValue(0);

  useEffect(() => {
    if (isChatOpen && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [isChatOpen, buddyData.conversationHistory.length]);

  const handleClose = () => {
    setIsChatOpen(false);
    setIsDiaryMode(false);
  };

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationY > 0) {
        translateY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      if (event.translationY > 100) {
        runOnJS(handleClose)();
      }
      translateY.value = withSpring(0);
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userMessage = inputText.trim();
    setInputText('');
    addMessage(userMessage, 'user');

    const learnings = extractLearningsFromMessage(userMessage);
    learnings.forEach(fact => addLearnedFact(fact));

    setIsLoading(true);

    try {
      const dashboardData = (dashboard.data ?? {
        today: {},
        balanced: {},
      }) as DashboardOut;
      const progressInfo = {
        flashcardsCompleted: dashboardData?.today?.flashcardsCompleted ?? 0,
        choresCompleted: dashboardData?.today?.choresCompleted ?? 0,
        outdoorActivities: dashboardData?.today?.outdoorActivities ?? 0,
        // affirmationsViewed: dashboardData?.today?.affirmationsViewed ?? 0,
        currentLevel: dashboardData?.balanced?.currentLevel ?? 1,
        // xpToNextLevel: dashboardData?.reward?.nextAt ?? 100,
        // currentXP: dashboardData?.reward?.progress ?? 0,
        // outdoorActivities: dashboardData?.today?.outdoorActivities ?? 0,
        currentStreak: dashboardData?.currentStreak ?? 0,
      };

      const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';

      const response = await getBuddyResponse(
        apiKey,
        userMessage,
        buddyData.conversationHistory,
        buddyData.userProfile,
        buddyData.learnedFacts,
        progressInfo,
        buddyData.buddyName
      );

      addMessage(response, 'buddy');
    } catch (error) {
      console.error('Error getting buddy response:', error);
      addMessage("Oops! I had a little hiccup. Can you try again?", 'buddy');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (actionId: string) => {
    const quickMessages: Record<string, string> = {
      flashcards: "Can you help me with my flashcards today?",
      chores: "What chores should I do today?",
      outdoor: "What outdoor activities can I do?",
      diary: "",
      progress: "How am I doing with my progress?",
    };

    if (actionId === 'diary') {
      setIsDiaryMode(true);
      addMessage("I'd like to write in my diary", 'user');
      addMessage("I'm here to listen! Share whatever's on your mind - your thoughts, feelings, or what happened today. This is your safe space to express yourself.", 'buddy');
    } else {
      const message = quickMessages[actionId];
      if (message) {
        setInputText(message);
      }
    }
  };

  const messages = getRecentMessages(50);

  const renderMessage = ({ item }: { item: ConversationMessage }) => (
    <MessageBubble
      message={item}
      isUser={item.role === 'user'}
      theme={theme}
    />
  );

  if (!isChatOpen) return null;

  return (
    <Modal
      visible={isChatOpen}
      animationType="slide"
      transparent={true}
      presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : 'overFullScreen'}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={insets.top - 60}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.backgroundRoot }}>
          <View style={styles.overlay}>
            <Pressable style={styles.dismissArea} onPress={handleClose} />

            <GestureDetector gesture={panGesture}>
              <Animated.View
                style={[
                  styles.sheetContainer,
                  {
                    backgroundColor: theme.backgroundRoot,
                    // paddingBottom: insets.bottom,
                    paddingBottom: insets.bottom + Spacing.xxl + keyboardHeight,
                    height: Platform.OS === 'web' ? '50%' : '95%',
                    // height: keyboardHeight > 0 ? '95%' : undefined,  // or '95%' if you want a tiny top gap
                    // maxHeight: keyboardHeight > 0 ? '100%' : '90%',   // override maxHeight
                    maxHeight: '95%',
                    borderTopLeftRadius: BorderRadius.xl,
                    borderTopRightRadius: BorderRadius.xl,
                  },
                  sheetStyle
                ]}
              >
                <View style={styles.handleBar}>
                  <View style={[styles.handle, { backgroundColor: theme.textSecondary + '40' }]} />
                </View>

                <View style={styles.header}>
                  <View style={styles.headerLeft}>
                    <View style={[styles.buddyAvatar, { backgroundColor: theme.primary }]}>
                      <View style={styles.miniEyes}>
                        <View style={styles.miniEye} />
                        <View style={styles.miniEye} />
                      </View>
                    </View>
                    <View>
                      <ThemedText type="headline">{buddyData.buddyName}</ThemedText>
                      <ThemedText style={[styles.statusText, { color: theme.success }]}>
                        {isDiaryMode ? 'Diary Mode' : 'Online'}
                      </ThemedText>
                    </View>
                  </View>
                  <View style={styles.headerButtons}>
                    <Pressable
                      onPress={() => {
                        setIsChatOpen(false);
                        setIsCustomizerOpen(true);
                      }}
                      style={styles.customizeButton}
                    >
                      <Feather name="edit-2" size={20} color={theme.text} />
                    </Pressable>
                    <Pressable onPress={handleClose} style={styles.closeButton}>
                      <Feather name="x" size={24} color={theme.text} />
                    </Pressable>
                  </View>
                </View>

                {messages.length === 0 || showOptionsPanel ? (
                  <View style={styles.welcomeContainer}>
                    {messages.length > 0 ? (
                      <Pressable
                        style={[styles.backToChatButton, { backgroundColor: theme.backgroundSecondary }]}
                        onPress={() => setShowOptionsPanel(false)}
                      >
                        <Feather name="arrow-left" size={16} color={theme.primary} />
                        <ThemedText style={[styles.backToChatText, { color: theme.primary }]}>Back to Chat</ThemedText>
                      </Pressable>
                    ) : null}
                    <View style={[styles.largeBuddyAvatar, { backgroundColor: theme.primary }]}>
                      <View style={styles.largeEyes}>
                        <View style={styles.largeEye}>
                          <View style={styles.largePupil} />
                        </View>
                        <View style={styles.largeEye}>
                          <View style={styles.largePupil} />
                        </View>
                      </View>
                      <View style={styles.largeMouth} />
                    </View>
                    <ThemedText type="title" style={styles.welcomeTitle}>
                      {messages.length === 0 ? 'Hi there, friend!' : 'Quick Actions'}
                    </ThemedText>
                    <ThemedText style={[styles.welcomeText, { color: theme.textSecondary }]}>
                      {messages.length === 0
                        ? `I'm ${buddyData.buddyName}, your learning buddy! I'm here to chat, help with flashcards, or just listen. What would you like to do?`
                        : 'Choose an option below or type your own message!'
                      }
                    </ThemedText>

                    <View style={styles.quickActions}>
                      {QUICK_ACTIONS.map((action) => (
                        <Pressable
                          key={action.id}
                          style={[styles.quickActionButton, { backgroundColor: theme.backgroundSecondary }]}
                          onPress={() => {
                            handleQuickAction(action.id);
                            setShowOptionsPanel(false);
                          }}
                        >
                          <Feather name={action.icon as any} size={18} color={theme.primary} />
                          <ThemedText style={styles.quickActionText}>{action.label}</ThemedText>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ) : (
                  <View style={styles.chatArea}>
                    <Pressable
                      style={[styles.backToOptionsButton, { backgroundColor: theme.backgroundSecondary }]}
                      onPress={() => setShowOptionsPanel(true)}
                    >
                      <Feather name="grid" size={16} color={theme.primary} />
                      <ThemedText style={[styles.backToOptionsText, { color: theme.primary }]}>Options</ThemedText>
                    </Pressable>
                    <FlatList
                      ref={flatListRef}
                      data={messages}
                      renderItem={renderMessage}
                      keyExtractor={(item) => item.id}
                      contentContainerStyle={styles.messagesContainer}
                      keyboardShouldPersistTaps="handled"
                      showsVerticalScrollIndicator={false}
                      onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                      onLayout={() => {
                        flatListRef.current?.scrollToEnd({ animated: false });
                      }}

                    />
                  </View>
                )}

                {isLoading ? (
                  <View style={styles.typingIndicator}>
                    <ThemedText style={{ color: theme.textSecondary }}>
                      {buddyData.buddyName} is typing...
                    </ThemedText>
                    <ActivityIndicator size="small" color={theme.primary} />
                  </View>
                ) : null}

                <View style={[styles.inputContainer,
                {
                  borderTopColor: theme.textSecondary + '20',
                  paddingBottom: keyboardHeight > 0 ? keyboardHeight - insets.bottom : insets.bottom - Spacing.xxl,
                }
                ]}>
                  {isDiaryMode ? (
                    <View style={[styles.diaryModeIndicator, { backgroundColor: theme.secondary + '20' }]}>
                      <Feather name="edit-3" size={14} color={theme.secondary} />
                      <ThemedText style={[styles.diaryModeText, { color: theme.secondary }]}>
                        Diary Mode
                      </ThemedText>
                      <Pressable onPress={() => setIsDiaryMode(false)}>
                        <Feather name="x" size={14} color={theme.secondary} />
                      </Pressable>
                    </View>
                  ) : null}

                  <View style={styles.inputRow}>
                    <TextInput
                      style={[
                        styles.textInput,
                        {
                          backgroundColor: theme.backgroundSecondary,
                          color: theme.text,
                        }
                      ]}
                      placeholder={isDiaryMode ? "What's on your mind?" : "Type a message..."}
                      placeholderTextColor={theme.textSecondary}
                      value={inputText}
                      onChangeText={setInputText}
                      multiline
                      maxLength={500}
                      onKeyPress={({ nativeEvent }) => {
                        if (nativeEvent.key === 'Enter') {
                          handleSend();
                          return true;
                        }
                      }}
                      returnKeyType="send"
                    />
                    <Pressable
                      style={[
                        styles.sendButton,
                        { backgroundColor: inputText.trim() ? theme.primary : theme.textSecondary + '40' }
                      ]}
                      onPress={handleSend}
                      disabled={!inputText.trim() || isLoading}
                    >
                      <Feather
                        name="send"
                        size={20}
                        color={inputText.trim() ? 'white' : theme.textSecondary}
                      />
                    </Pressable>
                  </View>
                </View>
              </Animated.View>
            </GestureDetector>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}


