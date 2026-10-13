-- up
create table sops (
    id serial primary key,
    name varchar not null,
    objective text,
    scope text,
    accountability_role_id int references roles(id) on delete set null,
    created_at timestamptz not null default now()
);

create table sop_responsibilities (
    sop_id int not null references sops(id) on delete cascade,
    role_id int not null references roles(id) on delete cascade,
    primary key (sop_id, role_id)
);

create table sop_sections (
    id serial primary key,
    serial_num int not null,
    sop_id int not null references sops(id) on delete cascade,
    description text not null,
    created_at timestamptz not null default now()
);

create table sop_steps (
    id serial primary key,
    serial_num int not null,
    sop_section_id int not null references sop_sections(id) on delete cascade,
    description text not null,
    created_at timestamptz not null default now()
);

create index idx_sop_sections_sop_id on sop_sections(sop_id);
create index idx_sop_steps_id on sop_steps(sop_section_id);


-- down
drop table sop_steps;
drop table sop_sections;
drop table sop_responsibilities;
drop table sops;