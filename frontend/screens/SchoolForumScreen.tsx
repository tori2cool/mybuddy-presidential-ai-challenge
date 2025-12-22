import { useState } from "react";
import { View, StyleSheet, Pressable, TextInput, Modal, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { useTheme } from "@/hooks/useTheme";
import { useSchool, DiscussionPost } from "@/contexts/SchoolContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { getAllSubjects } from "@/constants/schoolData";

export default function SchoolForumScreen() {
  const { theme } = useTheme();
  const { progress, addDiscussionPost, addDiscussionReply } = useSchool();
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<DiscussionPost | null>(null);
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostAuthor, setNewPostAuthor] = useState("Student");
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [replyAuthor, setReplyAuthor] = useState("Student");
  
  const subjects = getAllSubjects();
  
  const filteredPosts = selectedSubject
    ? progress.discussionPosts.filter(p => p.subjectId === selectedSubject)
    : progress.discussionPosts;

  const createPost = () => {
    if (!newPostContent.trim()) return;
    
    addDiscussionPost({
      authorName: newPostAuthor.trim() || "Student",
      content: newPostContent.trim(),
      subjectId: selectedSubject || undefined,
    });
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setNewPostContent("");
    setShowNewPostModal(false);
  };

  const sendReply = () => {
    if (!replyContent.trim() || !selectedPost) return;
    
    addDiscussionReply(selectedPost.id, {
      authorName: replyAuthor.trim() || "Student",
      content: replyContent.trim(),
    });
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setReplyContent("");
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const renderPostCard = (post: DiscussionPost) => {
    const subject = post.subjectId ? subjects.find(s => s.id === post.subjectId) : null;
    
    return (
      <Pressable
        key={post.id}
        onPress={() => setSelectedPost(post)}
        style={[styles.postCard, { backgroundColor: theme.backgroundDefault }]}
      >
        <View style={styles.postHeader}>
          <View style={styles.authorInfo}>
            <View style={[styles.avatar, { backgroundColor: "#3B82F6" }]}>
              <ThemedText style={styles.avatarText}>
                {post.authorName.charAt(0).toUpperCase()}
              </ThemedText>
            </View>
            <View>
              <ThemedText style={styles.authorName}>{post.authorName}</ThemedText>
              <ThemedText style={[styles.timestamp, { color: theme.textSecondary }]}>
                {formatDate(post.timestamp)}
              </ThemedText>
            </View>
          </View>
          {subject ? (
            <View style={[styles.subjectTag, { backgroundColor: subject.color + "20" }]}>
              <ThemedText style={{ color: subject.color, fontSize: 11 }}>{subject.name}</ThemedText>
            </View>
          ) : null}
        </View>
        
        <ThemedText style={styles.postContent} numberOfLines={3}>
          {post.content}
        </ThemedText>
        
        <View style={styles.postFooter}>
          <View style={styles.replyCount}>
            <Feather name="message-circle" size={14} color={theme.textSecondary} />
            <ThemedText style={[styles.replyCountText, { color: theme.textSecondary }]}>
              {post.replies.length} {post.replies.length === 1 ? "reply" : "replies"}
            </ThemedText>
          </View>
          <Feather name="chevron-right" size={18} color={theme.textSecondary} />
        </View>
      </Pressable>
    );
  };

  return (
    <ScreenScrollView>
      <ThemedView style={styles.container}>
        <View style={[styles.headerCard, { backgroundColor: "#10B981" + "15" }]}>
          <Feather name="message-square" size={32} color="#10B981" />
          <View style={styles.headerInfo}>
            <ThemedText type="headline" style={{ color: "#10B981" }}>
              Discussion Forum
            </ThemedText>
            <ThemedText style={[styles.headerDesc, { color: theme.textSecondary }]}>
              Ask questions and help others learn
            </ThemedText>
          </View>
        </View>

        <Pressable
          onPress={() => setShowNewPostModal(true)}
          style={[styles.newPostButton, { backgroundColor: "#10B981" }]}
        >
          <Feather name="plus" size={20} color="white" />
          <ThemedText style={styles.newPostButtonText}>Start New Discussion</ThemedText>
        </Pressable>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <Pressable
            onPress={() => setSelectedSubject(null)}
            style={[
              styles.filterChip,
              { backgroundColor: selectedSubject === null ? "#3B82F6" : theme.backgroundDefault }
            ]}
          >
            <ThemedText style={{ color: selectedSubject === null ? "white" : theme.text }}>
              All
            </ThemedText>
          </Pressable>
          {subjects.slice(0, 6).map(subject => (
            <Pressable
              key={subject.id}
              onPress={() => setSelectedSubject(subject.id)}
              style={[
                styles.filterChip,
                { backgroundColor: selectedSubject === subject.id ? subject.color : theme.backgroundDefault }
              ]}
            >
              <ThemedText style={{ color: selectedSubject === subject.id ? "white" : theme.text }}>
                {subject.name}
              </ThemedText>
            </Pressable>
          ))}
        </ScrollView>

        <ThemedText type="headline" style={styles.sectionTitle}>
          Discussions ({filteredPosts.length})
        </ThemedText>

        {filteredPosts.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: theme.backgroundDefault }]}>
            <Feather name="message-circle" size={48} color={theme.textSecondary} />
            <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
              No discussions yet
            </ThemedText>
            <ThemedText style={[styles.emptySubtext, { color: theme.textSecondary }]}>
              Be the first to start a conversation!
            </ThemedText>
          </View>
        ) : (
          <View style={styles.postsList}>
            {filteredPosts.map(renderPostCard)}
          </View>
        )}
      </ThemedView>

      <Modal
        visible={showNewPostModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowNewPostModal(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={[styles.modalContainer, { backgroundColor: theme.backgroundRoot }]}
        >
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setShowNewPostModal(false)}>
              <ThemedText style={{ color: "#EF4444" }}>Cancel</ThemedText>
            </Pressable>
            <ThemedText type="headline">New Discussion</ThemedText>
            <Pressable onPress={createPost}>
              <ThemedText style={{ color: "#10B981", fontWeight: "600" }}>Post</ThemedText>
            </Pressable>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <ThemedText style={styles.inputLabel}>Your Name</ThemedText>
            <TextInput
              style={[styles.textInput, { backgroundColor: theme.backgroundDefault, color: theme.text }]}
              placeholder="Student"
              placeholderTextColor={theme.textSecondary}
              value={newPostAuthor}
              onChangeText={setNewPostAuthor}
            />

            <ThemedText style={styles.inputLabel}>Subject (Optional)</ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subjectPicker}>
              <Pressable
                onPress={() => setSelectedSubject(null)}
                style={[
                  styles.subjectOption,
                  { backgroundColor: selectedSubject === null ? theme.primary : theme.backgroundDefault }
                ]}
              >
                <ThemedText style={{ color: selectedSubject === null ? "white" : theme.text }}>
                  General
                </ThemedText>
              </Pressable>
              {subjects.map(subject => (
                <Pressable
                  key={subject.id}
                  onPress={() => setSelectedSubject(subject.id)}
                  style={[
                    styles.subjectOption,
                    { backgroundColor: selectedSubject === subject.id ? subject.color : subject.color + "20" }
                  ]}
                >
                  <ThemedText style={{ color: selectedSubject === subject.id ? "white" : subject.color }}>
                    {subject.name}
                  </ThemedText>
                </Pressable>
              ))}
            </ScrollView>

            <ThemedText style={styles.inputLabel}>Your Message</ThemedText>
            <TextInput
              style={[styles.textInput, styles.textArea, { backgroundColor: theme.backgroundDefault, color: theme.text }]}
              placeholder="What would you like to discuss?"
              placeholderTextColor={theme.textSecondary}
              value={newPostContent}
              onChangeText={setNewPostContent}
              multiline
              numberOfLines={6}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={selectedPost !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedPost(null)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={[styles.modalContainer, { backgroundColor: theme.backgroundRoot }]}
        >
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setSelectedPost(null)}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
            <ThemedText type="headline">Discussion</ThemedText>
            <View style={{ width: 24 }} />
          </View>
          
          {selectedPost ? (
            <ScrollView style={styles.modalContent}>
              <View style={[styles.fullPostCard, { backgroundColor: theme.backgroundDefault }]}>
                <View style={styles.postHeader}>
                  <View style={styles.authorInfo}>
                    <View style={[styles.avatar, { backgroundColor: "#3B82F6" }]}>
                      <ThemedText style={styles.avatarText}>
                        {selectedPost.authorName.charAt(0).toUpperCase()}
                      </ThemedText>
                    </View>
                    <View>
                      <ThemedText style={styles.authorName}>{selectedPost.authorName}</ThemedText>
                      <ThemedText style={[styles.timestamp, { color: theme.textSecondary }]}>
                        {formatDate(selectedPost.timestamp)}
                      </ThemedText>
                    </View>
                  </View>
                </View>
                <ThemedText style={styles.fullPostContent}>
                  {selectedPost.content}
                </ThemedText>
              </View>

              <ThemedText type="headline" style={styles.repliesTitle}>
                Replies ({selectedPost.replies.length})
              </ThemedText>

              {selectedPost.replies.map(reply => (
                <View key={reply.id} style={[styles.replyCard, { backgroundColor: theme.backgroundDefault }]}>
                  <View style={styles.replyHeader}>
                    <View style={[styles.smallAvatar, { backgroundColor: "#10B981" }]}>
                      <ThemedText style={styles.smallAvatarText}>
                        {reply.authorName.charAt(0).toUpperCase()}
                      </ThemedText>
                    </View>
                    <ThemedText style={styles.replyAuthor}>{reply.authorName}</ThemedText>
                    <ThemedText style={[styles.timestamp, { color: theme.textSecondary }]}>
                      {formatDate(reply.timestamp)}
                    </ThemedText>
                  </View>
                  <ThemedText style={styles.replyContent}>{reply.content}</ThemedText>
                </View>
              ))}

              <View style={styles.replyInputSection}>
                <TextInput
                  style={[styles.replyAuthorInput, { backgroundColor: theme.backgroundDefault, color: theme.text }]}
                  placeholder="Your name"
                  placeholderTextColor={theme.textSecondary}
                  value={replyAuthor}
                  onChangeText={setReplyAuthor}
                />
                <View style={styles.replyInputRow}>
                  <TextInput
                    style={[styles.replyInput, { backgroundColor: theme.backgroundDefault, color: theme.text }]}
                    placeholder="Write a reply..."
                    placeholderTextColor={theme.textSecondary}
                    value={replyContent}
                    onChangeText={setReplyContent}
                    multiline
                  />
                  <Pressable
                    onPress={sendReply}
                    style={[styles.sendButton, { backgroundColor: replyContent.trim() ? "#10B981" : theme.backgroundDefault }]}
                    disabled={!replyContent.trim()}
                  >
                    <Feather name="send" size={18} color={replyContent.trim() ? "white" : theme.textSecondary} />
                  </Pressable>
                </View>
              </View>
              
              <View style={{ height: 100 }} />
            </ScrollView>
          ) : null}
        </KeyboardAvoidingView>
      </Modal>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
  },
  headerCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  headerInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  headerDesc: {
    fontSize: 13,
    marginTop: Spacing.xs,
  },
  newPostButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  newPostButtonText: {
    color: "white",
    fontWeight: "600",
    marginLeft: Spacing.sm,
  },
  filterScroll: {
    marginBottom: Spacing.lg,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginRight: Spacing.sm,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  emptyState: {
    alignItems: "center",
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
  },
  emptyText: {
    marginTop: Spacing.md,
    fontSize: 16,
  },
  emptySubtext: {
    marginTop: Spacing.xs,
    fontSize: 13,
  },
  postsList: {
    gap: Spacing.md,
  },
  postCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  postHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.sm,
  },
  authorInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
  },
  avatarText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  authorName: {
    fontWeight: "600",
  },
  timestamp: {
    fontSize: 12,
    marginTop: 2,
  },
  subjectTag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  postContent: {
    fontSize: 15,
    lineHeight: 22,
  },
  postFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.md,
  },
  replyCount: {
    flexDirection: "row",
    alignItems: "center",
  },
  replyCountText: {
    fontSize: 13,
    marginLeft: Spacing.xs,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalContent: {
    padding: Spacing.lg,
  },
  inputLabel: {
    fontWeight: "600",
    marginBottom: Spacing.xs,
    marginTop: Spacing.md,
  },
  textInput: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    fontSize: 16,
  },
  textArea: {
    height: 150,
    textAlignVertical: "top",
  },
  subjectPicker: {
    marginVertical: Spacing.sm,
  },
  subjectOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginRight: Spacing.sm,
  },
  fullPostCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  fullPostContent: {
    fontSize: 16,
    lineHeight: 24,
  },
  repliesTitle: {
    marginBottom: Spacing.md,
  },
  replyCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  replyHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  smallAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
  },
  smallAvatarText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 12,
  },
  replyAuthor: {
    fontWeight: "600",
    flex: 1,
  },
  replyContent: {
    fontSize: 14,
    lineHeight: 20,
  },
  replyInputSection: {
    marginTop: Spacing.lg,
  },
  replyAuthorInput: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    fontSize: 14,
    marginBottom: Spacing.sm,
  },
  replyInputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  replyInput: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    fontSize: 15,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: Spacing.sm,
  },
});
