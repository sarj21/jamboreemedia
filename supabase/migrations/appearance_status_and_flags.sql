-- Scheduling flags, and a "not considering" state.
--
-- status becomes a four-step funnel:
--   applied -> considering -> booked
--   not_considering  a decided no, distinct from "we haven't looked yet"
--
-- On top of that, three orthogonal flags, all defaulting to false so existing
-- rows need no change:
--   busy          not free on this date
--   dropped       was booked, then could not do it
--   should_rebook post-show: we want them back
--
-- `would_return` is renamed to `should_rebook` rather than duplicated: the two
-- said the same thing from opposite sides, and keeping both let a row claim
-- they would return while also saying we did not want them back.

-- ---------------------------------------------------------------------------
-- 1. status check constraint
-- ---------------------------------------------------------------------------
--
-- The constraint is dropped by the name it is given here rather than looked up,
-- so this is safe whether or not that name was ever in use.
alter table appearances drop constraint if exists appearances_status_check;

alter table appearances
	add constraint appearances_status_check
	check (status in ('applied', 'considering', 'booked', 'not_considering'));

-- ---------------------------------------------------------------------------
-- 2. Flags
-- ---------------------------------------------------------------------------

alter table appearances
	add column if not exists busy boolean not null default false;

-- Rename rather than add, so anything already recorded survives.
alter table appearances rename column would_return to should_rebook;

comment on column appearances.status is 'applied | considering | booked | not_considering. The funnel, one value.';
comment on column appearances.busy is 'Not free on this date. Transient: clear it when the show is over.';
comment on column appearances.dropped is 'Booked, then had to drop. Independent of status.';
comment on column appearances.should_rebook is 'Post-show: we want to book them again.';

create index if not exists appearances_show_flags_idx on appearances (show_date, dropped, should_rebook);

-- ---------------------------------------------------------------------------
-- 3. Backfill: people previously marked "no" become not_considering
-- ---------------------------------------------------------------------------
--
-- The first migration folded status='no' into 'applied', losing the fact that
-- they had been considered and passed. This restores it, picking the same row
-- per person that migration did: the one with the most triage, then the
-- longest notes, then the earliest submission.
--
-- Only rows still at 'applied' are touched, so anything since promoted to
-- considering or booked is left alone.

with legacy_keyed as (
	-- Same handle resolution the first migration used: strip the @, lowercase,
	-- and fold known renames together.
	select
		legacy.*,
		coalesce(
			case lower(regexp_replace(btrim(legacy.instagram), '^@', '', 'g'))
				when 'dilan_comedu' then 'dilan_comedy'
				else lower(regexp_replace(btrim(legacy.instagram), '^@', '', 'g'))
			end,
			'id:' || legacy.id::text
		) as person_key
	from applications legacy
),
ranked as (
	select
		k.*,
		row_number() over (
			partition by k.show_date, k.person_key
			order by
				(k.status is not null)::int + (k.tier is not null)::int + k.keep::int desc,
				length(coalesce(k.notes, '')) desc,
				length(coalesce(k.disciplines, '')) desc,
				k.created_at asc
		) as rn
	from legacy_keyed k
),
passed as (
	select distinct p.id as person_id, r.show_date
	from ranked r
	join people p on p.instagram is not null and lower(p.instagram) = r.person_key
	where r.rn = 1
		and r.status = 'no'
)
update appearances a
set status = 'not_considering'
from passed
where a.person_id = passed.person_id
	and a.show_date = passed.show_date
	and a.status = 'applied';