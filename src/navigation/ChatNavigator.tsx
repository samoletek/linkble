import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { ChatStackParamList } from '../types';

import ChatListScreen from '../screens/chat/ChatListScreen';
import EventChatScreen from '../screens/chat/EventChatScreen';
import DirectChatScreen from '../screens/chat/DirectChatScreen';

const Stack = createNativeStackNavigator<ChatStackParamList>();

export default function ChatNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="ChatList" component={ChatListScreen} />
      <Stack.Screen name="EventChat" component={EventChatScreen} />
      <Stack.Screen name="DirectChat" component={DirectChatScreen} />
    </Stack.Navigator>
  );
}
