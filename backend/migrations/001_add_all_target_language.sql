INSERT INTO languages (code, name)
VALUES ('all', 'Tất cả')
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name;
