/**
 * WhitelistManager Component
 * 
 * Manages whitelisted domains for the AdBlocker
 * Features:
 * - Search/add input with validation
 * - Animated list of whitelisted domains
 * - Delete functionality with animation
 * - Empty state display
 * - Error handling with user feedback
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeIn,
  FadeOut,
  Layout,
  SlideInRight,
  SlideOutLeft,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { WhitelistManagerProps, WhitelistItem } from '../../types/adBlocker';
import { getThemeColors } from '../../theme/colors';
import { useBrowserStore } from '../../store/browserStore';
import {
  responsiveSpacing,
  responsiveFontSize,
  responsiveHeight,
  responsiveBorderRadius,
  isSmallScreen,
} from '../../utils/responsive';

const isSmallScreenDevice = isSmallScreen();

interface WhitelistItemRowProps {
  item: WhitelistItem;
  onRemove: (id: string) => void;
  nightMode: boolean;
}

/**
 * Individual whitelist item row component
 */
const WhitelistItemRow: React.FC<WhitelistItemRowProps> = ({ item, onRemove, nightMode }) => {
  const scale = useSharedValue(1);
  
  const handlePressIn = () => {
    scale.value = withSpring(0.98);
  };
  
  const handlePressOut = () => {
    scale.value = withSpring(1);
  };
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  
  const handleRemove = () => {
    Alert.alert(
      'Remove Website',
      `Remove ${item.domain} from whitelist?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => onRemove(item.id),
        },
      ]
    );
  };
  
  return (
    <Animated.View
      entering={SlideInRight.springify().damping(15)}
      exiting={SlideOutLeft.duration(200)}
      layout={Layout.springify()}
      style={[
        styles.itemContainer,
        nightMode && styles.itemContainerDark,
      ]}
    >
      <View style={{ flex: 1 }}>
        <Animated.View style={animatedStyle}>
          <TouchableOpacity
            style={styles.itemRow}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            activeOpacity={0.9}
          >
            <View style={styles.itemContent}>
              <LinearGradient
                colors={nightMode ? ['#1E293B', '#334155'] : ['#F1F5F9', '#E2E8F0']}
                style={styles.itemIconGradient}
              >
                <Ionicons
                  name="globe-outline"
                  size={18}
                  color={nightMode ? '#60A5FA' : '#3B82F6'}
                />
              </LinearGradient>
              <Text
                style={[styles.itemDomain, nightMode && styles.itemDomainDark]}
                numberOfLines={1}
              >
                {item.domain}
              </Text>
            </View>
            
            <TouchableOpacity
              style={styles.removeButton}
              onPress={handleRemove}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name="close-circle"
                size={24}
                color={nightMode ? '#FF6B6B' : '#E53935'}
              />
            </TouchableOpacity>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Animated.View>
  );
};

/**
 * Empty state component
 */
const EmptyState: React.FC<{ nightMode: boolean }> = ({ nightMode }) => (
  <Animated.View
    entering={FadeIn.duration(300)}
    style={[styles.emptyState, nightMode && styles.emptyStateDark]}
  >
    <Ionicons
      name="link-outline"
      size={48}
      color={nightMode ? '#555555' : '#CCCCCC'}
    />
    <Text style={[styles.emptyText, nightMode && styles.emptyTextDark]}>
      No websites whitelisted
    </Text>
  </Animated.View>
);

export const WhitelistManager: React.FC<WhitelistManagerProps> = ({
  items,
  onAdd,
  onRemove,
  onClearAll,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  
  const { nightMode, incognitoMode } = useBrowserStore();
  const themeColors = getThemeColors(nightMode, incognitoMode);
  
  // Input animation
  const inputScale = useSharedValue(1);
  const buttonScale = useSharedValue(1);
  
  const inputAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: inputScale.value }],
  }));
  
  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));
  
  /**
   * Handle adding a new domain
   */
  const handleAdd = useCallback(async () => {
    if (!inputValue.trim()) {
      setError('Please enter a domain');
      return;
    }
    
    setIsAdding(true);
    setError(null);
    
    try {
      const result = await onAdd(inputValue.trim());
      
      if (result.isValid) {
        setInputValue('');
        // Success animation
        buttonScale.value = withSpring(1.2, { damping: 10, stiffness: 100 }, () => {
          buttonScale.value = withSpring(1);
        });
      } else {
        setError(result.errorMessage || 'Invalid domain');
        // Error shake animation
        inputScale.value = withSpring(0.95, { damping: 2, stiffness: 150 }, () => {
          inputScale.value = withSpring(1.05, { damping: 2, stiffness: 150 }, () => {
            inputScale.value = withSpring(1);
          });
        });
      }
    } catch (err) {
      setError('Failed to add domain');
    } finally {
      setIsAdding(false);
    }
  }, [inputValue, onAdd]);
  
  /**
   * Handle removing a domain
   */
  const handleRemove = useCallback(async (id: string) => {
    try {
      await onRemove(id);
    } catch (err) {
      Alert.alert('Error', 'Failed to remove domain');
    }
  }, [onRemove]);
  
  /**
   * Handle input focus
   */
  const handleInputFocus = () => {
    inputScale.value = withSpring(1.02);
  };
  
  /**
   * Handle input blur
   */
  const handleInputBlur = () => {
    inputScale.value = withSpring(1);
  };
  
  /**
   * Render whitelist item
   */
  const renderItem = ({ item }: { item: WhitelistItem }) => (
    <WhitelistItemRow
      item={item}
      onRemove={handleRemove}
      nightMode={nightMode}
    />
  );
  
  /**
   * Key extractor for FlatList
   */
  const keyExtractor = (item: WhitelistItem) => item.id;
  
  return (
    <View style={[styles.container, nightMode && styles.containerDark]}>
      {/* Section Header */}
      <View style={styles.header}>
        <Text style={[styles.title, nightMode && styles.titleDark]}>
          Whitelist
        </Text>
        {items.length > 0 && onClearAll && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => {
              Alert.alert(
                'Clear Whitelist',
                'Remove all whitelisted websites?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Clear All',
                    style: 'destructive',
                    onPress: onClearAll,
                  },
                ]
              );
            }}
          >
            <Ionicons
              name="trash-outline"
              size={20}
              color={nightMode ? '#FF6B6B' : '#E53935'}
            />
          </TouchableOpacity>
        )}
      </View>
      
      {/* Description */}
      <Text 
        style={[styles.description, nightMode && styles.descriptionDark]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        Ads won't be blocked on whitelisted websites. Add sites you want to support.
      </Text>
      
      {/* Input Field */}
      <Animated.View style={[styles.inputContainer, inputAnimatedStyle]}>
        <View
          style={[
            styles.inputWrapper,
            nightMode && styles.inputWrapperDark,
            error && styles.inputWrapperError,
          ]}
        >
          <Ionicons
            name="search-outline"
            size={20}
            color={nightMode ? '#888888' : '#999999'}
            style={styles.searchIcon}
          />
          <TextInput
            style={[styles.input, nightMode && styles.inputDark]}
            placeholder="Search or add website..."
            placeholderTextColor={nightMode ? '#666666' : '#AAAAAA'}
            value={inputValue}
            onChangeText={(text) => {
              setInputValue(text);
              setError(null);
            }}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            onSubmitEditing={handleAdd}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            returnKeyType="done"
          />
          <TouchableOpacity
            onPress={handleAdd}
            disabled={isAdding}
            activeOpacity={0.7}
          >
            <Animated.View style={[styles.addButton, buttonAnimatedStyle]}>
              <LinearGradient
                colors={isAdding ? ['#E0E0E0', '#BDBDBD'] : ['#4CAF50', '#81C784']}
                style={styles.addButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons
                  name={isAdding ? "hourglass-outline" : "add"}
                  size={24}
                  color="#FFFFFF"
                />
              </LinearGradient>
            </Animated.View>
          </TouchableOpacity>
        </View>
        
        {/* Error Message */}
        {error && (
          <Animated.Text
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(200)}
            style={styles.errorText}
          >
            {error}
          </Animated.Text>
        )}
      </Animated.View>
      
      {/* Whitelist Items or Empty State */}
      {items.length === 0 ? (
        <EmptyState nightMode={nightMode} />
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          scrollEnabled={false} // Parent ScrollView handles scrolling
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: responsiveBorderRadius(24),
    padding: responsiveSpacing(20),
    marginHorizontal: 0, // Removed margin to match other components' width
    marginBottom: responsiveSpacing(16),
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    // Shadow
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  containerDark: {
    backgroundColor: '#1E293B',
    borderColor: 'rgba(255,255,255,0.08)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: responsiveSpacing(8),
  },
  title: {
    fontSize: responsiveFontSize(16),
    fontWeight: '800',
    color: '#0F172A',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  titleDark: {
    color: '#F8FAFC',
  },
  clearButton: {
    padding: responsiveSpacing(4),
  },
  description: {
    fontSize: responsiveFontSize(12),
    color: '#64748B',
    lineHeight: responsiveFontSize(16),
    marginBottom: responsiveSpacing(16),
    fontWeight: '500',
  },
  descriptionDark: {
    color: '#94A3B8',
  },
  inputContainer: {
    marginBottom: responsiveSpacing(16),
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: responsiveBorderRadius(16),
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: responsiveSpacing(14),
    height: 54,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  inputWrapperDark: {
    backgroundColor: '#334155',
    borderColor: '#475569',
  },
  inputWrapperError: {
    borderColor: '#EF4444',
  },
  searchIcon: {
    marginRight: responsiveSpacing(10),
  },
  input: {
    flex: 1,
    fontSize: responsiveFontSize(15),
    color: '#0F172A',
    fontWeight: '500',
  },
  inputDark: {
    color: '#F8FAFC',
  },
  addButton: {
    marginLeft: responsiveSpacing(8),
  },
  addButtonGradient: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#4CAF50',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  errorText: {
    fontSize: responsiveFontSize(12),
    color: '#EF4444',
    marginTop: responsiveSpacing(6),
    marginLeft: responsiveSpacing(4),
    fontWeight: '600',
  },
  list: {
    maxHeight: responsiveHeight(180), // Reduced height to take less space
  },
  listContent: {
    gap: responsiveSpacing(12),
    paddingBottom: responsiveSpacing(4),
  },
  itemContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: responsiveBorderRadius(16),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    marginBottom: responsiveSpacing(4),
  },
  itemContainerDark: {
    backgroundColor: '#334155',
    borderColor: 'rgba(255,255,255,0.05)',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: responsiveSpacing(12),
    paddingHorizontal: responsiveSpacing(14),
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  itemIconGradient: {
    marginRight: responsiveSpacing(12),
    padding: 6,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemIcon: {
    marginRight: responsiveSpacing(12),
    backgroundColor: 'rgba(0,0,0,0.03)',
    padding: 6,
    borderRadius: 10,
  },
  itemIconDark: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  itemDomain: {
    fontSize: responsiveFontSize(15),
    color: '#1E293B',
    fontWeight: '600',
    flex: 1,
    letterSpacing: -0.3,
  },
  itemDomainDark: {
    color: '#F1F5F9',
  },
  removeButton: {
    padding: responsiveSpacing(4),
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: responsiveSpacing(24),
    backgroundColor: '#F8FAFC',
    borderRadius: responsiveBorderRadius(16),
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  emptyStateDark: {
    backgroundColor: '#33415520',
    borderColor: '#334155',
  },
  emptyText: {
    fontSize: responsiveFontSize(14),
    color: '#64748B',
    marginTop: responsiveSpacing(10),
    fontWeight: '600',
  },
  emptyTextDark: {
    color: '#94A3B8',
  },
});

export default WhitelistManager;
