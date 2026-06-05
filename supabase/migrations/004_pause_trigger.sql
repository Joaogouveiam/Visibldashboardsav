-- Trigger : gèle automatiquement la conversation quand une escalade est créée
-- Fiable côté DB, sans dépendance au client Realtime

CREATE OR REPLACE FUNCTION pause_conversation_on_escalation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.contact_id IS NOT NULL THEN
    UPDATE conversations
    SET paused = TRUE
    WHERE contact_id = NEW.contact_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_pause_conversation_on_escalation ON human_escalations;

CREATE TRIGGER trg_pause_conversation_on_escalation
  AFTER INSERT ON human_escalations
  FOR EACH ROW
  EXECUTE FUNCTION pause_conversation_on_escalation();
