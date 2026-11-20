-- =============================================================================
-- SmartLex Ecuador — Fase 5b: Preservar literales b, c, d en reformas parciales
-- de tabla al Art. 36 LRTI (resoluciones anuales del SRI sobre literal a)
-- =============================================================================

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
  v_target_norm_code text;
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
  v_effective_legal_status text;
  v_effective_new_content text;
  v_preserved_tail text;
  v_tbl_valid_from date;
  v_tbl_valid_until date;
BEGIN
  SELECT id, code INTO v_target_norm_id, v_target_norm_code
  FROM public.norms
  WHERE upper(code) = upper(btrim(p_target_norm_code))
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
    AND lower(btrim(ns.identifier)) = lower(btrim(p_target_article_identifier))
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

  v_art_num := NULLIF((regexp_match(btrim(COALESCE(p_target_article_identifier, '')), '^\D*(\d{1,6})'))[1], '')::int4;

  v_tax_periodicity := COALESCE(
    NULLIF(v_prev_struct.metadata->>'tax_periodicity', ''),
    CASE
      WHEN v_target_norm_code = 'LRTI' AND v_art_num IS NOT NULL AND v_art_num BETWEEN 1 AND 51 THEN 'annual'
      WHEN lower(COALESCE(p_summary_change, '') || ' ' || COALESCE(p_reform_source_cite, '') || ' ' || COALESCE(p_new_title, '')) ~ '(impuesto a la renta|ejercicio econ[oó]mico|tabla.*renta|gastos personales)' THEN 'annual'
      ELSE 'monthly'
    END
  );

  v_calc_effective_date := public.calculate_tax_effective_date(
    p_effective_date,
    v_tax_periodicity,
    v_is_fe_erratas,
    v_prev_struct.valid_from
  );

  v_effective_legal_status := CASE
    WHEN COALESCE(NULLIF(btrim(p_legal_status), ''), '') IN ('vigente', 'vigente_reformado', 'derogado')
      THEN CASE WHEN p_change_type = 'repealed' THEN 'derogado' ELSE btrim(p_legal_status) END
    WHEN p_change_type = 'repealed' THEN 'derogado'
    ELSE 'vigente_reformado'
  END;

  v_effective_new_content := COALESCE(p_new_content, '');
  -- Si una resolución anual sustituye únicamente el literal a) / tabla del Art. 36 LRTI sin reproducir b, c, d,
  -- preservamos los literales b, c, d vigentes y añadimos nota de actualización cronológica.
  IF v_prev_struct.id IS NOT NULL
     AND v_target_norm_code = 'LRTI'
     AND btrim(p_target_article_identifier) = '36'
     AND COALESCE(p_change_type, 'modified') <> 'repealed'
     AND v_effective_new_content !~ E'\\nb\\)\\s*'
     AND v_prev_struct.content ~ E'\\nb\\)\\s*' THEN
    v_preserved_tail := (regexp_match(v_prev_struct.content, E'(\\nb\\)[\\s\\S]*)$'))[1];
    IF v_preserved_tail IS NOT NULL THEN
      v_effective_new_content := rtrim(v_effective_new_content)
        || E'\n'
        || v_preserved_tail
        || CASE
             WHEN COALESCE(p_reform_source_cite, p_official_registry_cite, '') <> ''
             THEN E'\nNota: Tabla literal a) actualizada por ' || COALESCE(p_reform_source_cite, '') || COALESCE(' (' || NULLIF(p_official_registry_cite, '') || ')', '') || '.'
             ELSE ''
           END;
    END IF;
  END IF;

  SELECT id INTO v_new_version_id
  FROM public.norm_versions
  WHERE norm_id = v_target_norm_id
    AND published_on = p_effective_date
    AND title = COALESCE(NULLIF(p_reform_source_cite, ''), 'Reforma ' || p_effective_date::text)
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

    IF p_normative_tables IS NOT NULL AND jsonb_typeof(p_normative_tables) = 'array' AND jsonb_array_length(p_normative_tables) > 0 THEN
      UPDATE public.normative_tables
      SET
        is_active = false,
        effective_during = daterange(lower(effective_during), v_calc_effective_date, '[)'),
        updated_at = now()
      WHERE structure_id = v_prev_struct.id
        AND upper_inf(effective_during)
        AND v_calc_effective_date > lower(effective_during);
    END IF;
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
    btrim(p_target_article_identifier),
    COALESCE(NULLIF(p_new_title, ''), v_prev_struct.title, 'Art. ' || btrim(p_target_article_identifier)),
    v_effective_new_content,
    COALESCE(v_prev_struct.ordinal, v_art_num, 1),
    'approved',
    true,
    v_effective_legal_status,
    v_calc_effective_date,
    p_valid_until,
    COALESCE(v_prev_struct.metadata, '{}'::jsonb)
      - 'is_fe_erratas_replaced'
      - 'fe_erratas_ro_date'
      - 'validity_display_label'
      || jsonb_build_object(
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
    WHERE code IN ('TARIFA_IMPUESTO_RENTA', 'TARIFAS')
    ORDER BY CASE WHEN code = 'TARIFA_IMPUESTO_RENTA' THEN 0 ELSE 1 END
    LIMIT 1;

    FOR v_tbl IN SELECT * FROM jsonb_array_elements(p_normative_tables)
    LOOP
      v_tbl_valid_from := COALESCE(
        NULLIF(btrim(COALESCE(v_tbl->>'valid_from', '')), '')::date,
        v_calc_effective_date
      );
      v_tbl_valid_until := NULLIF(btrim(COALESCE(v_tbl->>'valid_until', '')), '')::date;

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
        COALESCE(
          NULLIF(btrim(COALESCE(v_tbl->>'code', '')), ''),
          'TBL_' || v_target_norm_code || '_' || regexp_replace(btrim(p_target_article_identifier), '[^A-Za-z0-9_]', '_', 'g') || '_' || EXTRACT(YEAR FROM v_tbl_valid_from)::text
        ),
        COALESCE(NULLIF(v_tbl->>'titulo_tabla', ''), v_tbl->>'title', 'Tabla Art. ' || btrim(p_target_article_identifier)),
        COALESCE(NULLIF(v_tbl->>'descripcion', ''), v_tbl->>'description', 'Extraída del Art. ' || btrim(p_target_article_identifier) || ' (' || v_target_norm_code || ')'),
        v_target_norm_id,
        v_new_version_id,
        v_new_struct_id,
        v_tarifas_concept_id,
        CASE
          WHEN COALESCE(v_tbl->>'categoria_tabla', v_tbl->>'table_category', 'other') IN ('progressive_rates','withholding_rates','specific_rates','rimpe','dividends','inheritance','ice','depreciation','deadlines','other')
          THEN COALESCE(v_tbl->>'categoria_tabla', v_tbl->>'table_category', 'other')
          ELSE 'progressive_rates'
        END,
        COALESCE(NULLIF(btrim(COALESCE(v_tbl->>'fiscal_year', '')), '')::int4, EXTRACT(YEAR FROM v_tbl_valid_from)::int4),
        daterange(v_tbl_valid_from, v_tbl_valid_until, '[)'),
        COALESCE(v_tbl->'columns_schema', '[]'::jsonb),
        COALESCE(v_tbl->'rows_data', '[]'::jsonb),
        COALESCE(v_tbl->>'markdown_tabla', v_tbl->>'markdown_content'),
        'approved'
      )
      ON CONFLICT (code) DO UPDATE
      SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        norm_id = EXCLUDED.norm_id,
        structure_id = EXCLUDED.structure_id,
        norm_version_id = EXCLUDED.norm_version_id,
        fiscal_year = EXCLUDED.fiscal_year,
        effective_during = EXCLUDED.effective_during,
        rows_data = EXCLUDED.rows_data,
        columns_schema = EXCLUDED.columns_schema,
        markdown_content = EXCLUDED.markdown_content,
        review_status = 'approved',
        is_active = true,
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
    v_effective_new_content,
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

