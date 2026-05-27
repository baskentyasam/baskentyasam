-- roles tablosu ve users.role_id FK kontrolü (PostgreSQL)
SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'roles'
) AS roles_table_exists;

SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'users'::regclass AND contype = 'f';

SELECT * FROM roles ORDER BY id;
