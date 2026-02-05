import { supabase } from '../config/supabase';
import { Profile, ProfileUpdate } from '../types/database';
import { AuthError, Session, User } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

// Configure Google Sign In - call this once on app startup
export const configureGoogleSignIn = () => {
  GoogleSignin.configure({
    offlineAccess: true,
    forceCodeForRefreshToken: true,
    scopes: ['email', 'profile'],
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '',
  });
};

// ============================================
// Types
// ============================================

export interface SignUpData {
  email: string;
  password: string;
  fullName: string;
  dateOfBirth: string; // ISO date string
}

export interface SignInData {
  email: string;
  password: string;
}

export interface AuthResult {
  user: User | null;
  session: Session | null;
  error: AuthError | null;
}

// ============================================
// Helper Functions
// ============================================

const generateRandomUsername = (): string => {
  // Generate 6-digit random number (100000-999999)
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const generateUniqueUsername = async (): Promise<string> => {
  let username = generateRandomUsername();
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single();

    if (!existing) {
      return username;
    }

    username = generateRandomUsername();
    attempts++;
  }

  // Fallback: add timestamp suffix if all attempts fail
  return `${generateRandomUsername()}${Date.now().toString().slice(-3)}`;
};

// ============================================
// Authentication
// ============================================

export const signUp = async (data: SignUpData): Promise<AuthResult> => {
  const { email, password, fullName, dateOfBirth } = data;

  // Validate age (16+)
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  const age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (age < 16 || (age === 16 && monthDiff < 0)) {
    return {
      user: null,
      session: null,
      error: { message: 'You must be at least 16 years old', name: 'AuthError', status: 400 } as AuthError,
    };
  }

  // Create auth user with metadata
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        date_of_birth: dateOfBirth,
      },
    },
  });

  if (authError || !authData.user) {
    return { user: null, session: null, error: authError };
  }

  // Generate unique 6-digit username
  const username = await generateUniqueUsername();

  // Wait briefly for trigger to create profile, then update or create
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Check if profile exists (created by trigger)
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', authData.user.id)
    .single();

  if (existingProfile) {
    // Profile exists, update username
    await (supabase.from('profiles') as any)
      .update({ username })
      .eq('id', authData.user.id);
  } else {
    // No profile from trigger, create it with username
    await (supabase.from('profiles') as any).insert({
      id: authData.user.id,
      username,
      full_name: fullName,
      date_of_birth: dateOfBirth,
      interests: [],
    });
  }

  return {
    user: authData.user,
    session: authData.session,
    error: null,
  };
};

export const signIn = async (data: SignInData): Promise<AuthResult> => {
  const { email, password } = data;

  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authData?.user && !error) {
    // Check if profile exists, create if missing
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', authData.user.id)
      .single();

    if (!existingProfile) {
      // Create profile for users who were created outside the app
      const username = await generateUniqueUsername();
      await (supabase.from('profiles') as any).insert({
        id: authData.user.id,
        username,
        full_name: email.split('@')[0],
        date_of_birth: '1990-01-01',
        interests: [],
      });
    }
  }

  return {
    user: authData?.user || null,
    session: authData?.session || null,
    error,
  };
};

export const signOut = async (): Promise<{ error: AuthError | null }> => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

// ============================================
// Social Authentication (Apple & Google)
// ============================================

export const signInWithApple = async (): Promise<AuthResult> => {
  try {
    // Check if Apple Sign In is available (iOS only)
    if (Platform.OS !== 'ios') {
      return {
        user: null,
        session: null,
        error: { message: 'Apple Sign In is only available on iOS', name: 'AuthError', status: 400 } as AuthError,
      };
    }

    const isAvailable = await AppleAuthentication.isAvailableAsync();
    if (!isAvailable) {
      return {
        user: null,
        session: null,
        error: { message: 'Apple Sign In is not available on this device', name: 'AuthError', status: 400 } as AuthError,
      };
    }

    // Generate a random nonce for security
    const rawNonce = Crypto.randomUUID();
    const hashedNonce = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      rawNonce
    );

    // Request Apple credentials
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      ],
      nonce: hashedNonce,
    });

    if (!credential.identityToken) {
      return {
        user: null,
        session: null,
        error: { message: 'Sign in cancelled', name: 'AuthError', status: 400 } as AuthError,
      };
    }

    // Sign in with Supabase using the Apple ID token
    const { data: authData, error: authError } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
      nonce: rawNonce,
    });

    if (authError || !authData.user) {
      return { user: null, session: null, error: authError };
    }

    // Check if profile exists, create if missing
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', authData.user.id)
      .single();

    if (!existingProfile) {
      // Create profile for new user
      const username = await generateUniqueUsername();
      const fullName = credential.fullName
        ? `${credential.fullName.givenName || ''} ${credential.fullName.familyName || ''}`.trim()
        : authData.user.email?.split('@')[0] || 'User';

      await (supabase.from('profiles') as any).insert({
        id: authData.user.id,
        username,
        full_name: fullName,
        date_of_birth: '1990-01-01', // Default, user can update later
        interests: [],
      });
    }

    return {
      user: authData.user,
      session: authData.session,
      error: null,
    };
  } catch (error: any) {
    // Handle user cancellation
    if (error.code === 'ERR_REQUEST_CANCELED') {
      return {
        user: null,
        session: null,
        error: null, // Not an error, user just cancelled
      };
    }

    return {
      user: null,
      session: null,
      error: { message: error.message || 'Apple Sign In failed', name: 'AuthError', status: 500 } as AuthError,
    };
  }
};

export const signInWithGoogle = async (): Promise<AuthResult> => {
  try {
    // Check if Google Play Services are available (Android)
    if (Platform.OS === 'android') {
      await GoogleSignin.hasPlayServices();
    }

    // Sign in with Google
    const userInfo = await GoogleSignin.signIn();

    if (!userInfo?.data?.idToken) {
      return {
        user: null,
        session: null,
        error: { message: 'Sign in cancelled', name: 'AuthError', status: 400 } as AuthError,
      };
    }

    // Authenticate with Supabase using the ID token
    const { data: authData, error: authError } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: userInfo.data.idToken,
    });

    if (authError || !authData.user) {
      return { user: null, session: null, error: authError };
    }

    // Check if profile exists, create if missing
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', authData.user.id)
      .single();

    if (!existingProfile) {
      // Create profile for new user
      const username = await generateUniqueUsername();
      const fullName = userInfo.data.user?.name || authData.user.email?.split('@')[0] || 'User';

      await (supabase.from('profiles') as any).insert({
        id: authData.user.id,
        username,
        full_name: fullName,
        date_of_birth: '1990-01-01', // Default, user can update later
        interests: [],
      });
    }

    return {
      user: authData.user,
      session: authData.session,
      error: null,
    };
  } catch (error: any) {
    // Handle specific Google Sign In errors
    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      return {
        user: null,
        session: null,
        error: null, // Not an error, user just cancelled
      };
    }
    if (error.code === statusCodes.IN_PROGRESS) {
      return {
        user: null,
        session: null,
        error: { message: 'Sign in already in progress', name: 'AuthError', status: 400 } as AuthError,
      };
    }
    if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      return {
        user: null,
        session: null,
        error: { message: 'Google Play Services not available', name: 'AuthError', status: 400 } as AuthError,
      };
    }

    return {
      user: null,
      session: null,
      error: { message: error.message || 'Google Sign In failed', name: 'AuthError', status: 500 } as AuthError,
    };
  }
};

export const resetPassword = async (email: string): Promise<{ error: AuthError | null }> => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'linkble://reset-password',
  });
  return { error };
};

export const updatePassword = async (newPassword: string): Promise<{ error: AuthError | null }> => {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  return { error };
};

export const changePassword = async (
  currentPassword: string,
  newPassword: string
): Promise<{ error: Error | null }> => {
  const user = await getCurrentUser();
  if (!user?.email) {
    return { error: new Error('Not authenticated') };
  }

  // Verify current password by re-authenticating
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });

  if (signInError) {
    return { error: new Error('Current password is incorrect') };
  }

  // Update to new password
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    return { error: new Error(error.message) };
  }

  return { error: null };
};

export const updateEmail = async (newEmail: string): Promise<{ error: Error | null }> => {
  const { error } = await supabase.auth.updateUser({
    email: newEmail,
  });

  if (error) {
    return { error: new Error(error.message) };
  }

  return { error: null };
};

// ============================================
// Session Management
// ============================================

export const getSession = async (): Promise<Session | null> => {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
};

export const getCurrentUser = async (): Promise<User | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

export const onAuthStateChange = (callback: (session: Session | null) => void) => {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
};

// ============================================
// Profile Management
// ============================================

export const getProfile = async (userId: string): Promise<Profile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }

  return data;
};

export const getCurrentProfile = async (): Promise<Profile | null> => {
  const user = await getCurrentUser();
  if (!user) return null;
  return getProfile(user.id);
};

export const updateProfile = async (
  userId: string,
  updates: ProfileUpdate
): Promise<{ profile: Profile | null; error: Error | null }> => {
  // Handle username change restriction (30 days)
  if (updates.username !== undefined) {
    const { data: currentProfile } = await (supabase
      .from('profiles') as any)
      .select('username, last_username_change')
      .eq('id', userId)
      .single();

    // Only check restriction if username is actually changing
    const isUsernameChanging = updates.username !== currentProfile?.username;

    if (isUsernameChanging && currentProfile?.last_username_change) {
      const lastChange = new Date(currentProfile.last_username_change);
      const daysSinceChange = (Date.now() - lastChange.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSinceChange < 30) {
        const daysRemaining = Math.ceil(30 - daysSinceChange);
        return {
          profile: null,
          error: new Error(`You can change your username in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`),
        };
      }
    }

    // Add timestamp for username change only if it's actually changing
    if (isUsernameChanging && updates.username) {
      (updates as any).last_username_change = new Date().toISOString();
    }
  }

  const { data, error } = await (supabase
    .from('profiles') as any)
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  return {
    profile: data,
    error: error ? new Error(error.message) : null,
  };
};

// ============================================
// Avatar Upload
// ============================================

export const uploadAvatar = async (
  userId: string,
  file: { uri: string; type: string; name: string }
): Promise<{ url: string | null; error: Error | null }> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/avatar.${fileExt}`;

  // Read file as base64 for React Native
  const response = await fetch(file.uri);
  const arrayBuffer = await response.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(fileName, arrayBuffer, {
      upsert: true,
      contentType: file.type,
    });

  if (uploadError) {
    return { url: null, error: new Error(uploadError.message) };
  }

  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(fileName);

  // Add cache buster to prevent stale images
  const avatarUrl = `${publicUrl}?t=${Date.now()}`;

  // Update profile with new avatar URL
  await updateProfile(userId, { avatar_url: avatarUrl });

  return { url: avatarUrl, error: null };
};

export const deleteAvatar = async (
  userId: string
): Promise<{ error: Error | null }> => {
  // List files in user's avatar folder
  const { data: files, error: listError } = await supabase.storage
    .from('avatars')
    .list(userId);

  if (listError) {
    return { error: new Error(listError.message) };
  }

  // Delete all avatar files for this user
  if (files && files.length > 0) {
    const filePaths = files.map((file) => `${userId}/${file.name}`);
    const { error: deleteError } = await supabase.storage
      .from('avatars')
      .remove(filePaths);

    if (deleteError) {
      return { error: new Error(deleteError.message) };
    }
  }

  // Update profile to remove avatar URL
  await updateProfile(userId, { avatar_url: null });

  return { error: null };
};

// ============================================
// Account Deletion
// ============================================

export const deleteAccount = async (): Promise<{ error: Error | null }> => {
  const user = await getCurrentUser();
  if (!user) {
    return { error: new Error('Not authenticated') };
  }

  const userId = user.id;

  try {
    // 1. Delete avatar from storage
    const { data: avatarFiles } = await supabase.storage
      .from('avatars')
      .list(userId);

    if (avatarFiles && avatarFiles.length > 0) {
      const filePaths = avatarFiles.map((file) => `${userId}/${file.name}`);
      await supabase.storage.from('avatars').remove(filePaths);
    }

    // Note: Events and messages in events are preserved for participants
    // They will be available in the events archive

    // 2. Delete user's direct messages
    await supabase.from('direct_messages').delete().eq('sender_id', userId);

    // 3. Delete user's conversations
    await supabase.from('conversations').delete().or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

    // 4. Delete blocked users (both directions)
    await supabase.from('blocked_users').delete().or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`);

    // 5. Delete user's reports
    await supabase.from('reports').delete().eq('reporter_id', userId);

    // 6. Delete user's notifications
    await supabase.from('notifications').delete().eq('user_id', userId);

    // 7. Delete profile
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileError) {
      return { error: new Error(profileError.message) };
    }

    // 8. Delete user from Supabase Auth via Edge Function
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      const response = await fetch(
        'https://qrtfttspspnnftkztgfw.supabase.co/functions/v1/delete-user',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to delete auth user:', errorData);
        // Continue with sign out even if auth deletion fails
        // The profile is already deleted, so the account is effectively unusable
      }
    }

    // 9. Sign out
    await signOut();

    return { error: null };
  } catch (error) {
    return { error: error instanceof Error ? error : new Error('Failed to delete account') };
  }
};
