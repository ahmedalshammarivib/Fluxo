import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SearchEngine } from '../../types/settings';

interface SearchEngineSettingsProps {
  currentEngine: string;
  onEngineChange: (engine: string) => void;
  onBack: () => void;
}

const defaultEngines: SearchEngine[] = [
  { id: 'google', name: 'Google', url: 'https://www.google.com/search?q=', icon: 'search' },
  { id: 'bing', name: 'Bing', url: 'https://www.bing.com/search?q=', icon: 'search' },
  { id: 'duckduckgo', name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=', icon: 'shield-checkmark' },
  { id: 'yahoo', name: 'Yahoo', url: 'https://search.yahoo.com/search?p=', icon: 'search' },
  { id: 'ecosia', name: 'Ecosia', url: 'https://www.ecosia.org/search?q=', icon: 'leaf' },
];

export const SearchEngineSettings: React.FC<SearchEngineSettingsProps> = ({
  currentEngine,
  onEngineChange,
  onBack,
}) => {
  const [customUrl, setCustomUrl] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const handleEngineSelect = (engineId: string) => {
    // FIXED: Removed debug console.log for production
    onEngineChange(engineId);
    onBack();
  };

  const handleCustomEngine = () => {
    if (!customUrl.trim()) {
      Alert.alert('Error', 'Please enter a valid search URL');
      return;
    }

    if (!customUrl.includes('{searchTerms}') && !customUrl.includes('%s')) {
      Alert.alert(
        'Invalid URL',
        'Custom search URL must contain {searchTerms} or %s placeholder for search terms'
      );
      return;
    }
    
    // FIXED: Removed debug console.log for production
    onEngineChange(customUrl);
    onBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton} accessibilityLabel="Go back" accessibilityRole="button">
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Search Engine</Text>
      </View>

      <ScrollView style={styles.content}>
        {defaultEngines.map((engine) => (
          <TouchableOpacity
            key={engine.id}
            style={[
              styles.engineItem,
              currentEngine === engine.id && styles.selectedEngine
            ]}
            onPress={() => handleEngineSelect(engine.id)}
            accessibilityLabel={`Select ${engine.name} search engine`}
            accessibilityRole="button"
            accessibilityState={{ selected: currentEngine === engine.id }}
          >
            <View style={styles.engineIcon}>
              <Ionicons name={engine.icon as any} size={24} color="#4285f4" />
            </View>
            <Text style={styles.engineName}>{engine.name}</Text>
            {currentEngine === engine.id && (
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            )}
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={styles.customEngineButton}
          onPress={() => setShowCustomInput(!showCustomInput)}
          accessibilityLabel="Add custom search engine"
          accessibilityRole="button"
          accessibilityState={{ expanded: showCustomInput }}
        >
          <View style={styles.engineIcon}>
            <Ionicons name="add-circle-outline" size={24} color="#4285f4" />
          </View>
          <Text style={styles.engineName}>Custom Search Engine</Text>
          <Ionicons 
            name={showCustomInput ? "chevron-up" : "chevron-down"} 
            size={20} 
            color="#888" 
          />
        </TouchableOpacity>

        {showCustomInput && (
          <View style={styles.customInputContainer}>
            <Text style={styles.customInputLabel}>
              Enter search URL (use {'{searchTerms}'} for search terms):
            </Text>
            <TextInput
              style={styles.customInput}
              value={customUrl}
              onChangeText={setCustomUrl}
              placeholder="https://example.com/search?q={searchTerms}"
              placeholderTextColor="#888"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.addCustomButton}
              onPress={handleCustomEngine}
            >
              <Text style={styles.addCustomButtonText}>Add Custom Engine</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
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
    padding: 20,
  },
  engineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  selectedEngine: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  engineIcon: {
    marginRight: 16,
  },
  engineName: {
    flex: 1,
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
  },
  customEngineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  customInputContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  customInputLabel: {
    fontSize: 14,
    color: '#888',
    marginBottom: 12,
  },
  customInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    color: '#ffffff',
    fontSize: 16,
    marginBottom: 16,
  },
  addCustomButton: {
    backgroundColor: '#4285f4',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  addCustomButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});