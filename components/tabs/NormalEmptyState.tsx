/**
 * NormalEmptyState Component
 * Empty state for Normal Mode when no tabs are open
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TabsPageTheme } from './tabsTheme';
import {
  responsiveSpacing,
  responsiveFontSize,
  responsiveIconSize,
} from '@/utils/responsive';
import { useTranslation } from 'react-i18next';

interface NormalEmptyStateProps {
  theme: TabsPageTheme;
}

export const NormalEmptyState: React.FC<NormalEmptyStateProps> = ({
  theme,
}) => {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      {/* Browser Icon */}
      <View style={styles.iconContainer}>
        <Ionicons 
          name="browsers-outline" 
          size={responsiveIconSize(80)} 
          color={theme.emptyStateIcon} 
        />
      </View>

      {/* Title */}
      <Text style={[styles.title, { color: theme.textPrimary }]}>
        {t('noTabs', 'No open tabs')}
      </Text>

      {/* Description */}
      <Text style={[styles.description, { color: theme.textSecondary }]}>
        {t('pressAddTab', 'Press the + button to open a new tab\nand start browsing')}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: responsiveSpacing(40),
    paddingBottom: responsiveSpacing(80), // Account for bottom bar
  },
  iconContainer: {
    marginBottom: responsiveSpacing(24),
  },
  title: {
    fontSize: responsiveFontSize(22),
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: responsiveSpacing(12),
  },
  description: {
    fontSize: responsiveFontSize(14),
    textAlign: 'center',
    lineHeight: responsiveFontSize(20),
  },
});

export default NormalEmptyState;
