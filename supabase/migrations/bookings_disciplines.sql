-- Adds the optional "disciplines" field to the booking (submissions) form.
alter table bookings
  add column if not exists disciplines text;