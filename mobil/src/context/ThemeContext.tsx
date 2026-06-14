import React, { createContext, useState, useCallback, useMemo } from 'react';
import { LayoutAnimation, Platform, UIManager } from 'react-native';
import * as Haptics from 'expo-haptics';

// Enable LayoutAnimation experimental flag on Android for smooth color/layout transitions
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export const ThemeContext = createContext({
  isDark: true,
  toggleTheme: () => {},
});

export const ThemeProvider = ({ children }: any) => {
  const [isDark, setIsDark] = useState(true);

  const toggleTheme = useCallback(() => {
    // Configure next state change to animate smoothly (cross-fade and morph style changes)
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsDark((prev) => !prev);
  }, []);

  const value = useMemo(() => ({
    isDark,
    toggleTheme
  }), [isDark, toggleTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
