import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Modal, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  CaretLeft,
  UserCircle,
  Bell,
  Shield,
  ShieldCheck,
  Moon,
  Sun,
  DeviceMobile,
  Info,
  SignOut,
  CaretRight,
  Check,
  X,
} from 'phosphor-react-native';
import { useTheme, ThemePreference } from '../../contexts/ThemeContext';
import { Typography } from '../../constants/typography';
import { scale, fontScale, iconScale } from '../../utils/responsive';
import { useAuthStore } from '../../stores/authStore';
import { useUserStore } from '../../stores/userStore';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../../types';

interface SettingsItemProps {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  showArrow?: boolean;
  danger?: boolean;
  colors: ReturnType<typeof useTheme>['colors'];
}

function SettingsItem({ icon, label, onPress, showArrow = true, danger, colors }: SettingsItemProps) {
  return (
    <TouchableOpacity
      style={[styles.settingsItem, { borderBottomColor: colors.border.primary }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.settingsItemLeft}>
        {icon}
        <Text
          style={[
            styles.settingsItemLabel,
            { color: danger ? colors.status.error : colors.text.primary },
          ]}
        >
          {label}
        </Text>
      </View>
      {showArrow && <CaretRight size={iconScale(20)} color={colors.text.tertiary} weight="regular" />}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, themePreference, setThemePreference } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
  const [showAppearanceModal, setShowAppearanceModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  // Auth & User stores
  const signOut = useAuthStore((state) => state.signOut);
  const clearProfile = useUserStore((state) => state.clearProfile);

  const handleBack = () => {
    navigation.goBack();
  };

  const handleEditProfile = () => {
    navigation.navigate('EditProfile');
  };

  const handleNotifications = () => {
    navigation.navigate('NotificationSettings');
  };

  const handlePrivacy = () => {
    setShowPrivacyModal(true);
  };

  const handleSecurity = () => {
    navigation.navigate('Security');
  };

  const handleAppearance = () => {
    setShowAppearanceModal(true);
  };

  const handleAbout = () => {
    setShowAboutModal(true);
  };

  const handlePrivacyPolicy = () => {
    Linking.openURL('https://www.linkble-app.com/privacy.html');
  };

  const handleTermsOfService = () => {
    Linking.openURL('https://www.linkble-app.com/terms.html');
  };

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            clearProfile();
            await signOut();
          },
        },
      ]
    );
  };

  const themeOptions: { value: ThemePreference; label: string; icon: React.ReactNode }[] = [
    {
      value: 'dark',
      label: 'Dark',
      icon: <Moon size={iconScale(24)} color={colors.text.secondary} weight="regular" />,
    },
    {
      value: 'light',
      label: 'Light',
      icon: <Sun size={iconScale(24)} color={colors.text.secondary} weight="regular" />,
    },
    {
      value: 'auto',
      label: 'System',
      icon: <DeviceMobile size={iconScale(24)} color={colors.text.secondary} weight="regular" />,
    },
  ];

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
        <Text style={[styles.title, { color: colors.text.primary }]}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.tertiary }]}>Account</Text>
          <View style={[styles.sectionContent, { backgroundColor: colors.background.secondary }]}>
            <SettingsItem
              icon={<UserCircle size={iconScale(24)} color={colors.text.secondary} weight="regular" />}
              label="Edit Profile"
              onPress={handleEditProfile}
              colors={colors}
            />
            <SettingsItem
              icon={<Bell size={iconScale(24)} color={colors.text.secondary} weight="regular" />}
              label="Notifications"
              onPress={handleNotifications}
              colors={colors}
            />
            <SettingsItem
              icon={<Shield size={iconScale(24)} color={colors.text.secondary} weight="regular" />}
              label="Privacy"
              onPress={handlePrivacy}
              colors={colors}
            />
            <SettingsItem
              icon={<ShieldCheck size={iconScale(24)} color={colors.text.secondary} weight="regular" />}
              label="Security"
              onPress={handleSecurity}
              colors={colors}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.tertiary }]}>Preferences</Text>
          <View style={[styles.sectionContent, { backgroundColor: colors.background.secondary }]}>
            <SettingsItem
              icon={<Moon size={iconScale(24)} color={colors.text.secondary} weight="regular" />}
              label="Appearance"
              onPress={handleAppearance}
              colors={colors}
            />
            <SettingsItem
              icon={<Info size={iconScale(24)} color={colors.text.secondary} weight="regular" />}
              label="About"
              onPress={handleAbout}
              colors={colors}
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={[styles.sectionContent, { backgroundColor: colors.background.secondary }]}>
            <SettingsItem
              icon={<SignOut size={iconScale(24)} color={colors.status.error} weight="regular" />}
              label="Log Out"
              onPress={handleLogout}
              showArrow={false}
              danger
              colors={colors}
            />
          </View>
        </View>

        <Text style={[styles.version, { color: colors.text.tertiary }]}>
          Linkble v1.0.0
        </Text>
      </ScrollView>

      <Modal
        visible={showAppearanceModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAppearanceModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAppearanceModal(false)}
        >
          <View
            style={[styles.modalContent, { backgroundColor: colors.background.secondary }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>Appearance</Text>
              <TouchableOpacity onPress={() => setShowAppearanceModal(false)}>
                <X size={iconScale(24)} color={colors.text.secondary} weight="regular" />
              </TouchableOpacity>
            </View>

            {themeOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.themeOption,
                  { borderBottomColor: colors.border.primary },
                ]}
                onPress={() => {
                  setThemePreference(option.value);
                  setShowAppearanceModal(false);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.themeOptionLeft}>
                  {option.icon}
                  <Text style={[styles.themeOptionLabel, { color: colors.text.primary }]}>
                    {option.label}
                  </Text>
                </View>
                {themePreference === option.value && (
                  <Check size={iconScale(24)} color={colors.accent.primary} weight="bold" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={showAboutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAboutModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAboutModal(false)}
        >
          <View
            style={[styles.modalContent, { backgroundColor: colors.background.secondary }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>About</Text>
              <TouchableOpacity onPress={() => setShowAboutModal(false)}>
                <X size={iconScale(24)} color={colors.text.secondary} weight="regular" />
              </TouchableOpacity>
            </View>

            <View style={styles.aboutContent}>
              <Text style={[styles.aboutText, { color: colors.text.secondary }]}>
                Linkble is the social infrastructure for local life. Discover local activities, create events, and meet people who share your interests.
              </Text>
              <Text style={[styles.aboutText, { color: colors.text.secondary }]}>
                Less friction. More participation.
              </Text>
              <TouchableOpacity
                onPress={() => Linking.openURL('https://www.linkble-app.com/')}
                activeOpacity={0.7}
                style={styles.learnMoreButton}
              >
                <Text style={[styles.learnMoreText, { color: colors.accent.primary }]}>
                  Learn more
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={showPrivacyModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPrivacyModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPrivacyModal(false)}
        >
          <View
            style={[styles.modalContent, { backgroundColor: colors.background.secondary }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>Privacy</Text>
              <TouchableOpacity onPress={() => setShowPrivacyModal(false)}>
                <X size={iconScale(24)} color={colors.text.secondary} weight="regular" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.themeOption, { borderBottomColor: colors.border.primary }]}
              onPress={handlePrivacyPolicy}
              activeOpacity={0.7}
            >
              <Text style={[styles.themeOptionLabel, { color: colors.text.primary }]}>
                Privacy Policy
              </Text>
              <CaretRight size={iconScale(20)} color={colors.text.tertiary} weight="regular" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.themeOption, { borderBottomColor: colors.border.primary }]}
              onPress={handleTermsOfService}
              activeOpacity={0.7}
            >
              <Text style={[styles.themeOptionLabel, { color: colors.text.primary }]}>
                Terms of Service
              </Text>
              <CaretRight size={iconScale(20)} color={colors.text.tertiary} weight="regular" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
  sectionTitle: {
    ...Typography.caption,
    textTransform: 'uppercase',
    marginBottom: scale(8),
    marginLeft: scale(4),
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
  version: {
    ...Typography.caption,
    textAlign: 'center',
    marginTop: scale(8),
    marginBottom: scale(40),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: scale(20),
  },
  modalContent: {
    width: '100%',
    maxWidth: scale(340),
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(20),
    paddingVertical: scale(16),
  },
  modalTitle: {
    ...Typography.h3,
  },
  themeOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: scale(14),
    paddingHorizontal: scale(20),
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  themeOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  themeOptionLabel: {
    ...Typography.body,
  },
  aboutContent: {
    paddingHorizontal: scale(20),
    paddingBottom: scale(20),
  },
  aboutText: {
    ...Typography.body,
    textAlign: 'center',
    marginBottom: scale(8),
  },
  learnMoreButton: {
    marginTop: scale(12),
    alignItems: 'center',
  },
  learnMoreText: {
    ...Typography.body,
    fontWeight: '500',
  },
});
