/**
 * TabsBottomBar Component
 * Themed bottom action bar with Close All, Add, and Done buttons
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TabsPageTheme } from './tabsTheme';
import {
  responsiveSpacing,
  responsiveFontSize,
  responsiveIconSize,
  responsiveBorderRadius,
  responsiveWidth,
  responsiveHeight,
} from '@/utils/responsive';
import { useTranslation } from 'react-i18next';

interface TabsBottomBarProps {
  onCloseAll: () => void;
  onAddTab: () => void;
  onDone: () => void;
  theme: TabsPageTheme;
  tabCount: number;
  isPrivacyMode: boolean;
}

export const TabsBottomBar: React.FC<TabsBottomBarProps> = ({
  onCloseAll,
  onAddTab,
  onDone,
  theme,
  tabCount,
  isPrivacyMode,
}) => {
  const { t } = useTranslation();

  return (
    <View style={[
      styles.container, 
      { backgroundColor: theme.bottomBarBackground }
    ]}>
      {/* Close All Button */}
      <TouchableOpacity
        style={styles.sideButton}
        onPress={onCloseAll}
        activeOpacity={0.7}
        disabled={tabCount === 0}
      >
        <Text
          style={[
            styles.sideButtonText,
            { 
              color: tabCount === 0 
                ? 'rgba(128, 128, 128, 0.5)' 
                : theme.textPrimary,
            },
          ]}
        >
          {t('closeAll', 'Close All')}
        </Text>
      </TouchableOpacity>

      {/* Add Button (Center, Elevated) */}
      <TouchableOpacity
        style={[
          styles.addButton,
          { backgroundColor: theme.addButtonBackground },
        ]}
        onPress={onAddTab}
        activeOpacity={0.8}
      >
        <Ionicons
          name="add"
          size={responsiveIconSize(28)}
          color="#ffffff"
        />
      </TouchableOpacity>

      {/* Done Button */}
      <TouchableOpacity
        style={styles.sideButton}
        onPress={onDone}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.sideButtonText,
            { color: theme.textPrimary },
          ]}
        >
          {t('done', 'Done')}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: responsiveSpacing(24),
    paddingVertical: responsiveSpacing(16),
    paddingBottom: responsiveSpacing(24),
    borderTopLeftRadius: responsiveBorderRadius(20),
    borderTopRightRadius: responsiveBorderRadius(20),
  },
  sideButton: {
    paddingVertical: responsiveSpacing(8),
    paddingHorizontal: responsiveSpacing(4),
    minWidth: 80,
  },
  sideButtonText: {
    fontSize: responsiveFontSize(16),
    fontWeight: '500',
  },
  addButton: {
    width: responsiveWidth(56),
    height: responsiveHeight(56),
    borderRadius: responsiveBorderRadius(28),
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default TabsBottomBar;
