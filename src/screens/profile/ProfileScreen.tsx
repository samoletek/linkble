import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { User } from 'phosphor-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Typography } from '../../constants/typography';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background.primary, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text.primary }]}>Profile</Text>
      </View>
      <View style={styles.content}>
        <View style={[styles.avatar, { backgroundColor: colors.background.secondary }]}>
          <User size={48} color={colors.text.tertiary} weight="thin" />
        </View>
        <Text style={[styles.placeholder, { color: colors.text.secondary }]}>
          Profile setup coming soon
        </Text>
        <Text style={[styles.hint, { color: colors.text.tertiary }]}>
          Customize your profile and interests
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
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    ...Typography.body,
    marginTop: 20,
  },
  hint: {
    ...Typography.caption,
    marginTop: 8,
  },
});
