import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { CaretLeft, User } from 'phosphor-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Typography } from '../../constants/typography';
import { scale, fontScale, iconScale } from '../../utils/responsive';
import { getBlockedUsers, unblockUser, BlockedUserWithProfile } from '../../services';
import { useAuthStore } from '../../stores/authStore';

export default function BlockedUsersScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const navigation = useNavigation();
  const user = useAuthStore((state) => state.user);

  const [blockedUsers, setBlockedUsers] = useState<BlockedUserWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [unblocking, setUnblocking] = useState<string | null>(null);

  const loadBlockedUsers = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getBlockedUsers(user.id);
      setBlockedUsers(data);
    } catch (error) {
      console.error('Failed to load blocked users:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadBlockedUsers();
  }, [loadBlockedUsers]);

  const handleBack = () => {
    navigation.goBack();
  };

  const handleUnblock = (blockedUser: BlockedUserWithProfile) => {
    Alert.alert(
      'Unblock User',
      `Are you sure you want to unblock ${blockedUser.blocked_profile.full_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          onPress: async () => {
            if (!user) return;
            setUnblocking(blockedUser.blocked_id);
            try {
              await unblockUser(user.id, blockedUser.blocked_id);
              setBlockedUsers((prev) =>
                prev.filter((u) => u.blocked_id !== blockedUser.blocked_id)
              );
            } catch (error) {
              console.error('Failed to unblock user:', error);
              Alert.alert('Error', 'Failed to unblock user. Please try again.');
            } finally {
              setUnblocking(null);
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: BlockedUserWithProfile }) => (
    <View style={[styles.userItem, { borderBottomColor: colors.border.primary }]}>
      <View style={styles.userInfo}>
        {item.blocked_profile.avatar_url ? (
          <Image source={{ uri: item.blocked_profile.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: colors.background.tertiary }]}>
            <User size={iconScale(24)} color={colors.text.tertiary} weight="regular" />
          </View>
        )}
        <View style={styles.userDetails}>
          <Text style={[styles.userName, { color: colors.text.primary }]}>
            {item.blocked_profile.full_name}
          </Text>
          {item.blocked_profile.username && (
            <Text style={[styles.userHandle, { color: colors.text.tertiary }]}>
              @{item.blocked_profile.username}
            </Text>
          )}
        </View>
      </View>
      <TouchableOpacity
        style={[styles.unblockButton, { backgroundColor: colors.background.tertiary }]}
        onPress={() => handleUnblock(item)}
        disabled={unblocking === item.blocked_id}
        activeOpacity={0.7}
      >
        {unblocking === item.blocked_id ? (
          <ActivityIndicator size="small" color={colors.text.primary} />
        ) : (
          <Text style={[styles.unblockText, { color: colors.text.primary }]}>Unblock</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyText, { color: colors.text.tertiary }]}>
        No blocked users
      </Text>
    </View>
  );

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
        <Text style={[styles.title, { color: colors.text.primary }]}>Blocked Users</Text>
        <View style={styles.placeholder} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
        </View>
      ) : (
        <FlatList
          data={blockedUsers}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            blockedUsers.length === 0 && styles.emptyList,
          ]}
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
        />
      )}
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
  },
  placeholder: {
    width: scale(40),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: scale(20),
  },
  emptyList: {
    flex: 1,
  },
  userItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: scale(12),
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
  },
  avatarPlaceholder: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    justifyContent: 'center',
    alignItems: 'center',
  },
  userDetails: {
    marginLeft: scale(12),
    flex: 1,
  },
  userName: {
    ...Typography.body,
    fontWeight: '500',
  },
  userHandle: {
    ...Typography.caption,
    marginTop: scale(2),
  },
  unblockButton: {
    paddingHorizontal: scale(16),
    paddingVertical: scale(8),
    borderRadius: 8,
    minWidth: scale(80),
    alignItems: 'center',
  },
  unblockText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    ...Typography.body,
  },
});
