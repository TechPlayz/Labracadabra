create extension if not exists btree_gist;

create table departments (
  id uuid primary key default gen_random_uuid(), name text unique not null, code text unique not null
);
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text not null, email text unique not null, department_id uuid references departments,
  role text not null default 'student' check (role in ('student','faculty','lab_admin','super_admin')),
  created_at timestamptz not null default now()
);
create table laboratories (
  id uuid primary key default gen_random_uuid(), department_id uuid not null references departments,
  name text not null, location text not null, description text not null default '',
  open_hour int not null default 9, close_hour int not null default 17,
  operating_days int[] not null default '{1,2,3,4,5}',
  status text not null default 'operational' check (status in ('operational','closed')),
  check (open_hour between 0 and 23 and close_hour > open_hour and close_hour <= 24),
  check (operating_days <@ array[1,2,3,4,5,6,7])
);
create table equipment (
  id uuid primary key default gen_random_uuid(), laboratory_id uuid not null references laboratories,
  name text not null, description text not null default '', category text not null,
  manufacturer text not null, model text not null, specifications text not null, capabilities text[] not null,
  status text not null default 'operational' check (status in ('operational','unavailable')),
  image_url text, requires_approval boolean not null default false, requires_training boolean not null default false,
  created_at timestamptz not null default now()
);
create table equipment_units (
  id uuid primary key default gen_random_uuid(), equipment_id uuid not null references equipment,
  label text not null, operational boolean not null default true, unique(equipment_id,label)
);
create table projects (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references profiles,
  title text not null, description text not null, deadline date not null, capabilities text[] not null default '{}',
  progress int not null default 0 check (progress between 0 and 100),
  created_at timestamptz not null default now()
);
create table project_members (
  project_id uuid references projects on delete cascade, member_id uuid references profiles,
  primary key(project_id,member_id)
);
create table booking_requests (
  id uuid primary key default gen_random_uuid(), requester_id uuid not null references profiles,
  project_id uuid not null references projects, equipment_unit_id uuid not null references equipment_units,
  requested_start timestamptz not null, requested_end timestamptz not null, purpose text not null,
  status text not null check (status in ('pending_approval','confirmed','rejected','cancelled','completed','waitlisted')),
  priority_explanation text, from_waitlist boolean not null default false, created_at timestamptz not null default now(),
  check (requested_end > requested_start)
);
create table bookings (
  id uuid primary key default gen_random_uuid(), request_id uuid unique not null references booking_requests,
  equipment_unit_id uuid not null references equipment_units, starts_at timestamptz not null, ends_at timestamptz not null,
  cancelled_at timestamptz, pass_token uuid unique not null default gen_random_uuid(),
  checked_in_at timestamptz, checked_out_at timestamptz,
  created_at timestamptz not null default now(), check (ends_at > starts_at),
  check (checked_out_at is null or (checked_in_at is not null and checked_out_at >= checked_in_at)),
  exclude using gist (equipment_unit_id with =, tstzrange(starts_at, ends_at, '[)') with &&) where (cancelled_at is null)
);
create table approvals (
  id uuid primary key default gen_random_uuid(), request_id uuid unique not null references booking_requests,
  faculty_id uuid not null references profiles, decision text not null check (decision in ('approved','rejected','alternative')),
  comment text, suggested_start timestamptz, suggested_unit_id uuid references equipment_units, decided_at timestamptz not null default now()
);
create table maintenance_blocks (
  id uuid primary key default gen_random_uuid(), equipment_unit_id uuid not null references equipment_units,
  starts_at timestamptz not null, ends_at timestamptz not null, check (ends_at > starts_at)
);
create table training_certifications (
  id uuid primary key default gen_random_uuid(), profile_id uuid not null references profiles,
  equipment_id uuid not null references equipment, expires_at timestamptz not null, unique(profile_id,equipment_id)
);
create table notifications (
  id uuid primary key default gen_random_uuid(), profile_id uuid not null references profiles, message text not null,
  read_at timestamptz, created_at timestamptz not null default now()
);
create table waitlist_entries (
  id uuid primary key default gen_random_uuid(), request_id uuid unique not null references booking_requests,
  created_at timestamptz not null default now()
);
create table audit_logs (
  id uuid primary key default gen_random_uuid(), actor_id uuid not null references profiles,
  action text not null, subject_id uuid not null, created_at timestamptz not null default now()
);

create index on laboratories(department_id);
create index on equipment(laboratory_id);
create index on projects(owner_id);
create index on project_members(member_id);
create index on booking_requests(requester_id, requested_start);
create index on booking_requests(equipment_unit_id, status);
create index on booking_requests(project_id);
create index on maintenance_blocks(equipment_unit_id,starts_at);
create index on notifications(profile_id,created_at desc);

do $$
declare table_name text;
begin
  foreach table_name in array array['departments','profiles','laboratories','equipment','equipment_units',
    'projects','project_members','booking_requests','bookings','approvals','maintenance_blocks',
    'training_certifications','notifications','waitlist_entries','audit_logs'] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on table public.%I from anon, authenticated', table_name);
  end loop;
end $$;

-- Authorization is enforced by the explicitly granted RPCs. PostgREST roles have no direct table grants.
create function campus_can_review(resource uuid, requester uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from profiles p cross join equipment e join laboratories l on l.id=e.laboratory_id
     where p.id=auth.uid() and e.id=resource and p.id<>requester
       and (p.role='super_admin' or (p.role in ('faculty','lab_admin') and p.department_id=l.department_id))
  );
$$;

create function campus_has_project(target uuid, person uuid) returns boolean
language sql stable set search_path = public, pg_temp as $$
  select exists(select 1 from projects where id=target and owner_id=person)
     or exists(select 1 from project_members where project_id=target and member_id=person);
$$;

-- Every write that changes a physical unit's calendar must hold the same row lock.
create function campus_validate_slot(target uuid, starts timestamptz, ends timestamptz, person uuid)
returns text language plpgsql set search_path = public, pg_temp as $$
declare
  unit_info record;
  local_start timestamp := starts at time zone 'Asia/Kolkata';
  local_end timestamp := ends at time zone 'Asia/Kolkata';
begin
  if starts is null or ends is null or starts <= now()
     or ends-starts not between interval '30 minutes' and interval '4 hours'
     or extract(epoch from local_start::time)::int % 1800 <> 0
     or extract(epoch from (ends-starts))::int % 1800 <> 0 then
    return 'Choose a future half-hour slot of 30 minutes to four hours.';
  end if;
  select e.id, e.requires_training, u.operational, e.status equipment_status, l.status lab_status,
      l.open_hour, l.close_hour, l.operating_days
    into unit_info from equipment_units u join equipment e on e.id=u.equipment_id
      join laboratories l on l.id=e.laboratory_id where u.id=target for update of u;
  if not found or not unit_info.operational or unit_info.equipment_status <> 'operational' or unit_info.lab_status <> 'operational' then
    return 'This unit is unavailable.';
  end if;
  if not (extract(isodow from local_start)::int = any(unit_info.operating_days))
      or local_start < date_trunc('day', local_start) + make_interval(hours => unit_info.open_hour)
      or local_end > date_trunc('day', local_start) + make_interval(hours => unit_info.close_hour) then
    return 'The slot is outside campus operating hours.';
  end if;
  if unit_info.requires_training and not exists (
    select 1 from training_certifications where profile_id=person and equipment_id=unit_info.id and expires_at>=ends
  ) then return 'Current equipment training is required.'; end if;
  if exists (select 1 from maintenance_blocks where equipment_unit_id=target and starts_at<ends and ends_at>starts)
    then return 'This slot overlaps maintenance.'; end if;
  return null;
end $$;

create function campus_maintenance_guard() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  perform 1 from equipment_units where id=new.equipment_unit_id for update;
  if exists(select 1 from bookings where equipment_unit_id=new.equipment_unit_id and cancelled_at is null
      and starts_at<new.ends_at and ends_at>new.starts_at) then
    raise exception 'Maintenance overlaps a confirmed reservation';
  end if;
  return new;
end $$;
create trigger protect_maintenance before insert or update on maintenance_blocks
for each row execute function campus_maintenance_guard();

revoke all on function campus_can_review(uuid,uuid), campus_has_project(uuid,uuid),
  campus_validate_slot(uuid,timestamptz,timestamptz,uuid), campus_maintenance_guard()
  from public, anon, authenticated;
