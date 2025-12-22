import { useState } from "react";
import { View, StyleSheet, Pressable, TextInput, Modal, ScrollView, Alert } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { useTheme } from "@/hooks/useTheme";
import { useSchool, CustomLesson } from "@/contexts/SchoolContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { getAllSubjects } from "@/constants/schoolData";

export default function ParentPortalScreen() {
  const { theme } = useTheme();
  const { progress, addCustomLesson, updateCustomLesson, deleteCustomLesson } = useSchool();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingLesson, setEditingLesson] = useState<CustomLesson | null>(null);
  
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("1");
  const [questions, setQuestions] = useState<Array<{
    question: string;
    options: string[];
    correctAnswer: number;
  }>>([]);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [currentOptions, setCurrentOptions] = useState(["", "", "", ""]);
  const [currentCorrectAnswer, setCurrentCorrectAnswer] = useState(0);
  
  const subjects = getAllSubjects();
  
  const resetForm = () => {
    setTitle("");
    setContent("");
    setSelectedSubject("");
    setSelectedLevel("1");
    setQuestions([]);
    setCurrentQuestion("");
    setCurrentOptions(["", "", "", ""]);
    setCurrentCorrectAnswer(0);
    setEditingLesson(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = (lesson: CustomLesson) => {
    setEditingLesson(lesson);
    setTitle(lesson.title);
    setContent(lesson.content);
    setSelectedSubject(lesson.subjectId);
    setSelectedLevel(lesson.level.toString());
    setQuestions(lesson.questions);
    setShowAddModal(true);
  };

  const addQuestion = () => {
    if (!currentQuestion.trim() || currentOptions.some(o => !o.trim())) {
      Alert.alert("Missing Info", "Please fill in the question and all 4 options.");
      return;
    }
    
    setQuestions([...questions, {
      question: currentQuestion,
      options: [...currentOptions],
      correctAnswer: currentCorrectAnswer,
    }]);
    
    setCurrentQuestion("");
    setCurrentOptions(["", "", "", ""]);
    setCurrentCorrectAnswer(0);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const saveLesson = () => {
    if (!title.trim() || !content.trim() || !selectedSubject) {
      Alert.alert("Missing Info", "Please fill in the title, content, and select a subject.");
      return;
    }
    
    if (editingLesson) {
      updateCustomLesson(editingLesson.id, {
        title,
        content,
        subjectId: selectedSubject,
        level: parseInt(selectedLevel),
        questions,
      });
    } else {
      addCustomLesson({
        title,
        content,
        subjectId: selectedSubject,
        level: parseInt(selectedLevel),
        questions,
      });
    }
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowAddModal(false);
    resetForm();
  };

  const handleDelete = (lessonId: string) => {
    Alert.alert(
      "Delete Lesson",
      "Are you sure you want to delete this lesson?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: () => {
            deleteCustomLesson(lessonId);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        },
      ]
    );
  };

  const renderLessonCard = (lesson: CustomLesson) => {
    const subject = subjects.find(s => s.id === lesson.subjectId);
    
    return (
      <View 
        key={lesson.id} 
        style={[styles.lessonCard, { backgroundColor: theme.backgroundDefault }]}
      >
        <View style={styles.lessonHeader}>
          <View style={[styles.subjectBadge, { backgroundColor: (subject?.color || "#6B7280") + "20" }]}>
            <Feather name={subject?.icon as any || "book"} size={16} color={subject?.color || "#6B7280"} />
            <ThemedText style={{ color: subject?.color || "#6B7280", marginLeft: Spacing.xs, fontSize: 12 }}>
              {subject?.name || "Unknown"}
            </ThemedText>
          </View>
          <ThemedText style={[styles.levelBadge, { color: theme.textSecondary }]}>
            Level {lesson.level}
          </ThemedText>
        </View>
        
        <ThemedText type="headline" numberOfLines={1}>{lesson.title}</ThemedText>
        <ThemedText style={[styles.lessonContent, { color: theme.textSecondary }]} numberOfLines={2}>
          {lesson.content}
        </ThemedText>
        
        <View style={styles.lessonMeta}>
          <ThemedText style={[styles.questionCount, { color: theme.textSecondary }]}>
            {lesson.questions.length} question{lesson.questions.length !== 1 ? "s" : ""}
          </ThemedText>
          <View style={styles.lessonActions}>
            <Pressable 
              onPress={() => openEditModal(lesson)}
              style={[styles.actionBtn, { backgroundColor: "#3B82F6" + "15" }]}
            >
              <Feather name="edit-2" size={16} color="#3B82F6" />
            </Pressable>
            <Pressable 
              onPress={() => handleDelete(lesson.id)}
              style={[styles.actionBtn, { backgroundColor: "#EF4444" + "15" }]}
            >
              <Feather name="trash-2" size={16} color="#EF4444" />
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  return (
    <ScreenScrollView>
      <ThemedView style={styles.container}>
        <View style={[styles.headerCard, { backgroundColor: "#8B5CF6" + "15" }]}>
          <Feather name="shield" size={32} color="#8B5CF6" />
          <View style={styles.headerInfo}>
            <ThemedText type="headline" style={{ color: "#8B5CF6" }}>
              Parent Portal
            </ThemedText>
            <ThemedText style={[styles.headerDesc, { color: theme.textSecondary }]}>
              Add and manage custom lessons without coding
            </ThemedText>
          </View>
        </View>

        <Pressable
          onPress={openAddModal}
          style={[styles.addButton, { backgroundColor: "#10B981" }]}
        >
          <Feather name="plus" size={20} color="white" />
          <ThemedText style={styles.addButtonText}>Add New Lesson</ThemedText>
        </Pressable>

        <ThemedText type="headline" style={styles.sectionTitle}>
          Your Custom Lessons ({progress.customLessons.length})
        </ThemedText>

        {progress.customLessons.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: theme.backgroundDefault }]}>
            <Feather name="book-open" size={48} color={theme.textSecondary} />
            <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
              No custom lessons yet
            </ThemedText>
            <ThemedText style={[styles.emptySubtext, { color: theme.textSecondary }]}>
              Tap the button above to create your first lesson
            </ThemedText>
          </View>
        ) : (
          <View style={styles.lessonsList}>
            {progress.customLessons.map(renderLessonCard)}
          </View>
        )}
      </ThemedView>

      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.backgroundRoot }]}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setShowAddModal(false)}>
              <ThemedText style={{ color: "#EF4444" }}>Cancel</ThemedText>
            </Pressable>
            <ThemedText type="headline">
              {editingLesson ? "Edit Lesson" : "New Lesson"}
            </ThemedText>
            <Pressable onPress={saveLesson}>
              <ThemedText style={{ color: "#10B981", fontWeight: "600" }}>Save</ThemedText>
            </Pressable>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <ThemedText style={styles.inputLabel}>Title</ThemedText>
            <TextInput
              style={[styles.textInput, { backgroundColor: theme.backgroundDefault, color: theme.text }]}
              placeholder="Lesson title..."
              placeholderTextColor={theme.textSecondary}
              value={title}
              onChangeText={setTitle}
            />

            <ThemedText style={styles.inputLabel}>Subject</ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subjectPicker}>
              {subjects.map(subject => (
                <Pressable
                  key={subject.id}
                  onPress={() => setSelectedSubject(subject.id)}
                  style={[
                    styles.subjectOption,
                    {
                      backgroundColor: selectedSubject === subject.id 
                        ? subject.color 
                        : subject.color + "20",
                    },
                  ]}
                >
                  <Feather 
                    name={subject.icon as any} 
                    size={16} 
                    color={selectedSubject === subject.id ? "white" : subject.color} 
                  />
                  <ThemedText 
                    style={{ 
                      color: selectedSubject === subject.id ? "white" : subject.color,
                      marginLeft: Spacing.xs,
                      fontSize: 12,
                    }}
                  >
                    {subject.name}
                  </ThemedText>
                </Pressable>
              ))}
            </ScrollView>

            <ThemedText style={styles.inputLabel}>Level (1-160)</ThemedText>
            <TextInput
              style={[styles.textInput, { backgroundColor: theme.backgroundDefault, color: theme.text }]}
              placeholder="1"
              placeholderTextColor={theme.textSecondary}
              value={selectedLevel}
              onChangeText={setSelectedLevel}
              keyboardType="number-pad"
            />

            <ThemedText style={styles.inputLabel}>Lesson Content</ThemedText>
            <TextInput
              style={[styles.textInput, styles.textArea, { backgroundColor: theme.backgroundDefault, color: theme.text }]}
              placeholder="Write your lesson content here..."
              placeholderTextColor={theme.textSecondary}
              value={content}
              onChangeText={setContent}
              multiline
              numberOfLines={4}
            />

            <ThemedText style={styles.inputLabel}>Questions ({questions.length})</ThemedText>
            
            {questions.map((q, idx) => (
              <View key={idx} style={[styles.questionCard, { backgroundColor: theme.backgroundDefault }]}>
                <ThemedText numberOfLines={1}>{q.question}</ThemedText>
                <Pressable onPress={() => removeQuestion(idx)}>
                  <Feather name="x" size={18} color="#EF4444" />
                </Pressable>
              </View>
            ))}

            <View style={[styles.addQuestionSection, { backgroundColor: theme.backgroundDefault }]}>
              <ThemedText style={styles.addQuestionTitle}>Add Question</ThemedText>
              
              <TextInput
                style={[styles.textInput, { backgroundColor: theme.backgroundSecondary, color: theme.text }]}
                placeholder="Question..."
                placeholderTextColor={theme.textSecondary}
                value={currentQuestion}
                onChangeText={setCurrentQuestion}
              />
              
              {currentOptions.map((opt, idx) => (
                <View key={idx} style={styles.optionInputRow}>
                  <Pressable
                    onPress={() => setCurrentCorrectAnswer(idx)}
                    style={[
                      styles.correctIndicator,
                      { 
                        backgroundColor: currentCorrectAnswer === idx ? "#10B981" : theme.backgroundSecondary,
                        borderColor: currentCorrectAnswer === idx ? "#10B981" : theme.border,
                      },
                    ]}
                  >
                    {currentCorrectAnswer === idx ? (
                      <Feather name="check" size={12} color="white" />
                    ) : null}
                  </Pressable>
                  <TextInput
                    style={[styles.optionInput, { backgroundColor: theme.backgroundSecondary, color: theme.text }]}
                    placeholder={`Option ${idx + 1}`}
                    placeholderTextColor={theme.textSecondary}
                    value={opt}
                    onChangeText={(text) => {
                      const newOptions = [...currentOptions];
                      newOptions[idx] = text;
                      setCurrentOptions(newOptions);
                    }}
                  />
                </View>
              ))}
              
              <Pressable
                onPress={addQuestion}
                style={[styles.addQuestionBtn, { backgroundColor: "#3B82F6" }]}
              >
                <Feather name="plus" size={16} color="white" />
                <ThemedText style={{ color: "white", marginLeft: Spacing.xs }}>Add Question</ThemedText>
              </Pressable>
            </View>
            
            <View style={{ height: 100 }} />
          </ScrollView>
        </View>
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
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  addButtonText: {
    color: "white",
    fontWeight: "600",
    marginLeft: Spacing.sm,
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
    textAlign: "center",
  },
  lessonsList: {
    gap: Spacing.md,
  },
  lessonCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  lessonHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  subjectBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  levelBadge: {
    fontSize: 12,
  },
  lessonContent: {
    fontSize: 13,
    marginTop: Spacing.xs,
  },
  lessonMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.md,
  },
  questionCount: {
    fontSize: 12,
  },
  lessonActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
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
    height: 120,
    textAlignVertical: "top",
  },
  subjectPicker: {
    marginVertical: Spacing.sm,
  },
  subjectOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginRight: Spacing.sm,
  },
  questionCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  addQuestionSection: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
  },
  addQuestionTitle: {
    fontWeight: "600",
    marginBottom: Spacing.md,
  },
  optionInputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  correctIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
  },
  optionInput: {
    flex: 1,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    fontSize: 14,
  },
  addQuestionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.md,
  },
});
