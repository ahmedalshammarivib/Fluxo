import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
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
} from '../utils/responsive';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: string;
  icon?: string;
  iconColor?: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  visible,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmColor,
  icon,
  iconColor,
  onConfirm,
  onCancel,
  destructive = false,
}) => {
  const getConfirmColor = () => {
    if (confirmColor) return confirmColor;
    return destructive ? '#ff6b6b' : '#4285f4';
  };

  const getIconName = () => {
    if (icon) return icon as any;
    return destructive ? 'warning-outline' : 'help-circle-outline';
  };

  const getIconColor = () => {
    if (iconColor) return iconColor;
    return destructive ? '#ff6b6b' : '#4285f4';
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <LinearGradient
            colors={['#1a1b3a', '#0a0b1e']}
            style={styles.gradient}
          >
            {/* Icon */}
            <View style={styles.iconContainer}>
              <View style={[styles.iconCircle, { borderColor: getIconColor() }]}>
                <Ionicons 
                  name={getIconName()} 
                  size={responsiveIconSize(32)} 
                  color={getIconColor()} 
                />
              </View>
            </View>

            {/* Content */}
            <View style={styles.content}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.message}>{message}</Text>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <Pressable
                style={[styles.button, styles.cancelButton]}
                onPress={onCancel}
              >
                <Text style={styles.cancelButtonText}>{cancelText}</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.button,
                  styles.confirmButton,
                  { backgroundColor: getConfirmColor() }
                ]}
                onPress={onConfirm}
              >
                <Text style={styles.confirmButtonText}>{confirmText}</Text>
              </Pressable>
            </View>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: responsiveSpacing(20),
  },
  container: {
    width: '100%',
    maxWidth: responsiveWidth(320),
    borderRadius: responsiveBorderRadius(20),
    elevation: 10,
    // FIXED: Replaced deprecated shadow props with modern boxShadow
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.3)',
  },
  gradient: {
    borderRadius: responsiveBorderRadius(20),
    padding: responsiveSpacing(24),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: responsiveSpacing(20),
  },
  iconCircle: {
    width: responsiveWidth(64),
    height: responsiveHeight(64),
    borderRadius: responsiveBorderRadius(32),
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  content: {
    alignItems: 'center',
    marginBottom: responsiveSpacing(24),
  },
  title: {
    fontSize: responsiveFontSize(18),
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: responsiveSpacing(8),
  },
  message: {
    fontSize: responsiveFontSize(14),
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: responsiveFontSize(20),
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    paddingVertical: responsiveSpacing(12),
    borderRadius: responsiveBorderRadius(12),
    alignItems: 'center',
    marginHorizontal: responsiveSpacing(6),
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  confirmButton: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  cancelButtonText: {
    color: '#ffffff',
    fontSize: responsiveFontSize(14),
    fontWeight: '600',
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: responsiveFontSize(14),
    fontWeight: '700',
  },
});