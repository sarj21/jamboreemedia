-- ---------------------------------------------------------------------------
-- 2. Flags
-- ---------------------------------------------------------------------------

alter table appearances
	add column if not exists busy boolean not null default false
