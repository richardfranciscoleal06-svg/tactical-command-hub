
-- Add columns for items and illicit images
ALTER TABLE public.patrols
  ADD COLUMN IF NOT EXISTS itens jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS imagens_ilicitos text[] NOT NULL DEFAULT '{}'::text[];

-- Unique active patrol per unit
CREATE UNIQUE INDEX IF NOT EXISTS patrols_unique_active_unidade
  ON public.patrols (unidade)
  WHERE status = 'active';

-- Storage bucket for illicit images
INSERT INTO storage.buckets (id, name, public)
VALUES ('patrol-ilicitos', 'patrol-ilicitos', true)
ON CONFLICT (id) DO NOTHING;

-- Public read
DROP POLICY IF EXISTS "Public read patrol-ilicitos" ON storage.objects;
CREATE POLICY "Public read patrol-ilicitos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'patrol-ilicitos');

-- Authenticated upload
DROP POLICY IF EXISTS "Authenticated upload patrol-ilicitos" ON storage.objects;
CREATE POLICY "Authenticated upload patrol-ilicitos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'patrol-ilicitos');

-- Authenticated update own
DROP POLICY IF EXISTS "Authenticated update patrol-ilicitos" ON storage.objects;
CREATE POLICY "Authenticated update patrol-ilicitos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'patrol-ilicitos');
