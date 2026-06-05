
-- 1. Enum sector
DO $$ BEGIN
  CREATE TYPE public.sector AS ENUM ('gate','bpm19','rota','rocam','posto');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Add sector columns
ALTER TABLE public.profiles         ADD COLUMN IF NOT EXISTS sector public.sector NOT NULL DEFAULT 'bpm19';
ALTER TABLE public.police_officers  ADD COLUMN IF NOT EXISTS sector public.sector NOT NULL DEFAULT 'bpm19';
ALTER TABLE public.patrols          ADD COLUMN IF NOT EXISTS sector public.sector NOT NULL DEFAULT 'bpm19';
ALTER TABLE public.user_roles       ADD COLUMN IF NOT EXISTS sector public.sector;

-- 2b. Allow 'sector_admin' role
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_role_check
  CHECK (role IN ('admin','sector_admin','moderator','user'));

-- 3. Helper functions
CREATE OR REPLACE FUNCTION public.get_user_sector(_user_id uuid)
RETURNS public.sector LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT sector FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.can_admin_sector(_user_id uuid, _sector public.sector)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND (role = 'admin' OR (role = 'sector_admin' AND sector = _sector))
  )
$$;

CREATE OR REPLACE FUNCTION public.is_any_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin','sector_admin')
  )
$$;

-- 4. profiles RLS
DROP POLICY IF EXISTS "Approved users can view approved profiles" ON public.profiles;
DROP POLICY IF EXISTS "Approved users view sector profiles"      ON public.profiles;
DROP POLICY IF EXISTS "Sector admins view profiles in their sector"   ON public.profiles;
DROP POLICY IF EXISTS "Sector admins update profiles in their sector" ON public.profiles;
DROP POLICY IF EXISTS "Sector admins delete profiles in their sector" ON public.profiles;

CREATE POLICY "Approved users view sector profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    is_approved(auth.uid())
    AND status = 'approved'::user_status
    AND (sector = get_user_sector(auth.uid()) OR has_role(auth.uid(), 'admin'))
  );

CREATE POLICY "Sector admins view profiles in their sector"
  ON public.profiles FOR SELECT TO authenticated
  USING (can_admin_sector(auth.uid(), sector));

CREATE POLICY "Sector admins update profiles in their sector"
  ON public.profiles FOR UPDATE TO authenticated
  USING (can_admin_sector(auth.uid(), sector));

CREATE POLICY "Sector admins delete profiles in their sector"
  ON public.profiles FOR DELETE TO authenticated
  USING (can_admin_sector(auth.uid(), sector));

-- 5. police_officers RLS
DROP POLICY IF EXISTS "Approved users can view approved officers" ON public.police_officers;
DROP POLICY IF EXISTS "Admins can view all officers"              ON public.police_officers;
DROP POLICY IF EXISTS "Admins can update officers"                ON public.police_officers;
DROP POLICY IF EXISTS "Admins can delete officers"                ON public.police_officers;
DROP POLICY IF EXISTS "Approved users view officers in sector"    ON public.police_officers;
DROP POLICY IF EXISTS "Sector admins view all officers in sector" ON public.police_officers;
DROP POLICY IF EXISTS "Sector admins update officers in sector"   ON public.police_officers;
DROP POLICY IF EXISTS "Sector admins delete officers in sector"   ON public.police_officers;

CREATE POLICY "Approved users view officers in sector"
  ON public.police_officers FOR SELECT TO authenticated
  USING (
    is_approved(auth.uid())
    AND status = 'approved'
    AND (sector = get_user_sector(auth.uid()) OR has_role(auth.uid(), 'admin'))
  );

CREATE POLICY "Sector admins view all officers in sector"
  ON public.police_officers FOR SELECT TO authenticated
  USING (can_admin_sector(auth.uid(), sector));

CREATE POLICY "Sector admins update officers in sector"
  ON public.police_officers FOR UPDATE TO authenticated
  USING (can_admin_sector(auth.uid(), sector));

CREATE POLICY "Sector admins delete officers in sector"
  ON public.police_officers FOR DELETE TO authenticated
  USING (can_admin_sector(auth.uid(), sector));

-- 6. patrols RLS
DROP POLICY IF EXISTS "Approved users can view all patrols"     ON public.patrols;
DROP POLICY IF EXISTS "Admins can update patrols"               ON public.patrols;
DROP POLICY IF EXISTS "Admins can delete patrols"               ON public.patrols;
DROP POLICY IF EXISTS "Approved users view patrols in sector"   ON public.patrols;
DROP POLICY IF EXISTS "Sector admins update patrols in sector"  ON public.patrols;
DROP POLICY IF EXISTS "Sector admins delete patrols in sector"  ON public.patrols;

CREATE POLICY "Approved users view patrols in sector"
  ON public.patrols FOR SELECT TO authenticated
  USING (
    is_approved(auth.uid())
    AND (sector = get_user_sector(auth.uid()) OR can_admin_sector(auth.uid(), sector))
  );

CREATE POLICY "Sector admins update patrols in sector"
  ON public.patrols FOR UPDATE TO authenticated
  USING (can_admin_sector(auth.uid(), sector));

CREATE POLICY "Sector admins delete patrols in sector"
  ON public.patrols FOR DELETE TO authenticated
  USING (can_admin_sector(auth.uid(), sector));

-- 7. Unique (sector, unidade) for active patrols
DO $$ DECLARE r record;
BEGIN
  FOR r IN
    SELECT indexname FROM pg_indexes
    WHERE schemaname='public' AND tablename='patrols'
      AND indexdef ILIKE '%unidade%' AND indexdef ILIKE '%active%'
      AND indexname <> 'patrols_sector_unidade_active_unique'
  LOOP
    EXECUTE 'DROP INDEX IF EXISTS public.'||quote_ident(r.indexname);
  END LOOP;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS patrols_sector_unidade_active_unique
  ON public.patrols (sector, unidade) WHERE status = 'active';

-- 8. Seed sector admin users
DO $$
DECLARE
  v record;
  v_uid uuid;
  v_email text;
BEGIN
  FOR v IN SELECT * FROM (VALUES
    ('adminpm',    'AdminPM@2026',    'admin',         NULL::public.sector),
    ('admingate',  'AdminGate@2026',  'sector_admin',  'gate'::public.sector),
    ('admin19bpm', 'Admin19BPM@2026', 'sector_admin',  'bpm19'::public.sector),
    ('adminrota',  'AdminRota@2026',  'sector_admin',  'rota'::public.sector),
    ('adminrocam', 'AdminRocam@2026', 'sector_admin',  'rocam'::public.sector),
    ('adminposto', 'AdminPosto@2026', 'sector_admin',  'posto'::public.sector)
  ) AS t(username, password, role, sector)
  LOOP
    IF EXISTS (SELECT 1 FROM public.profiles WHERE username = v.username) THEN
      CONTINUE;
    END IF;

    v_uid := gen_random_uuid();
    v_email := v.username || '@dec.pcesp.local';

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change,
      email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_uid, 'authenticated', 'authenticated',
      v_email, crypt(v.password, gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
      now(), now(), '', '', '', ''
    );

    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      created_at, updated_at, last_sign_in_at
    ) VALUES (
      gen_random_uuid(), v_uid,
      jsonb_build_object('sub', v_uid::text, 'email', v_email, 'email_verified', true),
      'email', v_email, now(), now(), now()
    );

    INSERT INTO public.profiles (user_id, username, justification, status, sector)
    VALUES (v_uid, v.username, 'Admin auto-criado pelo sistema', 'approved',
            COALESCE(v.sector, 'bpm19'::public.sector));

    INSERT INTO public.user_roles (user_id, role, sector)
    VALUES (v_uid, v.role, v.sector);
  END LOOP;
END $$;
