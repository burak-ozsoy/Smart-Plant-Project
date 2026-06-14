export const DARK_COLORS = {
  background: '#000000',
  cardBackground: 'rgba(44, 44, 46, 0.35)',
  cardBorder: 'rgba(255, 255, 255, 0.15)',
  primary: '#34C759',
  secondary: '#0A84FF',
  warning: '#FFD60A',
  danger: '#FF453A',
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(235, 235, 245, 0.6)',
  tabBarBackground: '#1C1C1E',
  tabBarActive: '#FFFFFF',
  tabBarInactive: '#8E8E93',
};

export const LIGHT_COLORS = {
  background: '#F2F2F7', // iOS Light Gray Background
  cardBackground: 'rgba(255, 255, 255, 0.7)', // Light glass
  cardBorder: 'rgba(0, 0, 0, 0.1)',
  primary: '#34C759', // same accents usually work well
  secondary: '#007AFF', // slightly darker blue for light mode
  warning: '#FF9F0A', // darker yellow/orange for contrast
  danger: '#FF3B30',
  textPrimary: '#000000',
  textSecondary: 'rgba(60, 60, 67, 0.6)',
  tabBarBackground: '#FFFFFF',
  tabBarActive: '#000000',
  tabBarInactive: '#8E8E93',
};

// Fallback for files not yet refactored (optional, but good practice while migrating)
export const COLORS = DARK_COLORS;

export const SIZES = {
  padding: 20,
  radius: 20,
  cardRadius: 24,
  fontLarge: 34,
  fontMedium: 22,
  fontSmall: 15,
};
