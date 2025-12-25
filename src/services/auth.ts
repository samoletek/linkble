import { supabase } from '../config/supabase';
import { Profile, ProfileInsert, ProfileUpdate } from '../types/database';
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

  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError || !authData.user) {
    return { user: null, session: null, error: authError };
  }

  // Create profile
  const profileData: ProfileInsert = {
    id: authData.user.id,
    full_name: fullName,
    date_of_birth: dateOfBirth,
    interests: [],
  };

  const { error: profileError } = await (supabase
    .from('profiles') as any)
    .insert(profileData);

  if (profileError) {
    // Rollback: delete auth user if profile creation fails
    await supabase.auth.admin.deleteUser(authData.user.id).catch(() => {});
    return {
      user: null,
      session: null,
      error: { message: profileError.message, name: 'ProfileError', status: 400 } as AuthError,
    };
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
  if (updates.username) {
    const { data: currentProfile } = await (supabase
      .from('profiles') as any)
      .select('last_username_change')
      .eq('id', userId)
      .single();

    if (currentProfile?.last_username_change) {
      const lastChange = new Date(currentProfile.last_username_change);
      const daysSinceChange = (Date.now() - lastChange.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSinceChange < 30) {
        return {
          profile: null,
          error: new Error(`You can change your username in ${Math.ceil(30 - daysSinceChange)} days`),
        };
      }
    }

    // Add timestamp for username change
    (updates as any).last_username_change = new Date().toISOString();
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

  // Convert URI to blob for upload
  const response = await fetch(file.uri);
  const blob = await response.blob();

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(fileName, blob, {
      upsert: true,
      contentType: file.type,
    });

  if (uploadError) {
    return { url: null, error: new Error(uploadError.message) };
  }

  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(fileName);

  // Update profile with new avatar URL
  await updateProfile(userId, { avatar_url: publicUrl });

  return { url: publicUrl, error: null };
};

// ============================================
// Account Deletion
// ============================================

export const deleteAccount = async (): Promise<{ error: Error | null }> => {
  const user = await getCurrentUser();
  if (!user) {
    return { error: new Error('Not authenticated') };
  }

  // Delete profile (cascade will handle related data)
  const { error: profileError } = await supabase
    .from('profiles')
    .delete()
    .eq('id', user.id);

  if (profileError) {
    return { error: new Error(profileError.message) };
  }

  // Sign out
  await signOut();

  return { error: null };
};
