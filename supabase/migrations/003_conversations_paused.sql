-- Add paused column to conversations
-- paused = true  → conversation gelée en attente d'un agent humain
-- paused = false → reprise normale du chatbot

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS paused BOOLEAN NOT NULL DEFAULT FALSE;

-- Index pour les requêtes filtrées sur paused
CREATE INDEX IF NOT EXISTS idx_conversations_paused ON conversations (paused);
