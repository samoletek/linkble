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

export interface Event {
  id: string;
  title: string;
  description: string;
  category: string;
  date: string;
  time: string;
  location: string;
  hostName: string;
  hostAvatar?: string;
  image?: string;
  spotsTotal: number;
  spotsTaken: number;
}

interface EventCardProps {
  event: Event;
  onPress: (event: Event) => void;
}

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
        {event.image ? (
          <Image
            source={{ uri: event.image }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder, { backgroundColor: colors.background.tertiary }]} />
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
            {event.hostName}
          </Text>

          <Text
            style={[styles.location, { color: colors.text.secondary }]}
            numberOfLines={1}
          >
            {event.location}
          </Text>

          <Text style={[styles.time, { color: colors.text.secondary }]}>
            {event.time}
          </Text>
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
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: Spacing.borderRadius.md,
  },
  imagePlaceholder: {
    backgroundColor: '#1F2937',
  },
  content: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  title: {
    ...Typography.h4,
    marginBottom: 4,
  },
  hostName: {
    ...Typography.bodySmall,
    marginBottom: 2,
  },
  location: {
    ...Typography.bodySmall,
    marginBottom: 2,
  },
  time: {
    ...Typography.bodySmall,
  },
});
