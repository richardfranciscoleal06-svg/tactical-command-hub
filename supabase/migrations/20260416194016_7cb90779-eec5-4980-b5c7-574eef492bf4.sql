CREATE TABLE public.patrols (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  policiais TEXT[] NOT NULL DEFAULT '{}',
  unidade TEXT NOT NULL,
  assinatura TEXT NOT NULL,
  senha_viatura TEXT NOT NULL,
  inicio_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  fim_timestamp TIMESTAMP WITH TIME ZONE,
  horas_trabalhadas NUMERIC,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.patrols ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved users can view all patrols"
ON public.patrols FOR SELECT
USING (is_approved(auth.uid()));

CREATE POLICY "Approved users can create patrols"
ON public.patrols FOR INSERT
WITH CHECK (is_approved(auth.uid()) AND auth.uid() = user_id);

CREATE POLICY "Users can update their own patrols"
ON public.patrols FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can update patrols"
ON public.patrols FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete patrols"
ON public.patrols FOR DELETE
USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_patrols_updated_at
BEFORE UPDATE ON public.patrols
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.patrols;