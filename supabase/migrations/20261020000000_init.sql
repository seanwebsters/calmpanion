-- Calm Companion: initial schema
-- Every user-owned table has row-level security restricting access to auth.uid().
-- Catalogue tables (content_*, audio_assets) are world-readable and only writable by the service role.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- helpers
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------- profiles
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 60),
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.companion_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  companion_name text not null default 'Nimbus' check (char_length(companion_name) between 1 and 30),
  goals text[] not null default '{}',
  voice text not null default 'warm' check (voice in ('warm', 'bright', 'deep')),
  tone text not null default 'gentle' check (tone in ('gentle', 'playful', 'minimal')),
  bedtime text check (bedtime ~ '^[0-2][0-9]:[0-5][0-9]$'),
  content_length text not null default 'medium' check (content_length in ('short', 'medium', 'long')),
  notifications_wanted boolean not null default false,
  memory_enabled boolean not null default false,
  save_conversations boolean not null default true,
  journal_ai_consent boolean not null default false,
  store_check_ins boolean not null default true,
  voice_replies boolean not null default true,
  haptics_enabled boolean not null default true,
  breathing_sound_cues boolean not null default true,
  updated_at timestamptz not null default now()
);

-- Long-term memory is opt-in and holds short, non-sensitive preferences only.
create table public.companion_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category text not null check (category in ('favourite_genre', 'session_length', 'bedtime', 'sound', 'routine', 'other')),
  text text not null check (char_length(text) between 2 and 200),
  source text not null default 'companion' check (source in ('user', 'companion')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index companion_memories_user_idx on public.companion_memories (user_id, created_at desc);

-- Conversation history is separate from memory and only stored when the user keeps it.
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index conversations_user_idx on public.conversations (user_id, updated_at desc);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) <= 8000),
  tool_events jsonb,
  content_ids text[],
  created_at timestamptz not null default now()
);
create index messages_conversation_idx on public.messages (conversation_id, created_at);
create index messages_user_idx on public.messages (user_id);

-- ---------------------------------------------------------------- catalogue
create table public.audio_assets (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('narration', 'ambience', 'music')),
  storage_path text not null, -- path in the 'audio' storage bucket
  licence text not null,       -- e.g. 'original', 'CC0', 'licensed:<agreement ref>'
  attribution text,
  duration_sec integer,
  created_at timestamptz not null default now()
);

create table public.content_categories (
  id text primary key,
  name text not null,
  kind text not null check (kind in ('story', 'meditation', 'breathing', 'soundscape', 'focus', 'any')),
  description text,
  artwork jsonb not null,
  sort_order integer not null default 0
);

create table public.content_items (
  id text primary key,
  kind text not null check (kind in ('story', 'meditation', 'breathing', 'soundscape', 'focus')),
  title text not null,
  subtitle text,
  description text,
  narrator text,
  category_ids text[] not null default '{}',
  tags text[] not null default '{}',
  needs text[] not null default '{}',
  artwork jsonb not null,
  script jsonb not null default '[]',
  ambience_preset_id text,
  -- original-demo | licensed. Generated stories live in generated_stories.
  source text not null default 'original-demo' check (source in ('original-demo', 'licensed')),
  audio_asset_id uuid references public.audio_assets (id) on delete set null,
  featured boolean not null default false,
  fixed_minutes integer,
  published boolean not null default true,
  created_at timestamptz not null default now()
);
create index content_items_kind_idx on public.content_items (kind) where published;
create index content_items_tags_idx on public.content_items using gin (tags);
create index content_items_categories_idx on public.content_items using gin (category_ids);

-- ---------------------------------------------------------------- activity
create table public.listening_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  content_id text not null, -- catalogue id or generated_stories.id
  title text not null,
  kind text not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  progress real not null default 0 check (progress between 0 and 1),
  minutes integer not null default 0
);
create index listening_sessions_user_idx on public.listening_sessions (user_id, started_at desc);

create table public.favourites (
  user_id uuid not null references auth.users (id) on delete cascade,
  content_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, content_id)
);

create table public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  description text,
  time_of_day text not null check (time_of_day in ('morning', 'afternoon', 'evening', 'night')),
  days smallint[] not null default '{0,1,2,3,4,5,6}',
  steps jsonb not null default '[]',
  created_by text not null default 'user' check (created_by in ('user', 'companion', 'template')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index routines_user_idx on public.routines (user_id);

create table public.routine_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  routine_id uuid not null references public.routines (id) on delete cascade,
  date date not null,
  status text not null check (status in ('done', 'skipped')),
  unique (routine_id, date)
);
create index routine_completions_user_idx on public.routine_completions (user_id, date desc);

create table public.check_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  mood text not null check (mood in ('stormy', 'rainy', 'cloudy', 'bright', 'sunny')),
  energy smallint not null check (energy between 1 and 5),
  note text check (char_length(note) <= 1000),
  created_at timestamptz not null default now()
);
create index check_ins_user_idx on public.check_ins (user_id, created_at desc);

create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  prompt text,
  body text not null check (char_length(body) <= 20000),
  reflection jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index journal_entries_user_idx on public.journal_entries (user_id, created_at desc);

create table public.generated_stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  subtitle text,
  description text,
  request jsonb not null,
  script jsonb not null,
  artwork jsonb not null,
  ambience_preset_id text,
  generated_by text not null check (generated_by in ('anthropic', 'demo-template')),
  narration_asset_id uuid references public.audio_assets (id) on delete set null,
  created_at timestamptz not null default now()
);
create index generated_stories_user_idx on public.generated_stories (user_id, created_at desc);

-- ---------------------------------------------------------------- triggers
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger prefs_touch before update on public.companion_preferences for each row execute function public.touch_updated_at();
create trigger memories_touch before update on public.companion_memories for each row execute function public.touch_updated_at();
create trigger conversations_touch before update on public.conversations for each row execute function public.touch_updated_at();
create trigger journal_touch before update on public.journal_entries for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------- row-level security
alter table public.profiles enable row level security;
alter table public.companion_preferences enable row level security;
alter table public.companion_memories enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.listening_sessions enable row level security;
alter table public.favourites enable row level security;
alter table public.routines enable row level security;
alter table public.routine_completions enable row level security;
alter table public.check_ins enable row level security;
alter table public.journal_entries enable row level security;
alter table public.generated_stories enable row level security;
alter table public.content_items enable row level security;
alter table public.content_categories enable row level security;
alter table public.audio_assets enable row level security;

create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

do $$
declare t text;
begin
  foreach t in array array[
    'companion_preferences', 'companion_memories', 'conversations', 'listening_sessions', 'favourites',
    'routines', 'routine_completions', 'check_ins', 'journal_entries', 'generated_stories'
  ] loop
    execute format('create policy "own rows" on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
  end loop;
end $$;

-- Messages must belong to one of the user's own conversations.
create policy "own messages" on public.messages
  for all using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.conversations c where c.id = conversation_id and c.user_id = auth.uid())
  );

-- Routine completions must reference the user's own routine.
create policy "completion routine ownership" on public.routine_completions
  as restrictive for insert with check (
    exists (select 1 from public.routines r where r.id = routine_id and r.user_id = auth.uid())
  );

create policy "catalogue readable" on public.content_items for select using (published);
create policy "categories readable" on public.content_categories for select using (true);
create policy "assets readable" on public.audio_assets for select using (true);

-- ---------------------------------------------------------------- storage
insert into storage.buckets (id, name, public) values ('audio', 'audio', true)
  on conflict (id) do nothing;

create policy "audio readable" on storage.objects for select using (bucket_id = 'audio');
