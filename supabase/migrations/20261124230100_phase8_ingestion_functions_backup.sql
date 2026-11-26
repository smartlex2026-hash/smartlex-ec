-- Respaldo de funciones de ingesta y reforma en Supabase (Phase 8)
-- Generado directamente desde pg_get_functiondef() en el esquema public

-- apply_official_registry_reform(p_target_norm_code text, p_target_article_identifier text, p_new_title text, p_new_content text, p_effective_date date, p_valid_until date, p_change_type text, p_reform_source_cite text, p_official_registry_cite text, p_summary_change text, p_modifying_structure_id uuid, p_source_document_id uuid, p_legal_status text)
CREATE OR REPLACE FUNCTION public.apply_official_registry_reform(p_target_norm_code text, p_target_article_identifier text, p_new_title text, p_new_content text, p_effective_date date, p_valid_until date DEFAULT NULL::date, p_change_type text DEFAULT 'modified'::text, p_reform_source_cite text DEFAULT NULL::text, p_official_registry_cite text DEFAULT NULL::text, p_summary_change text DEFAULT NULL::text, p_modifying_structure_id uuid DEFAULT NULL::uuid, p_source_document_id uuid DEFAULT NULL::uuid, p_legal_status text DEFAULT 'vigente_reformado'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  RETURN public.apply_official_registry_reform(
    p_target_norm_code,
    p_target_article_identifier,
    p_new_title,
    p_new_content,
    p_effective_date,
    p_valid_until,
    p_change_type,
    p_reform_source_cite,
    p_official_registry_cite,
    p_summary_change,
    p_modifying_structure_id,
    p_source_document_id,
    p_legal_status,
    NULL::jsonb
  );
END;
$function$;

-- apply_official_registry_reform(p_target_norm_code text, p_target_identifier text, p_new_content text, p_effective_date date, p_official_registry text, p_reform_source_cite text, p_summary_change text, p_change_type text, p_legal_status text, p_source_structure_id uuid, p_relation_type text, p_new_title text, p_normative_tables jsonb)
CREATE OR REPLACE FUNCTION public.apply_official_registry_reform(p_target_norm_code text, p_target_identifier text, p_new_content text, p_effective_date date, p_official_registry text DEFAULT NULL::text, p_reform_source_cite text DEFAULT NULL::text, p_summary_change text DEFAULT NULL::text, p_change_type text DEFAULT 'modified'::text, p_legal_status text DEFAULT 'vigente_reformado'::text, p_source_structure_id uuid DEFAULT NULL::uuid, p_relation_type text DEFAULT 'reforms'::text, p_new_title text DEFAULT NULL::text, p_normative_tables jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_norm_id uuid;
  v_prev_struct record;
  v_new_version_id uuid;
  v_new_version_num text;
  v_new_struct_id uuid;
  v_change_id uuid;
  v_tbl jsonb;
BEGIN
  SELECT id INTO v_norm_id
  FROM public.norms
  WHERE code = p_target_norm_code
  LIMIT 1;

  IF v_norm_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', format('No se encontró la norma objetivo con código %s', p_target_norm_code)
    );
  END IF;

  SELECT ns.*
  INTO v_prev_struct
  FROM public.normative_structures ns
  JOIN public.norm_versions nv ON nv.id = ns.norm_version_id
  WHERE nv.norm_id = v_norm_id
    AND ns.identifier = p_target_identifier
    AND ns.is_current = true
  ORDER BY ns.valid_from DESC NULLS LAST, ns.created_at DESC
  LIMIT 1;

  IF v_prev_struct.id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', format('No se encontró el artículo vigente %s en la norma %s', p_target_identifier, p_target_norm_code)
    );
  END IF;

  v_new_version_num := 'RO-' || to_char(p_effective_date, 'YYYYMMDD') || '-ART-' || regexp_replace(p_target_identifier, '[^A-Za-z0-9_-]', '', 'g');

  SELECT id INTO v_new_version_id
  FROM public.norm_versions
  WHERE norm_id = v_norm_id
    AND version_number = v_new_version_num
  LIMIT 1;

  IF v_new_version_id IS NULL THEN
    INSERT INTO public.norm_versions (
      norm_id,
      version_number,
      status,
      valid_from,
      valid_until,
      change_summary,
      extraction_confidence
    ) VALUES (
      v_norm_id,
      v_new_version_num,
      'active',
      p_effective_date,
      NULL,
      COALESCE(p_summary_change, format('Reforma al Art. %s (%s)', p_target_identifier, COALESCE(p_reform_source_cite, p_official_registry, 'Registro Oficial'))),
      1.0
    )
    RETURNING id INTO v_new_version_id;
  END IF;

  UPDATE public.normative_structures
  SET
    is_current = false,
    valid_until = CASE
      WHEN valid_from IS NOT NULL AND p_effective_date > valid_from THEN (p_effective_date - INTERVAL '1 day')::date
      ELSE p_effective_date
    END
  WHERE id = v_prev_struct.id;

  INSERT INTO public.normative_structures (
    norm_version_id,
    parent_id,
    structure_type,
    identifier,
    title,
    content,
    ordinal,
    path,
    is_current,
    valid_from,
    valid_until,
    legal_status,
    reform_source_cite,
    official_registry,
    summary_change,
    has_normative_table,
    review_status,
    extraction_confidence,
    metadata
  ) VALUES (
    v_new_version_id,
    v_prev_struct.parent_id,
    v_prev_struct.structure_type,
    v_prev_struct.identifier,
    COALESCE(p_new_title, v_prev_struct.title),
    p_new_content,
    v_prev_struct.ordinal,
    v_prev_struct.path,
    true,
    p_effective_date,
    NULL,
    COALESCE(p_legal_status, 'vigente_reformado'),
    p_reform_source_cite,
    p_official_registry,
    p_summary_change,
    CASE
      WHEN p_normative_tables IS NOT NULL AND jsonb_typeof(p_normative_tables) = 'array' AND jsonb_array_length(p_normative_tables) > 0 THEN true
      ELSE COALESCE(v_prev_struct.has_normative_table, false)
    END,
    'approved',
    1.0,
    COALESCE(v_prev_struct.metadata, '{}'::jsonb) || jsonb_build_object(
      'previous_structure_id', v_prev_struct.id,
      'reform_effective_date', p_effective_date,
      'reform_source_cite', p_reform_source_cite,
      'official_registry', p_official_registry
    )
  )
  RETURNING id INTO v_new_struct_id;

  INSERT INTO public.structure_tax_concepts (structure_id, tax_concept_id, relevance_score, review_status)
  SELECT v_new_struct_id, tax_concept_id, relevance_score, 'approved'
  FROM public.structure_tax_concepts
  WHERE structure_id = v_prev_struct.id
  ON CONFLICT (structure_id, tax_concept_id) DO NOTHING;

  INSERT INTO public.structure_forms (structure_id, form_id, casillero_code, notes, review_status)
  SELECT v_new_struct_id, form_id, casillero_code, notes, 'approved'
  FROM public.structure_forms
  WHERE structure_id = v_prev_struct.id
  ON CONFLICT DO NOTHING;

  INSERT INTO public.structure_annexes (structure_id, annex_id, notes, review_status)
  SELECT v_new_struct_id, annex_id, notes, 'approved'
  FROM public.structure_annexes
  WHERE structure_id = v_prev_struct.id
  ON CONFLICT DO NOTHING;

  IF p_normative_tables IS NOT NULL AND jsonb_typeof(p_normative_tables) = 'array' THEN
    FOR v_tbl IN SELECT * FROM jsonb_array_elements(p_normative_tables)
    LOOP
      INSERT INTO public.normative_tables (
        norm_id,
        structure_id,
        code,
        title,
        description,
        table_Category,
        fiscal_year,
        valid_from,
        valid_until,
        columns_schema,
        rows_data,
        is_active,
        review_status
      ) VALUES (
        v_norm_id,
        v_new_struct_id,
        COALESCE(v_tbl->>'code', 'TBL_' || p_target_norm_code || '_' || p_target_identifier || '_' || to_char(p_effective_date, 'YYYYMMDD')),
        COALESCE(v_tbl->>'titulo_tabla', v_tbl->>'title', 'Tabla Normativa Art. ' || p_target_identifier),
        COALESCE(v_tbl->>'descripcion', v_tbl->>'description'),
        COALESCE(v_tbl->>'categoria_tabla', v_tbl->>'table_Category', 'progressive_rates'),
        COALESCE((v_tbl->>'fiscal_year')::int, EXTRACT(YEAR FROM p_effective_date)::int),
        COALESCE((v_tbl->>'valid_from')::date, p_effective_date),
        NULLIF(v_tbl->>'valid_until', '')::date,
        COALESCE(v_tbl->'columns_schema', '[]'::jsonb),
        COALESCE(v_tbl->'rows_data', v_tbl->'filas', '[]'::jsonb),
        true,
        'approved'
      )
      ON CONFLICT (code) DO UPDATE SET
        structure_id = EXCLUDED.structure_id,
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        fiscal_year = EXCLUDED.fiscal_year,
        valid_from = EXCLUDED.valid_from,
        valid_until = EXCLUDED.valid_until,
        columns_schema = EXCLUDED.columns_schema,
        rows_data = EXCLUDED.rows_data,
        is_active = true,
        review_status = 'approved';
    END LOOP;
  END IF;

  INSERT INTO public.normative_changes (
    norm_id,
    from_version_id,
    to_version_id,
    previous_structure_id,
    new_structure_id,
    change_type,
    diff_summary,
    diff_payload
  ) VALUES (
    v_norm_id,
    v_prev_struct.norm_version_id,
    v_new_version_id,
    v_prev_struct.id,
    v_new_struct_id,
    COALESCE(p_change_type, 'modified'),
    COALESCE(p_summary_change, format('Reforma al Art. %s mediante %s', p_target_identifier, COALESCE(p_reform_source_cite, p_official_registry, 'Registro Oficial'))),
    jsonb_build_object(
      'identifier', p_target_identifier,
      'previous_valid_from', v_prev_struct.valid_from,
      'new_valid_from', p_effective_date,
      'official_registry', p_official_registry,
      'reform_source_cite', p_reform_source_cite,
      'previous_content', v_prev_struct.content,
      'new_content', p_new_content
    )
  )
  RETURNING id INTO v_change_id;

  IF p_source_structure_id IS NOT NULL THEN
    INSERT INTO public.structure_relations (
      source_structure_id,
      target_structure_id,
      relation_type,
      review_status,
      confidence_score,
      notes
    ) VALUES (
      p_source_structure_id,
      v_new_struct_id,
      COALESCE(p_relation_type, 'reforms'),
      'approved',
      1.0,
      COALESCE(p_summary_change, format('Reformado por %s (%s)', COALESCE(p_reform_source_cite, ''), COALESCE(p_official_registry, '')))
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'target_norm_code', p_target_norm_code,
    'identifier', p_target_identifier,
    'previous_structure_id', v_prev_struct.id,
    'new_structure_id', v_new_struct_id,
    'new_version_id', v_new_version_id,
    'change_id', v_change_id
  );
END;
$function$;

-- apply_official_registry_reform(p_target_norm_code text, p_target_article_identifier text, p_new_title text, p_new_content text, p_effective_date date, p_valid_until date, p_change_type text, p_reform_source_cite text, p_official_registry_cite text, p_summary_change text, p_modifying_structure_id uuid, p_source_document_id uuid, p_legal_status text, p_normative_tables jsonb)
CREATE OR REPLACE FUNCTION public.apply_official_registry_reform(p_target_norm_code text, p_target_article_identifier text, p_new_title text, p_new_content text, p_effective_date date, p_valid_until date DEFAULT NULL::date, p_change_type text DEFAULT 'modified'::text, p_reform_source_cite text DEFAULT NULL::text, p_official_registry_cite text DEFAULT NULL::text, p_summary_change text DEFAULT NULL::text, p_modifying_structure_id uuid DEFAULT NULL::uuid, p_source_document_id uuid DEFAULT NULL::uuid, p_legal_status text DEFAULT 'vigente_reformado'::text, p_normative_tables jsonb DEFAULT NULL::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  RETURN public.apply_official_registry_reform(
    p_target_norm_code,
    p_target_article_identifier,
    p_new_title,
    p_new_content,
    p_effective_date,
    p_valid_until,
    p_change_type,
    p_reform_source_cite,
    p_official_registry_cite,
    p_summary_change,
    p_modifying_structure_id,
    p_source_document_id,
    p_legal_status,
    p_normative_tables,
    NULL::jsonb
  );
END;
$function$;

-- apply_official_registry_reform(p_target_norm_code text, p_target_article_identifier text, p_new_title text, p_new_content text, p_effective_date date, p_valid_until date, p_change_type text, p_reform_source_cite text, p_official_registry_cite text, p_summary_change text, p_modifying_structure_id uuid, p_source_document_id uuid, p_legal_status text, p_normative_tables jsonb, p_operations jsonb)
CREATE OR REPLACE FUNCTION public.apply_official_registry_reform(p_target_norm_code text, p_target_article_identifier text, p_new_title text DEFAULT NULL::text, p_new_content text DEFAULT NULL::text, p_effective_date date DEFAULT CURRENT_DATE, p_valid_until date DEFAULT NULL::date, p_change_type text DEFAULT 'modified'::text, p_reform_source_cite text DEFAULT NULL::text, p_official_registry_cite text DEFAULT NULL::text, p_summary_change text DEFAULT NULL::text, p_modifying_structure_id uuid DEFAULT NULL::uuid, p_source_document_id uuid DEFAULT NULL::uuid, p_legal_status text DEFAULT 'vigente_reformado'::text, p_normative_tables jsonb DEFAULT NULL::jsonb, p_operations jsonb DEFAULT NULL::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_target_norm_id uuid;
  v_target_norm_code text;
  v_clean_target_id text;
  v_is_general_disp boolean := false;
  v_art_num int4;
  v_is_fe_erratas boolean;
  v_is_constitutional_ruling boolean;
  v_tax_periodicity text;
  v_calc_effective_date date;
  v_effective_legal_status text;
  v_is_innumerado boolean;
  v_after_article text;
  v_innumerado_order int4;

  v_new_version_id uuid;
  v_next_ver_num int4;
  v_existing_same_ro_id uuid;
  v_prev_struct record;
  v_base_parent_id uuid := NULL;
  v_base_parent_title text := NULL;
  v_base_parent_chapter text := NULL;
  v_base_ordinal int4 := NULL;
  v_inferred_parent_id uuid;
  v_inferred_parent_title text;
  v_inferred_parent_chapter text;
  v_target_struct_id uuid;
  v_is_updating_existing boolean := false;

  v_subs jsonb := '[]'::jsonb;
  v_new_subs jsonb;
  v_sub_item jsonb;
  v_existing_sub_id uuid;
  v_kept_sub_ids uuid[] := ARRAY[]::uuid[];
  v_op jsonb;
  v_op_type text;
  v_op_sub_kind text;
  v_op_sub_code text;
  v_op_sub_id text;
  v_op_content text;
  v_op_tables jsonb;
  v_op_patches jsonb;
  v_op_mod_id uuid;
  v_op_summary text;
  v_matched_sub boolean;
  v_patch_res jsonb;
  v_tbl jsonb;
  v_tbl_val jsonb;
  v_tbl_md text;
  v_tbl_caption text;
  v_tbl_code text;
  v_tbl_cat text;
  v_tbl_valid_from date;
  v_tbl_valid_until date;
  v_tbl_sub_id text;
  v_tbl_target_struct_id uuid;
  v_tbl_meta jsonb;
  v_em_norm_id text;
  v_em_norm_code text;
  v_em_norm_title text;
  v_em_struct_id text;
  v_tables_to_save jsonb := '[]'::jsonb;
  v_mod_ids uuid[] := ARRAY[]::uuid[];
  v_summaries text[] := ARRAY[]::text[];
  v_changed_subs text[] := ARRAY[]::text[];
  v_warnings text[] := ARRAY[]::text[];
  v_table_diff_mode text := 'cell_diff';
  v_final_content text;
  v_final_review_status text := 'approved';
  v_final_is_current boolean;
  v_tarifas_concept_id uuid;
  v_concept_rec record;
  v_max_ord int4;
  v_after_sub_code text;
  v_insert_ord int4;
  v_change_id uuid;
  v_mod_id uuid;
BEGIN
  SELECT id, code INTO v_target_norm_id, v_target_norm_code
  FROM public.norms
  WHERE upper(code) = CASE
    WHEN upper(btrim(p_target_norm_code)) = 'RLRTI' THEN 'RALRTI'
    ELSE upper(btrim(p_target_norm_code))
  END
  LIMIT 1;

  IF v_target_norm_id IS NULL THEN
    RAISE EXCEPTION 'Target norm % not found', p_target_norm_code;
  END IF;

  v_clean_target_id := btrim(COALESCE(p_target_article_identifier, ''));
  IF v_clean_target_id ~* '^disposici[oó]n\s+general\s+(primera|segunda|tercera|cuarta|quinta|sexta|s[eé]ptima|octava|novena|d[eé]cima|\d+)\b' THEN
    v_clean_target_id := 'DG-' || CASE lower((regexp_match(v_clean_target_id, '^disposici[oó]n\s+general\s+(primera|segunda|tercera|cuarta|quinta|sexta|s[eé]ptima|octava|novena|d[eé]cima|\d+)', 'i'))[1])
      WHEN 'primera' THEN '1'
      WHEN 'segunda' THEN '2'
      WHEN 'tercera' THEN '3'
      WHEN 'cuarta' THEN '4'
      WHEN 'quinta' THEN '5'
      WHEN 'sexta' THEN '6'
      WHEN 'séptima' THEN '7'
      WHEN 'septima' THEN '7'
      WHEN 'octava' THEN '8'
      WHEN 'novena' THEN '9'
      WHEN 'décima' THEN '10'
      WHEN 'decima' THEN '10'
      ELSE (regexp_match(v_clean_target_id, '(\d+)'))[1]
    END;
  END IF;

  IF v_clean_target_id = '' OR v_clean_target_id ~* '^(varios|varias|disposici[oó]n\y)' OR v_clean_target_id LIKE '%,%' THEN
    RETURN NULL;
  END IF;

  v_clean_target_id := regexp_replace(v_clean_target_id, '^(?:art(?:[íi]culo|\.)?\s*)+', '', 'i');
  v_clean_target_id := regexp_replace(v_clean_target_id, '(?:\.[a-zA-Z]+|\s+(?:literal|inciso|numeral|ordinal|p[aá]rrafo)\y.*)$', '', 'i');
  v_clean_target_id := btrim(v_clean_target_id, ' :.-');

  IF v_clean_target_id = '' THEN
    RETURN NULL;
  END IF;

  v_is_general_disp := (v_clean_target_id ~* '^DG-\d+$');

  IF (p_operations IS NULL OR jsonb_typeof(p_operations) <> 'array' OR jsonb_array_length(p_operations) = 0)
     AND length(btrim(COALESCE(p_new_content, ''))) < 140
     AND btrim(COALESCE(p_new_content, '')) ~* '^(texto\s+consolidado\s+(resultante\s+)?del\s+art[íi]culo|el\s+texto\s+consolidado\s+de\s+este\s+art[íi]culo\s+no\s+est[áa]\s+disponible)' THEN
    RETURN NULL;
  END IF;

  v_is_fe_erratas := (
    lower(
      COALESCE(p_reform_source_cite, '') || ' ' ||
      COALESCE(p_official_registry_cite, '') || ' ' ||
      COALESCE(p_summary_change, '')
    ) LIKE '%errata%'
  );

  v_is_constitutional_ruling := (
    lower(
      COALESCE(p_reform_source_cite, '') || ' ' ||
      COALESCE(p_official_registry_cite, '') || ' ' ||
      COALESCE(p_summary_change, '')
    ) ~ '(sentencia|corte constitucional|edici[oó]n constitucional|\yroec\y|inconstitucionalidad)'
  );

  IF NOT v_is_general_disp THEN
    v_art_num := NULLIF((regexp_match(v_clean_target_id, '^\D*(\d{1,6})'))[1], '')::int4;
  ELSE
    v_art_num := NULL;
  END IF;

  v_is_innumerado := (
    COALESCE(p_new_title, '') ~* '(\(\.\.\.\)|\yinnumerad[oa]\y)'
    OR COALESCE(p_new_content, '') ~* '^\s*Art(?:[íi]culo|\.)?\s*\(\.\.\.\)'
  );
  IF v_is_innumerado AND v_art_num IS NOT NULL THEN
    v_after_article := v_art_num::text;
    v_innumerado_order := COALESCE(
      NULLIF((regexp_match(v_clean_target_id, '^\d+\.(\d+)$'))[1], '')::int4,
      1
    );
  END IF;

  v_tax_periodicity := CASE
    WHEN v_target_norm_code = 'LRTI' AND v_art_num IS NOT NULL AND v_art_num BETWEEN 1 AND 51 THEN 'annual'
    WHEN lower(COALESCE(p_summary_change, '') || ' ' || COALESCE(p_reform_source_cite, '') || ' ' || COALESCE(p_new_title, '')) ~ '(impuesto a la renta|ejercicio econ[oó]mico|tabla.*renta|gastos personales)' THEN 'annual'
    ELSE 'monthly'
  END;

  IF v_is_constitutional_ruling AND NOT v_is_fe_erratas THEN
    v_calc_effective_date := COALESCE(p_effective_date, CURRENT_DATE);
  ELSE
    v_calc_effective_date := public.calculate_tax_effective_date(
      p_effective_date,
      v_tax_periodicity,
      v_is_fe_erratas,
      p_effective_date
    );
  END IF;

  IF p_source_document_id IS NOT NULL THEN
    SELECT id INTO v_new_version_id
    FROM public.norm_versions
    WHERE norm_id = v_target_norm_id
      AND source_document_id = p_source_document_id
    ORDER BY version_number DESC
    LIMIT 1;
  END IF;

  IF v_new_version_id IS NULL THEN
    SELECT id INTO v_new_version_id
    FROM public.norm_versions
    WHERE norm_id = v_target_norm_id
      AND published_on = p_effective_date
      AND lower(btrim(title)) = lower(btrim(COALESCE(NULLIF(p_reform_source_cite, ''), 'Reforma ' || p_effective_date::text)))
    ORDER BY version_number DESC
    LIMIT 1;
  END IF;

  IF v_new_version_id IS NULL THEN
    SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_next_ver_num
    FROM public.norm_versions
    WHERE norm_id = v_target_norm_id;

    INSERT INTO public.norm_versions (
      norm_id, version_number, title, source_document_id, published_on,
      effective_during, is_consolidated, status, metadata
    )
    VALUES (
      v_target_norm_id,
      v_next_ver_num,
      COALESCE(NULLIF(p_reform_source_cite, ''), 'Reforma ' || p_effective_date::text),
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
        'is_fe_erratas', v_is_fe_erratas,
        'is_constitutional_ruling', v_is_constitutional_ruling,
        'art11_applied', (NOT v_is_fe_erratas AND NOT v_is_constitutional_ruling)
      )
    )
    RETURNING id INTO v_new_version_id;
  END IF;

  SELECT id INTO v_existing_same_ro_id
  FROM public.normative_structures
  WHERE norm_version_id = v_new_version_id
    AND structure_type IN ('article', 'transitory', 'final', 'reform', 'other')
    AND lower(btrim(identifier)) = lower(v_clean_target_id)
    AND NOT COALESCE((metadata->>'superseded_duplicate')::boolean, false)
  ORDER BY created_at DESC
  LIMIT 1;

  SELECT ns.*, nv.version_number
  INTO v_prev_struct
  FROM public.normative_structures ns
  JOIN public.norm_versions nv ON nv.id = ns.norm_version_id
  WHERE nv.norm_id = v_target_norm_id
    AND ns.norm_version_id <> v_new_version_id
    AND ns.structure_type IN ('article', 'transitory', 'final', 'reform', 'other')
    AND lower(btrim(ns.identifier)) = lower(v_clean_target_id)
    AND COALESCE(ns.valid_from, nv.published_on, '0001-01-01'::date) <= v_calc_effective_date
    AND NOT COALESCE((ns.metadata->>'is_fe_erratas_replaced')::boolean, false)
    AND NOT COALESCE((ns.metadata->>'superseded_duplicate')::boolean, false)
  ORDER BY
    COALESCE(ns.valid_from, nv.published_on, '0001-01-01'::date) DESC,
    COALESCE(NULLIF(ns.metadata->>'ro_published_on', '')::date, nv.published_on, '0001-01-01'::date) DESC,
    nv.version_number DESC,
    ns.created_at DESC
  LIMIT 1;

  IF v_prev_struct.id IS NOT NULL AND v_is_fe_erratas THEN
    v_calc_effective_date := public.calculate_tax_effective_date(
      p_effective_date,
      v_tax_periodicity,
      true,
      v_prev_struct.valid_from
    );
  END IF;

  IF v_prev_struct.id IS NULL AND v_art_num IS NOT NULL THEN
    SELECT
      ns.parent_id,
      NULLIF(ns.metadata->>'parent_title', ''),
      NULLIF(ns.metadata->>'parent_chapter', ''),
      ns.ordinal + COALESCE(v_innumerado_order, 1)
    INTO v_base_parent_id, v_base_parent_title, v_base_parent_chapter, v_base_ordinal
    FROM public.normative_structures ns
    JOIN public.norm_versions nv ON nv.id = ns.norm_version_id
    WHERE nv.norm_id = v_target_norm_id
      AND ns.structure_type = 'article'
      AND lower(btrim(ns.identifier)) = lower(v_art_num::text)
    ORDER BY (ns.metadata->>'parent_chapter' IS NOT NULL) DESC, ns.is_current DESC, nv.version_number DESC
    LIMIT 1;
  END IF;

  IF v_existing_same_ro_id IS NOT NULL THEN
    v_is_updating_existing := true;
    v_target_struct_id := v_existing_same_ro_id;

    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'sub_identifier', identifier,
          'structure_type', structure_type,
          'sub_kind', COALESCE(metadata->>'sub_kind', structure_type),
          'sub_code', COALESCE(metadata->>'sub_code', identifier),
          'display_marker', COALESCE(metadata->>'display_marker', title),
          'ordinal', COALESCE(ordinal, 10),
          'content', COALESCE(content, ''),
          'changed_in_this_version', COALESCE((metadata->>'changed_in_this_version')::boolean, false),
          'legal_status', COALESCE(legal_status, 'vigente')
        )
        ORDER BY ordinal
      ),
      '[]'::jsonb
    )
    INTO v_subs
    FROM public.normative_structures
    WHERE parent_id = v_existing_same_ro_id
      AND structure_type IN ('literal', 'numeral', 'paragraph', 'item')
      AND NOT COALESCE((metadata->>'obsolete_subelement')::boolean, false);

    IF jsonb_array_length(v_subs) = 0 THEN
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'sub_identifier', sub_identifier,
            'structure_type', structure_type,
            'sub_kind', sub_kind,
            'sub_code', sub_code,
            'display_marker', display_marker,
            'ordinal', ordinal,
            'content', content,
            'changed_in_this_version', false,
            'legal_status', 'vigente'
          )
          ORDER BY ordinal
        ),
        '[]'::jsonb
      )
      INTO v_subs
      FROM public.parse_article_subelements(
        v_clean_target_id,
        (SELECT content FROM public.normative_structures WHERE id = v_existing_same_ro_id)
      );
    END IF;
  ELSIF v_prev_struct.id IS NOT NULL THEN
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'sub_identifier', identifier,
          'structure_type', structure_type,
          'sub_kind', COALESCE(metadata->>'sub_kind', structure_type),
          'sub_code', COALESCE(metadata->>'sub_code', identifier),
          'display_marker', COALESCE(metadata->>'display_marker', title),
          'ordinal', COALESCE(ordinal, 10),
          'content', COALESCE(content, ''),
          'changed_in_this_version', false,
          'legal_status', COALESCE(legal_status, 'vigente')
        )
        ORDER BY ordinal
      ),
      '[]'::jsonb
    )
    INTO v_subs
    FROM public.normative_structures
    WHERE parent_id = v_prev_struct.id
      AND structure_type IN ('literal', 'numeral', 'paragraph', 'item')
      AND NOT COALESCE((metadata->>'obsolete_subelement')::boolean, false);

    IF jsonb_array_length(v_subs) = 0 THEN
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'sub_identifier', sub_identifier,
            'structure_type', structure_type,
            'sub_kind', sub_kind,
            'sub_code', sub_code,
            'display_marker', display_marker,
            'ordinal', ordinal,
            'content', content,
            'changed_in_this_version', false,
            'legal_status', 'vigente'
          )
          ORDER BY ordinal
        ),
        '[]'::jsonb
      )
      INTO v_subs
      FROM public.parse_article_subelements(v_clean_target_id, v_prev_struct.content);
    END IF;
  END IF;

  IF p_modifying_structure_id IS NOT NULL THEN
    v_mod_ids := array_append(v_mod_ids, p_modifying_structure_id);
  END IF;
  IF NULLIF(btrim(COALESCE(p_summary_change, '')), '') IS NOT NULL THEN
    v_summaries := array_append(v_summaries, btrim(p_summary_change));
  END IF;

  IF p_operations IS NOT NULL AND jsonb_typeof(p_operations) = 'array' AND jsonb_array_length(p_operations) > 0 THEN
    FOR v_op IN SELECT * FROM jsonb_array_elements(p_operations) LOOP
      v_op_type := lower(COALESCE(v_op->>'tipo_operacion', v_op->>'operation_mode', 'replace_article_full'));
      v_op_sub_kind := lower(NULLIF(btrim(COALESCE(v_op->>'sub_nivel_tipo', v_op->>'sub_kind', '')), ''));
      v_op_sub_code := lower(NULLIF(btrim(COALESCE(v_op->>'sub_nivel_codigo', v_op->>'sub_code', '')), ''));
      v_op_content := public.clean_article_body_prefix(
        v_clean_target_id,
        COALESCE(v_op->>'texto_literal_nuevo', v_op->>'new_content', '')
      );
      v_op_tables := COALESCE(v_op->'tablas_normativas', v_op->'normative_tables');
      v_op_patches := COALESCE(v_op->'parches_exactos', v_op->'patches');
      v_op_summary := NULLIF(btrim(COALESCE(v_op->>'resumen_reforma', v_op->>'summary_change', '')), '');

      BEGIN
        v_op_mod_id := NULLIF(btrim(COALESCE(v_op->>'modifying_structure_id', '')), '')::uuid;
      EXCEPTION WHEN others THEN
        v_op_mod_id := NULL;
      END;

      IF v_op_mod_id IS NOT NULL AND NOT (v_op_mod_id = ANY(v_mod_ids)) THEN
        v_mod_ids := array_append(v_mod_ids, v_op_mod_id);
      END IF;
      IF v_op_summary IS NOT NULL AND NOT (v_op_summary = ANY(v_summaries)) THEN
        v_summaries := array_append(v_summaries, v_op_summary);
      END IF;

      v_op_sub_id := NULL;
      IF v_op_sub_code IS NOT NULL THEN
        IF v_op_sub_kind = 'literal' OR (v_op_sub_kind IS NULL AND v_op_sub_code ~ '^[a-zñ]$') THEN
          v_op_sub_kind := 'literal';
          v_op_sub_id := v_clean_target_id || '::lit:' || v_op_sub_code;
        ELSIF v_op_sub_kind = 'numeral' OR (v_op_sub_kind IS NULL AND v_op_sub_code ~ '^\d+(?:\.\d+)?$') THEN
          v_op_sub_kind := 'numeral';
          v_op_sub_id := v_clean_target_id || '::num:' || v_op_sub_code;
        ELSIF v_op_sub_kind = 'intro' OR v_op_sub_code = 'intro' THEN
          v_op_sub_kind := 'intro';
          v_op_sub_id := v_clean_target_id || '::intro';
        ELSE
          v_op_sub_kind := 'paragraph';
          v_op_sub_id := v_clean_target_id || '::p:' || v_op_sub_code;
        END IF;
      END IF;

      IF v_op_type = 'replace_table_only' THEN
        v_table_diff_mode := 'full_replace';
        IF v_op_tables IS NOT NULL AND jsonb_typeof(v_op_tables) = 'array' AND jsonb_array_length(v_op_tables) > 0 THEN
          FOR v_tbl IN SELECT * FROM jsonb_array_elements(v_op_tables) LOOP
            v_tbl_val := public.validate_normative_table_structure(v_tbl);
            IF NOT COALESCE((v_tbl_val->>'valid')::boolean, true) THEN
              SELECT array_cat(v_warnings, ARRAY(SELECT jsonb_array_elements_text(v_tbl_val->'warnings'))) INTO v_warnings;
            END IF;

            v_tbl_md := public.render_normative_table_markdown(v_tbl);
            v_tbl_caption := NULLIF(btrim(COALESCE(v_tbl->>'encabezado_tabla', v_tbl->>'table_caption', '')), '');
            v_tbl_sub_id := COALESCE(
              CASE
                WHEN NULLIF(btrim(COALESCE(v_tbl->>'target_sub_codigo', '')), '') IS NOT NULL
                  THEN v_clean_target_id || '::lit:' || lower(btrim(v_tbl->>'target_sub_codigo'))
                ELSE NULL
              END,
              v_op_sub_id
            );

            v_new_subs := '[]'::jsonb;
            v_matched_sub := false;
            FOR v_sub_item IN SELECT * FROM jsonb_array_elements(v_subs) LOOP
              IF (v_tbl_sub_id IS NOT NULL AND v_sub_item->>'sub_identifier' = v_tbl_sub_id)
                 OR (v_tbl_sub_id IS NULL AND NOT v_matched_sub AND (v_sub_item->>'content') LIKE '%|%|%') THEN
                v_matched_sub := true;
                v_tbl_sub_id := v_sub_item->>'sub_identifier';
                v_sub_item := v_sub_item || jsonb_build_object(
                  'content', public.replace_markdown_table_in_text(v_sub_item->>'content', v_tbl_md, v_tbl_caption),
                  'changed_in_this_version', true
                );
                v_changed_subs := array_append(v_changed_subs, v_tbl_sub_id);
              END IF;
              v_new_subs := v_new_subs || jsonb_build_array(v_sub_item);
            END LOOP;

            IF NOT v_matched_sub THEN
              v_warnings := array_append(
                v_warnings,
                format('No se encontró el sub-elemento %s para reemplazar la tabla.', COALESCE(v_tbl_sub_id, 'objetivo'))
              );
            ELSE
              v_subs := v_new_subs;
            END IF;

            v_tables_to_save := v_tables_to_save || jsonb_build_array(
              v_tbl || jsonb_build_object(
                '_sub_identifier', v_tbl_sub_id,
                '_table_diff_mode', 'full_replace',
                '_validation', v_tbl_val,
                '_emitter_norm_id', COALESCE(v_tbl->>'_emitter_norm_id', v_op->>'_emitter_norm_id'),
                '_emitter_norm_code', COALESCE(v_tbl->>'_emitter_norm_code', v_op->>'_emitter_norm_code'),
                '_emitter_norm_title', COALESCE(v_tbl->>'_emitter_norm_title', v_op->>'_emitter_norm_title'),
                '_emitter_structure_id', COALESCE(v_tbl->>'_emitter_structure_id', v_op->>'_emitter_structure_id', v_op_mod_id::text)
              )
            );
          END LOOP;
        END IF;

      ELSIF v_op_type = 'replace_subelement' AND v_op_sub_id IS NOT NULL THEN
        v_new_subs := '[]'::jsonb;
        v_matched_sub := false;
        FOR v_sub_item IN SELECT * FROM jsonb_array_elements(v_subs) LOOP
          IF v_sub_item->>'sub_identifier' = v_op_sub_id THEN
            v_matched_sub := true;
            v_sub_item := v_sub_item || jsonb_build_object(
              'content', v_op_content,
              'changed_in_this_version', true,
              'legal_status', 'vigente_reformado'
            );
            v_changed_subs := array_append(v_changed_subs, v_op_sub_id);
          END IF;
          v_new_subs := v_new_subs || jsonb_build_array(v_sub_item);
        END LOOP;

        IF NOT v_matched_sub THEN
          SELECT COALESCE(MAX((elem->>'ordinal')::int4), 0) + 10 INTO v_max_ord
          FROM jsonb_array_elements(v_subs) elem;
          v_new_subs := v_new_subs || jsonb_build_array(jsonb_build_object(
            'sub_identifier', v_op_sub_id,
            'structure_type', CASE WHEN v_op_sub_kind = 'intro' THEN 'paragraph' ELSE v_op_sub_kind END,
            'sub_kind', v_op_sub_kind,
            'sub_code', v_op_sub_code,
            'display_marker', CASE WHEN v_op_sub_kind = 'literal' THEN v_op_sub_code || ')' WHEN v_op_sub_kind = 'numeral' THEN v_op_sub_code || '.-' ELSE 'Inciso ' || v_op_sub_code END,
            'ordinal', v_max_ord,
            'content', v_op_content,
            'changed_in_this_version', true,
            'legal_status', 'vigente_reformado'
          ));
          v_changed_subs := array_append(v_changed_subs, v_op_sub_id);
        END IF;
        v_subs := v_new_subs;

        IF v_op_tables IS NOT NULL AND jsonb_typeof(v_op_tables) = 'array' THEN
          v_table_diff_mode := 'full_replace';
          FOR v_tbl IN SELECT * FROM jsonb_array_elements(v_op_tables) LOOP
            v_tbl_val := public.validate_normative_table_structure(v_tbl);
            IF NOT COALESCE((v_tbl_val->>'valid')::boolean, true) THEN
              SELECT array_cat(v_warnings, ARRAY(SELECT jsonb_array_elements_text(v_tbl_val->'warnings'))) INTO v_warnings;
            END IF;
            v_tables_to_save := v_tables_to_save || jsonb_build_array(
              v_tbl || jsonb_build_object(
                '_sub_identifier', v_op_sub_id,
                '_table_diff_mode', 'full_replace',
                '_validation', v_tbl_val,
                '_emitter_norm_id', COALESCE(v_tbl->>'_emitter_norm_id', v_op->>'_emitter_norm_id'),
                '_emitter_norm_code', COALESCE(v_tbl->>'_emitter_norm_code', v_op->>'_emitter_norm_code'),
                '_emitter_norm_title', COALESCE(v_tbl->>'_emitter_norm_title', v_op->>'_emitter_norm_title'),
                '_emitter_structure_id', COALESCE(v_tbl->>'_emitter_structure_id', v_op->>'_emitter_structure_id', v_op_mod_id::text)
              )
            );
          END LOOP;
        END IF;

      ELSIF v_op_type = 'add_subelement' AND v_op_sub_id IS NOT NULL THEN
        v_after_sub_code := lower(NULLIF(btrim(COALESCE(v_op->>'despues_de_codigo', v_op->>'after_sub_code', '')), ''));
        v_insert_ord := NULL;
        IF v_after_sub_code IS NOT NULL THEN
          SELECT ((elem->>'ordinal')::int4) + 5 INTO v_insert_ord
          FROM jsonb_array_elements(v_subs) elem
          WHERE lower(elem->>'sub_code') = v_after_sub_code
          LIMIT 1;
        END IF;
        IF v_insert_ord IS NULL THEN
          SELECT COALESCE(MAX((elem->>'ordinal')::int4), 0) + 10 INTO v_insert_ord
          FROM jsonb_array_elements(v_subs) elem;
        END IF;

        v_subs := v_subs || jsonb_build_array(jsonb_build_object(
          'sub_identifier', v_op_sub_id,
          'structure_type', CASE WHEN v_op_sub_kind = 'intro' THEN 'paragraph' ELSE v_op_sub_kind END,
          'sub_kind', v_op_sub_kind,
          'sub_code', v_op_sub_code,
          'display_marker', CASE WHEN v_op_sub_kind = 'literal' THEN v_op_sub_code || ')' WHEN v_op_sub_kind = 'numeral' THEN v_op_sub_code || '.-' ELSE 'Inciso ' || v_op_sub_code END,
          'ordinal', v_insert_ord,
          'content', v_op_content,
          'changed_in_this_version', true,
          'legal_status', 'vigente'
        ));
        v_changed_subs := array_append(v_changed_subs, v_op_sub_id);

      ELSIF v_op_type = 'repeal_subelement' AND v_op_sub_id IS NOT NULL THEN
        v_new_subs := '[]'::jsonb;
        FOR v_sub_item IN SELECT * FROM jsonb_array_elements(v_subs) LOOP
          IF v_sub_item->>'sub_identifier' = v_op_sub_id THEN
            v_sub_item := v_sub_item || jsonb_build_object(
              'content', CASE WHEN v_op_content <> '' THEN v_op_content ELSE (v_sub_item->>'display_marker') || ' (Derogado).' END,
              'changed_in_this_version', true,
              'legal_status', 'derogado'
            );
            v_changed_subs := array_append(v_changed_subs, v_op_sub_id);
          END IF;
          v_new_subs := v_new_subs || jsonb_build_array(v_sub_item);
        END LOOP;
        v_subs := v_new_subs;

      ELSIF v_op_type = 'patch_text_exact' THEN
        v_new_subs := '[]'::jsonb;
        v_matched_sub := false;
        FOR v_sub_item IN SELECT * FROM jsonb_array_elements(v_subs) LOOP
          IF v_op_sub_id IS NULL OR v_sub_item->>'sub_identifier' = v_op_sub_id THEN
            v_patch_res := public.apply_exact_text_patches(v_sub_item->>'content', v_op_patches);
            IF COALESCE((v_patch_res->>'ok')::boolean, false) THEN
              IF (v_patch_res->>'content') IS DISTINCT FROM (v_sub_item->>'content') THEN
                v_matched_sub := true;
                v_sub_item := v_sub_item || jsonb_build_object(
                  'content', v_patch_res->>'content',
                  'changed_in_this_version', true,
                  'legal_status', 'vigente_reformado'
                );
                v_changed_subs := array_append(v_changed_subs, v_sub_item->>'sub_identifier');
              END IF;
            ELSE
              IF v_op_sub_id IS NOT NULL THEN
                v_matched_sub := true;
                SELECT array_cat(v_warnings, ARRAY(SELECT jsonb_array_elements_text(v_patch_res->'warnings'))) INTO v_warnings;
                v_sub_item := v_sub_item || jsonb_build_object(
                  'content', v_patch_res->>'content',
                  'changed_in_this_version', true,
                  'legal_status', 'vigente_reformado'
                );
                v_changed_subs := array_append(v_changed_subs, v_sub_item->>'sub_identifier');
              END IF;
            END IF;
          END IF;
          v_new_subs := v_new_subs || jsonb_build_array(v_sub_item);
        END LOOP;

        IF NOT v_matched_sub THEN
          v_warnings := array_append(
            v_warnings,
            format('Parche exacto no encontró coincidencia en %s.', COALESCE(v_op_sub_id, 'Art. ' || v_clean_target_id))
          );
        END IF;
        v_subs := v_new_subs;

      ELSE
        SELECT COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'sub_identifier', sub_identifier,
              'structure_type', structure_type,
              'sub_kind', sub_kind,
              'sub_code', sub_code,
              'display_marker', display_marker,
              'ordinal', ordinal,
              'content', content,
              'changed_in_this_version', true,
              'legal_status', CASE WHEN v_op_type = 'repeal_article' THEN 'derogado' ELSE 'vigente_reformado' END
            )
            ORDER BY ordinal
          ),
          '[]'::jsonb
        )
        INTO v_subs
        FROM public.parse_article_subelements(v_clean_target_id, v_op_content);

        SELECT array_cat(v_changed_subs, ARRAY(SELECT elem->>'sub_identifier' FROM jsonb_array_elements(v_subs) elem))
        INTO v_changed_subs;

        IF v_op_tables IS NOT NULL AND jsonb_typeof(v_op_tables) = 'array' THEN
          v_table_diff_mode := 'full_replace';
          FOR v_tbl IN SELECT * FROM jsonb_array_elements(v_op_tables) LOOP
            v_tbl_val := public.validate_normative_table_structure(v_tbl);
            IF NOT COALESCE((v_tbl_val->>'valid')::boolean, true) THEN
              SELECT array_cat(v_warnings, ARRAY(SELECT jsonb_array_elements_text(v_tbl_val->'warnings'))) INTO v_warnings;
            END IF;
            v_tables_to_save := v_tables_to_save || jsonb_build_array(
              v_tbl || jsonb_build_object(
                '_sub_identifier', CASE
                  WHEN NULLIF(btrim(COALESCE(v_tbl->>'target_sub_codigo', '')), '') IS NOT NULL
                    THEN v_clean_target_id || '::lit:' || lower(btrim(v_tbl->>'target_sub_codigo'))
                  ELSE NULL
                END,
                '_table_diff_mode', 'full_replace',
                '_validation', v_tbl_val,
                '_emitter_norm_id', COALESCE(v_tbl->>'_emitter_norm_id', v_op->>'_emitter_norm_id'),
                '_emitter_norm_code', COALESCE(v_tbl->>'_emitter_norm_code', v_op->>'_emitter_norm_code'),
                '_emitter_norm_title', COALESCE(v_tbl->>'_emitter_norm_title', v_op->>'_emitter_norm_title'),
                '_emitter_structure_id', COALESCE(v_tbl->>'_emitter_structure_id', v_op->>'_emitter_structure_id', v_op_mod_id::text)
              )
            );
          END LOOP;
        END IF;
      END IF;
    END LOOP;
  ELSE
    v_op_content := public.clean_article_body_prefix(v_clean_target_id, p_new_content);
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'sub_identifier', sub_identifier,
          'structure_type', structure_type,
          'sub_kind', sub_kind,
          'sub_code', sub_code,
          'display_marker', display_marker,
          'ordinal', ordinal,
          'content', content,
          'changed_in_this_version', true,
          'legal_status', CASE WHEN p_change_type = 'repealed' THEN 'derogado' ELSE 'vigente_reformado' END
        )
        ORDER BY ordinal
      ),
      '[]'::jsonb
    )
    INTO v_subs
    FROM public.parse_article_subelements(v_clean_target_id, v_op_content);

    SELECT array_cat(v_changed_subs, ARRAY(SELECT elem->>'sub_identifier' FROM jsonb_array_elements(v_subs) elem))
    INTO v_changed_subs;
  END IF;

  IF p_normative_tables IS NOT NULL AND jsonb_typeof(p_normative_tables) = 'array' AND jsonb_array_length(p_normative_tables) > 0 THEN
    FOR v_tbl IN SELECT * FROM jsonb_array_elements(p_normative_tables) LOOP
      v_tbl_val := public.validate_normative_table_structure(v_tbl);
      IF NOT COALESCE((v_tbl_val->>'valid')::boolean, true) THEN
        SELECT array_cat(v_warnings, ARRAY(SELECT jsonb_array_elements_text(v_tbl_val->'warnings'))) INTO v_warnings;
      END IF;
      v_tables_to_save := v_tables_to_save || jsonb_build_array(
        v_tbl || jsonb_build_object(
          '_sub_identifier', CASE
            WHEN NULLIF(btrim(COALESCE(v_tbl->>'target_sub_codigo', '')), '') IS NOT NULL
              THEN v_clean_target_id || '::lit:' || lower(btrim(v_tbl->>'target_sub_codigo'))
            ELSE NULL
          END,
          '_table_diff_mode', v_table_diff_mode,
          '_validation', v_tbl_val,
          '_emitter_norm_id', v_tbl->>'_emitter_norm_id',
          '_emitter_norm_code', v_tbl->>'_emitter_norm_code',
          '_emitter_norm_title', v_tbl->>'_emitter_norm_title',
          '_emitter_structure_id', COALESCE(v_tbl->>'_emitter_structure_id', p_modifying_structure_id::text)
        )
      );
    END LOOP;
  END IF;

  SELECT string_agg(elem->>'content', E'\n\n' ORDER BY (elem->>'ordinal')::int4)
  INTO v_final_content
  FROM jsonb_array_elements(v_subs) elem
  WHERE NULLIF(btrim(COALESCE(elem->>'content', '')), '') IS NOT NULL;

  v_final_content := COALESCE(v_final_content, public.clean_article_body_prefix(v_clean_target_id, p_new_content));

  IF COALESCE(array_length(v_warnings, 1), 0) > 0 THEN
    v_final_review_status := 'pending_review';
  END IF;

  v_effective_legal_status := CASE
    WHEN COALESCE(NULLIF(btrim(p_legal_status), ''), '') IN ('vigente', 'vigente_reformado', 'derogado')
      THEN CASE WHEN p_change_type = 'repealed' THEN 'derogado' ELSE btrim(p_legal_status) END
    WHEN p_change_type = 'repealed' THEN 'derogado'
    ELSE 'vigente_reformado'
  END;

  v_inferred_parent_id := COALESCE(v_prev_struct.parent_id, v_base_parent_id);
  v_inferred_parent_title := COALESCE(
    NULLIF(v_prev_struct.metadata->>'parent_title', ''),
    v_base_parent_title,
    CASE
      WHEN v_target_norm_code = 'LRTI' AND v_clean_target_id LIKE '97.%' THEN 'TÍTULO CUARTO: DEL RÉGIMEN IMPOSITIVO SIMPLIFICADO (RISE)'
      WHEN v_target_norm_code = 'LRTI' AND v_art_num BETWEEN 1 AND 51 THEN 'TÍTULO PRIMERO: IMPUESTO A LA RENTA'
      WHEN v_target_norm_code = 'LRTI' AND v_art_num BETWEEN 52 AND 74 THEN 'TÍTULO SEGUNDO: IMPUESTO AL VALOR AGREGADO'
      WHEN v_target_norm_code = 'LRTI' AND v_art_num BETWEEN 75 AND 88 THEN 'TÍTULO TERCERO: IMPUESTO A LOS CONSUMOS ESPECIALES'
      WHEN v_target_norm_code = 'LRTI' THEN 'TÍTULO QUINTO: DISPOSICIONES GENERALES'
      ELSE NULL
    END
  );
  v_inferred_parent_chapter := COALESCE(
    NULLIF(v_prev_struct.metadata->>'parent_chapter', ''),
    v_base_parent_chapter
  );

  IF v_is_updating_existing THEN
    UPDATE public.normative_structures
    SET
      title = COALESCE(NULLIF(p_new_title, ''), title),
      content = v_final_content,
      legal_status = v_effective_legal_status,
      review_status = CASE WHEN v_final_review_status = 'pending_review' THEN 'pending_review' ELSE review_status END,
      metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
        'reform_source_cite', COALESCE(p_reform_source_cite, metadata->>'reform_source_cite'),
        'official_registry', COALESCE(p_official_registry_cite, metadata->>'official_registry'),
        'summary_change', COALESCE(NULLIF(array_to_string(v_summaries, ' | '), ''), metadata->>'summary_change'),
        'ro_published_on', p_effective_date,
        'table_diff_mode', v_table_diff_mode,
        'patch_warnings', to_jsonb(v_warnings),
        'has_normative_table', CASE
          WHEN jsonb_array_length(v_tables_to_save) > 0 THEN true
          ELSE COALESCE((metadata->>'has_normative_table')::boolean, false)
        END
      ),
      updated_at = now()
    WHERE id = v_target_struct_id;
  ELSE
    INSERT INTO public.normative_structures (
      norm_version_id, parent_id, structure_type, identifier, title, content,
      ordinal, review_status, is_current, legal_status, valid_from, valid_until, metadata
    )
    VALUES (
      v_new_version_id,
      v_inferred_parent_id,
      COALESCE(v_prev_struct.structure_type, CASE WHEN v_is_general_disp THEN 'other' ELSE 'article' END),
      v_clean_target_id,
      COALESCE(NULLIF(p_new_title, ''), v_prev_struct.title, CASE WHEN v_is_general_disp THEN v_clean_target_id ELSE 'Art. ' || v_clean_target_id END),
      v_final_content,
      COALESCE(v_prev_struct.ordinal, v_base_ordinal, v_art_num, 1),
      v_final_review_status,
      false,
      v_effective_legal_status,
      v_calc_effective_date,
      p_valid_until,
      COALESCE(v_prev_struct.metadata, '{}'::jsonb)
        - 'is_fe_erratas_replaced'
        - 'fe_erratas_ro_date'
        - 'validity_display_label'
        - 'patch_warnings'
        - 'superseded_duplicate'
        || jsonb_build_object(
          'parent_title', v_inferred_parent_title,
          'parent_chapter', v_inferred_parent_chapter,
          'is_innumerado', v_is_innumerado,
          'after_article', v_after_article,
          'innumerado_order', v_innumerado_order,
          'reform_source_cite', p_reform_source_cite,
          'official_registry', p_official_registry_cite,
          'summary_change', NULLIF(array_to_string(v_summaries, ' | '), ''),
          'ro_published_on', p_effective_date,
          'tax_periodicity', v_tax_periodicity,
          'art11_applied', (NOT v_is_fe_erratas AND NOT v_is_constitutional_ruling),
          'is_fe_erratas', v_is_fe_erratas,
          'is_constitutional_ruling', v_is_constitutional_ruling,
          'version_year', EXTRACT(YEAR FROM v_calc_effective_date)::int4,
          'previous_structure_id', v_prev_struct.id,
          'table_diff_mode', v_table_diff_mode,
          'patch_warnings', to_jsonb(v_warnings),
          'has_normative_table', CASE
            WHEN jsonb_array_length(v_tables_to_save) > 0 THEN true
            ELSE COALESCE((v_prev_struct.metadata->>'has_normative_table')::boolean, false)
          END
        )
    )
    RETURNING id INTO v_target_struct_id;

    IF v_prev_struct.id IS NOT NULL AND v_is_fe_erratas THEN
      UPDATE public.normative_structures
      SET
        is_current = false,
        valid_until = COALESCE(valid_until, (p_effective_date - INTERVAL '1 day')::date),
        metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
          'is_fe_erratas_replaced', true,
          'fe_erratas_ro_date', p_effective_date,
          'validity_display_label', 'Texto erróneo corregido por Fe de Erratas (' || COALESCE(p_official_registry_cite, p_reform_source_cite, p_effective_date::text) || ')'
        ),
        updated_at = now()
      WHERE id = v_prev_struct.id;
    END IF;

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
          v_target_struct_id, v_concept_rec.tax_concept_id, v_concept_rec.relevance_role, 'approved'
        )
        ON CONFLICT (structure_id, tax_concept_id) DO NOTHING;
      END LOOP;
    END IF;
  END IF;

  FOR v_sub_item IN
    SELECT value FROM jsonb_array_elements(v_subs) ORDER BY (value->>'ordinal')::int4
  LOOP
    SELECT id INTO v_existing_sub_id
    FROM public.normative_structures
    WHERE parent_id = v_target_struct_id
      AND identifier = v_sub_item->>'sub_identifier'
    LIMIT 1;

    IF v_existing_sub_id IS NOT NULL THEN
      UPDATE public.normative_structures
      SET
        structure_type = CASE WHEN (v_sub_item->>'structure_type') IN ('literal', 'numeral', 'paragraph', 'item') THEN v_sub_item->>'structure_type' ELSE 'paragraph' END,
        title = CASE
          WHEN (v_sub_item->>'sub_kind') = 'literal' THEN 'Literal ' || (v_sub_item->>'display_marker')
          WHEN (v_sub_item->>'sub_kind') = 'numeral' THEN 'Numeral ' || (v_sub_item->>'sub_code')
          WHEN (v_sub_item->>'sub_kind') = 'intro' THEN 'Encabezado'
          ELSE COALESCE(v_sub_item->>'display_marker', 'Inciso')
        END,
        content = v_sub_item->>'content',
        ordinal = COALESCE((v_sub_item->>'ordinal')::int4, 10),
        review_status = v_final_review_status,
        legal_status = CASE WHEN (v_sub_item->>'legal_status') IN ('vigente', 'vigente_reformado', 'derogado') THEN v_sub_item->>'legal_status' ELSE v_effective_legal_status END,
        valid_from = v_calc_effective_date,
        valid_until = p_valid_until,
        metadata = (COALESCE(metadata, '{}'::jsonb) - 'obsolete_subelement') || jsonb_build_object(
          'article_identifier', v_clean_target_id,
          'sub_kind', v_sub_item->>'sub_kind',
          'sub_code', v_sub_item->>'sub_code',
          'display_marker', v_sub_item->>'display_marker',
          'changed_in_this_version', COALESCE((v_sub_item->>'changed_in_this_version')::boolean, false),
          'reform_source_cite', p_reform_source_cite,
          'official_registry', p_official_registry_cite,
          'ro_published_on', p_effective_date,
          'tax_periodicity', v_tax_periodicity,
          'table_diff_mode', v_table_diff_mode,
          'summary_change', NULLIF(array_to_string(v_summaries, ' | '), '')
        ),
        updated_at = now()
      WHERE id = v_existing_sub_id;
      v_kept_sub_ids := array_append(v_kept_sub_ids, v_existing_sub_id);
    ELSE
      INSERT INTO public.normative_structures (
        norm_version_id, parent_id, structure_type, identifier, title, content,
        ordinal, review_status, is_current, legal_status, valid_from, valid_until, metadata
      )
      VALUES (
        v_new_version_id,
        v_target_struct_id,
        CASE WHEN (v_sub_item->>'structure_type') IN ('literal', 'numeral', 'paragraph', 'item') THEN v_sub_item->>'structure_type' ELSE 'paragraph' END,
        v_sub_item->>'sub_identifier',
        CASE
          WHEN (v_sub_item->>'sub_kind') = 'literal' THEN 'Literal ' || (v_sub_item->>'display_marker')
          WHEN (v_sub_item->>'sub_kind') = 'numeral' THEN 'Numeral ' || (v_sub_item->>'sub_code')
          WHEN (v_sub_item->>'sub_kind') = 'intro' THEN 'Encabezado'
          ELSE COALESCE(v_sub_item->>'display_marker', 'Inciso')
        END,
        v_sub_item->>'content',
        COALESCE((v_sub_item->>'ordinal')::int4, 10),
        v_final_review_status,
        false,
        CASE WHEN (v_sub_item->>'legal_status') IN ('vigente', 'vigente_reformado', 'derogado') THEN v_sub_item->>'legal_status' ELSE v_effective_legal_status END,
        v_calc_effective_date,
        p_valid_until,
        jsonb_build_object(
          'article_identifier', v_clean_target_id,
          'sub_kind', v_sub_item->>'sub_kind',
          'sub_code', v_sub_item->>'sub_code',
          'display_marker', v_sub_item->>'display_marker',
          'changed_in_this_version', COALESCE((v_sub_item->>'changed_in_this_version')::boolean, false),
          'reform_source_cite', p_reform_source_cite,
          'official_registry', p_official_registry_cite,
          'ro_published_on', p_effective_date,
          'tax_periodicity', v_tax_periodicity,
          'table_diff_mode', v_table_diff_mode,
          'summary_change', NULLIF(array_to_string(v_summaries, ' | '), '')
        )
      )
      RETURNING id INTO v_existing_sub_id;
      v_kept_sub_ids := array_append(v_kept_sub_ids, v_existing_sub_id);
    END IF;
  END LOOP;

  IF array_length(v_kept_sub_ids, 1) > 0 THEN
    UPDATE public.normative_structures
    SET is_current = false, legal_status = 'derogado', metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('obsolete_subelement', true), updated_at = now()
    WHERE parent_id = v_target_struct_id
      AND structure_type IN ('literal', 'numeral', 'paragraph', 'item')
      AND NOT (id = ANY(v_kept_sub_ids));
  END IF;

  PERFORM public.recompute_article_timeline(v_target_norm_id, v_clean_target_id);

  SELECT is_current INTO v_final_is_current
  FROM public.normative_structures
  WHERE id = v_target_struct_id;

  IF jsonb_array_length(v_tables_to_save) > 0 THEN
    SELECT id INTO v_tarifas_concept_id
    FROM public.tax_concepts
    WHERE code IN ('TARIFA_IMPUESTO_RENTA', 'TARIFAS')
    ORDER BY CASE WHEN code = 'TARIFA_IMPUESTO_RENTA' THEN 0 ELSE 1 END
    LIMIT 1;

    FOR v_tbl IN SELECT * FROM jsonb_array_elements(v_tables_to_save) LOOP
      v_tbl_valid_from := COALESCE(
        NULLIF(btrim(COALESCE(v_tbl->>'valid_from', '')), '')::date,
        v_calc_effective_date
      );
      v_tbl_valid_until := COALESCE(
        NULLIF(btrim(COALESCE(v_tbl->>'valid_until', '')), '')::date,
        CASE
          WHEN COALESCE(v_tbl->>'categoria_tabla', v_tbl->>'table_category', '') IN ('progressive_rates', 'inheritance')
            OR upper(COALESCE(v_tbl->>'code', '')) ~ '^TBL_IR_(PN|HERENCIAS|HLD)_[0-9]{4}'
          THEN make_date(COALESCE(NULLIF(btrim(COALESCE(v_tbl->>'fiscal_year', '')), '')::int4, EXTRACT(YEAR FROM v_tbl_valid_from)::int4) + 1, 1, 1)
          ELSE NULL
        END
      );
      v_tbl_cat := CASE
        WHEN COALESCE(v_tbl->>'categoria_tabla', v_tbl->>'table_category', 'other') IN ('progressive_rates','withholding_rates','specific_rates','rimpe','dividends','inheritance','ice','depreciation','deadlines','other')
        THEN COALESCE(v_tbl->>'categoria_tabla', v_tbl->>'table_category', 'other')
        ELSE 'progressive_rates'
      END;
      v_tbl_code := COALESCE(
        NULLIF(btrim(COALESCE(v_tbl->>'code', '')), ''),
        'TBL_' || v_target_norm_code || '_' || regexp_replace(v_clean_target_id, '[^A-Za-z0-9_]', '_', 'g') || '_' || EXTRACT(YEAR FROM v_tbl_valid_from)::text
      );
      v_tbl_sub_id := NULLIF(btrim(COALESCE(v_tbl->>'_sub_identifier', '')), '');

      v_tbl_target_struct_id := v_target_struct_id;
      IF v_tbl_sub_id IS NOT NULL THEN
        SELECT id INTO v_tbl_target_struct_id
        FROM public.normative_structures
        WHERE parent_id = v_target_struct_id
          AND identifier = v_tbl_sub_id
          AND NOT COALESCE((metadata->>'obsolete_subelement')::boolean, false)
        LIMIT 1;
        v_tbl_target_struct_id := COALESCE(v_tbl_target_struct_id, v_target_struct_id);
      END IF;

      -- Resolver emisor real de la tabla cuando viene desde una reforma
      v_em_norm_id := NULLIF(btrim(COALESCE(v_tbl->>'_emitter_norm_id', '')), '');
      v_em_norm_code := NULLIF(btrim(COALESCE(v_tbl->>'_emitter_norm_code', '')), '');
      v_em_norm_title := NULLIF(btrim(COALESCE(v_tbl->>'_emitter_norm_title', '')), '');
      v_em_struct_id := NULLIF(btrim(COALESCE(v_tbl->>'_emitter_structure_id', '')), '');

      IF v_em_norm_id IS NULL AND COALESCE(v_em_struct_id::uuid, v_mod_ids[1]) IS NOT NULL THEN
        SELECT n_em.id::text, n_em.code, n_em.name, ns_em.id::text
        INTO v_em_norm_id, v_em_norm_code, v_em_norm_title, v_em_struct_id
        FROM public.normative_structures ns_em
        JOIN public.norm_versions nv_em ON nv_em.id = ns_em.norm_version_id
        JOIN public.norms n_em ON n_em.id = nv_em.norm_id
        WHERE ns_em.id = COALESCE(v_em_struct_id::uuid, v_mod_ids[1])
        LIMIT 1;
      END IF;

      IF v_final_is_current THEN
        UPDATE public.normative_tables nt
        SET
          is_active = false,
          effective_during = CASE
            WHEN upper_inf(nt.effective_during) AND v_tbl_valid_from > lower(nt.effective_during)
              THEN daterange(lower(nt.effective_during), v_tbl_valid_from, '[)')
            ELSE nt.effective_during
          END,
          updated_at = now()
        WHERE nt.norm_id = v_target_norm_id
          AND nt.table_category = v_tbl_cat
          AND nt.code <> v_tbl_code
          AND nt.is_active = true
          AND (
            nt.metadata->>'article_identifier' = v_clean_target_id
            OR nt.structure_id IN (
              SELECT ns2.id
              FROM public.normative_structures ns2
              JOIN public.norm_versions nv2 ON nv2.id = ns2.norm_version_id
              WHERE nv2.norm_id = v_target_norm_id
                AND (
                  lower(btrim(ns2.identifier)) = lower(v_clean_target_id)
                  OR ns2.metadata->>'article_identifier' = v_clean_target_id
                )
            )
          );
      END IF;

      v_tbl_meta := jsonb_build_object(
        'article_structure_id', v_target_struct_id,
        'article_identifier', v_clean_target_id,
        'sub_identifier', v_tbl_sub_id,
        'table_diff_mode', COALESCE(v_tbl->>'_table_diff_mode', v_table_diff_mode),
        'scan_validation', COALESCE(v_tbl->'_validation', jsonb_build_object('valid', true, 'warnings', '[]'::jsonb))
      );
      IF v_em_norm_id IS NOT NULL THEN
        v_tbl_meta := v_tbl_meta || jsonb_build_object(
          'emitter_norm_id', v_em_norm_id,
          'emitter_norm_code', v_em_norm_code,
          'emitter_norm_title', v_em_norm_title,
          'emitter_structure_id', v_em_struct_id
        );
      END IF;

      INSERT INTO public.normative_tables (
        code, title, description, norm_id, norm_version_id, structure_id,
        tax_concept_id, table_category, fiscal_year, effective_during,
        columns_schema, rows_data, markdown_content, review_status, is_active, metadata
      )
      VALUES (
        v_tbl_code,
        COALESCE(NULLIF(v_tbl->>'titulo_tabla', ''), v_tbl->>'title', 'Tabla Art. ' || v_clean_target_id),
        COALESCE(NULLIF(v_tbl->>'descripcion', ''), v_tbl->>'description', 'Extraída del Art. ' || v_clean_target_id || ' (' || v_target_norm_code || ')'),
        v_target_norm_id,
        v_new_version_id,
        v_tbl_target_struct_id,
        v_tarifas_concept_id,
        v_tbl_cat,
        COALESCE(NULLIF(btrim(COALESCE(v_tbl->>'fiscal_year', '')), '')::int4, EXTRACT(YEAR FROM v_tbl_valid_from)::int4),
        daterange(v_tbl_valid_from, v_tbl_valid_until, '[)'),
        COALESCE(v_tbl->'columns_schema', '[]'::jsonb),
        COALESCE(v_tbl->'rows_data', '[]'::jsonb),
        public.render_normative_table_markdown(v_tbl),
        CASE WHEN COALESCE((v_tbl->'_validation'->>'valid')::boolean, true) THEN 'approved' ELSE 'pending_review' END,
        v_final_is_current,
        v_tbl_meta
      )
      ON CONFLICT (code) DO UPDATE
      SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        norm_id = EXCLUDED.norm_id,
        structure_id = EXCLUDED.structure_id,
        norm_version_id = EXCLUDED.norm_version_id,
        table_category = EXCLUDED.table_category,
        fiscal_year = EXCLUDED.fiscal_year,
        effective_during = EXCLUDED.effective_during,
        rows_data = EXCLUDED.rows_data,
        columns_schema = EXCLUDED.columns_schema,
        markdown_content = EXCLUDED.markdown_content,
        review_status = EXCLUDED.review_status,
        is_active = EXCLUDED.is_active,
        metadata = COALESCE(public.normative_tables.metadata, '{}'::jsonb) || EXCLUDED.metadata,
        updated_at = now();
    END LOOP;
  END IF;

  SELECT id INTO v_change_id
  FROM public.normative_changes
  WHERE norm_id = v_target_norm_id
    AND resulting_structure_id = v_target_struct_id
  LIMIT 1;

  IF v_change_id IS NOT NULL THEN
    UPDATE public.normative_changes
    SET
      new_value = v_final_content,
      description = COALESCE(NULLIF(array_to_string(v_summaries, ' | '), ''), description),
      review_status = v_final_review_status,
      metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
        'changed_subelements', to_jsonb(v_changed_subs),
        'table_diff_mode', v_table_diff_mode,
        'patch_warnings', to_jsonb(v_warnings)
      )
    WHERE id = v_change_id;
  ELSE
    INSERT INTO public.normative_changes (
      norm_id, original_version_id, modifying_version_id, original_structure_id,
      resulting_structure_id, change_type, effective_date, previous_value,
      new_value, description, review_status, metadata
    )
    VALUES (
      v_target_norm_id,
      v_prev_struct.norm_version_id,
      v_new_version_id,
      v_prev_struct.id,
      v_target_struct_id,
      CASE
        WHEN p_change_type IN ('created','modified','repealed','replaced','added','removed','renumbered','clarified','other')
        THEN p_change_type
        ELSE 'modified'
      END,
      v_calc_effective_date,
      v_prev_struct.content,
      v_final_content,
      COALESCE(NULLIF(array_to_string(v_summaries, ' | '), ''), p_reform_source_cite),
      v_final_review_status,
      jsonb_build_object(
        'reform_source_cite', p_reform_source_cite,
        'official_registry', p_official_registry_cite,
        'ro_published_on', p_effective_date,
        'art11_applied', (NOT v_is_fe_erratas AND NOT v_is_constitutional_ruling),
        'is_constitutional_ruling', v_is_constitutional_ruling,
        'changed_subelements', to_jsonb(v_changed_subs),
        'table_diff_mode', v_table_diff_mode,
        'patch_warnings', to_jsonb(v_warnings)
      )
    );
  END IF;

  FOREACH v_mod_id IN ARRAY v_mod_ids LOOP
    IF v_mod_id IS NOT NULL AND v_mod_id <> v_target_struct_id THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.structure_relations
        WHERE source_structure_id = v_target_struct_id
          AND target_structure_id = v_mod_id
      ) THEN
        INSERT INTO public.structure_relations (
          source_structure_id, target_structure_id, relation_type, description, review_status, metadata
        )
        VALUES (
          v_target_struct_id,
          v_mod_id,
          CASE
            WHEN p_change_type = 'repealed' THEN 'repeals'
            WHEN p_change_type = 'clarified' THEN 'clarifies'
            ELSE 'regulated_by'
          END,
          COALESCE(NULLIF(array_to_string(v_summaries, ' | '), ''), p_reform_source_cite),
          v_final_review_status,
          jsonb_build_object(
            'official_registry', p_official_registry_cite,
            'ro_published_on', p_effective_date,
            'effective_date', v_calc_effective_date,
            'is_constitutional_ruling', v_is_constitutional_ruling
          )
        );
      END IF;
    END IF;
  END LOOP;

  RETURN v_target_struct_id;
END;
$function$;

-- ingest_extracted_norm_draft(p_document_id uuid, p_norm_code text, p_version_title text, p_published_on date, p_model text, p_articles jsonb, p_google_drive_file_id text, p_google_drive_path text, p_storage_bucket text, p_storage_path text, p_folder_category text, p_file_name text, p_sha256 text, p_file_size bigint, p_source_url text)
CREATE OR REPLACE FUNCTION public.ingest_extracted_norm_draft(p_document_id uuid DEFAULT NULL::uuid, p_norm_code text DEFAULT 'LRTI'::text, p_version_title text DEFAULT 'Versión Extraída por IA'::text, p_published_on date DEFAULT NULL::date, p_model text DEFAULT 'gemini-2.5-flash'::text, p_articles jsonb DEFAULT '[]'::jsonb, p_google_drive_file_id text DEFAULT NULL::text, p_google_drive_path text DEFAULT NULL::text, p_storage_bucket text DEFAULT 'legal-documents'::text, p_storage_path text DEFAULT NULL::text, p_folder_category text DEFAULT '00_registros_oficiales'::text, p_file_name text DEFAULT NULL::text, p_sha256 text DEFAULT NULL::text, p_file_size bigint DEFAULT NULL::bigint, p_source_url text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_doc_id uuid;
  v_norm_id uuid;
  v_version_id uuid;
  v_existing_version_id uuid;
  v_run_id uuid;
  v_next_version int4;
  v_tarifas_concept_id uuid;
  v_feature_code text;
  v_feature_id uuid;
  v_norm_type text;
  v_clean_norm_code text := CASE
    WHEN upper(btrim(COALESCE(NULLIF(p_norm_code, ''), 'NORMA'))) = 'RLRTI' THEN 'RALRTI'
    ELSE upper(btrim(COALESCE(NULLIF(p_norm_code, ''), 'NORMA')))
  END;
  v_first_art jsonb;
  v_item jsonb;
  v_extra_ref jsonb;
  v_op jsonb;
  v_art_id uuid;
  v_existing_art_id uuid;
  v_struct_type text;
  v_ident text;
  v_title_id uuid;
  v_chapter_id uuid;
  v_title_text text;
  v_chapter_text text;
  v_concept_code text;
  v_concept_id uuid;
  v_tbl jsonb;
  v_rel jsonb;
  v_item_tables jsonb;
  v_item_content text;
  v_cited_raw text;
  v_cited_norm_code text;
  v_cited_art_ident text;
  v_target_norm_code_text text;
  v_target_art_id_text text;
  v_target_norm_id uuid;
  v_target_struct_id uuid;
  v_reformed_struct_id uuid;
  v_discovery_id uuid;
  v_did_queue_reform boolean;
  v_inserted_articles int4 := 0;
  v_inserted_tables int4 := 0;
  v_inserted_discoveries int4 := 0;
  v_applied_reforms int4 := 0;
  v_ordinal int4 := 0;
  v_pub_date date := COALESCE(p_published_on, CURRENT_DATE);
  v_art_valid_from date;
  v_art_valid_until date;
  v_tbl_valid_from date;
  v_tbl_valid_until date;
  v_tax_periodicity text;
  v_reform_groups jsonb := '{}'::jsonb;
  v_grp_key text;
  v_grp jsonb;
  v_grp_rec record;
BEGIN
  IF jsonb_typeof(p_articles) = 'array' AND jsonb_array_length(p_articles) > 0 THEN
    v_first_art := p_articles->0;
  ELSE
    v_first_art := '{}'::jsonb;
  END IF;

  CASE COALESCE(p_folder_category, '00_registros_oficiales')
    WHEN '00_registros_oficiales' THEN
      IF v_clean_norm_code ~ '^(DEC|DECRETO-EJECUTIVO|DE-[0-9]+)' AND v_clean_norm_code !~ '^DECRETO-LEY' THEN
        v_norm_type := 'decree';
      ELSIF COALESCE(v_first_art->>'normative_type', '') IN ('constitution','law','organic_law','regulation','decree','resolution','ordinance','circular','agreement','other') THEN
        v_norm_type := v_first_art->>'normative_type';
      ELSIF v_clean_norm_code ~ '^(REG|REGLAMENTO|RALRTI|RLRTI|RALRUC)' OR lower(COALESCE(p_version_title, '')) LIKE '%reglamento%' THEN
        v_norm_type := 'regulation';
      ELSIF v_clean_norm_code ~ '^(DEC|DECRETO|DE-)' OR lower(COALESCE(p_version_title, '')) LIKE '%decreto%' THEN
        v_norm_type := 'decree';
      ELSIF v_clean_norm_code ~ '^(NAC-|RES-)' OR lower(COALESCE(p_version_title, '')) ~ '(resoluci[oó]n|instructivo)' THEN
        v_norm_type := 'resolution';
      ELSIF v_clean_norm_code ~ '^CIRC' OR lower(COALESCE(p_version_title, '')) LIKE '%circular%' THEN
        v_norm_type := 'circular';
      ELSIF v_clean_norm_code = 'CT' OR v_clean_norm_code ~ '^LO' OR lower(COALESCE(p_version_title, '')) ~ 'ley org[aá]nica' THEN
        v_norm_type := 'organic_law';
      ELSE
        v_norm_type := 'law';
      END IF;

      v_feature_code := CASE v_norm_type
        WHEN 'regulation' THEN 'norms_regulations'
        WHEN 'decree' THEN 'norms_regulations'
        WHEN 'resolution' THEN 'norms_resolutions'
        WHEN 'circular' THEN 'norms_resolutions'
        ELSE 'norms_laws'
      END;
    WHEN '01_codigos' THEN v_norm_type := 'organic_law'; v_feature_code := 'norms_laws';
    WHEN '02_leyes' THEN v_norm_type := 'law'; v_feature_code := 'norms_laws';
    WHEN '03_reglamentos' THEN v_norm_type := 'regulation'; v_feature_code := 'norms_regulations';
    WHEN '04_leyes_reformas' THEN v_norm_type := 'law'; v_feature_code := 'norms_historical';
    WHEN '05_resoluciones_sri' THEN v_norm_type := 'resolution'; v_feature_code := 'norms_resolutions';
    WHEN '06_circulares_sri' THEN v_norm_type := 'circular'; v_feature_code := 'norms_resolutions';
    WHEN '07_formularios_anexos' THEN v_norm_type := 'other'; v_feature_code := 'forms';
    WHEN '08_decretos_ejecutivos' THEN v_norm_type := 'decree'; v_feature_code := 'norms_regulations';
    ELSE v_norm_type := 'law'; v_feature_code := 'norms_laws';
  END CASE;

  SELECT id INTO v_feature_id FROM public.features WHERE code = v_feature_code LIMIT 1;

  v_doc_id := p_document_id;
  IF v_doc_id IS NULL AND NULLIF(btrim(COALESCE(p_google_drive_file_id, '')), '') IS NOT NULL THEN
    SELECT id INTO v_doc_id FROM public.documents WHERE google_drive_file_id = btrim(p_google_drive_file_id) LIMIT 1;
  END IF;
  IF v_doc_id IS NULL AND NULLIF(btrim(COALESCE(p_sha256, '')), '') IS NOT NULL THEN
    SELECT id INTO v_doc_id FROM public.documents WHERE sha256 = btrim(p_sha256) LIMIT 1;
  END IF;
  IF v_doc_id IS NULL AND NULLIF(btrim(COALESCE(p_storage_path, '')), '') IS NOT NULL THEN
    SELECT id INTO v_doc_id
    FROM public.documents
    WHERE storage_bucket = COALESCE(NULLIF(p_storage_bucket, ''), 'legal-documents')
      AND storage_path = btrim(p_storage_path)
    LIMIT 1;
  END IF;

  IF v_doc_id IS NULL THEN
    INSERT INTO public.documents (
      file_name, mime_type, file_size, sha256, storage_bucket, storage_path,
      google_drive_file_id, google_drive_path, source_url, status,
      uploaded_at, processed_at, extraction_model, extraction_version, raw_metadata
    )
    VALUES (
      COALESCE(NULLIF(p_file_name, ''), v_clean_norm_code || '.pdf'),
      'application/pdf',
      p_file_size,
      NULLIF(btrim(COALESCE(p_sha256, '')), ''),
      COALESCE(NULLIF(p_storage_bucket, ''), 'legal-documents'),
      COALESCE(NULLIF(p_storage_path, ''), COALESCE(p_folder_category, '00_registros_oficiales') || '/' || COALESCE(NULLIF(p_file_name, ''), v_clean_norm_code || '.pdf')),
      NULLIF(btrim(COALESCE(p_google_drive_file_id, '')), ''),
      COALESCE(NULLIF(p_google_drive_path, ''), '01_PDF_Original/' || COALESCE(p_folder_category, '00_registros_oficiales') || '/' || COALESCE(NULLIF(p_file_name, ''), v_clean_norm_code || '.pdf')),
      p_source_url,
      'processed',
      now(),
      now(),
      p_model,
      'v5.1-tables-embedded',
      jsonb_build_object(
        'source_kind', 'official_registry_instant_publish',
        'folder_category', p_folder_category,
        'google_drive_file_id', p_google_drive_file_id
      )
    )
    RETURNING id INTO v_doc_id;
  ELSE
    UPDATE public.documents
    SET
      storage_bucket = COALESCE(NULLIF(p_storage_bucket, ''), storage_bucket),
      storage_path = COALESCE(NULLIF(p_storage_path, ''), storage_path),
      google_drive_file_id = COALESCE(NULLIF(btrim(COALESCE(p_google_drive_file_id, '')), ''), google_drive_file_id),
      google_drive_path = COALESCE(NULLIF(p_google_drive_path, ''), google_drive_path),
      sha256 = COALESCE(NULLIF(btrim(COALESCE(p_sha256, '')), ''), sha256),
      file_size = COALESCE(p_file_size, file_size),
      source_url = COALESCE(p_source_url, source_url),
      status = 'processed',
      processed_at = now(),
      updated_at = now()
    WHERE id = v_doc_id;
  END IF;

  SELECT id INTO v_norm_id FROM public.norms WHERE upper(code) = v_clean_norm_code LIMIT 1;

  IF v_norm_id IS NULL THEN
    INSERT INTO public.norms (
      code, name, short_name, normative_type, issuing_entity,
      publication_date, access_feature_id, repository_status, metadata
    )
    VALUES (
      v_clean_norm_code,
      COALESCE(NULLIF(p_version_title, ''), v_clean_norm_code),
      v_clean_norm_code,
      v_norm_type,
      NULLIF(btrim(COALESCE(v_first_art->>'issuing_entity', '')), ''),
      v_pub_date,
      v_feature_id,
      'loaded',
      jsonb_build_object(
        'folder_category', p_folder_category,
        'storage_path', COALESCE(p_storage_path, COALESCE(p_folder_category, '00_registros_oficiales') || '/' || COALESCE(NULLIF(p_file_name, ''), v_clean_norm_code || '.pdf'))
      )
    )
    RETURNING id INTO v_norm_id;
  ELSE
    UPDATE public.norms SET repository_status = 'loaded', updated_at = now() WHERE id = v_norm_id;
  END IF;

  SELECT id INTO v_tarifas_concept_id
  FROM public.tax_concepts
  WHERE code IN ('TARIFA_IMPUESTO_RENTA', 'TARIFAS')
  ORDER BY CASE WHEN code = 'TARIFA_IMPUESTO_RENTA' THEN 0 ELSE 1 END
  LIMIT 1;

  INSERT INTO public.extraction_runs (
    document_id, model, extraction_version, status, prompt_version, started_at, finished_at, result_metadata
  )
  VALUES (
    v_doc_id,
    p_model,
    'v5.1-tables-embedded',
    'completed',
    'smartlex-ec-juridico-v5.1',
    now(),
    now(),
    jsonb_build_object(
      'norm_code', v_clean_norm_code,
      'articles_received', COALESCE(jsonb_array_length(p_articles), 0),
      'folder_category', p_folder_category,
      'instant_publish', true
    )
  )
  RETURNING id INTO v_run_id;

  SELECT nv.id INTO v_existing_version_id
  FROM public.norm_versions nv
  WHERE nv.norm_id = v_norm_id
    AND nv.source_document_id = v_doc_id
  ORDER BY nv.version_number DESC
  LIMIT 1;

  IF v_existing_version_id IS NOT NULL THEN
    v_version_id := v_existing_version_id;
    SELECT COALESCE(MAX(ordinal), 0) INTO v_ordinal
    FROM public.normative_structures
    WHERE norm_version_id = v_version_id;
  ELSE
    SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_next_version
    FROM public.norm_versions
    WHERE norm_id = v_norm_id;

    INSERT INTO public.norm_versions (
      norm_id, version_number, title, source_document_id, published_on,
      effective_during, is_consolidated, status, metadata
    )
    VALUES (
      v_norm_id,
      v_next_version,
      p_version_title,
      v_doc_id,
      v_pub_date,
      daterange(v_pub_date, NULL, '[)'),
      true,
      'active',
      jsonb_build_object(
        'extraction_run_id', v_run_id,
        'folder_category', p_folder_category,
        'google_drive_file_id', p_google_drive_file_id,
        'storage_path', p_storage_path,
        'ro_published_on', v_pub_date
      )
    )
    RETURNING id INTO v_version_id;
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(p_articles, '[]'::jsonb)) LOOP
    v_title_id := NULL;
    v_chapter_id := NULL;
    v_did_queue_reform := false;

    v_title_text := NULLIF(btrim(COALESCE(v_item->>'parent_title', '')), '');
    v_chapter_text := NULLIF(btrim(COALESCE(v_item->>'parent_chapter', '')), '');
    v_art_valid_from := COALESCE(NULLIF(btrim(COALESCE(v_item->>'valid_from', '')), '')::date, v_pub_date);
    v_art_valid_until := NULLIF(btrim(COALESCE(v_item->>'valid_until', '')), '')::date;
    v_tax_periodicity := COALESCE(NULLIF(btrim(COALESCE(v_item->>'tax_periodicity', '')), ''), 'monthly');

    -- Recopilar tablas propias del artículo o de sus operaciones de reforma para asegurar que figuren dentro del cuerpo del artículo
    v_item_tables := COALESCE(v_item->'normative_tables', '[]'::jsonb);
    IF (jsonb_typeof(v_item_tables) <> 'array' OR jsonb_array_length(v_item_tables) = 0)
       AND jsonb_typeof(v_item->'operaciones_reforma') = 'array' THEN
      SELECT COALESCE(jsonb_agg(tbl_elem), '[]'::jsonb) INTO v_item_tables
      FROM jsonb_array_elements(v_item->'operaciones_reforma') op_elem,
           LATERAL jsonb_array_elements(
             CASE WHEN jsonb_typeof(op_elem->'tablas_normativas') = 'array' THEN op_elem->'tablas_normativas' ELSE '[]'::jsonb END
           ) tbl_elem;
    END IF;
    v_item_content := public.ensure_tables_in_article_content(COALESCE(v_item->>'content', ''), v_item_tables);

    IF v_title_text IS NOT NULL AND upper(v_title_text) <> 'SIN TÍTULO' THEN
      SELECT id INTO v_title_id
      FROM public.normative_structures
      WHERE norm_version_id = v_version_id AND structure_type = 'title' AND title = v_title_text
      LIMIT 1;
      IF v_title_id IS NULL THEN
        v_ordinal := v_ordinal + 1;
        INSERT INTO public.normative_structures (
          norm_version_id, parent_id, structure_type, identifier, title, content,
          ordinal, review_status, is_current, legal_status, valid_from, extraction_run_id
        )
        VALUES (v_version_id, NULL, 'title', v_title_text, v_title_text, NULL, v_ordinal, 'approved', true, 'vigente', v_pub_date, v_run_id)
        RETURNING id INTO v_title_id;
      END IF;
    END IF;

    IF v_chapter_text IS NOT NULL AND upper(v_chapter_text) <> 'SIN CAPÍTULO' THEN
      SELECT id INTO v_chapter_id
      FROM public.normative_structures
      WHERE norm_version_id = v_version_id AND structure_type = 'chapter' AND title = v_chapter_text
        AND (parent_id IS NOT DISTINCT FROM v_title_id)
      LIMIT 1;
      IF v_chapter_id IS NULL THEN
        v_ordinal := v_ordinal + 1;
        INSERT INTO public.normative_structures (
          norm_version_id, parent_id, structure_type, identifier, title, content,
          ordinal, review_status, is_current, legal_status, valid_from, extraction_run_id
        )
        VALUES (v_version_id, v_title_id, 'chapter', v_chapter_text, v_chapter_text, NULL, v_ordinal, 'approved', true, 'vigente', v_pub_date, v_run_id)
        RETURNING id INTO v_chapter_id;
      END IF;
    END IF;

    v_struct_type := CASE
      WHEN COALESCE(v_item->>'structure_type', 'article') IN ('book','title','chapter','section','article','paragraph','numeral','literal','item','transitory','final','reform','annex','other')
      THEN COALESCE(v_item->>'structure_type', 'article')
      ELSE 'article'
    END;
    v_ident := COALESCE(NULLIF(btrim(COALESCE(v_item->>'identifier', '')), ''), (v_ordinal + 1)::text);

    SELECT id INTO v_existing_art_id
    FROM public.normative_structures
    WHERE norm_version_id = v_version_id
      AND structure_type = v_struct_type
      AND lower(btrim(identifier)) = lower(v_ident)
    LIMIT 1;

    IF v_existing_art_id IS NOT NULL THEN
      v_art_id := v_existing_art_id;
      UPDATE public.normative_structures
      SET
        parent_id = COALESCE(v_chapter_id, v_title_id, parent_id),
        title = COALESCE(NULLIF(v_item->>'title', ''), title),
        content = CASE
          WHEN length(COALESCE(v_item_content, '')) >= length(COALESCE(content, ''))
            OR (COALESCE(content, '') NOT LIKE '%|%|%' AND COALESCE(v_item_content, '') LIKE '%|%|%')
          THEN COALESCE(v_item_content, content)
          ELSE content
        END,
        metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
          'observations', COALESCE(v_item->>'observations', ''),
          'reform_source_cite', COALESCE(NULLIF(v_item->>'reform_source_cite', ''), p_version_title),
          'official_registry', COALESCE(NULLIF(v_item->>'official_registry', ''), ''),
          'summary_change', COALESCE(NULLIF(v_item->>'summary_change', ''), v_item->>'observations', ''),
          'ro_published_on', v_pub_date,
          'tax_periodicity', v_tax_periodicity,
          'is_fe_erratas', COALESCE((v_item->>'is_fe_erratas')::boolean, false),
          'has_normative_table', (COALESCE((v_item->>'has_normative_table')::boolean, false) OR jsonb_array_length(v_item_tables) > 0),
          'parent_title', v_title_text,
          'parent_chapter', v_chapter_text
        ),
        updated_at = now()
      WHERE id = v_art_id;
    ELSE
      v_ordinal := v_ordinal + 1;
      INSERT INTO public.normative_structures (
        norm_version_id, parent_id, structure_type, identifier, title, content,
        ordinal, review_status, is_current, legal_status, valid_from, valid_until,
        extraction_run_id, metadata
      )
      VALUES (
        v_version_id,
        COALESCE(v_chapter_id, v_title_id),
        v_struct_type,
        v_ident,
        COALESCE(NULLIF(v_item->>'title', ''), 'Art. ' || v_ident),
        COALESCE(v_item_content, ''),
        COALESCE((v_item->>'ordinal')::int4, v_ordinal),
        'approved',
        COALESCE((v_item->>'is_current')::boolean, true),
        CASE
          WHEN COALESCE(v_item->>'legal_status', 'vigente') IN ('vigente', 'vigente_reformado', 'derogado')
          THEN COALESCE(v_item->>'legal_status', 'vigente')
          ELSE 'vigente'
        END,
        v_art_valid_from,
        v_art_valid_until,
        v_run_id,
        jsonb_build_object(
          'observations', COALESCE(v_item->>'observations', ''),
          'reform_source_cite', COALESCE(NULLIF(v_item->>'reform_source_cite', ''), p_version_title),
          'official_registry', COALESCE(NULLIF(v_item->>'official_registry', ''), ''),
          'summary_change', COALESCE(NULLIF(v_item->>'summary_change', ''), v_item->>'observations', ''),
          'ro_published_on', v_pub_date,
          'tax_periodicity', v_tax_periodicity,
          'is_fe_erratas', COALESCE((v_item->>'is_fe_erratas')::boolean, false),
          'has_normative_table', (COALESCE((v_item->>'has_normative_table')::boolean, false) OR jsonb_array_length(v_item_tables) > 0),
          'parent_title', v_title_text,
          'parent_chapter', v_chapter_text
        )
      )
      RETURNING id INTO v_art_id;
      v_inserted_articles := v_inserted_articles + 1;
    END IF;

    IF jsonb_typeof(v_item->'operaciones_reforma') = 'array' AND jsonb_array_length(v_item->'operaciones_reforma') > 0 THEN
      FOR v_op IN SELECT * FROM jsonb_array_elements(v_item->'operaciones_reforma') LOOP
        v_target_norm_code_text := upper(NULLIF(btrim(COALESCE(v_op->>'norma_objetivo', v_item->>'reforms_target_norm_code', '')), ''));
        IF v_target_norm_code_text = 'RLRTI' THEN v_target_norm_code_text := 'RALRTI'; END IF;
        v_target_art_id_text := NULLIF(btrim(COALESCE(v_op->>'articulo_objetivo', v_item->>'reforms_target_article_identifier', '')), '');
        IF v_target_norm_code_text IS NOT NULL AND v_target_art_id_text IS NOT NULL THEN
          v_did_queue_reform := true;
          v_grp_key := v_target_norm_code_text || '::' || lower(v_target_art_id_text);
          v_grp := COALESCE(v_reform_groups->v_grp_key, jsonb_build_object(
            'target_norm_code', v_target_norm_code_text,
            'target_norm_name', COALESCE(v_op->>'nombre_norma_objetivo', v_item->>'reforms_target_norm_name', v_target_norm_code_text),
            'target_article_id', v_target_art_id_text,
            'new_title', COALESCE(v_op->>'titulo_consolidado', v_item->>'reformed_target_title'),
            'change_type', COALESCE(v_op->>'tipo_cambio', v_item->>'reform_change_type', 'modified'),
            'reform_source_cite', COALESCE(NULLIF(v_item->>'reform_source_cite', ''), p_version_title),
            'official_registry', COALESCE(NULLIF(v_item->>'official_registry', ''), p_version_title),
            'valid_until', v_art_valid_until,
            'vertical_concepts', COALESCE(v_item->'vertical_concepts', '[]'::jsonb),
            'operations', '[]'::jsonb
          ));
          v_grp := jsonb_set(
            v_grp,
            '{operations}',
            (v_grp->'operations') || jsonb_build_array(
              v_op || jsonb_build_object(
                'modifying_structure_id', v_art_id,
                '_emitter_norm_id', v_norm_id,
                '_emitter_norm_code', v_clean_norm_code,
                '_emitter_norm_title', p_version_title,
                '_emitter_structure_id', v_art_id,
                'tablas_normativas', COALESCE(v_op->'tablas_normativas', v_item->'normative_tables', '[]'::jsonb)
              )
            )
          );
          v_reform_groups := jsonb_set(v_reform_groups, ARRAY[v_grp_key], v_grp);
        END IF;
      END LOOP;
    ELSE
      v_target_norm_code_text := upper(NULLIF(btrim(COALESCE(v_item->>'reforms_target_norm_code', '')), ''));
      IF v_target_norm_code_text = 'RLRTI' THEN v_target_norm_code_text := 'RALRTI'; END IF;
      v_target_art_id_text := NULLIF(btrim(COALESCE(v_item->>'reforms_target_article_identifier', '')), '');
      IF v_target_norm_code_text IS NOT NULL AND v_target_art_id_text IS NOT NULL
         AND NULLIF(btrim(COALESCE(v_item->>'reformed_target_content', '')), '') IS NOT NULL THEN
        v_did_queue_reform := true;
        v_grp_key := v_target_norm_code_text || '::' || lower(v_target_art_id_text);
        v_grp := COALESCE(v_reform_groups->v_grp_key, jsonb_build_object(
          'target_norm_code', v_target_norm_code_text,
          'target_norm_name', COALESCE(v_item->>'reforms_target_norm_name', v_target_norm_code_text),
          'target_article_id', v_target_art_id_text,
          'new_title', v_item->>'reformed_target_title',
          'change_type', COALESCE(NULLIF(v_item->>'reform_change_type', ''), 'modified'),
          'reform_source_cite', COALESCE(NULLIF(v_item->>'reform_source_cite', ''), p_version_title),
          'official_registry', COALESCE(NULLIF(v_item->>'official_registry', ''), p_version_title),
          'valid_until', v_art_valid_until,
          'vertical_concepts', COALESCE(v_item->'vertical_concepts', '[]'::jsonb),
          'operations', '[]'::jsonb
        ));
        v_grp := jsonb_set(
          v_grp,
          '{operations}',
          (v_grp->'operations') || jsonb_build_array(jsonb_build_object(
            'tipo_operacion', CASE WHEN COALESCE(v_item->>'reform_change_type', 'modified') = 'repealed' THEN 'repeal_article' ELSE 'replace_article_full' END,
            'texto_literal_nuevo', v_item->>'reformed_target_content',
            'resumen_reforma', COALESCE(NULLIF(v_item->>'summary_change', ''), v_item->>'observations', 'Reforma publicada en Registro Oficial'),
            'modifying_structure_id', v_art_id,
            '_emitter_norm_id', v_norm_id,
            '_emitter_norm_code', v_clean_norm_code,
            '_emitter_norm_title', p_version_title,
            '_emitter_structure_id', v_art_id,
            'tablas_normativas', COALESCE(v_item->'normative_tables', '[]'::jsonb)
          ))
        );
        v_reform_groups := jsonb_set(v_reform_groups, ARRAY[v_grp_key], v_grp);
      END IF;

      IF jsonb_typeof(v_item->'reformas_adicionales') = 'array' THEN
        FOR v_extra_ref IN SELECT * FROM jsonb_array_elements(v_item->'reformas_adicionales') LOOP
          v_target_norm_code_text := upper(COALESCE(
            NULLIF(btrim(COALESCE(v_extra_ref->>'reforma_norma_objetivo', v_extra_ref->>'reforms_target_norm_code', '')), ''),
            NULLIF(btrim(COALESCE(v_item->>'reforms_target_norm_code', '')), '')
          ));
          IF v_target_norm_code_text = 'RLRTI' THEN v_target_norm_code_text := 'RALRTI'; END IF;
          v_target_art_id_text := NULLIF(btrim(COALESCE(v_extra_ref->>'reforma_articulo_objetivo', v_extra_ref->>'reforms_target_article_identifier', '')), '');
          IF v_target_norm_code_text IS NOT NULL AND v_target_art_id_text IS NOT NULL
             AND NULLIF(btrim(COALESCE(v_extra_ref->>'texto_consolidado_post_reforma', v_extra_ref->>'reformed_target_content', '')), '') IS NOT NULL THEN
            v_grp_key := v_target_norm_code_text || '::' || lower(v_target_art_id_text);
            v_grp := COALESCE(v_reform_groups->v_grp_key, jsonb_build_object(
              'target_norm_code', v_target_norm_code_text,
              'target_norm_name', v_target_norm_code_text,
              'target_article_id', v_target_art_id_text,
              'new_title', COALESCE(v_extra_ref->>'reforma_titulo_consolidado', v_extra_ref->>'reformed_target_title'),
              'change_type', COALESCE(NULLIF(COALESCE(v_extra_ref->>'reforma_tipo_cambio', v_extra_ref->>'reform_change_type'), ''), 'added'),
              'reform_source_cite', COALESCE(NULLIF(v_item->>'reform_source_cite', ''), p_version_title),
              'official_registry', COALESCE(NULLIF(v_item->>'official_registry', ''), p_version_title),
              'valid_until', v_art_valid_until,
              'vertical_concepts', COALESCE(v_item->'vertical_concepts', '[]'::jsonb),
              'operations', '[]'::jsonb
            ));
            v_grp := jsonb_set(
              v_grp,
              '{operations}',
              (v_grp->'operations') || jsonb_build_array(jsonb_build_object(
                'tipo_operacion', CASE WHEN COALESCE(v_extra_ref->>'reforma_tipo_cambio', v_extra_ref->>'reform_change_type', 'added') = 'repealed' THEN 'repeal_article' ELSE 'replace_article_full' END,
                'texto_literal_nuevo', COALESCE(v_extra_ref->>'texto_consolidado_post_reforma', v_extra_ref->>'reformed_target_content'),
                'resumen_reforma', COALESCE(NULLIF(COALESCE(v_extra_ref->>'resumen_reforma', v_extra_ref->>'summary_change'), ''), v_item->>'summary_change', 'Reforma publicada en Registro Oficial'),
                'modifying_structure_id', v_art_id,
                '_emitter_norm_id', v_norm_id,
                '_emitter_norm_code', v_clean_norm_code,
                '_emitter_norm_title', p_version_title,
                '_emitter_structure_id', v_art_id,
                'tablas_normativas', COALESCE(v_extra_ref->'tablas_normativas', v_extra_ref->'normative_tables', '[]'::jsonb)
              ))
            );
            v_reform_groups := jsonb_set(v_reform_groups, ARRAY[v_grp_key], v_grp);
          END IF;
        END LOOP;
      END IF;
    END IF;

    IF jsonb_typeof(v_item->'vertical_concepts') = 'array' THEN
      FOR v_concept_code IN SELECT jsonb_array_elements_text(v_item->'vertical_concepts') LOOP
        SELECT id INTO v_concept_id FROM public.tax_concepts WHERE code = upper(btrim(v_concept_code)) LIMIT 1;
        IF v_concept_id IS NOT NULL THEN
          INSERT INTO public.structure_tax_concepts (structure_id, tax_concept_id, relevance_role, review_status, extraction_run_id)
          VALUES (v_art_id, v_concept_id, 'primary', 'approved', v_run_id)
          ON CONFLICT (structure_id, tax_concept_id) DO NOTHING;
        END IF;
      END LOOP;
    END IF;

    IF NOT v_did_queue_reform AND jsonb_typeof(v_item->'normative_tables') = 'array' THEN
      FOR v_tbl IN SELECT * FROM jsonb_array_elements(v_item->'normative_tables') LOOP
        v_tbl_valid_from := COALESCE(NULLIF(btrim(COALESCE(v_tbl->>'valid_from', '')), '')::date, v_art_valid_from, v_pub_date);
        v_tbl_valid_until := NULLIF(btrim(COALESCE(v_tbl->>'valid_until', '')), '')::date;
        INSERT INTO public.normative_tables (
          code, title, description, norm_id, norm_version_id, structure_id,
          tax_concept_id, table_category, fiscal_year, effective_during,
          columns_schema, rows_data, markdown_content, extraction_run_id, review_status, metadata
        )
        VALUES (
          COALESCE(NULLIF(btrim(COALESCE(v_tbl->>'code', '')), ''), 'TBL_' || v_clean_norm_code || '_' || regexp_replace(v_ident, '[^A-Za-z0-9_]', '_', 'g') || '_' || EXTRACT(YEAR FROM v_tbl_valid_from)::text),
          COALESCE(NULLIF(v_tbl->>'titulo_tabla', ''), v_tbl->>'title', 'Tabla Art. ' || v_ident),
          COALESCE(NULLIF(v_tbl->>'descripcion', ''), v_tbl->>'description', 'Extraída del Art. ' || v_ident || ' (' || v_clean_norm_code || ')'),
          v_norm_id, v_version_id, v_art_id, v_tarifas_concept_id,
          CASE WHEN COALESCE(v_tbl->>'categoria_tabla', v_tbl->>'table_category', 'other') IN ('progressive_rates','withholding_rates','specific_rates','rimpe','dividends','inheritance','ice','depreciation','deadlines','other') THEN COALESCE(v_tbl->>'categoria_tabla', v_tbl->>'table_category', 'other') ELSE 'other' END,
          COALESCE(NULLIF(btrim(COALESCE(v_tbl->>'fiscal_year', '')), '')::int4, EXTRACT(YEAR FROM v_tbl_valid_from)::int4),
          daterange(v_tbl_valid_from, v_tbl_valid_until, '[)'),
          COALESCE(v_tbl->'columns_schema', '[]'::jsonb),
          COALESCE(v_tbl->'rows_data', '[]'::jsonb),
          public.render_normative_table_markdown(v_tbl),
          v_run_id,
          'approved',
          jsonb_build_object(
            'article_structure_id', v_art_id,
            'article_identifier', v_ident,
            'emitter_norm_id', v_norm_id,
            'emitter_norm_code', v_clean_norm_code,
            'emitter_norm_title', p_version_title,
            'emitter_structure_id', v_art_id
          )
        )
        ON CONFLICT (code) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          fiscal_year = EXCLUDED.fiscal_year,
          effective_during = EXCLUDED.effective_during,
          rows_data = EXCLUDED.rows_data,
          columns_schema = EXCLUDED.columns_schema,
          markdown_content = EXCLUDED.markdown_content,
          metadata = COALESCE(public.normative_tables.metadata, '{}'::jsonb) || EXCLUDED.metadata,
          updated_at = now();
        v_inserted_tables := v_inserted_tables + 1;
      END LOOP;
    END IF;

    IF jsonb_typeof(v_item->'detected_relations') = 'array' THEN
      FOR v_rel IN SELECT * FROM jsonb_array_elements(v_item->'detected_relations') LOOP
        v_cited_raw := btrim(COALESCE(v_rel->>'norma_citada', ''));
        IF v_cited_raw <> '' THEN
          v_cited_norm_code := CASE
            WHEN lower(v_cited_raw) ~ 'reglamento.*(lrti|r[ée]gimen tributario interno)' OR upper(v_cited_raw) IN ('RLRTI', 'RALRTI') THEN 'RALRTI'
            WHEN lower(v_cited_raw) ~ 'reglamento.*ruc' OR upper(v_cited_raw) = 'RALRUC' THEN 'RALRUC'
            WHEN lower(v_cited_raw) ~ 'ley.*r[ée]gimen tributario interno' OR upper(v_cited_raw) = 'LRTI' THEN 'LRTI'
            WHEN lower(v_cited_raw) ~ 'c[óo]digo.*tributario' OR upper(v_cited_raw) = 'CT' THEN 'CT'
            WHEN lower(v_cited_raw) ~ 'equidad tributaria' THEN 'LEY-2007-242'
            WHEN upper(v_cited_raw) ~ '(NAC-[A-Z0-9-]+)' THEN (regexp_match(upper(v_cited_raw), '(NAC-[A-Z0-9-]+)'))[1]
            WHEN lower(v_cited_raw) ~ 'decreto ejecutivo\s*(?:no\.?|n[úu]mero)?\s*(\d+)' THEN 'DE-' || (regexp_match(lower(v_cited_raw), 'decreto ejecutivo\s*(?:no\.?|n[úu]mero)?\s*(\d+)'))[1]
            ELSE upper(v_cited_raw)
          END;

          SELECT id INTO v_target_norm_id
          FROM public.norms
          WHERE upper(code) = v_cited_norm_code
             OR lower(name) = lower(v_cited_raw)
             OR lower(short_name) = lower(v_cited_raw)
          LIMIT 1;

          v_target_struct_id := NULL;
          IF v_target_norm_id IS NOT NULL THEN
            v_cited_art_ident := regexp_replace(btrim(COALESCE(v_rel->>'articulo_citado', '')), '^(?:art(?:[íi]culo|\.)?\s*)+', '', 'i');
            v_cited_art_ident := regexp_replace(v_cited_art_ident, '[^0-9A-Za-z.-]', '', 'g');
            IF v_cited_art_ident <> '' THEN
              SELECT ns.id INTO v_target_struct_id
              FROM public.normative_structures ns
              JOIN public.norm_versions nv ON nv.id = ns.norm_version_id
              WHERE nv.norm_id = v_target_norm_id
                AND lower(btrim(ns.identifier)) = lower(v_cited_art_ident)
                AND ns.structure_type IN ('article','transitory','final','reform','other')
              ORDER BY ns.is_current DESC, nv.version_number DESC
              LIMIT 1;
            END IF;
            IF v_target_struct_id IS NULL THEN
              SELECT ns.id INTO v_target_struct_id
              FROM public.normative_structures ns
              JOIN public.norm_versions nv ON nv.id = ns.norm_version_id
              WHERE nv.norm_id = v_target_norm_id
                AND ns.structure_type IN ('article','transitory','final','reform','other')
              ORDER BY ns.is_current DESC, ns.ordinal ASC
              LIMIT 1;
            END IF;
          END IF;

          IF v_target_struct_id IS NOT NULL AND v_target_struct_id <> v_art_id THEN
            IF NOT EXISTS (
              SELECT 1 FROM public.structure_relations sr
              WHERE (sr.source_structure_id = v_target_struct_id AND sr.target_structure_id = v_art_id)
                 OR (sr.source_structure_id = v_art_id AND sr.target_structure_id = v_target_struct_id)
            ) THEN
              INSERT INTO public.structure_relations (
                source_structure_id, target_structure_id, relation_type, description, extraction_run_id, review_status, metadata
              )
              VALUES (
                v_target_struct_id, v_art_id,
                CASE WHEN COALESCE(v_rel->>'tipo_relacion', 'cites') IN ('amends','repeals','cites','clarifies','regulated_by') THEN COALESCE(v_rel->>'tipo_relacion', 'cites') ELSE 'cites' END,
                COALESCE(v_rel->>'descripcion', 'Concordancia con ' || v_clean_norm_code),
                v_run_id, 'approved',
                jsonb_build_object('cited_article', v_rel->>'articulo_citado')
              );
            END IF;
          END IF;
        END IF;
      END LOOP;
    END IF;
  END LOOP;

  FOR v_grp_rec IN SELECT key, value FROM jsonb_each(v_reform_groups) LOOP
    v_grp := v_grp_rec.value;
    v_target_norm_code_text := CASE WHEN upper(v_grp->>'target_norm_code') = 'RLRTI' THEN 'RALRTI' ELSE v_grp->>'target_norm_code' END;
    v_target_art_id_text := v_grp->>'target_article_id';

    SELECT id INTO v_target_norm_id FROM public.norms WHERE upper(code) = upper(v_target_norm_code_text) LIMIT 1;

    IF v_target_norm_id IS NOT NULL THEN
      v_reformed_struct_id := public.apply_official_registry_reform(
        p_target_norm_code := v_target_norm_code_text,
        p_target_article_identifier := v_target_art_id_text,
        p_new_title := v_grp->>'new_title',
        p_new_content := NULL,
        p_effective_date := v_pub_date,
        p_valid_until := NULLIF(v_grp->>'valid_until', '')::date,
        p_change_type := COALESCE(v_grp->>'change_type', 'modified'),
        p_reform_source_cite := v_grp->>'reform_source_cite',
        p_official_registry_cite := v_grp->>'official_registry',
        p_summary_change := NULL,
        p_modifying_structure_id := NULL,
        p_source_document_id := v_doc_id,
        p_legal_status := CASE WHEN COALESCE(v_grp->>'change_type', 'modified') = 'repealed' THEN 'derogado' ELSE 'vigente_reformado' END,
        p_normative_tables := NULL,
        p_operations := v_grp->'operations'
      );

      IF v_reformed_struct_id IS NOT NULL THEN
        v_applied_reforms := v_applied_reforms + 1;
        IF jsonb_typeof(v_grp->'vertical_concepts') = 'array' THEN
          FOR v_concept_code IN SELECT jsonb_array_elements_text(v_grp->'vertical_concepts') LOOP
            SELECT id INTO v_concept_id FROM public.tax_concepts WHERE code = upper(btrim(v_concept_code)) LIMIT 1;
            IF v_concept_id IS NOT NULL THEN
              INSERT INTO public.structure_tax_concepts (structure_id, tax_concept_id, relevance_role, review_status, extraction_run_id)
              VALUES (v_reformed_struct_id, v_concept_id, 'primary', 'approved', v_run_id)
              ON CONFLICT (structure_id, tax_concept_id) DO NOTHING;
            END IF;
          END LOOP;
        END IF;
      END IF;
    ELSE
      SELECT id INTO v_discovery_id
      FROM public.norm_discovery
      WHERE upper(COALESCE(searched_code, '')) = upper(v_target_norm_code_text)
        AND discovery_status <> 'rejected'
      LIMIT 1;

      IF v_discovery_id IS NULL THEN
        INSERT INTO public.norm_discovery (
          searched_name, searched_code, reference_text, source_type, source_name, discovery_status, result_metadata
        )
        VALUES (
          COALESCE(NULLIF(v_grp->>'target_norm_name', ''), v_target_norm_code_text),
          upper(v_target_norm_code_text),
          COALESCE(v_grp->>'reform_source_cite', p_version_title),
          'official_registry_citation',
          p_version_title,
          'pending',
          jsonb_build_object(
            'modifying_norm_code', v_clean_norm_code,
            'target_article_identifier', v_target_art_id_text,
            'ro_published_on', v_pub_date
          )
        )
        RETURNING id INTO v_discovery_id;
        v_inserted_discoveries := v_inserted_discoveries + 1;
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'status', 'ok',
    'instant_published', true,
    'document_id', v_doc_id,
    'google_drive_file_id', p_google_drive_file_id,
    'storage_path', p_storage_path,
    'folder_category', p_folder_category,
    'norm_id', v_norm_id,
    'norm_code', v_clean_norm_code,
    'norm_version_id', v_version_id,
    'extraction_run_id', v_run_id,
    'articles_published', v_inserted_articles,
    'reforms_applied', v_applied_reforms,
    'normative_tables_saved', v_inserted_tables,
    'missing_norms_discovered', v_inserted_discoveries
  );
END;
$function$;

