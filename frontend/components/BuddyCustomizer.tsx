import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  TextInput,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ThemedText';
import { BuddyPreview } from '@/components/BuddyPreview';
import { useBuddy } from '@/contexts/BuddyContext';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, BorderRadius } from '@/constants/theme';
import {
  CHARACTER_TYPES,
  BASE_SHAPES,
  SKIN_COLORS,
  EYE_SHAPES,
  EYE_COLORS,
  MOUTH_STYLES,
  HAIR_STYLES,
  HAIR_COLORS,
  OUTFITS,
  OUTFIT_COLORS,
  ACCESSORIES,
  SPECIAL_FEATURES,
  CUSTOMIZATION_CATEGORIES,
  BuddyAppearance,
} from '@/constants/buddyCustomization';

type CategoryId = 'type' | 'skin' | 'face' | 'hair' | 'outfit' | 'accessory' | 'special';

export function BuddyCustomizer() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { 
    isCustomizerOpen, 
    setIsCustomizerOpen, 
    buddyData, 
    updateAppearance,
    setBuddyName 
  } = useBuddy();
  
  const [activeCategory, setActiveCategory] = useState<CategoryId>('type');
  const [tempAppearance, setTempAppearance] = useState<BuddyAppearance>(buddyData.appearance);
  const [tempName, setTempName] = useState(buddyData.buddyName);

  React.useEffect(() => {
    if (isCustomizerOpen) {
      setTempAppearance({ ...buddyData.appearance });
      setTempName(buddyData.buddyName);
      setActiveCategory('type');
    }
  }, [isCustomizerOpen, buddyData.appearance, buddyData.buddyName]);

  const handleClose = () => {
    setIsCustomizerOpen(false);
    setTempAppearance(buddyData.appearance);
    setTempName(buddyData.buddyName);
  };

  const handleSave = () => {
    updateAppearance(tempAppearance);
    setBuddyName(tempName);
    setIsCustomizerOpen(false);
  };

  const updateTempAppearance = (key: keyof BuddyAppearance, value: string) => {
    setTempAppearance(prev => ({ ...prev, [key]: value }));
  };

  const renderColorPicker = (
    colors: { id: string; color: string; label: string }[],
    selectedColor: string,
    onSelect: (color: string) => void
  ) => (
    <View style={styles.colorGrid}>
      {colors.map((c) => (
        <Pressable
          key={c.id}
          style={[
            styles.colorSwatch,
            { backgroundColor: c.color },
            selectedColor === c.color && [styles.colorSwatchSelected, { borderColor: theme.primary }],
          ]}
          onPress={() => onSelect(c.color)}
        >
          {selectedColor === c.color ? (
            <Feather name="check" size={16} color={getContrastColor(c.color)} />
          ) : null}
        </Pressable>
      ))}
    </View>
  );

  const renderOptionPicker = (
    options: { id: string; label: string }[],
    selectedId: string,
    onSelect: (id: string) => void
  ) => (
    <View style={styles.optionGrid}>
      {options.map((opt) => (
        <Pressable
          key={opt.id}
          style={[
            styles.optionButton,
            { backgroundColor: theme.backgroundSecondary },
            selectedId === opt.id && { backgroundColor: theme.primary },
          ]}
          onPress={() => onSelect(opt.id)}
        >
          <ThemedText
            style={[
              styles.optionText,
              { color: selectedId === opt.id ? 'white' : theme.text },
            ]}
          >
            {opt.label}
          </ThemedText>
        </Pressable>
      ))}
    </View>
  );

  const renderCategoryContent = () => {
    switch (activeCategory) {
      case 'type':
        return (
          <View style={styles.categoryContent}>
            <ThemedText style={styles.sectionTitle}>Buddy Name</ThemedText>
            <TextInput
              style={[
                styles.nameInput,
                { backgroundColor: theme.backgroundSecondary, color: theme.text },
              ]}
              value={tempName}
              onChangeText={setTempName}
              placeholder="Enter buddy name"
              placeholderTextColor={theme.textSecondary}
              maxLength={20}
            />

            <ThemedText style={styles.sectionTitle}>Character Type</ThemedText>
            {renderOptionPicker(
              CHARACTER_TYPES.map(t => ({ id: t.id, label: t.label })),
              tempAppearance.characterType,
              (id) => updateTempAppearance('characterType', id)
            )}

            <ThemedText style={styles.sectionTitle}>Base Shape</ThemedText>
            {renderOptionPicker(
              BASE_SHAPES,
              tempAppearance.baseShape,
              (id) => updateTempAppearance('baseShape', id)
            )}
          </View>
        );

      case 'skin':
        return (
          <View style={styles.categoryContent}>
            <ThemedText style={styles.sectionTitle}>Skin / Body Color</ThemedText>
            {renderColorPicker(
              SKIN_COLORS,
              tempAppearance.skinColor,
              (color) => updateTempAppearance('skinColor', color)
            )}
          </View>
        );

      case 'face':
        return (
          <View style={styles.categoryContent}>
            <ThemedText style={styles.sectionTitle}>Eye Shape</ThemedText>
            {renderOptionPicker(
              EYE_SHAPES,
              tempAppearance.eyeShape,
              (id) => updateTempAppearance('eyeShape', id)
            )}

            <ThemedText style={styles.sectionTitle}>Eye Color</ThemedText>
            {renderColorPicker(
              EYE_COLORS,
              tempAppearance.eyeColor,
              (color) => updateTempAppearance('eyeColor', color)
            )}

            <ThemedText style={styles.sectionTitle}>Mouth Style</ThemedText>
            {renderOptionPicker(
              MOUTH_STYLES,
              tempAppearance.mouthStyle,
              (id) => updateTempAppearance('mouthStyle', id)
            )}
          </View>
        );

      case 'hair':
        return (
          <View style={styles.categoryContent}>
            <ThemedText style={styles.sectionTitle}>Hair Style</ThemedText>
            {renderOptionPicker(
              HAIR_STYLES,
              tempAppearance.hairStyle,
              (id) => updateTempAppearance('hairStyle', id)
            )}

            <ThemedText style={styles.sectionTitle}>Hair Color</ThemedText>
            {renderColorPicker(
              HAIR_COLORS,
              tempAppearance.hairColor,
              (color) => updateTempAppearance('hairColor', color)
            )}
          </View>
        );

      case 'outfit':
        return (
          <View style={styles.categoryContent}>
            <ThemedText style={styles.sectionTitle}>Outfit</ThemedText>
            {renderOptionPicker(
              OUTFITS,
              tempAppearance.outfit,
              (id) => updateTempAppearance('outfit', id)
            )}

            <ThemedText style={styles.sectionTitle}>Outfit Color</ThemedText>
            {renderColorPicker(
              OUTFIT_COLORS,
              tempAppearance.outfitColor,
              (color) => updateTempAppearance('outfitColor', color)
            )}
          </View>
        );

      case 'accessory':
        return (
          <View style={styles.categoryContent}>
            <ThemedText style={styles.sectionTitle}>Accessories</ThemedText>
            {renderOptionPicker(
              ACCESSORIES,
              tempAppearance.accessory,
              (id) => updateTempAppearance('accessory', id)
            )}

            <ThemedText style={styles.sectionTitle}>Accessory Color</ThemedText>
            {renderColorPicker(
              OUTFIT_COLORS,
              tempAppearance.accessoryColor,
              (color) => updateTempAppearance('accessoryColor', color)
            )}
          </View>
        );

      case 'special':
        return (
          <View style={styles.categoryContent}>
            <ThemedText style={styles.sectionTitle}>Special Features</ThemedText>
            {renderOptionPicker(
              SPECIAL_FEATURES,
              tempAppearance.specialFeature,
              (id) => updateTempAppearance('specialFeature', id)
            )}

            <ThemedText style={styles.sectionTitle}>Feature Color</ThemedText>
            {renderColorPicker(
              [...SKIN_COLORS, ...OUTFIT_COLORS].filter((c, i, arr) => 
                arr.findIndex(x => x.color === c.color) === i
              ),
              tempAppearance.specialFeatureColor,
              (color) => updateTempAppearance('specialFeatureColor', color)
            )}
          </View>
        );

      default:
        return null;
    }
  };

  if (!isCustomizerOpen) return null;

  return (
    <Modal
      visible={isCustomizerOpen}
      animationType="slide"
      transparent={false}
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot, paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={handleClose} style={styles.headerButton}>
            <Feather name="x" size={24} color={theme.text} />
          </Pressable>
          <ThemedText type="headline">Customize Buddy</ThemedText>
          <Pressable onPress={handleSave} style={[styles.headerButton, styles.saveButton, { backgroundColor: theme.primary }]}>
            <ThemedText style={{ color: 'white', fontWeight: '600' }}>Save</ThemedText>
          </Pressable>
        </View>

        <View style={[styles.previewContainer, { backgroundColor: theme.backgroundSecondary }]}>
          <BuddyPreview appearance={tempAppearance} size={120} />
          <ThemedText type="title" style={styles.buddyName}>{tempName}</ThemedText>
        </View>

        <View style={[styles.categoryTabs, { borderBottomColor: theme.textSecondary + '20' }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
            {CUSTOMIZATION_CATEGORIES.map((cat) => (
              <Pressable
                key={cat.id}
                style={[
                  styles.categoryTab,
                  activeCategory === cat.id && { backgroundColor: theme.primary },
                ]}
                onPress={() => setActiveCategory(cat.id as CategoryId)}
              >
                <Feather
                  name={cat.icon as any}
                  size={18}
                  color={activeCategory === cat.id ? 'white' : theme.text}
                />
                <ThemedText
                  style={[
                    styles.tabLabel,
                    { color: activeCategory === cat.id ? 'white' : theme.text },
                  ]}
                >
                  {cat.label}
                </ThemedText>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <ScrollView style={styles.optionsContainer} contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.xl }}>
          {renderCategoryContent()}
        </ScrollView>
      </View>
    </Modal>
  );
}

function getContrastColor(hexColor: string): string {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  headerButton: {
    padding: Spacing.sm,
  },
  saveButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  previewContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    marginHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  buddyName: {
    marginTop: Spacing.md,
  },
  categoryTabs: {
    borderBottomWidth: 1,
  },
  tabsScroll: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  optionsContainer: {
    flex: 1,
  },
  categoryContent: {
    padding: Spacing.md,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  colorSwatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSwatchSelected: {
    borderWidth: 3,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  optionButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  optionText: {
    fontSize: 14,
  },
  nameInput: {
    height: 48,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
  },
});
