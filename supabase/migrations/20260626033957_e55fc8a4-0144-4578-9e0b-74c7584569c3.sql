
-- Enum de papéis
CREATE TYPE public.app_role AS ENUM ('master', 'padrao');

-- =========================================================
-- PROFILES
-- =========================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  nome TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  ultimo_acesso TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- USER_ROLES
-- =========================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- has_role (security definer, evita recursão de RLS)
-- =========================================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- =========================================================
-- AUDIT_LOG
-- =========================================================
CREATE TABLE public.audit_log (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  event TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_created_at ON public.audit_log (created_at DESC);
CREATE INDEX idx_audit_log_event ON public.audit_log (event);
CREATE INDEX idx_audit_log_user_id ON public.audit_log (user_id);

GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT USAGE ON SEQUENCE public.audit_log_id_seq TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
GRANT ALL ON SEQUENCE public.audit_log_id_seq TO service_role;

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- POLICIES
-- =========================================================

-- profiles
CREATE POLICY "users read own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "users update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "master reads all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'master'));

CREATE POLICY "master updates all profiles"
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'master'));

CREATE POLICY "master deletes profiles"
  ON public.profiles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'master'));

-- user_roles
CREATE POLICY "users read own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "master reads all roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'master'));

-- audit_log
CREATE POLICY "users insert own audit events"
  ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "master reads all audit"
  ON public.audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'master'));

-- =========================================================
-- Trigger: ao criar usuário no auth, criar profile + role
-- Primeiro usuário => master; demais => padrao
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_existing INT;
  assigned_role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, email, nome)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1))
  );

  SELECT COUNT(*) INTO total_existing FROM public.user_roles;
  IF total_existing = 0 THEN
    assigned_role := 'master';
  ELSE
    assigned_role := 'padrao';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, assigned_role);

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- updated_at trigger para profiles
-- =========================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
