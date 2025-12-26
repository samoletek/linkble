import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, TextInput, Keyboard, TouchableWithoutFeedback, Alert, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { User, GearSix, PencilSimple, PlusCircle } from 'phosphor-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../contexts/ThemeContext';
import { Typography } from '../../constants/typography';
import { useUserStore } from '../../stores/userStore';
import { useEventsStore } from '../../stores/eventsStore';
import type { ProfileStackParamList } from '../../types';
import { getInterestsByIds } from '../../utils/interests';
import InterestsModal from '../../components/profile/InterestsModal';
import DraggableInterestsList from '../../components/profile/DraggableInterestsList';

type ProfileNavigationProp = NativeStackNavigationProp<ProfileStackParamList, 'ProfileHome'>;

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const navigation = useNavigation<ProfileNavigationProp>();

  // User store
  const profile = useUserStore((state) => state.profile);
  const isLoading = useUserStore((state) => state.isLoading);
  const updateProfile = useUserStore((state) => state.updateProfile);
  const uploadAvatar = useUserStore((state) => state.uploadAvatar);
  const deleteAvatar = useUserStore((state) => state.deleteAvatar);

  // Avatar modal state
  const [showAvatarModal, setShowAvatarModal] = useState(false);

  // Interests modal state
  const [showInterestsModal, setShowInterestsModal] = useState(false);

  // Edit name state
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(profile?.full_name || '');
  const nameInputRef = useRef<TextInput>(null);

  // Events store
  const userEvents = useEventsStore((state) => state.userEvents);
  const loadUserEvents = useEventsStore((state) => state.loadUserEvents);

  // Load user events
  useEffect(() => {
    if (profile?.id) {
      loadUserEvents(profile.id);
    }
  }, [profile?.id]);

  const handleSettingsPress = () => {
    navigation.navigate('Settings');
  };

  const handleEditName = () => {
    setEditedName(profile?.full_name || '');
    setIsEditingName(true);
    setTimeout(() => nameInputRef.current?.focus(), 100);
  };

  const handleSaveName = async () => {
    if (editedName.trim() && editedName !== profile?.full_name) {
      await updateProfile({ full_name: editedName.trim() });
    }
    setIsEditingName(false);
  };

  const handleDismiss = () => {
    if (isEditingName) {
      Keyboard.dismiss();
      handleSaveName();
    }
  };

  const handleAvatarPress = () => {
    setShowAvatarModal(true);
  };

  const handlePickImage = async () => {
    setShowAvatarModal(false);

    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert('Permission required', 'Please allow access to your photo library.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        await uploadAvatar({
          uri: asset.uri,
          type: 'image/jpeg',
          name: 'avatar.jpg',
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to upload image');
    }
  };

  const handleDeleteAvatar = async () => {
    setShowAvatarModal(false);
    await deleteAvatar();
  };

  const handleSaveInterests = async (interests: number[]) => {
    await updateProfile({ interests });
  };

  const handleReorderInterests = async (reorderedIds: number[]) => {
    await updateProfile({ interests: reorderedIds });
  };

  // Get interests from profile
  const userInterests = getInterestsByIds(profile?.interests || []);

  // Count hosted and participated events
  const hostedCount = userEvents.filter((e) => e.host_id === profile?.id).length;
  const participatedCount = userEvents.length - hostedCount;

  if (isLoading && !profile) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: colors.background.primary }]}>
        <ActivityIndicator size="large" color={colors.accent.primary} />
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={handleDismiss}>
      <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
        <View style={[styles.header, { paddingTop: insets.top }]}>
        <Text style={[styles.title, { color: colors.text.primary }]}>Profile</Text>
        <TouchableOpacity
          style={[styles.settingsButton, { backgroundColor: colors.background.secondary }]}
          onPress={handleSettingsPress}
          activeOpacity={0.7}
        >
          <GearSix size={24} color={colors.text.secondary} weight="regular" />
        </TouchableOpacity>
      </View>

      <View style={styles.profileSection}>
        <TouchableOpacity
          style={[styles.avatarContainer, { backgroundColor: colors.background.secondary }]}
          onPress={handleAvatarPress}
          activeOpacity={0.7}
        >
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
          ) : (
            <User size={48} color={colors.text.tertiary} weight="thin" />
          )}
        </TouchableOpacity>
        <View style={styles.usernameRow}>
          {isEditingName ? (
            <TextInput
              ref={nameInputRef}
              style={[styles.usernameInput, { color: colors.text.primary, borderBottomColor: colors.accent.primary }]}
              value={editedName}
              onChangeText={setEditedName}
              onBlur={handleSaveName}
              onSubmitEditing={handleSaveName}
              returnKeyType="done"
              autoFocus
            />
          ) : (
            <>
              <Text style={[styles.username, { color: colors.text.primary }]}>
                {profile?.full_name || 'User'}
              </Text>
              <TouchableOpacity onPress={handleEditName} style={styles.editButton}>
                <PencilSimple size={18} color={colors.text.tertiary} weight="regular" />
              </TouchableOpacity>
            </>
          )}
        </View>
        {profile?.username && (
          <Text style={[styles.handle, { color: colors.text.secondary }]}>
            @{profile.username}
          </Text>
        )}
        {profile?.bio && (
          <Text style={[styles.bio, { color: colors.text.secondary }]}>
            {profile.bio}
          </Text>
        )}
      </View>

      <View style={styles.statsSection}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.text.primary }]}>{hostedCount}</Text>
          <Text style={[styles.statLabel, { color: colors.text.tertiary }]}>Hosted</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border.primary }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.text.primary }]}>{participatedCount}</Text>
          <Text style={[styles.statLabel, { color: colors.text.tertiary }]}>Joined</Text>
        </View>
      </View>

      <View style={styles.interestsSection}>
        <View style={styles.interestsHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Interests</Text>
          <TouchableOpacity
            onPress={() => setShowInterestsModal(true)}
            style={[styles.addInterestsButton, { backgroundColor: colors.background.secondary }]}
            activeOpacity={0.7}
          >
            <PlusCircle size={20} color={colors.accent.primary} weight="fill" />
          </TouchableOpacity>
        </View>
        {userInterests.length > 0 ? (
          <DraggableInterestsList
            interests={userInterests}
            onReorder={handleReorderInterests}
          />
        ) : (
          <TouchableOpacity
            onPress={() => setShowInterestsModal(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.addInterestsHint, { color: colors.text.tertiary }]}>
              Tap + to add your interests
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {showInterestsModal && (
        <InterestsModal
          visible={showInterestsModal}
          selectedInterests={profile?.interests || []}
          onClose={() => setShowInterestsModal(false)}
          onSave={handleSaveInterests}
        />
      )}

      <Modal
        visible={showAvatarModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAvatarModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowAvatarModal(false)}
          />
          <View style={[styles.modalContent, { backgroundColor: colors.background.primary }]}>
            <TouchableOpacity
              style={[styles.modalButton, { borderBottomColor: colors.border.primary }]}
              onPress={handlePickImage}
              activeOpacity={0.7}
            >
              <Text style={[styles.modalButtonText, { color: colors.text.primary }]}>
                Upload photo
              </Text>
            </TouchableOpacity>
            {profile?.avatar_url && (
              <TouchableOpacity
                style={styles.modalButton}
                onPress={handleDeleteAvatar}
                activeOpacity={0.7}
              >
                <Text style={[styles.modalButtonText, { color: colors.status.error }]}>
                  Delete photo
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.modalCancelButton, { backgroundColor: colors.background.secondary }]}
              onPress={() => setShowAvatarModal(false)}
              activeOpacity={0.7}
            >
              <Text style={[styles.modalButtonText, { color: colors.text.primary }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: {
    ...Typography.h1,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  username: {
    ...Typography.h2,
  },
  usernameInput: {
    ...Typography.h2,
    borderBottomWidth: 1,
    paddingVertical: 4,
    minWidth: 100,
    textAlign: 'center',
  },
  editButton: {
    position: 'absolute',
    right: -30,
    padding: 4,
  },
  handle: {
    ...Typography.body,
    marginTop: 4,
  },
  bio: {
    ...Typography.body,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    marginHorizontal: 20,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  statValue: {
    ...Typography.h2,
  },
  statLabel: {
    ...Typography.caption,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
  },
  interestsSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  interestsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    ...Typography.h3,
  },
  addInterestsButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  interestsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  interestTag: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  interestText: {
    ...Typography.body,
    fontSize: 14,
  },
  addInterestsHint: {
    ...Typography.body,
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    paddingBottom: 34,
  },
  modalButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  modalButtonText: {
    ...Typography.body,
    textAlign: 'center',
    fontSize: 17,
  },
  modalCancelButton: {
    marginTop: 8,
    marginHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
  },
});
