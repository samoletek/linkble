import { create } from 'zustand';
import { Profile, ProfileUpdate } from '../types/database';
import {
  getProfile,
  getCurrentProfile,
  updateProfile,
  uploadAvatar,
  deleteAvatar,
  deleteAccount,
} from '../services/auth';
import { pushNotificationService } from '../services/pushNotifications';

interface UserState {
  profile: Profile | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadProfile: (userId?: string) => Promise<void>;
  updateProfile: (updates: ProfileUpdate) => Promise<{ success: boolean; error?: string }>;
  uploadAvatar: (file: { uri: string; type: string; name: string }) => Promise<{ success: boolean; url?: string; error?: string }>;
  deleteAvatar: () => Promise<{ success: boolean; error?: string }>;
  deleteAccount: () => Promise<{ success: boolean; error?: string }>;
  clearProfile: () => void;
  clearError: () => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  profile: null,
  isLoading: false,
  error: null,

  loadProfile: async (userId) => {
    set({ isLoading: true, error: null });

    try {
      const profile = userId
        ? await getProfile(userId)
        : await getCurrentProfile();

      if (profile) {
        // Identify user in OneSignal
        console.log('🔔 [OneSignal] Logging in user:', profile.id);
        pushNotificationService.setUserId(profile.id);
      } else {
        console.log('⚠️ [OneSignal] No profile loaded, skipping login');
      }

      set({ profile, isLoading: false });
    } catch (error) {
      set({ isLoading: false, error: 'Failed to load profile' });
    }
  },

  updateProfile: async (updates) => {
    const { profile } = get();
    if (!profile) {
      return { success: false, error: 'No profile loaded' };
    }

    set({ isLoading: true, error: null });

    const result = await updateProfile(profile.id, updates);

    if (result.error) {
      set({ isLoading: false, error: result.error.message });
      return { success: false, error: result.error.message };
    }

    set({ profile: result.profile, isLoading: false });
    return { success: true };
  },

  uploadAvatar: async (file) => {
    const { profile } = get();
    if (!profile) {
      return { success: false, error: 'No profile loaded' };
    }

    set({ isLoading: true, error: null });

    const result = await uploadAvatar(profile.id, file);

    if (result.error) {
      set({ isLoading: false, error: result.error.message });
      return { success: false, error: result.error.message };
    }

    // Update local profile with new avatar
    set((state) => ({
      profile: state.profile ? { ...state.profile, avatar_url: result.url } : null,
      isLoading: false,
    }));

    return { success: true, url: result.url || undefined };
  },

  deleteAvatar: async () => {
    const { profile } = get();
    if (!profile) {
      return { success: false, error: 'No profile loaded' };
    }

    set({ isLoading: true, error: null });

    const result = await deleteAvatar(profile.id);

    if (result.error) {
      set({ isLoading: false, error: result.error.message });
      return { success: false, error: result.error.message };
    }

    set((state) => ({
      profile: state.profile ? { ...state.profile, avatar_url: null } : null,
      isLoading: false,
    }));

    return { success: true };
  },

  deleteAccount: async () => {
    set({ isLoading: true, error: null });

    const result = await deleteAccount();

    if (result.error) {
      set({ isLoading: false, error: result.error.message });
      return { success: false, error: result.error.message };
    }

    // Logout from OneSignal
    pushNotificationService.logout();

    set({ profile: null, isLoading: false });
    return { success: true };
  },

  clearProfile: () => {
    // Logout from OneSignal
    pushNotificationService.logout();
    set({ profile: null });
  },

  clearError: () => {
    set({ error: null });
  },
}));

// Re-export Profile type for convenience
export type { Profile };
