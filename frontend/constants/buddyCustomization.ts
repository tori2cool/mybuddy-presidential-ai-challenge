export type CharacterType = 'human' | 'animal' | 'fantasy' | 'robot';

export interface BuddyAppearance {
  characterType: CharacterType;
  baseShape: string;
  skinColor: string;
  eyeShape: string;
  eyeColor: string;
  mouthStyle: string;
  hairStyle: string;
  hairColor: string;
  outfit: string;
  outfitColor: string;
  accessory: string;
  accessoryColor: string;
  specialFeature: string;
  specialFeatureColor: string;
}

export const DEFAULT_APPEARANCE: BuddyAppearance = {
  characterType: 'human',
  baseShape: 'round',
  skinColor: '#FFB347',
  eyeShape: 'round',
  eyeColor: '#4A90D9',
  mouthStyle: 'smile',
  hairStyle: 'none',
  hairColor: '#8B4513',
  outfit: 'none',
  outfitColor: '#6B5B95',
  accessory: 'none',
  accessoryColor: '#FFD700',
  specialFeature: 'none',
  specialFeatureColor: '#FF69B4',
};

export const CHARACTER_TYPES: { id: CharacterType; label: string; icon: string }[] = [
  { id: 'human', label: 'Human', icon: 'user' },
  { id: 'animal', label: 'Animal', icon: 'heart' },
  { id: 'fantasy', label: 'Fantasy', icon: 'star' },
  { id: 'robot', label: 'Robot', icon: 'cpu' },
];

export const BASE_SHAPES: { id: string; label: string }[] = [
  { id: 'round', label: 'Round' },
  { id: 'oval', label: 'Oval' },
  { id: 'square', label: 'Square' },
  { id: 'heart', label: 'Heart' },
  { id: 'cat', label: 'Cat' },
  { id: 'dog', label: 'Dog' },
  { id: 'bunny', label: 'Bunny' },
  { id: 'bear', label: 'Bear' },
  { id: 'fox', label: 'Fox' },
  { id: 'panda', label: 'Panda' },
  { id: 'alien', label: 'Alien' },
  { id: 'monster', label: 'Monster' },
  { id: 'dragon', label: 'Dragon' },
  { id: 'unicorn', label: 'Unicorn' },
  { id: 'robot-head', label: 'Robot' },
];

export const SKIN_COLORS: { id: string; color: string; label: string }[] = [
  { id: 'peach', color: '#FFDBAC', label: 'Peach' },
  { id: 'tan', color: '#E0AC69', label: 'Tan' },
  { id: 'brown', color: '#C68642', label: 'Brown' },
  { id: 'dark-brown', color: '#8D5524', label: 'Dark Brown' },
  { id: 'espresso', color: '#5C3A21', label: 'Espresso' },
  { id: 'orange', color: '#FFB347', label: 'Orange' },
  { id: 'yellow', color: '#FFE66D', label: 'Yellow' },
  { id: 'pink', color: '#FFB6C1', label: 'Pink' },
  { id: 'purple', color: '#DDA0DD', label: 'Purple' },
  { id: 'blue', color: '#87CEEB', label: 'Blue' },
  { id: 'green', color: '#98FB98', label: 'Green' },
  { id: 'mint', color: '#AAF0D1', label: 'Mint' },
  { id: 'lavender', color: '#E6E6FA', label: 'Lavender' },
  { id: 'coral', color: '#FF7F7F', label: 'Coral' },
  { id: 'gray', color: '#C0C0C0', label: 'Gray' },
  { id: 'silver', color: '#E8E8E8', label: 'Silver' },
];

export const EYE_SHAPES: { id: string; label: string }[] = [
  { id: 'round', label: 'Round' },
  { id: 'oval', label: 'Oval' },
  { id: 'happy', label: 'Happy' },
  { id: 'sleepy', label: 'Sleepy' },
  { id: 'sparkle', label: 'Sparkle' },
  { id: 'wink', label: 'Wink' },
  { id: 'big', label: 'Big' },
  { id: 'anime', label: 'Anime' },
];

export const EYE_COLORS: { id: string; color: string; label: string }[] = [
  { id: 'blue', color: '#4A90D9', label: 'Blue' },
  { id: 'brown', color: '#8B4513', label: 'Brown' },
  { id: 'green', color: '#228B22', label: 'Green' },
  { id: 'hazel', color: '#A0785A', label: 'Hazel' },
  { id: 'gray', color: '#708090', label: 'Gray' },
  { id: 'purple', color: '#9370DB', label: 'Purple' },
  { id: 'pink', color: '#FF69B4', label: 'Pink' },
  { id: 'gold', color: '#FFD700', label: 'Gold' },
  { id: 'red', color: '#DC143C', label: 'Red' },
  { id: 'rainbow', color: '#FF6B6B', label: 'Rainbow' },
];

export const MOUTH_STYLES: { id: string; label: string }[] = [
  { id: 'smile', label: 'Smile' },
  { id: 'grin', label: 'Big Grin' },
  { id: 'small', label: 'Small' },
  { id: 'open', label: 'Open' },
  { id: 'tongue', label: 'Tongue Out' },
  { id: 'cat', label: 'Cat Mouth' },
  { id: 'robot', label: 'Robot' },
];

export const HAIR_STYLES: { id: string; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'short', label: 'Short' },
  { id: 'spiky', label: 'Spiky' },
  { id: 'curly', label: 'Curly' },
  { id: 'long', label: 'Long' },
  { id: 'ponytail', label: 'Ponytail' },
  { id: 'pigtails', label: 'Pigtails' },
  { id: 'buns', label: 'Buns' },
  { id: 'mohawk', label: 'Mohawk' },
  { id: 'afro', label: 'Afro' },
];

export const HAIR_COLORS: { id: string; color: string; label: string }[] = [
  { id: 'black', color: '#1a1a1a', label: 'Black' },
  { id: 'brown', color: '#8B4513', label: 'Brown' },
  { id: 'blonde', color: '#F4D03F', label: 'Blonde' },
  { id: 'red', color: '#CD5C5C', label: 'Red' },
  { id: 'orange', color: '#FF8C00', label: 'Orange' },
  { id: 'pink', color: '#FF69B4', label: 'Pink' },
  { id: 'purple', color: '#9370DB', label: 'Purple' },
  { id: 'blue', color: '#4169E1', label: 'Blue' },
  { id: 'green', color: '#32CD32', label: 'Green' },
  { id: 'rainbow', color: '#FF6B6B', label: 'Rainbow' },
  { id: 'silver', color: '#C0C0C0', label: 'Silver' },
  { id: 'white', color: '#FFFFFF', label: 'White' },
];

export const OUTFITS: { id: string; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'tshirt', label: 'T-Shirt' },
  { id: 'hoodie', label: 'Hoodie' },
  { id: 'dress', label: 'Dress' },
  { id: 'superhero', label: 'Superhero Cape' },
  { id: 'princess', label: 'Princess Gown' },
  { id: 'wizard', label: 'Wizard Robe' },
  { id: 'astronaut', label: 'Space Suit' },
  { id: 'ninja', label: 'Ninja Outfit' },
  { id: 'pirate', label: 'Pirate Vest' },
  { id: 'sports', label: 'Sports Jersey' },
  { id: 'fairy', label: 'Fairy Outfit' },
];

export const OUTFIT_COLORS: { id: string; color: string; label: string }[] = [
  { id: 'red', color: '#E74C3C', label: 'Red' },
  { id: 'blue', color: '#3498DB', label: 'Blue' },
  { id: 'green', color: '#27AE60', label: 'Green' },
  { id: 'purple', color: '#9B59B6', label: 'Purple' },
  { id: 'pink', color: '#FF69B4', label: 'Pink' },
  { id: 'yellow', color: '#F1C40F', label: 'Yellow' },
  { id: 'orange', color: '#E67E22', label: 'Orange' },
  { id: 'black', color: '#2C3E50', label: 'Black' },
  { id: 'white', color: '#ECF0F1', label: 'White' },
  { id: 'gold', color: '#FFD700', label: 'Gold' },
];

export const ACCESSORIES: { id: string; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'glasses', label: 'Glasses' },
  { id: 'sunglasses', label: 'Sunglasses' },
  { id: 'crown', label: 'Crown' },
  { id: 'tiara', label: 'Tiara' },
  { id: 'bow', label: 'Bow' },
  { id: 'hat', label: 'Hat' },
  { id: 'headphones', label: 'Headphones' },
  { id: 'earrings', label: 'Earrings' },
  { id: 'necklace', label: 'Necklace' },
  { id: 'bandana', label: 'Bandana' },
  { id: 'flower', label: 'Flower' },
  { id: 'horns', label: 'Horns' },
  { id: 'halo', label: 'Halo' },
  { id: 'antenna', label: 'Antenna' },
];

export const SPECIAL_FEATURES: { id: string; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'wings-fairy', label: 'Fairy Wings' },
  { id: 'wings-angel', label: 'Angel Wings' },
  { id: 'wings-bat', label: 'Bat Wings' },
  { id: 'wings-butterfly', label: 'Butterfly Wings' },
  { id: 'cat-ears', label: 'Cat Ears' },
  { id: 'bunny-ears', label: 'Bunny Ears' },
  { id: 'dog-ears', label: 'Dog Ears' },
  { id: 'fox-ears', label: 'Fox Ears' },
  { id: 'horns-devil', label: 'Devil Horns' },
  { id: 'horns-unicorn', label: 'Unicorn Horn' },
  { id: 'tail-cat', label: 'Cat Tail' },
  { id: 'tail-fox', label: 'Fox Tail' },
  { id: 'sparkles', label: 'Sparkles' },
  { id: 'glow', label: 'Glowing Aura' },
  { id: 'robot-parts', label: 'Robot Parts' },
];

export const CUSTOMIZATION_CATEGORIES = [
  { id: 'type', label: 'Character', icon: 'user' },
  { id: 'skin', label: 'Color', icon: 'droplet' },
  { id: 'face', label: 'Face', icon: 'eye' },
  { id: 'hair', label: 'Hair', icon: 'scissors' },
  { id: 'outfit', label: 'Outfit', icon: 'shopping-bag' },
  { id: 'accessory', label: 'Accessories', icon: 'gift' },
  { id: 'special', label: 'Special', icon: 'zap' },
];
