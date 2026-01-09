import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { CaretLeft, Trash } from 'phosphor-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Typography } from '../../constants';
import { scale, fontScale, iconScale } from '../../utils/responsive';
import TextInput from '../../components/common/TextInput';
import { useUserStore } from '../../stores/userStore';
import { useAuthStore } from '../../stores/authStore';
import { changePassword, updateEmail } from '../../services/auth';

export default function EditProfileScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const profile = useUserStore((state) => state.profile);
  const updateProfile = useUserStore((state) => state.updateProfile);
  const deleteAccountAction = useUserStore((state) => state.deleteAccount);
  const clearProfile = useUserStore((state) => state.clearProfile);
  const signOut = useAuthStore((state) => state.signOut);

  const user = useAuthStore((state) => state.user);

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Saving states
  const [isNameSaving, setIsNameSaving] = useState(false);
  const [isUsernameSaving, setIsUsernameSaving] = useState(false);

  // Email state
  const [email, setEmail] = useState('');
  const [isEmailSaving, setIsEmailSaving] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);

  const initialFullName = useRef('');
  const initialUsername = useRef('');
  const initialEmail = useRef('');

  // Calculate days until username can be changed
  const getDaysUntilUsernameChange = (): number | null => {
    if (!profile?.last_username_change) return null;
    const lastChange = new Date(profile.last_username_change);
    const daysSinceChange = (Date.now() - lastChange.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceChange >= 30) return null;
    return Math.ceil(30 - daysSinceChange);
  };

  const daysUntilUsernameChange = getDaysUntilUsernameChange();

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setUsername(profile.username || '');
      initialFullName.current = profile.full_name || '';
      initialUsername.current = profile.username || '';
    }
  }, [profile]);

  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
      initialEmail.current = user.email;
    }
  }, [user]);

  const handleBack = () => {
    navigation.goBack();
  };

  const handleSaveName = async () => {
    const trimmedValue = fullName.trim();
    if (!trimmedValue || trimmedValue === initialFullName.current) return;

    setIsNameSaving(true);
    const result = await updateProfile({ full_name: trimmedValue });
    setIsNameSaving(false);

    if (result.success) {
      initialFullName.current = trimmedValue;
    } else if (result.error) {
      Alert.alert('Error', result.error);
    }
  };

  const handleSaveUsername = async () => {
    const trimmedValue = username.trim();
    if (trimmedValue === initialUsername.current) return;

    setIsUsernameSaving(true);
    const result = await updateProfile({ username: trimmedValue || undefined });
    setIsUsernameSaving(false);

    if (result.success) {
      initialUsername.current = trimmedValue;
    } else if (result.error) {
      Alert.alert('Cannot Change Username', result.error);
      setUsername(initialUsername.current);
    }
  };

  const handleSaveEmail = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || trimmedEmail === initialEmail.current) return;

    setIsEmailSaving(true);
    const { error } = await updateEmail(trimmedEmail);
    setIsEmailSaving(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      initialEmail.current = trimmedEmail;
      Alert.alert('Success', 'A confirmation link has been sent to your new email address.');
    }
  };

  const hasPasswordInput = currentPassword.length > 0 || newPassword.length > 0 || confirmPassword.length > 0;
  const canSavePassword = currentPassword.length > 0 &&
    newPassword.length >= 6 &&
    confirmPassword.length > 0 &&
    newPassword === confirmPassword;

  const handleSavePassword = async () => {
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setIsPasswordSaving(true);
    const { error } = await changePassword(currentPassword, newPassword);
    setIsPasswordSaving(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Success', 'Password changed successfully');
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            const result = await deleteAccountAction();
            if (result.success) {
              clearProfile();
              await signOut();
            } else {
              Alert.alert('Error', result.error || 'Failed to delete account');
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const nameChanged = fullName.trim() !== initialFullName.current && fullName.trim().length > 0;
  const usernameChanged = username.trim() !== initialUsername.current;
  const emailChanged = email.trim() !== initialEmail.current && email.trim().length > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background.primary, paddingTop: insets.top }]}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.background.secondary }]}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <CaretLeft size={iconScale(24)} color={colors.text.primary} weight="regular" />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text.primary }]}>Edit Profile</Text>
          <View style={styles.placeholder} />
        </View>
      </TouchableWithoutFeedback>

      <KeyboardAwareScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        extraScrollHeight={60}
        enableOnAndroid
        enableResetScrollToCoords={false}
      >
          <View style={styles.section}>
            <TextInput
              label="Name"
              placeholder="Your name"
              value={fullName}
              onChangeText={setFullName}
              maxLength={50}
            />
            {nameChanged && (
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: colors.accent.primary }]}
                onPress={handleSaveName}
                disabled={isNameSaving}
                activeOpacity={0.7}
              >
                {isNameSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.section}>
            <TextInput
              label="Username"
              placeholder="@username"
              value={username}
              onChangeText={(text) => setUsername(text.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              maxLength={30}
              autoCapitalize="none"
              editable={daysUntilUsernameChange === null}
            />
            {daysUntilUsernameChange !== null && (
              <Text style={[styles.usernameHint, { color: colors.text.tertiary }]}>
                You can change your username in {daysUntilUsernameChange} day{daysUntilUsernameChange === 1 ? '' : 's'}
              </Text>
            )}
            {usernameChanged && daysUntilUsernameChange === null && (
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: colors.accent.primary }]}
                onPress={handleSaveUsername}
                disabled={isUsernameSaving}
                activeOpacity={0.7}
              >
                {isUsernameSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Email</Text>
            <TextInput
              placeholder="your@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {emailChanged && (
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: colors.accent.primary }]}
                onPress={handleSaveEmail}
                disabled={isEmailSaving}
                activeOpacity={0.7}
              >
                {isEmailSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Change Password</Text>
            <TextInput
              placeholder="Enter current password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
            />
            <TextInput
              placeholder="Enter new password"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />
            <TextInput
              placeholder="Confirm new password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
            {hasPasswordInput && (
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  { backgroundColor: canSavePassword ? colors.accent.primary : colors.border.primary },
                ]}
                onPress={handleSavePassword}
                disabled={!canSavePassword || isPasswordSaving}
                activeOpacity={0.7}
              >
                {isPasswordSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={[
                    styles.saveButtonText,
                    { color: canSavePassword ? '#FFFFFF' : colors.text.tertiary },
                  ]}>Save</Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.dangerSection}>
            <TouchableOpacity
              style={[styles.deleteButton, { backgroundColor: colors.background.secondary }]}
              onPress={handleDeleteAccount}
              disabled={isDeleting}
              activeOpacity={0.7}
            >
              <Trash size={iconScale(24)} color={colors.status.error} weight="regular" />
              <Text style={[styles.deleteButtonText, { color: colors.status.error }]}>
                Delete Account
              </Text>
            </TouchableOpacity>
          </View>
      </KeyboardAwareScrollView>
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
  contentContainer: {
    paddingHorizontal: scale(20),
    paddingTop: scale(20),
    paddingBottom: scale(40),
    gap: scale(20),
  },
  section: {
    gap: scale(12),
  },
  sectionTitle: {
    ...Typography.body,
    fontWeight: '600',
    marginTop: scale(8),
  },
  usernameHint: {
    ...Typography.caption,
    marginTop: scale(-8),
    marginLeft: scale(4),
  },
  saveButton: {
    paddingVertical: scale(14),
    paddingHorizontal: scale(16),
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    ...Typography.body,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  dangerSection: {
    marginTop: scale(20),
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(14),
    paddingHorizontal: scale(16),
    borderRadius: 12,
    gap: scale(12),
  },
  deleteButtonText: {
    ...Typography.body,
    fontWeight: '500',
  },
});
