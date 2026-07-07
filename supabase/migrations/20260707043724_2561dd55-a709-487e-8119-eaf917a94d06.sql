
CREATE TABLE public.store_config (
  store_id TEXT NOT NULL PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_config TO authenticated;
GRANT ALL ON public.store_config TO service_role;

ALTER TABLE public.store_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated read store_config"
ON public.store_config FOR SELECT TO authenticated USING (true);

CREATE POLICY "master insert store_config"
ON public.store_config FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'master'::app_role));

CREATE POLICY "master update store_config"
ON public.store_config FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'master'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'master'::app_role));

CREATE POLICY "master delete store_config"
ON public.store_config FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'master'::app_role));

CREATE TRIGGER update_store_config_updated_at
BEFORE UPDATE ON public.store_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
