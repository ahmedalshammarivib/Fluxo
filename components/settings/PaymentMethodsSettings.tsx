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
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PaymentManager } from '../../utils/paymentManager';
import { PaymentCard } from '../../types/settings';

interface PaymentMethodsSettingsProps {
  saveAndFill: boolean;
  onToggleSaveAndFill: (value: boolean) => void;
  onBack: () => void;
}

export const PaymentMethodsSettings: React.FC<PaymentMethodsSettingsProps> = ({
  saveAndFill,
  onToggleSaveAndFill,
  onBack,
}) => {
  const [cards, setCards] = useState<PaymentCard[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCard, setNewCard] = useState({
    cardNumber: '',
    expiryDate: '',
    cardholderName: '',
    isDefault: false,
  });

  useEffect(() => {
    loadCards();
  }, []);

  const loadCards = async () => {
    try {
      const savedCards = await PaymentManager.getCards();
      setCards(savedCards);
    } catch (error) {
      Alert.alert('Error', 'Failed to load payment cards');
    }
  };

  const handleAddCard = async () => {
    if (!newCard.cardNumber || !newCard.expiryDate || !newCard.cardholderName) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!PaymentManager.validateCardNumber(newCard.cardNumber)) {
      Alert.alert('Error', 'Invalid card number');
      return;
    }

    try {
      const cardType = PaymentManager.detectCardType(newCard.cardNumber);
      await PaymentManager.saveCard({
        ...newCard,
        cardType,
      });
      
      setNewCard({ cardNumber: '', expiryDate: '', cardholderName: '', isDefault: false });
      setShowAddModal(false);
      loadCards();
      Alert.alert('Success', 'Payment card added successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to save payment card');
    }
  };

  const handleDeleteCard = (card: PaymentCard) => {
    Alert.alert(
      'Delete Card',
      `Delete card ending in ${card.cardNumber.slice(-4)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await PaymentManager.deleteCard(card.id);
              loadCards();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete card');
            }
          },
        },
      ]
    );
  };

  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    const formatted = cleaned.replace(/(.{4})/g, '$1 ').trim();
    return formatted.substring(0, 19); // Max 16 digits + 3 spaces
  };

  const formatExpiryDate = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return `${cleaned.substring(0, 2)}/${cleaned.substring(2, 4)}`;
    }
    return cleaned;
  };

  const getCardIcon = (cardType: PaymentCard['cardType']) => {
    switch (cardType) {
      case 'visa': return 'card';
      case 'mastercard': return 'card';
      case 'amex': return 'card';
      case 'discover': return 'card';
      default: return 'card';
    }
  };

  const renderCardItem = ({ item }: { item: PaymentCard }) => (
    <View style={styles.cardItem}>
      <View style={styles.cardIcon}>
        <Ionicons name={getCardIcon(item.cardType) as any} size={24} color="#4285f4" />
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>{item.cardholderName}</Text>
        <Text style={styles.cardNumber}>•••• {item.cardNumber.slice(-4)}</Text>
        <Text style={styles.cardExpiry}>Expires {item.expiryDate}</Text>
        {item.isDefault && (
          <Text style={styles.defaultLabel}>Default</Text>
        )}
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteCard(item)}
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
        <Text style={styles.headerTitle}>Payment Methods</Text>
      </View>

      <View style={styles.content}>
        {/* Save and Fill Setting */}
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Save and fill payment methods</Text>
            <Text style={styles.settingSubtitle}>
              Fills in payment forms with your saved payment methods
            </Text>
          </View>
          <Switch
            value={saveAndFill}
            onValueChange={onToggleSaveAndFill}
            trackColor={{ false: '#333', true: '#4CAF50' }}
            thumbColor={saveAndFill ? '#ffffff' : '#666'}
          />
        </View>

        {/* Add Card Button */}
        <TouchableOpacity
          style={styles.addCardButton}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add" size={24} color="#4285f4" />
          <Text style={styles.addCardText}>Add card</Text>
        </TouchableOpacity>

        {/* Payment Apps Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment apps</Text>
          <Text style={styles.sectionSubtitle}>
            Connect with payment apps installed on your device
          </Text>
          
          <TouchableOpacity style={styles.paymentAppItem}>
            <View style={styles.paymentAppIcon}>
              <Ionicons name="wallet-outline" size={24} color="#4285f4" />
            </View>
            <Text style={styles.paymentAppText}>Google Pay</Text>
            <Ionicons name="chevron-forward" size={20} color="#888" />
          </TouchableOpacity>
        </View>

        {/* Saved Cards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Saved Cards ({cards.length})</Text>
          
          {cards.length > 0 ? (
            <FlatList
              data={cards}
              renderItem={renderCardItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="card-outline" size={48} color="#666" />
              <Text style={styles.emptyText}>No saved cards</Text>
              <Text style={styles.emptySubtext}>Your payment cards will appear here</Text>
            </View>
          )}
        </View>
      </View>

      {/* Add Card Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Payment Card</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <TextInput
                style={styles.modalInput}
                value={newCard.cardNumber}
                onChangeText={(text) => setNewCard(prev => ({ 
                  ...prev, 
                  cardNumber: formatCardNumber(text) 
                }))}
                placeholder="Card Number"
                placeholderTextColor="#888"
                keyboardType="numeric"
                maxLength={19}
              />

              <TextInput
                style={styles.modalInput}
                value={newCard.expiryDate}
                onChangeText={(text) => setNewCard(prev => ({ 
                  ...prev, 
                  expiryDate: formatExpiryDate(text) 
                }))}
                placeholder="MM/YY"
                placeholderTextColor="#888"
                keyboardType="numeric"
                maxLength={5}
              />

              <TextInput
                style={styles.modalInput}
                value={newCard.cardholderName}
                onChangeText={(text) => setNewCard(prev => ({ ...prev, cardholderName: text }))}
                placeholder="Cardholder Name"
                placeholderTextColor="#888"
                autoCapitalize="words"
              />

              <View style={styles.defaultContainer}>
                <Text style={styles.defaultText}>Set as default card</Text>
                <Switch
                  value={newCard.isDefault}
                  onValueChange={(value) => setNewCard(prev => ({ ...prev, isDefault: value }))}
                  trackColor={{ false: '#333', true: '#4CAF50' }}
                  thumbColor={newCard.isDefault ? '#ffffff' : '#666'}
                />
              </View>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleAddCard}
              >
                <Text style={styles.saveButtonText}>Add Card</Text>
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
  addCardButton: {
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
  addCardText: {
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
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 16,
  },
  paymentAppItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  paymentAppIcon: {
    marginRight: 16,
  },
  paymentAppText: {
    flex: 1,
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
  },
  cardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardIcon: {
    marginRight: 16,
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  cardNumber: {
    fontSize: 14,
    color: '#888',
    marginBottom: 2,
  },
  cardExpiry: {
    fontSize: 12,
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