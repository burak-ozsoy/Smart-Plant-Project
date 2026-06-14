import { useContext } from 'react';
import { LIGHT_COLORS, DARK_COLORS } from '../constants/theme';
import { ThemeContext } from '../context/ThemeContext';

export function useThemeColors() {
  const { isDark, toggleTheme } = useContext(ThemeContext);
  
  return {
    colors: isDark ? DARK_COLORS : LIGHT_COLORS,
    isDark,
    toggleTheme,
  };
}
