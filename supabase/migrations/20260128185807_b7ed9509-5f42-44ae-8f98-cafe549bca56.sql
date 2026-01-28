-- Create APFs table for real-time sync
CREATE TABLE public.apfs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    policial_id TEXT NOT NULL,
    policial_nome TEXT NOT NULL,
    policiais_qru TEXT,
    nome_individuo TEXT NOT NULL,
    rg_individuo TEXT NOT NULL,
    informacoes_qru TEXT NOT NULL,
    artigos TEXT[] NOT NULL,
    tempo_prisao INTEGER NOT NULL,
    itens JSONB NOT NULL DEFAULT '{}'::jsonb,
    url_comprovacao TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.apfs ENABLE ROW LEVEL SECURITY;

-- Approved users can view all APFs
CREATE POLICY "Approved users can view all APFs"
ON public.apfs FOR SELECT
USING (public.is_approved(auth.uid()));

-- Approved users can create APFs
CREATE POLICY "Approved users can create APFs"
ON public.apfs FOR INSERT
WITH CHECK (public.is_approved(auth.uid()) AND auth.uid() = user_id);

-- Admins can update APFs
CREATE POLICY "Admins can update APFs"
ON public.apfs FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can delete APFs
CREATE POLICY "Admins can delete APFs"
ON public.apfs FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Create updated_at trigger
CREATE TRIGGER update_apfs_updated_at
BEFORE UPDATE ON public.apfs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for APFs table
ALTER PUBLICATION supabase_realtime ADD TABLE public.apfs;

-- Create police_officers table for real-time sync
CREATE TABLE public.police_officers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    nome_completo TEXT NOT NULL,
    rg TEXT NOT NULL,
    data_ingresso TEXT NOT NULL,
    cargo TEXT NOT NULL DEFAULT 'Agente Probatório',
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.police_officers ENABLE ROW LEVEL SECURITY;

-- Approved users can view all approved police officers
CREATE POLICY "Approved users can view approved officers"
ON public.police_officers FOR SELECT
USING (public.is_approved(auth.uid()) AND status = 'approved');

-- Admins can view all officers
CREATE POLICY "Admins can view all officers"
ON public.police_officers FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Approved users can create police officers
CREATE POLICY "Approved users can create officers"
ON public.police_officers FOR INSERT
WITH CHECK (public.is_approved(auth.uid()) AND auth.uid() = user_id);

-- Admins can update officers
CREATE POLICY "Admins can update officers"
ON public.police_officers FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can delete officers
CREATE POLICY "Admins can delete officers"
ON public.police_officers FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Create updated_at trigger
CREATE TRIGGER update_police_officers_updated_at
BEFORE UPDATE ON public.police_officers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for police_officers table
ALTER PUBLICATION supabase_realtime ADD TABLE public.police_officers;