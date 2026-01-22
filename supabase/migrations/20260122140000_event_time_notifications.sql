-- Table to track which users received which time-based notifications
-- Prevents duplicate notifications for the same event/user/time combination
CREATE TABLE IF NOT EXISTS event_time_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('event_starting_1h', 'event_starting_30m', 'event_started')),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id, notification_type)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_event_time_notifications_event ON event_time_notifications(event_id);
CREATE INDEX IF NOT EXISTS idx_event_time_notifications_user ON event_time_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_event_time_notifications_type ON event_time_notifications(notification_type);

-- Comment for documentation
COMMENT ON TABLE event_time_notifications IS 'Tracks which time-based event notifications have been sent to prevent duplicates';
COMMENT ON COLUMN event_time_notifications.notification_type IS 'Type: event_starting_1h, event_starting_30m, or event_started';
