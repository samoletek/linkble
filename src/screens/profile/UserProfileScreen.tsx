import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  Modal,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { User, CaretLeft, ChatCircle, DotsThreeVertical, Flag, Prohibit } from 'phosphor-react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../contexts/ThemeContext';
import { Typography, Spacing } from '../../constants';
import { scale, fontScale, iconScale } from '../../utils/responsive';
import { getProfile } from '../../services/auth';
import { getOrCreateConversation } from '../../services/messages';
import { getInterestsByIds } from '../../utils/interests';
import { useUserStore } from '../../stores/userStore';
import { blockUser, reportUser } from '../../services/users';
import { supabase } from '../../config/supabase';
import type { Profile, ReportReason } from '../../types/database';
import type { ChatStackParamList } from '../../types';

const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'spam', label: 'Spam' },
  { value: 'inappropriate_content', label: 'Inappropriate content' },
  { value: 'scam', label: 'Scam' },
  { value: 'violence', label: 'Violence' },
  { value: 'other', label: 'Other' },
];

type UserProfileRouteProp = RouteProp<ChatStackParamList, 'UserProfile'>;
type NavigationProp = NativeStackNavigationProp<ChatStackParamList>;

export default function UserProfileScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<UserProfileRouteProp>();
  const { userId } = route.params;

  const currentUser = useUserStore((state) => state.profile);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ hosted: 0, joined: 0 });
  const [showMenu, setShowMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      setIsLoading(true);
      const userProfile = await getProfile(userId);
      setProfile(userProfile);

      // Load user stats
      if (userProfile) {
        const { count: hostedCount } = await supabase
          .from('events')
          .select('*', { count: 'exact', head: true })
          .eq('host_id', userId)
          .eq('status', 'active');

        const { count: joinedCount } = await supabase
          .from('event_participants')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('status', 'accepted');

        setStats({
          hosted: hostedCount || 0,
          joined: joinedCount || 0,
        });
      }

      setIsLoading(false);
    };

    loadProfile();
  }, [userId]);

  const handleStartChat = async () => {
    if (!currentUser || !profile) return;

    const { conversationId, error } = await getOrCreateConversation(profile.id);

    if (!error && conversationId) {
      navigation.navigate('DirectChat', { conversationId });
    }
  };

  const handleBlock = useCallback(() => {
    if (!currentUser || !profile) return;

    Alert.alert(
      'Block User',
      `Are you sure you want to block ${profile.full_name}? They won't be able to message you or view your profile.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              await blockUser(currentUser.id, profile.id);
              setShowMenu(false);
              Alert.alert('User Blocked', `${profile.full_name} has been blocked.`);
              navigation.goBack();
            } catch (error) {
              console.error('Failed to block user:', error);
              Alert.alert('Error', 'Failed to block user. Please try again.');
            }
          },
        },
      ]
    );
  }, [currentUser, profile, navigation]);

  const handleReport = useCallback(() => {
    setShowMenu(false);
    setShowReportModal(true);
  }, []);

  const submitReport = useCallback(async () => {
    if (!currentUser || !profile || !selectedReason) return;

    try {
      await reportUser(currentUser.id, profile.id, selectedReason);
      setShowReportModal(false);
      setSelectedReason(null);
      Alert.alert('Report Submitted', 'Thank you for your report. We will review it shortly.');
    } catch (error) {
      console.error('Failed to submit report:', error);
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    }
  }, [currentUser, profile, selectedReason]);

  const userInterests = getInterestsByIds(profile?.interests || []);
  const isOwnProfile = currentUser?.id === userId;

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: colors.background.primary }]}>
        <ActivityIndicator size="large" color={colors.accent.primary} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.background.secondary }]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <CaretLeft size={iconScale(24)} color={colors.text.primary} weight="regular" />
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.text.secondary }]}>
            User not found
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.background.secondary }]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <CaretLeft size={iconScale(24)} color={colors.text.primary} weight="regular" />
        </TouchableOpacity>
        <View style={styles.headerSpacer} />
        {!isOwnProfile && (
          <TouchableOpacity
            style={[styles.menuButton, { backgroundColor: colors.background.secondary }]}
            onPress={() => setShowMenu(true)}
            activeOpacity={0.7}
          >
            <DotsThreeVertical size={iconScale(24)} color={colors.text.primary} weight="bold" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileSection}>
          <View style={[styles.avatarContainer, { backgroundColor: colors.background.secondary }]}>
            {profile.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
            ) : (
              <User size={iconScale(48)} color={colors.text.tertiary} weight="thin" />
            )}
          </View>
          <Text style={[styles.username, { color: colors.text.primary }]}>
            {profile.full_name}
          </Text>
          {profile.username && (
            <Text style={[styles.handle, { color: colors.text.secondary }]}>
              @{profile.username}
            </Text>
          )}
          {profile.bio && (
            <Text style={[styles.bio, { color: colors.text.secondary }]}>
              {profile.bio}
            </Text>
          )}
        </View>

        <View style={styles.statsSection}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text.primary }]}>{stats.hosted}</Text>
            <Text style={[styles.statLabel, { color: colors.text.tertiary }]}>Hosted</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border.primary }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text.primary }]}>{stats.joined}</Text>
            <Text style={[styles.statLabel, { color: colors.text.tertiary }]}>Joined</Text>
          </View>
        </View>

        {userInterests.length > 0 && (
          <View style={styles.interestsSection}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Interests</Text>
            <View style={styles.interestsList}>
              {userInterests.map((interest) => (
                <View
                  key={interest.id}
                  style={[styles.interestTag, { backgroundColor: colors.background.secondary }]}
                >
                  <Text style={[styles.interestText, { color: colors.text.primary }]}>
                    {interest.name}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {!isOwnProfile && (
        <View style={[styles.footer, { paddingBottom: insets.bottom || 16 }]}>
          <TouchableOpacity
            style={[styles.chatButton, { backgroundColor: colors.accent.primary }]}
            onPress={handleStartChat}
            activeOpacity={0.8}
          >
            <ChatCircle size={iconScale(22)} color="#FFFFFF" weight="bold" />
            <Text style={styles.chatButtonText}>Message</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Menu Modal */}
      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View
            style={[styles.menuContent, { backgroundColor: colors.background.secondary }]}
            onStartShouldSetResponder={() => true}
          >
            <TouchableOpacity
              style={[styles.menuItem, { borderBottomColor: colors.border.primary }]}
              onPress={handleReport}
              activeOpacity={0.7}
            >
              <Flag size={iconScale(20)} color={colors.text.primary} weight="regular" />
              <Text style={[styles.menuItemText, { color: colors.text.primary }]}>
                Report User
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                handleBlock();
              }}
              activeOpacity={0.7}
            >
              <Prohibit size={iconScale(20)} color={colors.status.error} weight="regular" />
              <Text style={[styles.menuItemText, { color: colors.status.error }]}>
                Block User
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Report Modal */}
      <Modal
        visible={showReportModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReportModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowReportModal(false)}
        >
          <View
            style={[styles.reportContent, { backgroundColor: colors.background.secondary }]}
            onStartShouldSetResponder={() => true}
          >
            <Text style={[styles.reportTitle, { color: colors.text.primary }]}>
              Report User
            </Text>
            <Text style={[styles.reportSubtitle, { color: colors.text.secondary }]}>
              Why are you reporting this user?
            </Text>
            <View style={styles.reasonsList}>
              {REPORT_REASONS.map((reason) => (
                <TouchableOpacity
                  key={reason.value}
                  style={[
                    styles.reasonChip,
                    {
                      backgroundColor: selectedReason === reason.value
                        ? colors.accent.primary
                        : colors.background.tertiary,
                    },
                  ]}
                  onPress={() => setSelectedReason(reason.value)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.reasonChipText,
                      {
                        color: selectedReason === reason.value
                          ? '#FFFFFF'
                          : colors.text.primary,
                      },
                    ]}
                  >
                    {reason.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.reportButtons}>
              <TouchableOpacity
                style={[styles.reportButton, { backgroundColor: colors.background.tertiary }]}
                onPress={() => {
                  setShowReportModal(false);
                  setSelectedReason(null);
                }}
              >
                <Text style={[styles.reportButtonText, { color: colors.text.secondary }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.reportButton,
                  {
                    backgroundColor: selectedReason
                      ? colors.status.error
                      : colors.background.tertiary,
                  },
                ]}
                onPress={submitReport}
                disabled={!selectedReason}
              >
                <Text
                  style={[
                    styles.reportButtonText,
                    { color: selectedReason ? '#FFFFFF' : colors.text.tertiary },
                  ]}
                >
                  Submit
                </Text>
              </TouchableOpacity>
            </View>
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
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(20),
  },
  backButton: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    ...Typography.body,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: scale(24),
  },
  avatarContainer: {
    width: scale(100),
    height: scale(100),
    borderRadius: scale(50),
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: scale(100),
    height: scale(100),
    borderRadius: scale(50),
  },
  username: {
    ...Typography.h2,
    marginTop: scale(16),
  },
  handle: {
    ...Typography.body,
    marginTop: scale(4),
  },
  bio: {
    ...Typography.body,
    marginTop: scale(8),
    textAlign: 'center',
    paddingHorizontal: scale(40),
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: scale(20),
    marginHorizontal: scale(20),
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: scale(32),
  },
  statValue: {
    ...Typography.h2,
  },
  statLabel: {
    ...Typography.caption,
    marginTop: scale(4),
  },
  statDivider: {
    width: 1,
    height: scale(40),
  },
  interestsSection: {
    paddingHorizontal: scale(20),
    paddingTop: scale(24),
  },
  sectionTitle: {
    ...Typography.h3,
    marginBottom: scale(12),
  },
  interestsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(10),
  },
  interestTag: {
    paddingHorizontal: scale(16),
    paddingVertical: scale(10),
    borderRadius: scale(20),
  },
  interestText: {
    ...Typography.body,
    fontSize: fontScale(14),
  },
  footer: {
    paddingHorizontal: scale(20),
    paddingTop: scale(16),
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: scale(52),
    borderRadius: 12,
    gap: scale(8),
  },
  chatButtonText: {
    color: '#FFFFFF',
    ...Typography.bodyMedium,
  },
  headerSpacer: {
    flex: 1,
  },
  menuButton: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: scale(20),
  },
  menuContent: {
    width: '80%',
    maxWidth: scale(300),
    borderRadius: 12,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scale(16),
    paddingHorizontal: scale(20),
    gap: scale(12),
    borderBottomWidth: 1,
  },
  menuItemText: {
    ...Typography.body,
    fontWeight: '500',
  },
  reportContent: {
    width: '90%',
    maxWidth: scale(340),
    borderRadius: 16,
    padding: scale(24),
  },
  reportTitle: {
    ...Typography.h3,
    marginBottom: scale(6),
  },
  reportSubtitle: {
    ...Typography.body,
    marginBottom: scale(20),
  },
  reasonsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(10),
  },
  reasonChip: {
    paddingHorizontal: scale(16),
    paddingVertical: scale(10),
    borderRadius: scale(20),
  },
  reasonChipText: {
    ...Typography.body,
    fontSize: fontScale(14),
  },
  reportButtons: {
    flexDirection: 'row',
    gap: scale(12),
    marginTop: scale(24),
  },
  reportButton: {
    flex: 1,
    paddingVertical: scale(12),
    borderRadius: Spacing.borderRadius.md,
    alignItems: 'center',
  },
  reportButtonText: {
    ...Typography.bodyMedium,
  },
});
