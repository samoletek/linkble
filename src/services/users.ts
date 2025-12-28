import { supabase } from '../config/supabase';
import type { BlockedUser, Profile } from '../types';

export interface BlockedUserWithProfile extends BlockedUser {
  blocked_profile: Profile;
}

export async function getBlockedUsers(userId: string): Promise<BlockedUserWithProfile[]> {
  const { data, error } = await supabase
    .from('blocked_users')
    .select(`
      *,
      blocked_profile:profiles!blocked_id(*)
    `)
    .eq('blocker_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function blockUser(blockerId: string, blockedId: string): Promise<void> {
  const { error } = await (supabase
    .from('blocked_users') as any)
    .insert({ blocker_id: blockerId, blocked_id: blockedId });

  if (error) throw error;
}

export async function unblockUser(blockerId: string, blockedId: string): Promise<void> {
  const { error } = await supabase
    .from('blocked_users')
    .delete()
    .eq('blocker_id', blockerId)
    .eq('blocked_id', blockedId);

  if (error) throw error;
}

export async function isUserBlocked(blockerId: string, blockedId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('blocked_users')
    .select('id')
    .eq('blocker_id', blockerId)
    .eq('blocked_id', blockedId)
    .maybeSingle();

  if (error) throw error;
  return !!data;
}

export async function isBlockedByUser(userId: string, otherUserId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('blocked_users')
    .select('id')
    .eq('blocker_id', otherUserId)
    .eq('blocked_id', userId)
    .maybeSingle();

  if (error) throw error;
  return !!data;
}
