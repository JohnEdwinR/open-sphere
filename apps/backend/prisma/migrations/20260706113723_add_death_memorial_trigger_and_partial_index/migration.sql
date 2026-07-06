-- Database Design §3.2:
-- 1. Partial index for the hot "living creatures" query path — Prisma's
--    schema DSL has no partial-index syntax, so this is hand-written.
CREATE INDEX "idx_creatures_alive" ON "creatures" ("lifecycle_state")
WHERE "lifecycle_state" != 'dead';

-- 2. Death-memorial trigger: enforced in the database (not just application
-- code) so a direct/bulk UPDATE that flips lifecycle_state to 'dead' cannot
-- silently skip creating a memorial event_log row. This is a defense-in-depth
-- backstop for the *normal* path, where the simulation's own Postgres-backed
-- EventLogPort adapter inserts a CreatureDied event with the real tick
-- number — the trigger only fires as a fallback and cannot know the
-- simulation's current tick, so it records tick 0 and flags the row's
-- payload with "source": "db_trigger" so consumers can tell the two apart.
CREATE OR REPLACE FUNCTION fn_creature_death_memorial()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."lifecycle_state" = 'dead' AND OLD."lifecycle_state" IS DISTINCT FROM 'dead' THEN
    IF NEW."died_at" IS NULL THEN
      NEW."died_at" := now();
    END IF;

    INSERT INTO "event_log" ("creature_id", "event_type", "payload", "tick", "occurred_at")
    VALUES (
      NEW."id",
      'CreatureDied',
      jsonb_build_object('source', 'db_trigger'),
      0,
      now()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_creature_death_memorial
BEFORE UPDATE ON "creatures"
FOR EACH ROW
EXECUTE FUNCTION fn_creature_death_memorial();
