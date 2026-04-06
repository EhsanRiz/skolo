-- ============================================================
-- SKOLO — Migration 019
-- Parent Authentication + Internal Messaging System
-- ============================================================

-- 1. Extend users table for parent role + guardian link
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS guardian_id UUID REFERENCES guardians(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_guardian ON public.users(guardian_id)
  WHERE guardian_id IS NOT NULL;

-- 2. Extend guardians table for user account link + invite tracking
ALTER TABLE public.guardians
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invite_token TEXT,
  ADD COLUMN IF NOT EXISTS invite_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS whatsapp_opted_in BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_guardians_user ON public.guardians(user_id)
  WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_guardians_invite_token ON public.guardians(invite_token)
  WHERE invite_token IS NOT NULL;

-- 3. Conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id     UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  type          VARCHAR(20) NOT NULL DEFAULT 'direct',  -- direct | class | grade | school
  target_id     UUID,                                    -- class_id, grade_id, or NULL
  title         VARCHAR(200),
  created_by    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conversations_school ON conversations(school_id);
CREATE INDEX idx_conversations_updated ON conversations(school_id, updated_at DESC);

-- 4. Conversation participants
CREATE TABLE IF NOT EXISTS conversation_participants (
  conversation_id  UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role             VARCHAR(20) NOT NULL DEFAULT 'member',  -- admin | member
  last_read_at     TIMESTAMPTZ DEFAULT NOW(),
  is_muted         BOOLEAN NOT NULL DEFAULT FALSE,
  joined_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX idx_conv_participants_user ON conversation_participants(user_id);

-- 5. Messages table
CREATE TABLE IF NOT EXISTS messages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body             TEXT NOT NULL,
  media_url        TEXT,
  media_type       VARCHAR(20),
  is_system        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_id);

-- 6. Push subscription storage (Web Push API)
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_id     UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  endpoint      TEXT NOT NULL,
  p256dh        TEXT NOT NULL,
  auth          TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

CREATE INDEX idx_push_subs_user ON push_subscriptions(user_id);

-- 7. Trigger to update conversations.updated_at on new message
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations SET updated_at = NOW() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_message_update_conversation
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_timestamp();

-- 8. Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Service role bypass policies
CREATE POLICY service_role_all ON conversations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY service_role_all ON conversation_participants FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY service_role_all ON messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY service_role_all ON push_subscriptions FOR ALL USING (true) WITH CHECK (true);
