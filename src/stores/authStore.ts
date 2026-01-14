import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import {
  signUp,
  signIn,
  signOut,
  resetPassword,
  getSession,
  getCurrentUser,
  onAuthStateChange,
  signInWithApple,
  signInWithGoogle,
  SignUpData,
  SignInData,
} from '../services/auth';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isInitialized: boolean;
  isAuthInProgress: boolean; // Block onAuthStateChange during auth operations
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  signUp: (data: SignUpData) => Promise<{ success: boolean; error?: string }>;
  signIn: (data: SignInData) => Promise<{ success: boolean; error?: string }>;
  signInWithApple: () => Promise<{ success: boolean; error?: string }>;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  isLoading: false,
  isInitialized: false,
  isAuthInProgress: false,
  error: null,

  initialize: async () => {
    try {
      set({ isLoading: true });

      // Get current session
      const session = await getSession();
      const user = session ? await getCurrentUser() : null;

      set({
        session,
        user,
        isInitialized: true,
        isLoading: false,
      });

      // Listen for auth changes (skip if auth operation is in progress)
      onAuthStateChange((newSession) => {
        if (get().isAuthInProgress) return;
        set({
          session: newSession,
          user: newSession?.user || null,
        });
      });
    } catch (error) {
      set({
        isInitialized: true,
        isLoading: false,
        error: 'Failed to initialize authentication',
      });
    }
  },

  signUp: async (data) => {
    set({ isLoading: true, isAuthInProgress: true, error: null });

    const result = await signUp(data);

    if (result.error) {
      set({ isLoading: false, isAuthInProgress: false, error: result.error.message });
      return { success: false, error: result.error.message };
    }

    set({
      user: result.user,
      session: result.session,
      isLoading: false,
      isAuthInProgress: false,
    });

    return { success: true };
  },

  signIn: async (data) => {
    set({ isLoading: true, error: null });

    const result = await signIn(data);

    if (result.error) {
      set({ isLoading: false, error: result.error.message });
      return { success: false, error: result.error.message };
    }

    set({
      user: result.user,
      session: result.session,
      isLoading: false,
    });

    return { success: true };
  },

  signInWithApple: async () => {
    set({ isLoading: true, isAuthInProgress: true, error: null });

    const result = await signInWithApple();

    if (result.error) {
      set({ isLoading: false, isAuthInProgress: false, error: result.error.message });
      return { success: false, error: result.error.message };
    }

    // User cancelled - not an error
    if (!result.user) {
      set({ isLoading: false, isAuthInProgress: false });
      return { success: false };
    }

    set({
      user: result.user,
      session: result.session,
      isLoading: false,
      isAuthInProgress: false,
    });

    return { success: true };
  },

  signInWithGoogle: async () => {
    set({ isLoading: true, isAuthInProgress: true, error: null });

    const result = await signInWithGoogle();

    if (result.error) {
      set({ isLoading: false, isAuthInProgress: false, error: result.error.message });
      return { success: false, error: result.error.message };
    }

    if (!result.user) {
      set({ isLoading: false, isAuthInProgress: false });
      return { success: false };
    }

    set({
      user: result.user,
      session: result.session,
      isLoading: false,
      isAuthInProgress: false,
    });

    return { success: true };
  },

  signOut: async () => {
    set({ isLoading: true });

    await signOut();

    set({
      user: null,
      session: null,
      isLoading: false,
    });
  },

  resetPassword: async (email) => {
    set({ isLoading: true, error: null });

    const result = await resetPassword(email);

    set({ isLoading: false });

    if (result.error) {
      set({ error: result.error.message });
      return { success: false, error: result.error.message };
    }

    return { success: true };
  },

  clearError: () => {
    set({ error: null });
  },
}));
