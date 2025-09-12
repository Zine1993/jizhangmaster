create or replace function public.restore_default_emotion_tags()
returns void as $$
begin
  -- Deactivate all existing tags first
  update public.emotion_tags set is_active = false;

  -- Insert or update the standard set of default tags
  -- This ensures they exist and are active
  insert into public.emotion_tags (name, emoji, is_active)
  values
    ('happy', '😊', true),
    ('sad', '😢', true),
    ('anxious', '😟', true),
    ('excited', '🤩', true),
    ('content', '😌', true),
    ('stressed', '😫', true),
    ('bored', '😑', true),
    ('grateful', '🙏', true),
    ('angry', '😠', true),
    ('lonely', '😔', true),
    ('reward', '🎁', true),
    ('confident', '😎', true),
    ('guilty', '😥', true),
    ('disappointed', '😞', true),
    ('relieved', '😅', true)
  on conflict (name) do update
  set
    emoji = excluded.emoji,
    is_active = true;
end;
$$ language plpgsql;

-- Grant usage to authenticated users and the service role
grant execute on function public.restore_default_emotion_tags() to authenticated;
grant execute on function public.restore_default_emotion_tags() to service_role;