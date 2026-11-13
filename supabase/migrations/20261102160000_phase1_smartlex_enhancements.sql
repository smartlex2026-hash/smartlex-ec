-- =============================================================================
-- SmartLex Ecuador — Fase 1: Mejoras Incrementales de Esquema, RLS y Catálogos
-- Fecha: 2026-11-02
-- Nota: Migración 100% aditiva y no destructiva. Conserva intactas las 40 tablas
-- existentes y agrega soporte para:
--   1. Interfaz tipo Outlook (Eje Vertical x Eje Horizontal + Cascada artículo a artículo)
--   2. Flujo de Aprobación Humana (Human-in-the-loop) para extracciones de n8n + Gemini
--   3. Enlace con normas mencionadas pendientes de carga (norm_discovery)
--   4. Perfil tributario del suscriptor (WhatsApp, 9no dígito RUC, Tipo de Contribuyente)
--   5. Sesiones de cobro y renovación automática con PlacetoPay vía WhatsApp
--   6. Precios actualizados (Free $0, Pro $4.99, Plus $9.99) y corrección de alertas RLS
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. CORRECCIÓN DE SEARCH_PATH EN FUNCIONES DE BÚSQUEDA (Seguridad Supabase)
-- -----------------------------------------------------------------------------
ALTER FUNCTION public.search_knowledge_text(text, integer)
  SET search_path = public, extensions;

ALTER FUNCTION public.match_knowledge_chunks(halfvec, double precision, integer)
  SET search_path = public, extensions;

ALTER FUNCTION public.search_knowledge_hybrid(text, halfvec, integer, double precision, double precision, integer)
  SET search_path = public, extensions;

-- -----------------------------------------------------------------------------
-- 2. FUNCIÓN DE CONTROL DE ACCESO POR PLAN Y FEATURE (user_has_feature)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.user_has_feature(p_feature_code text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    -- 1. Administradores y equipo revisor tienen acceso completo
    public.has_permission('norms.manage')
    OR public.has_permission('norms.approve')
    OR public.has_permission('system.manage')
    -- 2. El usuario tiene una suscripción activa o en prueba cuyo plan incluye el feature
    OR EXISTS (
      SELECT 1
      FROM public.subscriptions s
      JOIN public.plan_features pf ON pf.plan_id = s.plan_id
      JOIN public.features f ON f.id = pf.feature_id
      WHERE s.user_id = (SELECT auth.uid())
        AND s.status IN ('active', 'trialing')
        AND (s.current_period_end IS NULL OR s.current_period_end >= now())
        AND pf.is_enabled = true
        AND f.code = p_feature_code
    )
    -- 3. Si no tiene suscripción de pago activa, hereda los features del plan 'free'
    OR EXISTS (
      SELECT 1
      FROM public.plans p
      JOIN public.plan_features pf ON pf.plan_id = p.id
      JOIN public.features f ON f.id = pf.feature_id
      WHERE p.code = 'free'
        AND p.is_active = true
        AND pf.is_enabled = true
        AND f.code = p_feature_code
    );
$$;

-- -----------------------------------------------------------------------------
-- 3. MEJORAS EN TABLAS EXISTENTES (SIN BORRAR NI ALTERAR DATOS)
-- -----------------------------------------------------------------------------

-- 3.1 Perfil Tributario y WhatsApp en public.profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS whatsapp_phone text,
  ADD COLUMN IF NOT EXISTS ruc_number text,
  ADD COLUMN IF NOT EXISTS ruc_ninth_digit smallint,
  ADD COLUMN IF NOT EXISTS taxpayer_type_id uuid REFERENCES public.taxpayer_types(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS whatsapp_opt_in boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_opt_in_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_ruc_ninth_digit_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_ruc_ninth_digit_check
      CHECK (ruc_ninth_digit IS NULL OR (ruc_ninth_digit >= 0 AND ruc_ninth_digit <= 9));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS profiles_taxpayer_type_idx ON public.profiles(taxpayer_type_id);
CREATE INDEX IF NOT EXISTS profiles_ruc_ninth_digit_idx ON public.profiles(ruc_ninth_digit);

-- 3.2 Estado de Aprobación Humana (Human-in-the-loop) y Semáforo de Vigencia en public.normative_structures
ALTER TABLE public.normative_structures
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'pending_review',
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS extraction_run_id uuid REFERENCES public.extraction_runs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_current boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS legal_status text NOT NULL DEFAULT 'vigente';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'normative_structures_review_status_check'
  ) THEN
    ALTER TABLE public.normative_structures
      ADD CONSTRAINT normative_structures_review_status_check
      CHECK (review_status IN ('pending_review', 'approved', 'rejected'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'normative_structures_legal_status_check'
  ) THEN
    ALTER TABLE public.normative_structures
      ADD CONSTRAINT normative_structures_legal_status_check
      CHECK (legal_status IN ('vigente', 'vigente_reformado', 'derogado'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS normative_structures_review_status_idx ON public.normative_structures(review_status);
CREATE INDEX IF NOT EXISTS normative_structures_legal_status_idx ON public.normative_structures(legal_status);
CREATE INDEX IF NOT EXISTS normative_structures_extraction_run_idx ON public.normative_structures(extraction_run_id);
CREATE INDEX IF NOT EXISTS normative_structures_reviewed_by_idx ON public.normative_structures(reviewed_by);

-- 3.3 Estado de Aprobación Humana y Normas Pendientes en public.normative_changes
ALTER TABLE public.normative_changes
  ADD COLUMN IF NOT EXISTS target_discovery_id uuid REFERENCES public.norm_discovery(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'pending_review',
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS extraction_run_id uuid REFERENCES public.extraction_runs(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'normative_changes_review_status_check'
  ) THEN
    ALTER TABLE public.normative_changes
      ADD CONSTRAINT normative_changes_review_status_check
      CHECK (review_status IN ('pending_review', 'approved', 'rejected'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS normative_changes_target_discovery_idx ON public.normative_changes(target_discovery_id);
CREATE INDEX IF NOT EXISTS normative_changes_review_status_idx ON public.normative_changes(review_status);
CREATE INDEX IF NOT EXISTS normative_changes_extraction_run_idx ON public.normative_changes(extraction_run_id);
CREATE INDEX IF NOT EXISTS normative_changes_reviewed_by_idx ON public.normative_changes(reviewed_by);

-- 3.4 Estado de Aprobación Humana y Normas Pendientes en public.norm_relations
ALTER TABLE public.norm_relations
  ADD COLUMN IF NOT EXISTS target_discovery_id uuid REFERENCES public.norm_discovery(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'pending_review',
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS extraction_run_id uuid REFERENCES public.extraction_runs(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'norm_relations_review_status_check'
  ) THEN
    ALTER TABLE public.norm_relations
      ADD CONSTRAINT norm_relations_review_status_check
      CHECK (review_status IN ('pending_review', 'approved', 'rejected'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS norm_relations_target_discovery_idx ON public.norm_relations(target_discovery_id);
CREATE INDEX IF NOT EXISTS norm_relations_review_status_idx ON public.norm_relations(review_status);
CREATE INDEX IF NOT EXISTS norm_relations_extraction_run_idx ON public.norm_relations(extraction_run_id);

-- -----------------------------------------------------------------------------
-- 4. NUEVAS TABLAS PARA LA MATRIZ VERTICAL x HORIZONTAL Y PAGOS PLACETOPAY
-- -----------------------------------------------------------------------------

-- 4.1 Tabla: structure_relations (Cascada Artículo Ley -> Artículo Reglamento -> Circular)
CREATE TABLE IF NOT EXISTS public.structure_relations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_structure_id uuid NOT NULL REFERENCES public.normative_structures(id) ON DELETE CASCADE,
  target_structure_id uuid REFERENCES public.normative_structures(id) ON DELETE CASCADE,
  target_discovery_id uuid REFERENCES public.norm_discovery(id) ON DELETE SET NULL,
  relation_type text NOT NULL CHECK (
    relation_type IN (
      'regulates', 'regulated_by', 'amends', 'repeals', 'replaces',
      'complements', 'cites', 'clarifies', 'implements', 'concordance', 'other'
    )
  ),
  description text,
  evidence_span_id uuid REFERENCES public.evidence_spans(id) ON DELETE SET NULL,
  extraction_run_id uuid REFERENCES public.extraction_runs(id) ON DELETE SET NULL,
  confidence numeric CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  review_status text NOT NULL DEFAULT 'pending_review' CHECK (review_status IN ('pending_review', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT structure_relations_no_self CHECK (
    target_structure_id IS NULL OR source_structure_id <> target_structure_id
  ),
  CONSTRAINT structure_relations_target_present CHECK (
    target_structure_id IS NOT NULL OR target_discovery_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS structure_relations_source_idx ON public.structure_relations(source_structure_id);
CREATE INDEX IF NOT EXISTS structure_relations_target_idx ON public.structure_relations(target_structure_id);
CREATE INDEX IF NOT EXISTS structure_relations_discovery_idx ON public.structure_relations(target_discovery_id);
CREATE INDEX IF NOT EXISTS structure_relations_type_idx ON public.structure_relations(relation_type);
CREATE INDEX IF NOT EXISTS structure_relations_review_status_idx ON public.structure_relations(review_status);
CREATE INDEX IF NOT EXISTS structure_relations_evidence_idx ON public.structure_relations(evidence_span_id);
CREATE INDEX IF NOT EXISTS structure_relations_extraction_run_idx ON public.structure_relations(extraction_run_id);

ALTER TABLE public.structure_relations ENABLE ROW LEVEL SECURITY;

-- 4.2 Tabla: structure_tax_concepts (Eje Vertical: Artículo <-> Exoneración, Deducción, Tarifa, Base, Crédito)
CREATE TABLE IF NOT EXISTS public.structure_tax_concepts (
  structure_id uuid NOT NULL REFERENCES public.normative_structures(id) ON DELETE CASCADE,
  tax_concept_id uuid NOT NULL REFERENCES public.tax_concepts(id) ON DELETE CASCADE,
  relevance_role text NOT NULL DEFAULT 'primary' CHECK (
    relevance_role IN ('primary', 'secondary', 'exception', 'procedure')
  ),
  confidence numeric CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  review_status text NOT NULL DEFAULT 'pending_review' CHECK (review_status IN ('pending_review', 'approved', 'rejected')),
  extraction_run_id uuid REFERENCES public.extraction_runs(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (structure_id, tax_concept_id)
);

CREATE INDEX IF NOT EXISTS structure_tax_concepts_concept_idx ON public.structure_tax_concepts(tax_concept_id);
CREATE INDEX IF NOT EXISTS structure_tax_concepts_review_idx ON public.structure_tax_concepts(review_status);
CREATE INDEX IF NOT EXISTS structure_tax_concepts_run_idx ON public.structure_tax_concepts(extraction_run_id);

ALTER TABLE public.structure_tax_concepts ENABLE ROW LEVEL SECURITY;

-- 4.3 Tablas: structure_forms y structure_annexes (Eje Horizontal directo por artículo)
CREATE TABLE IF NOT EXISTS public.structure_forms (
  structure_id uuid NOT NULL REFERENCES public.normative_structures(id) ON DELETE CASCADE,
  form_id uuid NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  casillero_code text,
  notes text,
  review_status text NOT NULL DEFAULT 'pending_review' CHECK (review_status IN ('pending_review', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (structure_id, form_id)
);

CREATE INDEX IF NOT EXISTS structure_forms_form_idx ON public.structure_forms(form_id);
ALTER TABLE public.structure_forms ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.structure_annexes (
  structure_id uuid NOT NULL REFERENCES public.normative_structures(id) ON DELETE CASCADE,
  annex_id uuid NOT NULL REFERENCES public.annexes(id) ON DELETE CASCADE,
  notes text,
  review_status text NOT NULL DEFAULT 'pending_review' CHECK (review_status IN ('pending_review', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (structure_id, annex_id)
);

CREATE INDEX IF NOT EXISTS structure_annexes_annex_idx ON public.structure_annexes(annex_id);
ALTER TABLE public.structure_annexes ENABLE ROW LEVEL SECURITY;

-- 4.3b Tabla: structure_obligations (Eje Horizontal N:M entre Artículos y cualquier otra Obligación)
CREATE TABLE IF NOT EXISTS public.structure_obligations (
  structure_id uuid NOT NULL REFERENCES public.normative_structures(id) ON DELETE CASCADE,
  obligation_id uuid NOT NULL REFERENCES public.obligations(id) ON DELETE CASCADE,
  notes text,
  review_status text NOT NULL DEFAULT 'pending_review' CHECK (review_status IN ('pending_review', 'approved', 'rejected')),
  extraction_run_id uuid REFERENCES public.extraction_runs(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (structure_id, obligation_id)
);

CREATE INDEX IF NOT EXISTS structure_obligations_obligation_idx ON public.structure_obligations(obligation_id);
CREATE INDEX IF NOT EXISTS structure_obligations_review_idx ON public.structure_obligations(review_status);
ALTER TABLE public.structure_obligations ENABLE ROW LEVEL SECURITY;

-- 4.3c Tabla: normative_tables (Tablas contenidas en la normativa: ej. Art. 36 LRTI, RIMPE, ICE, Retenciones)
-- Permite:
--   1) Mostrar la tabla dentro del artículo seleccionado (ej. Art. 36 LRTI)
--   2) Clasificarla en el eje vertical de Tarifas (tax_concept_id)
--   3) Consultarla en el apartado exclusivo de "Tablas Tributarias" por año fiscal
--   4) Alimentar automáticamente las Calculadoras con sus filas y porcentajes (rows_data)
CREATE TABLE IF NOT EXISTS public.normative_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE,
  title text NOT NULL,
  description text,
  norm_id uuid REFERENCES public.norms(id) ON DELETE CASCADE,
  norm_version_id uuid REFERENCES public.norm_versions(id) ON DELETE CASCADE,
  structure_id uuid REFERENCES public.normative_structures(id) ON DELETE SET NULL,
  tax_concept_id uuid REFERENCES public.tax_concepts(id) ON DELETE SET NULL,
  taxpayer_type_id uuid REFERENCES public.taxpayer_types(id) ON DELETE SET NULL,
  table_category text NOT NULL DEFAULT 'rates' CHECK (
    table_category IN (
      'progressive_rates', 'withholding_rates', 'specific_rates', 'rimpe',
      'dividends', 'inheritance', 'ice', 'depreciation', 'deadlines', 'other'
    )
  ),
  fiscal_year int4,
  effective_during daterange NOT NULL DEFAULT daterange(CURRENT_DATE, NULL, '[)'),
  currency text NOT NULL DEFAULT 'USD',
  columns_schema jsonb NOT NULL DEFAULT '[]'::jsonb,
  rows_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  markdown_content text,
  notes text,
  evidence_span_id uuid REFERENCES public.evidence_spans(id) ON DELETE SET NULL,
  extraction_run_id uuid REFERENCES public.extraction_runs(id) ON DELETE SET NULL,
  review_status text NOT NULL DEFAULT 'pending_review' CHECK (review_status IN ('pending_review', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS normative_tables_norm_idx ON public.normative_tables(norm_id);
CREATE INDEX IF NOT EXISTS normative_tables_version_idx ON public.normative_tables(norm_version_id);
CREATE INDEX IF NOT EXISTS normative_tables_structure_idx ON public.normative_tables(structure_id);
CREATE INDEX IF NOT EXISTS normative_tables_concept_idx ON public.normative_tables(tax_concept_id);
CREATE INDEX IF NOT EXISTS normative_tables_taxpayer_idx ON public.normative_tables(taxpayer_type_id);
CREATE INDEX IF NOT EXISTS normative_tables_category_idx ON public.normative_tables(table_category);
CREATE INDEX IF NOT EXISTS normative_tables_fiscal_year_idx ON public.normative_tables(fiscal_year);
CREATE INDEX IF NOT EXISTS normative_tables_effective_during_idx ON public.normative_tables USING gist (effective_during);
CREATE INDEX IF NOT EXISTS normative_tables_review_status_idx ON public.normative_tables(review_status);

ALTER TABLE public.normative_tables ENABLE ROW LEVEL SECURITY;

-- 4.4 Tabla: payment_sessions (Sesiones WebCheckout de PlacetoPay enviadas por WhatsApp)
CREATE TABLE IF NOT EXISTS public.payment_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  plan_id uuid NOT NULL REFERENCES public.plans(id) ON DELETE RESTRICT,
  provider text NOT NULL DEFAULT 'placetopay' CHECK (provider IN ('placetopay', 'manual', 'other')),
  request_id text UNIQUE,
  reference_code text NOT NULL UNIQUE,
  process_url text,
  amount numeric NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired', 'cancelled')),
  whatsapp_sent_at timestamptz,
  expires_at timestamptz,
  paid_at timestamptz,
  raw_response jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payment_sessions_user_idx ON public.payment_sessions(user_id);
CREATE INDEX IF NOT EXISTS payment_sessions_subscription_idx ON public.payment_sessions(subscription_id);
CREATE INDEX IF NOT EXISTS payment_sessions_plan_idx ON public.payment_sessions(plan_id);
CREATE INDEX IF NOT EXISTS payment_sessions_status_idx ON public.payment_sessions(status);

ALTER TABLE public.payment_sessions ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 5. POLÍTICAS RLS (Incluyendo las 6 tablas detectadas por el Linter y las nuevas)
-- -----------------------------------------------------------------------------

-- 5.1 Políticas para las 6 tablas que tenían RLS activo sin políticas
DROP POLICY IF EXISTS "Authenticated users can view active roles" ON public.roles;
CREATE POLICY "Authenticated users can view active roles"
  ON public.roles FOR SELECT TO authenticated
  USING (is_active = true OR (SELECT public.has_permission('roles.read')));

DROP POLICY IF EXISTS "Admins can manage roles" ON public.roles;
CREATE POLICY "Admins can manage roles"
  ON public.roles FOR ALL TO authenticated
  USING ((SELECT public.has_permission('roles.manage')))
  WITH CHECK ((SELECT public.has_permission('roles.manage')));

DROP POLICY IF EXISTS "Authorized users can view permissions" ON public.permissions;
CREATE POLICY "Authorized users can view permissions"
  ON public.permissions FOR SELECT TO authenticated
  USING ((SELECT public.has_permission('roles.read')) OR (SELECT public.has_permission('roles.manage')));

DROP POLICY IF EXISTS "Authorized users can view role permissions" ON public.role_permissions;
CREATE POLICY "Authorized users can view role permissions"
  ON public.role_permissions FOR SELECT TO authenticated
  USING ((SELECT public.has_permission('roles.read')) OR (SELECT public.has_permission('roles.manage')));

DROP POLICY IF EXISTS "Users can view own roles or admins view all" ON public.user_roles;
CREATE POLICY "Users can view own roles or admins view all"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (SELECT public.has_permission('roles.read')));

DROP POLICY IF EXISTS "Reviewers can view and manage candidate concepts" ON public.candidate_concepts;
CREATE POLICY "Reviewers can view and manage candidate concepts"
  ON public.candidate_concepts FOR ALL TO authenticated
  USING ((SELECT public.has_permission('knowledge.read')) OR (SELECT public.has_permission('knowledge.approve')))
  WITH CHECK ((SELECT public.has_permission('knowledge.manage')) OR (SELECT public.has_permission('knowledge.approve')));

DROP POLICY IF EXISTS "Reviewers can view and manage norm discovery" ON public.norm_discovery;
CREATE POLICY "Reviewers can view and manage norm discovery"
  ON public.norm_discovery FOR ALL TO authenticated
  USING ((SELECT public.has_permission('norms.read')) OR (SELECT public.has_permission('norms.approve')))
  WITH CHECK ((SELECT public.has_permission('norms.manage')) OR (SELECT public.has_permission('norms.approve')));

-- 5.2 Políticas para las nuevas tablas
DROP POLICY IF EXISTS "Authenticated users can view structure relations" ON public.structure_relations;
CREATE POLICY "Authenticated users can view structure relations"
  ON public.structure_relations FOR SELECT TO authenticated
  USING (
    review_status = 'approved'
    OR (SELECT public.has_permission('norms.approve'))
    OR (SELECT public.has_permission('norms.manage'))
  );

DROP POLICY IF EXISTS "Reviewers can manage structure relations" ON public.structure_relations;
CREATE POLICY "Reviewers can manage structure relations"
  ON public.structure_relations FOR ALL TO authenticated
  USING ((SELECT public.has_permission('norms.manage')) OR (SELECT public.has_permission('norms.approve')))
  WITH CHECK ((SELECT public.has_permission('norms.manage')) OR (SELECT public.has_permission('norms.approve')));

DROP POLICY IF EXISTS "Authenticated users can view structure tax concepts" ON public.structure_tax_concepts;
CREATE POLICY "Authenticated users can view structure tax concepts"
  ON public.structure_tax_concepts FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Reviewers can manage structure tax concepts" ON public.structure_tax_concepts;
CREATE POLICY "Reviewers can manage structure tax concepts"
  ON public.structure_tax_concepts FOR ALL TO authenticated
  USING ((SELECT public.has_permission('knowledge.manage')) OR (SELECT public.has_permission('knowledge.approve')))
  WITH CHECK ((SELECT public.has_permission('knowledge.manage')) OR (SELECT public.has_permission('knowledge.approve')));

DROP POLICY IF EXISTS "Authenticated users can view structure forms" ON public.structure_forms;
CREATE POLICY "Authenticated users can view structure forms"
  ON public.structure_forms FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can view structure annexes" ON public.structure_annexes;
CREATE POLICY "Authenticated users can view structure annexes"
  ON public.structure_annexes FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can view structure obligations" ON public.structure_obligations;
CREATE POLICY "Authenticated users can view structure obligations"
  ON public.structure_obligations FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Reviewers can manage structure obligations" ON public.structure_obligations;
CREATE POLICY "Reviewers can manage structure obligations"
  ON public.structure_obligations FOR ALL TO authenticated
  USING ((SELECT public.has_permission('obligations.manage')) OR (SELECT public.has_permission('norms.approve')))
  WITH CHECK ((SELECT public.has_permission('obligations.manage')) OR (SELECT public.has_permission('norms.approve')));

DROP POLICY IF EXISTS "Authenticated users can view normative tables" ON public.normative_tables;
CREATE POLICY "Authenticated users can view normative tables"
  ON public.normative_tables FOR SELECT TO authenticated
  USING (
    review_status = 'approved'
    OR (SELECT public.has_permission('norms.approve'))
    OR (SELECT public.has_permission('norms.manage'))
  );

DROP POLICY IF EXISTS "Reviewers can manage normative tables" ON public.normative_tables;
CREATE POLICY "Reviewers can manage normative tables"
  ON public.normative_tables FOR ALL TO authenticated
  USING ((SELECT public.has_permission('norms.manage')) OR (SELECT public.has_permission('norms.approve')))
  WITH CHECK ((SELECT public.has_permission('norms.manage')) OR (SELECT public.has_permission('norms.approve')));

DROP POLICY IF EXISTS "Users can view own payment sessions" ON public.payment_sessions;
CREATE POLICY "Users can view own payment sessions"
  ON public.payment_sessions FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (SELECT public.has_permission('users.manage')));

-- -----------------------------------------------------------------------------
-- 6. CONFIGURACIÓN DE PLANES ($0 / $4.99 Pro / $9.99 Plus) Y CATÁLOGOS BASE
-- -----------------------------------------------------------------------------

-- 6.1 Actualizar precios y nombres comerciales de planes existentes
UPDATE public.plans
SET
  name = 'Plan Gratuito (Free)',
  description = 'Acceso a Código Tributario, LRTI y RLRTI vigentes actualizados.',
  price = 0.00,
  billing_period = 'monthly',
  updated_at = now()
WHERE code = 'free';

UPDATE public.plans
SET
  name = 'Plan Pro',
  description = 'Acceso completo a Leyes, Reglamentos, Resoluciones del SRI, Circulares y Columnas Históricas de Reformas.',
  price = 4.99,
  billing_period = 'monthly',
  updated_at = now()
WHERE code = 'premium';

UPDATE public.plans
SET
  name = 'Plan Plus (Con IA y Calculadoras)',
  description = 'Todo el Plan Pro + Chatbot Tributario IA, Calculadoras Tributarias, Formularios, Anexos y Alertas por WhatsApp.',
  price = 9.99,
  billing_period = 'monthly',
  updated_at = now()
WHERE code = 'professional';

-- Agregar variantes anuales atractivas (2 meses gratis: $49.99/año y $99.99/año)
INSERT INTO public.plans (code, name, description, price, currency, billing_period, is_active)
VALUES
  ('pro_yearly', 'Plan Pro Anual (Ahorra 2 meses)', 'Suscripción anual al Plan Pro con acceso a histórico de reformas y resoluciones del SRI.', 49.99, 'USD', 'yearly', true),
  ('plus_yearly', 'Plan Plus Anual (Ahorra 2 meses)', 'Suscripción anual al Plan Plus con Chatbot IA, Calculadoras, Anexos y Alertas.', 99.99, 'USD', 'yearly', true)
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  billing_period = EXCLUDED.billing_period,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Asignar cuota de 100 consultas/mes al Chatbot en el Plan Plus para proteger rentabilidad
UPDATE public.plan_features pf
SET usage_limit = 100
FROM public.features f
WHERE pf.feature_id = f.id
  AND f.code = 'chatbot';

-- Copiar features de 'premium' a 'pro_yearly' y de 'professional' a 'plus_yearly'
INSERT INTO public.plan_features (plan_id, feature_id, is_enabled, usage_limit)
SELECT py.id, pf.feature_id, pf.is_enabled, pf.usage_limit
FROM public.plan_features pf
JOIN public.plans pm ON pm.id = pf.plan_id AND pm.code = 'premium'
JOIN public.plans py ON py.code = 'pro_yearly'
ON CONFLICT DO NOTHING;

INSERT INTO public.plan_features (plan_id, feature_id, is_enabled, usage_limit)
SELECT py.id, pf.feature_id, pf.is_enabled, pf.usage_limit
FROM public.plan_features pf
JOIN public.plans pm ON pm.id = pf.plan_id AND pm.code = 'professional'
JOIN public.plans py ON py.code = 'plus_yearly'
ON CONFLICT DO NOTHING;

-- 6.2 Poblar el Eje Vertical en public.tax_concepts (Los 5 pilares + subtemas clave)
INSERT INTO public.tax_concepts (code, name, description, concept_type, is_active, metadata)
VALUES
  ('EXONERACIONES', 'Exoneraciones y Exenciones', 'Ingresos, operaciones o sujetos exonerados del pago de tributos (ej. Art. 9 LRTI).', 'exemption', true, '{"axis": "vertical", "order": 1, "icon": "ShieldCheck"}'::jsonb),
  ('DEDUCCIONES', 'Deducciones y Gastos Deducibles', 'Gastos, costos y rebajas aplicables para determinar la base imponible (ej. Art. 10 LRTI y Art. 28 RLRTI).', 'deduction', true, '{"axis": "vertical", "order": 2, "icon": "MinusCircle"}'::jsonb),
  ('BASE_IMPONIBLE', 'Base Imponible', 'Reglas de determinación de la base imponible general y casos especiales (ej. Art. 16 LRTI).', 'tax_base', true, '{"axis": "vertical", "order": 3, "icon": "Scale"}'::jsonb),
  ('TARIFAS', 'Tarifas, Tablas y Retenciones', 'Porcentajes, tablas progresivas, tarifas societarias, RIMPE y dividendos (ej. Art. 36 y 37 LRTI).', 'rate', true, '{"axis": "vertical", "order": 4, "icon": "Percent"}'::jsonb),
  ('CREDITO_TRIBUTARIO', 'Crédito Tributario', 'Crédito tributario por IVA, retenciones en la fuente e impuestos pagados en el exterior.', 'credit', true, '{"axis": "vertical", "order": 5, "icon": "CreditCard"}'::jsonb)
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  concept_type = EXCLUDED.concept_type,
  metadata = EXCLUDED.metadata,
  updated_at = now();

-- Subtemas frecuentes hijos de los 5 ejes verticales
INSERT INTO public.tax_concepts (parent_id, code, name, description, concept_type, is_active, metadata)
SELECT p.id, v.code, v.name, v.description, v.concept_type, true, v.metadata::jsonb
FROM (
  VALUES
    ('DEDUCCIONES', 'DED_RELACION_DEPENDENCIA', 'Relación de Dependencia y Gastos Personales', 'Deducciones, rebajas y aportes al IESS para trabajadores bajo relación de dependencia.', 'deduction', '{"order": 1}'),
    ('DEDUCCIONES', 'DED_DEPRECIACION_AMORTIZACION', 'Depreciaciones y Amortizaciones', 'Límites y porcentajes de depreciación de activos fijos y amortización de pérdidas/intangibles.', 'deduction', '{"order": 2}'),
    ('DEDUCCIONES', 'DED_PROVISIONES_CREDITOS', 'Provisiones y Créditos Incobrables', 'Cuentas incobrables, desahucio y jubilación patronal.', 'deduction', '{"order": 3}'),
    ('TARIFAS', 'TAR_DIVIDENDOS', 'Distribución de Dividendos', 'Reglas de ingreso gravado, franja exenta y porcentajes de retención sobre dividendos.', 'rate', '{"order": 1, "calculator": "dividends"}'),
    ('TARIFAS', 'TAR_PERSONAS_NATURALES', 'Tabla Progresiva Personas Naturales y Sucesiones', 'Tabla anual por tramos de fracción básica y exceso para Impuesto a la Renta.', 'rate', '{"order": 2, "calculator": "income_tax_natural"}'),
    ('TARIFAS', 'TAR_SOCIEDADES', 'Tarifa de Impuesto a la Renta Sociedades', 'Tarifa general societaria, reinversión de utilidades y recargos por paraísos fiscales.', 'rate', '{"order": 3, "calculator": "income_tax_corporate"}'),
    ('TARIFAS', 'TAR_RIMPE', 'Tabla y Tarifas RIMPE (Emprendedor y Negocio Popular)', 'Cuotas y tarifas marginales del Régimen Simplificado para Emprendedores y Negocios Populares.', 'rate', '{"order": 4, "calculator": "rimpe"}')
) AS v(parent_code, code, name, description, concept_type, metadata)
JOIN public.tax_concepts p ON p.code = v.parent_code
ON CONFLICT (code) DO UPDATE
SET
  parent_id = EXCLUDED.parent_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  metadata = EXCLUDED.metadata,
  updated_at = now();

-- 6.3 Poblar Tipos de Contribuyente del Ecuador en public.taxpayer_types
INSERT INTO public.taxpayer_types (code, name, description, is_active, metadata)
VALUES
  ('PN_GENERAL', 'Persona Natural - Régimen General', 'Personas naturales obligadas o no a llevar contabilidad en el Régimen General.', true, '{"order": 1}'::jsonb),
  ('PN_DEPENDENCIA', 'Persona Natural - Relación de Dependencia', 'Contribuyentes cuyos ingresos provienen del trabajo en relación de dependencia.', true, '{"order": 2}'::jsonb),
  ('RIMPE_EMPRENDEDOR', 'RIMPE - Emprendedor', 'Personas naturales y jurídicas sujetas al Régimen Simplificado para Emprendedores.', true, '{"order": 3}'::jsonb),
  ('RIMPE_POPULAR', 'RIMPE - Negocio Popular', 'Personas naturales sujetas al régimen de Negocio Popular.', true, '{"order": 4}'::jsonb),
  ('SOCIEDAD', 'Sociedades (Personas Jurídicas)', 'Compañías, sucursales extranjeras y demás sociedades privadas o mixtas.', true, '{"order": 5}'::jsonb),
  ('CONTRIBUYENTE_ESPECIAL', 'Contribuyente Especial', 'Sujetos pasivos calificados como Contribuyentes Especiales por el SRI.', true, '{"order": 6}'::jsonb),
  ('GRAN_CONTRIBUYENTE', 'Gran Contribuyente', 'Sujetos pasivos calificados como Grandes Contribuyentes por el SRI.', true, '{"order": 7}'::jsonb)
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  metadata = EXCLUDED.metadata,
  updated_at = now();

-- 6.4 Registrar los 3 Cuerpos Normativos Base en public.norms (vinculados a sus features de acceso)
INSERT INTO public.norms (code, name, short_name, normative_type, issuing_entity, publication_date, access_feature_id, repository_status, metadata)
SELECT
  v.code,
  v.name,
  v.short_name,
  v.normative_type,
  v.issuing_entity,
  v.publication_date::date,
  f.id,
  v.repository_status,
  v.metadata::jsonb
FROM (
  VALUES
    ('CT', 'Código Tributario', 'Código Tributario', 'organic_law', 'Congreso Nacional / Asamblea Nacional', '2005-06-14', 'norms_laws', 'referenced_not_loaded', '{"hierarchy_level": 1, "folder_order": 1}'),
    ('LRTI', 'Ley de Régimen Tributario Interno', 'LRTI', 'organic_law', 'Congreso Nacional / Asamblea Nacional', '2004-11-17', 'norms_laws', 'partially_loaded', '{"hierarchy_level": 2, "folder_order": 2}'),
    ('RLRTI', 'Reglamento para la Aplicación de la Ley de Régimen Tributario Interno', 'RLRTI', 'regulation', 'Presidencia de la República', '2010-06-08', 'norms_regulations', 'referenced_not_loaded', '{"hierarchy_level": 3, "folder_order": 3}')
) AS v(code, name, short_name, normative_type, issuing_entity, publication_date, feature_code, repository_status, metadata)
JOIN public.features f ON f.code = v.feature_code
WHERE NOT EXISTS (
  SELECT 1 FROM public.norms n WHERE n.code = v.code
);

-- 6.5 Registrar Formularios y Anexos principales del Eje Horizontal
INSERT INTO public.forms (code, name, description, access_feature_id, is_active, metadata)
SELECT v.code, v.name, v.description, f.id, true, v.metadata::jsonb
FROM (
  VALUES
    ('F-101', 'Formulario 101 - Impuesto a la Renta Sociedades', 'Declaración del Impuesto a la Renta y presentación de estados financieros para sociedades.', '{"periodicity": "annual"}'),
    ('F-102', 'Formulario 102 - Impuesto a la Renta Personas Naturales', 'Declaración del Impuesto a la Renta para personas naturales y sucesiones indivisas.', '{"periodicity": "annual"}'),
    ('F-103', 'Formulario 103 - Retenciones en la Fuente de Impuesto a la Renta', 'Declaración mensual de retenciones en la fuente del Impuesto a la Renta.', '{"periodicity": "monthly"}'),
    ('F-104', 'Formulario 104 - Impuesto al Valor Agregado (IVA)', 'Declaración mensual o semestral del Impuesto al Valor Agregado.', '{"periodicity": "monthly"}'),
    ('F-107', 'Formulario 107 - Comprobante de Retención Relación de Dependencia', 'Liquidación anual de Impuesto a la Renta bajo relación de dependencia.', '{"periodicity": "annual"}')
) AS v(code, name, description, metadata)
JOIN public.features f ON f.code = 'forms'
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.annexes (code, name, description, access_feature_id, is_active, metadata)
SELECT v.code, v.name, v.description, f.id, true, v.metadata::jsonb
FROM (
  VALUES
    ('ATS', 'Anexo Transaccional Simplificado (ATS)', 'Reporte mensual detallado de compras, ventas, exportaciones y retenciones.', '{"periodicity": "monthly"}'),
    ('RDEP', 'Anexo de Retenciones en la Fuente Bajo Relación de Dependencia (RDEP)', 'Reporte anual de remuneraciones, deducciones y retenciones de empleados.', '{"periodicity": "annual"}'),
    ('AGP', 'Anexo de Gastos Personales (AGP)', 'Detalle anual de gastos personales para aplicación de la rebaja del Impuesto a la Renta.', '{"periodicity": "annual"}'),
    ('ADI', 'Anexo de Dividendos (ADI)', 'Información anual sobre distribución de dividendos y utilidades.', '{"periodicity": "annual"}'),
    ('APS', 'Anexo de Accionistas, Partícipes, Socios, Miembros de Directorio y Administradores (APS)', 'Reporte de composición societaria y beneficiarios finales.', '{"periodicity": "annual"}')
) AS v(code, name, description, metadata)
JOIN public.features f ON f.code = 'annexes'
ON CONFLICT (code) DO NOTHING;

-- 6.6 Permisos Data API (PostgREST) sobre las nuevas tablas y funciones
INSERT INTO public.features (code, name, description)
VALUES ('normative_tables', 'Tablas Tributarias', 'Apartado exclusivo de tablas normativas, tramos progresivos y tarifas por año fiscal.')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.plan_features (plan_id, feature_id, is_enabled, usage_limit)
SELECT p.id, f.id, true, NULL
FROM public.plans p
CROSS JOIN public.features f
WHERE f.code = 'normative_tables'
  AND p.code IN ('free', 'premium', 'professional', 'pro_yearly', 'plus_yearly')
ON CONFLICT DO NOTHING;

GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.structure_relations,
  public.structure_tax_concepts,
  public.structure_forms,
  public.structure_annexes,
  public.structure_obligations,
  public.normative_tables,
  public.payment_sessions
TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.user_has_feature(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_has_feature(text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.has_permission(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_permission(text) TO authenticated, service_role;

COMMIT;
