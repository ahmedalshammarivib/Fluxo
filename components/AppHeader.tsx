import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
  responsiveSpacing,
  responsiveFontSize,
  responsiveIconSize,
  responsiveWidth,
  responsiveHeight,
  responsiveBorderRadius,
  isSmallScreen,
} from '../utils/responsive';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

interface AppHeaderProps {
  title?: string;
  showUrlBar?: boolean;
  url?: string;
  onUrlChange?: (url: string) => void;
  onUrlSubmit?: () => void;
  isLoading?: boolean;
  canGoBack?: boolean;
  canGoForward?: boolean;
  onBack?: () => void;
  onForward?: () => void;
  onReload?: () => void;
  isUrlFocused?: boolean;
  onUrlFocus?: () => void;
  onUrlBlur?: () => void;
  incognitoMode?: boolean;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title = 'Fluxo Browser',
  showUrlBar = false,
  url = '',
  onUrlChange,
  onUrlSubmit,
  isLoading = false,
  canGoBack = false,
  canGoForward = false,
  onBack,
  onForward,
  onReload,
  isUrlFocused = false,
  onUrlFocus,
  onUrlBlur,
  incognitoMode = false,
}) => {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  
  if (showUrlBar) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={incognitoMode ? ['#2c2c2c', '#1a1a1a'] : ['rgba(26, 27, 58, 0.95)', 'rgba(10, 11, 30, 0.95)']}
          style={styles.gradient}
        >
          {/* Navigation Buttons */}
          <View style={styles.navButtons}>
            <TouchableOpacity
              style={[styles.navButton, !canGoBack && styles.navButtonDisabled]}
              onPress={onBack}
              disabled={!canGoBack}
            >
              <Ionicons
                name="chevron-back"
                size={responsiveIconSize(20)}
                color={canGoBack ? colors.text.primary : colors.text.disabled}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.navButton, !canGoForward && styles.navButtonDisabled]}
              onPress={onForward}
              disabled={!canGoForward}
            >
              <Ionicons
                name="chevron-forward"
                size={responsiveIconSize(20)}
                color={canGoForward ? colors.text.primary : colors.text.disabled}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navButton}
              onPress={onReload}
            >
              <Ionicons
                name="refresh"
                size={responsiveIconSize(20)}
                color={colors.text.primary}
              />
            </TouchableOpacity>
          </View>

          {/* URL Bar */}
          <View style={[styles.urlContainer, isTablet && styles.urlContainerTablet]}>
            <View style={[styles.urlBar, isUrlFocused && styles.urlBarFocused, isTablet && styles.urlBarTablet]}>
              <Ionicons
                name={url.startsWith('https') ? 'lock-closed' : 'globe-outline'}
                size={responsiveIconSize(16)}
                color={url.startsWith('https') ? colors.success : colors.text.tertiary}
              />
              <TextInput
                style={styles.urlInput}
                value={url}
                onChangeText={onUrlChange}
                onSubmitEditing={onUrlSubmit}
                onFocus={onUrlFocus}
                onBlur={onUrlBlur}
                placeholder="Search Google or type a URL"
                placeholderTextColor={colors.text.placeholder}
                autoCapitalize="none"
                autoCorrect={false}
                selectTextOnFocus={true}
                returnKeyType="go"
              />
              {isLoading && (
                <ActivityIndicator size="small" color={colors.primary} />
              )}
            </View>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={incognitoMode ? ['#2c2c2c', '#1a1a1a'] : ['rgba(26, 27, 58, 0.95)', 'rgba(10, 11, 30, 0.95)']}
        style={styles.gradient}
      >
        <TouchableOpacity
          style={styles.topButton}
          onPress={onReload}
        >
          <Ionicons
            name="refresh-outline"
            size={responsiveIconSize(24)}
            color={colors.text.primary}
          />
        </TouchableOpacity>

        <View style={styles.logoContainer}>
          <Text style={[styles.logoText, incognitoMode && styles.incognitoText]}>
            {title}
          </Text>
          {incognitoMode && (
            <Text style={styles.incognitoLabel}>Incognito</Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.topButton}
        >
          <Ionicons name="add" size={responsiveIconSize(24)} color={colors.text.primary} />
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.header.paddingTop,
    minHeight: responsiveHeight(isSmallScreen() ? 80 : 90),
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.layout.screenPadding,
    paddingVertical: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border.primary,
    minHeight: responsiveHeight(isSmallScreen() ? 80 : 90),
  },
  navButtons: {
    flexDirection: 'row',
    marginRight: spacing.md,
  },
  navButton: {
    width: responsiveWidth(36),
    height: responsiveHeight(36),
    borderRadius: responsiveBorderRadius(18),
    backgroundColor: colors.overlay.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.xs,
  },
  navButtonDisabled: {
    backgroundColor: colors.overlay.dark,
  },
  urlContainer: {
    flex: 1,
    marginHorizontal: spacing.sm,
    maxWidth: '100%',
  },
  urlContainerTablet: {
    marginHorizontal: spacing.md,
  },
  urlBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.overlay.light,
    borderRadius: responsiveBorderRadius(20),
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
  },
  urlBarTablet: {
    borderRadius: responsiveBorderRadius(24),
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: responsiveHeight(48),
  },
  urlBarFocused: {
    borderColor: colors.border.focus,
    backgroundColor: colors.overlay.medium,
  },
  urlInput: {
    flex: 1,
    color: colors.text.primary,
    fontSize: responsiveFontSize(14),
    marginLeft: spacing.sm,
    marginRight: spacing.sm,
  },
  topButton: {
    width: responsiveWidth(isSmallScreen() ? 38 : 44),
    height: responsiveHeight(isSmallScreen() ? 38 : 44),
    borderRadius: responsiveBorderRadius(isSmallScreen() ? 19 : 22),
    backgroundColor: colors.overlay.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: responsiveFontSize(isSmallScreen() ? 20 : 24),
    fontWeight: 'bold',
    color: colors.text.primary,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  incognitoText: {
    color: '#ff6b6b',
  },
  incognitoLabel: {
    fontSize: responsiveFontSize(isSmallScreen() ? 8 : 10),
    color: '#ff6b6b',
    textAlign: 'center',
    marginTop: spacing.xs / 2,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});