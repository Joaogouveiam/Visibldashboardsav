-- Remplace l'approche précédente (trigger AFTER INSERT sur human_escalations)
-- qui ne fonctionnait pas quand conversations est créée APRÈS l'escalade.

-- Supprime l'ancien trigger (migration 004)
DROP TRIGGER IF EXISTS trg_pause_conversation_on_escalation ON human_escalations;
DROP FUNCTION IF EXISTS pause_conversation_on_escalation();

-- Nouveau trigger BEFORE INSERT sur conversations :
-- si une escalade active existe déjà pour ce contact_id, on insère directement paused = true
CREATE OR REPLACE FUNCTION set_paused_from_escalation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.contact_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM human_escalations
      WHERE contact_id = NEW.contact_id
        AND status NOT IN ('resolved', 'closed')
      LIMIT 1
    ) THEN
      NEW.paused := TRUE;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_set_paused_from_escalation ON conversations;

CREATE TRIGGER trg_set_paused_from_escalation
  BEFORE INSERT ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION set_paused_from_escalation();
