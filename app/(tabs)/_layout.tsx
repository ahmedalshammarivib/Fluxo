import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: '#0a0b1e' }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            display: 'none',
          },
          tabBarActiveTintColor: '#4CAF50',
          tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.6)',
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
          },
          tabBarIconStyle: {
            marginBottom: 2,
          },
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Browser',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="globe-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="tabs"
          options={{
            title: 'Tabs',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="copy-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="bookmarks"
          options={{
            title: 'Bookmarks',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="bookmark-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: 'History',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="time-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="settings-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="adBlocker"
          options={{
            title: 'Ad Blocker',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="shield-checkmark-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="downloads"
          options={{
            title: 'Downloads',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="download-outline" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}