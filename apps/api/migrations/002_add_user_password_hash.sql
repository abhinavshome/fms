-- up
ALTER TABLE users ADD COLUMN password_hash text;

-- down
ALTER TABLE users DROP COLUMN password_hash;
