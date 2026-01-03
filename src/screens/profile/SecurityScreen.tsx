import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { CaretLeft, CaretRight, UserMinus } from 'phosphor-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Typography } from '../../constants/typography';
import { scale, fontScale, iconScale } from '../../utils/responsive';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../../types';

interface SettingsItemProps {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
}

function SettingsItem({ icon, label, onPress, colors }: SettingsItemProps) {
  return (
    <TouchableOpacity
      style={[styles.settingsItem, { borderBottomColor: colors.border.primary }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.settingsItemLeft}>
        {icon}
        <Text style={[styles.settingsItemLabel, { color: colors.text.primary }]}>
          {label}
        </Text>
      </View>
      <CaretRight size={iconScale(20)} color={colors.text.tertiary} weight="regular" />
    </TouchableOpacity>
  );
}

export default function SecurityScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();

  const handleBack = () => {
    navigation.goBack();
  };

  const handleBlockedUsers = () => {
    navigation.navigate('BlockedUsers');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background.primary, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.background.secondary }]}
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <CaretLeft size={iconScale(24)} color={colors.text.primary} weight="regular" />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text.primary }]}>Security</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <View style={[styles.sectionContent, { backgroundColor: colors.background.secondary }]}>
            <SettingsItem
              icon={<UserMinus size={iconScale(24)} color={colors.text.secondary} weight="regular" />}
              label="Blocked Users"
              onPress={handleBlockedUsers}
              colors={colors}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(20),
    paddingVertical: scale(16),
  },
  backButton: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...Typography.h2,
    fontSize: fontScale(16),
    lineHeight: fontScale(24),
  },
  placeholder: {
    width: scale(40),
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: scale(20),
    marginBottom: scale(24),
  },
  sectionContent: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingsItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: scale(14),
    paddingHorizontal: scale(16),
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  settingsItemLabel: {
    ...Typography.body,
  },
});
