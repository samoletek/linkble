import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { User, GearSix } from 'phosphor-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../contexts/ThemeContext';
import { Typography } from '../../constants/typography';
import { useUserStore } from '../../stores/userStore';
import { useEventsStore } from '../../stores/eventsStore';
import type { ProfileStackParamList } from '../../types';
import { CATEGORIES } from '../../utils/constants';

type ProfileNavigationProp = NativeStackNavigationProp<ProfileStackParamList, 'ProfileHome'>;

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const navigation = useNavigation<ProfileNavigationProp>();

  // User store
  const profile = useUserStore((state) => state.profile);
  const isLoading = useUserStore((state) => state.isLoading);

  // Events store
  const categories = useEventsStore((state) => state.categories);
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

  // Get category display names from IDs
  const getInterestDisplayNames = (interestIds: number[]): string[] => {
    if (!interestIds || interestIds.length === 0) return [];

    return interestIds
      .map((id) => {
        // First try from store (Supabase categories)
        const dbCategory = categories.find((c) => c.id === id);
        if (dbCategory) return dbCategory.display_name;

        // Fallback to constants
        const localCategory = CATEGORIES.find((c) => c.id === id);
        if (localCategory) return localCategory.displayName;

        return '';
      })
      .filter(Boolean);
  };

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
    <View style={[styles.container, { backgroundColor: colors.background.primary, paddingTop: insets.top }]}>
      <View style={styles.header}>
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
        <View style={[styles.avatarContainer, { backgroundColor: colors.background.secondary }]}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
          ) : (
            <User size={48} color={colors.text.tertiary} weight="thin" />
          )}
        </View>
        <Text style={[styles.username, { color: colors.text.primary }]}>
          {profile?.full_name || 'User'}
        </Text>
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

      {profile?.interests && profile.interests.length > 0 && (
        <View style={styles.interestsSection}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Interests</Text>
          <View style={styles.interestsList}>
            {getInterestDisplayNames(profile.interests).map((interest, index) => (
              <View
                key={index}
                style={[styles.interestTag, { backgroundColor: colors.background.secondary }]}
              >
                <Text style={[styles.interestText, { color: colors.text.secondary }]}>
                  {interest}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
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
  username: {
    ...Typography.h2,
    marginTop: 16,
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
    paddingTop: 20,
  },
  sectionTitle: {
    ...Typography.h3,
    marginBottom: 12,
  },
  interestsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestTag: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  interestText: {
    ...Typography.caption,
  },
});
