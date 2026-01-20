import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft, Archive, ChatCircle, Crown, Clock } from 'phosphor-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Typography } from '../../constants/typography';
import { scale, fontScale, iconScale } from '../../utils/responsive';
import { ChatStackParamList } from '../../types';
import { getArchivedEventChats, ArchivedEventChatPreview } from '../../services/messages';

type NavigationProp = NativeStackNavigationProp<ChatStackParamList>;

export default function ArchivedChatsScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [archivedChats, setArchivedChats] = useState<ArchivedEventChatPreview[]>([]);

  const loadChats = useCallback(async () => {
    const chats = await getArchivedEventChats();
    setArchivedChats(chats);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadChats().finally(() => setIsLoading(false));
    }, [loadChats])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadChats();
    setRefreshing(false);
  };

  const formatTimeRemaining = (endedAt: Date) => {
    const now = new Date();
    const expiresAt = new Date(endedAt.getTime() + 24 * 60 * 60 * 1000);
    const remaining = expiresAt.getTime() - now.getTime();

    if (remaining <= 0) return 'Expiring...';

    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m left`;
    }
    return `${minutes}m left`;
  };

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderChatItem = ({ item }: { item: ArchivedEventChatPreview }) => (
    <TouchableOpacity
      style={[styles.chatItem, { borderBottomColor: colors.border.primary }]}
      onPress={() => navigation.navigate('EventChat', { eventId: item.event_id })}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        {item.event_image ? (
          <Image source={{ uri: item.event_image }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.text.tertiary }]}>
            <ChatCircle size={iconScale(24)} color="#FFFFFF" weight="fill" />
          </View>
        )}
        <View style={[styles.archivedBadge, { backgroundColor: colors.background.secondary }]}>
          <Archive size={iconScale(12)} color={colors.text.tertiary} weight="fill" />
        </View>
      </View>
      <View style={styles.chatContent}>
        <View style={styles.chatHeader}>
          <Text style={[styles.chatTitle, { color: colors.text.primary }]} numberOfLines={1}>
            {item.event_title}
          </Text>
        </View>
        <View style={styles.chatSubtitle}>
          <Crown size={iconScale(12)} color={colors.text.tertiary} weight="fill" />
          <Text style={[styles.hostName, { color: colors.text.tertiary }]} numberOfLines={1}>
            {item.host_name}
          </Text>
        </View>
        <View style={styles.expiryRow}>
          <Clock size={iconScale(12)} color={colors.status.warning} weight="fill" />
          <Text style={[styles.expiryText, { color: colors.status.warning }]}>
            {formatTimeRemaining(item.archived_at)}
          </Text>
          <Text style={[styles.eventDateText, { color: colors.text.tertiary }]}>
            Event: {formatEventDate(item.start_time)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContent}>
      <Archive size={iconScale(64)} color={colors.text.tertiary} weight="thin" />
      <Text style={[styles.placeholder, { color: colors.text.secondary }]}>
        No archived chats
      </Text>
      <Text style={[styles.hint, { color: colors.text.tertiary }]}>
        Event chats appear here for 24 hours after the event ends
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background.primary, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={iconScale(24)} color={colors.text.primary} weight="bold" />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text.primary }]}>Archived Chats</Text>
        <View style={styles.headerSpacer} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
        </View>
      ) : archivedChats.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={archivedChats}
          keyExtractor={(item) => item.event_id}
          renderItem={renderChatItem}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.accent.primary}
            />
          }
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(20),
    paddingVertical: scale(12),
  },
  backButton: {
    width: scale(40),
  },
  title: {
    fontSize: fontScale(18),
    fontWeight: '600',
  },
  headerSpacer: {
    width: scale(40),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: scale(100),
  },
  placeholder: {
    ...Typography.body,
    marginTop: scale(16),
  },
  hint: {
    ...Typography.caption,
    marginTop: scale(8),
    textAlign: 'center',
    paddingHorizontal: scale(40),
  },
  chatItem: {
    flexDirection: 'row',
    paddingHorizontal: scale(20),
    paddingVertical: scale(14),
    borderBottomWidth: 1,
  },
  avatarContainer: {
    marginRight: scale(14),
    position: 'relative',
  },
  avatar: {
    width: scale(52),
    height: scale(52),
    borderRadius: scale(26),
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  archivedBadge: {
    position: 'absolute',
    bottom: scale(-2),
    right: scale(-2),
    width: scale(20),
    height: scale(20),
    borderRadius: scale(10),
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatContent: {
    flex: 1,
    justifyContent: 'center',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(2),
  },
  chatTitle: {
    ...Typography.body,
    fontWeight: '600',
    flex: 1,
    marginRight: scale(8),
  },
  chatSubtitle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(4),
  },
  hostName: {
    ...Typography.caption,
    marginLeft: scale(4),
  },
  expiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
  },
  expiryText: {
    ...Typography.caption,
    fontSize: fontScale(11),
    fontWeight: '500',
  },
  eventDateText: {
    ...Typography.caption,
    fontSize: fontScale(11),
    marginLeft: scale(8),
  },
});
