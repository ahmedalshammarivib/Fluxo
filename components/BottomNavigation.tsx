import React from 'react';
import { View, TouchableOpacity, StyleSheet, Animated, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  responsiveSpacing,
  responsiveIconSize,
  responsiveWidth,
  responsiveHeight,
  isSmallScreen
} from '../utils/responsive';

interface BottomNavigationProps {
  canGoBack: boolean;
  canGoForward: boolean;
  onBack: () => void;
  onForward: () => void;
  onHome: () => void;
  onTabs: () => void;
  onMenu: () => void;
  onFind?: () => void;
  isHomePage: boolean;
  nightMode?: boolean;
  incognitoMode?: boolean;
  isMenuModalOpen?: boolean;
  hidden?: boolean;
  animatedBackgroundColor?: Animated.AnimatedInterpolation<string | number> | string;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  canGoBack,
  canGoForward,
  onBack,
  onForward,
  onHome,
  onTabs,
  onMenu,
  onFind,
  isHomePage,
  nightMode = false,
  incognitoMode = false,
  isMenuModalOpen = false,
  hidden = false,
  animatedBackgroundColor,
}) => {
  if (hidden) {
    return null;
  }

  const backgroundColor = nightMode
    ? '#000000'
    : incognitoMode
      ? '#1a1a1a'
      : 'rgba(26, 27, 58, 0.95)';

  const isBrowsingMode = !nightMode && !incognitoMode && !isHomePage;

  const containerStyle = isMenuModalOpen
    ? { backgroundColor: 'transparent', borderTopWidth: 0, elevation: 0, shadowOpacity: 0 }
    : { backgroundColor: animatedBackgroundColor || backgroundColor };

  const iconColor = isBrowsingMode ? '#1a1b3a' : '#ffffff';
  const buttonBackground = isBrowsingMode ? 'rgba(26, 27, 58, 0.08)' : 'rgba(255, 255, 255, 0.1)';
  const disabledButtonBackground = isBrowsingMode ? 'rgba(26, 27, 58, 0.04)' : 'rgba(255, 255, 255, 0.05)';
  const activeButtonBackground = isBrowsingMode ? 'rgba(66, 133, 244, 0.15)' : 'rgba(66, 133, 244, 0.2)';
  const borderTopColor = isBrowsingMode ? 'rgba(26, 27, 58, 0.1)' : 'rgba(255, 255, 255, 0.05)';

  if (isMenuModalOpen) {
    return <Animated.View style={[styles.container, containerStyle]} />;
  }

  return (
    <Animated.View
      style={[styles.container, containerStyle, { borderTopColor }]}
      pointerEvents={isMenuModalOpen ? 'none' : 'auto'}
    >
      <TouchableOpacity
        style={[styles.navButton, !canGoBack && !isHomePage && styles.disabledButton, { backgroundColor: !canGoBack && !isHomePage ? disabledButtonBackground : buttonBackground }]}
        onPress={onBack}
        disabled={!canGoBack && !isHomePage}
        accessibilityLabel="Go back"
        accessibilityHint="Navigate to the previous page"
        accessibilityRole="button"
      >
        <Ionicons
          name="chevron-back"
          size={responsiveIconSize(24)}
          color={canGoBack || isHomePage ? iconColor : '#666'}
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.navButton, !canGoForward && styles.disabledButton, { backgroundColor: !canGoForward ? disabledButtonBackground : buttonBackground }]}
        onPress={onForward}
        disabled={!canGoForward}
        accessibilityLabel="Go forward"
        accessibilityHint="Navigate to the next page"
        accessibilityRole="button"
      >
        <Ionicons
          name="chevron-forward"
          size={responsiveIconSize(24)}
          color={canGoForward ? iconColor : '#666'}
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.navButton, isHomePage && styles.activeButton, { backgroundColor: isHomePage ? activeButtonBackground : buttonBackground }]}
        onPress={onHome}
        accessibilityLabel="Home"
        accessibilityHint="Navigate to home page"
        accessibilityRole="button"
        accessibilityState={{ selected: isHomePage }}
      >
        <Ionicons
          name="home"
          size={responsiveIconSize(24)}
          color={isHomePage ? '#4285f4' : iconColor}
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.navButton, { backgroundColor: buttonBackground }]}
        onPress={onTabs}
        accessibilityLabel="Tabs"
        accessibilityHint="View and manage browser tabs"
        accessibilityRole="button"
      >
        <Ionicons name="copy-outline" size={responsiveIconSize(24)} color={iconColor} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.navButton, { backgroundColor: buttonBackground }]}
        onPress={onMenu}
        accessibilityLabel="Menu"
        accessibilityHint="Open browser menu with additional options"
        accessibilityRole="button"
      >
        <Ionicons name="menu" size={responsiveIconSize(24)} color={iconColor} />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: 'rgba(26, 27, 58, 0.95)',
    paddingVertical: responsiveSpacing(isSmallScreen() ? 8 : 12),
    paddingHorizontal: responsiveSpacing(isSmallScreen() ? 10 : 16),
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: responsiveHeight(isSmallScreen() ? 58 : 64),
  },
  navButton: {
    width: responsiveWidth(isSmallScreen() ? 38 : 44),
    height: responsiveWidth(isSmallScreen() ? 38 : 44),
    borderRadius: responsiveWidth(isSmallScreen() ? 19 : 22),
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: responsiveSpacing(2),
  },
  disabledButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  activeButton: {
    backgroundColor: 'rgba(66, 133, 244, 0.2)',
  },
});