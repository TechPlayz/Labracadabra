create function campus_snapshot() returns jsonb
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare person profiles%rowtype; result jsonb;
begin
  select * into person from profiles where id=auth.uid();
  if not found then raise exception 'Campus profile required' using errcode='42501'; end if;

  with resource_data as (
    select e.*, l.department_id, l.name lab, l.location, d.name department, l.open_hour, l.close_hour,
      l.operating_days, l.status lab_status
    from equipment e join laboratories l on l.id=e.laboratory_id join departments d on d.id=l.department_id
  ), request_data as (
    select r.*, u.equipment_id, a.comment, a.faculty_id, a.decided_at, a.suggested_start, a.suggested_unit_id, b.checked_in_at, b.checked_out_at,
      (select full_name from profiles where id=r.requester_id) requester_name,
      r.requester_id=person.id or campus_can_review(u.equipment_id,r.requester_id) as can_see
    from booking_requests r join equipment_units u on u.id=r.equipment_unit_id
    left join approvals a on a.request_id=r.id left join bookings b on b.request_id=r.id
  ), visible_requests as (
    select r.*, jsonb_build_object('id',r.id,'ownerId',r.requester_id,'projectId',r.project_id,
      'unitId',r.equipment_unit_id,'equipmentId',r.equipment_id,'start',r.requested_start,'end',r.requested_end,
      'purpose',r.purpose,'createdAt',r.created_at,'status',case when r.status='confirmed' and r.requested_end<=now()
        then 'completed' else r.status end,'comment',r.comment,'decisionBy',r.faculty_id,
      'decidedAt',r.decided_at,'suggestedStart',r.suggested_start,'fromWaitlist',r.from_waitlist,
      'requesterName',r.requester_name,'checkedInAt',r.checked_in_at,'checkedOutAt',r.checked_out_at,'suggestedUnitId',r.suggested_unit_id,
      'suggestedEquipmentId',(select equipment_id from equipment_units where id=r.suggested_unit_id)) payload
    from request_data r where r.can_see
  )
  select jsonb_build_object(
    'actor', jsonb_build_object('id',person.id,'name',person.full_name,'role',person.role,
      'department',coalesce((select name from departments where id=person.department_id),'')),
    'demo',false,'asOf',floor(extract(epoch from now())*1000),
    'equipment', (select coalesce(jsonb_agg(jsonb_build_object(
      'id',e.id,'name',e.name,'category',e.category,'labId',e.laboratory_id,'department',e.department,
      'lab',e.lab,'location',e.location,'manufacturer',e.manufacturer,'model',e.model,'specifications',e.specifications,
      'capabilities',e.capabilities,'requiresApproval',e.requires_approval,'requiresTraining',e.requires_training)
      order by e.name,e.id),'[]') from resource_data e),
    'units', (select coalesce(jsonb_agg(jsonb_build_object(
      'id',u.id,'equipmentId',u.equipment_id,'label',u.label,'operational',u.operational
        and e.status='operational' and e.lab_status='operational',
      'opens',e.open_hour,'closes',e.close_hour,'days',e.operating_days)),'[]')
      from equipment_units u join resource_data e on e.id=u.equipment_id),
    'maintenance', (select coalesce(jsonb_agg(jsonb_build_object(
      'unitId',equipment_unit_id,'start',starts_at,'end',ends_at)),'[]')
      from maintenance_blocks where ends_at > now()-interval '90 days'),
    'occupied', (select coalesce(jsonb_agg(jsonb_build_object(
      'unitId',equipment_unit_id,'start',starts_at,'end',ends_at)),'[]')
      from bookings where cancelled_at is null and ends_at > now()-interval '90 days'),
    'projects', (select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'ownerId',p.owner_id,'title',p.title,
      'description',p.description,'deadline',p.deadline,'capabilities',p.capabilities,'progress',p.progress,
      'team',(select coalesce(jsonb_agg(m.member_id),'[]') from project_members m where m.project_id=p.id),
      'memberNames',(select coalesce(jsonb_object_agg(m.member_id,member.full_name),'{}') from project_members m
        join profiles member on member.id=m.member_id where m.project_id=p.id))), '[]')
      from projects p where campus_has_project(p.id,person.id) or p.id in (select project_id from visible_requests)),
    'requests', (select coalesce(jsonb_agg(payload order by created_at desc),'[]') from visible_requests),
    'analyticsRequests', (select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'equipmentId',r.equipment_id,
      'unitId',r.equipment_unit_id,'start',r.requested_start,'end',r.requested_end,'status',r.status,
      'fromWaitlist',r.from_waitlist,'crossDepartment',p.department_id is distinct from e.department_id)), '[]')
      from request_data r join profiles p on p.id=r.requester_id join resource_data e on e.id=r.equipment_id
      where person.role in ('lab_admin','super_admin') and (person.role='super_admin' or person.department_id=e.department_id)
        and r.requested_start >= now()-interval '90 days'),
    'certifications', (select coalesce(jsonb_agg(jsonb_build_object(
      'ownerId',t.profile_id,'equipmentId',t.equipment_id,'expires',t.expires_at)), '[]')
      from training_certifications t where t.profile_id=person.id or exists(
        select 1 from visible_requests r where r.requester_id=t.profile_id
          and campus_can_review(r.equipment_id,r.requester_id))),
    'notices', (select coalesce(jsonb_agg(jsonb_build_object('id',n.id,'ownerId',n.profile_id,'message',n.message,
      'createdAt',n.created_at,'read',n.read_at is not null) order by n.created_at desc), '[]')
      from notifications n where n.profile_id=person.id)
  ) into result;
  return result;
end $$;

create function campus_mutate(command jsonb) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare
  person profiles%rowtype; project_row projects%rowtype; req booking_requests%rowtype;
  visit bookings%rowtype; res equipment%rowtype; alt_res equipment%rowtype; alt_unit uuid; essential text[]; action text:=command->>'type'; target uuid; project_key uuid;
  starts timestamptz; ends timestamptz; alternative timestamptz; slot_error text;
  new_status text; note text; changed_id uuid; selected_capabilities text[]; members uuid[];
begin
  select * into person from profiles where id=auth.uid();
  if not found then raise exception 'Campus profile required' using errcode='42501'; end if;
  if action='saveProject' then
    if person.role<>'student' then raise exception 'Student access required' using errcode='42501'; end if;
    project_key:=(command->>'id')::uuid;
    select coalesce(array_agg(value),'{}') into selected_capabilities from jsonb_array_elements_text(command->'capabilities');
    select coalesce(array_agg(distinct value::uuid),'{}') into members from jsonb_array_elements_text(command->'team');
    if coalesce(length(trim(command->>'title')),0) not between 3 and 100
      or coalesce(length(trim(command->>'description')),0) not between 10 and 2000
      or cardinality(selected_capabilities)>12 or cardinality(members)>12 then raise exception 'Invalid project details'; end if;
    if project_key is null then
      insert into projects(owner_id,title,description,deadline,capabilities,progress)
        values(person.id,command->>'title',command->>'description',(command->>'deadline')::date,
          selected_capabilities,(command->>'progress')::int) returning id into changed_id;
    else
      update projects set title=command->>'title',description=command->>'description',deadline=(command->>'deadline')::date,
        capabilities=selected_capabilities,progress=(command->>'progress')::int
        where id=project_key and owner_id=person.id returning id into changed_id;
      if not found then raise exception 'Project access denied' using errcode='42501'; end if;
      delete from project_members where project_id=changed_id;
    end if;
    insert into project_members(project_id,member_id) select changed_id,member from unnest(members) member where member<>person.id;
  elsif action='request' then
    if person.role<>'student' then raise exception 'Student access required' using errcode='42501'; end if;
    project_key:=(command->>'projectId')::uuid;
    if not campus_has_project(project_key,person.id) then raise exception 'Project access denied' using errcode='42501'; end if;
    select * into project_row from projects where id=project_key;
    target:=(command->>'unitId')::uuid;
    starts:=(command->>'start')::timestamptz;
    ends:=(command->>'end')::timestamptz;
    note:=trim(command->>'purpose');
    if coalesce(length(note),0) not between 10 and 1000 then raise exception 'Describe your booking purpose'; end if;
    if ((ends-interval '1 millisecond') at time zone 'Asia/Kolkata')::date > project_row.deadline then raise exception 'This slot is past the project deadline'; end if;
    slot_error:=campus_validate_slot(target,starts,ends,person.id);
    if slot_error is not null then raise exception '%',slot_error; end if;
    select e.* into res from equipment e join equipment_units u on u.equipment_id=e.id where u.id=target;
    if cardinality(project_row.capabilities)>0 and not (project_row.capabilities && res.capabilities) then
      raise exception 'Equipment does not match a project capability';
    end if;
    if exists(select 1 from booking_requests where requester_id=person.id and equipment_unit_id=target
      and requested_start=starts and requested_end=ends and status in ('waitlisted','pending_approval','confirmed')) then
      raise exception 'You already have a request for this slot';
    end if;
    new_status:=case
      when exists(select 1 from bookings where equipment_unit_id=target and cancelled_at is null and starts_at<ends and ends_at>starts)
        then 'waitlisted'
      when res.requires_approval then 'pending_approval' else 'confirmed' end;
    insert into booking_requests(requester_id,project_id,equipment_unit_id,requested_start,requested_end,purpose,status)
      values(person.id,project_key,target,starts,ends,note,new_status) returning id into changed_id;
    if new_status='waitlisted' then insert into waitlist_entries(request_id) values(changed_id); end if;
    if new_status='confirmed' then
      insert into bookings(request_id,equipment_unit_id,starts_at,ends_at) values(changed_id,target,starts,ends);
    end if;
    insert into notifications(profile_id,message) values(person.id,'Request for '||res.name||': '||replace(new_status,'_',' '));
  elsif action in ('cancel','decide','retry') then
    select * into req from booking_requests where id=(command->>'id')::uuid for update;
    if not found then raise exception 'Request unavailable' using errcode='42501'; end if;
    select e.* into res from equipment e join equipment_units u on u.equipment_id=e.id where u.id=req.equipment_unit_id;
    changed_id:=req.id;
    if action='cancel' then
      if req.requester_id<>person.id then raise exception 'Request access denied' using errcode='42501'; end if;
      if req.status not in ('waitlisted','pending_approval','confirmed') or req.requested_start<=now() then
        raise exception 'This request cannot be cancelled'; end if;
      perform 1 from equipment_units where id=req.equipment_unit_id for update;
      update bookings set cancelled_at=now() where request_id=req.id;
      delete from waitlist_entries where request_id=req.id;
      new_status:='cancelled';
    elsif action='retry' then
      if req.requester_id<>person.id then raise exception 'Request access denied' using errcode='42501'; end if;
      if req.status<>'waitlisted' then raise exception 'This request is no longer waitlisted'; end if;
      if not campus_has_project(req.project_id,req.requester_id) then raise exception 'Project access denied' using errcode='42501'; end if;
      select * into project_row from projects where id=req.project_id;
      if ((req.requested_end-interval '1 millisecond') at time zone 'Asia/Kolkata')::date>project_row.deadline
        or (cardinality(project_row.capabilities)>0 and not (project_row.capabilities && res.capabilities)) then
        raise exception 'Review current project deadline and capabilities'; end if;
      slot_error:=campus_validate_slot(req.equipment_unit_id,req.requested_start,req.requested_end,req.requester_id);
      if slot_error is not null then raise exception '%',slot_error; end if;
      if exists(select 1 from bookings where equipment_unit_id=req.equipment_unit_id and cancelled_at is null
        and starts_at<req.requested_end and ends_at>req.requested_start) then raise exception 'This slot is still occupied'; end if;
      new_status:=case when res.requires_approval then 'pending_approval' else 'confirmed' end;
      if new_status='confirmed' then
        insert into bookings(request_id,equipment_unit_id,starts_at,ends_at)
          values(req.id,req.equipment_unit_id,req.requested_start,req.requested_end);
      end if;
      delete from waitlist_entries where request_id=req.id;
      update booking_requests set from_waitlist=true where id=req.id;
    else
      if not campus_can_review(res.id,req.requester_id) then raise exception 'Approval scope denied' using errcode='42501'; end if;
      if req.status<>'pending_approval' then raise exception 'This request is no longer pending'; end if;
      note:=trim(command->>'comment');
      if command->>'decision'='approved' then
        slot_error:=campus_validate_slot(req.equipment_unit_id,req.requested_start,req.requested_end,req.requester_id);
        if slot_error is not null then raise exception '%',slot_error; end if;
        if not campus_has_project(req.project_id,req.requester_id) then raise exception 'Project access denied' using errcode='42501'; end if;
        select * into project_row from projects where id=req.project_id;
        if ((req.requested_end-interval '1 millisecond') at time zone 'Asia/Kolkata')::date>project_row.deadline
          or (cardinality(project_row.capabilities)>0 and not (project_row.capabilities && res.capabilities)) then
          raise exception 'Review current project deadline and capabilities'; end if;
        if exists(select 1 from bookings where equipment_unit_id=req.equipment_unit_id and cancelled_at is null
          and starts_at<req.requested_end and ends_at>req.requested_start) then raise exception 'This slot is already occupied'; end if;
        insert into bookings(request_id,equipment_unit_id,starts_at,ends_at)
          values(req.id,req.equipment_unit_id,req.requested_start,req.requested_end);
        new_status:='confirmed';
      elsif command->>'decision' in ('rejected','alternative') and coalesce(length(note),0) between 3 and 500 then
        new_status:='rejected';
        if command->>'decision'='alternative' then
          alternative:=(command->>'suggestedStart')::timestamptz;
          ends:=alternative+(req.requested_end-req.requested_start);
          alt_unit:=coalesce((command->>'suggestedUnitId')::uuid,req.equipment_unit_id);
          select * into project_row from projects where id=req.project_id;
          select e.* into alt_res from equipment e join equipment_units u on u.equipment_id=e.id where u.id=alt_unit;
          select coalesce(array_agg(capability),'{}') into essential from unnest(project_row.capabilities) capability
            where capability=any(res.capabilities);
          if cardinality(essential)=0 then essential:=res.capabilities; end if;
          if alt_res.id is null or (alt_res.id<>res.id and (cardinality(essential)=0 or not (essential <@ alt_res.capabilities))) then
            raise exception 'Choose a compatible alternative unit'; end if;
          slot_error:=campus_validate_slot(alt_unit,alternative,ends,req.requester_id);
          if slot_error is not null then raise exception '%',slot_error; end if;
          if exists(select 1 from bookings where equipment_unit_id=alt_unit and cancelled_at is null
            and starts_at<ends and ends_at>alternative) then raise exception 'This alternative is already occupied'; end if;
          if ((ends-interval '1 millisecond') at time zone 'Asia/Kolkata')::date > project_row.deadline then
            raise exception 'This alternative is past the project deadline'; end if;
        end if;
      else raise exception 'Choose a decision and include a reason'; end if;
      insert into approvals(request_id,faculty_id,decision,comment,suggested_start,suggested_unit_id)
        values(req.id,person.id,command->>'decision',left(note,500),alternative,alt_unit);
    end if;
    update booking_requests set status=new_status where id=req.id;
    insert into notifications(profile_id,message) values(req.requester_id,'Request for '||res.name||': '||
      case when alternative is not null then 'alternative slot suggested' else replace(new_status,'_',' ') end);
  elsif action='issuePass' then
    select b.* into visit from bookings b join booking_requests r on r.id=b.request_id
      where r.id=(command->>'id')::uuid and r.requester_id=person.id and b.cancelled_at is null
        and b.checked_out_at is null and b.ends_at+interval '24 hours'>clock_timestamp();
    if not found then raise exception 'Pass access denied' using errcode='42501'; end if;
    return jsonb_build_object('pass',visit.pass_token);
  elsif action='checkVisit' then
    select r.* into req from booking_requests r join bookings b on b.request_id=r.id
      where b.pass_token=(command->>'pass')::uuid for update of r;
    if not found then raise exception 'Pass access denied' using errcode='42501'; end if;
    select * into visit from bookings where request_id=req.id for update;
    select e.* into res from equipment e join equipment_units u on u.equipment_id=e.id where u.id=req.equipment_unit_id;
    if visit.cancelled_at is not null or not campus_can_review(res.id,req.requester_id) then
      raise exception 'Pass access denied' using errcode='42501'; end if;
    if command->>'action'='in' then
      if visit.checked_in_at is not null or clock_timestamp()<visit.starts_at-interval '15 minutes' or clock_timestamp()>=visit.ends_at then
        raise exception 'Check-in opens 15 minutes before the session and closes at its scheduled end'; end if;
      update bookings set checked_in_at=clock_timestamp() where id=visit.id;
    elsif command->>'action'='out' then
      if visit.checked_in_at is null or visit.checked_out_at is not null or clock_timestamp()>=visit.ends_at+interval '24 hours' then
        raise exception 'Check-out requires an active check-in and closes 24 hours after the session'; end if;
      update bookings set checked_out_at=clock_timestamp() where id=visit.id;
    else raise exception 'Choose check-in or check-out'; end if;
    changed_id:=req.id;
    insert into notifications(profile_id,message) values(req.requester_id,'Lab visit check-'||(command->>'action')||' recorded for '||res.name);
  elsif action in ('setOperational','setMaintenance') then
    target:=coalesce((command->>'unitId')::uuid,(command->>'id')::uuid);
    if not exists(select 1 from equipment_units u join equipment e on e.id=u.equipment_id
      join laboratories l on l.id=e.laboratory_id where u.id=target
        and (person.role='super_admin' or (person.role='lab_admin' and person.department_id=l.department_id))) then
      raise exception 'Resource management scope denied' using errcode='42501'; end if;
    perform 1 from equipment_units where id=target for update;
    if action='setOperational' then
      if not (command->>'operational')::boolean and exists(select 1 from bookings where equipment_unit_id=target
        and ends_at>now() and cancelled_at is null) then raise exception 'This unit has upcoming confirmed reservations'; end if;
      update equipment_units set operational=(command->>'operational')::boolean where id=target;
    else
      starts:=(command->>'start')::timestamptz; ends:=(command->>'end')::timestamptz;
      if starts is null or ends is null or starts<=now() or ends<=starts then raise exception 'Choose a future maintenance window'; end if;
      if exists(select 1 from maintenance_blocks where equipment_unit_id=target and starts_at<ends and ends_at>starts) then
        raise exception 'Maintenance overlaps another scheduled block'; end if;
      insert into maintenance_blocks(equipment_unit_id,starts_at,ends_at) values(target,starts,ends);
    end if;
    changed_id:=target;
  elsif action='readNotices' then
    update notifications set read_at=now() where profile_id=person.id and read_at is null;
    return '{}'::jsonb;
  else raise exception 'Unknown command'; end if;
  insert into audit_logs(actor_id,action,subject_id) values(person.id,action||coalesce(':'||new_status,''),changed_id);
  return jsonb_build_object('id',changed_id,'status',new_status);
end $$;

revoke all on function campus_snapshot(), campus_mutate(jsonb) from public, anon, authenticated;
grant execute on function campus_snapshot(), campus_mutate(jsonb) to authenticated;
