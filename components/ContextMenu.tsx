import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  useWindowDimensions,
  Animated,
  Platform,
  Pressable
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import {
  responsiveFontSize,
  responsiveWidth,
} from '../utils/responsive';

interface ContextMenuProps {
  visible: boolean;
  onClose: () => void;
  position: { x: number; y: number };
  menuItems: ContextMenuItem[];
}

export interface ContextMenuItem {
  id: string;
  icon: string;
  title: string;
  onPress: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({
  visible,
  onClose,
  position,
  menuItems,
}) => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.95);
    }
  }, [visible]);

  if (!visible && !menuItems.length) return null;
  if (!visible) return null;

  const menuItemHeight = 48;
  const menuWidth = Math.min(responsiveWidth(280, screenWidth), screenWidth - 32);
  const menuHeight = menuItems.length * menuItemHeight + 16;

  const x = Math.min(
    Math.max(16, position.x),
    screenWidth - menuWidth - 16
  );
  
  const y = Math.min(
    Math.max(40, position.y),
    screenHeight - menuHeight - 40
  );

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        {Platform.OS === 'ios' ? (
          <BlurView 
            intensity={20} 
            tint="systemUltraThinMaterialDark" 
            style={StyleSheet.absoluteFill} 
          />
        ) : (
          <View style={styles.androidOverlay} />
        )}

        <Animated.View
          style={[
            styles.menuContainer,
            {
              left: x,
              top: y,
              width: menuWidth,
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {menuItems.map((item, index) => (
            <Pressable
              key={item.id}
              style={({ pressed }) => [
                styles.menuItem,
                pressed && styles.menuItemPressed,
                index === 0 && { borderTopLeftRadius: 14, borderTopRightRadius: 14 },
                index === menuItems.length - 1 && { borderBottomLeftRadius: 14, borderBottomRightRadius: 14, borderBottomWidth: 0 },
              ]}
              onPress={() => {
                onClose();
                item.onPress();
              }}
              accessibilityLabel={item.title}
              accessibilityHint={`Perform ${item.title.toLowerCase()} action`}
              accessibilityRole="menuitem"
            >
              <Ionicons 
                name={item.icon as any} 
                size={22} 
                color="#1a1b3a" 
                style={styles.menuIcon} 
              />
              <Text 
                style={styles.menuText}
                numberOfLines={1}
              >
                {item.title}
              </Text>
            </Pressable>
          ))}
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  androidOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  menuContainer: {
    position: 'absolute',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.04)',
    height: 48,
  },
  menuItemPressed: {
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
  },
  menuIcon: {
    marginRight: 14,
    width: 24,
    textAlign: 'center',
  },
  menuText: {
    color: '#1a1b3a',
    fontSize: responsiveFontSize(15),
    fontWeight: '500',
    letterSpacing: 0.3,
    flex: 1,
  },
});

export default ContextMenu;
