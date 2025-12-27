import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Image,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Typography, Spacing } from '../../constants';
import { EventWithHost } from '../../types/database';
import { CATEGORY_COLORS } from '../../utils/constants';
import CategoryIcon from '../common/CategoryIcon';

interface EventCardProps {
  event: EventWithHost;
  onPress: (event: EventWithHost) => void;
}

// Format date for display
const formatEventDate = (isoDate: string): string => {
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

// Format time for display
const formatEventTime = (isoDate: string): string => {
  const date = new Date(isoDate);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

export default function EventCard({ event, onPress }: EventCardProps) {
  const { colors } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 5,
    }).start();
  };

  const categoryColor = event.category?.color || CATEGORY_COLORS[event.category?.name || ''] || colors.accent.primary;

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={() => onPress(event)}
    >
      <Animated.View
        style={[
          styles.card,
          {
            backgroundColor: colors.background.secondary,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Category indicator */}
        <View style={[styles.categoryIndicator, { backgroundColor: categoryColor }]} />

        {/* Event image or host avatar */}
        {event.image_url ? (
          <Image
            source={{ uri: event.image_url }}
            style={styles.eventImage}
            resizeMode="cover"
          />
        ) : event.host?.avatar_url ? (
          <Image
            source={{ uri: event.host.avatar_url }}
            style={styles.avatar}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.background.tertiary }]}>
            <Text style={[styles.avatarInitial, { color: colors.text.secondary }]}>
              {event.host?.full_name?.charAt(0) || '?'}
            </Text>
          </View>
        )}

        <View style={styles.content}>
          <Text
            style={[styles.title, { color: colors.text.primary }]}
            numberOfLines={1}
          >
            {event.title}
          </Text>

          <Text
            style={[styles.hostName, { color: colors.text.secondary }]}
            numberOfLines={1}
          >
            {event.host?.full_name || 'Unknown host'}
          </Text>

          <Text
            style={[styles.location, { color: colors.text.secondary }]}
            numberOfLines={1}
          >
            {event.location_address}
          </Text>

          <View style={styles.footer}>
            <Text style={[styles.time, { color: colors.text.secondary }]}>
              {formatEventDate(event.start_time)} at {formatEventTime(event.start_time)}
            </Text>
            <View style={[styles.categoryBadge, { backgroundColor: categoryColor + '20' }]}>
              <CategoryIcon
                categoryName={event.category?.name || 'sports_hobbies'}
                size={12}
                color={categoryColor}
              />
              <Text style={[styles.categoryText, { color: categoryColor }]}>
                {event.category?.display_name === 'Private Events' ? 'Private' : (event.category?.display_name || 'Event')}
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: Spacing.borderRadius.lg,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
    overflow: 'hidden',
  },
  categoryIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: Spacing.borderRadius.lg,
    borderBottomLeftRadius: Spacing.borderRadius.lg,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginLeft: 8,
  },
  eventImage: {
    width: 56,
    height: 56,
    borderRadius: 12,
    marginLeft: 8,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    ...Typography.h3,
  },
  content: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  title: {
    ...Typography.h4,
    marginBottom: 2,
  },
  hostName: {
    ...Typography.bodySmall,
    marginBottom: 2,
  },
  location: {
    ...Typography.bodySmall,
    marginBottom: 4,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  time: {
    ...Typography.caption,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  categoryText: {
    ...Typography.caption,
    fontWeight: '600',
  },
});
