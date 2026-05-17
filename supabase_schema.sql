-- 아직 실행 안 한 것만 골라서 실행
alter table rsvps add column if not exists phone text;
alter table events add column if not exists description text;

-- 생일 초대 등: 배경 이미지, 참가비/송금 안내, 시간 안내
alter table events add column if not exists background_image_url text;
alter table events add column if not exists payment_toss_url text;
alter table events add column if not exists payment_details text;
alter table events add column if not exists punctuality_note text;

-- 동반 인원·이름 (RSVP)
alter table rsvps add column if not exists plus_one_count int default 0;
alter table rsvps add column if not exists companion_names text;
