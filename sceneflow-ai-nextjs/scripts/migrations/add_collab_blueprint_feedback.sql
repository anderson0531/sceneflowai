-- Blueprint collaboration structured feedback
CREATE TABLE IF NOT EXISTS collab_blueprint_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES collab_sessions(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES collab_participants(id) ON DELETE SET NULL,
  reviewer_name VARCHAR(120) NOT NULL,
  reviewer_email VARCHAR(255),
  overall_score INTEGER,
  preferred BOOLEAN,
  sections JSONB,
  freeform_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_collab_bp_feedback_session ON collab_blueprint_feedback(session_id);
CREATE INDEX IF NOT EXISTS idx_collab_bp_feedback_created ON collab_blueprint_feedback(created_at);

-- Optional: composite index for DM chat threads
CREATE INDEX IF NOT EXISTS idx_collab_chat_session_channel_scope
  ON collab_chat_messages(session_id, channel, scope_id);
