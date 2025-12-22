import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BuddyAppearance } from '@/constants/buddyCustomization';

interface BuddyPreviewProps {
  appearance: BuddyAppearance;
  size?: number;
  showFullBody?: boolean;
}

export function BuddyPreview({ appearance, size = 100, showFullBody = true }: BuddyPreviewProps) {
  const scale = size / 100;
  const headSize = showFullBody ? size * 0.35 : size * 0.8;
  const bodyHeight = showFullBody ? size * 0.45 : 0;
  const legHeight = showFullBody ? size * 0.2 : 0;
  
  const skinColor = appearance.skinColor || '#FFB347';
  const eyeColor = appearance.eyeColor || '#4A90D9';
  const hairColor = appearance.hairColor || '#8B4513';
  const outfitColor = appearance.outfitColor || '#6B5B95';

  const renderHead = () => {
    const getHeadShape = () => {
      const baseStyle = {
        width: headSize,
        height: headSize,
        backgroundColor: skinColor,
      };

      switch (appearance.baseShape) {
        case 'round':
          return { ...baseStyle, borderRadius: headSize / 2 };
        case 'oval':
          return { ...baseStyle, borderRadius: headSize / 2, height: headSize * 1.1 };
        case 'square':
          return { ...baseStyle, borderRadius: headSize * 0.15 };
        case 'cat':
        case 'fox':
          return { ...baseStyle, borderRadius: headSize * 0.4, borderTopLeftRadius: headSize * 0.2, borderTopRightRadius: headSize * 0.2 };
        case 'alien':
          return { ...baseStyle, borderRadius: headSize / 2, height: headSize * 1.15 };
        case 'robot-head':
          return { ...baseStyle, borderRadius: headSize * 0.1 };
        default:
          return { ...baseStyle, borderRadius: headSize / 2 };
      }
    };

    const eyeSize = headSize * 0.18;
    const pupilSize = eyeSize * 0.55;
    const gap = headSize * 0.12;

    const getEyeStyle = () => {
      switch (appearance.eyeShape) {
        case 'round':
          return { width: eyeSize, height: eyeSize, borderRadius: eyeSize / 2 };
        case 'oval':
          return { width: eyeSize * 0.8, height: eyeSize, borderRadius: eyeSize / 2 };
        case 'happy':
          return { width: eyeSize, height: eyeSize * 0.5, borderRadius: eyeSize / 2, borderTopLeftRadius: 0, borderTopRightRadius: 0 };
        case 'sparkle':
          return { width: eyeSize * 1.2, height: eyeSize * 1.2, borderRadius: eyeSize * 0.6 };
        case 'big':
          return { width: eyeSize * 1.3, height: eyeSize * 1.3, borderRadius: eyeSize * 0.65 };
        case 'anime':
          return { width: eyeSize * 1.4, height: eyeSize * 1.6, borderRadius: eyeSize * 0.7 };
        default:
          return { width: eyeSize, height: eyeSize, borderRadius: eyeSize / 2 };
      }
    };

    const getMouthStyle = () => {
      const mouthWidth = headSize * 0.22;
      const mouthHeight = headSize * 0.1;
      switch (appearance.mouthStyle) {
        case 'grin':
          return { width: mouthWidth * 1.3, height: mouthHeight, backgroundColor: 'white', borderBottomLeftRadius: mouthHeight, borderBottomRightRadius: mouthHeight };
        case 'small':
          return { width: mouthWidth * 0.5, height: mouthHeight * 0.5, backgroundColor: '#333', borderRadius: mouthHeight * 0.25 };
        case 'open':
          return { width: mouthWidth * 0.6, height: mouthHeight * 1.2, backgroundColor: '#333', borderRadius: mouthWidth * 0.3 };
        case 'cat':
          return { width: mouthWidth * 0.4, height: 2 * scale, backgroundColor: '#333' };
        default:
          return { width: mouthWidth, height: mouthHeight, backgroundColor: 'white', borderBottomLeftRadius: mouthHeight, borderBottomRightRadius: mouthHeight };
      }
    };

    return (
      <View style={[styles.head, getHeadShape()]}>
        {renderHair()}
        {renderEars()}
        {renderHorns()}
        <View style={[styles.eyesContainer, { gap }]}>
          <View style={[styles.eye, getEyeStyle()]}>
            <View style={[styles.pupil, { width: pupilSize, height: pupilSize, borderRadius: pupilSize / 2, backgroundColor: eyeColor }]} />
          </View>
          <View style={[styles.eye, getEyeStyle()]}>
            <View style={[styles.pupil, { width: pupilSize, height: pupilSize, borderRadius: pupilSize / 2, backgroundColor: eyeColor }]} />
          </View>
        </View>
        <View style={getMouthStyle()} />
        {renderAccessory()}
      </View>
    );
  };

  const renderHair = () => {
    if (!appearance.hairStyle || appearance.hairStyle === 'none') return null;

    const hairTop = -headSize * 0.08;

    switch (appearance.hairStyle) {
      case 'short':
        return <View style={[styles.hairShort, { backgroundColor: hairColor, top: hairTop, width: headSize * 0.7, height: headSize * 0.22, borderRadius: headSize * 0.12 }]} />;
      case 'spiky':
        return (
          <View style={[styles.hairSpiky, { top: hairTop - headSize * 0.08 }]}>
            {[...Array(5)].map((_, i) => (
              <View key={i} style={[styles.spike, { backgroundColor: hairColor, width: headSize * 0.1, height: headSize * 0.18 }]} />
            ))}
          </View>
        );
      case 'curly':
        return (
          <View style={[styles.hairCurly, { top: hairTop }]}>
            {[...Array(4)].map((_, i) => (
              <View key={i} style={[styles.curl, { backgroundColor: hairColor, width: headSize * 0.15, height: headSize * 0.15, borderRadius: headSize * 0.075 }]} />
            ))}
          </View>
        );
      case 'long':
        return <View style={[styles.hairLong, { backgroundColor: hairColor, top: hairTop, width: headSize * 0.85, height: headSize * 0.45, borderTopLeftRadius: headSize * 0.25, borderTopRightRadius: headSize * 0.25 }]} />;
      case 'ponytail':
        return (
          <>
            <View style={[styles.hairShort, { backgroundColor: hairColor, top: hairTop, width: headSize * 0.65, height: headSize * 0.18, borderRadius: headSize * 0.1 }]} />
            <View style={[styles.ponytail, { backgroundColor: hairColor, top: headSize * 0.1, right: -headSize * 0.12, width: headSize * 0.15, height: headSize * 0.3, borderRadius: headSize * 0.075 }]} />
          </>
        );
      case 'buns':
        return (
          <>
            <View style={[styles.bun, { backgroundColor: hairColor, left: headSize * 0.08, top: -headSize * 0.12, width: headSize * 0.18, height: headSize * 0.18, borderRadius: headSize * 0.09 }]} />
            <View style={[styles.bun, { backgroundColor: hairColor, right: headSize * 0.08, top: -headSize * 0.12, width: headSize * 0.18, height: headSize * 0.18, borderRadius: headSize * 0.09 }]} />
          </>
        );
      case 'mohawk':
        return <View style={[styles.mohawk, { backgroundColor: hairColor, top: hairTop - headSize * 0.08, width: headSize * 0.12, height: headSize * 0.28, borderRadius: headSize * 0.06 }]} />;
      case 'afro':
        return <View style={[styles.afro, { backgroundColor: hairColor, top: -headSize * 0.2, width: headSize * 1.05, height: headSize * 0.5, borderRadius: headSize * 0.25 }]} />;
      default:
        return null;
    }
  };

  const renderEars = () => {
    const feature = appearance.specialFeature || 'none';
    if (!feature.includes('ears')) return null;

    switch (feature) {
      case 'cat-ears':
      case 'fox-ears':
        return (
          <>
            <View style={[styles.animalEar, { backgroundColor: skinColor, left: headSize * 0.02, top: -headSize * 0.12, borderLeftWidth: headSize * 0.1, borderRightWidth: headSize * 0.1, borderBottomWidth: headSize * 0.15, borderBottomColor: skinColor }]} />
            <View style={[styles.animalEar, { backgroundColor: skinColor, right: headSize * 0.02, top: -headSize * 0.12, borderLeftWidth: headSize * 0.1, borderRightWidth: headSize * 0.1, borderBottomWidth: headSize * 0.15, borderBottomColor: skinColor }]} />
          </>
        );
      case 'bunny-ears':
        return (
          <>
            <View style={[styles.bunnyEar, { backgroundColor: skinColor, left: headSize * 0.15, top: -headSize * 0.32, width: headSize * 0.1, height: headSize * 0.32, borderRadius: headSize * 0.05 }]}>
              <View style={[styles.bunnyEarInner, { backgroundColor: appearance.specialFeatureColor || '#FF69B4', width: headSize * 0.05, height: headSize * 0.18 }]} />
            </View>
            <View style={[styles.bunnyEar, { backgroundColor: skinColor, right: headSize * 0.15, top: -headSize * 0.32, width: headSize * 0.1, height: headSize * 0.32, borderRadius: headSize * 0.05 }]}>
              <View style={[styles.bunnyEarInner, { backgroundColor: appearance.specialFeatureColor || '#FF69B4', width: headSize * 0.05, height: headSize * 0.18 }]} />
            </View>
          </>
        );
      default:
        return null;
    }
  };

  const renderHorns = () => {
    const feature = appearance.specialFeature || 'none';
    if (!feature.includes('horns')) return null;

    const color = appearance.specialFeatureColor || '#FFD700';

    switch (feature) {
      case 'horns-unicorn':
        return (
          <View style={[styles.unicornHorn, { top: -headSize * 0.2, borderLeftWidth: headSize * 0.05, borderRightWidth: headSize * 0.05, borderBottomWidth: headSize * 0.2, borderBottomColor: color }]} />
        );
      case 'horns-devil':
        return (
          <>
            <View style={[styles.devilHorn, { backgroundColor: color, left: headSize * 0.12, top: -headSize * 0.12, width: headSize * 0.06, height: headSize * 0.12, transform: [{ rotate: '-15deg' }] }]} />
            <View style={[styles.devilHorn, { backgroundColor: color, right: headSize * 0.12, top: -headSize * 0.12, width: headSize * 0.06, height: headSize * 0.12, transform: [{ rotate: '15deg' }] }]} />
          </>
        );
      default:
        return null;
    }
  };

  const renderAccessory = () => {
    if (!appearance.accessory || appearance.accessory === 'none') return null;

    const color = appearance.accessoryColor || '#FFD700';

    switch (appearance.accessory) {
      case 'glasses':
        return (
          <View style={[styles.glasses, { top: headSize * 0.28 }]}>
            <View style={[styles.glassLens, { width: headSize * 0.2, height: headSize * 0.15, borderRadius: headSize * 0.04, borderColor: color }]} />
            <View style={[styles.glassBridge, { width: headSize * 0.06, height: 2 * scale, backgroundColor: color }]} />
            <View style={[styles.glassLens, { width: headSize * 0.2, height: headSize * 0.15, borderRadius: headSize * 0.04, borderColor: color }]} />
          </View>
        );
      case 'sunglasses':
        return (
          <View style={[styles.glasses, { top: headSize * 0.28 }]}>
            <View style={[styles.sunglassLens, { width: headSize * 0.22, height: headSize * 0.14, borderRadius: headSize * 0.07, backgroundColor: '#2C3E50' }]} />
            <View style={[styles.glassBridge, { width: headSize * 0.05, height: 2 * scale, backgroundColor: color }]} />
            <View style={[styles.sunglassLens, { width: headSize * 0.22, height: headSize * 0.14, borderRadius: headSize * 0.07, backgroundColor: '#2C3E50' }]} />
          </View>
        );
      case 'crown':
        return (
          <View style={[styles.crown, { top: -headSize * 0.18, width: headSize * 0.5, height: headSize * 0.15, backgroundColor: color, borderTopLeftRadius: headSize * 0.02, borderTopRightRadius: headSize * 0.02 }]}>
            <View style={[styles.crownPoint, { backgroundColor: color, width: headSize * 0.06, height: headSize * 0.1 }]} />
          </View>
        );
      case 'hat':
        return (
          <View style={[styles.hat, { top: -headSize * 0.2, backgroundColor: color, width: headSize * 0.55, height: headSize * 0.2, borderRadius: headSize * 0.08 }]}>
            <View style={[styles.hatBrim, { backgroundColor: darkenColor(color), width: headSize * 0.7, height: headSize * 0.05, borderRadius: headSize * 0.025 }]} />
          </View>
        );
      case 'bow':
        return (
          <View style={[styles.bow, { top: -headSize * 0.06, backgroundColor: color, width: headSize * 0.2, height: headSize * 0.1, borderRadius: headSize * 0.05 }]}>
            <View style={[styles.bowCenter, { backgroundColor: darkenColor(color), width: headSize * 0.05, height: headSize * 0.05, borderRadius: headSize * 0.025 }]} />
          </View>
        );
      case 'headphones':
        return (
          <View style={styles.headphones}>
            <View style={[styles.headphoneBand, { top: -headSize * 0.12, width: headSize * 0.65, height: headSize * 0.06, borderRadius: headSize * 0.03, backgroundColor: color }]} />
            <View style={[styles.headphonePad, { left: -headSize * 0.06, top: headSize * 0.18, width: headSize * 0.12, height: headSize * 0.16, borderRadius: headSize * 0.06, backgroundColor: color }]} />
            <View style={[styles.headphonePad, { right: -headSize * 0.06, top: headSize * 0.18, width: headSize * 0.12, height: headSize * 0.16, borderRadius: headSize * 0.06, backgroundColor: color }]} />
          </View>
        );
      case 'halo':
        return (
          <View style={[styles.halo, { top: -headSize * 0.16, width: headSize * 0.45, height: headSize * 0.1, borderRadius: headSize * 0.05, borderWidth: 2.5 * scale, borderColor: color }]} />
        );
      default:
        return null;
    }
  };

  const renderBody = () => {
    if (!showFullBody) return null;

    const bodyWidth = headSize * 1.1;
    const armWidth = bodyWidth * 0.18;
    const armHeight = bodyHeight * 0.8;

    return (
      <View style={[styles.bodyContainer, { height: bodyHeight }]}>
        <View style={[styles.armLeft, { backgroundColor: skinColor, width: armWidth, height: armHeight, left: -armWidth * 0.3, borderRadius: armWidth / 2 }]} />
        <View style={[styles.armRight, { backgroundColor: skinColor, width: armWidth, height: armHeight, right: -armWidth * 0.3, borderRadius: armWidth / 2 }]} />
        {renderOutfit(bodyWidth, bodyHeight)}
        <View style={[styles.torso, { backgroundColor: skinColor, width: bodyWidth, height: bodyHeight, borderRadius: bodyWidth * 0.15, borderTopLeftRadius: bodyWidth * 0.08, borderTopRightRadius: bodyWidth * 0.08 }]} />
        {renderOutfitOverlay(bodyWidth, bodyHeight)}
      </View>
    );
  };

  const renderOutfit = (bodyWidth: number, bodyHeight: number) => {
    if (!appearance.outfit || appearance.outfit === 'none') return null;

    const color = outfitColor;

    switch (appearance.outfit) {
      case 'superhero':
        return (
          <View style={[styles.cape, { backgroundColor: color, width: bodyWidth * 1.3, height: bodyHeight * 1.2, top: -bodyHeight * 0.1, borderRadius: bodyWidth * 0.1 }]} />
        );
      default:
        return null;
    }
  };

  const renderOutfitOverlay = (bodyWidth: number, bodyHeight: number) => {
    if (!appearance.outfit || appearance.outfit === 'none') return null;

    const color = outfitColor;

    switch (appearance.outfit) {
      case 'tshirt':
        return (
          <View style={[styles.outfitOverlay, styles.tshirt, { backgroundColor: color, width: bodyWidth * 0.95, height: bodyHeight * 0.75, borderRadius: bodyWidth * 0.12, borderTopLeftRadius: bodyWidth * 0.06, borderTopRightRadius: bodyWidth * 0.06 }]}>
            <View style={[styles.collar, { borderBottomColor: darkenColor(color), borderBottomWidth: 3 * scale, width: bodyWidth * 0.25 }]} />
          </View>
        );
      case 'hoodie':
        return (
          <View style={[styles.outfitOverlay, styles.hoodie, { backgroundColor: color, width: bodyWidth * 0.98, height: bodyHeight * 0.85, borderRadius: bodyWidth * 0.12, borderTopLeftRadius: bodyWidth * 0.06, borderTopRightRadius: bodyWidth * 0.06 }]}>
            <View style={[styles.hoodieHood, { backgroundColor: darkenColor(color), width: bodyWidth * 0.4, height: bodyHeight * 0.15, borderRadius: bodyWidth * 0.08, top: -bodyHeight * 0.02 }]} />
            <View style={[styles.hoodiePocket, { backgroundColor: darkenColor(color), width: bodyWidth * 0.5, height: bodyHeight * 0.2, borderRadius: bodyWidth * 0.05, bottom: bodyHeight * 0.08 }]} />
          </View>
        );
      case 'dress':
        return (
          <View style={[styles.outfitOverlay, styles.dress, { backgroundColor: color, width: bodyWidth * 1.1, height: bodyHeight * 1.1, borderRadius: bodyWidth * 0.08, borderTopLeftRadius: bodyWidth * 0.06, borderTopRightRadius: bodyWidth * 0.06, borderBottomLeftRadius: bodyWidth * 0.3, borderBottomRightRadius: bodyWidth * 0.3 }]} />
        );
      case 'superhero':
        return (
          <View style={[styles.outfitOverlay, styles.superheroSuit, { backgroundColor: darkenColor(color), width: bodyWidth * 0.92, height: bodyHeight * 0.8, borderRadius: bodyWidth * 0.1 }]}>
            <View style={[styles.superheroBelt, { backgroundColor: '#FFD700', width: bodyWidth * 0.9, height: bodyHeight * 0.08, borderRadius: 2 * scale }]} />
            <View style={[styles.superheroLogo, { backgroundColor: '#FFD700', width: bodyWidth * 0.25, height: bodyWidth * 0.25, borderRadius: bodyWidth * 0.125, top: bodyHeight * 0.08 }]} />
          </View>
        );
      case 'wizard':
        return (
          <View style={[styles.outfitOverlay, styles.wizardRobe, { backgroundColor: color, width: bodyWidth * 1.05, height: bodyHeight * 1.05, borderRadius: bodyWidth * 0.1, borderBottomLeftRadius: bodyWidth * 0.25, borderBottomRightRadius: bodyWidth * 0.25 }]}>
            <View style={[styles.robeStars]} />
          </View>
        );
      case 'ninja':
        return (
          <View style={[styles.outfitOverlay, { backgroundColor: '#2C3E50', width: bodyWidth * 0.95, height: bodyHeight * 0.85, borderRadius: bodyWidth * 0.1 }]}>
            <View style={[styles.ninjaBelt, { backgroundColor: color, width: bodyWidth * 0.88, height: bodyHeight * 0.06, borderRadius: 2 * scale }]} />
          </View>
        );
      case 'sports':
        return (
          <View style={[styles.outfitOverlay, styles.jersey, { backgroundColor: color, width: bodyWidth * 0.95, height: bodyHeight * 0.75, borderRadius: bodyWidth * 0.1 }]}>
            <View style={[styles.jerseyStripe, { backgroundColor: 'white', width: 3 * scale, height: bodyHeight * 0.6 }]} />
          </View>
        );
      default:
        return (
          <View style={[styles.outfitOverlay, styles.tshirt, { backgroundColor: color, width: bodyWidth * 0.95, height: bodyHeight * 0.75, borderRadius: bodyWidth * 0.12, borderTopLeftRadius: bodyWidth * 0.06, borderTopRightRadius: bodyWidth * 0.06 }]} />
        );
    }
  };

  const renderLegs = () => {
    if (!showFullBody) return null;

    const legWidth = headSize * 0.28;
    const legGap = headSize * 0.12;

    return (
      <View style={[styles.legsContainer, { height: legHeight }]}>
        <View style={[styles.leg, { backgroundColor: appearance.outfit && appearance.outfit !== 'none' ? darkenColor(outfitColor) : skinColor, width: legWidth, height: legHeight, borderBottomLeftRadius: legWidth / 2, borderBottomRightRadius: legWidth / 2 }]} />
        <View style={{ width: legGap }} />
        <View style={[styles.leg, { backgroundColor: appearance.outfit && appearance.outfit !== 'none' ? darkenColor(outfitColor) : skinColor, width: legWidth, height: legHeight, borderBottomLeftRadius: legWidth / 2, borderBottomRightRadius: legWidth / 2 }]} />
      </View>
    );
  };

  const renderWings = () => {
    const feature = appearance.specialFeature || 'none';
    if (!feature.includes('wings')) return null;

    const color = appearance.specialFeatureColor || '#FF69B4';
    const wingWidth = showFullBody ? size * 0.35 : headSize * 0.45;
    const wingHeight = showFullBody ? size * 0.5 : headSize * 0.55;

    switch (feature) {
      case 'wings-fairy':
      case 'wings-butterfly':
        return (
          <>
            <View style={[styles.wingLeft, { backgroundColor: color + '70', width: wingWidth, height: wingHeight, borderRadius: wingWidth * 0.5, left: -wingWidth * 0.7, top: showFullBody ? size * 0.3 : headSize * 0.2 }]} />
            <View style={[styles.wingRight, { backgroundColor: color + '70', width: wingWidth, height: wingHeight, borderRadius: wingWidth * 0.5, right: -wingWidth * 0.7, top: showFullBody ? size * 0.3 : headSize * 0.2 }]} />
          </>
        );
      case 'wings-angel':
        return (
          <>
            <View style={[styles.wingLeft, { backgroundColor: '#FFFFFF', width: wingWidth * 1.1, height: wingHeight * 1.1, borderRadius: wingWidth * 0.5, left: -wingWidth * 0.8, top: showFullBody ? size * 0.28 : headSize * 0.18 }]} />
            <View style={[styles.wingRight, { backgroundColor: '#FFFFFF', width: wingWidth * 1.1, height: wingHeight * 1.1, borderRadius: wingWidth * 0.5, right: -wingWidth * 0.8, top: showFullBody ? size * 0.28 : headSize * 0.18 }]} />
          </>
        );
      case 'wings-bat':
        return (
          <>
            <View style={[styles.wingLeft, { backgroundColor: '#1a1a2e', width: wingWidth * 1.2, height: wingHeight * 0.9, borderTopLeftRadius: wingWidth * 0.6, borderBottomRightRadius: wingWidth * 0.4, left: -wingWidth * 0.9, top: showFullBody ? size * 0.32 : headSize * 0.22 }]} />
            <View style={[styles.wingRight, { backgroundColor: '#1a1a2e', width: wingWidth * 1.2, height: wingHeight * 0.9, borderTopRightRadius: wingWidth * 0.6, borderBottomLeftRadius: wingWidth * 0.4, right: -wingWidth * 0.9, top: showFullBody ? size * 0.32 : headSize * 0.22 }]} />
          </>
        );
      default:
        return null;
    }
  };

  const renderTail = () => {
    const feature = appearance.specialFeature || 'none';
    if (!feature.includes('tail')) return null;

    const color = feature === 'tail-fox' ? (appearance.specialFeatureColor || '#FF8C00') : skinColor;
    const tailWidth = showFullBody ? size * 0.12 : headSize * 0.14;
    const tailHeight = showFullBody ? size * 0.35 : headSize * 0.4;

    return (
      <View style={[styles.tail, { backgroundColor: color, width: tailWidth, height: tailHeight, right: -tailWidth * 0.6, bottom: showFullBody ? size * 0.15 : headSize * 0.1, borderRadius: tailWidth / 2 }]} />
    );
  };

  const renderGlow = () => {
    if (appearance.specialFeature !== 'glow') return null;

    const color = appearance.specialFeatureColor || '#FF69B4';
    const glowSize = showFullBody ? size * 1.3 : headSize * 1.4;

    return (
      <View style={[styles.glowAura, { width: glowSize, height: glowSize * 1.1, borderRadius: glowSize * 0.4, backgroundColor: color + '25' }]} />
    );
  };

  return (
    <View style={[styles.container, { width: size * 1.4, height: showFullBody ? size : headSize * 1.2 }]}>
      {renderGlow()}
      {renderWings()}
      {renderTail()}
      <View style={styles.characterBody}>
        {renderHead()}
        {renderBody()}
        {renderLegs()}
      </View>
    </View>
  );
}

function darkenColor(color: string): string {
  if (!color || color.length < 7) return '#333333';
  const hex = color.replace('#', '');
  const r = Math.max(0, parseInt(hex.substring(0, 2), 16) - 35);
  const g = Math.max(0, parseInt(hex.substring(2, 4), 16) - 35);
  const b = Math.max(0, parseInt(hex.substring(4, 6), 16) - 35);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  characterBody: {
    alignItems: 'center',
    zIndex: 10,
  },
  head: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  eyesContainer: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  eye: {
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pupil: {
    position: 'absolute',
  },
  hairShort: { position: 'absolute', alignSelf: 'center' },
  hairSpiky: { position: 'absolute', flexDirection: 'row', alignSelf: 'center' },
  spike: { borderTopLeftRadius: 15, borderTopRightRadius: 15, marginHorizontal: 1 },
  hairCurly: { position: 'absolute', flexDirection: 'row', alignSelf: 'center' },
  curl: { marginHorizontal: 1 },
  hairLong: { position: 'absolute', alignSelf: 'center', zIndex: -1 },
  ponytail: { position: 'absolute' },
  bun: { position: 'absolute' },
  mohawk: { position: 'absolute', alignSelf: 'center' },
  afro: { position: 'absolute', alignSelf: 'center', zIndex: -1 },
  animalEar: { position: 'absolute', width: 0, height: 0, borderLeftColor: 'transparent', borderRightColor: 'transparent' },
  bunnyEar: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  bunnyEarInner: { borderRadius: 3 },
  unicornHorn: { position: 'absolute', alignSelf: 'center', borderLeftColor: 'transparent', borderRightColor: 'transparent' },
  devilHorn: { position: 'absolute', borderRadius: 2 },
  glasses: { position: 'absolute', flexDirection: 'row', alignItems: 'center', zIndex: 25 },
  glassLens: { borderWidth: 2, backgroundColor: 'transparent' },
  sunglassLens: {},
  glassBridge: {},
  crown: { position: 'absolute', alignSelf: 'center', alignItems: 'center' },
  crownPoint: { position: 'absolute', top: -8, borderTopLeftRadius: 6, borderTopRightRadius: 6 },
  hat: { position: 'absolute', alignSelf: 'center', alignItems: 'center', justifyContent: 'flex-end' },
  hatBrim: { position: 'absolute', bottom: -3 },
  bow: { position: 'absolute', alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
  bowCenter: { position: 'absolute' },
  headphones: { position: 'absolute', width: '100%', height: '100%' },
  headphoneBand: { position: 'absolute', alignSelf: 'center' },
  headphonePad: { position: 'absolute' },
  halo: { position: 'absolute', alignSelf: 'center', backgroundColor: 'transparent' },
  bodyContainer: { alignItems: 'center', marginTop: -4 },
  torso: { zIndex: 5 },
  armLeft: { position: 'absolute', top: 4, zIndex: 4 },
  armRight: { position: 'absolute', top: 4, zIndex: 4 },
  cape: { position: 'absolute', zIndex: 1 },
  outfitOverlay: { position: 'absolute', zIndex: 15, alignItems: 'center' },
  tshirt: {},
  collar: { position: 'absolute', top: 0 },
  hoodie: {},
  hoodieHood: { position: 'absolute' },
  hoodiePocket: { position: 'absolute' },
  dress: {},
  superheroSuit: { alignItems: 'center' },
  superheroBelt: { position: 'absolute', bottom: 8 },
  superheroLogo: { position: 'absolute' },
  wizardRobe: {},
  robeStars: {},
  ninjaBelt: { position: 'absolute', top: '45%' },
  jersey: { alignItems: 'center' },
  jerseyStripe: {},
  legsContainer: { flexDirection: 'row', marginTop: -2, zIndex: 3 },
  leg: {},
  wingLeft: { position: 'absolute', zIndex: 1 },
  wingRight: { position: 'absolute', zIndex: 1 },
  tail: { position: 'absolute', zIndex: 2, transform: [{ rotate: '25deg' }] },
  glowAura: { position: 'absolute', zIndex: 0 },
});
