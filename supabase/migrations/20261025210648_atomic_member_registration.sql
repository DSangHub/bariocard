create or replace function public.register_bario_member(payload jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare m public.members; card_id uuid;
begin
  if (payload->>'date_of_birth')::date > (current_date - interval '21 years')::date then
    raise exception '21+ only';
  end if;
  insert into public.members(member_number,full_name,email,phone,date_of_birth,preferred_delivery,mailing_address)
  values(payload->>'member_number',payload->>'full_name',payload->>'email',payload->>'phone',
    (payload->>'date_of_birth')::date,payload->>'preferred_delivery',nullif(payload->'mailing_address','null'::jsonb))
  returning * into m;
  insert into public.age_verifications(member_id,method,result)
  values(m.id,case when m.preferred_delivery='pickup' then 'bar_in_person' else 'bario_remote' end,'pending');
  insert into public.cards(member_id,card_number,qr_token_hash,card_type,status,issued_by)
  values(m.id,payload->>'card_number',payload->>'qr_token_hash','digital','issued','bario')
  returning id into card_id;
  insert into public.fulfillment_orders(member_id,card_id,delivery_method,shipping_address,status)
  values(m.id,card_id,m.preferred_delivery,m.mailing_address,'pending');
  return jsonb_build_object('member_number',m.member_number,'status',m.status,'points',m.points);
end;
$$;
revoke all on function public.register_bario_member(jsonb) from public,anon,authenticated;
grant execute on function public.register_bario_member(jsonb) to service_role;
