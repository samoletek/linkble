import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { ChatCircle, Crown, Trash } from 'phosphor-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Typography } from '../../constants/typography';

interface SwipeableChatItemProps {
  type: 'event' | 'direct';
  title: string;
  subtitle?: string;
  imageUrl?: string | null;
  lastMessage?: string | null;
  time: string;
  unreadCount?: number;
  onPress: () => void;
  onDelete: () => void;
}

export default function SwipeableChatItem({
  type,
  title,
  subtitle,
  imageUrl,
  lastMessage,
  time,
  unreadCount = 0,
  onPress,
  onDelete,
}: SwipeableChatItemProps) {
  const { colors } = useTheme();
  const swipeableRef = useRef<Swipeable>(null);

  const renderRightActions = (
    _progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const translateX = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [0, 80],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View
        style={[
          styles.deleteButton,
          { backgroundColor: colors.status.error, transform: [{ translateX }] },
        ]}
      >
        <TouchableOpacity
          style={styles.deleteButtonInner}
          onPress={() => {
            swipeableRef.current?.close();
            onDelete();
          }}
          activeOpacity={0.8}
        >
          <Trash size={24} color="#FFFFFF" weight="bold" />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      rightThreshold={40}
      overshootRight={false}
      friction={2}
    >
      <TouchableOpacity
        style={[styles.chatItem, { borderBottomColor: colors.border.primary, backgroundColor: colors.background.primary }]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.accent.primary }]}>
              {type === 'event' ? (
                <ChatCircle size={24} color="#FFFFFF" weight="fill" />
              ) : (
                <Text style={styles.avatarInitial}>
                  {title.charAt(0).toUpperCase()}
                </Text>
              )}
            </View>
          )}
        </View>
        <View style={styles.chatContent}>
          <View style={styles.chatHeader}>
            <Text style={[styles.chatTitle, { color: colors.text.primary }]} numberOfLines={1}>
              {title}
            </Text>
            <View style={styles.chatHeaderRight}>
              <Text style={[styles.chatTime, { color: colors.text.tertiary }]}>
                {time}
              </Text>
              {unreadCount > 0 && (
                <View style={[styles.unreadBadge, { backgroundColor: colors.text.tertiary }]}>
                  <Text style={styles.unreadCount}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
          </View>
          {type === 'event' && subtitle && (
            <View style={styles.chatSubtitle}>
              <Crown size={12} color={colors.accent.primary} weight="fill" />
              <Text style={[styles.hostName, { color: colors.text.tertiary }]} numberOfLines={1}>
                {subtitle}
              </Text>
            </View>
          )}
          {lastMessage && (
            <Text style={[styles.lastMessage, { color: colors.text.secondary }]} numberOfLines={1}>
              {lastMessage}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
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
  chatHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadCount: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
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
  deleteButton: {
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonInner: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
