import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  FlatList,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
  ScrollView,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PasswordManager } from '../../utils/passwordManager';
import { SavedPassword } from '../../types/settings';

interface PasswordManagerSettingsProps {
  settings: {
    savePasswords: boolean;
    autoSignIn: boolean;
    biometricAuth: boolean;
  };
  onSettingChange: (key: string, value: boolean) => void;
  onBack: () => void;
}

export const PasswordManagerSettings: React.FC<PasswordManagerSettingsProps> = ({
  settings,
  onSettingChange,
  onBack,
}) => {
  const [passwords, setPasswords] = useState<SavedPassword[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [newPassword, setNewPassword] = useState({
    website: '',
    username: '',
    password: '',
  });

  useEffect(() => {
    loadPasswords();
    checkBiometricAvailability();
  }, []);

  const loadPasswords = async () => {
    try {
      setIsLoading(true);
      const savedPasswords = await PasswordManager.getPasswords();
      const checkedPasswords = await PasswordManager.checkPasswordSecurity(savedPasswords);
      setPasswords(checkedPasswords);
    } catch (error) {
      Alert.alert('Error', 'Failed to load passwords');
    } finally {
      setIsLoading(false);
    }
  };

  const checkBiometricAvailability = async () => {
    const available = await PasswordManager.isBiometricAvailable();
    setBiometricAvailable(available);
  };

  const handleAddPassword = async () => {
    if (!newPassword.website || !newPassword.username || !newPassword.password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      await PasswordManager.savePassword(newPassword);
      setNewPassword({ website: '', username: '', password: '' });
      setShowAddModal(false);
      loadPasswords();
      Alert.alert('Success', 'Password saved successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to save password');
    }
  };

  const handleDeletePassword = (password: SavedPassword) => {
    Alert.alert(
      'Delete Password',
      `Delete password for ${password.website}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await PasswordManager.deletePassword(password.id);
              loadPasswords();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete password');
            }
          },
        },
      ]
    );
  };

  const runSecurityAudit = async () => {
    setIsLoading(true);
    try {
      const checkedPasswords = await PasswordManager.checkPasswordSecurity(passwords);
      setPasswords(checkedPasswords);
      
      const compromised = checkedPasswords.filter(p => p.isCompromised);
      if (compromised.length > 0) {
        Alert.alert(
          'Security Alert',
          `Found ${compromised.length} compromised password(s). Please update them immediately.`
        );
      } else {
        Alert.alert('Security Check', 'All passwords are secure!');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to run security audit');
    } finally {
      setIsLoading(false);
    }
  };

  const generatePassword = () => {
    const generated = PasswordManager.generateStrongPassword();
    setNewPassword(prev => ({ ...prev, password: generated }));
  };

  const renderPasswordItem = ({ item }: { item: SavedPassword }) => (
    <View style={[styles.passwordItem, item.isCompromised && styles.compromisedItem]}>
      <View style={styles.passwordIcon}>
        <Ionicons 
          name={item.isCompromised ? "warning" : "key"} 
          size={20} 
          color={item.isCompromised ? "#ff4444" : "#4285f4"} 
        />
      </View>
      <View style={styles.passwordInfo}>
        <Text style={styles.passwordWebsite}>{item.website}</Text>
        <Text style={styles.passwordUsername}>{item.username}</Text>
        {item.isCompromised && (
          <Text style={styles.compromisedText}>⚠️ Compromised</Text>
        )}
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeletePassword(item)}
      >
        <Ionicons name="trash-outline" size={20} color="#ff4444" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Password Manager</Text>
        <TouchableOpacity onPress={runSecurityAudit} style={styles.auditButton}>
          <Ionicons name="shield-checkmark" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Settings */}
        <View style={styles.settingsSection}>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Save passwords</Text>
              <Text style={styles.settingSubtitle}>Automatically save passwords when signing in</Text>
            </View>
            <Switch
              value={settings.savePasswords}
              onValueChange={(value) => onSettingChange('savePasswords', value)}
              trackColor={{ false: '#333', true: '#4CAF50' }}
              thumbColor={settings.savePasswords ? '#ffffff' : '#666'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Auto Sign-in</Text>
              <Text style={styles.settingSubtitle}>
                Automatically sign in to websites using stored credentials
              </Text>
            </View>
            <Switch
              value={settings.autoSignIn}
              onValueChange={(value) => onSettingChange('autoSignIn', value)}
              trackColor={{ false: '#333', true: '#4CAF50' }}
              thumbColor={settings.autoSignIn ? '#ffffff' : '#666'}
            />
          </View>

          {biometricAvailable && (
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Biometric Authentication</Text>
                <Text style={styles.settingSubtitle}>Use fingerprint or face unlock</Text>
              </View>
              <Switch
                value={settings.biometricAuth}
                onValueChange={(value) => onSettingChange('biometricAuth', value)}
                trackColor={{ false: '#333', true: '#4CAF50' }}
                thumbColor={settings.biometricAuth ? '#ffffff' : '#666'}
              />
            </View>
          )}

          <TouchableOpacity style={styles.auditItem} onPress={runSecurityAudit}>
            <View style={styles.auditIcon}>
              <Ionicons name="shield-checkmark-outline" size={24} color="#4CAF50" />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Security Audit</Text>
              <Text style={styles.settingSubtitle}>Check for compromised passwords</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#888" />
          </TouchableOpacity>
        </View>

        {/* Add Password Button */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add" size={24} color="#ffffff" />
          <Text style={styles.addButtonText}>Add Password</Text>
        </TouchableOpacity>

        {/* Passwords List */}
        <View style={styles.passwordsSection}>
          <Text style={styles.sectionTitle}>Saved Passwords ({passwords.length})</Text>
          
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4285f4" />
            </View>
          ) : passwords.length > 0 ? (
            <FlatList
              data={passwords}
              renderItem={renderPasswordItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="key-outline" size={48} color="#666" />
              <Text style={styles.emptyText}>No saved passwords</Text>
              <Text style={styles.emptySubtext}>Your saved passwords will appear here</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add Password Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Password</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <TextInput
                style={styles.modalInput}
                value={newPassword.website}
                onChangeText={(text) => setNewPassword(prev => ({ ...prev, website: text }))}
                placeholder="Website (e.g., facebook.com)"
                placeholderTextColor="#888"
                autoCapitalize="none"
              />

              <TextInput
                style={styles.modalInput}
                value={newPassword.username}
                onChangeText={(text) => setNewPassword(prev => ({ ...prev, username: text }))}
                placeholder="Username or Email"
                placeholderTextColor="#888"
                autoCapitalize="none"
              />

              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={[styles.modalInput, { flex: 1, marginRight: 12 }]}
                  value={newPassword.password}
                  onChangeText={(text) => setNewPassword(prev => ({ ...prev, password: text }))}
                  placeholder="Password"
                  placeholderTextColor="#888"
                  secureTextEntry
                />
                <TouchableOpacity
                  style={styles.generateButton}
                  onPress={generatePassword}
                >
                  <Ionicons name="refresh" size={20} color="#4285f4" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleAddPassword}
              >
                <Text style={styles.saveButtonText}>Save Password</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0b1e',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    // Add paddingTop for Android status bar
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 10 : 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
  },
  auditButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  settingsSection: {
    padding: 20,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  auditItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  auditIcon: {
    marginRight: 16,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  settingSubtitle: {
    fontSize: 12,
    color: '#888',
    lineHeight: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4285f4',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  passwordsSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  passwordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  compromisedItem: {
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderColor: 'rgba(255, 68, 68, 0.3)',
  },
  passwordIcon: {
    marginRight: 16,
  },
  passwordInfo: {
    flex: 1,
  },
  passwordWebsite: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  passwordUsername: {
    fontSize: 14,
    color: '#888',
  },
  compromisedText: {
    fontSize: 12,
    color: '#ff4444',
    fontWeight: '600',
    marginTop: 4,
  },
  deleteButton: {
    padding: 8,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#1a1b3a',
    borderRadius: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  modalContent: {
    padding: 20,
  },
  modalInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    color: '#ffffff',
    fontSize: 16,
    marginBottom: 16,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  generateButton: {
    backgroundColor: 'rgba(66, 133, 244, 0.2)',
    borderRadius: 8,
    padding: 12,
  },
  saveButton: {
    backgroundColor: '#4285f4',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});