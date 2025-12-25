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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, MapPin, Calendar, Clock, Users, ImageSquare } from 'phosphor-react-native';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { useTheme } from '../../contexts/ThemeContext';
import { Typography, Spacing } from '../../constants';
import TextInput from '../common/TextInput';
import { useEventsStore } from '../../stores/eventsStore';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MODAL_HEIGHT = SCREEN_HEIGHT * 0.85;

const CATEGORIES = [
  { id: 'sports', label: 'Sports', color: '#34C759' },
  { id: 'parties', label: 'Parties', color: '#FF2D55' },
  { id: 'business', label: 'Business', color: '#5856D6' },
  { id: 'freetime', label: 'Free Time', color: '#FF9500' },
  { id: 'studies', label: 'Studies', color: '#007AFF' },
  { id: 'concerts', label: 'Concerts', color: '#AF52DE' },
  { id: 'private', label: 'Private', color: '#8E8E93' },
];

interface CreateEventModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function CreateEventModal({ visible, onClose }: CreateEventModalProps) {
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

  const handleDateChange = (_event: DateTimePickerEvent, date?: Date) => {
    setShowDatePicker(false);
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

      const result = await createEvent({
        title,
        description: description || 'No description',
        category_id: categoryId,
        location_address: location,
        location_lat: 40.7484, // TODO: Get from location picker
        location_lng: -73.9857,
        start_time: startTime,
        max_participants: parseInt(spots, 10) || 10,
      });

      if (result.success) {
        handleClose();
      } else {
        Alert.alert('Error', result.error || 'Failed to create event');
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
            <Text style={[styles.headerTitle, { color: colors.text.primary }]}>New Event</Text>
            <TouchableOpacity
              onPress={handleCreate}
              disabled={!isValid}
              style={[
                styles.createButton,
                { backgroundColor: isValid ? colors.accent.primary : colors.background.tertiary },
              ]}
            >
              <Text
                style={[
                  styles.createButtonText,
                  { color: isValid ? '#FFFFFF' : colors.text.tertiary },
                ]}
              >
                Create
              </Text>
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
                {CATEGORIES.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor:
                          selectedCategory === category.id
                            ? category.color
                            : colors.background.secondary,
                        borderColor:
                          selectedCategory === category.id
                            ? category.color
                            : colors.border.primary,
                      },
                    ]}
                    onPress={() => { closePickers(); setSelectedCategory(category.id); }}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        {
                          color:
                            selectedCategory === category.id
                              ? '#FFFFFF'
                              : colors.text.secondary,
                        },
                      ]}
                    >
                      {category.label}
                    </Text>
                  </TouchableOpacity>
                ))}
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

            {showDatePicker && (
              <View style={styles.datePickerContainer}>
                <DateTimePicker
                  value={selectedDate || new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  onChange={handleDateChange}
                  minimumDate={new Date()}
                  themeVariant={activeTheme}
                />
              </View>
            )}

            {showTimePicker && (
              <View style={styles.datePickerContainer}>
                <DateTimePicker
                  value={selectedTime || new Date()}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleTimeChange}
                  themeVariant={activeTheme}
                  is24Hour={false}
                  locale="en-US"
                />
              </View>
            )}

            <TextInput
              label="Spots available"
              placeholder="How many people can join?"
              value={spots}
              onChangeText={setSpots}
              onFocus={closePickers}
              keyboardType="number-pad"
              icon={<Users size={20} color={colors.text.secondary} />}
            />

            <View style={{ height: 40 }} />
          </ScrollView>
          </KeyboardAvoidingView>
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
  headerTitle: {
    ...Typography.h3,
  },
  createButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Spacing.borderRadius.md,
  },
  createButtonText: {
    ...Typography.bodySmall,
    fontWeight: '600',
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
});
