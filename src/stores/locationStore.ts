import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { geocodeAddress } from '../utils/geocoding';

interface LocationState {
  // GPS location (when permission granted)
  gpsLocation: { latitude: number; longitude: number } | null;
  gpsPermissionGranted: boolean;

  // Manual address
  manualAddress: string | null;
  manualLocation: { latitude: number; longitude: number } | null;

  // Effective location (GPS takes priority over manual)
  effectiveLocation: { latitude: number; longitude: number } | null;

  // Hydration state
  isHydrated: boolean;

  // Loading state
  isLoading: boolean;
  error: string | null;

  // Actions
  requestGpsLocation: () => Promise<boolean>;
  setManualAddress: (address: string) => Promise<{ success: boolean; error?: string }>;
  clearManualAddress: () => void;
  refreshLocation: () => Promise<void>;
}

const DEFAULT_LOCATION = { latitude: 40.7484, longitude: -73.9857 }; // New York fallback

export const useLocationStore = create<LocationState>()(
  persist(
    (set, get) => ({
      gpsLocation: null,
      gpsPermissionGranted: false,
      manualAddress: null,
      manualLocation: null,
      effectiveLocation: null,
      isHydrated: false,
      isLoading: false,
      error: null,

      requestGpsLocation: async () => {
        set({ isLoading: true, error: null });

        try {
          const { status } = await Location.requestForegroundPermissionsAsync();

          if (status === 'granted') {
            const location = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });

            const gpsLocation = {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            };

            set({
              gpsLocation,
              gpsPermissionGranted: true,
              effectiveLocation: gpsLocation,
              isLoading: false,
            });

            return true;
          } else {
            set({
              gpsPermissionGranted: false,
              isLoading: false,
            });

            // Use manual location if available
            const { manualLocation } = get();
            if (manualLocation) {
              set({ effectiveLocation: manualLocation });
            }

            return false;
          }
        } catch (error) {
          set({
            isLoading: false,
            error: 'Failed to get location',
          });
          return false;
        }
      },

      setManualAddress: async (address: string) => {
        set({ isLoading: true, error: null });

        try {
          const result = await geocodeAddress(address);

          if (result.success && result.location) {
            const manualLocation = result.location;

            set({
              manualAddress: address,
              manualLocation,
              // Manual address takes priority when explicitly set by user
              effectiveLocation: manualLocation,
              isLoading: false,
            });

            return { success: true };
          } else {
            set({
              isLoading: false,
              error: result.error || 'Address not found',
            });
            return { success: false, error: result.error || 'Address not found' };
          }
        } catch (error) {
          set({
            isLoading: false,
            error: 'Failed to geocode address',
          });
          return { success: false, error: 'Failed to geocode address' };
        }
      },

      clearManualAddress: () => {
        const { gpsLocation, gpsPermissionGranted } = get();

        set({
          manualAddress: null,
          manualLocation: null,
          effectiveLocation: gpsPermissionGranted && gpsLocation ? gpsLocation : null,
        });
      },

      refreshLocation: async () => {
        const { gpsPermissionGranted, manualLocation } = get();

        if (gpsPermissionGranted) {
          await get().requestGpsLocation();
        } else if (manualLocation) {
          set({ effectiveLocation: manualLocation });
        }
      },
    }),
    {
      name: 'linkble-location',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        manualAddress: state.manualAddress,
        manualLocation: state.manualLocation,
        effectiveLocation: state.effectiveLocation,
        gpsPermissionGranted: state.gpsPermissionGranted,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isHydrated = true;
        }
      },
    }
  )
);
