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
	and a.status = 'applied'
