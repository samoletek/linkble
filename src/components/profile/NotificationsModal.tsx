import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  TouchableWithoutFeedback,
  PanResponder,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MODAL_HEIGHT = SCREEN_HEIGHT * 0.85;

interface NotificationsModalProps {
  visible: boolean;
  userId: string;
  onClose: () => void;
}

function getNotificationIcon(type: NotificationType, color: string) {
  const size = 24;
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

export default function NotificationsModal({
  visible,
  userId,
  onClose,
}: NotificationsModalProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      loadNotifications();
      translateY.setValue(0);
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

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 5,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100 || gestureState.vy > 0.5) {
          Animated.timing(translateY, {
            toValue: MODAL_HEIGHT,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            onClose();
          });
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 8,
          }).start();
        }
      },
    })
  ).current;

  const handleClose = () => {
    Animated.timing(translateY, {
      toValue: MODAL_HEIGHT,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
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
    <Modal
      visible={visible}
      animationType="none"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={handleClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[
            styles.container,
            {
              backgroundColor: colors.background.primary,
              height: MODAL_HEIGHT,
              paddingBottom: insets.bottom,
              transform: [{ translateY }],
            },
          ]}
        >
          <View {...panResponder.panHandlers} style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: colors.border.primary }]} />
          </View>

          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X size={24} color={colors.text.primary} weight="bold" />
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
              <Bell size={48} color={colors.text.tertiary} weight="thin" />
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
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handleContainer: {
    paddingTop: 8,
    paddingBottom: 4,
    alignItems: 'center',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  placeholder: {
    width: 40,
    height: 40,
  },
  title: {
    ...Typography.h3,
  },
  markAllButton: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  markAllText: {
    ...Typography.body,
    fontSize: 14,
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
    gap: 12,
  },
  emptyText: {
    ...Typography.body,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  notificationsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    ...Typography.body,
    fontSize: 15,
    marginBottom: 2,
  },
  notificationBody: {
    ...Typography.body,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  notificationTime: {
    ...Typography.caption,
    fontSize: 12,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
    marginTop: 4,
  },
});
