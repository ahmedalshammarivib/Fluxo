/**
 * PrivacyEmptyState Component
 * Ghost icon empty state for Privacy Mode
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

interface PrivacyEmptyStateProps {
  theme: TabsPageTheme;
}

// Custom Ghost Icon component to match reference image
const GhostIcon: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    {/* Using a combination of Ionicons to create ghost-like appearance */}
    <Ionicons name="eye-off-outline" size={size} color={color} />
  </View>
);

export const PrivacyEmptyState: React.FC<PrivacyEmptyStateProps> = ({
  theme,
}) => {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      {/* Ghost Icon */}
      <View style={styles.iconContainer}>
        <GhostIcon 
          size={responsiveIconSize(100)} 
          color={theme.emptyStateIcon} 
        />
      </View>

      {/* Title */}
      <Text style={[styles.title, { color: theme.textPrimary }]}>
        {t('yourSecretIsSafe', 'Your secret is safe')}
      </Text>

      {/* Description */}
      <Text style={[styles.description, { color: theme.textSecondary }]}>
        {t('privacyModeDescription', 'Aura Browser will not keep\nyour browsing history, please\nclick the + button to open\nyour private webpage.')}
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
    marginBottom: responsiveSpacing(32),
  },
  title: {
    fontSize: responsiveFontSize(24),
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: responsiveSpacing(16),
  },
  description: {
    fontSize: responsiveFontSize(15),
    textAlign: 'center',
    lineHeight: responsiveFontSize(22),
  },
});

export default PrivacyEmptyState;
