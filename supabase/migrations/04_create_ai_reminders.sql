create table if not exists call_reminders (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  client_name text not null,
  phone_number text not null,
  due_date date not null,
  amount_or_context text,
  script_template text,
  status text default 'pending' check (status in ('pending', 'called', 'failed')),
  call_sid text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table call_reminders enable row level security;

-- Policies
create policy "Users can view their own call reminders." on call_reminders for select using (auth.uid() = user_id);
create policy "Users can insert their own call reminders." on call_reminders for insert with check (auth.uid() = user_id);
create policy "Users can update their own call reminders." on call_reminders for update using (auth.uid() = user_id);
create policy "Users can delete their own call reminders." on call_reminders for delete using (auth.uid() = user_id);
