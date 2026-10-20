-- Interactive activities (grounding, tense & release, worry clouds, gratitude jar, stretch, bubbles)
-- become a first-class content kind.

alter table public.content_items drop constraint if exists content_items_kind_check;
alter table public.content_items
  add constraint content_items_kind_check check (kind in ('story', 'meditation', 'breathing', 'soundscape', 'focus', 'activity'));

alter table public.content_items add column if not exists activity_id text;

alter table public.content_categories drop constraint if exists content_categories_kind_check;
alter table public.content_categories
  add constraint content_categories_kind_check check (kind in ('story', 'meditation', 'breathing', 'soundscape', 'focus', 'activity', 'any'));
