-- Linkble Supabase Functions
-- Run this in your Supabase SQL Editor

-- ============================================
-- can_join_event function
-- Checks if a user can join an event
-- ============================================

CREATE OR REPLACE FUNCTION can_join_event(
  p_user_id UUID,
  p_event_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event RECORD;
  v_existing_participation RECORD;
  v_participants_count INT;
  v_is_blocked BOOLEAN;
BEGIN
  -- Get event details
  SELECT * INTO v_event
  FROM events
  WHERE id = p_event_id;

  -- Check if event exists
  IF v_event IS NULL THEN
    RETURN json_build_object('can_join', false, 'reason', 'Event not found');
  END IF;

  -- Check if event is active
  IF v_event.status != 'active' THEN
    RETURN json_build_object('can_join', false, 'reason', 'Event is not active');
  END IF;

  -- Check if event has started
  IF v_event.start_time <= NOW() THEN
    RETURN json_build_object('can_join', false, 'reason', 'Event has already started');
  END IF;

  -- Check if user is the host
  IF v_event.host_id = p_user_id THEN
    RETURN json_build_object('can_join', false, 'reason', 'You are the host of this event');
  END IF;

  -- Check if user is blocked by host or blocked host
  SELECT EXISTS (
    SELECT 1 FROM blocked_users
    WHERE (blocker_id = v_event.host_id AND blocked_id = p_user_id)
       OR (blocker_id = p_user_id AND blocked_id = v_event.host_id)
  ) INTO v_is_blocked;

  IF v_is_blocked THEN
    RETURN json_build_object('can_join', false, 'reason', 'Cannot join this event');
  END IF;

  -- Check if user already has a participation record for this event
  SELECT * INTO v_existing_participation
  FROM event_participants
  WHERE event_id = p_event_id AND user_id = p_user_id;

  IF v_existing_participation IS NOT NULL THEN
    IF v_existing_participation.status = 'pending' THEN
      RETURN json_build_object('can_join', false, 'reason', 'You already have a pending request');
    ELSIF v_existing_participation.status = 'accepted' THEN
      RETURN json_build_object('can_join', false, 'reason', 'You are already in this event');
    ELSIF v_existing_participation.status = 'rejected' THEN
      RETURN json_build_object('can_join', false, 'reason', 'Your request was declined');
    ELSIF v_existing_participation.status = 'kicked' THEN
      RETURN json_build_object('can_join', false, 'reason', 'You were removed from this event');
    END IF;
  END IF;

  -- Check if user is already participating in another active event (ONE EVENT AT A TIME rule)
  SELECT ep.* INTO v_existing_participation
  FROM event_participants ep
  JOIN events e ON e.id = ep.event_id
  WHERE ep.user_id = p_user_id
    AND ep.status = 'accepted'
    AND e.status = 'active'
    AND e.start_time > NOW()
    AND ep.event_id != p_event_id
  LIMIT 1;

  IF v_existing_participation IS NOT NULL THEN
    RETURN json_build_object('can_join', false, 'reason', 'You are already participating in another event');
  END IF;

  -- Also check if user is hosting another active event
  IF EXISTS (
    SELECT 1 FROM events
    WHERE host_id = p_user_id
      AND status = 'active'
      AND start_time > NOW()
      AND id != p_event_id
  ) THEN
    RETURN json_build_object('can_join', false, 'reason', 'You are already hosting another event');
  END IF;

  -- Check if event is full (count accepted participants + 1 for host)
  SELECT COUNT(*) INTO v_participants_count
  FROM event_participants
  WHERE event_id = p_event_id AND status = 'accepted';

  -- +1 for the host
  IF (v_participants_count + 1) >= v_event.max_participants THEN
    RETURN json_build_object('can_join', false, 'reason', 'Event is full');
  END IF;

  -- User can join
  RETURN json_build_object(
    'can_join', true,
    'auto_accept', v_event.auto_accept
  );
END;
$$;

-- ============================================
-- get_nearby_events function
-- Returns events within a radius
-- ============================================

CREATE OR REPLACE FUNCTION get_nearby_events(
  user_lat FLOAT,
  user_lng FLOAT,
  radius_km FLOAT DEFAULT 10
)
RETURNS SETOF events
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT e.*
  FROM events e
  WHERE e.status = 'active'
    AND e.start_time > NOW()
    -- Haversine formula for distance calculation
    AND (
      6371 * acos(
        cos(radians(user_lat)) * cos(radians(e.location_lat)) *
        cos(radians(e.location_lng) - radians(user_lng)) +
        sin(radians(user_lat)) * sin(radians(e.location_lat))
      )
    ) <= radius_km
    -- Exclude events from blocked users
    AND NOT EXISTS (
      SELECT 1 FROM blocked_users bu
      WHERE (bu.blocker_id = auth.uid() AND bu.blocked_id = e.host_id)
         OR (bu.blocker_id = e.host_id AND bu.blocked_id = auth.uid())
    )
  ORDER BY e.start_time ASC;
END;
$$;

-- ============================================
-- get_or_create_conversation function
-- Returns conversation ID between two users
-- ============================================

CREATE OR REPLACE FUNCTION get_or_create_conversation(
  p_user1_id UUID,
  p_user2_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_conversation_id UUID;
  v_ordered_user1 UUID;
  v_ordered_user2 UUID;
BEGIN
  -- Order user IDs consistently
  IF p_user1_id < p_user2_id THEN
    v_ordered_user1 := p_user1_id;
    v_ordered_user2 := p_user2_id;
  ELSE
    v_ordered_user1 := p_user2_id;
    v_ordered_user2 := p_user1_id;
  END IF;

  -- Try to find existing conversation
  SELECT id INTO v_conversation_id
  FROM conversations
  WHERE (user1_id = v_ordered_user1 AND user2_id = v_ordered_user2)
     OR (user1_id = v_ordered_user2 AND user2_id = v_ordered_user1);

  -- Create if not exists
  IF v_conversation_id IS NULL THEN
    INSERT INTO conversations (user1_id, user2_id)
    VALUES (v_ordered_user1, v_ordered_user2)
    RETURNING id INTO v_conversation_id;
  END IF;

  RETURN v_conversation_id;
END;
$$;
