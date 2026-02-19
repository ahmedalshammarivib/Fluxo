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
  ScrollView,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AddressManager } from '../../utils/addressManager';
import { SavedAddress } from '../../types/settings';

interface AddressesSettingsProps {
  saveAndFill: boolean;
  onToggleSaveAndFill: (value: boolean) => void;
  onBack: () => void;
}

export const AddressesSettings: React.FC<AddressesSettingsProps> = ({
  saveAndFill,
  onToggleSaveAndFill,
  onBack,
}) => {
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAddress, setNewAddress] = useState({
    name: '',
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    phone: '',
    email: '',
    isDefault: false,
  });

  useEffect(() => {
    loadAddresses();
  }, []);

  const loadAddresses = async () => {
    try {
      const savedAddresses = await AddressManager.getAddresses();
      setAddresses(savedAddresses);
    } catch (error) {
      Alert.alert('Error', 'Failed to load addresses');
    }
  };

  const handleAddAddress = async () => {
    const validation = AddressManager.validateAddress(newAddress);
    
    if (!validation.isValid) {
      Alert.alert('Validation Error', validation.errors.join('\n'));
      return;
    }

    try {
      await AddressManager.saveAddress(newAddress);
      setNewAddress({
        name: '',
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: '',
        phone: '',
        email: '',
        isDefault: false,
      });
      setShowAddModal(false);
      loadAddresses();
      Alert.alert('Success', 'Address saved successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to save address');
    }
  };

  const handleDeleteAddress = (address: SavedAddress) => {
    Alert.alert(
      'Delete Address',
      `Delete address for ${address.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await AddressManager.deleteAddress(address.id);
              loadAddresses();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete address');
            }
          },
        },
      ]
    );
  };

  const handleExportAddresses = async () => {
    try {
      const vcard = AddressManager.exportAsVCard(addresses);
      // In a real app, you'd save this to a file or share it
      Alert.alert('Export', 'Addresses exported as vCard format');
    } catch (error) {
      Alert.alert('Error', 'Failed to export addresses');
    }
  };

  const renderAddressItem = ({ item }: { item: SavedAddress }) => (
    <View style={styles.addressItem}>
      <View style={styles.addressIcon}>
        <Ionicons name="location" size={24} color="#4285f4" />
      </View>
      <View style={styles.addressInfo}>
        <Text style={styles.addressName}>{item.name}</Text>
        <Text style={styles.addressStreet}>{item.street}</Text>
        <Text style={styles.addressCity}>
          {item.city}, {item.state} {item.zipCode}
        </Text>
        <Text style={styles.addressCountry}>{item.country}</Text>
        {item.isDefault && (
          <Text style={styles.defaultLabel}>Default</Text>
        )}
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteAddress(item)}
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
        <Text style={styles.headerTitle}>Addresses and more</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Save and Fill Setting */}
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Save and fill addresses</Text>
            <Text style={styles.settingSubtitle}>
              Includes information such as phone numbers, email addresses and delivery addresses
            </Text>
          </View>
          <Switch
            value={saveAndFill}
            onValueChange={onToggleSaveAndFill}
            trackColor={{ false: '#333', true: '#4CAF50' }}
            thumbColor={saveAndFill ? '#ffffff' : '#666'}
          />
        </View>

        {/* Add Address Button */}
        <TouchableOpacity
          style={styles.addAddressButton}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add" size={24} color="#4285f4" />
          <Text style={styles.addAddressText}>Add address</Text>
        </TouchableOpacity>

        {/* Import/Export Section */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.importExportButton} onPress={handleExportAddresses}>
            <View style={styles.importExportIcon}>
              <Ionicons name="download-outline" size={24} color="#4285f4" />
            </View>
            <View style={styles.importExportInfo}>
              <Text style={styles.importExportTitle}>Export Addresses</Text>
              <Text style={styles.importExportSubtitle}>Export as vCard format</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#888" />
          </TouchableOpacity>
        </View>

        {/* Saved Addresses */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Saved Addresses ({addresses.length})</Text>
          
          {addresses.length > 0 ? (
            <FlatList
              data={addresses}
              renderItem={renderAddressItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="location-outline" size={48} color="#666" />
              <Text style={styles.emptyText}>No saved addresses</Text>
              <Text style={styles.emptySubtext}>Your addresses will appear here</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add Address Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Address</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <TextInput
                style={styles.modalInput}
                value={newAddress.name}
                onChangeText={(text) => setNewAddress(prev => ({ ...prev, name: text }))}
                placeholder="Full Name"
                placeholderTextColor="#888"
                autoCapitalize="words"
              />

              <TextInput
                style={styles.modalInput}
                value={newAddress.street}
                onChangeText={(text) => setNewAddress(prev => ({ ...prev, street: text }))}
                placeholder="Street Address"
                placeholderTextColor="#888"
                autoCapitalize="words"
              />

              <View style={styles.rowInputs}>
                <TextInput
                  style={[styles.modalInput, styles.halfInput]}
                  value={newAddress.city}
                  onChangeText={(text) => setNewAddress(prev => ({ ...prev, city: text }))}
                  placeholder="City"
                  placeholderTextColor="#888"
                  autoCapitalize="words"
                />
                <TextInput
                  style={[styles.modalInput, styles.halfInput]}
                  value={newAddress.state}
                  onChangeText={(text) => setNewAddress(prev => ({ ...prev, state: text }))}
                  placeholder="State"
                  placeholderTextColor="#888"
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.rowInputs}>
                <TextInput
                  style={[styles.modalInput, styles.halfInput]}
                  value={newAddress.zipCode}
                  onChangeText={(text) => setNewAddress(prev => ({ ...prev, zipCode: text }))}
                  placeholder="ZIP Code"
                  placeholderTextColor="#888"
                  keyboardType="numeric"
                />
                <TextInput
                  style={[styles.modalInput, styles.halfInput]}
                  value={newAddress.country}
                  onChangeText={(text) => setNewAddress(prev => ({ ...prev, country: text }))}
                  placeholder="Country"
                  placeholderTextColor="#888"
                  autoCapitalize="words"
                />
              </View>

              <TextInput
                style={styles.modalInput}
                value={newAddress.phone}
                onChangeText={(text) => setNewAddress(prev => ({ ...prev, phone: text }))}
                placeholder="Phone Number (Optional)"
                placeholderTextColor="#888"
                keyboardType="phone-pad"
              />

              <TextInput
                style={styles.modalInput}
                value={newAddress.email}
                onChangeText={(text) => setNewAddress(prev => ({ ...prev, email: text }))}
                placeholder="Email Address (Optional)"
                placeholderTextColor="#888"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <View style={styles.defaultContainer}>
                <Text style={styles.defaultText}>Set as default address</Text>
                <Switch
                  value={newAddress.isDefault}
                  onValueChange={(value) => setNewAddress(prev => ({ ...prev, isDefault: value }))}
                  trackColor={{ false: '#333', true: '#4CAF50' }}
                  thumbColor={newAddress.isDefault ? '#ffffff' : '#666'}
                />
              </View>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleAddAddress}
              >
                <Text style={styles.saveButtonText}>Save Address</Text>
              </TouchableOpacity>
            </ScrollView>
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
  },
  content: {
    flex: 1,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    margin: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
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
  addAddressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(66, 133, 244, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(66, 133, 244, 0.3)',
  },
  addAddressText: {
    color: '#4285f4',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  importExportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  importExportIcon: {
    marginRight: 16,
  },
  importExportInfo: {
    flex: 1,
  },
  importExportTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  importExportSubtitle: {
    fontSize: 12,
    color: '#888',
  },
  addressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  addressIcon: {
    marginRight: 16,
  },
  addressInfo: {
    flex: 1,
  },
  addressName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  addressStreet: {
    fontSize: 14,
    color: '#888',
    marginBottom: 2,
  },
  addressCity: {
    fontSize: 14,
    color: '#888',
    marginBottom: 2,
  },
  addressCountry: {
    fontSize: 14,
    color: '#888',
  },
  defaultLabel: {
    fontSize: 12,
    color: '#4CAF50',
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
    maxHeight: '80%',
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
  rowInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
  },
  defaultContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  defaultText: {
    fontSize: 16,
    color: '#ffffff',
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