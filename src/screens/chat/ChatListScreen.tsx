import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChatCircle, EnvelopeSimple, Archive, CaretRight } from 'phosphor-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Typography } from '../../constants/typography';
import { ChatStackParamList, ConversationWithUser } from '../../types';
import { getEventChats, getConversations, EventChatPreview, leaveEventChat, hideConversation, getArchivedChatsCount, subscribeToChatListUpdates, unsubscribe } from '../../services/messages';
import SwipeableChatItem from '../../components/chat/SwipeableChatItem';
import { scale, fontScale, iconScale } from '../../utils/responsive';

type ChatFilter = 'events' | 'direct';
type NavigationProp = NativeStackNavigationProp<ChatStackParamList>;

const HEADER_MAX_HEIGHT = scale(52);
const HEADER_MIN_HEIGHT = scale(40);
const TITLE_MAX_SIZE = fontScale(32);
const TITLE_MIN_SIZE = fontScale(20);

export default function ChatListScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const [filter, setFilter] = useState<ChatFilter>('events');
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [eventChats, setEventChats] = useState<EventChatPreview[]>([]);
  const [directChats, setDirectChats] = useState<ConversationWithUser[]>([]);
  const [archivedCount, setArchivedCount] = useState(0);
  const scrollY = useRef(new Animated.Value(0)).current;

  const loadChats = useCallback(async () => {
    const [events, directs, archived] = await Promise.all([
      getEventChats(),
      getConversations(),
      getArchivedChatsCount(),
    ]);
    setEventChats(events);
    setDirectChats(directs);
    setArchivedCount(archived);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadChats().finally(() => setIsLoading(false));
    }, [loadChats])
  );

  // Real-time subscription for new messages
  useEffect(() => {
    const { messagesChannel, directMessagesChannel } = subscribeToChatListUpdates(() => {
      loadChats();
    });

    return () => {
      unsubscribe(messagesChannel);
      unsubscribe(directMessagesChannel);
    };
  }, [loadChats]);

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
    outputRange: [scale(12), scale(6)],
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

  const handleDeleteEventChat = (eventId: string, eventTitle: string) => {
    Alert.alert(
      'Delete Chat',
      `Are you sure you want to delete "${eventTitle}"? You will leave this event.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await leaveEventChat(eventId);
            if (error) {
              Alert.alert('Error', error.message);
            } else {
              setEventChats(prev => prev.filter(chat => chat.event_id !== eventId));
            }
          },
        },
      ]
    );
  };

  const handleDeleteDirectChat = (conversationId: string, userName: string) => {
    Alert.alert(
      'Delete Chat',
      `Are you sure you want to delete your conversation with ${userName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await hideConversation(conversationId);
            if (error) {
              Alert.alert('Error', error.message);
            } else {
              setDirectChats(prev => prev.filter(chat => chat.id !== conversationId));
            }
          },
        },
      ]
    );
  };

  const renderEventChat = ({ item }: { item: EventChatPreview }) => (
    <SwipeableChatItem
      type="event"
      title={item.event_title}
      subtitle={item.host_name}
      imageUrl={item.event_image}
      lastMessage={item.last_message}
      time={formatTime(item.last_message_at)}
      unreadCount={item.unread_count}
      onPress={() => navigation.navigate('EventChat', { eventId: item.event_id })}
      onDelete={() => handleDeleteEventChat(item.event_id, item.event_title)}
    />
  );

  const renderDirectChat = ({ item }: { item: ConversationWithUser }) => (
    <SwipeableChatItem
      type="direct"
      title={item.other_user?.full_name || 'Unknown'}
      imageUrl={item.other_user?.avatar_url}
      lastMessage={item.last_message?.content}
      time={formatTime(item.last_message?.created_at || item.last_message_at)}
      unreadCount={item.unread_count}
      onPress={() => navigation.navigate('DirectChat', { conversationId: item.id })}
      onDelete={() => handleDeleteDirectChat(item.id, item.other_user?.full_name || 'Unknown')}
    />
  );

  const renderArchiveButton = () => {
    if (filter !== 'events' || archivedCount === 0) return null;

    return (
      <TouchableOpacity
        style={[styles.archiveButton, { backgroundColor: colors.background.secondary, borderBottomColor: colors.border.primary }]}
        onPress={() => navigation.navigate('ArchivedChats')}
        activeOpacity={0.7}
      >
        <View style={[styles.archiveIcon, { backgroundColor: colors.text.tertiary }]}>
          <Archive size={iconScale(20)} color="#FFFFFF" weight="fill" />
        </View>
        <View style={styles.archiveContent}>
          <Text style={[styles.archiveTitle, { color: colors.text.primary }]}>
            Archived Chats
          </Text>
          <Text style={[styles.archiveSubtitle, { color: colors.text.tertiary }]}>
            {archivedCount} {archivedCount === 1 ? 'chat' : 'chats'} from ended events
          </Text>
        </View>
        <CaretRight size={iconScale(20)} color={colors.text.tertiary} weight="bold" />
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => {
    const isEvents = filter === 'events';
    return (
      <View style={styles.emptyContent}>
        {isEvents ? (
          <ChatCircle size={iconScale(64)} color={colors.text.tertiary} weight="thin" />
        ) : (
          <EnvelopeSimple size={iconScale(64)} color={colors.text.tertiary} weight="thin" />
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
    <GestureHandlerRootView style={[styles.container, { backgroundColor: colors.background.primary, paddingTop: insets.top }]}>
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
          {renderArchiveButton()}
          {renderEmptyState()}
        </Animated.ScrollView>
      ) : (
        <Animated.FlatList
          data={currentData as any}
          keyExtractor={(item: any) => item.event_id || item.id}
          renderItem={filter === 'events' ? renderEventChat as any : renderDirectChat as any}
          ListHeaderComponent={renderArchiveButton}
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
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: scale(20),
    justifyContent: 'flex-end',
    paddingBottom: scale(8),
  },
  title: {
    fontWeight: '700',
    lineHeight: fontScale(38),
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: scale(20),
    gap: scale(12),
  },
  filterButton: {
    paddingVertical: scale(8),
    paddingHorizontal: scale(20),
    borderRadius: scale(20),
  },
  filterText: {
    fontSize: fontScale(14),
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
  archiveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(20),
    paddingVertical: scale(14),
    borderBottomWidth: 1,
  },
  archiveIcon: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(14),
  },
  archiveContent: {
    flex: 1,
  },
  archiveTitle: {
    ...Typography.body,
    fontWeight: '600',
    marginBottom: scale(2),
  },
  archiveSubtitle: {
    ...Typography.caption,
  },
});
