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

/**
 * Get all user IDs that should be hidden from the current user:
 * - Users the current user has blocked
 * - Users who have blocked the current user
 */
export async function getBlockedUserIds(userId: string): Promise<string[]> {
  // Users I blocked
  const { data: blocked, error: blockedError } = await supabase
    .from('blocked_users')
    .select('blocked_id')
    .eq('blocker_id', userId) as { data: { blocked_id: string }[] | null; error: any };

  if (blockedError) throw blockedError;

  // Users who blocked me
  const { data: blockedBy, error: blockedByError } = await supabase
    .from('blocked_users')
    .select('blocker_id')
    .eq('blocked_id', userId) as { data: { blocker_id: string }[] | null; error: any };

  if (blockedByError) throw blockedByError;

  const blockedIds = (blocked || []).map(b => b.blocked_id);
  const blockedByIds = (blockedBy || []).map(b => b.blocker_id);

  // Return unique list of all blocked user IDs
  return [...new Set([...blockedIds, ...blockedByIds])];
}
