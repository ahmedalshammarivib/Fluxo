/**
 * TabModeSwitch Component
 * Animated mode switcher between Normal and Privacy modes
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { TabsViewMode } from '@/types/simpleTabs';
import { TabsPageTheme } from './tabsTheme';
import {
  responsiveSpacing,
  responsiveFontSize,
} from '@/utils/responsive';
import { useTranslation } from 'react-i18next';

interface TabModeSwitchProps {
  currentMode: TabsViewMode;
  onModeChange: (mode: TabsViewMode) => void;
  normalTabCount: number;
  privacyTabCount: number;
  theme: TabsPageTheme;
}

export const TabModeSwitch: React.FC<TabModeSwitchProps> = ({
  currentMode,
  onModeChange,
  normalTabCount,
  privacyTabCount,
  theme,
}) => {
  const { t } = useTranslation();
  const { width: screenWidth } = useWindowDimensions();
  const switchWidth = screenWidth - responsiveSpacing(32);
  const halfWidth = switchWidth / 2;

  // Animated underline position
  const underlinePosition = useSharedValue(currentMode === 'normal' ? 0 : 1);

  useEffect(() => {
    underlinePosition.value = withTiming(
      currentMode === 'normal' ? 0 : 1,
      { duration: 250, easing: Easing.inOut(Easing.ease) }
    );
  }, [currentMode]);

  // Animated style for underline
  const underlineStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: underlinePosition.value * halfWidth,
      },
    ],
    width: halfWidth,
  }));

  // Get underline color based on mode
  const underlineColor = currentMode === 'privacy' ? '#8b7fa3' : '#1a1a2e';

  return (
    <View style={styles.container}>
      {/* Mode Buttons */}
      <View style={styles.buttonsContainer}>
        {/* Normal Mode Button */}
        <TouchableOpacity
          style={[styles.modeButton, { width: halfWidth }]}
          onPress={() => onModeChange('normal')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.modeText,
              { 
                color: currentMode === 'normal' 
                  ? theme.textPrimary 
                  : theme.textSecondary,
                fontWeight: currentMode === 'normal' ? '700' : '500',
              },
            ]}
          >
            {t('normalMode', 'NORMAL MODE')}
          </Text>
        </TouchableOpacity>

        {/* Privacy Mode Button */}
        <TouchableOpacity
          style={[styles.modeButton, { width: halfWidth }]}
          onPress={() => onModeChange('privacy')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.modeText,
              { 
                color: currentMode === 'privacy' 
                  ? theme.textPrimary 
                  : theme.textSecondary,
                fontWeight: currentMode === 'privacy' ? '700' : '500',
              },
            ]}
          >
            {t('privacyMode', 'PRIVACY MODE')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Animated Underline */}
      <View style={styles.underlineContainer}>
        <Animated.View
          style={[
            styles.underline,
            underlineStyle,
            { backgroundColor: underlineColor },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: responsiveSpacing(16),
    marginTop: responsiveSpacing(8),
    marginBottom: responsiveSpacing(16),
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modeButton: {
    paddingVertical: responsiveSpacing(12),
    alignItems: 'center',
  },
  modeText: {
    fontSize: responsiveFontSize(14),
    letterSpacing: 0.5,
  },
  underlineContainer: {
    height: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  underline: {
    height: '100%',
    borderRadius: 1.5,
  },
});

export default TabModeSwitch;
