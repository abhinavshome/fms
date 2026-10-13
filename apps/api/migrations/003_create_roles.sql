-- up
create table roles (
    id serial primary key,
    name varchar not null unique,
    description text,
    created_at timestamptz not null default now()
);

-- down
drop table roles;