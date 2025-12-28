import { supabase } from '../config/supabase';
import { Profile, ProfileUpdate } from '../types/database';
import { AuthError, Session, User } from '@supabase/supabase-js';

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

  // Profile will be created automatically by database trigger
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
      await (supabase.from('profiles') as any).insert({
        id: authData.user.id,
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

    // 8. Sign out
    await signOut();

    return { error: null };
  } catch (error) {
    return { error: error instanceof Error ? error : new Error('Failed to delete account') };
  }
};
