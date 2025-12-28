import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TextInput as RNTextInput,
  Image,
  Dimensions,
  TouchableWithoutFeedback,
  PanResponder,
  Animated,
  Alert,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Check, MapPin, Calendar, Clock, Users, ImageSquare, SoccerBall, Wine, Briefcase, Coffee, GraduationCap, MusicNotes, LockSimple } from 'phosphor-react-native';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { useTheme } from '../../contexts/ThemeContext';
import { Typography, Spacing } from '../../constants';
import TextInput from '../common/TextInput';
import { useEventsStore } from '../../stores/eventsStore';
import { uploadEventImage, updateEvent } from '../../services/events';
import { geocodeAddress } from '../../utils/geocoding';
import { EventWithHost } from '../../types/database';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MODAL_HEIGHT = SCREEN_HEIGHT * 0.85;

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

  const translateY = useRef(new Animated.Value(MODAL_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 200,
      }).start();
    } else {
      translateY.setValue(MODAL_HEIGHT);
    }
  }, [visible, translateY]);

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
            handleClose();
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

  const isEditMode = !!eventToEdit;

  // Populate fields when editing
  useEffect(() => {
    if (eventToEdit && visible) {
      setTitle(eventToEdit.title);
      setDescription(eventToEdit.description || '');
      setLocation(eventToEdit.location_address);
      setSpots(String(eventToEdit.max_participants));
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

  const formatDate = (date: Date) => format(date, 'MMM d, yyyy');
  const formatTime = (date: Date) => format(date, 'h:mm a');

  const closePickers = () => {
    setShowDatePicker(false);
    setShowTimePicker(false);
  };

  const pickImage = async () => {
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

      if (isEditMode && eventToEdit) {
        // Check if location changed - only geocode if it did
        let locationData: { address: string; lat: number; lng: number } | null = null;
        if (location !== eventToEdit.location_address) {
          const geocodeResult = await geocodeAddress(location);
          if (!geocodeResult.success || !geocodeResult.location) {
            Alert.alert('Location Error', geocodeResult.error || 'Could not find this location. Please enter a valid address.');
            setIsCreating(false);
            return;
          }
          locationData = {
            address: geocodeResult.formattedAddress || location,
            lat: geocodeResult.location.latitude,
            lng: geocodeResult.location.longitude,
          };
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
          max_participants: parseInt(spots, 10) || 10,
          image_url: imageUrl,
          auto_accept: autoAccept,
        });

        if (result.event) {
          onEditSuccess?.();
          handleClose();
        } else {
          Alert.alert('Error', result.error?.message || 'Failed to update event');
        }
      } else {
        // Geocode the address to get coordinates
        const geocodeResult = await geocodeAddress(location);
        if (!geocodeResult.success || !geocodeResult.location) {
          Alert.alert('Location Error', geocodeResult.error || 'Could not find this location. Please enter a valid address.');
          setIsCreating(false);
          return;
        }

        // Create new event
        const result = await createEvent({
          title,
          description: description || 'No description',
          category_id: categoryId,
          location_address: geocodeResult.formattedAddress || location,
          location_lat: geocodeResult.location.latitude,
          location_lng: geocodeResult.location.longitude,
          start_time: startTime,
          max_participants: parseInt(spots, 10) || 10,
          image_url: imageUrl,
          auto_accept: autoAccept,
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

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setSelectedCategory(null);
    setLocation('');
    setSelectedDate(null);
    setShowDatePicker(false);
    setSelectedTime(null);
    setShowTimePicker(false);
    setSpots('');
    setImage(null);
    setAutoAccept(true);
    onClose();
  };

  const isValid = title.trim() && selectedCategory && location.trim() && selectedDate && selectedTime && spots.trim();

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

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
          >

          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X size={24} color={colors.text.primary} weight="bold" />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text.primary }]}>{isEditMode ? 'Edit Event' : 'New Event'}</Text>
            <TouchableOpacity
              onPress={handleCreate}
              disabled={!isValid}
              style={styles.checkButton}
            >
              <Check size={24} color={colors.text.primary} weight="bold" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
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
                    <ImageSquare size={32} color={colors.text.placeholder} />
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
                  onFocus={closePickers}
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
                        size={16}
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

            <TextInput
              label="Location"
              placeholder="Where is it happening?"
              value={location}
              onChangeText={setLocation}
              onFocus={closePickers}
              icon={<MapPin size={20} color={colors.text.secondary} />}
            />

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
                    <Calendar size={20} color={colors.text.secondary} />
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
                    <Clock size={20} color={colors.text.secondary} />
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


            <TextInput
              label="Spots available"
              placeholder="How many people can join?"
              value={spots}
              onChangeText={setSpots}
              onFocus={closePickers}
              keyboardType="number-pad"
              icon={<Users size={20} color={colors.text.secondary} />}
            />

            <View style={styles.switchContainer}>
              <View style={styles.switchTextContainer}>
                <Text style={[styles.switchLabel, { color: colors.text.primary }]}>
                  Auto-accept participants
                </Text>
                <Text style={[styles.switchDescription, { color: colors.text.secondary }]}>
                  {autoAccept
                    ? 'People will join automatically'
                    : 'You will approve each request manually'}
                </Text>
              </View>
              <Switch
                value={autoAccept}
                onValueChange={setAutoAccept}
                trackColor={{ false: colors.border.primary, true: colors.accent.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
          </KeyboardAvoidingView>
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
                  value={selectedDate || new Date()}
                  mode="date"
                  display="inline"
                  onChange={handleDateChange}
                  minimumDate={new Date()}
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
  keyboardView: {
    flex: 1,
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  checkButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  headerTitle: {
    ...Typography.h3,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    gap: 20,
  },
  fieldContainer: {
    width: '100%',
  },
  label: {
    ...Typography.caption,
    marginBottom: Spacing.xs,
    marginLeft: Spacing.xs,
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
    minHeight: 100,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryChipText: {
    ...Typography.bodySmall,
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
  imagePickerContainer: {
    borderWidth: 1,
    borderRadius: Spacing.borderRadius.md,
    overflow: 'hidden',
    height: 160,
  },
  pickedImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
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
    gap: 10,
  },
  datePickerText: {
    ...Typography.body,
    flex: 1,
  },
  datePickerContainer: {
    marginTop: -10,
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerModal: {
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    maxWidth: 360,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pickerTitle: {
    ...Typography.h3,
  },
  pickerDone: {
    ...Typography.body,
    fontWeight: '600',
  },
  picker: {
    height: 320,
  },
  timePicker: {
    height: 200,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  switchTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  switchLabel: {
    ...Typography.body,
    fontWeight: '500',
  },
  switchDescription: {
    ...Typography.caption,
    marginTop: 2,
  },
});
