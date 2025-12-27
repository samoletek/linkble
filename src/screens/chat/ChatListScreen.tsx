import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  RefreshControl,
  FlatList,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChatCircle, EnvelopeSimple, Crown } from 'phosphor-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Typography } from '../../constants/typography';
import { ChatStackParamList, ConversationWithUser } from '../../types';
import { getEventChats, getConversations, EventChatPreview } from '../../services/messages';

type ChatFilter = 'events' | 'direct';
type NavigationProp = NativeStackNavigationProp<ChatStackParamList>;

const HEADER_MAX_HEIGHT = 52;
const HEADER_MIN_HEIGHT = 40;
const TITLE_MAX_SIZE = 32;
const TITLE_MIN_SIZE = 20;

export default function ChatListScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const [filter, setFilter] = useState<ChatFilter>('events');
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [eventChats, setEventChats] = useState<EventChatPreview[]>([]);
  const [directChats, setDirectChats] = useState<ConversationWithUser[]>([]);
  const scrollY = useRef(new Animated.Value(0)).current;

  const loadChats = useCallback(async () => {
    const [events, directs] = await Promise.all([
      getEventChats(),
      getConversations(),
    ]);
    setEventChats(events);
    setDirectChats(directs);
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

  const headerHeight = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [HEADER_MAX_HEIGHT, HEADER_MIN_HEIGHT],
    extrapolate: 'clamp',
  });

  const titleSize = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [TITLE_MAX_SIZE, TITLE_MIN_SIZE],
    extrapolate: 'clamp',
  });

  const filterScale = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.85],
    extrapolate: 'clamp',
  });

  const filterMargin = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [12, 6],
    extrapolate: 'clamp',
  });

  const formatTime = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const renderEventChat = ({ item }: { item: EventChatPreview }) => (
    <TouchableOpacity
      style={[styles.chatItem, { borderBottomColor: colors.border.primary }]}
      onPress={() => navigation.navigate('EventChat', { eventId: item.event_id })}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        {item.event_image ? (
          <Image source={{ uri: item.event_image }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.accent.primary }]}>
            <ChatCircle size={24} color="#FFFFFF" weight="fill" />
          </View>
        )}
      </View>
      <View style={styles.chatContent}>
        <View style={styles.chatHeader}>
          <Text style={[styles.chatTitle, { color: colors.text.primary }]} numberOfLines={1}>
            {item.event_title}
          </Text>
          <Text style={[styles.chatTime, { color: colors.text.tertiary }]}>
            {formatTime(item.last_message_at)}
          </Text>
        </View>
        <View style={styles.chatSubtitle}>
          <Crown size={12} color={colors.accent.primary} weight="fill" />
          <Text style={[styles.hostName, { color: colors.text.tertiary }]} numberOfLines={1}>
            {item.host_name}
          </Text>
        </View>
        {item.last_message && (
          <Text style={[styles.lastMessage, { color: colors.text.secondary }]} numberOfLines={1}>
            {item.last_message}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderDirectChat = ({ item }: { item: ConversationWithUser }) => (
    <TouchableOpacity
      style={[styles.chatItem, { borderBottomColor: colors.border.primary }]}
      onPress={() => navigation.navigate('DirectChat', { conversationId: item.id })}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        {item.other_user?.avatar_url ? (
          <Image source={{ uri: item.other_user.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.accent.primary }]}>
            <Text style={styles.avatarInitial}>
              {item.other_user?.full_name?.charAt(0).toUpperCase() || '?'}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.chatContent}>
        <View style={styles.chatHeader}>
          <Text style={[styles.chatTitle, { color: colors.text.primary }]} numberOfLines={1}>
            {item.other_user?.full_name || 'Unknown'}
          </Text>
          <Text style={[styles.chatTime, { color: colors.text.tertiary }]}>
            {formatTime(item.last_message?.created_at || item.last_message_at)}
          </Text>
        </View>
        {item.last_message && (
          <Text style={[styles.lastMessage, { color: colors.text.secondary }]} numberOfLines={1}>
            {item.last_message.content}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => {
    const isEvents = filter === 'events';
    return (
      <View style={styles.emptyContent}>
        {isEvents ? (
          <ChatCircle size={64} color={colors.text.tertiary} weight="thin" />
        ) : (
          <EnvelopeSimple size={64} color={colors.text.tertiary} weight="thin" />
        )}
        <Text style={[styles.placeholder, { color: colors.text.secondary }]}>
          {isEvents ? 'No event chats yet' : 'No messages yet'}
        </Text>
        <Text style={[styles.hint, { color: colors.text.tertiary }]}>
          {isEvents
            ? 'Join an event to start chatting'
            : 'Start a conversation from someone\'s profile'}
        </Text>
      </View>
    );
  };

  const currentData = filter === 'events' ? eventChats : directChats;
  const isEmpty = currentData.length === 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background.primary, paddingTop: insets.top }]}>
      <Animated.View
        style={[
          styles.header,
          {
            height: headerHeight,
          }
        ]}
      >
        <Animated.Text
          style={[
            styles.title,
            {
              color: colors.text.primary,
              fontSize: titleSize,
            }
          ]}
        >
          Chats
        </Animated.Text>
      </Animated.View>

      <Animated.View
        style={[
          styles.filterContainer,
          {
            transform: [{ scale: filterScale }],
            marginBottom: filterMargin,
            transformOrigin: 'left center',
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.filterButton,
            { backgroundColor: filter === 'events' ? colors.accent.primary : colors.background.tertiary },
          ]}
          onPress={() => setFilter('events')}
        >
          <Text
            style={[
              styles.filterText,
              { color: filter === 'events' ? '#FFFFFF' : colors.text.secondary },
            ]}
          >
            Events
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            { backgroundColor: filter === 'direct' ? colors.accent.primary : colors.background.tertiary },
          ]}
          onPress={() => setFilter('direct')}
        >
          <Text
            style={[
              styles.filterText,
              { color: filter === 'direct' ? '#FFFFFF' : colors.text.secondary },
            ]}
          >
            Direct
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
        </View>
      ) : isEmpty ? (
        <Animated.ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.accent.primary}
            />
          }
        >
          {renderEmptyState()}
        </Animated.ScrollView>
      ) : (
        <FlatList
          data={currentData as any}
          keyExtractor={(item: any) => item.event_id || item.id}
          renderItem={filter === 'events' ? renderEventChat as any : renderDirectChat as any}
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
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
    paddingHorizontal: 20,
    justifyContent: 'flex-end',
    paddingBottom: 8,
  },
  title: {
    fontWeight: '700',
    lineHeight: 38,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
  },
  scrollContent: {
    flexGrow: 1,
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
    paddingBottom: 100,
  },
  placeholder: {
    ...Typography.body,
    marginTop: 16,
  },
  hint: {
    ...Typography.caption,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  chatItem: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  avatarContainer: {
    marginRight: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  chatContent: {
    flex: 1,
    justifyContent: 'center',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  chatTitle: {
    ...Typography.body,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  chatTime: {
    ...Typography.caption,
    fontSize: 12,
  },
  chatSubtitle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  hostName: {
    ...Typography.caption,
    marginLeft: 4,
  },
  lastMessage: {
    ...Typography.caption,
  },
});
