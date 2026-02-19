/**
 * Tabs Page Theme Configuration
 * Provides theming for Normal Mode (blue/dark) and Privacy Mode (gray)
 * Night Mode affects Normal Mode colors
 */

import { colors } from '@/theme/colors';
import { TabsViewMode } from '@/types/simpleTabs';

// Theme interface for tabs page
export interface TabsPageTheme {
  gradientColors: [string, string];
  accentColor: string;
  cardBackground: string;
  cardBorder: string;
  activeCardBorder: string;
  textPrimary: string;
  textSecondary: string;
  emptyStateIcon: string;
  bottomBarBackground: string;
  buttonBackground: string;
  addButtonBackground: string;
}

// Normal Mode Theme (BLUE) - Light theme
export const normalTheme: TabsPageTheme = {
  gradientColors: ['#f5f7fa', '#e8ecf1'],  // Light blue-gray gradient for normal mode
  accentColor: colors.primary,              // #4285f4
  cardBackground: '#ffffff',                // White card background
  cardBorder: 'rgba(66, 133, 244, 0.3)',   // Blue border
  activeCardBorder: colors.primary,         // Active = solid blue
  textPrimary: '#1a1a2e',                  // Dark text
  textSecondary: 'rgba(26, 26, 46, 0.6)',  // Secondary dark text
  emptyStateIcon: 'rgba(66, 133, 244, 0.3)',
  bottomBarBackground: 'rgba(255, 255, 255, 0.95)',
  buttonBackground: 'rgba(66, 133, 244, 0.1)',
  addButtonBackground: '#1a1a2e',           // Dark add button
};

// Normal Mode Theme (DARK) - When Night Mode is enabled
export const normalNightTheme: TabsPageTheme = {
  gradientColors: ['#0d0d0d', '#1a1a1a'],   // Dark gradient for night mode
  accentColor: colors.primary,               // #4285f4 - Keep blue accent
  cardBackground: 'rgba(40, 40, 40, 0.8)',   // Dark card background
  cardBorder: 'rgba(66, 133, 244, 0.4)',     // Blue border (slightly more visible)
  activeCardBorder: colors.primary,          // Active = solid blue
  textPrimary: '#ffffff',                    // White text
  textSecondary: 'rgba(255, 255, 255, 0.7)', // Secondary white text
  emptyStateIcon: 'rgba(66, 133, 244, 0.4)',
  bottomBarBackground: 'rgba(20, 20, 20, 0.95)',
  buttonBackground: 'rgba(66, 133, 244, 0.2)',
  addButtonBackground: colors.primary,        // Blue add button
};

// Privacy Mode Theme (GRAY/PURPLE) - Uses darker theme matching reference images
export const privacyTheme: TabsPageTheme = {
  gradientColors: ['#5c5470', '#352f44'],   // Purple-gray gradient matching reference
  accentColor: '#8b7fa3',                    // Muted purple accent
  cardBackground: 'rgba(100, 100, 100, 0.15)',
  cardBorder: 'rgba(100, 100, 100, 0.3)',
  activeCardBorder: '#8b7fa3',
  textPrimary: '#ffffff',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  emptyStateIcon: 'rgba(255, 255, 255, 0.2)',
  bottomBarBackground: 'rgba(53, 47, 68, 0.95)',
  buttonBackground: 'rgba(139, 127, 163, 0.2)',
  addButtonBackground: '#3d3852',            // Dark purple add button
};

/**
 * Get theme based on current tabs view mode and night mode
 * @param mode - Current tabs view mode (normal/privacy)
 * @param nightMode - Whether night mode is enabled
 */
export const getTabsTheme = (mode: TabsViewMode, nightMode: boolean = false): TabsPageTheme => {
  if (mode === 'privacy') {
    return privacyTheme;
  }
  // Normal mode: Use dark theme if night mode is on
  return nightMode ? normalNightTheme : normalTheme;
};

/**
 * Get status bar style based on mode and night mode
 */
export const getStatusBarStyle = (mode: TabsViewMode, nightMode: boolean = false): 'light-content' | 'dark-content' => {
  if (mode === 'privacy' || nightMode) {
    return 'light-content';
  }
  return 'dark-content';
};
