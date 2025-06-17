-- Дропаємо таблицю якщо вона існує
drop table if exists public.ttn;

create table public.ttn (
    id uuid default gen_random_uuid() primary key,
    client_id uuid references public.clients(id) not null,
    sender_id uuid references public.sender(id) not null,
    description text not null,
    cost decimal(10,2) not null,
    user_id uuid references auth.users(id) not null,
    status text not null default 'new',
    nova_poshta_ref text,
    nova_poshta_number text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Додаємо RLS політики
alter table public.ttn enable row level security;

create policy "Users can view their own TTN"
    on public.ttn for select
    using (auth.uid() = user_id);

create policy "Users can create their own TTN"
    on public.ttn for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own TTN"
    on public.ttn for update
    using (auth.uid() = user_id);

create policy "Users can delete their own TTN"
    on public.ttn for delete
    using (auth.uid() = user_id);

-- Додаємо індекси
create index ttn_client_id_idx on public.ttn(client_id);
create index ttn_sender_id_idx on public.ttn(sender_id);
create index ttn_user_id_idx on public.ttn(user_id);
create index ttn_status_idx on public.ttn(status);
create index ttn_created_at_idx on public.ttn(created_at);
create index ttn_nova_poshta_number_idx on public.ttn(nova_poshta_number);

-- Додаємо тригер для оновлення updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$ language plpgsql;

create trigger set_updated_at
    before update on public.ttn
    for each row
    execute function public.handle_updated_at(); 