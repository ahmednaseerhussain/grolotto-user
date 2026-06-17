-- Group tickets from the same player checkout so vendors see one combined play.
ALTER TABLE lottery_tickets
ADD COLUMN IF NOT EXISTS bet_group_id UUID;

UPDATE lottery_tickets
SET bet_group_id = id
WHERE bet_group_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_lottery_tickets_bet_group
ON lottery_tickets(bet_group_id);
