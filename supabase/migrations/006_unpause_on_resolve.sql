-- Trigger : reprend la conversation (paused = false) quand l'escalade est clôturée
-- Se déclenche uniquement quand le status change vers resolved ou closed

CREATE OR REPLACE FUNCTION unpause_conversation_on_resolve()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('resolved', 'closed')
    AND OLD.status NOT IN ('resolved', 'closed')
    AND NEW.contact_id IS NOT NULL
  THEN
    UPDATE conversations
    SET paused = FALSE
    WHERE contact_id = NEW.contact_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_unpause_conversation_on_resolve ON human_escalations;

CREATE TRIGGER trg_unpause_conversation_on_resolve
  AFTER UPDATE ON human_escalations
  FOR EACH ROW
  EXECUTE FUNCTION unpause_conversation_on_resolve();
