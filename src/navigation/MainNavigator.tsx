import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CalendarBlank, MapPin, Plus, ChatCircle, User } from 'phosphor-react-native';
import type { MainTabParamList } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { Typography } from '../constants/typography';

// Import screens
import FeedScreen from '../screens/feed/FeedScreen';
import MapScreen from '../screens/map/MapScreen';
import ChatNavigator from './ChatNavigator';
import ProfileNavigator from './ProfileNavigator';
import CreateEventModal from '../components/events/CreateEventModal';

const Tab = createBottomTabNavigator<MainTabParamList>();

// Placeholder for Create tab - will open bottom sheet
function CreatePlaceholder() {
  return <View style={{ flex: 1 }} />;
}

// Custom center button component
interface CreateButtonProps {
  onPress: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
}

function CreateButton({ onPress, colors }: CreateButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.createButton, { backgroundColor: colors.accent.primary }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Plus size={28} color="#FFFFFF" weight="bold" />
    </TouchableOpacity>
  );
}

export default function MainNavigator() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [createModalVisible, setCreateModalVisible] = useState(false);

  const handleCreatePress = () => {
    setCreateModalVisible(true);
  };

  return (
    <>
    <Tab.Navigator
      initialRouteName="Feed"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tabBar.activeTab,
        tabBarInactiveTintColor: colors.tabBar.inactiveTab,
        tabBarStyle: {
          backgroundColor: colors.tabBar.background,
          borderTopWidth: 0,
          paddingBottom: insets.bottom,
          height: 49 + insets.bottom,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.15,
          shadowRadius: 4,
          elevation: 5,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
        },
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tab.Screen
        name="Feed"
        component={FeedScreen}
        options={{
          tabBarLabel: 'Events',
          tabBarIcon: ({ color, size }) => (
            <CalendarBlank size={size} color={color} weight="regular" />
          ),
        }}
      />
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{
          tabBarLabel: 'Map',
          tabBarIcon: ({ color, size }) => (
            <MapPin size={size} color={color} weight="regular" />
          ),
        }}
      />
      <Tab.Screen
        name="Create"
        component={CreatePlaceholder}
        options={{
          tabBarLabel: '',
          tabBarIcon: () => (
            <CreateButton onPress={handleCreatePress} colors={colors} />
          ),
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            handleCreatePress();
          },
        }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatNavigator}
        options={{
          tabBarLabel: 'Chats',
          tabBarIcon: ({ color, size }) => (
            <ChatCircle size={size} color={color} weight="regular" />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileNavigator}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <User size={size} color={color} weight="regular" />
          ),
        }}
      />
    </Tab.Navigator>
    <CreateEventModal
      visible={createModalVisible}
      onClose={() => setCreateModalVisible(false)}
    />
    </>
  );
}

const styles = StyleSheet.create({
  createButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#00A8FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
});
