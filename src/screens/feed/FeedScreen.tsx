import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { Typography } from '../../constants/typography';
import EventCard from '../../components/events/EventCard';
import EventDetailModal from '../../components/events/EventDetailModal';
import { useEventsStore } from '../../stores/eventsStore';
import { EventWithHost } from '../../types/database';

const HEADER_MAX_HEIGHT = 52;
const HEADER_MIN_HEIGHT = 40;
const TITLE_MAX_SIZE = 32;
const TITLE_MIN_SIZE = 20;

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  // Store
  const events = useEventsStore((state) => state.events);
  const isLoading = useEventsStore((state) => state.isLoading);
  const error = useEventsStore((state) => state.error);
  const loadNearbyEvents = useEventsStore((state) => state.loadNearbyEvents);
  const loadCategories = useEventsStore((state) => state.loadCategories);

  // Local state
  const [selectedEvent, setSelectedEvent] = useState<EventWithHost | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;

  // Load data on mount
  useEffect(() => {
    loadCategories();
    // TODO: Get actual user location
    // For now, use default location (New York)
    loadNearbyEvents(40.7484, -73.9857);
  }, []);

  const handleEventPress = (event: EventWithHost) => {
    setSelectedEvent(event);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    // TODO: Get actual user location
    await loadNearbyEvents(40.7484, -73.9857);
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

  const renderItem = ({ item }: { item: EventWithHost }) => (
    <EventCard event={item} onPress={handleEventPress} />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
        No events nearby
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.text.secondary }]}>
        Be the first to create an event in your area
      </Text>
    </View>
  );

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
          Events
        </Animated.Text>
      </Animated.View>

      {isLoading && events.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.status.error }]}>
            {error}
          </Text>
        </View>
      ) : (
        <Animated.FlatList
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            events.length === 0 && styles.listContentEmpty,
          ]}
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.accent.primary}
            />
          }
        />
      )}

      <EventDetailModal
        visible={modalVisible}
        event={selectedEvent}
        onClose={handleCloseModal}
      />
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
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  listContentEmpty: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorText: {
    ...Typography.body,
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    ...Typography.h2,
    marginBottom: 8,
  },
  emptySubtitle: {
    ...Typography.body,
    textAlign: 'center',
  },
});
