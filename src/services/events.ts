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
import { getBlockedUserIds } from './users';

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
  const userId = await getCurrentUserId();
  const now = new Date().toISOString();

  // Get blocked user IDs (mutual blocks)
  let blockedIds: string[] = [];
  if (userId) {
    try {
      blockedIds = await getBlockedUserIds(userId);
    } catch (err) {
      console.error('Error fetching blocked users:', err);
    }
  }

  // Get event IDs where user is a participant (host or accepted participant)
  let userParticipatingEventIds: string[] = [];
  if (userId) {
    const { data: hostedEvents } = await supabase
      .from('events')
      .select('id')
      .eq('host_id', userId)
      .eq('status', 'active');

    const { data: participantEvents } = await supabase
      .from('event_participants')
      .select('event_id')
      .eq('user_id', userId)
      .eq('status', 'accepted');

    userParticipatingEventIds = [
      ...(hostedEvents?.map((e: any) => e.id) || []),
      ...(participantEvents?.map((p: any) => p.event_id) || []),
    ];
  }

  const { data, error } = await (supabase.rpc as any)('get_nearby_events', {
    user_lat: latitude,
    user_lng: longitude,
    radius_km: radiusKm,
  });

  if (error) {
    console.error('Error fetching nearby events:', error);
    return [];
  }

  // Fetch host and category details for each event
  const eventIds = (data as Event[])?.map((e) => e.id) || [];
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

  if (!eventsWithDetails) return [];

  // Filter events:
  // 1. Show future events (not started) for everyone
  // 2. Show ongoing/past events only for participants with time limits:
  //    - With end_time: visible until 24h after end_time
  //    - Without end_time: visible for 3 days after start_time
  const filteredByTime = eventsWithDetails.filter((event: any) => {
    const startTime = new Date(event.start_time);
    const endTime = event.end_time ? new Date(event.end_time) : null;
    const nowDate = new Date(now);

    // Event hasn't started yet - show to everyone
    if (startTime > nowDate) {
      return true;
    }

    // Event has started - only show to participants
    const isParticipant = userParticipatingEventIds.includes(event.id);
    if (!isParticipant) {
      return false;
    }

    // User is a participant - check visibility window
    if (endTime) {
      // With end_time: visible until 24h after end
      const visibilityEnd = new Date(endTime.getTime() + 24 * 60 * 60 * 1000);
      return nowDate < visibilityEnd;
    } else {
      // Without end_time: visible for 3 days after start
      const visibilityEnd = new Date(startTime.getTime() + 3 * 24 * 60 * 60 * 1000);
      return nowDate < visibilityEnd;
    }
  });

  // Filter out events from blocked users
  const filteredEvents = blockedIds.length > 0
    ? filteredByTime.filter((e: any) => !blockedIds.includes(e.host_id))
    : filteredByTime;

  return (filteredEvents as EventWithHost[]) || [];
};

export const getAllEvents = async (): Promise<(EventWithHost & { participants_count: number; is_user_participant?: boolean })[]> => {
  const userId = await getCurrentUserId();
  const now = new Date().toISOString();

  // Get blocked user IDs (mutual blocks)
  let blockedIds: string[] = [];
  if (userId) {
    try {
      blockedIds = await getBlockedUserIds(userId);
    } catch (err) {
      console.error('Error fetching blocked users:', err);
    }
  }

  // Get event IDs where user is a participant (host or accepted participant)
  let userParticipatingEventIds: string[] = [];
  if (userId) {
    // Events where user is host
    const { data: hostedEvents } = await supabase
      .from('events')
      .select('id')
      .eq('host_id', userId)
      .eq('status', 'active');

    // Events where user is accepted participant
    const { data: participantEvents } = await supabase
      .from('event_participants')
      .select('event_id')
      .eq('user_id', userId)
      .eq('status', 'accepted');

    userParticipatingEventIds = [
      ...(hostedEvents?.map((e: any) => e.id) || []),
      ...(participantEvents?.map((p: any) => p.event_id) || []),
    ];
  }

  // Fetch all active events (both future and ongoing)
  const { data: eventsData, error } = await supabase
    .from('events')
    .select(`
      *,
      host:profiles(*),
      category:categories(*)
    `)
    .eq('status', 'active')
    .order('start_time', { ascending: true });

  if (error || !eventsData) {
    console.error('Error fetching all events:', error);
    return [];
  }

  // Filter events:
  // 1. Show future events (not started) for everyone
  // 2. Show ongoing/past events only for participants with time limits:
  //    - With end_time: visible until 24h after end_time
  //    - Without end_time: visible for 3 days after start_time
  const filteredByTime = eventsData.filter((event: any) => {
    const startTime = new Date(event.start_time);
    const endTime = event.end_time ? new Date(event.end_time) : null;
    const nowDate = new Date(now);

    // Event hasn't started yet - show to everyone
    if (startTime > nowDate) {
      return true;
    }

    // Event has started - only show to participants
    const isParticipant = userParticipatingEventIds.includes(event.id);
    if (!isParticipant) {
      return false;
    }

    // User is a participant - check visibility window
    if (endTime) {
      // With end_time: visible until 24h after end
      const visibilityEnd = new Date(endTime.getTime() + 24 * 60 * 60 * 1000);
      return nowDate < visibilityEnd;
    } else {
      // Without end_time: visible for 3 days after start
      const visibilityEnd = new Date(startTime.getTime() + 3 * 24 * 60 * 60 * 1000);
      return nowDate < visibilityEnd;
    }
  });

  // Filter out events from blocked users
  const filteredEvents = blockedIds.length > 0
    ? filteredByTime.filter((e: any) => !blockedIds.includes(e.host_id))
    : filteredByTime;

  // Fetch participant counts for all events
  const eventIds = filteredEvents.map((e: any) => e.id);
  if (eventIds.length === 0) return [];

  const { data: participantCounts } = await supabase
    .from('event_participants')
    .select('event_id')
    .in('event_id', eventIds)
    .eq('status', 'accepted');

  // Count participants per event
  const countMap: Record<string, number> = {};
  (participantCounts || []).forEach((p: any) => {
    countMap[p.event_id] = (countMap[p.event_id] || 0) + 1;
  });

  // Merge counts with events and mark user participation
  const eventsWithCounts = filteredEvents.map((event: any) => ({
    ...event,
    participants_count: (countMap[event.id] || 0) + 1, // +1 for host
    is_user_participant: userParticipatingEventIds.includes(event.id),
  }));

  return eventsWithCounts as (EventWithHost & { participants_count: number; is_user_participant?: boolean })[];
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
  let participantStatus: EventParticipant['status'] | null = null;
  if (userId) {
    const { data: participant } = await supabase
      .from('event_participants')
      .select('status')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .single() as { data: { status: EventParticipant['status'] } | null };

    participantStatus = participant?.status || null;
  }

  const eventData = event as EventWithHost;
  return {
    ...eventData,
    participants_count: (participantsCount || 0) + 1, // +1 for host
    is_participant: participantStatus === 'accepted' || eventData.host_id === userId,
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
// Event Image Upload
// ============================================

export const uploadEventImage = async (
  imageUri: string
): Promise<{ url: string | null; error: Error | null }> => {
  const userId = await getCurrentUserId();
  console.log('uploadEventImage - userId:', userId);

  if (!userId) {
    return { url: null, error: new Error('Not authenticated') };
  }

  try {
    // Generate unique filename
    const timestamp = Date.now();
    const fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${userId}/${timestamp}.${fileExt}`;
    console.log('uploadEventImage - fileName:', fileName);

    // Fetch the image and convert to ArrayBuffer (React Native compatible)
    const response = await fetch(imageUri);
    console.log('uploadEventImage - fetch response ok:', response.ok);

    const arrayBuffer = await response.arrayBuffer();
    console.log('uploadEventImage - arrayBuffer size:', arrayBuffer.byteLength);

    // Determine content type
    const contentType = `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`;

    // Upload to Supabase Storage using ArrayBuffer
    const { error: uploadError } = await supabase.storage
      .from('event-images')
      .upload(fileName, arrayBuffer, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      console.log('uploadEventImage - uploadError:', uploadError);
      return { url: null, error: new Error(uploadError.message) };
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('event-images')
      .getPublicUrl(fileName);

    console.log('uploadEventImage - success, publicUrl:', publicUrl);
    return { url: publicUrl, error: null };
  } catch (error: any) {
    console.log('uploadEventImage - catch error:', error);
    return { url: null, error: new Error(error?.message || 'Failed to upload image') };
  }
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
    .limit(1) as { data: Array<{ event_id: string }> | null };

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
    .single() as { data: { host_id: string } | null };

  if (!existing || existing.host_id !== userId) {
    return { event: null, error: new Error('Not authorized to update this event') };
  }

  const { data, error } = await (supabase
    .from('events') as any)
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
    .single() as { data: { host_id: string; start_time: string } | null };

  if (!event || event.host_id !== userId) {
    return { error: new Error('Not authorized to cancel this event') };
  }

  // Check 24 hour rule
  const startTime = new Date(event.start_time);
  const hoursUntilStart = (startTime.getTime() - Date.now()) / (1000 * 60 * 60);

  if (hoursUntilStart < 24) {
    return { error: new Error('Cannot cancel event less than 24 hours before start') };
  }

  const { error } = await (supabase
    .from('events') as any)
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

  // First check if event exists and hasn't ended
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('status, end_time')
    .eq('id', eventId)
    .single() as { data: { status: string; end_time: string | null } | null; error: any };

  if (eventError || !event) {
    return { status: null, error: new Error('Event not found') };
  }

  if (event.status === 'cancelled') {
    return { status: null, error: new Error('This event has been cancelled') };
  }

  // Check if event has ended
  if (event.end_time) {
    const endTime = new Date(event.end_time);
    if (endTime < new Date()) {
      return { status: null, error: new Error('This event has already ended') };
    }
  }

  // Use database function to check if user can join
  const { data: canJoinResult, error: checkError } = await (supabase.rpc as any)('can_join_event', {
    p_user_id: userId,
    p_event_id: eventId,
  }) as { data: { can_join: boolean; reason?: string; auto_accept?: boolean } | null; error: any };

  if (checkError) {
    return { status: null, error: new Error(checkError.message) };
  }

  if (!canJoinResult?.can_join) {
    return { status: null, error: new Error(canJoinResult?.reason || 'Cannot join this event') };
  }

  // Create participation record
  const status: EventParticipant['status'] = canJoinResult.auto_accept ? 'accepted' : 'pending';

  const { error: insertError } = await (supabase
    .from('event_participants') as any)
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

  // Get participant record and verify host, also get event timing
  const { data: participant } = await supabase
    .from('event_participants')
    .select(`
      event_id,
      status,
      event:events(host_id, start_time, end_time, status)
    `)
    .eq('id', participantId)
    .single() as { data: { event_id: string; status: string; event: { host_id: string; start_time: string; end_time: string | null; status: string } | null } | null };

  if (!participant || participant.event?.host_id !== userId) {
    return { error: new Error('Not authorized') };
  }

  // Check if request is still pending
  if (participant.status !== 'pending') {
    return { error: new Error('This request has already been responded to') };
  }

  // Check if event is cancelled
  if (participant.event?.status === 'cancelled') {
    return { error: new Error('Cannot respond to requests for cancelled events') };
  }

  // Check if event has ended
  const now = new Date();
  const endTime = participant.event?.end_time ? new Date(participant.event.end_time) : null;

  if (endTime && endTime < now) {
    return { error: new Error('Cannot respond to requests after event has ended') };
  }

  const { error } = await (supabase
    .from('event_participants') as any)
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
    .single() as { data: { start_time: string; is_private: boolean } | null };

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

  const { error } = await (supabase
    .from('event_participants') as any)
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
    .single() as { data: { host_id: string } | null };

  if (!event || event.host_id !== userId) {
    return { error: new Error('Not authorized') };
  }

  const { error } = await (supabase
    .from('event_participants') as any)
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
