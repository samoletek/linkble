import { create } from 'zustand';
import {
  EventWithHost,
  EventWithDetails,
  Category,
  EventInsert,
} from '../types/database';
import {
  getCategories,
  getNearbyEvents,
  getEventsByCategory,
  getEvent,
  getUserEvents,
  createEvent,
  updateEvent,
  cancelEvent,
  requestToJoin,
  respondToRequest,
  leaveEvent,
} from '../services/events';

interface EventsState {
  // Data
  events: EventWithHost[];
  categories: Category[];
  selectedEvent: EventWithDetails | null;
  userEvents: EventWithHost[];

  // Filters
  selectedCategoryId: number | null;
  searchRadius: number;
  userLocation: { latitude: number; longitude: number } | null;

  // Loading states
  isLoading: boolean;
  isLoadingEvent: boolean;
  error: string | null;

  // Actions
  loadCategories: () => Promise<void>;
  loadNearbyEvents: (latitude: number, longitude: number) => Promise<void>;
  loadEventsByCategory: (categoryId: number) => Promise<void>;
  loadEvent: (eventId: string) => Promise<void>;
  loadUserEvents: (userId: string) => Promise<void>;
  createEvent: (data: Omit<EventInsert, 'host_id'>) => Promise<{ success: boolean; eventId?: string; error?: string }>;
  updateEvent: (eventId: string, data: Partial<EventInsert>) => Promise<{ success: boolean; error?: string }>;
  cancelEvent: (eventId: string) => Promise<{ success: boolean; error?: string }>;
  requestToJoin: (eventId: string) => Promise<{ success: boolean; status?: string; error?: string }>;
  respondToRequest: (participantId: string, accept: boolean) => Promise<{ success: boolean; error?: string }>;
  leaveEvent: (eventId: string) => Promise<{ success: boolean; error?: string }>;

  // Setters
  setSelectedCategory: (categoryId: number | null) => void;
  setSearchRadius: (radius: number) => void;
  setUserLocation: (location: { latitude: number; longitude: number }) => void;
  clearSelectedEvent: () => void;
  clearError: () => void;
}

export const useEventsStore = create<EventsState>((set, get) => ({
  // Initial state
  events: [],
  categories: [],
  selectedEvent: null,
  userEvents: [],
  selectedCategoryId: null,
  searchRadius: 10,
  userLocation: null,
  isLoading: false,
  isLoadingEvent: false,
  error: null,

  loadCategories: async () => {
    const categories = await getCategories();
    set({ categories });
  },

  loadNearbyEvents: async (latitude, longitude) => {
    set({ isLoading: true, error: null, userLocation: { latitude, longitude } });

    try {
      const { searchRadius, selectedCategoryId } = get();
      let events: EventWithHost[];

      if (selectedCategoryId) {
        events = await getEventsByCategory(selectedCategoryId, latitude, longitude);
      } else {
        events = await getNearbyEvents(latitude, longitude, searchRadius);
      }

      set({ events, isLoading: false });
    } catch (error) {
      set({ isLoading: false, error: 'Failed to load events' });
    }
  },

  loadEventsByCategory: async (categoryId) => {
    set({ isLoading: true, error: null, selectedCategoryId: categoryId });

    try {
      const { userLocation } = get();
      const events = await getEventsByCategory(
        categoryId,
        userLocation?.latitude,
        userLocation?.longitude
      );
      set({ events, isLoading: false });
    } catch (error) {
      set({ isLoading: false, error: 'Failed to load events' });
    }
  },

  loadEvent: async (eventId) => {
    set({ isLoadingEvent: true, error: null });

    try {
      const event = await getEvent(eventId);
      set({ selectedEvent: event, isLoadingEvent: false });
    } catch (error) {
      set({ isLoadingEvent: false, error: 'Failed to load event' });
    }
  },

  loadUserEvents: async (userId) => {
    set({ isLoading: true, error: null });

    try {
      const userEvents = await getUserEvents(userId);
      set({ userEvents, isLoading: false });
    } catch (error) {
      set({ isLoading: false, error: 'Failed to load your events' });
    }
  },

  createEvent: async (data) => {
    set({ isLoading: true, error: null });

    const result = await createEvent(data);

    if (result.error) {
      set({ isLoading: false, error: result.error.message });
      return { success: false, error: result.error.message };
    }

    // Reload events
    const { userLocation, searchRadius } = get();
    if (userLocation) {
      const events = await getNearbyEvents(userLocation.latitude, userLocation.longitude, searchRadius);
      set({ events, isLoading: false });
    } else {
      set({ isLoading: false });
    }

    return { success: true, eventId: result.event?.id };
  },

  updateEvent: async (eventId, data) => {
    set({ isLoading: true, error: null });

    const result = await updateEvent(eventId, data);

    if (result.error) {
      set({ isLoading: false, error: result.error.message });
      return { success: false, error: result.error.message };
    }

    // Reload event details if it's selected
    if (get().selectedEvent?.id === eventId) {
      await get().loadEvent(eventId);
    }

    set({ isLoading: false });
    return { success: true };
  },

  cancelEvent: async (eventId) => {
    set({ isLoading: true, error: null });

    const result = await cancelEvent(eventId);

    if (result.error) {
      set({ isLoading: false, error: result.error.message });
      return { success: false, error: result.error.message };
    }

    // Remove from events list
    set((state) => ({
      events: state.events.filter((e) => e.id !== eventId),
      selectedEvent: state.selectedEvent?.id === eventId ? null : state.selectedEvent,
      isLoading: false,
    }));

    return { success: true };
  },

  requestToJoin: async (eventId) => {
    set({ isLoading: true, error: null });

    const result = await requestToJoin(eventId);

    if (result.error) {
      set({ isLoading: false, error: result.error.message });
      return { success: false, error: result.error.message };
    }

    // Reload event details
    if (get().selectedEvent?.id === eventId) {
      await get().loadEvent(eventId);
    }

    set({ isLoading: false });
    return { success: true, status: result.status || undefined };
  },

  respondToRequest: async (participantId, accept) => {
    set({ isLoading: true, error: null });

    const result = await respondToRequest(participantId, accept);

    if (result.error) {
      set({ isLoading: false, error: result.error.message });
      return { success: false, error: result.error.message };
    }

    // Reload event details if selected
    const { selectedEvent } = get();
    if (selectedEvent) {
      await get().loadEvent(selectedEvent.id);
    }

    set({ isLoading: false });
    return { success: true };
  },

  leaveEvent: async (eventId) => {
    set({ isLoading: true, error: null });

    const result = await leaveEvent(eventId);

    if (result.error) {
      set({ isLoading: false, error: result.error.message });
      return { success: false, error: result.error.message };
    }

    // Reload event details
    if (get().selectedEvent?.id === eventId) {
      await get().loadEvent(eventId);
    }

    set({ isLoading: false });
    return { success: true };
  },

  setSelectedCategory: (categoryId) => {
    set({ selectedCategoryId: categoryId });

    // Reload events with new filter
    const { userLocation } = get();
    if (userLocation) {
      if (categoryId) {
        get().loadEventsByCategory(categoryId);
      } else {
        get().loadNearbyEvents(userLocation.latitude, userLocation.longitude);
      }
    }
  },

  setSearchRadius: (radius) => {
    set({ searchRadius: radius });

    // Reload events with new radius
    const { userLocation } = get();
    if (userLocation) {
      get().loadNearbyEvents(userLocation.latitude, userLocation.longitude);
    }
  },

  setUserLocation: (location) => {
    set({ userLocation: location });
  },

  clearSelectedEvent: () => {
    set({ selectedEvent: null });
  },

  clearError: () => {
    set({ error: null });
  },
}));
