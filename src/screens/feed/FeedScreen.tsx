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
  ScrollView,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MagnifyingGlass, NavigationArrow, Plus, Users, X } from 'phosphor-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Typography, Spacing } from '../../constants';
import EventCard from '../../components/events/EventCard';
import EventDetailModal from '../../components/events/EventDetailModal';
import CreateEventModal from '../../components/events/CreateEventModal';
import { useEventsStore } from '../../stores/eventsStore';
import { useLocationStore } from '../../stores/locationStore';
import { EventWithHost } from '../../types/database';
import { scale, fontScale, iconScale, verticalScale } from '../../utils/responsive';

type DateFilter = 'all' | 'today' | 'week' | 'month';

const DATE_FILTER_OPTIONS: { value: DateFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
];

const HEADER_MAX_HEIGHT = scale(52);
const HEADER_MIN_HEIGHT = scale(40);
const TITLE_MAX_SIZE = fontScale(32);
const TITLE_MIN_SIZE = fontScale(20);

const RADIUS_OPTIONS = [10, 20, 30, 50000];

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const navigation = useNavigation<any>();

  // Events store
  const events = useEventsStore((state) => state.events);
  const isLoading = useEventsStore((state) => state.isLoading);
  const hasInitiallyLoaded = useEventsStore((state) => state.hasInitiallyLoaded);
  const error = useEventsStore((state) => state.error);
  const searchRadius = useEventsStore((state) => state.searchRadius);
  const setSearchRadius = useEventsStore((state) => state.setSearchRadius);
  const loadAllEvents = useEventsStore((state) => state.loadAllEvents);
  const loadNearbyEvents = useEventsStore((state) => state.loadNearbyEvents);
  const loadCategories = useEventsStore((state) => state.loadCategories);

  // Location store
  const effectiveLocation = useLocationStore((state) => state.effectiveLocation);
  const manualAddress = useLocationStore((state) => state.manualAddress);
  const isLocationHydrated = useLocationStore((state) => state.isHydrated);
  const isLocationLoading = useLocationStore((state) => state.isLoading);
  const locationError = useLocationStore((state) => state.error);
  const requestGpsLocation = useLocationStore((state) => state.requestGpsLocation);
  const setManualAddress = useLocationStore((state) => state.setManualAddress);
  const clearManualAddress = useLocationStore((state) => state.clearManualAddress);

  // Categories from store
  const categories = useEventsStore((state) => state.categories);

  // Local state
  const [selectedEvent, setSelectedEvent] = useState<EventWithHost | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [radiusModalVisible, setRadiusModalVisible] = useState(false);
  const [applyingFilters, setApplyingFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'public' | 'private'>('public');
  const [addressInput, setAddressInput] = useState(manualAddress || '');
  const [eventSearchQuery, setEventSearchQuery] = useState('');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<EventWithHost | null>(null);

  // Filter state (editing in modal)
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const [tempRadius, setTempRadius] = useState(searchRadius);

  // Applied filter state (used for actual filtering)
  const [appliedFilters, setAppliedFilters] = useState({
    dateFilter: 'all' as DateFilter,
    selectedCategories: [] as number[],
    showAvailableOnly: false,
    eventSearchQuery: '',
  });

  // Available categories for filter (excluding Private Events for public tab)
  const filterCategories = useMemo(() => {
    return categories.filter(cat => cat.display_name !== 'Private Events');
  }, [categories]);

  // Filtered and sorted events (nearest in time first)
  // Private tab: category.display_name === 'Private Events'
  // Public tab: all other categories
  const filteredEvents = useMemo(() => {
    const now = new Date();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

    return events
      .filter(event => {
        const isPrivateCategory = event.category?.display_name === 'Private Events';
        const matchesTab = filter === 'public' ? !isPrivateCategory : isPrivateCategory;

        // Search filter (using applied filters)
        const matchesSearch = !appliedFilters.eventSearchQuery.trim() ||
          event.title.toLowerCase().includes(appliedFilters.eventSearchQuery.toLowerCase().trim());

        // Date filter (using applied filters)
        const eventDate = new Date(event.start_time);
        let matchesDate = true;
        if (appliedFilters.dateFilter === 'today') {
          matchesDate = eventDate <= todayEnd;
        } else if (appliedFilters.dateFilter === 'week') {
          matchesDate = eventDate <= weekEnd;
        } else if (appliedFilters.dateFilter === 'month') {
          matchesDate = eventDate <= monthEnd;
        }

        // Category filter (using applied filters)
        const matchesCategory = appliedFilters.selectedCategories.length === 0 ||
          appliedFilters.selectedCategories.includes(event.category_id);

        // Available spots filter (using applied filters)
        let matchesAvailable = true;
        if (appliedFilters.showAvailableOnly) {
          const participantsCount = (event as any).participants_count || 1;
          matchesAvailable = participantsCount < event.max_participants;
        }

        return matchesTab && matchesSearch && matchesDate && matchesCategory && matchesAvailable;
      })
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  }, [events, filter, appliedFilters]);

  const scrollY = useRef(new Animated.Value(0)).current;

  // Load categories on mount
  useEffect(() => {
    loadCategories();
  }, []);

  // Initialize location after hydration
  useEffect(() => {
    if (isLocationHydrated) {
      initializeLocation();
    }
  }, [isLocationHydrated]);

  // Reload events when location or radius changes (wait for hydration)
  useEffect(() => {
    if (!isLocationHydrated) return;

    if (effectiveLocation) {
      loadNearbyEvents(effectiveLocation.latitude, effectiveLocation.longitude);
    } else {
      // No location set - load all events worldwide
      loadAllEvents();
    }
  }, [effectiveLocation, searchRadius, isLocationHydrated]);

  // Sync address input when modal opens
  useEffect(() => {
    if (radiusModalVisible) {
      setAddressInput(manualAddress || '');
    }
  }, [radiusModalVisible, manualAddress]);

  // Reset applying filters state when loading completes
  useEffect(() => {
    if (applyingFilters && !isLoading) {
      setApplyingFilters(false);
    }
  }, [isLoading, applyingFilters]);

  const initializeLocation = async () => {
    // If user has set manual address, don't override with GPS
    if (manualAddress) {
      return;
    }

    // Try GPS only if no manual address
    await requestGpsLocation();
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
    } else {
      loadAllEvents();
    }
  };

  const handleEditEvent = (event: EventWithHost) => {
    setEventToEdit(event);
    setEditModalVisible(true);
  };

  const handleEditSuccess = () => {
    // Refresh events after edit
    if (effectiveLocation) {
      loadNearbyEvents(effectiveLocation.latitude, effectiveLocation.longitude);
    } else {
      loadAllEvents();
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    if (effectiveLocation) {
      await loadNearbyEvents(effectiveLocation.latitude, effectiveLocation.longitude);
    } else {
      await loadAllEvents();
    }
    setRefreshing(false);
  };

  const handleRadiusSelect = (radius: number) => {
    setTempRadius(radius);
  };

  const handleCategoryToggle = (categoryId: number) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const [pendingGps, setPendingGps] = useState(false);

  const handleUseGps = async () => {
    const granted = await requestGpsLocation();
    if (granted) {
      setAddressInput('');
      setPendingGps(true);
    } else {
      Alert.alert(
        'Location Access',
        'Please enable location access in your device settings to use GPS.'
      );
    }
  };

  const openFilterModal = () => {
    // Load applied filters into editing state
    setDateFilter(appliedFilters.dateFilter);
    setSelectedCategories([...appliedFilters.selectedCategories]);
    setShowAvailableOnly(appliedFilters.showAvailableOnly);
    setEventSearchQuery(appliedFilters.eventSearchQuery);
    setTempRadius(searchRadius);
    setAddressInput(manualAddress || '');
    setPendingGps(false);
    setRadiusModalVisible(true);
  };

  const closeFilterModalWithoutApply = () => {
    // Just close without applying changes
    Keyboard.dismiss();
    setRadiusModalVisible(false);
  };

  const applyFiltersAndClose = async () => {
    Keyboard.dismiss();

    // Check if location or radius changed (will trigger reload)
    const locationChanged = pendingGps ||
      (addressInput.trim() && addressInput.trim() !== manualAddress) ||
      (!addressInput.trim() && manualAddress);
    const radiusChanged = tempRadius !== searchRadius;

    // Apply GPS location if requested
    if (pendingGps) {
      clearManualAddress();
      setPendingGps(false);
    } else if (addressInput.trim() && addressInput.trim() !== manualAddress) {
      // Apply address if entered
      const result = await setManualAddress(addressInput.trim());
      if (!result.success) {
        Alert.alert('Error', result.error || 'Could not find address');
        return;
      }
    } else if (!addressInput.trim() && manualAddress) {
      // Clear address if input was cleared
      clearManualAddress();
    }
    // Apply radius
    setSearchRadius(tempRadius);
    // Apply filters
    setAppliedFilters({
      dateFilter,
      selectedCategories: [...selectedCategories],
      showAvailableOnly,
      eventSearchQuery,
    });
    setRadiusModalVisible(false);

    // Show loading if location or radius changed
    if (locationChanged || radiusChanged) {
      setApplyingFilters(true);
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
    outputRange: [scale(12), scale(6)],
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
        Set your location or enter
      </Text>
      <View style={styles.emptySubtitleRow}>
        <Text style={[styles.emptySubtitle, { color: colors.text.secondary }]}>
          address in{' '}
        </Text>
        <MagnifyingGlass size={iconScale(16)} color={colors.text.secondary} weight="bold" />
        <Text style={[styles.emptySubtitle, { color: colors.text.secondary }]}>
          {' '}to see events.
        </Text>
      </View>
      <View style={[styles.emptySubtitleRow, { marginTop: scale(4) }]}>
        <Text style={[styles.emptySubtitle, { color: colors.text.secondary }]}>
          Or create your own in{' '}
        </Text>
        <Plus size={iconScale(16)} color={colors.text.secondary} weight="bold" />
        <Text style={[styles.emptySubtitle, { color: colors.text.secondary }]}>!</Text>
      </View>
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
          styles.filterRow,
          {
            marginBottom: filterMargin,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.filterButtonsContainer,
            {
              transform: [{ scale: filterScale }],
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
        </Animated.View>

        <Animated.View
          style={{
            transform: [{ scale: filterScale }],
            transformOrigin: 'right center',
          }}
        >
          <TouchableOpacity
            style={[styles.radiusButton, { backgroundColor: colors.background.tertiary }]}
            onPress={openFilterModal}
          >
            <MagnifyingGlass size={iconScale(16)} color={colors.text.secondary} weight="bold" />
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>

      {!isLocationHydrated || !hasInitiallyLoaded ? (
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
        onEdit={handleEditEvent}
        onViewProfile={(userId) => {
          navigation.navigate('Chat', {
            screen: 'UserProfile',
            params: { userId },
            initial: false,
          });
        }}
      />

      <CreateEventModal
        visible={editModalVisible}
        onClose={() => {
          setEditModalVisible(false);
          setEventToEdit(null);
        }}
        eventToEdit={eventToEdit}
        onEditSuccess={handleEditSuccess}
      />

      {/* Loading overlay when applying filters */}
      {applyingFilters && (
        <View style={styles.loadingOverlay}>
          <View style={[styles.loadingBox, { backgroundColor: colors.background.secondary }]}>
            <ActivityIndicator size="small" color={colors.accent.primary} />
            <Text style={[styles.loadingText, { color: colors.text.primary }]}>Loading...</Text>
          </View>
        </View>
      )}

      {/* Location & Filters Modal */}
      <Modal
        visible={radiusModalVisible}
        animationType="fade"
        transparent
        onRequestClose={closeFilterModalWithoutApply}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={closeFilterModalWithoutApply}
          />
          <View
            style={[
              styles.radiusModal,
              { backgroundColor: colors.background.secondary }
            ]}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={styles.modalScrollView}
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
              onScrollBeginDrag={() => Keyboard.dismiss()}
            >
              {/* Location Section */}
              <Text style={[styles.filterSectionTitle, { color: colors.text.primary, marginTop: 0 }]}>
                Location
              </Text>

              {!effectiveLocation && (
                <Text style={[styles.locationHint, { color: colors.text.secondary }]}>
                  Set your location to see nearby events
                </Text>
              )}

              {/* Address input */}
              <View style={[styles.addressInputContainer, { backgroundColor: colors.background.tertiary, borderColor: colors.border.primary }]}>
                <NavigationArrow size={iconScale(18)} color={colors.text.tertiary} />
                <TextInput
                  style={[styles.addressInput, { color: colors.text.primary }]}
                  placeholder="Enter address or city..."
                  placeholderTextColor={colors.text.tertiary}
                  value={addressInput}
                  onChangeText={setAddressInput}
                  returnKeyType="done"
                  autoCorrect={false}
                />
                {isLocationLoading && (
                  <ActivityIndicator size="small" color={colors.accent.primary} />
                )}
                {addressInput.length > 0 && !isLocationLoading && (
                  <TouchableOpacity onPress={() => setAddressInput('')}>
                    <X size={iconScale(18)} color={colors.text.tertiary} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Use GPS button */}
              <TouchableOpacity
                style={[styles.useGpsButton, { borderColor: colors.border.primary }]}
                onPress={handleUseGps}
              >
                <NavigationArrow size={iconScale(16)} color={colors.accent.primary} weight="bold" />
                <Text style={[styles.useGpsText, { color: colors.accent.primary }]}>
                  Use my location
                </Text>
              </TouchableOpacity>

              {locationError && (
                <Text style={[styles.locationErrorText, { color: colors.status.error }]}>
                  {locationError}
                </Text>
              )}

              {/* Radius Section */}
              <Text style={[styles.filterSectionTitle, { color: colors.text.primary }]}>
                Search Radius
              </Text>

              <View style={styles.radiusOptionsRow}>
                {RADIUS_OPTIONS.map((radius) => (
                  <TouchableOpacity
                    key={radius}
                    style={[
                      styles.radiusChip,
                      { backgroundColor: tempRadius === radius ? colors.accent.primary : colors.background.tertiary }
                    ]}
                    onPress={() => handleRadiusSelect(radius)}
                  >
                    <Text
                      style={[
                        styles.radiusChipText,
                        { color: tempRadius === radius ? '#FFFFFF' : colors.text.secondary }
                      ]}
                    >
                      {radius >= 50000 ? 'All' : `${radius} km`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Divider */}
              <View style={[styles.divider, { backgroundColor: colors.border.primary }]} />

              {/* Event Search */}
              <View style={[styles.addressInputContainer, { backgroundColor: colors.background.tertiary, borderColor: colors.border.primary }]}>
                <MagnifyingGlass size={iconScale(18)} color={colors.text.tertiary} />
                <TextInput
                  style={[styles.addressInput, { color: colors.text.primary }]}
                  placeholder="Search events..."
                  placeholderTextColor={colors.text.tertiary}
                  value={eventSearchQuery}
                  onChangeText={setEventSearchQuery}
                  returnKeyType="search"
                  autoCorrect={false}
                />
                {eventSearchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setEventSearchQuery('')}>
                    <X size={iconScale(18)} color={colors.text.tertiary} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Date Filter */}
              <Text style={[styles.filterSectionTitle, { color: colors.text.primary }]}>
                Date
              </Text>
              <View style={styles.radiusOptionsRow}>
                {DATE_FILTER_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.radiusChip,
                      { backgroundColor: dateFilter === option.value ? colors.accent.primary : colors.background.tertiary }
                    ]}
                    onPress={() => setDateFilter(option.value)}
                  >
                    <Text
                      style={[
                        styles.radiusChipText,
                        { color: dateFilter === option.value ? '#FFFFFF' : colors.text.secondary }
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Categories Filter */}
              {filter === 'public' && filterCategories.length > 0 && (
                <>
                  <Text style={[styles.filterSectionTitle, { color: colors.text.primary }]}>
                    Categories
                  </Text>
                  <View style={styles.radiusOptionsRow}>
                    {filterCategories.map((category) => (
                      <TouchableOpacity
                        key={category.id}
                        style={[
                          styles.radiusChip,
                          { backgroundColor: selectedCategories.includes(category.id) ? colors.accent.primary : colors.background.tertiary }
                        ]}
                        onPress={() => handleCategoryToggle(category.id)}
                      >
                        <Text
                          style={[
                            styles.radiusChipText,
                            { color: selectedCategories.includes(category.id) ? '#FFFFFF' : colors.text.secondary }
                          ]}
                        >
                          {category.display_name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {/* Available Spots Toggle */}
              <View
                style={[styles.toggleRow, { marginBottom: 0 }]}
                onStartShouldSetResponder={() => true}
              >
                <View style={styles.toggleInfo}>
                  <Users size={iconScale(20)} color={colors.text.secondary} />
                  <Text style={[styles.toggleLabel, { color: colors.text.primary }]}>
                    Available spots only
                  </Text>
                </View>
                <Switch
                  value={showAvailableOnly}
                  onValueChange={setShowAvailableOnly}
                  trackColor={{ false: colors.background.tertiary, true: colors.accent.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </ScrollView>

            {/* Done button - fixed at bottom */}
            <TouchableOpacity
              style={[styles.doneButtonFixed, { backgroundColor: colors.accent.primary }]}
              onPress={applyFiltersAndClose}
              disabled={isLocationLoading}
            >
              <Text style={[styles.doneButtonText, { color: '#FFFFFF' }]}>
                {isLocationLoading ? 'Searching...' : 'Done'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
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
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: scale(20),
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterButtonsContainer: {
    flexDirection: 'row',
    gap: scale(12),
    alignItems: 'center',
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
  radiusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: scale(34),
    paddingHorizontal: scale(12),
    borderRadius: scale(20),
    gap: scale(4),
  },
  radiusText: {
    fontSize: fontScale(13),
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: scale(16),
    paddingBottom: scale(100),
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
    paddingHorizontal: scale(40),
  },
  errorText: {
    ...Typography.body,
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(40),
  },
  emptyTitle: {
    ...Typography.h2,
    marginBottom: scale(8),
  },
  emptySubtitle: {
    ...Typography.body,
    textAlign: 'center',
  },
  emptySubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radiusModal: {
    width: '90%',
    maxWidth: scale(340),
    height: '65%',
    borderRadius: Spacing.borderRadius.lg,
    padding: scale(20),
  },
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    flexGrow: 1,
  },
  radiusModalTitle: {
    ...Typography.h4,
    marginBottom: scale(12),
  },
  locationHint: {
    ...Typography.caption,
    textAlign: 'center',
    marginBottom: scale(12),
  },
  addressInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Spacing.borderRadius.md,
    paddingHorizontal: scale(12),
    height: scale(44),
    gap: scale(8),
    marginBottom: scale(10),
  },
  addressInput: {
    flex: 1,
    fontSize: fontScale(16),
    padding: 0,
    margin: 0,
    height: scale(44),
    textAlignVertical: 'center',
  },
  addressSubmitButton: {
    paddingVertical: scale(12),
    borderRadius: Spacing.borderRadius.md,
    alignItems: 'center',
    marginBottom: scale(10),
  },
  addressSubmitText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: fontScale(15),
  },
  useGpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(10),
    borderRadius: Spacing.borderRadius.md,
    borderWidth: 1,
    gap: scale(6),
    marginBottom: scale(8),
  },
  useGpsText: {
    fontWeight: '600',
    fontSize: fontScale(14),
  },
  locationErrorText: {
    ...Typography.caption,
    textAlign: 'center',
    marginBottom: scale(8),
  },
  radiusOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(8),
    marginBottom: scale(16),
  },
  radiusChip: {
    paddingVertical: scale(8),
    paddingHorizontal: scale(14),
    borderRadius: scale(20),
  },
  radiusChipText: {
    fontSize: fontScale(13),
    fontWeight: '600',
  },
  doneButton: {
    paddingVertical: scale(12),
    borderRadius: Spacing.borderRadius.md,
    alignItems: 'center',
  },
  doneButtonFixed: {
    paddingVertical: scale(12),
    borderRadius: Spacing.borderRadius.md,
    alignItems: 'center',
    marginTop: scale(12),
  },
  doneButtonText: {
    fontWeight: '600',
    fontSize: fontScale(15),
  },
  radiusOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: scale(14),
    borderBottomWidth: 1,
  },
  radiusOptionText: {
    ...Typography.body,
  },
  filterSectionTitle: {
    fontSize: fontScale(15),
    fontWeight: '600',
    marginTop: scale(16),
    marginBottom: scale(10),
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: scale(16),
    paddingVertical: scale(4),
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
  },
  toggleLabel: {
    fontSize: fontScale(15),
    fontWeight: '500',
  },
  divider: {
    height: 1,
    marginVertical: scale(16),
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scale(12),
    paddingHorizontal: scale(20),
    borderRadius: scale(12),
    gap: scale(10),
  },
  loadingText: {
    fontSize: fontScale(14),
    fontWeight: '500',
  },
});
