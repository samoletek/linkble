import { supabase, getCurrentUserId } from '../config/supabase';
import {
  Event,
  EventInsert,
  EventUpdate,
  EventWithHost,
  EventWithDetails,
  EventParticipant,
  Category,
  Profile,
} from '../types/database';

// ============================================
// Categories
// ============================================

export const getCategories = async (): Promise<Category[]> => {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('id');

  if (error) {
    console.error('Error fetching categories:', error);
    return [];
  }

  return data || [];
};

// ============================================
// Event Queries
// ============================================

export const getNearbyEvents = async (
  latitude: number,
  longitude: number,
  radiusKm: number = 10
): Promise<EventWithHost[]> => {
  const { data, error } = await supabase.rpc('get_nearby_events', {
    user_lat: latitude,
    user_lng: longitude,
    radius_km: radiusKm,
  });

  if (error) {
    console.error('Error fetching nearby events:', error);
    return [];
  }

  // Fetch host and category details for each event
  const eventIds = data?.map((e: Event) => e.id) || [];
  if (eventIds.length === 0) return [];

  const { data: eventsWithDetails } = await supabase
    .from('events')
    .select(`
      *,
      host:profiles(*),
      category:categories(*)
    `)
    .in('id', eventIds)
    .order('start_time', { ascending: true });

  return (eventsWithDetails as EventWithHost[]) || [];
};

export const getEventsByCategory = async (
  categoryId: number,
  latitude?: number,
  longitude?: number
): Promise<EventWithHost[]> => {
  let query = supabase
    .from('events')
    .select(`
      *,
      host:profiles(*),
      category:categories(*)
    `)
    .eq('category_id', categoryId)
    .eq('status', 'active')
    .gt('start_time', new Date().toISOString())
    .order('start_time', { ascending: true });

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching events by category:', error);
    return [];
  }

  return (data as EventWithHost[]) || [];
};

export const getEvent = async (eventId: string): Promise<EventWithDetails | null> => {
  const userId = await getCurrentUserId();

  const { data: event, error } = await supabase
    .from('events')
    .select(`
      *,
      host:profiles(*),
      category:categories(*)
    `)
    .eq('id', eventId)
    .single();

  if (error || !event) {
    console.error('Error fetching event:', error);
    return null;
  }

  // Get participants count
  const { count: participantsCount } = await supabase
    .from('event_participants')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .eq('status', 'accepted');

  // Check if current user is participant
  let participantStatus = null;
  if (userId) {
    const { data: participant } = await supabase
      .from('event_participants')
      .select('status')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .single();

    participantStatus = participant?.status || null;
  }

  return {
    ...event,
    participants_count: (participantsCount || 0) + 1, // +1 for host
    is_participant: participantStatus === 'accepted' || event.host_id === userId,
    participant_status: participantStatus,
  } as EventWithDetails;
};

export const getUserEvents = async (userId: string): Promise<EventWithHost[]> => {
  // Events where user is host
  const { data: hostedEvents } = await supabase
    .from('events')
    .select(`
      *,
      host:profiles(*),
      category:categories(*)
    `)
    .eq('host_id', userId)
    .order('start_time', { ascending: true });

  // Events where user is accepted participant
  const { data: participantEvents } = await supabase
    .from('event_participants')
    .select(`
      event:events(
        *,
        host:profiles(*),
        category:categories(*)
      )
    `)
    .eq('user_id', userId)
    .eq('status', 'accepted');

  const hosted = (hostedEvents as EventWithHost[]) || [];
  const participating = participantEvents?.map((p: any) => p.event).filter(Boolean) || [];

  // Combine and sort by start time
  const allEvents = [...hosted, ...participating];
  allEvents.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  return allEvents;
};

// ============================================
// Event CRUD
// ============================================

export const createEvent = async (
  eventData: Omit<EventInsert, 'host_id'>
): Promise<{ event: Event | null; error: Error | null }> => {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { event: null, error: new Error('Not authenticated') };
  }

  // Ensure profile exists (required for foreign key)
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .single();

  if (!existingProfile) {
    // Get user email for profile name
    const { data: { user } } = await supabase.auth.getUser();
    const profileName = user?.email?.split('@')[0] || 'User';

    const { error: profileError } = await (supabase.from('profiles') as any).insert({
      id: userId,
      full_name: profileName,
      date_of_birth: '1990-01-01',
      interests: [],
    });

    if (profileError) {
      return { event: null, error: new Error('Failed to create profile: ' + profileError.message) };
    }
  }

  // Check if user already has an active event they're participating in
  const { data: existingParticipation } = await supabase
    .from('event_participants')
    .select('event_id')
    .eq('user_id', userId)
    .eq('status', 'accepted')
    .limit(1);

  if (existingParticipation && existingParticipation.length > 0) {
    // Verify the event is still active and upcoming
    const { data: activeEvent } = await supabase
      .from('events')
      .select('id')
      .eq('id', existingParticipation[0].event_id)
      .eq('status', 'active')
      .gt('start_time', new Date().toISOString())
      .single();

    if (activeEvent) {
      return { event: null, error: new Error('You are already participating in another event') };
    }
  }

  const { data, error } = await (supabase
    .from('events') as any)
    .insert({
      ...eventData,
      host_id: userId,
    })
    .select()
    .single();

  if (error) {
    return { event: null, error: new Error(error.message) };
  }

  return { event: data, error: null };
};

export const updateEvent = async (
  eventId: string,
  updates: EventUpdate
): Promise<{ event: Event | null; error: Error | null }> => {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { event: null, error: new Error('Not authenticated') };
  }

  // Verify ownership
  const { data: existing } = await supabase
    .from('events')
    .select('host_id')
    .eq('id', eventId)
    .single();

  if (!existing || existing.host_id !== userId) {
    return { event: null, error: new Error('Not authorized to update this event') };
  }

  const { data, error } = await supabase
    .from('events')
    .update(updates)
    .eq('id', eventId)
    .select()
    .single();

  if (error) {
    return { event: null, error: new Error(error.message) };
  }

  return { event: data, error: null };
};

export const cancelEvent = async (
  eventId: string
): Promise<{ error: Error | null }> => {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { error: new Error('Not authenticated') };
  }

  // Get event and verify ownership + timing
  const { data: event } = await supabase
    .from('events')
    .select('host_id, start_time')
    .eq('id', eventId)
    .single();

  if (!event || event.host_id !== userId) {
    return { error: new Error('Not authorized to cancel this event') };
  }

  // Check 24 hour rule
  const startTime = new Date(event.start_time);
  const hoursUntilStart = (startTime.getTime() - Date.now()) / (1000 * 60 * 60);

  if (hoursUntilStart < 24) {
    return { error: new Error('Cannot cancel event less than 24 hours before start') };
  }

  const { error } = await supabase
    .from('events')
    .update({ status: 'cancelled' })
    .eq('id', eventId);

  if (error) {
    return { error: new Error(error.message) };
  }

  return { error: null };
};

// ============================================
// Join System
// ============================================

export const requestToJoin = async (
  eventId: string
): Promise<{ status: EventParticipant['status'] | null; error: Error | null }> => {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { status: null, error: new Error('Not authenticated') };
  }

  // Use database function to check if user can join
  const { data: canJoinResult, error: checkError } = await supabase.rpc('can_join_event', {
    p_user_id: userId,
    p_event_id: eventId,
  });

  if (checkError) {
    return { status: null, error: new Error(checkError.message) };
  }

  if (!canJoinResult?.can_join) {
    return { status: null, error: new Error(canJoinResult?.reason || 'Cannot join this event') };
  }

  // Create participation record
  const status = canJoinResult.auto_accept ? 'accepted' : 'pending';

  const { error: insertError } = await supabase
    .from('event_participants')
    .insert({
      event_id: eventId,
      user_id: userId,
      status,
    });

  if (insertError) {
    return { status: null, error: new Error(insertError.message) };
  }

  return { status, error: null };
};

export const respondToRequest = async (
  participantId: string,
  accept: boolean
): Promise<{ error: Error | null }> => {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { error: new Error('Not authenticated') };
  }

  // Get participant record and verify host
  const { data: participant } = await supabase
    .from('event_participants')
    .select(`
      event_id,
      event:events(host_id)
    `)
    .eq('id', participantId)
    .single();

  if (!participant || (participant.event as any)?.host_id !== userId) {
    return { error: new Error('Not authorized') };
  }

  const { error } = await supabase
    .from('event_participants')
    .update({
      status: accept ? 'accepted' : 'rejected',
      responded_at: new Date().toISOString(),
    })
    .eq('id', participantId);

  if (error) {
    return { error: new Error(error.message) };
  }

  return { error: null };
};

export const leaveEvent = async (
  eventId: string
): Promise<{ error: Error | null }> => {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { error: new Error('Not authenticated') };
  }

  // Get event details for leave deadline check
  const { data: event } = await supabase
    .from('events')
    .select('start_time, is_private')
    .eq('id', eventId)
    .single();

  if (!event) {
    return { error: new Error('Event not found') };
  }

  const startTime = new Date(event.start_time);
  const hoursUntilStart = (startTime.getTime() - Date.now()) / (1000 * 60 * 60);
  const deadline = event.is_private ? 24 : 1;

  if (hoursUntilStart < deadline) {
    return {
      error: new Error(
        `Cannot leave ${event.is_private ? 'private' : 'public'} event less than ${deadline} hour(s) before start`
      ),
    };
  }

  const { error } = await supabase
    .from('event_participants')
    .update({ status: 'left' })
    .eq('event_id', eventId)
    .eq('user_id', userId);

  if (error) {
    return { error: new Error(error.message) };
  }

  return { error: null };
};

export const kickParticipant = async (
  eventId: string,
  participantUserId: string
): Promise<{ error: Error | null }> => {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { error: new Error('Not authenticated') };
  }

  // Verify host
  const { data: event } = await supabase
    .from('events')
    .select('host_id')
    .eq('id', eventId)
    .single();

  if (!event || event.host_id !== userId) {
    return { error: new Error('Not authorized') };
  }

  const { error } = await supabase
    .from('event_participants')
    .update({ status: 'kicked' })
    .eq('event_id', eventId)
    .eq('user_id', participantUserId);

  if (error) {
    return { error: new Error(error.message) };
  }

  return { error: null };
};

// ============================================
// Participants
// ============================================

export const getEventParticipants = async (
  eventId: string
): Promise<{ participant: EventParticipant; profile: Profile }[]> => {
  const { data, error } = await supabase
    .from('event_participants')
    .select(`
      *,
      profile:profiles(*)
    `)
    .eq('event_id', eventId)
    .in('status', ['pending', 'accepted']);

  if (error) {
    console.error('Error fetching participants:', error);
    return [];
  }

  return data?.map((p: any) => ({
    participant: {
      id: p.id,
      event_id: p.event_id,
      user_id: p.user_id,
      status: p.status,
      requested_at: p.requested_at,
      responded_at: p.responded_at,
    },
    profile: p.profile,
  })) || [];
};

export const getPendingRequests = async (
  eventId: string
): Promise<{ participant: EventParticipant; profile: Profile }[]> => {
  const { data, error } = await supabase
    .from('event_participants')
    .select(`
      *,
      profile:profiles(*)
    `)
    .eq('event_id', eventId)
    .eq('status', 'pending');

  if (error) {
    console.error('Error fetching pending requests:', error);
    return [];
  }

  return data?.map((p: any) => ({
    participant: {
      id: p.id,
      event_id: p.event_id,
      user_id: p.user_id,
      status: p.status,
      requested_at: p.requested_at,
      responded_at: p.responded_at,
    },
    profile: p.profile,
  })) || [];
};
