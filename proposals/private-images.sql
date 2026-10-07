-- LOCAL PROPOSAL ONLY. No bucket creation, upload, or execution performed.
-- Requires approved AMRIGS schema/RLS/helper already applied as reviewed.
-- Proposed bucket: capi-amrigs-private, PRIVATE; upload originals via Storage API.
-- Verify operation helpers and existing policies BEFORE execution.
-- No publication/promotion of the 477 drafts is included.
BEGIN;
DO $$ BEGIN
  IF to_regprocedure('public.capi_amrigs_authorized()') IS NULL
    OR to_regclass('public.capi_training_questions') IS NULL
    OR to_regprocedure('storage.allow_only_operation(text)') IS NULL THEN
    RAISE EXCEPTION 'Approved AMRIGS/Storage dependencies missing';
  END IF;
END $$;
CREATE TABLE public.capi_amrigs_image_manifest (
  object_name text PRIMARY KEY,
  legacy_path text UNIQUE NOT NULL CHECK (legacy_path ~ '^[0-9]{4}/[A-Za-z0-9_.-]+[.]png$'),
  sha256 text NOT NULL CHECK (sha256 ~ '^[a-f0-9]{64}$'),
  CHECK (object_name = '0b9a12ab60d721dc0fe2268ce17df025966c0101d23269f65a1129463fa5ec40/' || legacy_path)
);
ALTER TABLE public.capi_amrigs_image_manifest ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.capi_amrigs_image_manifest FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.capi_amrigs_image_manifest TO authenticated;
CREATE POLICY capi_image_manifest_eligible ON public.capi_amrigs_image_manifest
FOR SELECT TO authenticated USING ((SELECT auth.uid()) IS NOT NULL AND (SELECT public.capi_amrigs_authorized()));
INSERT INTO public.capi_amrigs_image_manifest (object_name, legacy_path, sha256) VALUES
('0b9a12ab60d721dc0fe2268ce17df025966c0101d23269f65a1129463fa5ec40/2019/q085_pg19.png', '2019/q085_pg19.png', '7392bccd83d4f1d51f58c1517266f2b7d6816359d06df3dfb565a607afac9ae0'),
('0b9a12ab60d721dc0fe2268ce17df025966c0101d23269f65a1129463fa5ec40/2020/q067_pg16.png', '2020/q067_pg16.png', '4159bfd9fa04e4410ba73f8ae169b11013771472462c932cd835f6efa790040f'),
('0b9a12ab60d721dc0fe2268ce17df025966c0101d23269f65a1129463fa5ec40/2021/q007_pg03.png', '2021/q007_pg03.png', '3c63ab5cc67eb82d786eef9af59d35514fff4413326cc46f3a7c644ba8ea1801'),
('0b9a12ab60d721dc0fe2268ce17df025966c0101d23269f65a1129463fa5ec40/2021/q048_pg11.png', '2021/q048_pg11.png', 'da32db329f8a598429c6627f57773a91682662e13d08aa5824f28ee6fb496540'),
('0b9a12ab60d721dc0fe2268ce17df025966c0101d23269f65a1129463fa5ec40/2021/q051_pg12.png', '2021/q051_pg12.png', 'baed058bbcf7473dcb9e98450390510127d2237ed6435b77abcf7b0ec2c08578'),
('0b9a12ab60d721dc0fe2268ce17df025966c0101d23269f65a1129463fa5ec40/2021/q058_pg16.png', '2021/q058_pg16.png', 'e177758151175f6305c3c0938e391f14f6d253518a3d9b9d09e2920abdc3ffe9'),
('0b9a12ab60d721dc0fe2268ce17df025966c0101d23269f65a1129463fa5ec40/2021/q069_pg19.png', '2021/q069_pg19.png', '275e2423988859f918683be3b40e1f5737eeecc357559a9657b597dae2ebd1ef'),
('0b9a12ab60d721dc0fe2268ce17df025966c0101d23269f65a1129463fa5ec40/2022/q004_pg03.png', '2022/q004_pg03.png', '123bbaabb3faead58b108a96607b476ea7db9a5647aad997a0aeb4a56651a95f'),
('0b9a12ab60d721dc0fe2268ce17df025966c0101d23269f65a1129463fa5ec40/2022/q008_pg04.png', '2022/q008_pg04.png', 'dc3616e84f88461af3039a8218e97347da34676cdcc25a1fe4026ec895ab9605'),
('0b9a12ab60d721dc0fe2268ce17df025966c0101d23269f65a1129463fa5ec40/2022/q070_pg17.png', '2022/q070_pg17.png', 'ddf56b9cc8f7db79392f283ccac526e27f714e970806b87b7f6d26513ddd47e1'),
('0b9a12ab60d721dc0fe2268ce17df025966c0101d23269f65a1129463fa5ec40/2022/q082_pg20.png', '2022/q082_pg20.png', 'ce6523b2383bf7b0ff671b6d6f884ddad012503a03cd4151df93b7298b66db0f'),
('0b9a12ab60d721dc0fe2268ce17df025966c0101d23269f65a1129463fa5ec40/2023/q005_pg03.png', '2023/q005_pg03.png', '6832c09b2228b709e6d4905d9d725780ccb945705e2814db480deaaa810f96fc'),
('0b9a12ab60d721dc0fe2268ce17df025966c0101d23269f65a1129463fa5ec40/2023/q010_pg05.png', '2023/q010_pg05.png', 'ae24940d0112b51b0503860fdb90c5b00d91eb4bf1eddd248dbdca2b74cfbceb'),
('0b9a12ab60d721dc0fe2268ce17df025966c0101d23269f65a1129463fa5ec40/2023/q048_pg12.png', '2023/q048_pg12.png', 'e2400025c76a52c1d2114e37b2834873781cb81264f88e0c6a362fdab740235f'),
('0b9a12ab60d721dc0fe2268ce17df025966c0101d23269f65a1129463fa5ec40/2023/q051_pg13.png', '2023/q051_pg13.png', 'b1f05a6b5e928832bb9d35e35fa162218e1498d7cdf18e6c097e3cd2473a53b4'),
('0b9a12ab60d721dc0fe2268ce17df025966c0101d23269f65a1129463fa5ec40/2023/q068_pg17.png', '2023/q068_pg17.png', '24bb21e74c8102bb621ccad39066ab6f8868112ecff0c696786f21678a80cd57'),
('0b9a12ab60d721dc0fe2268ce17df025966c0101d23269f65a1129463fa5ec40/2023/q094_pg24.png', '2023/q094_pg24.png', '3077e04d39057899067080ffb3a5f43b0bc5090e14ec146a766cf8ddab21a065'),
('0b9a12ab60d721dc0fe2268ce17df025966c0101d23269f65a1129463fa5ec40/2024/q013_pg05.png', '2024/q013_pg05.png', 'efa82697ddaf6a3d6efe63b81d18027341345b7ddf26e8122f05844aa959422b'),
('0b9a12ab60d721dc0fe2268ce17df025966c0101d23269f65a1129463fa5ec40/2024/q043_pg11.png', '2024/q043_pg11.png', '28beb37178275597441f0e666e678a84cdf4fdb651ada591da63aba9324edda4'),
('0b9a12ab60d721dc0fe2268ce17df025966c0101d23269f65a1129463fa5ec40/2024/q046_pg12.png', '2024/q046_pg12.png', 'f99bccf2cfec8bdfc79507a29c3a039f1040693c4ef8a6de40a4d9694cfb50fb'),
('0b9a12ab60d721dc0fe2268ce17df025966c0101d23269f65a1129463fa5ec40/2024/q048_pg13.png', '2024/q048_pg13.png', '9e271a424c77ca0647e749d98541bfe073adeaaba72e885c1f7e26fedc51a83e'),
('0b9a12ab60d721dc0fe2268ce17df025966c0101d23269f65a1129463fa5ec40/2024/q051_pg14.png', '2024/q051_pg14.png', '59042d51dae123b89928b4e4d5733e34fa6a2c280fcc786a33331ac005048f29'),
('0b9a12ab60d721dc0fe2268ce17df025966c0101d23269f65a1129463fa5ec40/2024/q055_pg15.png', '2024/q055_pg15.png', '127b67245a6db98c91dfea2bccbc00fa050eefff90da61eeb2a5e2c4a2202888'),
('0b9a12ab60d721dc0fe2268ce17df025966c0101d23269f65a1129463fa5ec40/2024/q058_pg16.png', '2024/q058_pg16.png', '77e7ffd04428b5cbb696cd3665c1425718b1b732641375c50a8cac2f1e177c33'),
('0b9a12ab60d721dc0fe2268ce17df025966c0101d23269f65a1129463fa5ec40/2024/q060_pagina17_integral.png', '2024/q060_pagina17_integral.png', 'f11df5928a70c59c6966c8103a0bcd5611c48ddfd64758b9b127c4ed0b4a8fa5'),
('0b9a12ab60d721dc0fe2268ce17df025966c0101d23269f65a1129463fa5ec40/2024/q073_pg20.png', '2024/q073_pg20.png', '13c1011b56bde999450df4dec94c00cc9f744fd4a3d2eab67b56e0b7e590cf0b'),
('0b9a12ab60d721dc0fe2268ce17df025966c0101d23269f65a1129463fa5ec40/2024/q076_pg21.png', '2024/q076_pg21.png', '23dab91082f4ceeb3f0a669f76a8d9a71c1914f45d14985a748c9033b1b3d6bb'),
('0b9a12ab60d721dc0fe2268ce17df025966c0101d23269f65a1129463fa5ec40/2025/q001_pg03.png', '2025/q001_pg03.png', '05f3346da780291a5451692c95f604159985bb8258fa9a21205bedfb5f1fe77e'),
('0b9a12ab60d721dc0fe2268ce17df025966c0101d23269f65a1129463fa5ec40/2025/q005_pg04.png', '2025/q005_pg04.png', '5d456c0a19814f8f8a659cf8af24fd6221a50d5e860fe52f4511c3bcc98637f7'),
('0b9a12ab60d721dc0fe2268ce17df025966c0101d23269f65a1129463fa5ec40/2025/q011_pg05.png', '2025/q011_pg05.png', '75a56339448a920764c1f2ae9befc092ccd2741894ba34b3fc5a7379e3d21a73'),
('0b9a12ab60d721dc0fe2268ce17df025966c0101d23269f65a1129463fa5ec40/2025/q099_pg27.png', '2025/q099_pg27.png', '76bebf8c6da35b8a78db98475601ab2ea22c4404ea08b37862655ea2cabd75f1');

-- Invoker lookup relies on approved question RLS, explicitly repeats release scope.
-- Restrictive guard prevents unrelated permissive policies from opening this bucket.
CREATE POLICY capi_images_private_guard ON storage.objects AS RESTRICTIVE
FOR ALL TO PUBLIC USING (
 bucket_id <> 'capi-amrigs-private' OR (
  (SELECT auth.uid()) IS NOT NULL AND
  storage.allow_only_operation('object.get_authenticated') AND
  (SELECT public.capi_amrigs_authorized()) AND EXISTS (
   SELECT 1 FROM public.capi_amrigs_image_manifest m
   JOIN public.capi_training_questions q ON q.context = 'AMRIGS'
   AND q.editorial_status = 'human_reviewed' AND q.student_visible
   WHERE m.object_name = storage.objects.name
   AND EXISTS (SELECT 1 FROM jsonb_array_elements(
     CASE WHEN jsonb_typeof(q.body->'images') = 'array' THEN q.body->'images' ELSE '[]'::jsonb END
   ) image WHERE image->>'url' = '/amrigs/' || m.legacy_path)
  )
 )) WITH CHECK (bucket_id <> 'capi-amrigs-private');
CREATE POLICY capi_images_authenticated_download ON storage.objects
FOR SELECT TO authenticated USING (bucket_id = 'capi-amrigs-private');
-- Restrictive policy blocks INSERT/UPDATE/DELETE and list/sign operations for clients.
-- Privileged upload uses existing trusted access; never grant browser writes.
COMMIT;
-- Rollback (future only): remove the two named Storage policies, then manifest table.
-- Leave shared policies, Auth, profiles/matriculas and original question data intact.
