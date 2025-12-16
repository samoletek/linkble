import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChatCircle } from 'phosphor-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Typography } from '../../constants/typography';

export default function ChatListScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background.primary, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text.primary }]}>Chats</Text>
      </View>
      <View style={styles.content}>
        <ChatCircle size={64} color={colors.text.tertiary} weight="thin" />
        <Text style={[styles.placeholder, { color: colors.text.secondary }]}>
          No conversations yet
        </Text>
        <Text style={[styles.hint, { color: colors.text.tertiary }]}>
          Join an event to start chatting
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    ...Typography.h1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  placeholder: {
    ...Typography.body,
    marginTop: 16,
  },
  hint: {
    ...Typography.caption,
    marginTop: 8,
  },
});
