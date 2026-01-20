import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import {
  X,
  Bell,
  ChatCircle,
  UserPlus,
  CheckCircle,
  XCircle,
  Calendar,
  Warning,
} from 'phosphor-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Typography } from '../../constants/typography';
import { getNotifications, markAsRead, markAllAsRead } from '../../services/notifications';
import type { Notification, NotificationType } from '../../types/database';
import { scale, fontScale, iconScale, verticalScale } from '../../utils/responsive';
import BaseModal from '../common/BaseModal';

function getNotificationIcon(type: NotificationType, color: string) {
  const size = iconScale(24);
  switch (type) {
    case 'join_request':
      return <UserPlus size={size} color={color} weight="regular" />;
    case 'request_accepted':
      return <CheckCircle size={size} color={color} weight="regular" />;
    case 'request_rejected':
      return <XCircle size={size} color={color} weight="regular" />;
    case 'new_message':
    case 'new_dm':
      return <ChatCircle size={size} color={color} weight="regular" />;
    case 'event_nearby':
    case 'event_starting_1h':
    case 'event_starting_30m':
    case 'event_started':
      return <Calendar size={size} color={color} weight="regular" />;
    case 'event_cancelled':
    case 'kicked_from_event':
      return <Warning size={size} color={color} weight="regular" />;
    default:
      return <Bell size={size} color={color} weight="regular" />;
  }
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

interface NotificationsModalProps {
  visible: boolean;
  userId: string;
  onClose: () => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function NotificationsModal({
  visible,
  userId,
  onClose,
}: NotificationsModalProps) {
  const { colors } = useTheme();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      loadNotifications();
    }
  }, [visible]);

  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      const data = await getNotifications(userId);
      setNotifications(data);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotificationPress = async (notification: Notification) => {
    if (!notification.is_read) {
      try {
        await markAsRead(notification.id);
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id ? { ...n, is_read: true } : n
          )
        );
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead(userId);
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true }))
      );
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const hasUnread = notifications.some((n) => !n.is_read);

  return (
    <BaseModal
      visible={visible}
      onClose={onClose}
      height={SCREEN_HEIGHT * 0.85}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <X size={iconScale(24)} color={colors.text.primary} weight="bold" />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text.primary }]}>Notifications</Text>
        <View style={styles.placeholder} />
      </View>

      {hasUnread && (
        <TouchableOpacity
          onPress={handleMarkAllAsRead}
          style={styles.markAllButton}
        >
          <Text style={[styles.markAllText, { color: colors.accent.primary }]}>
            Mark all as read
          </Text>
        </TouchableOpacity>
      )}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Bell size={iconScale(48)} color={colors.text.tertiary} weight="thin" />
          <Text style={[styles.emptyText, { color: colors.text.tertiary }]}>
            No notifications yet
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.notificationsContainer}
          showsVerticalScrollIndicator={false}
        >
          {notifications.map((notification) => (
            <TouchableOpacity
              key={notification.id}
              onPress={() => handleNotificationPress(notification)}
              activeOpacity={0.7}
              style={[
                styles.notificationItem,
                {
                  backgroundColor: notification.is_read
                    ? colors.background.primary
                    : colors.background.secondary,
                },
              ]}
            >
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: colors.background.tertiary },
                ]}
              >
                {getNotificationIcon(notification.type, colors.text.secondary)}
              </View>
              <View style={styles.notificationContent}>
                <Text
                  style={[
                    styles.notificationTitle,
                    {
                      color: colors.text.primary,
                      fontWeight: notification.is_read ? '500' : '600',
                    },
                  ]}
                  numberOfLines={1}
                >
                  {notification.title}
                </Text>
                <Text
                  style={[styles.notificationBody, { color: colors.text.secondary }]}
                  numberOfLines={2}
                >
                  {notification.body}
                </Text>
                <Text style={[styles.notificationTime, { color: colors.text.tertiary }]}>
                  {formatTimeAgo(notification.created_at)}
                </Text>
              </View>
              {!notification.is_read && (
                <View
                  style={[styles.unreadDot, { backgroundColor: colors.accent.primary }]}
                />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </BaseModal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingBottom: scale(12),
  },
  closeButton: {
    width: scale(40),
    height: scale(40),
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  placeholder: {
    width: scale(40),
    height: scale(40),
  },
  title: {
    ...Typography.h2,
    fontSize: fontScale(16),
    lineHeight: fontScale(24),
  },
  markAllButton: {
    paddingHorizontal: scale(20),
    paddingBottom: scale(12),
  },
  markAllText: {
    ...Typography.body,
    fontSize: fontScale(14),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: scale(12),
  },
  emptyText: {
    ...Typography.body,
    fontSize: fontScale(16),
  },
  scrollView: {
    flex: 1,
  },
  notificationsContainer: {
    paddingHorizontal: scale(16),
    paddingBottom: scale(40),
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: scale(12),
    borderRadius: 12,
    marginBottom: scale(8),
  },
  iconContainer: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(12),
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    ...Typography.body,
    fontSize: fontScale(15),
    marginBottom: scale(2),
  },
  notificationBody: {
    ...Typography.body,
    fontSize: fontScale(14),
    lineHeight: fontScale(20),
    marginBottom: scale(4),
  },
  notificationTime: {
    ...Typography.caption,
  },
  unreadDot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    marginLeft: scale(8),
    marginTop: scale(4),
  },
});
