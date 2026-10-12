alter table appearances
	add constraint appearances_status_check
	check (status in ('applied', 'considering', 'booked', 'not_considering'))
