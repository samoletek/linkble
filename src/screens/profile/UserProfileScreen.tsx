import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { User, CaretLeft, ChatCircle } from 'phosphor-react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../contexts/ThemeContext';
import { Typography } from '../../constants/typography';
import { getProfile } from '../../services/auth';
import { getOrCreateConversation } from '../../services/messages';
import { getInterestsByIds } from '../../utils/interests';
import { useUserStore } from '../../stores/userStore';
import { supabase } from '../../config/supabase';
import type { Profile } from '../../types/database';
import type { ChatStackParamList } from '../../types';

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
            <CaretLeft size={24} color={colors.text.primary} weight="regular" />
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
          <CaretLeft size={24} color={colors.text.primary} weight="regular" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileSection}>
          <View style={[styles.avatarContainer, { backgroundColor: colors.background.secondary }]}>
            {profile.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
            ) : (
              <User size={48} color={colors.text.tertiary} weight="thin" />
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
            <ChatCircle size={22} color="#FFFFFF" weight="bold" />
            <Text style={styles.chatButtonText}>Message</Text>
          </TouchableOpacity>
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
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    paddingTop: 24,
  },
  sectionTitle: {
    ...Typography.h3,
    marginBottom: 12,
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
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 12,
    gap: 8,
  },
  chatButtonText: {
    color: '#FFFFFF',
    ...Typography.bodyMedium,
  },
});
