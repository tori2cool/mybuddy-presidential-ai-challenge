# MyBuddy AI - Kids Learning & Wellness App

## Overview

MyBuddy is a kid-friendly mobile application built with React Native and Expo that promotes self-discovery, learning, and wellness through five core features:

1. **Affirmations** - TikTok-style vertical scrolling daily positive affirmations
2. **Flashcards** - Adaptive educational flashcards with tiered difficulty (Easy/Medium/Hard) and typed answer checking
3. **Outdoor Activities** - Activity suggestions and completion tracking
4. **Chores** - Task checklist with parent request functionality
5. **Profile** - User settings, progress stats, and avatar customization

The app is designed for elementary-aged children with a focus on building confidence, supporting learning, and encouraging healthy habits through engaging, age-appropriate interactions.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React Native (v0.81.5) with Expo (v54)
- **Rationale**: Cross-platform mobile development (iOS, Android, Web) with a single codebase
- **Navigation**: React Navigation v7 with bottom tabs for main navigation and native stacks for feature-specific flows
- **UI Library**: Custom component system using themed components with light/dark mode support
- **Animation**: React Native Reanimated v4 for performant animations and gesture handling
- **Styling**: StyleSheet-based theming system with predefined color palettes, typography scales, and spacing constants

**Navigation Structure**:
- Bottom tab navigator with 5 main sections (Affirmations, Flashcards, Outdoor, Chores, Profile)
- Each tab contains its own stack navigator for feature-specific screens
- Separate onboarding flow (Welcome → Quiz → Name/Avatar) shown on first launch
- Platform-specific tab bar with iOS blur effects and Android solid backgrounds

**Component Architecture**:
- Themed wrapper components (ThemedView, ThemedText) for consistent styling across light/dark modes
- Reusable UI primitives (Button, IconButton, Card, CheckboxItem, ProgressBar)
- Screen-level layout components (ScreenScrollView, ScreenFlatList, ScreenKeyboardAwareScrollView) that handle safe areas and keyboard avoidance
- Error boundaries for graceful error handling

**State Management**:
- Local React state with hooks (useState, useRef, useEffect)
- Custom hooks for theming (useTheme) and screen insets (useScreenInsets)
- ProgressContext for global progress tracking with AsyncStorage persistence

### Data Storage

**Local-First Architecture with Persistence**:
- **AsyncStorage**: Used for persisting progress data across app sessions
- **ProgressContext**: Central context provider for all progress tracking data
- Data includes: daily/weekly stats, streaks, achievements, points, and activity history

### Progress Tracking System

**Points System**:
- Flashcards: 10 points for correct, 2 points for incorrect answers
- Chores: 15 points per completed chore
- Outdoor Activities: 20 points per completed activity
- Affirmations: 5 points per viewed affirmation

**Streak Tracking**:
- Daily streak counter that increments on consecutive active days
- Best streak record maintained for motivation

**Achievement System**:
- 20 unlockable achievements across categories:
  - First-time achievements (Brain Starter, Helper Bee, Nature Explorer)
  - Streak milestones (3-day, 7-day, 30-day streaks)
  - Points milestones (100, 500, 2000 points)
  - Activity milestones (flashcards, chores, outdoor activities)
  - Special achievements (Perfect Day - all categories in one day)
  - Difficulty achievements (Math Whiz, Science Star, Bookworm, History Buff, Master Student)
  - Balance achievements (Balanced Learner - 10+ correct in all subjects)

**Reward Levels** (Kid-Friendly Progression with Balanced Requirements):
- New Kid (0pts) → Good Kid (50pts) → Great Kid (200pts) → Awesome Kid (500pts) → Amazing Kid (1000pts) → Super Star Kid (2000pts)
- **Balanced Leveling**: Players cannot level up without equal progress across ALL subjects
- Required correct answers per subject = level threshold / 4 subjects (e.g., Good Kid requires 13 correct in each subject)
- Profile screen shows per-subject progress bars toward next level

**Adaptive Difficulty System**:
- Three difficulty tiers per subject: Easy (0-19 correct), Medium (20-39 correct), Hard (40+ correct)
- Questions automatically get harder as players answer more correctly
- Each subject tracks difficulty independently
- 30 questions per subject (10 Easy, 10 Medium, 10 Hard) covering:
  - **Math**: Single operations → Two-step problems → Word problems and percentages
  - **Science**: Basic facts → Intermediate concepts → Scientific principles
  - **Reading**: Punctuation/vocabulary → Grammar/literary terms → Complex literary devices
  - **History**: Famous figures/events → Wars/civilizations → Causes and effects
- Difficulty achievements unlock when reaching Medium/Hard tiers

### Design System

**Theme System**:
- Light and dark color schemes with semantic color tokens (primary, secondary, success, error, text, background levels)
- Predefined gradient combinations for visual variety
- Consistent spacing scale (xs, sm, md, lg, xl, xxl)
- Typography hierarchy (hero, title, headline, body, caption)
- Border radius constants for UI consistency

**Interaction Patterns**:
- Spring-based animations for button presses and interactions
- Haptic feedback on key interactions (iOS/Android)
- Platform-specific UI adaptations (iOS blur effects, Android solid backgrounds)

### Onboarding Flow

**Three-Screen Flow**:
1. **Welcome Screen**: Gradient background with app mascot and call-to-action
2. **Interest Quiz**: Multi-select visual quiz with 8 interest options (Animals, Monster Trucks, Ponies, Dinosaurs, Sports, Horseback Riding, Space, Art) to personalize experience
3. **Name & Avatar Screen**: Text input for name and horizontal carousel of 6 avatar options (astronaut, artist, athlete, explorer, scientist, musician)

**Purpose**: Collects user preferences to personalize learning content and establish user identity within the app.

## External Dependencies

### Core Framework
- **Expo SDK v54**: Managed React Native workflow with access to native APIs
- **React Native v0.81.5**: Cross-platform mobile framework
- **React v19.1.0**: UI library with new architecture enabled

### Navigation & Layout
- **@react-navigation/native v7**: Core navigation library
- **@react-navigation/bottom-tabs v7**: Bottom tab navigator implementation
- **@react-navigation/native-stack v7**: Native stack navigator for iOS/Android
- **react-native-safe-area-context v5**: Safe area inset handling
- **react-native-screens v4**: Native screen optimization

### UI & Interactions
- **react-native-reanimated v4**: High-performance animations and gestures
- **react-native-gesture-handler v2**: Native gesture recognition
- **react-native-keyboard-controller v1**: Keyboard-aware UI handling
- **expo-haptics v15**: Haptic feedback for iOS/Android
- **expo-blur v15**: Native blur effects (iOS)
- **expo-linear-gradient v15**: Gradient backgrounds

### Visual Assets
- **@expo/vector-icons v15**: Icon library (using Feather icons)
- **expo-image v3**: Optimized image component
- **expo-symbols v1**: SF Symbols support (iOS)

### Development Environment
- **TypeScript v5**: Type-safe development
- **Babel**: Code transformation with module resolver for @/ alias
- **ESLint + Prettier**: Code quality and formatting
- **Expo React Compiler**: Experimental React compiler integration

### Platform-Specific Considerations
- Web fallback for keyboard-aware scroll views (react-native-web)
- iOS-specific blur effects with Android solid color fallbacks
- Replit-specific environment variables for development server proxy

### No External Services
- No authentication providers
- No backend APIs or cloud services
- No analytics or crash reporting (currently)
- No push notification services