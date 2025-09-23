import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, View } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

// Custom tab icon with background highlight when focused
const TabIcon = ({ focused, children }: { focused: boolean; children: React.ReactNode }) => (
  <View
    style={{
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: focused ? 'rgba(236, 72, 153, 0.06)' : 'transparent',
      borderRadius: 24,
      paddingHorizontal: 20,
      paddingVertical: 6,
      minWidth: 56,
    }}
  >
    {children}
  </View>
);

export default function TabLayout() {
  const { profile } = useAuth();
  const isInCouple = profile?.couple_id != null;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#EC4899',
        tabBarInactiveTintColor: '#6B7280',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          paddingTop: 10,
          paddingBottom: Platform.OS === 'ios' ? 30 : 24,
          height: Platform.OS === 'ios' ? 95 : 85,
          backgroundColor: '#fff',
          borderTopWidth: 0.5,
          borderTopColor: '#e5e7eb',
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.1,
          shadowRadius: 5,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
          marginBottom: Platform.OS === 'ios' ? 0 : 2,
        },
        tabBarIconStyle: {
          marginTop: Platform.OS === 'ios' ? 6 : 4,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size || 24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="journal"
        options={{
          title: 'Journal',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book" size={size || 24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="memories"
        options={{
          title: 'Memories',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="images" size={size || 24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="connect"
        options={{
          title: 'Connect',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="heart-multiple" size={size || 24} color={color} />
          ),
          // Hide this tab if user is not in a couple
          href: isInCouple ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle" size={size || 24} color={color} />
          ),
        }}
      />
      {/* Hide the old explore tab */}
      <Tabs.Screen
        name="explore"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}