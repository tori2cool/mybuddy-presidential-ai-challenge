# Design Guidelines: MyBuddy AI - Kids Learning & Wellness App

## Architecture Decisions

### Authentication
**No Authentication Required** - This is a single-user, local-first kids app with data stored on device.

**Profile/Settings Required:**
- User-customizable avatar selection (6 preset kid-friendly avatars: astronaut, artist, athlete, explorer, scientist, musician)
- Display name field for personalization
- App preferences: notification times, theme accents, parent mode toggle

### Navigation Structure
**Tab Bar Navigation** (5 tabs)
- **Affirmations** (Home) - TikTok-style vertical scrolling affirmations
- **Flashcards** - Personalized learning with subject selection
- **Outdoor** - Activity suggestions and completion tracking
- **Chores** - Task checklist and parent requests
- **Profile** - Settings, progress, and customization

**Tab Bar Specifications:**
- Position: Bottom of screen
- Height: 60pt + safe area bottom inset
- Style: Translucent with blur effect
- Active tab: Primary color with label
- Inactive tabs: Gray with icons only

## Screen Specifications

### 1. Onboarding Flow (Stack-Only, First Launch)

**Screen 1: Welcome**
- Full-screen illustration with app mascot
- Title: "Welcome to MyBuddy!"
- Subtitle: "Your fun learning companion"
- CTA: "Let's Get Started" button

**Screen 2: Interest Quiz**
- Header: Progress indicator (1/5, 2/5, etc.)
- Question cards with 6-8 visual options
- Questions: "What makes you excited?", "Pick your favorite!", "What do you love?"
- Options: Animals, Monster Trucks, Ponies, Dinosaurs, Sports, Horseback Riding, Space, Art
- Layout: Grid of tappable image cards (2 columns)
- Multiple selections allowed
- Bottom: "Next" button (enabled after 1+ selection)

**Screen 3: Name & Avatar**
- Horizontal avatar carousel
- Text input for name
- Bottom: "Finish Setup" button

### 2. Affirmations Tab (Main)

**Layout:**
- **NO default navigation header** - Full immersive experience
- Vertical swipeable/scrollable list (snap to item)
- Each affirmation: Full-screen card (viewport height)
- Floating UI elements overlay content

**Affirmation Card Components:**
- Background: Gradient or uploaded image
- Centered text: Affirmation message (24-32pt, bold, white with subtle shadow)
- Bottom overlay (gradient fade):
  - Heart icon (favorite/unfavorite) - left
  - Share icon - center
  - Meme creator icon - right
- Top-right: Settings gear icon (opens settings modal)

**Safe Area Insets:**
- Root view bottom: tabBarHeight + 20pt
- Root view top: insets.top + 20pt
- Floating buttons: Respect safe areas

**Gestures:**
- Vertical swipe to navigate between affirmations
- Tap heart to favorite
- Tap anywhere else: No action (prevent accidental taps)

### 3. Meme Creator (Modal from Affirmations)

**Header:**
- Title: "Create Affirmation"
- Left: Cancel button
- Right: Save button

**Layout (Scrollable Form):**
1. Canvas area (square, 1:1 aspect ratio)
   - Uploaded image OR drawing canvas
   - Text overlay (draggable, resizable)
2. Controls below canvas:
   - "Upload Photo" button
   - "Draw" toggle switch
   - Text input field
   - Font picker (4-6 fun kid-friendly fonts)
   - Color picker for text (preset palette)
   - Text style: Outline, Shadow, Fill options

**Safe Area Insets:**
- Top: Spacing.xl (has non-transparent header)
- Bottom: insets.bottom + Spacing.xl

### 4. Flashcards Tab

**Header:**
- Title: "Flashcards"
- Transparent background
- Right button: Filter icon (opens subject selector)

**Main Content (List):**
- Subject cards (Math, Science, Reading, History)
- Each card shows:
  - Subject icon themed to child's interest
  - Subject name
  - Progress bar (cards completed / total)
  - "Practice" button

**Subject Practice Screen (Modal):**
- Full-screen flashcard flip interface
- Front: Question with themed illustration
- Back: Answer with encouraging feedback
- Bottom controls: "Got it!" / "Review Again"
- Progress: X/Y cards at top
- Exit: X button top-left

**Safe Area Insets:**
- Root view top: headerHeight + Spacing.xl (transparent header)
- Root view bottom: tabBarHeight + Spacing.xl

### 5. Outdoor Activities Tab

**Header:**
- Title: "Outdoor Time"
- Transparent background
- Right button: History icon

**Main Content (Scrollable):**
- Daily suggested activity card (highlighted)
- List of activity categories:
  - Active Play
  - Nature Explorer
  - Sports & Games
  - Creative Outside
- Each activity card:
  - Activity name and icon
  - Estimated time
  - "Start Activity" button

**Activity In Progress (Modal):**
- Timer display
- Activity description with themed illustration
- "I'm Done!" button (bottom, primary color)
- Confirmation: "Great job! You played for X minutes"

**Safe Area Insets:**
- Root view top: headerHeight + Spacing.xl
- Root view bottom: tabBarHeight + Spacing.xl

### 6. Chores Tab

**Header:**
- Title: "My Chores"
- Transparent background
- Right button: "Ask Parent" (opens parent request form)

**Main Content (Scrollable):**
- Today's date banner
- Daily chores checklist:
  - Make bed (checkbox)
  - Put away clothes (checkbox)
  - Clean room (checkbox)
- Each item: Large checkbox + task name + themed icon
- "Extra Credit" section (parent-added tasks)
- Completion celebration animation when all done

**Parent Request Modal:**
- Text: "What extra chore would you like to do?"
- Form with text input
- Submit button: "Ask Parent"
- (Saves locally, simulates parent approval with 5-second delay + notification)

**Safe Area Insets:**
- Root view top: headerHeight + Spacing.xl
- Root view bottom: tabBarHeight + Spacing.xl

### 7. Profile Tab

**Header:**
- Title: "My Profile"
- Transparent background
- Right button: Settings gear

**Main Content (Scrollable):**
- Avatar display (large, centered)
- Display name
- Stats cards:
  - Affirmations viewed
  - Flashcards completed
  - Outdoor time this week
  - Chores finished
- "Change Avatar" button
- "Edit Name" button

**Settings Screen (Stack Navigation):**
- List of settings:
  - Notification preferences
  - Theme accent color
  - Parent mode (requires simple math question)
  - About & Help

**Safe Area Insets:**
- Root view top: headerHeight + Spacing.xl
- Root view bottom: tabBarHeight + Spacing.xl

## Design System

### Color Palette
**Primary Colors:**
- Primary: Bright Purple (#8B5CF6) - Main actions, active states
- Secondary: Warm Orange (#FB923C) - Highlights, celebrations
- Success: Green (#10B981) - Completions, correct answers
- Error/Love: Pink (#EC4899) - Favorites, hearts

**Neutrals:**
- Background: Off-White (#F9FAFB)
- Surface: White (#FFFFFF)
- Text Primary: Dark Gray (#1F2937)
- Text Secondary: Medium Gray (#6B7280)

**Affirmation Gradients (6 presets):**
1. Sunset: Orange to Pink
2. Ocean: Blue to Teal
3. Forest: Green to Lime
4. Sky: Light Blue to Purple
5. Sunrise: Yellow to Orange
6. Twilight: Purple to Blue

### Typography
**Font Family:** System (SF Pro for iOS)
- Hero: 32pt, Bold (Affirmations, titles)
- Title: 24pt, Semibold (Screen headers)
- Headline: 20pt, Semibold (Card titles)
- Body: 16pt, Regular (Main content)
- Caption: 14pt, Regular (Metadata, timestamps)

**Kid-Friendly Meme Fonts (4 options):**
- Comic Sans-style rounded
- Bold block letters
- Playful handwriting
- Bubbly outlined style

### Spacing
- xs: 4pt
- sm: 8pt
- md: 12pt
- lg: 16pt
- xl: 24pt
- xxl: 32pt

### Component Specifications

**Buttons:**
- Primary: Filled with primary color, white text, 16pt rounded corners
- Secondary: Outlined with 2pt border, primary color text
- Icon-only: 44x44pt touch target minimum
- All buttons: Scale to 0.95 on press with 150ms spring animation

**Cards:**
- Background: White
- Border radius: 16pt
- Shadow: ONLY for floating cards
  - shadowOffset: {width: 0, height: 2}
  - shadowOpacity: 0.10
  - shadowRadius: 4pt
- Padding: xl (24pt)

**Checkboxes (Chores):**
- Size: 32x32pt
- Border: 3pt solid
- Checked: Filled with success color, white checkmark
- Tap animation: Bounce effect

**Flashcard Flip:**
- 3D flip animation, 600ms duration
- Perspective transform
- Haptic feedback on flip

### Visual Feedback
- All touchable elements: Opacity 0.7 on press OR scale to 0.95
- Completion animations: Confetti burst for chore completion
- Success sounds: Optional cheerful chime (can be disabled in settings)
- Progress bars: Animated fill with spring physics

### Accessibility
- Minimum touch target: 44x44pt
- Color contrast: WCAG AA compliant
- VoiceOver labels on all interactive elements
- Dynamic type support for text scaling
- Reduce motion option (disables flip animations)

### Required Assets
**Generate 6 Kid-Friendly Avatar Presets:**
1. Astronaut (space helmet, stars)
2. Artist (beret, paintbrush)
3. Athlete (baseball cap, trophy)
4. Explorer (safari hat, binoculars)
5. Scientist (lab goggles, beaker)
6. Musician (headphones, music note)

**Subject Icons (4 - themed versions):**
- Math: Calculator or numbers (styled to child's interest)
- Science: Beaker or atom
- Reading: Book or bookmark
- History: Scroll or globe

**Activity Category Icons (4):**
- Active Play: Running figure
- Nature Explorer: Leaf or butterfly
- Sports: Ball or racket
- Creative Outside: Paintbrush outdoors

**DO NOT use emojis** - Use Feather icons from @expo/vector-icons or custom generated SVG icons