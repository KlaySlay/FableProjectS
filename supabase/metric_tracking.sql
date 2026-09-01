-- Metric tracking (distance/duration) on categories + photos — run after schema.sql

alter table public.categories
  add column metric_type text not null default 'none',
  add column metric_required boolean not null default false;

alter table public.categories
  add constraint categories_metric_type_check
  check (metric_type in ('none', 'distance_km', 'duration_min'));

alter table public.photos
  add column metric_value numeric;
