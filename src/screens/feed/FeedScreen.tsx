import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Modal,
  Pressable,
  TextInput,
  Keyboard,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MagnifyingGlass, NavigationArrow } from 'phosphor-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Typography, Spacing } from '../../constants';
import EventCard from '../../components/events/EventCard';
import EventDetailModal from '../../components/events/EventDetailModal';
import { useEventsStore } from '../../stores/eventsStore';
import { useLocationStore } from '../../stores/locationStore';
import { EventWithHost } from '../../types/database';

const HEADER_MAX_HEIGHT = 52;
const HEADER_MIN_HEIGHT = 40;
const TITLE_MAX_SIZE = 32;
const TITLE_MIN_SIZE = 20;

const RADIUS_OPTIONS = [10, 20, 30, 50000];

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const navigation = useNavigation<any>();

  // Events store
  const events = useEventsStore((state) => state.events);
  const isLoading = useEventsStore((state) => state.isLoading);
  const error = useEventsStore((state) => state.error);
  const searchRadius = useEventsStore((state) => state.searchRadius);
  const setSearchRadius = useEventsStore((state) => state.setSearchRadius);
  const loadNearbyEvents = useEventsStore((state) => state.loadNearbyEvents);
  const loadCategories = useEventsStore((state) => state.loadCategories);

  // Location store
  const effectiveLocation = useLocationStore((state) => state.effectiveLocation);
  const manualAddress = useLocationStore((state) => state.manualAddress);
  const isLocationLoading = useLocationStore((state) => state.isLoading);
  const locationError = useLocationStore((state) => state.error);
  const requestGpsLocation = useLocationStore((state) => state.requestGpsLocation);
  const setManualAddress = useLocationStore((state) => state.setManualAddress);
  const clearManualAddress = useLocationStore((state) => state.clearManualAddress);

  // Local state
  const [selectedEvent, setSelectedEvent] = useState<EventWithHost | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [radiusModalVisible, setRadiusModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'public' | 'private'>('public');
  const [addressInput, setAddressInput] = useState(manualAddress || '');
  const [eventSearchQuery, setEventSearchQuery] = useState('');

  // Filtered and sorted events (nearest in time first)
  // Private tab: category.display_name === 'Private Events'
  // Public tab: all other categories
  const filteredEvents = useMemo(() => {
    return events
      .filter(event => {
        const isPrivateCategory = event.category?.display_name === 'Private Events';
        const matchesFilter = filter === 'public' ? !isPrivateCategory : isPrivateCategory;
        const matchesSearch = !eventSearchQuery.trim() ||
          event.title.toLowerCase().includes(eventSearchQuery.toLowerCase().trim());
        return matchesFilter && matchesSearch;
      })
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  }, [events, filter, eventSearchQuery]);

  const scrollY = useRef(new Animated.Value(0)).current;

  // Initialize location on mount
  useEffect(() => {
    loadCategories();
    initializeLocation();
  }, []);

  // Reload events when location or radius changes
  useEffect(() => {
    if (effectiveLocation) {
      loadNearbyEvents(effectiveLocation.latitude, effectiveLocation.longitude);
    }
  }, [effectiveLocation, searchRadius]);

  // Sync address input when modal opens
  useEffect(() => {
    if (radiusModalVisible) {
      setAddressInput(manualAddress || '');
    }
  }, [radiusModalVisible, manualAddress]);

  const initializeLocation = async () => {
    // Try GPS first
    const gpsGranted = await requestGpsLocation();

    // If GPS denied and no manual address set, show hint
    if (!gpsGranted && !manualAddress) {
      // User will see empty state prompting them to set location
    }
  };

  const handleEventPress = (event: EventWithHost) => {
    setSelectedEvent(event);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
  };

  const handleOpenChat = (eventId: string) => {
    navigation.navigate('Chat', {
      screen: 'EventChat',
      params: { eventId },
      initial: false,
    });
  };

  const handleJoinSuccess = () => {
    // Refresh events after join/leave
    if (effectiveLocation) {
      loadNearbyEvents(effectiveLocation.latitude, effectiveLocation.longitude);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    if (effectiveLocation) {
      await loadNearbyEvents(effectiveLocation.latitude, effectiveLocation.longitude);
    }
    setRefreshing(false);
  };

  const handleRadiusSelect = (radius: number) => {
    setSearchRadius(radius);
  };

  const handleAddressSubmit = async () => {
    if (!addressInput.trim()) return;

    Keyboard.dismiss();
    const result = await setManualAddress(addressInput.trim());

    if (result.success) {
      setRadiusModalVisible(false);
    } else {
      Alert.alert('Error', result.error || 'Could not find address');
    }
  };

  const handleUseGps = async () => {
    const granted = await requestGpsLocation();
    if (granted) {
      clearManualAddress();
      setAddressInput('');
      setRadiusModalVisible(false);
    } else {
      Alert.alert(
        'Location Access',
        'Please enable location access in your device settings to use GPS.'
      );
    }
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

  const renderItem = ({ item }: { item: EventWithHost }) => (
    <EventCard event={item} onPress={handleEventPress} />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
        No events nearby
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.text.secondary }]}>
        Try increasing the search radius or create an event
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
            { backgroundColor: filter === 'public' ? colors.accent.primary : colors.background.tertiary },
          ]}
          onPress={() => setFilter('public')}
        >
          <Text
            style={[
              styles.filterText,
              { color: filter === 'public' ? '#FFFFFF' : colors.text.secondary },
            ]}
          >
            Public
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            { backgroundColor: filter === 'private' ? colors.accent.primary : colors.background.tertiary },
          ]}
          onPress={() => setFilter('private')}
        >
          <Text
            style={[
              styles.filterText,
              { color: filter === 'private' ? '#FFFFFF' : colors.text.secondary },
            ]}
          >
            Private
          </Text>
        </TouchableOpacity>

        <View style={styles.filterSpacer} />

        <TouchableOpacity
          style={[styles.radiusButton, { backgroundColor: colors.background.tertiary }]}
          onPress={() => setRadiusModalVisible(true)}
        >
          <MagnifyingGlass size={16} color={colors.text.secondary} weight="bold" />
        </TouchableOpacity>
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
          data={filteredEvents}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
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
        onOpenChat={handleOpenChat}
        onJoinSuccess={handleJoinSuccess}
      />

      {/* Location & Radius Modal */}
      <Modal
        visible={radiusModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setRadiusModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            Keyboard.dismiss();
            setRadiusModalVisible(false);
          }}
        >
          <Pressable
            style={[
              styles.radiusModal,
              { backgroundColor: colors.background.secondary }
            ]}
            onPress={() => Keyboard.dismiss()}
          >
            {/* Location Section */}
            <Text style={[styles.radiusModalTitle, { color: colors.text.primary }]}>
              Location
            </Text>

            {!effectiveLocation && (
              <Text style={[styles.locationHint, { color: colors.text.secondary }]}>
                Set your location to see nearby events
              </Text>
            )}

            {/* Address input */}
            <View style={[styles.addressInputContainer, { backgroundColor: colors.background.tertiary, borderColor: colors.border.primary }]}>
              <MagnifyingGlass size={18} color={colors.text.tertiary} />
              <TextInput
                style={[styles.addressInput, { color: colors.text.primary }]}
                placeholder="Enter address or city..."
                placeholderTextColor={colors.text.tertiary}
                value={addressInput}
                onChangeText={setAddressInput}
                onSubmitEditing={handleAddressSubmit}
                returnKeyType="search"
                autoCorrect={false}
              />
              {isLocationLoading && (
                <ActivityIndicator size="small" color={colors.accent.primary} />
              )}
            </View>

            <TouchableOpacity
              style={[styles.addressSubmitButton, { backgroundColor: colors.accent.primary }]}
              onPress={handleAddressSubmit}
              disabled={!addressInput.trim() || isLocationLoading}
            >
              <Text style={styles.addressSubmitText}>
                {isLocationLoading ? 'Searching...' : 'Set Location'}
              </Text>
            </TouchableOpacity>

            {/* Use GPS button */}
            <TouchableOpacity
              style={[styles.useGpsButton, { borderColor: colors.border.primary }]}
              onPress={handleUseGps}
            >
              <NavigationArrow size={16} color={colors.accent.primary} weight="bold" />
              <Text style={[styles.useGpsText, { color: colors.accent.primary }]}>
                Use my location
              </Text>
            </TouchableOpacity>

            {locationError && (
              <Text style={[styles.locationErrorText, { color: colors.status.error }]}>
                {locationError}
              </Text>
            )}

            {/* Event Search */}
            <Text style={[styles.radiusModalTitle, { color: colors.text.primary, marginTop: 20 }]}>
              Search Events
            </Text>
            <View style={[styles.addressInputContainer, { backgroundColor: colors.background.tertiary, borderColor: colors.border.primary }]}>
              <MagnifyingGlass size={18} color={colors.text.tertiary} />
              <TextInput
                style={[styles.addressInput, { color: colors.text.primary }]}
                placeholder="Event name..."
                placeholderTextColor={colors.text.tertiary}
                value={eventSearchQuery}
                onChangeText={setEventSearchQuery}
                returnKeyType="search"
                autoCorrect={false}
              />
            </View>

            {/* Radius Section */}
            <Text style={[styles.radiusModalTitle, { color: colors.text.primary, marginTop: 12 }]}>
              Search Radius
            </Text>

            <View style={styles.radiusOptionsRow}>
              {RADIUS_OPTIONS.map((radius) => (
                <TouchableOpacity
                  key={radius}
                  style={[
                    styles.radiusChip,
                    { backgroundColor: searchRadius === radius ? colors.accent.primary : colors.background.tertiary }
                  ]}
                  onPress={() => handleRadiusSelect(radius)}
                >
                  <Text
                    style={[
                      styles.radiusChipText,
                      { color: searchRadius === radius ? '#FFFFFF' : colors.text.secondary }
                    ]}
                  >
                    {radius >= 50000 ? 'All' : `${radius} km`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Done button */}
            <TouchableOpacity
              style={[styles.doneButton, { backgroundColor: colors.background.tertiary }]}
              onPress={() => setRadiusModalVisible(false)}
            >
              <Text style={[styles.doneButtonText, { color: colors.text.primary }]}>Done</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
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
    alignItems: 'center',
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
  filterSpacer: {
    flex: 1,
  },
  radiusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 4,
  },
  radiusText: {
    fontSize: 13,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    flexGrow: 1,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radiusModal: {
    width: '90%',
    maxWidth: 340,
    borderRadius: Spacing.borderRadius.lg,
    padding: 20,
  },
  radiusModalTitle: {
    ...Typography.h4,
    marginBottom: 12,
  },
  locationHint: {
    ...Typography.caption,
    textAlign: 'center',
    marginBottom: 12,
  },
  addressInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Spacing.borderRadius.md,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
    marginBottom: 10,
  },
  addressInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
    margin: 0,
    height: 44,
    textAlignVertical: 'center',
  },
  addressSubmitButton: {
    paddingVertical: 12,
    borderRadius: Spacing.borderRadius.md,
    alignItems: 'center',
    marginBottom: 10,
  },
  addressSubmitText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  useGpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: Spacing.borderRadius.md,
    borderWidth: 1,
    gap: 6,
    marginBottom: 8,
  },
  useGpsText: {
    fontWeight: '600',
    fontSize: 14,
  },
  locationErrorText: {
    ...Typography.caption,
    textAlign: 'center',
    marginBottom: 8,
  },
  radiusOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  radiusChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  radiusChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  doneButton: {
    paddingVertical: 12,
    borderRadius: Spacing.borderRadius.md,
    alignItems: 'center',
  },
  doneButtonText: {
    fontWeight: '600',
    fontSize: 15,
  },
  radiusOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  radiusOptionText: {
    ...Typography.body,
  },
});
