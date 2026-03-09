-- Prevent overbooking events at the database level.
-- max_participants includes host, while event_participants contains only guests.
-- Therefore guest capacity is (max_participants - 1).

CREATE OR REPLACE FUNCTION public.enforce_event_capacity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_max_participants INTEGER;
  v_participant_slots INTEGER;
  v_accepted_count INTEGER;
BEGIN
  -- Only enforce when a row is becoming accepted.
  IF NEW.status <> 'accepted' THEN
    RETURN NEW;
  END IF;

  -- No-op updates where status stays accepted should not be revalidated.
  IF TG_OP = 'UPDATE' AND OLD.status = 'accepted' THEN
    RETURN NEW;
  END IF;

  -- Lock event row to serialize concurrent accept/auto-accept flows for one event.
  SELECT max_participants
  INTO v_max_participants
  FROM events
  WHERE id = NEW.event_id
  FOR UPDATE;

  IF v_max_participants IS NULL THEN
    RETURN NEW;
  END IF;

  v_participant_slots := GREATEST(v_max_participants - 1, 0);

  SELECT COUNT(*)
  INTO v_accepted_count
  FROM event_participants
  WHERE event_id = NEW.event_id
    AND status = 'accepted';

  IF v_accepted_count >= v_participant_slots THEN
    RAISE EXCEPTION 'Event is full';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_event_capacity ON public.event_participants;

CREATE TRIGGER trg_enforce_event_capacity
BEFORE INSERT OR UPDATE OF status
ON public.event_participants
FOR EACH ROW
EXECUTE FUNCTION public.enforce_event_capacity();

COMMENT ON FUNCTION public.enforce_event_capacity IS
'Prevents accepted participants from exceeding event max_participants (host included).';

CREATE OR REPLACE FUNCTION public.enforce_event_max_participants_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_accepted_count INTEGER;
  v_current_total INTEGER;
BEGIN
  -- Only validate if value actually changes.
  IF NEW.max_participants = OLD.max_participants THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*)
  INTO v_accepted_count
  FROM event_participants
  WHERE event_id = NEW.id
    AND status = 'accepted';

  v_current_total := v_accepted_count + 1; -- +1 host

  IF NEW.max_participants < v_current_total THEN
    RAISE EXCEPTION 'max_participants cannot be lower than current participants (%).', v_current_total;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_event_max_participants_update ON public.events;

CREATE TRIGGER trg_enforce_event_max_participants_update
BEFORE UPDATE OF max_participants
ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.enforce_event_max_participants_update();

COMMENT ON FUNCTION public.enforce_event_max_participants_update IS
'Prevents lowering event max_participants below currently occupied participant count.';
