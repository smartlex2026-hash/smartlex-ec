-- =============================================================================
-- SmartLex Ecuador — Fase 4: Vigencia tributaria (Art. 11 Código Tributario)
-- y edición manual de vigencias reservada al administrador del sistema.
-- =============================================================================
-- Nota: usa el sistema de roles existente (public.roles + public.user_roles)
-- sin guardar contraseñas ni tokens en código.

BEGIN;

-- 1. Asignar el rol 'admin' al administrador del sistema (por parámetro de sesión, sin correos fijos en código)
-- Uso ejemplo en sesión SQL: SET LOCAL app.admin_email = 'tu-correo-admin@dominio';
INSERT INTO public.user_roles (user_id, role_id)
SELECT u.id, r.id
FROM auth.users u
JOIN public.roles r ON r.code = 'admin' AND r.is_active = true
WHERE u.email = NULLIF(current_setting('app.admin_email', true), '')
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur WHERE ur.user_id = u.id AND ur.role_id = r.id
  );

-- 2. Función auxiliar para verificar si el usuario autenticado es administrador
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND r.code = 'admin'
      AND r.is_active = true
  );
$$;

REVOKE ALL ON FUNCTION public.is_current_user_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO authenticated;

-- 3. Cálculo de fecha de vigencia tributaria (Opción 1: fecha calendario, Art. 11 CT)
--    - Impuestos anuales: 1 de enero del año siguiente al R.O.
--    - Impuestos mensuales / otros: día 1 del mes siguiente al R.O.
--    - Fe de Erratas: conserva la vigencia original (no desplaza la fecha)
CREATE OR REPLACE FUNCTION public.calculate_tax_effective_date(
  p_ro_date date,
  p_tax_periodicity text DEFAULT 'annual',
  p_is_fe_erratas boolean DEFAULT false,
  p_prev_valid_from date DEFAULT NULL
)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
BEGIN
  IF p_ro_date IS NULL THEN
    RETURN CURRENT_DATE;
  END IF;

  IF COALESCE(p_is_fe_erratas, false) THEN
    RETURN COALESCE(p_prev_valid_from, p_ro_date);
  END IF;

  IF lower(COALESCE(p_tax_periodicity, 'annual')) IN ('annual', 'anual', 'renta') THEN
    RETURN make_date(EXTRACT(YEAR FROM p_ro_date)::int + 1, 1, 1);
  ELSE
    RETURN (date_trunc('month', p_ro_date) + INTERVAL '1 month')::date;
  END IF;
END;
$$;

-- 4. RPC de edición manual de vigencias: reservado exclusivamente a administradores
CREATE OR REPLACE FUNCTION public.admin_update_structure_validity(
  p_structure_id uuid,
  p_valid_from date DEFAULT NULL,
  p_valid_until date DEFAULT NULL,
  p_clear_valid_until boolean DEFAULT false,
  p_validity_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_existing record;
  v_eff_from date;
  v_eff_until date;
  v_updated record;
BEGIN
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Solo el administrador del sistema puede modificar vigencias' USING ERRCODE = '42501';
  END IF;

  SELECT id, valid_from, valid_until INTO v_existing
  FROM public.normative_structures
  WHERE id = p_structure_id;

  IF v_existing.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Estructura no encontrada');
  END IF;

  v_eff_from := COALESCE(p_valid_from, v_existing.valid_from);
  v_eff_until := CASE WHEN p_clear_valid_until THEN NULL ELSE COALESCE(p_valid_until, v_existing.valid_until) END;

  IF v_eff_from IS NOT NULL AND v_eff_until IS NOT NULL AND v_eff_until < v_eff_from THEN
    RAISE EXCEPTION 'La fecha "hasta" no puede ser anterior a la fecha "desde"';
  END IF;

  UPDATE public.normative_structures
  SET
    valid_from = v_eff_from,
    valid_until = v_eff_until,
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'manual_validity_override', true,
      'admin_validity_updated_at', now(),
      'admin_validity_updated_by', auth.uid(),
      'validity_override_note', COALESCE(p_validity_note, metadata->>'validity_override_note')
    ),
    updated_at = now()
  WHERE id = p_structure_id
  RETURNING id, identifier, valid_from, valid_until INTO v_updated;

  RETURN jsonb_build_object(
    'ok', true,
    'structure_id', v_updated.id,
    'identifier', v_updated.identifier,
    'valid_from', v_updated.valid_from,
    'valid_until', v_updated.valid_until
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_structure_validity(uuid, date, date, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_structure_validity(uuid, date, date, boolean, text) TO authenticated;

-- 5. Alinear rangos fiscales en normative_tables (sin fechas de publicación R.O.)
UPDATE public.normative_tables
SET effective_during = '[2004-01-01,2005-01-01)'::daterange, updated_at = now()
WHERE code = 'TBL_IR_PN_2004';

UPDATE public.normative_tables
SET effective_during = '[2005-01-01,2006-01-01)'::daterange, updated_at = now()
WHERE code = 'TBL_IR_PN_2005';

UPDATE public.normative_tables
SET effective_during = '[2006-01-01,2007-01-01)'::daterange, updated_at = now()
WHERE code = 'TBL_IR_PN_2006';

-- 6. Futuras reformas del Registro Oficial calculan automáticamente Art. 11 CT y tratan Fe de Erratas
CREATE OR REPLACE FUNCTION public.apply_official_registry_reform(
  p_target_norm_code text,
  p_target_article_identifier text,
  p_new_title text,
  p_new_content text,
  p_effective_date date,
  p_valid_until date DEFAULT NULL::date,
  p_change_type text DEFAULT 'modified'::text,
  p_reform_source_cite text DEFAULT NULL::text,
  p_official_registry_cite text DEFAULT NULL::text,
  p_summary_change text DEFAULT NULL::text,
  p_modifying_structure_id uuid DEFAULT NULL::uuid,
  p_source_document_id uuid DEFAULT NULL::uuid,
  p_legal_status text DEFAULT 'vigente_reformado'::text,
  p_normative_tables jsonb DEFAULT NULL::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_target_norm_id uuid;
  v_prev_struct record;
  v_new_version_id uuid;
  v_next_ver_num int4;
  v_new_struct_id uuid;
  v_concept_rec record;
  v_tarifas_concept_id uuid;
  v_tbl jsonb;
  v_is_fe_erratas boolean;
  v_art_num int4;
  v_tax_periodicity text;
  v_calc_effective_date date;
BEGIN
  SELECT id INTO v_target_norm_id
  FROM public.norms
  WHERE code = p_target_norm_code
  LIMIT 1;

  IF v_target_norm_id IS NULL THEN
    RAISE EXCEPTION 'Target norm % not found', p_target_norm_code;
  END IF;

  SELECT ns.*, nv.version_number
  INTO v_prev_struct
  FROM public.normative_structures ns
  JOIN public.norm_versions nv ON nv.id = ns.norm_version_id
  WHERE nv.norm_id = v_target_norm_id
    AND ns.structure_type IN ('article', 'transitory', 'final')
    AND ns.identifier = p_target_article_identifier
    AND ns.is_current = true
  ORDER BY nv.version_number DESC, ns.created_at DESC
  LIMIT 1;

  v_is_fe_erratas := (
    lower(
      COALESCE(p_reform_source_cite, '') || ' ' ||
      COALESCE(p_official_registry_cite, '') || ' ' ||
      COALESCE(p_summary_change, '')
    ) LIKE '%errata%'
  );

  v_art_num := NULLIF(regexp_replace(p_target_article_identifier, '\D', '', 'g'), '')::int4;
  v_tax_periodicity := COALESCE(
    v_prev_struct.metadata->>'tax_periodicity',
    CASE
      WHEN p_target_norm_code = 'LRTI' AND v_art_num IS NOT NULL AND v_art_num BETWEEN 1 AND 51 THEN 'annual'
      ELSE 'monthly'
    END
  );

  v_calc_effective_date := public.calculate_tax_effective_date(
    p_effective_date,
    v_tax_periodicity,
    v_is_fe_erratas,
    v_prev_struct.valid_from
  );

  SELECT id INTO v_new_version_id
  FROM public.norm_versions
  WHERE norm_id = v_target_norm_id
    AND published_on = p_effective_date
    AND title = COALESCE(p_reform_source_cite, 'Reforma ' || p_effective_date::text)
  LIMIT 1;

  IF v_new_version_id IS NULL THEN
    SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_next_ver_num
    FROM public.norm_versions
    WHERE norm_id = v_target_norm_id;

    INSERT INTO public.norm_versions (
      norm_id,
      version_number,
      title,
      source_document_id,
      published_on,
      effective_during,
      is_consolidated,
      status,
      metadata
    )
    VALUES (
      v_target_norm_id,
      v_next_ver_num,
      COALESCE(p_reform_source_cite, 'Reforma ' || p_effective_date::text),
      p_source_document_id,
      p_effective_date,
      daterange(v_calc_effective_date, p_valid_until, '[)'),
      true,
      'active',
      jsonb_build_object(
        'reform_source_cite', p_reform_source_cite,
        'official_registry', p_official_registry_cite,
        'summary_change', p_summary_change,
        'ro_published_on', p_effective_date,
        'tax_periodicity', v_tax_periodicity,
        'is_fe_erratas', v_is_fe_erratas
      )
    )
    RETURNING id INTO v_new_version_id;
  END IF;

  IF v_prev_struct.id IS NOT NULL THEN
    UPDATE public.normative_structures
    SET
      is_current = false,
      valid_until = CASE
        WHEN v_is_fe_erratas THEN COALESCE(valid_until, (p_effective_date - INTERVAL '1 day')::date)
        ELSE COALESCE(
          valid_until,
          CASE
            WHEN valid_from IS NOT NULL AND v_calc_effective_date > valid_from
            THEN (v_calc_effective_date - INTERVAL '1 day')::date
            ELSE valid_from
          END
        )
      END,
      metadata = CASE
        WHEN v_is_fe_erratas THEN COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
          'is_fe_erratas_replaced', true,
          'fe_erratas_ro_date', p_effective_date,
          'validity_display_label', 'Texto erróneo corregido por Fe de Erratas (' || COALESCE(p_official_registry_cite, p_reform_source_cite, p_effective_date::text) || ') — no debió estar vigente'
        )
        ELSE metadata
      END,
      updated_at = now()
    WHERE id = v_prev_struct.id;
  END IF;

  INSERT INTO public.normative_structures (
    norm_version_id,
    parent_id,
    structure_type,
    identifier,
    title,
    content,
    ordinal,
    review_status,
    is_current,
    legal_status,
    valid_from,
    valid_until,
    metadata
  )
  VALUES (
    v_new_version_id,
    v_prev_struct.parent_id,
    COALESCE(v_prev_struct.structure_type, 'article'),
    p_target_article_identifier,
    COALESCE(p_new_title, v_prev_struct.title, 'Art. ' || p_target_article_identifier),
    p_new_content,
    COALESCE(v_prev_struct.ordinal, v_art_num, 1),
    'approved',
    true,
    p_legal_status,
    v_calc_effective_date,
    p_valid_until,
    COALESCE(v_prev_struct.metadata, '{}'::jsonb) - 'is_fe_erratas_replaced' - 'fe_erratas_ro_date' - 'validity_display_label' || jsonb_build_object(
      'reform_source_cite', p_reform_source_cite,
      'official_registry', p_official_registry_cite,
      'summary_change', p_summary_change,
      'ro_published_on', p_effective_date,
      'tax_periodicity', v_tax_periodicity,
      'art11_applied', NOT v_is_fe_erratas,
      'is_fe_erratas', v_is_fe_erratas,
      'version_year', EXTRACT(YEAR FROM v_calc_effective_date)::int4,
      'previous_structure_id', v_prev_struct.id,
      'has_normative_table', CASE
        WHEN p_normative_tables IS NOT NULL AND jsonb_typeof(p_normative_tables) = 'array' AND jsonb_array_length(p_normative_tables) > 0 THEN true
        ELSE COALESCE((v_prev_struct.metadata->>'has_normative_table')::boolean, false)
      END
    )
  )
  RETURNING id INTO v_new_struct_id;

  IF v_prev_struct.id IS NOT NULL THEN
    FOR v_concept_rec IN
      SELECT tax_concept_id, relevance_role
      FROM public.structure_tax_concepts
      WHERE structure_id = v_prev_struct.id
    LOOP
      INSERT INTO public.structure_tax_concepts (
        structure_id, tax_concept_id, relevance_role, review_status
      )
      VALUES (
        v_new_struct_id, v_concept_rec.tax_concept_id, v_concept_rec.relevance_role, 'approved'
      )
      ON CONFLICT (structure_id, tax_concept_id) DO NOTHING;
    END LOOP;
  END IF;

  IF p_normative_tables IS NOT NULL AND jsonb_typeof(p_normative_tables) = 'array' THEN
    SELECT id INTO v_tarifas_concept_id
    FROM public.tax_concepts
    WHERE code = 'TARIFAS'
    LIMIT 1;

    FOR v_tbl IN SELECT * FROM jsonb_array_elements(p_normative_tables)
    LOOP
      INSERT INTO public.normative_tables (
        code,
        title,
        description,
        norm_id,
        norm_version_id,
        structure_id,
        tax_concept_id,
        table_category,
        fiscal_year,
        effective_during,
        columns_schema,
        rows_data,
        markdown_content,
        review_status
      )
      VALUES (
        COALESCE(v_tbl->>'code', 'TBL_' || p_target_norm_code || '_' || p_target_article_identifier || '_' || EXTRACT(YEAR FROM v_calc_effective_date)::text),
        COALESCE(v_tbl->>'titulo_tabla', 'Tabla Art. ' || p_target_article_identifier),
        COALESCE(v_tbl->>'descripcion', 'Extraída del Art. ' || p_target_article_identifier || ' (' || p_target_norm_code || ')'),
        v_target_norm_id,
        v_new_version_id,
        v_new_struct_id,
        v_tarifas_concept_id,
        CASE
          WHEN COALESCE(v_tbl->>'categoria_tabla', 'other') IN ('progressive_rates','withholding_rates','specific_rates','rimpe','dividends','inheritance','ice','depreciation','deadlines','other')
          THEN COALESCE(v_tbl->>'categoria_tabla', 'other')
          ELSE 'progressive_rates'
        END,
        COALESCE((v_tbl->>'fiscal_year')::int4, EXTRACT(YEAR FROM v_calc_effective_date)::int4),
        daterange(
          COALESCE((v_tbl->>'valid_from')::date, v_calc_effective_date),
          (v_tbl->>'valid_until')::date,
          '[)'
        ),
        COALESCE(v_tbl->'columns_schema', '[]'::jsonb),
        COALESCE(v_tbl->'rows_data', '[]'::jsonb),
        v_tbl->>'markdown_tabla',
        'approved'
      )
      ON CONFLICT (code) DO UPDATE
      SET
        structure_id = EXCLUDED.structure_id,
        norm_version_id = EXCLUDED.norm_version_id,
        effective_during = EXCLUDED.effective_during,
        rows_data = EXCLUDED.rows_data,
        columns_schema = EXCLUDED.columns_schema,
        markdown_content = EXCLUDED.markdown_content,
        review_status = 'approved',
        updated_at = now();
    END LOOP;
  END IF;

  INSERT INTO public.normative_changes (
    norm_id,
    original_version_id,
    modifying_version_id,
    original_structure_id,
    resulting_structure_id,
    change_type,
    effective_date,
    previous_value,
    new_value,
    description,
    review_status,
    metadata
  )
  VALUES (
    v_target_norm_id,
    v_prev_struct.norm_version_id,
    v_new_version_id,
    v_prev_struct.id,
    v_new_struct_id,
    CASE
      WHEN p_change_type IN ('created','modified','repealed','replaced','added','removed','renumbered','clarified','other')
      THEN p_change_type
      ELSE 'modified'
    END,
    v_calc_effective_date,
    v_prev_struct.content,
    p_new_content,
    COALESCE(p_summary_change, p_reform_source_cite),
    'approved',
    jsonb_build_object(
      'reform_source_cite', p_reform_source_cite,
      'official_registry', p_official_registry_cite,
      'ro_published_on', p_effective_date,
      'art11_applied', NOT v_is_fe_erratas
    )
  );

  IF p_modifying_structure_id IS NOT NULL AND p_modifying_structure_id <> v_new_struct_id THEN
    INSERT INTO public.structure_relations (
      source_structure_id,
      target_structure_id,
      relation_type,
      description,
      review_status,
      metadata
    )
    VALUES (
      v_new_struct_id,
      p_modifying_structure_id,
      CASE
        WHEN p_change_type = 'repealed' THEN 'repeals'
        WHEN p_change_type = 'clarified' THEN 'clarifies'
        ELSE 'regulated_by'
      END,
      COALESCE(p_summary_change, p_reform_source_cite),
      'approved',
      jsonb_build_object(
        'official_registry', p_official_registry_cite,
        'ro_published_on', p_effective_date,
        'effective_date', v_calc_effective_date
      )
    );
  END IF;

  RETURN v_new_struct_id;
END;
$function$;

COMMIT;

NOTIFY pgrst, 'reload schema';
