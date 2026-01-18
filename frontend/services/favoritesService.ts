/**
 * FAVORITES SERVICE (Frontend Placeholder)
 * 
 * Current state: Local-only (AsyncStorage) + mock data for UI testing
 * Goal: Replace with real backend API calls once endpoints are ready
 * 
 * Backend endpoints needed (suggest these routes):
 * 
 * POST /favorites/affirmations/:affirmationId
 *   - Toggles favorite for current child
 *   - Body: none (or { childId } if needed)
 *   - Response: { action: "favorited" | "unfavorited", affirmationId: string }
 * 
 * GET /favorites/affirmations
 *   - Returns list of favorited affirmations for current child
 *   - Response: [{ id: string, text: string, gradient?: [string, string], ... }]
 * 
 * Auth: Use existing Keycloak/JWT interceptor (api instance should already have token)
 * Child context: Use childId from ChildContext (already available in screens)
 * 
 * Replacement steps:
 * 1. Remove AsyncStorage from getFavorites / toggleFavorite
 * 2. Replace with api.post(...) / api.get(...)
 * 3. Update getFavoriteAffirmations to just return api.get result
 * 
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const FAVORITES_KEY = '@MyBuddy:favoriteAffirmations';

// Load favorite IDs
export const getFavorites = async (): Promise<string[]> => {
  try {
    const json = await AsyncStorage.getItem(FAVORITES_KEY);
    return json ? JSON.parse(json) : [];
  } catch (e) {
    console.error('Failed to load favorites (placeholder)', e);
    return [];
  }
};

// Toggle favorite and return updated list
export const toggleFavorite = async (
  affirmationId: string,
  currentFavorites: string[]
): Promise<string[]> => {
  const updated = currentFavorites.includes(affirmationId)
    ? currentFavorites.filter(id => id !== affirmationId)
    : [...currentFavorites, affirmationId];

  try {
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save favorites (placeholder)', e);
  }

  return updated;
};

// Get full affirmation objects for Profile (mock data for testing)
export const getFavoriteAffirmations = async (): Promise<
  Array<{ id: string; text: string }>
> => {
  // Mock some data so Profile shows something — replace with real fetch later
  return [
    { id: 'mock1', text: 'I am strong and capable.' },
    { id: 'mock2', text: 'Every day is a new adventure.' },
    { id: 'mock3', text: 'I believe in myself.' },
  ];
};