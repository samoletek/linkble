-- Add is_pinned column to direct_messages table
ALTER TABLE direct_messages
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE NOT NULL;

-- Create index for better query performance when filtering pinned messages
CREATE INDEX IF NOT EXISTS idx_direct_messages_pinned 
ON direct_messages(conversation_id) 
WHERE is_pinned = TRUE;

-- Add comment for documentation
COMMENT ON COLUMN direct_messages.is_pinned IS 'Whether this message is pinned in the conversation. Only one message can be pinned per conversation.';
