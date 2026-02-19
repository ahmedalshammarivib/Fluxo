/**
 * InfoSection Component
 * 
 * Informational card explaining ad blocking benefits
 * Features:
 * - Clean informational design
 * - Info icon
 * - Theme-aware styling
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { InfoSectionProps } from '../../types/adBlocker';
import {
  responsiveSpacing,
  responsiveFontSize,
  responsiveBorderRadius,
} from '../../utils/responsive';

export const InfoSection: React.FC<InfoSectionProps> = ({
  title = 'Why use ad blocking?',
  description = 'After blocking ads, web pages load faster, consume less data, and provide a cleaner reading experience free from distractions.',
  nightMode = false,
}) => {
  return (
    <View
      style={[
        styles.container,
        nightMode && styles.containerDark,
      ]}
    >
      {/* Header with icon */}
      <View style={styles.header}>
        <LinearGradient
          colors={nightMode ? ['#0EA5E9', '#2563EB'] : ['#60A5FA', '#3B82F6']}
          style={styles.iconGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons
            name="information-circle"
            size={24}
            color="#FFFFFF"
          />
        </LinearGradient>
        <Text
          style={[
            styles.title,
            nightMode && styles.titleDark,
          ]}
        >
          {title}
        </Text>
      </View>
      
      {/* Description */}
      <Text
        style={[
          styles.description,
          nightMode && styles.descriptionDark,
        ]}
      >
        {description}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: responsiveBorderRadius(24),
    padding: responsiveSpacing(20),
    marginHorizontal: 0,
    marginBottom: responsiveSpacing(24),
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.12,
        shadowRadius: 20,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  containerDark: {
    backgroundColor: '#1E293B',
    borderColor: 'rgba(255,255,255,0.08)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: responsiveSpacing(16),
  },
  iconGradient: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: responsiveSpacing(16),
    ...Platform.select({
      ios: {
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  title: {
    fontSize: responsiveFontSize(18),
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
    letterSpacing: -0.4,
  },
  titleDark: {
    color: '#F8FAFC',
  },
  description: {
    fontSize: responsiveFontSize(15),
    color: '#64748B',
    lineHeight: responsiveFontSize(24),
    fontWeight: '500',
    opacity: 0.9,
  },
  descriptionDark: {
    color: '#94A3B8',
  },
});

export default InfoSection;
