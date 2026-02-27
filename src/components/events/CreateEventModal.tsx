import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput as RNTextInput,
  Image,
  Dimensions,
  TouchableWithoutFeedback,
  PanResponder,
  Animated,
  Alert,
  Switch,
  Platform,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Check, MapPin, Calendar, Clock, Users, ImageSquare, SoccerBall, Wine, Briefcase, Coffee, GraduationCap, MusicNotes, LockSimple } from 'phosphor-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { useTheme } from '../../contexts/ThemeContext';
import { Typography, Spacing } from '../../constants';
import TextInput from '../common/TextInput';
import { useEventsStore } from '../../stores/eventsStore';
import { uploadEventImage, updateEvent } from '../../services/events';
import { geocodeAddress, reverseGeocode, searchAddressSuggestions, AddressSuggestion } from '../../utils/geocoding';
import { EventWithHost } from '../../types/database';
import { scale, fontScale, iconScale, verticalScale } from '../../utils/responsive';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MODAL_HEIGHT = SCREEN_HEIGHT * 0.85;
const MAX_EVENT_PARTICIPANTS = 1000;
const LOCATION_AUTOCOMPLETE_LIMIT = 5;
const LOCATION_SEARCH_DEBOUNCE_MS = 300;

const CATEGORIES = [
  { id: 'sports', label: 'Sports', color: '#34C759', Icon: SoccerBall },
  { id: 'parties', label: 'Parties', color: '#FF2D55', Icon: Wine },
  { id: 'business', label: 'Business', color: '#5856D6', Icon: Briefcase },
  { id: 'freetime', label: 'Free Time', color: '#FF9500', Icon: Coffee },
  { id: 'studies', label: 'Studies', color: '#007AFF', Icon: GraduationCap },
  { id: 'concerts', label: 'Concerts', color: '#AF52DE', Icon: MusicNotes },
  { id: 'private', label: 'Private', color: '#8E8E93', Icon: LockSimple },
];

interface CreateEventModalProps {
  visible: boolean;
  onClose: () => void;
  eventToEdit?: EventWithHost | null;
  onEditSuccess?: () => void;
}

export default function CreateEventModal({ visible, onClose, eventToEdit, onEditSuccess }: CreateEventModalProps) {
  const { colors, activeTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const createEvent = useEventsStore((state) => state.createEvent);

  // Single animation value - backdrop interpolates from this (Pikup pattern)
  const translateY = useRef(new Animated.Value(MODAL_HEIGHT)).current;
  const scrollViewRef = useRef<KeyboardAwareScrollView>(null);

  // Backdrop opacity interpolated from translateY (Pikup pattern)
  const backdropOpacity = translateY.interpolate({
    inputRange: [0, MODAL_HEIGHT],
    outputRange: [0.5, 0],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: false,
        tension: 100,
        friction: 12,
      }).start();
    } else {
      translateY.setValue(MODAL_HEIGHT);
    }
  }, [visible, translateY]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 10 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderGrant: () => {
        // Store current position as offset (Pikup pattern)
        translateY.setOffset((translateY as any)._value);
        translateY.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy >= 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        // Flatten offset back into value (Pikup pattern)
        translateY.flattenOffset();

        const currentY = (translateY as any)._value;
        const velocity = gestureState.vy;

        const shouldClose = velocity > 1.5 || currentY > MODAL_HEIGHT * 0.3;

        if (shouldClose) {
          // Use timing for close - spring waits for oscillation to settle
          Animated.timing(translateY, {
            toValue: MODAL_HEIGHT,
            duration: 250,
            useNativeDriver: false,
          }).start(() => {
            resetForm();
            onClose();
          });
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: false,
            tension: 100,
            friction: 12,
          }).start();
        }
      },
    })
  ).current;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [location, setLocation] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState<Date | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [spots, setSpots] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [autoAccept, setAutoAccept] = useState(true);
  const [hasEndTime, setHasEndTime] = useState(false);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [spotsError, setSpotsError] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<AddressSuggestion[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [isResolvingCurrentLocation, setIsResolvingCurrentLocation] = useState(false);
  const [selectedLocationData, setSelectedLocationData] = useState<{
    address: string;
    latitude: number;
    longitude: number;
  } | null>(null);
  const locationSearchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestLocationQueryRef = useRef('');

  const isEditMode = !!eventToEdit;
  const isPrivateCategory = selectedCategory === 'private';

  // Force manual approval for private events, enable auto-accept for others
  useEffect(() => {
    if (isPrivateCategory) {
      setAutoAccept(false);
    } else if (selectedCategory) {
      setAutoAccept(true);
    }
  }, [isPrivateCategory, selectedCategory]);

  useEffect(() => {
    return () => {
      if (locationSearchTimeoutRef.current) {
        clearTimeout(locationSearchTimeoutRef.current);
      }
    };
  }, []);

  // Populate fields when editing
  useEffect(() => {
    if (eventToEdit && visible) {
      setTitle(eventToEdit.title);
      setDescription(eventToEdit.description || '');
      setLocation(eventToEdit.location_address);
      setSelectedLocationData({
        address: eventToEdit.location_address,
        latitude: eventToEdit.location_lat,
        longitude: eventToEdit.location_lng,
      });
      setSpots(String(eventToEdit.max_participants));
      setSpotsError('');
      setImage(eventToEdit.image_url || null);
      setAutoAccept(eventToEdit.auto_accept);

      // Map category_id to category string
      const categoryMap: Record<number, string> = {
        1: 'sports',
        2: 'parties',
        3: 'business',
        4: 'freetime',
        5: 'studies',
        6: 'concerts',
        7: 'private',
      };
      setSelectedCategory(categoryMap[eventToEdit.category_id] || null);

      // Parse date and time
      const eventDate = new Date(eventToEdit.start_time);
      setSelectedDate(eventDate);
      setSelectedTime(eventDate);

      // Parse end date and time
      if (eventToEdit.end_time) {
        setHasEndTime(true);
        const eventEndDate = new Date(eventToEdit.end_time);
        setEndDate(eventEndDate);
        setEndTime(eventEndDate);
      } else {
        setHasEndTime(false);
        setEndDate(null);
        setEndTime(null);
      }
    }
  }, [eventToEdit, visible]);

  const handleDateChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleTimeChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (date) {
      setSelectedTime(date);
    }
  };

  const handleEndDateChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowEndDatePicker(false);
    }
    if (date) {
      setEndDate(date);
    }
  };

  const handleEndTimeChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowEndTimePicker(false);
    }
    if (date) {
      setEndTime(date);
    }
  };

  const formatDate = (date: Date) => format(date, 'MMM d, yyyy');
  const formatTime = (date: Date) => format(date, 'h:mm a');

  const closePickers = () => {
    setShowDatePicker(false);
    setShowTimePicker(false);
    setShowEndDatePicker(false);
    setShowEndTimePicker(false);
    setShowLocationSuggestions(false);
  };

  const searchLocations = (value: string) => {
    const trimmedValue = value.trim();
    latestLocationQueryRef.current = trimmedValue;

    if (locationSearchTimeoutRef.current) {
      clearTimeout(locationSearchTimeoutRef.current);
      locationSearchTimeoutRef.current = null;
    }

    if (trimmedValue.length < 2) {
      setLocationSuggestions([]);
      setIsSearchingLocation(false);
      return;
    }

    setIsSearchingLocation(true);
    locationSearchTimeoutRef.current = setTimeout(async () => {
      const result = await searchAddressSuggestions(trimmedValue, LOCATION_AUTOCOMPLETE_LIMIT);

      if (latestLocationQueryRef.current !== trimmedValue) {
        return;
      }

      setLocationSuggestions(result.success ? result.suggestions || [] : []);
      setIsSearchingLocation(false);
    }, LOCATION_SEARCH_DEBOUNCE_MS);
  };

  const handleLocationChange = (value: string) => {
    setLocation(value);
    setSelectedLocationData(null);
    setShowLocationSuggestions(true);
    searchLocations(value);
  };

  const handleLocationSuggestionSelect = (suggestion: AddressSuggestion) => {
    Keyboard.dismiss();
    setLocation(suggestion.fullAddress);
    setSelectedLocationData({
      address: suggestion.fullAddress,
      latitude: suggestion.location.latitude,
      longitude: suggestion.location.longitude,
    });
    setLocationSuggestions([]);
    setShowLocationSuggestions(false);
    setIsSearchingLocation(false);
  };

  const handleUseCurrentLocation = async () => {
    Keyboard.dismiss();
    closePickers();

    try {
      setIsResolvingCurrentLocation(true);
      const permissionResult = await Location.requestForegroundPermissionsAsync();

      if (permissionResult.status !== 'granted') {
        Alert.alert('Location Permission', 'Please allow location access to use your current location.');
        return;
      }

      const currentPosition = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const latitude = currentPosition.coords.latitude;
      const longitude = currentPosition.coords.longitude;
      const fallbackAddress = `Current location (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`;

      setLocation(fallbackAddress);
      setSelectedLocationData({ address: fallbackAddress, latitude, longitude });
      setLocationSuggestions([]);
      setShowLocationSuggestions(false);
      setIsSearchingLocation(false);

      const reverseGeocodeResult = await reverseGeocode(latitude, longitude);
      if (reverseGeocodeResult.address) {
        setLocation(reverseGeocodeResult.address);
        setSelectedLocationData({
          address: reverseGeocodeResult.address,
          latitude,
          longitude,
        });
      }
    } catch (error) {
      Alert.alert('Location Error', 'Unable to get your current location.');
    } finally {
      setIsResolvingCurrentLocation(false);
    }
  };

  const resolveLocationForEvent = async (): Promise<{ address: string; lat: number; lng: number } | null> => {
    if (selectedLocationData) {
      return {
        address: selectedLocationData.address || location,
        lat: selectedLocationData.latitude,
        lng: selectedLocationData.longitude,
      };
    }

    const geocodeResult = await geocodeAddress(location);
    if (!geocodeResult.success || !geocodeResult.location) {
      Alert.alert('Location Error', geocodeResult.error || 'Could not find this location. Please enter a valid address.');
      return null;
    }

    return {
      address: geocodeResult.formattedAddress || location,
      lat: geocodeResult.location.latitude,
      lng: geocodeResult.location.longitude,
    };
  };

  const handleSpotsChange = (value: string) => {
    const digitsOnly = value.replace(/[^0-9]/g, '');
    if (!digitsOnly) {
      setSpots('');
      setSpotsError('');
      return;
    }

    const parsedValue = parseInt(digitsOnly, 10);
    if (parsedValue > MAX_EVENT_PARTICIPANTS) {
      setSpots(String(MAX_EVENT_PARTICIPANTS));
      setSpotsError(`Maximum is ${MAX_EVENT_PARTICIPANTS}`);
      return;
    }

    setSpots(String(parsedValue));
    setSpotsError('');
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert('Permission required', 'Please allow access to your photo library.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImage(result.assets[0].uri);
    }
  };

  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (isCreating) return;
    setIsCreating(true);

    try {
      // Validate date constraints: min 24 hours, max 1 year from now
      if (selectedDate && selectedTime) {
        const eventDateTime = new Date(selectedDate);
        eventDateTime.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);

        const now = new Date();
        const minDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const maxDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

        if (eventDateTime < minDate) {
          Alert.alert('Invalid Date', 'Event must start at least 24 hours from now.');
          setIsCreating(false);
          return;
        }

        if (eventDateTime > maxDate) {
          Alert.alert('Invalid Date', 'Event cannot be more than 1 year from now.');
          setIsCreating(false);
          return;
        }
      }

      // Upload image if selected and it's a new local image (not existing URL)
      let imageUrl: string | undefined;
      if (image) {
        // Check if it's a new local image or existing URL
        if (image.startsWith('file://') || image.startsWith('ph://')) {
          console.log('Uploading image:', image);
          const uploadResult = await uploadEventImage(image);
          console.log('Upload result:', uploadResult);
          if (uploadResult.error) {
            Alert.alert('Upload Error', uploadResult.error.message);
            setIsCreating(false);
            return;
          }
          imageUrl = uploadResult.url || undefined;
        } else {
          // Keep existing URL
          imageUrl = image;
        }
      }

      // Map category string ID to numeric ID (1-based index + 1)
      const categoryIndex = CATEGORIES.findIndex(c => c.id === selectedCategory);
      const categoryId = categoryIndex >= 0 ? categoryIndex + 1 : 4; // Default to freetime (4)

      // Combine date and time into ISO string
      let startTime = new Date().toISOString();
      if (selectedDate && selectedTime) {
        const dateWithTime = new Date(selectedDate);
        dateWithTime.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
        startTime = dateWithTime.toISOString();
      }

      // Calculate end time if enabled
      let endTimeISO: string | undefined;
      if (hasEndTime && endDate && endTime) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(endTime.getHours(), endTime.getMinutes(), 0, 0);

        // Validate end time is after start time
        const startDateTime = new Date(startTime);
        if (endDateTime <= startDateTime) {
          Alert.alert('Invalid End Time', 'End time must be after start time.');
          setIsCreating(false);
          return;
        }

        endTimeISO = endDateTime.toISOString();
      }

      const parsedSpots = parseInt(spots, 10);
      if (!Number.isFinite(parsedSpots) || parsedSpots < 1) {
        Alert.alert('Invalid Spots', 'Please enter at least 1 spot.');
        setIsCreating(false);
        return;
      }
      if (parsedSpots > MAX_EVENT_PARTICIPANTS) {
        Alert.alert('Invalid Spots', `Maximum spots allowed is ${MAX_EVENT_PARTICIPANTS}.`);
        setIsCreating(false);
        return;
      }

      if (isEditMode && eventToEdit) {
        // Check if location changed - only geocode if it did
        let locationData: { address: string; lat: number; lng: number } | null = null;
        if (location !== eventToEdit.location_address) {
          const resolvedLocation = await resolveLocationForEvent();
          if (!resolvedLocation) {
            setIsCreating(false);
            return;
          }
          locationData = resolvedLocation;
        }

        // Update existing event
        const result = await updateEvent(eventToEdit.id, {
          title,
          description: description || 'No description',
          category_id: categoryId,
          ...(locationData && {
            location_address: locationData.address,
            location_lat: locationData.lat,
            location_lng: locationData.lng,
          }),
          start_time: startTime,
          end_time: hasEndTime ? endTimeISO : undefined,
          max_participants: parsedSpots,
          image_url: imageUrl,
          auto_accept: isPrivateCategory ? false : autoAccept,
        });

        if (result.event) {
          onEditSuccess?.();
          handleClose();
        } else {
          Alert.alert('Error', result.error?.message || 'Failed to update event');
        }
      } else {
        const resolvedLocation = await resolveLocationForEvent();
        if (!resolvedLocation) {
          setIsCreating(false);
          return;
        }

        // Create new event
        const result = await createEvent({
          title,
          description: description || 'No description',
          category_id: categoryId,
          location_address: resolvedLocation.address,
          location_lat: resolvedLocation.lat,
          location_lng: resolvedLocation.lng,
          start_time: startTime,
          end_time: hasEndTime ? endTimeISO : undefined,
          max_participants: parsedSpots,
          image_url: imageUrl,
          auto_accept: isPrivateCategory ? false : autoAccept,
        });

        if (result.success) {
          handleClose();
        } else {
          Alert.alert('Error', result.error || 'Failed to create event');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    if (locationSearchTimeoutRef.current) {
      clearTimeout(locationSearchTimeoutRef.current);
      locationSearchTimeoutRef.current = null;
    }
    setTitle('');
    setDescription('');
    setSelectedCategory(null);
    setLocation('');
    setLocationSuggestions([]);
    setShowLocationSuggestions(false);
    setSelectedLocationData(null);
    setIsSearchingLocation(false);
    setIsResolvingCurrentLocation(false);
    setSelectedDate(null);
    setShowDatePicker(false);
    setSelectedTime(null);
    setShowTimePicker(false);
    setSpots('');
    setSpotsError('');
    setImage(null);
    setAutoAccept(true);
    setHasEndTime(false);
    setEndDate(null);
    setShowEndDatePicker(false);
    setEndTime(null);
    setShowEndTimePicker(false);
  };

  const animateClose = () => {
    // Use timing for close - spring waits for oscillation to settle
    Animated.timing(translateY, {
      toValue: MODAL_HEIGHT,
      duration: 250,
      useNativeDriver: false,
    }).start(() => {
      resetForm();
      onClose();
    });
  };

  const handleClose = () => {
    animateClose();
  };

  const parsedSpotsValue = parseInt(spots, 10);
  const isSpotsValid =
    Number.isFinite(parsedSpotsValue) &&
    parsedSpotsValue >= 1 &&
    parsedSpotsValue <= MAX_EVENT_PARTICIPANTS;
  const isValid = Boolean(
    title.trim() &&
    selectedCategory &&
    location.trim() &&
    selectedDate &&
    selectedTime &&
    isSpotsValid &&
    (!hasEndTime || (endDate && endTime))
  );

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      presentationStyle="overFullScreen"
      onRequestClose={handleClose}
    >
      <Animated.View style={[styles.blurContainer, { opacity: backdropOpacity }]}>
        <TouchableOpacity
          style={styles.blurTouchable}
          activeOpacity={1}
          onPress={handleClose}
        />
      </Animated.View>

      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            {
              backgroundColor: colors.background.primary,
              height: MODAL_HEIGHT + 50,
              marginBottom: -50,
              paddingBottom: insets.bottom + 50,
              transform: [{ translateY }],
            },
          ]}
        >
          <View
            {...panResponder.panHandlers}
            style={styles.handleContainer}
          >
            <View style={[styles.handle, { backgroundColor: colors.border.primary }]} />
          </View>

          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X size={iconScale(24)} color={colors.text.primary} weight="bold" />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text.primary }]}>{isEditMode ? 'Edit Event' : 'New Event'}</Text>
            <TouchableOpacity
              onPress={handleCreate}
              disabled={!isValid || isCreating}
              style={styles.checkButton}
            >
              {isCreating ? (
                <ActivityIndicator size="small" color={colors.text.primary} />
              ) : (
                <Check size={iconScale(24)} color={isValid ? colors.text.primary : colors.text.tertiary} weight="bold" />
              )}
            </TouchableOpacity>
          </View>

          <KeyboardAwareScrollView
            ref={scrollViewRef}
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            extraScrollHeight={60}
            enableOnAndroid
            enableResetScrollToCoords={false}
          >
            <TextInput
              label="Title"
              placeholder="What's the event?"
              value={title}
              onChangeText={setTitle}
              maxLength={50}
              onFocus={closePickers}
            />

            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: colors.text.secondary }]}>Cover Photo</Text>
              <TouchableOpacity
                style={[
                  styles.imagePickerContainer,
                  { backgroundColor: colors.background.secondary, borderColor: colors.border.primary },
                ]}
                onPress={() => { closePickers(); pickImage(); }}
                activeOpacity={0.7}
              >
                {image ? (
                  <Image source={{ uri: image }} style={styles.pickedImage} />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <ImageSquare size={iconScale(32)} color={colors.text.placeholder} />
                    <Text style={[styles.imagePlaceholderText, { color: colors.text.placeholder }]}>
                      Add a photo
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: colors.text.secondary }]}>Description</Text>
              <View
                style={[
                  styles.textAreaContainer,
                  { backgroundColor: colors.background.secondary, borderColor: colors.border.primary },
                ]}
              >
                <RNTextInput
                  style={[styles.textArea, { color: colors.text.primary }]}
                  placeholder="Tell people more about this event..."
                  placeholderTextColor={colors.text.placeholder}
                  value={description}
                  onChangeText={setDescription}
                  onFocus={() => {
                    closePickers();
                    setTimeout(() => {
                      scrollViewRef.current?.scrollToPosition(0, 220, true);
                    }, 300);
                  }}
                  multiline
                  numberOfLines={4}
                  maxLength={500}
                  textAlignVertical="top"
                />
              </View>
            </View>

            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: colors.text.secondary }]}>Category</Text>
              <View style={styles.categoriesContainer}>
                {CATEGORIES.map((category) => {
                  const IconComponent = category.Icon;
                  const isSelected = selectedCategory === category.id;
                  return (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.categoryChip,
                        {
                          backgroundColor: isSelected
                            ? category.color
                            : colors.background.secondary,
                          borderColor: isSelected
                            ? category.color
                            : colors.border.primary,
                        },
                      ]}
                      onPress={() => { closePickers(); setSelectedCategory(category.id); }}
                    >
                      <IconComponent
                        size={iconScale(16)}
                        color={isSelected ? '#FFFFFF' : colors.text.secondary}
                        weight="bold"
                      />
                      <Text
                        style={[
                          styles.categoryChipText,
                          {
                            color: isSelected ? '#FFFFFF' : colors.text.secondary,
                          },
                        ]}
                      >
                        {category.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={[styles.fieldContainer, styles.locationFieldContainer]}>
              <Text style={[styles.label, { color: colors.text.secondary }]}>Location</Text>
              <View
                style={[
                  styles.locationInputContainer,
                  {
                    backgroundColor: colors.background.secondary,
                    borderColor: colors.border.primary,
                  },
                ]}
              >
                <MapPin size={iconScale(20)} color={colors.text.secondary} />
                <RNTextInput
                  style={[styles.locationInput, { color: colors.text.primary }]}
                  placeholder="Where is it happening?"
                  placeholderTextColor={colors.text.placeholder}
                  value={location}
                  onChangeText={handleLocationChange}
                  onFocus={() => {
                    closePickers();
                    setShowLocationSuggestions(true);
                    searchLocations(location);
                  }}
                  onBlur={() => {
                    setTimeout(() => setShowLocationSuggestions(false), 150);
                  }}
                  autoCorrect={false}
                />
                {location.length > 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      setLocation('');
                      setSelectedLocationData(null);
                      setLocationSuggestions([]);
                      setShowLocationSuggestions(false);
                      setIsSearchingLocation(false);
                    }}
                    style={styles.locationClearButton}
                  >
                    <X size={iconScale(16)} color={colors.text.placeholder} weight="bold" />
                  </TouchableOpacity>
                )}
              </View>

              {showLocationSuggestions && (
                <View
                  style={[
                    styles.locationSuggestionsContainer,
                    {
                      backgroundColor: colors.background.secondary,
                      borderColor: colors.border.primary,
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={styles.locationSuggestionItem}
                    onPress={handleUseCurrentLocation}
                  >
                    <View
                      style={[
                        styles.currentLocationIconWrap,
                        { backgroundColor: colors.accent.primary },
                      ]}
                    >
                      {isResolvingCurrentLocation ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <MapPin size={iconScale(14)} color="#FFFFFF" weight="fill" />
                      )}
                    </View>
                    <Text style={[styles.currentLocationText, { color: colors.text.primary }]}>
                      Use my current location
                    </Text>
                  </TouchableOpacity>

                  {isSearchingLocation && (
                    <View style={styles.locationSuggestionsLoading}>
                      <ActivityIndicator size="small" color={colors.accent.primary} />
                    </View>
                  )}

                  {locationSuggestions.map((suggestion) => (
                    <TouchableOpacity
                      key={suggestion.id}
                      style={styles.locationSuggestionItem}
                      onPress={() => handleLocationSuggestionSelect(suggestion)}
                    >
                      <View style={styles.locationSuggestionTextWrap}>
                        <Text style={[styles.locationSuggestionTitle, { color: colors.text.primary }]} numberOfLines={1}>
                          {suggestion.name}
                        </Text>
                        <Text style={[styles.locationSuggestionAddress, { color: colors.text.secondary }]} numberOfLines={1}>
                          {suggestion.address}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.row}>
              <View style={styles.halfField}>
                <View style={styles.fieldContainer}>
                  <Text style={[styles.label, { color: colors.text.secondary }]}>Date</Text>
                  <TouchableOpacity
                    style={[
                      styles.datePickerButton,
                      { backgroundColor: colors.background.secondary, borderColor: colors.border.primary },
                    ]}
                    onPress={() => { setShowTimePicker(false); setShowDatePicker(true); }}
                    activeOpacity={0.7}
                  >
                    <Calendar size={iconScale(20)} color={colors.text.secondary} />
                    <Text
                      style={[
                        styles.datePickerText,
                        { color: selectedDate ? colors.text.primary : colors.text.placeholder },
                      ]}
                    >
                      {selectedDate ? formatDate(selectedDate) : 'Select date'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.halfField}>
                <View style={styles.fieldContainer}>
                  <Text style={[styles.label, { color: colors.text.secondary }]}>Time</Text>
                  <TouchableOpacity
                    style={[
                      styles.datePickerButton,
                      { backgroundColor: colors.background.secondary, borderColor: colors.border.primary },
                    ]}
                    onPress={() => { setShowDatePicker(false); setShowTimePicker(true); }}
                    activeOpacity={0.7}
                  >
                    <Clock size={iconScale(20)} color={colors.text.secondary} />
                    <Text
                      style={[
                        styles.datePickerText,
                        { color: selectedTime ? colors.text.primary : colors.text.placeholder },
                      ]}
                    >
                      {selectedTime ? formatTime(selectedTime) : 'Select time'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={styles.switchContainer}>
              <View style={styles.switchTextContainer}>
                <Text style={[styles.switchLabel, { color: colors.text.primary }]}>
                  Event has end time
                </Text>
                <Text style={[styles.switchDescription, { color: colors.text.secondary }]}>
                  {hasEndTime
                    ? 'Specify when the event ends'
                    : 'No specific end time'}
                </Text>
              </View>
              <Switch
                value={hasEndTime}
                onValueChange={setHasEndTime}
                trackColor={{ false: colors.border.primary, true: colors.accent.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            {hasEndTime && (
              <View style={styles.row}>
                <View style={styles.halfField}>
                  <View style={styles.fieldContainer}>
                    <Text style={[styles.label, { color: colors.text.secondary }]}>End Date</Text>
                    <TouchableOpacity
                      style={[
                        styles.datePickerButton,
                        { backgroundColor: colors.background.secondary, borderColor: colors.border.primary },
                      ]}
                      onPress={() => { closePickers(); setShowEndDatePicker(true); }}
                      activeOpacity={0.7}
                    >
                      <Calendar size={iconScale(20)} color={colors.text.secondary} />
                      <Text
                        style={[
                          styles.datePickerText,
                          { color: endDate ? colors.text.primary : colors.text.placeholder },
                        ]}
                      >
                        {endDate ? formatDate(endDate) : 'Select date'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.halfField}>
                  <View style={styles.fieldContainer}>
                    <Text style={[styles.label, { color: colors.text.secondary }]}>End Time</Text>
                    <TouchableOpacity
                      style={[
                        styles.datePickerButton,
                        { backgroundColor: colors.background.secondary, borderColor: colors.border.primary },
                      ]}
                      onPress={() => { closePickers(); setShowEndTimePicker(true); }}
                      activeOpacity={0.7}
                    >
                      <Clock size={iconScale(20)} color={colors.text.secondary} />
                      <Text
                        style={[
                          styles.datePickerText,
                          { color: endTime ? colors.text.primary : colors.text.placeholder },
                        ]}
                      >
                        {endTime ? formatTime(endTime) : 'Select time'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            <TextInput
              label="Spots available"
              placeholder="How many people can join?"
              value={spots}
              onChangeText={handleSpotsChange}
              onFocus={closePickers}
              keyboardType="number-pad"
              maxLength={4}
              error={spotsError}
              icon={<Users size={iconScale(20)} color={colors.text.secondary} />}
            />
            <Text style={[styles.spotsHint, { color: colors.text.secondary }]}>
              Up to 1000
            </Text>

            <View style={[styles.switchContainer, isPrivateCategory && styles.switchContainerDisabled]}>
              <View style={styles.switchTextContainer}>
                <Text style={[styles.switchLabel, { color: isPrivateCategory ? colors.text.tertiary : colors.text.primary }]}>
                  Auto-accept participants
                </Text>
                <Text style={[styles.switchDescription, { color: colors.text.secondary }]}>
                  {isPrivateCategory
                    ? 'Private events require manual approval'
                    : autoAccept
                      ? 'People will join automatically'
                      : 'You will approve each request manually'}
                </Text>
              </View>
              <Switch
                value={autoAccept}
                onValueChange={setAutoAccept}
                disabled={isPrivateCategory}
                trackColor={{ false: colors.border.primary, true: colors.accent.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={{ height: scale(40) }} />
          </KeyboardAwareScrollView>
        </Animated.View>
      </View>

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowDatePicker(false)}>
          <View style={styles.pickerOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.pickerModal, { backgroundColor: colors.background.secondary }]}>
                <View style={styles.pickerHeader}>
                  <Text style={[styles.pickerTitle, { color: colors.text.primary }]}>Select Date</Text>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Text style={[styles.pickerDone, { color: colors.accent.primary }]}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={selectedDate || new Date(Date.now() + 24 * 60 * 60 * 1000)}
                  mode="date"
                  display="inline"
                  onChange={handleDateChange}
                  minimumDate={new Date(Date.now() + 24 * 60 * 60 * 1000)}
                  maximumDate={new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)}
                  themeVariant={activeTheme}
                  style={styles.picker}
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Time Picker Modal */}
      <Modal
        visible={showTimePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTimePicker(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowTimePicker(false)}>
          <View style={styles.pickerOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.pickerModal, { backgroundColor: colors.background.secondary }]}>
                <View style={styles.pickerHeader}>
                  <Text style={[styles.pickerTitle, { color: colors.text.primary }]}>Select Time</Text>
                  <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                    <Text style={[styles.pickerDone, { color: colors.accent.primary }]}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={selectedTime || new Date()}
                  mode="time"
                  display="spinner"
                  onChange={handleTimeChange}
                  themeVariant={activeTheme}
                  is24Hour={false}
                  locale="en-US"
                  style={styles.timePicker}
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* End Date Picker Modal */}
      <Modal
        visible={showEndDatePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEndDatePicker(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowEndDatePicker(false)}>
          <View style={styles.pickerOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.pickerModal, { backgroundColor: colors.background.secondary }]}>
                <View style={styles.pickerHeader}>
                  <Text style={[styles.pickerTitle, { color: colors.text.primary }]}>Select End Date</Text>
                  <TouchableOpacity onPress={() => setShowEndDatePicker(false)}>
                    <Text style={[styles.pickerDone, { color: colors.accent.primary }]}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={endDate || selectedDate || new Date(Date.now() + 24 * 60 * 60 * 1000)}
                  mode="date"
                  display="inline"
                  onChange={handleEndDateChange}
                  minimumDate={selectedDate || new Date(Date.now() + 24 * 60 * 60 * 1000)}
                  maximumDate={new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)}
                  themeVariant={activeTheme}
                  style={styles.picker}
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* End Time Picker Modal */}
      <Modal
        visible={showEndTimePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEndTimePicker(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowEndTimePicker(false)}>
          <View style={styles.pickerOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.pickerModal, { backgroundColor: colors.background.secondary }]}>
                <View style={styles.pickerHeader}>
                  <Text style={[styles.pickerTitle, { color: colors.text.primary }]}>Select End Time</Text>
                  <TouchableOpacity onPress={() => setShowEndTimePicker(false)}>
                    <Text style={[styles.pickerDone, { color: colors.accent.primary }]}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={endTime || selectedTime || new Date()}
                  mode="time"
                  display="spinner"
                  onChange={handleEndTimeChange}
                  themeVariant={activeTheme}
                  is24Hour={false}
                  locale="en-US"
                  style={styles.timePicker}
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  blurContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  blurTouchable: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: scale(20),
    borderTopRightRadius: scale(20),
  },
  handleContainer: {
    paddingTop: scale(8),
    paddingBottom: scale(4),
    alignItems: 'center',
  },
  handle: {
    width: scale(36),
    height: scale(4),
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingBottom: scale(12),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  closeButton: {
    width: scale(40),
    height: scale(40),
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  checkButton: {
    width: scale(40),
    height: scale(40),
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  headerTitle: {
    ...Typography.h2,
    fontSize: fontScale(16),
    lineHeight: fontScale(24),
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: scale(20),
    gap: scale(20),
  },
  fieldContainer: {
    width: '100%',
  },
  locationFieldContainer: {
    zIndex: 20,
  },
  label: {
    ...Typography.caption,
    marginBottom: Spacing.xs,
    marginLeft: Spacing.xs,
  },
  locationInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Spacing.borderRadius.md,
    paddingHorizontal: Spacing.inputPadding,
    minHeight: scale(50),
    gap: scale(8),
  },
  locationInput: {
    flex: 1,
    fontFamily: Typography.body.fontFamily,
    fontSize: Typography.body.fontSize,
    fontWeight: Typography.body.fontWeight as '400',
    paddingVertical: Spacing.inputPadding,
  },
  locationClearButton: {
    padding: scale(4),
  },
  locationSuggestionsContainer: {
    marginTop: scale(8),
    borderWidth: 1,
    borderRadius: Spacing.borderRadius.md,
    overflow: 'hidden',
  },
  locationSuggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.inputPadding,
    paddingVertical: scale(12),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    gap: scale(10),
  },
  locationSuggestionsLoading: {
    paddingVertical: scale(10),
    alignItems: 'center',
  },
  locationSuggestionTextWrap: {
    flex: 1,
  },
  locationSuggestionTitle: {
    ...Typography.bodySmall,
    fontWeight: '600',
  },
  locationSuggestionAddress: {
    ...Typography.caption,
    marginTop: scale(2),
  },
  currentLocationIconWrap: {
    width: scale(22),
    height: scale(22),
    borderRadius: scale(11),
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentLocationText: {
    ...Typography.bodySmall,
    fontWeight: '600',
  },
  textAreaContainer: {
    borderWidth: 1,
    borderRadius: Spacing.borderRadius.md,
    overflow: 'hidden',
  },
  textArea: {
    fontFamily: Typography.body.fontFamily,
    fontSize: Typography.body.fontSize,
    fontWeight: Typography.body.fontWeight as '400',
    padding: Spacing.inputPadding,
    minHeight: verticalScale(100),
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(8),
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    paddingHorizontal: scale(14),
    paddingVertical: scale(8),
    borderRadius: scale(20),
    borderWidth: 1,
  },
  categoryChipText: {
    ...Typography.bodySmall,
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
    gap: scale(12),
  },
  halfField: {
    flex: 1,
  },
  imagePickerContainer: {
    borderWidth: 1,
    borderRadius: Spacing.borderRadius.md,
    overflow: 'hidden',
    height: verticalScale(160),
  },
  pickedImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: scale(8),
  },
  imagePlaceholderText: {
    ...Typography.bodySmall,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Spacing.borderRadius.md,
    padding: Spacing.inputPadding,
    gap: scale(10),
  },
  datePickerText: {
    ...Typography.body,
    flex: 1,
  },
  datePickerContainer: {
    marginTop: scale(-10),
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerModal: {
    borderRadius: scale(16),
    padding: scale(16),
    marginHorizontal: scale(20),
    maxWidth: scale(360),
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(8),
  },
  pickerTitle: {
    ...Typography.h3,
  },
  pickerDone: {
    ...Typography.body,
    fontWeight: '600',
  },
  picker: {
    height: verticalScale(320),
  },
  timePicker: {
    height: verticalScale(200),
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: scale(12),
  },
  switchContainerDisabled: {
    opacity: 0.6,
  },
  switchTextContainer: {
    flex: 1,
    marginRight: scale(12),
  },
  switchLabel: {
    ...Typography.body,
    fontWeight: '500',
  },
  switchDescription: {
    ...Typography.caption,
    marginTop: scale(2),
  },
  spotsHint: {
    ...Typography.caption,
    marginTop: scale(2),
    marginLeft: Spacing.xs,
  },
});
