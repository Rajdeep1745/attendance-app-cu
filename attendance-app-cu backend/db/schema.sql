create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  password text,
  department text,
  institution text,
  role text not null default 'student',
  avatar text,
  created_at timestamptz not null default now()
);

create table if not exists teachers (
  teacher_id uuid primary key references users(id) on delete cascade,
  default_mode text not null default 'manual',
  default_threshold integer not null default 75 check (default_threshold >= 0 and default_threshold <= 100),
  created_at timestamptz not null default now()
);

create table if not exists batches (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references teachers(teacher_id) on delete cascade,
  name text not null,
  batch_code text not null unique,
  threshold integer not null default 75 check (threshold >= 0 and threshold <= 100),
  total_students integer not null default 0 check (total_students >= 0),
  created_at timestamptz not null default now()
);

create table if not exists students (
  student_id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references users(id) on delete cascade,
  roll_no text not null unique,
  face_registered boolean not null default false,
  attendance_percentage numeric(5,2) not null default 0 check (attendance_percentage >= 0 and attendance_percentage <= 100),
  created_at timestamptz not null default now()
);

create table if not exists enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(student_id) on delete cascade,
  batch_id uuid not null references batches(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (student_id, batch_id)
);

create table if not exists batch_attendances (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references batches(id) on delete cascade,
  date date not null,
  attendance_percentage numeric(5,2) not null default 0 check (attendance_percentage >= 0 and attendance_percentage <= 100),
  created_at timestamptz not null default now(),
  unique (batch_id, date)
);

create table if not exists student_attendances (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(student_id) on delete cascade,
  batch_id uuid not null references batches(id) on delete cascade,
  date date not null,
  present boolean not null,
  created_at timestamptz not null default now(),
  unique (student_id, batch_id, date)
);

create table if not exists lecture_curriculum (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null unique references batches(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists lecture_curriculum_topics (
  id uuid primary key default gen_random_uuid(),
  curriculum_id uuid not null references lecture_curriculum(id) on delete cascade,
  unit_name text not null,
  topic_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists lecture_schedule (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references batches(id) on delete cascade,
  topic_id uuid not null references lecture_curriculum_topics(id) on delete cascade,
  week_no integer not null check (week_no > 0),
  objectives text,
  classes integer not null default 1 check (classes >= 0),
  created_at timestamptz not null default now()
);

create table if not exists student_face_data (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null unique references students(student_id) on delete cascade,
  image_url text,
  embedding jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_enrollments_batch_id on enrollments(batch_id);
create index if not exists idx_student_attendances_batch_date on student_attendances(batch_id, date);
create index if not exists idx_batch_attendances_batch_date on batch_attendances(batch_id, date);
create index if not exists idx_lecture_schedule_batch_id on lecture_schedule(batch_id);
create index if not exists idx_lecture_curriculum_topics_curriculum_id on lecture_curriculum_topics(curriculum_id);

create or replace function increment_student_count(batch_id uuid)
returns void
language plpgsql
as $$
begin
  update batches
  set total_students = total_students + 1
  where id = batch_id;
end;
$$;

create or replace function decrement_student_count(batch_id uuid)
returns void
language plpgsql
as $$
begin
  update batches
  set total_students = greatest(total_students - 1, 0)
  where id = batch_id;
end;
$$;

drop function if exists frequent_absentees(uuid);

create or replace function frequent_absentees(batch_id_input uuid)
returns table (
  id uuid,
  name text,
  absences bigint
)
language sql
as $$
  select
    s.student_id as id,
    u.name,
    count(*) as absences
  from student_attendances sa
  join students s on s.student_id = sa.student_id
  join users u on u.id = s.user_id
  where sa.batch_id = batch_id_input
    and sa.present = false
  group by s.student_id, u.name
  order by absences desc, u.name asc;
$$;
