-- The push notification now says where and when ("Room 2105 at 1:10 PM"), so the trigger sends the
-- post's time, repeat rule and cancel reason along with the fields it already sent. Same trigger,
-- same conditions (new active post, or a post changed to cancelled); only the payload grows.
-- (The Edge Function cannot read public.updates itself: service_role has no SELECT grant on it.)

create or replace function public.notify_on_post_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  service_key text;
  event_name text;
begin
  if NEW.type = 'exec_meeting' then
    return NEW;
  end if;

  if TG_OP = 'INSERT' and NEW.status = 'active' then
    event_name := 'new_post';
  elsif TG_OP = 'UPDATE' and NEW.status = 'cancelled' and OLD.status is distinct from 'cancelled' then
    event_name := 'cancelled';
  else
    return NEW;
  end if;

  select decrypted_secret into service_key
  from vault.decrypted_secrets
  where name = 'trigger_service_role_key';

  if service_key is null then
    return NEW;
  end if;

  perform net.http_post(
    url := 'https://pympzzwlaveyhnzwfomb.supabase.co/functions/v1/notify-post',
    body := jsonb_build_object(
      'event', event_name,
      'id', NEW.id,
      'type', NEW.type,
      'title', NEW.title,
      'body', NEW.body,
      'location', NEW.location,
      'event_time', NEW.event_time,
      'recurrence', NEW.recurrence,
      'cancel_reason', NEW.cancel_reason
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    timeout_milliseconds := 5000
  );

  return NEW;
end;
$$;
