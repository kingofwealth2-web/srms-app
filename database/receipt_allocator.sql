-- ═══════════════════════════════════════════════════════════════════
-- Atomic receipt-number allocation
--
-- Run once per database (staging, then production). Safe to re-run.
--
-- WHY
-- generate_receipt_no() derived the next number from already-committed
-- payments:
--     SELECT COALESCE(MAX(...), 0) + 1 FROM payments WHERE school_id = ...
-- That is not an allocator, it is a guess based on what is visible right now.
-- Two consequences:
--   1. Two people saving a payment at the same moment both read the same
--      maximum and are both issued the same receipt number.
--   2. Numbers cannot be requested in advance, so a bulk save has to insert
--      each payment before it can ask for the next number -- which is what
--      made recording a fee period for a few hundred students take minutes.
--
-- This replaces the guess with a counter row that is incremented under a row
-- lock, so concurrent callers queue rather than collide, and a caller can take
-- a block of numbers in one round-trip.
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. The counter ────────────────────────────────────────────────
create table if not exists public.receipt_counters (
  school_id  uuid primary key references public.schools(id) on delete cascade,
  next_no    bigint not null default 1,
  updated_at timestamptz default now()
);

-- Only the SECURITY DEFINER functions below may touch this table. RLS is on
-- with no policies, so direct client access is refused outright.
alter table public.receipt_counters enable row level security;

-- ── 2. Seed from history ──────────────────────────────────────────
-- Start each school above its highest existing receipt number, or the
-- allocator would reissue numbers that are already printed and handed out.
-- greatest() keeps this safe to re-run: it can only ever move forward.
insert into public.receipt_counters (school_id, next_no)
select s.id,
       coalesce(max(cast(split_part(p.receipt_no, '-', 2) as int)), 0) + 1
from public.schools s
left join public.payments p
       on p.school_id = s.id
      and p.receipt_no ~ '^RCP-[0-9]+$'
group by s.id
on conflict (school_id) do update
  set next_no = greatest(public.receipt_counters.next_no, excluded.next_no);

-- ── 3. Allocate a block ───────────────────────────────────────────
-- Returns p_count receipt numbers, already reserved. The UPDATE ... RETURNING
-- takes a row lock, so a second caller waits for the first to commit instead
-- of reading the same value.
create or replace function public.allocate_receipt_nos(p_school_id uuid, p_count int)
returns text[] language plpgsql security definer set search_path to 'public' as $$
declare
  v_start bigint;
  v_out   text[];
begin
  if p_count is null or p_count <= 0 then
    return '{}'::text[];
  end if;

  -- A school created before this migration ran has no counter row yet. Seed it
  -- from its own history rather than from 1, for the same reason as above.
  insert into public.receipt_counters (school_id, next_no)
  select p_school_id,
         coalesce(max(cast(split_part(receipt_no, '-', 2) as int)), 0) + 1
  from public.payments
  where school_id = p_school_id
    and receipt_no ~ '^RCP-[0-9]+$'
  on conflict (school_id) do nothing;

  update public.receipt_counters
     set next_no = next_no + p_count,
         updated_at = now()
   where school_id = p_school_id
  returning next_no - p_count into v_start;

  select array_agg('RCP-' || lpad((v_start + g.i)::text, 4, '0') order by g.i)
    into v_out
    from generate_series(0, p_count - 1) as g(i);

  return v_out;
end;
$$;

-- ── 4. Single-payment path uses the same counter ──────────────────
-- Both paths must draw from one source of truth, or the bulk save and the
-- single-payment form would drift apart and start colliding with each other.
create or replace function public.generate_receipt_no(p_school_id uuid)
returns text language plpgsql security definer set search_path to 'public' as $$
begin
  return (public.allocate_receipt_nos(p_school_id, 1))[1];
end;
$$;

grant execute on function public.allocate_receipt_nos(uuid, int) to authenticated;
grant execute on function public.generate_receipt_no(uuid)       to authenticated;

-- ── 5. Optional: make duplicates impossible at the database level ──
-- Belt and braces -- with this in place a logic bug can never commit a
-- duplicate receipt, it just fails loudly instead.
--
-- CHECK FIRST. If this returns any rows, do not create the index until they
-- are resolved; it will fail on existing duplicates.
--
--   select school_id, receipt_no, count(*)
--   from public.payments
--   where receipt_no is not null
--   group by school_id, receipt_no
--   having count(*) > 1;
--
-- Then:
--
--   create unique index concurrently if not exists payments_school_receipt_uniq
--     on public.payments (school_id, receipt_no)
--     where receipt_no is not null;
