-- =============================================================================
-- SmartLex Ecuador — Fase 6: Ingesta Automática por Bloques + Cronología Exacta
-- =============================================================================
-- 1. Incorpora al Eje Vertical (public.tax_concepts) los conceptos clave de la
--    Ley Reformatoria para la Equidad Tributaria (RISE, ISD, ICE, CREDITO_TRIBUTARIO_IVA).
-- 2. Desactiva identificadores compuestos malformados ('36.a, 36.d', '9, 10, 36',
--    '9.12, 10.9, 36.d') de pruebas previas para mantener limpio el índice de LRTI.
-- 3. Mejora apply_official_registry_reform() para:
--    - Normalizar identificadores con literales (ej. '36.a' -> '36') preservando
--      artículos innumerados/agregados numéricos (ej. '97.1' a '97.15' del RISE).
--    - Ser 100 % idempotente por (p_modifying_structure_id, v_target_norm_id, v_clean_target_id)
--      para permitir reprocesamientos por bloques sin duplicar versiones.
--    - Insertar reformas respetando el orden cronológico real (valid_from), tanto si
--      el PDF entra en orden cronológico como si se reprocesa un Registro Oficial
--      anterior a otros ya cargados.
--    - Asignar automáticamente parent_title en artículos nuevos agregados a la LRTI
--      (como el Título Cuarto del RISE: Arts. 97.1 a 97.15).
-- 4. Mejora ingest_extracted_norm_draft() para:
--    - Acumular bloques sucesivos de un mismo documento y norma sobre la misma
--      norm_version activa (en lugar de abortar con 'already_ingested' en el Bloque 2).
--    - Hacer upsert por artículo dentro de la versión para evitar duplicados.
--    - Soportar tanto reforma principal como el array 'reformas_adicionales' cuando
--      un artículo reformatorio agrega o modifica múltiples artículos objetivo.
--    - Propagar los conceptos verticales tanto al artículo reformatorio como al
--      artículo resultante en la norma objetivo (LRTI / CT).
-- =============================================================================

-- 1. Asegurar conceptos tributarios en el Eje Vertical
INSERT INTO public.tax_concepts (code, name, description, concept_type, is_active)
VALUES
  ('RISE', 'RISE (Régimen Impositivo Simplificado)', 'Régimen Impositivo Simplificado Ecuatoriano (Arts. 97.1 a 97.15 LRTI): inscripción voluntaria, categorización y cuotas mensuales', 'tax', true),
  ('ISD', 'ISD (Impuesto a la Salida de Divisas)', 'Impuesto a la Salida de Divisas sobre transferencias, envíos o traslados de divisas al exterior', 'tax', true),
  ('CREDITO_TRIBUTARIO_IVA', 'Crédito Tributario de IVA', 'Uso, factor de proporcionalidad y devolución del crédito tributario del Impuesto al Valor Agregado', 'credit', true),
  ('ICE', 'ICE (Impuesto a los Consumos Especiales)', 'Hecho generador, base imponible y tarifas del Impuesto a los Consumos Especiales', 'tax', true)
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = true,
  updated_at = now();

-- 2. Desactivar identificadores compuestos malformados en LRTI
UPDATE public.normative_structures ns
SET is_current = false, updated_at = now()
FROM public.norm_versions nv
JOIN public.norms n ON n.id = nv.norm_id
WHERE ns.norm_version_id = nv.id
  AND n.code = 'LRTI'
  AND ns.identifier LIKE '%,%'
  AND ns.is_current = true;

-- 3. Actualizar apply_official_registry_reform (14 parámetros)
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
  v_clean_target_id text;
  v_existing_reformed_id uuid;
  v_prev_struct record;
  v_next_struct record;
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
  v_inferred_parent_title text;
  v_new_is_current boolean;
  v_new_valid_until date;
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

  -- Normalizar el identificador de artículo objetivo:
  -- Quitar prefijo "Art." / "Artículo" y sufijos de literales como ".a", ".d", "literal a)"
  -- preservando numeración decimal de artículos innumerados/agregados como "97.1", "97.15", "10.1"
  v_clean_target_id := btrim(COALESCE(p_target_article_identifier, ''));
  v_clean_target_id := regexp_replace(v_clean_target_id, '^(?:art(?:[íi]culo|\.)?\s*)+', '', 'i');
  v_clean_target_id := regexp_replace(v_clean_target_id, '(?:\.[a-zA-Z]+|\s+(?:literal|inciso|numeral|ordinal|p[aá]rrafo)\b.*)$', '', 'i');
  v_clean_target_id := btrim(v_clean_target_id, ' :.-');

  IF v_clean_target_id = '' THEN
    v_clean_target_id := btrim(COALESCE(p_target_article_identifier, '1'));
  END IF;

  -- Idempotencia: si la misma estructura modificadora (p_modifying_structure_id) ya reformó
  -- este mismo artículo objetivo en esta norma, reutilizar el registro existente sin duplicar.
  IF p_modifying_structure_id IS NOT NULL THEN
    SELECT ns.id, ns.norm_version_id, ns.valid_from
    INTO v_existing_reformed_id, v_new_version_id, v_calc_effective_date
    FROM public.structure_relations sr
    JOIN public.normative_structures ns ON ns.id = sr.source_structure_id
    JOIN public.norm_versions nv ON nv.id = ns.norm_version_id
    WHERE sr.target_structure_id = p_modifying_structure_id
      AND nv.norm_id = v_target_norm_id
      AND lower(btrim(ns.identifier)) = lower(v_clean_target_id)
    ORDER BY ns.created_at DESC
    LIMIT 1;

    IF v_existing_reformed_id IS NOT NULL THEN
      -- Si aporta tablas normativas, asegurar su upsert y retornar
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
            code, title, description, norm_id, norm_version_id, structure_id,
            tax_concept_id, table_category, fiscal_year, effective_during,
            columns_schema, rows_data, markdown_content, review_status
          )
          VALUES (
            COALESCE(
              NULLIF(btrim(COALESCE(v_tbl->>'code', '')), ''),
              'TBL_' || v_target_norm_code || '_' || regexp_replace(v_clean_target_id, '[^A-Za-z0-9_]', '_', 'g') || '_' || EXTRACT(YEAR FROM v_tbl_valid_from)::text
            ),
            COALESCE(NULLIF(v_tbl->>'titulo_tabla', ''), v_tbl->>'title', 'Tabla Art. ' || v_clean_target_id),
            COALESCE(NULLIF(v_tbl->>'descripcion', ''), v_tbl->>'description', 'Extraída del Art. ' || v_clean_target_id || ' (' || v_target_norm_code || ')'),
            v_target_norm_id,
            v_new_version_id,
            v_existing_reformed_id,
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

      RETURN v_existing_reformed_id;
    END IF;
  END IF;

  v_is_fe_erratas := (
    lower(
      COALESCE(p_reform_source_cite, '') || ' ' ||
      COALESCE(p_official_registry_cite, '') || ' ' ||
      COALESCE(p_summary_change, '')
    ) LIKE '%errata%'
  );

  v_art_num := NULLIF((regexp_match(v_clean_target_id, '^\D*(\d{1,6})'))[1], '')::int4;

  -- Determinar periodicidad preliminar para calcular v_calc_effective_date según Art. 11 CT
  v_tax_periodicity := CASE
    WHEN v_target_norm_code = 'LRTI' AND v_art_num IS NOT NULL AND v_art_num BETWEEN 1 AND 51 THEN 'annual'
    WHEN lower(COALESCE(p_summary_change, '') || ' ' || COALESCE(p_reform_source_cite, '') || ' ' || COALESCE(p_new_title, '')) ~ '(impuesto a la renta|ejercicio econ[oó]mico|tabla.*renta|gastos personales)' THEN 'annual'
    ELSE 'monthly'
  END;

  v_calc_effective_date := public.calculate_tax_effective_date(
    p_effective_date,
    v_tax_periodicity,
    v_is_fe_erratas,
    p_effective_date
  );

  -- Buscar la versión cronológicamente inmediata anterior (valid_from <= v_calc_effective_date)
  SELECT ns.*, nv.version_number
  INTO v_prev_struct
  FROM public.normative_structures ns
  JOIN public.norm_versions nv ON nv.id = ns.norm_version_id
  WHERE nv.norm_id = v_target_norm_id
    AND ns.structure_type IN ('article', 'transitory', 'final')
    AND lower(btrim(ns.identifier)) = lower(v_clean_target_id)
    AND COALESCE(ns.valid_from, '0001-01-01'::date) <= v_calc_effective_date
  ORDER BY COALESCE(ns.valid_from, '0001-01-01'::date) DESC, nv.version_number DESC, ns.created_at DESC
  LIMIT 1;

  -- Si no había ninguna versión anterior o igual a v_calc_effective_date, buscar si existe alguna versión posterior
  SELECT ns.*, nv.version_number
  INTO v_next_struct
  FROM public.normative_structures ns
  JOIN public.norm_versions nv ON nv.id = ns.norm_version_id
  WHERE nv.norm_id = v_target_norm_id
    AND ns.structure_type IN ('article', 'transitory', 'final')
    AND lower(btrim(ns.identifier)) = lower(v_clean_target_id)
    AND ns.valid_from > v_calc_effective_date
    AND NOT COALESCE((ns.metadata->>'is_fe_erratas_replaced')::boolean, false)
  ORDER BY ns.valid_from ASC, nv.version_number ASC, ns.created_at ASC
  LIMIT 1;

  IF v_prev_struct.id IS NOT NULL AND v_is_fe_erratas THEN
    v_calc_effective_date := public.calculate_tax_effective_date(
      p_effective_date,
      v_tax_periodicity,
      true,
      v_prev_struct.valid_from
    );
  END IF;

  v_effective_legal_status := CASE
    WHEN COALESCE(NULLIF(btrim(p_legal_status), ''), '') IN ('vigente', 'vigente_reformado', 'derogado')
      THEN CASE WHEN p_change_type = 'repealed' THEN 'derogado' ELSE btrim(p_legal_status) END
    WHEN p_change_type = 'repealed' THEN 'derogado'
    ELSE 'vigente_reformado'
  END;

  v_effective_new_content := COALESCE(p_new_content, '');
  -- Preservar literales b, c, d del Art. 36 LRTI si una reforma/resolución solo actualiza literal a)
  IF v_prev_struct.id IS NOT NULL
     AND v_target_norm_code = 'LRTI'
     AND v_clean_target_id = '36'
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

  -- Determinar si esta versión es la más reciente (is_current = true) o si se inserta en un hueco histórico
  IF v_next_struct.id IS NULL THEN
    v_new_is_current := true;
    v_new_valid_until := p_valid_until;
  ELSE
    v_new_is_current := false;
    v_new_valid_until := COALESCE(p_valid_until, (v_next_struct.valid_from - INTERVAL '1 day')::date);
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
      daterange(v_calc_effective_date, v_new_valid_until, '[)'),
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

  -- Actualizar la versión inmediatamente anterior (v_prev_struct)
  IF v_prev_struct.id IS NOT NULL THEN
    UPDATE public.normative_structures
    SET
      is_current = CASE WHEN v_new_is_current THEN false ELSE is_current END,
      valid_until = CASE
        WHEN v_is_fe_erratas THEN COALESCE(valid_until, (p_effective_date - INTERVAL '1 day')::date)
        WHEN v_calc_effective_date > COALESCE(valid_from, '0001-01-01'::date)
          AND (valid_until IS NULL OR valid_until >= v_calc_effective_date)
          THEN (v_calc_effective_date - INTERVAL '1 day')::date
        ELSE COALESCE(valid_until, valid_from)
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

    -- Si v_new_is_current es true, asegurar que ninguna otra versión de este artículo quede con is_current = true
    IF v_new_is_current THEN
      UPDATE public.normative_structures ns
      SET is_current = false, updated_at = now()
      FROM public.norm_versions nv
      WHERE ns.norm_version_id = nv.id
        AND nv.norm_id = v_target_norm_id
        AND ns.structure_type IN ('article', 'transitory', 'final')
        AND lower(btrim(ns.identifier)) = lower(v_clean_target_id)
        AND ns.is_current = true;
    END IF;

    IF p_normative_tables IS NOT NULL AND jsonb_typeof(p_normative_tables) = 'array' AND jsonb_array_length(p_normative_tables) > 0 THEN
      UPDATE public.normative_tables
      SET
        is_active = CASE WHEN v_new_is_current THEN false ELSE is_active END,
        effective_during = daterange(lower(effective_during), v_calc_effective_date, '[)'),
        updated_at = now()
      WHERE structure_id = v_prev_struct.id
        AND (upper_inf(effective_during) OR upper(effective_during) > v_calc_effective_date)
        AND v_calc_effective_date > lower(effective_during);
    END IF;
  END IF;

  -- Inferir parent_title para artículos nuevos agregados a la LRTI (ej. RISE Arts. 97.1 a 97.15)
  v_inferred_parent_title := COALESCE(
    NULLIF(v_prev_struct.metadata->>'parent_title', ''),
    CASE
      WHEN v_target_norm_code = 'LRTI' AND (v_clean_target_id LIKE '97.%' OR lower(COALESCE(p_new_title, '') || ' ' || COALESCE(p_summary_change, '')) ~ '(rise|r[eé]gimen impositivo simplificado)')
        THEN 'TÍTULO CUARTO: DEL RÉGIMEN IMPOSITIVO SIMPLIFICADO (RISE)'
      WHEN v_target_norm_code = 'LRTI' AND v_art_num BETWEEN 1 AND 51
        THEN 'TÍTULO PRIMERO: IMPUESTO A LA RENTA'
      WHEN v_target_norm_code = 'LRTI' AND v_art_num BETWEEN 52 AND 74
        THEN 'TÍTULO SEGUNDO: IMPUESTO AL VALOR AGREGADO'
      WHEN v_target_norm_code = 'LRTI' AND v_art_num BETWEEN 75 AND 88
        THEN 'TÍTULO TERCERO: IMPUESTO A LOS CONSUMOS ESPECIALES'
      WHEN v_target_norm_code = 'LRTI'
        THEN 'TÍTULO CUARTO: RÉGIMEN TRIBUTARIO INTERNO'
      ELSE NULL
    END
  );

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
    v_clean_target_id,
    COALESCE(NULLIF(p_new_title, ''), v_prev_struct.title, 'Art. ' || v_clean_target_id),
    v_effective_new_content,
    COALESCE(v_prev_struct.ordinal, v_art_num, 1),
    'approved',
    v_new_is_current,
    v_effective_legal_status,
    v_calc_effective_date,
    v_new_valid_until,
    COALESCE(v_prev_struct.metadata, '{}'::jsonb)
      - 'is_fe_erratas_replaced'
      - 'fe_erratas_ro_date'
      - 'validity_display_label'
      || jsonb_build_object(
        'parent_title', v_inferred_parent_title,
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
      v_tbl_valid_until := COALESCE(
        NULLIF(btrim(COALESCE(v_tbl->>'valid_until', '')), '')::date,
        CASE WHEN v_next_struct.id IS NOT NULL THEN v_next_struct.valid_from ELSE NULL END
      );

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
          'TBL_' || v_target_norm_code || '_' || regexp_replace(v_clean_target_id, '[^A-Za-z0-9_]', '_', 'g') || '_' || EXTRACT(YEAR FROM v_tbl_valid_from)::text
        ),
        COALESCE(NULLIF(v_tbl->>'titulo_tabla', ''), v_tbl->>'title', 'Tabla Art. ' || v_clean_target_id),
        COALESCE(NULLIF(v_tbl->>'descripcion', ''), v_tbl->>'description', 'Extraída del Art. ' || v_clean_target_id || ' (' || v_target_norm_code || ')'),
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

-- 4. Actualizar ingest_extracted_norm_draft (15 parámetros, soporte incremental por bloques)
CREATE OR REPLACE FUNCTION public.ingest_extracted_norm_draft(
  p_document_id uuid DEFAULT NULL::uuid,
  p_norm_code text DEFAULT 'LRTI'::text,
  p_version_title text DEFAULT 'Versión Extraída por IA'::text,
  p_published_on date DEFAULT NULL::date,
  p_model text DEFAULT 'gemini-2.5-flash'::text,
  p_articles jsonb DEFAULT '[]'::jsonb,
  p_google_drive_file_id text DEFAULT NULL::text,
  p_google_drive_path text DEFAULT NULL::text,
  p_storage_bucket text DEFAULT 'legal-documents'::text,
  p_storage_path text DEFAULT NULL::text,
  p_folder_category text DEFAULT '00_registros_oficiales'::text,
  p_file_name text DEFAULT NULL::text,
  p_sha256 text DEFAULT NULL::text,
  p_file_size bigint DEFAULT NULL::bigint,
  p_source_url text DEFAULT NULL::text
)
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
  v_clean_norm_code text := upper(btrim(COALESCE(NULLIF(p_norm_code, ''), 'NORMA')));
  v_first_art jsonb;
  v_item jsonb;
  v_extra_ref jsonb;
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
  v_target_norm_code_text text;
  v_target_art_id_text text;
  v_target_norm_id uuid;
  v_target_struct_id uuid;
  v_reformed_struct_id uuid;
  v_extra_reformed_id uuid;
  v_discovery_id uuid;
  v_did_apply_reform boolean;
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
BEGIN
  IF jsonb_typeof(p_articles) = 'array' AND jsonb_array_length(p_articles) > 0 THEN
    v_first_art := p_articles->0;
  ELSE
    v_first_art := '{}'::jsonb;
  END IF;

  CASE COALESCE(p_folder_category, '00_registros_oficiales')
    WHEN '00_registros_oficiales' THEN
      IF COALESCE(v_first_art->>'normative_type', '') IN ('constitution','law','organic_law','regulation','decree','resolution','ordinance','circular','agreement','other') THEN
        v_norm_type := v_first_art->>'normative_type';
      ELSIF v_clean_norm_code ~ '^(REG|REGLAMENTO|RALRTI|RLRTI)' OR lower(COALESCE(p_version_title, '')) LIKE '%reglamento%' THEN
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
    WHEN '01_codigos' THEN
      v_norm_type := 'organic_law';
      v_feature_code := 'norms_laws';
    WHEN '02_leyes' THEN
      v_norm_type := 'law';
      v_feature_code := 'norms_laws';
    WHEN '03_reglamentos' THEN
      v_norm_type := 'regulation';
      v_feature_code := 'norms_regulations';
    WHEN '04_leyes_reformas' THEN
      v_norm_type := 'law';
      v_feature_code := 'norms_historical';
    WHEN '05_resoluciones_sri' THEN
      v_norm_type := 'resolution';
      v_feature_code := 'norms_resolutions';
    WHEN '06_circulares_sri' THEN
      v_norm_type := 'circular';
      v_feature_code := 'norms_resolutions';
    WHEN '07_formularios_anexos' THEN
      v_norm_type := 'other';
      v_feature_code := 'forms';
    ELSE
      v_norm_type := 'law';
      v_feature_code := 'norms_laws';
  END CASE;

  SELECT id INTO v_feature_id
  FROM public.features
  WHERE code = v_feature_code
  LIMIT 1;

  -- 0. Resolver o registrar el documento fuente
  v_doc_id := p_document_id;

  IF v_doc_id IS NULL AND NULLIF(btrim(COALESCE(p_google_drive_file_id, '')), '') IS NOT NULL THEN
    SELECT id INTO v_doc_id
    FROM public.documents
    WHERE google_drive_file_id = btrim(p_google_drive_file_id)
    LIMIT 1;
  END IF;

  IF v_doc_id IS NULL AND NULLIF(btrim(COALESCE(p_sha256, '')), '') IS NOT NULL THEN
    SELECT id INTO v_doc_id
    FROM public.documents
    WHERE sha256 = btrim(p_sha256)
    LIMIT 1;
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
      file_name,
      mime_type,
      file_size,
      sha256,
      storage_bucket,
      storage_path,
      google_drive_file_id,
      google_drive_path,
      source_url,
      status,
      uploaded_at,
      processed_at,
      extraction_model,
      extraction_version,
      raw_metadata
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
      'v4.0-block-ingestion',
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

  -- 1. Obtener o crear automáticamente la norma en public.norms
  SELECT id INTO v_norm_id
  FROM public.norms
  WHERE upper(code) = v_clean_norm_code
  LIMIT 1;

  IF v_norm_id IS NULL THEN
    INSERT INTO public.norms (
      code,
      name,
      short_name,
      normative_type,
      issuing_entity,
      publication_date,
      access_feature_id,
      repository_status,
      metadata
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
        'storage_path', COALESCE(p_storage_path, COALESCE(p_folder_category, '00_registros_oficiales') || '/' || COALESCE(p_file_name, v_clean_norm_code || '.pdf'))
      )
    )
    RETURNING id INTO v_norm_id;
  ELSE
    UPDATE public.norms
    SET
      repository_status = 'loaded',
      updated_at = now()
    WHERE id = v_norm_id;
  END IF;

  SELECT id INTO v_tarifas_concept_id
  FROM public.tax_concepts
  WHERE code IN ('TARIFA_IMPUESTO_RENTA', 'TARIFAS')
  ORDER BY CASE WHEN code = 'TARIFA_IMPUESTO_RENTA' THEN 0 ELSE 1 END
  LIMIT 1;

  -- 2. Registrar la ejecución en extraction_runs
  INSERT INTO public.extraction_runs (
    document_id, model, extraction_version, status, prompt_version, started_at, finished_at, result_metadata
  )
  VALUES (
    v_doc_id,
    p_model,
    'v4.0-block-ingestion',
    'completed',
    'smartlex-ec-juridico-v4.0-blocks',
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

  -- 3. Reutilizar la versión activa de este documento si ya existe (para acumular bloques),
  --    o crear una nueva versión activa si es el primer bloque.
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

  -- 4. Recorrer los artículos del bloque e insertar/actualizar jerarquía (Título -> Capítulo -> Artículo)
  FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(p_articles, '[]'::jsonb))
  LOOP
    v_title_id := NULL;
    v_chapter_id := NULL;
    v_reformed_struct_id := NULL;
    v_did_apply_reform := false;

    v_title_text := NULLIF(btrim(COALESCE(v_item->>'parent_title', '')), '');
    v_chapter_text := NULLIF(btrim(COALESCE(v_item->>'parent_chapter', '')), '');

    v_art_valid_from := COALESCE(
      NULLIF(btrim(COALESCE(v_item->>'valid_from', '')), '')::date,
      v_pub_date
    );
    v_art_valid_until := NULLIF(btrim(COALESCE(v_item->>'valid_until', '')), '')::date;
    v_tax_periodicity := COALESCE(NULLIF(btrim(COALESCE(v_item->>'tax_periodicity', '')), ''), 'monthly');

    IF v_title_text IS NOT NULL AND upper(v_title_text) <> 'SIN TÍTULO' THEN
      SELECT id INTO v_title_id
      FROM public.normative_structures
      WHERE norm_version_id = v_version_id
        AND structure_type = 'title'
        AND title = v_title_text
      LIMIT 1;

      IF v_title_id IS NULL THEN
        v_ordinal := v_ordinal + 1;
        INSERT INTO public.normative_structures (
          norm_version_id, parent_id, structure_type, identifier, title, content,
          ordinal, review_status, is_current, legal_status, valid_from, extraction_run_id
        )
        VALUES (
          v_version_id, NULL, 'title', v_title_text, v_title_text, NULL,
          v_ordinal, 'approved', true, 'vigente', v_pub_date, v_run_id
        )
        RETURNING id INTO v_title_id;
      END IF;
    END IF;

    IF v_chapter_text IS NOT NULL AND upper(v_chapter_text) <> 'SIN CAPÍTULO' THEN
      SELECT id INTO v_chapter_id
      FROM public.normative_structures
      WHERE norm_version_id = v_version_id
        AND structure_type = 'chapter'
        AND title = v_chapter_text
        AND (parent_id IS NOT DISTINCT FROM v_title_id)
      LIMIT 1;

      IF v_chapter_id IS NULL THEN
        v_ordinal := v_ordinal + 1;
        INSERT INTO public.normative_structures (
          norm_version_id, parent_id, structure_type, identifier, title, content,
          ordinal, review_status, is_current, legal_status, valid_from, extraction_run_id
        )
        VALUES (
          v_version_id, v_title_id, 'chapter', v_chapter_text, v_chapter_text, NULL,
          v_ordinal, 'approved', true, 'vigente', v_pub_date, v_run_id
        )
        RETURNING id INTO v_chapter_id;
      END IF;
    END IF;

    v_struct_type := CASE
      WHEN COALESCE(v_item->>'structure_type', 'article') IN ('book','title','chapter','section','article','paragraph','numeral','literal','item','transitory','final','reform','annex','other')
      THEN COALESCE(v_item->>'structure_type', 'article')
      ELSE 'article'
    END;
    v_ident := COALESCE(NULLIF(btrim(COALESCE(v_item->>'identifier', '')), ''), (v_ordinal + 1)::text);

    -- Verificar si este artículo ya existe dentro de v_version_id (evita duplicados entre bloques o reprocesos)
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
          WHEN length(COALESCE(v_item->>'content', '')) >= length(COALESCE(content, ''))
          THEN COALESCE(v_item->>'content', content)
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
          'has_normative_table', COALESCE((v_item->>'has_normative_table')::boolean, false),
          'parent_title', v_title_text,
          'parent_chapter', v_chapter_text
        ),
        updated_at = now()
      WHERE id = v_art_id;
    ELSE
      v_ordinal := v_ordinal + 1;
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
        extraction_run_id,
        metadata
      )
      VALUES (
        v_version_id,
        COALESCE(v_chapter_id, v_title_id),
        v_struct_type,
        v_ident,
        COALESCE(NULLIF(v_item->>'title', ''), 'Art. ' || v_ident),
        COALESCE(v_item->>'content', ''),
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
          'has_normative_table', COALESCE((v_item->>'has_normative_table')::boolean, false),
          'parent_title', v_title_text,
          'parent_chapter', v_chapter_text
        )
      )
      RETURNING id INTO v_art_id;

      v_inserted_articles := v_inserted_articles + 1;
    END IF;

    -- 4a. Aplicar reforma principal con Art. 11 CT si este artículo reforma una norma objetivo
    v_target_norm_code_text := NULLIF(btrim(COALESCE(v_item->>'reforms_target_norm_code', '')), '');
    v_target_art_id_text := NULLIF(btrim(COALESCE(v_item->>'reforms_target_article_identifier', '')), '');

    IF v_target_norm_code_text IS NOT NULL
       AND v_target_art_id_text IS NOT NULL
       AND NULLIF(btrim(COALESCE(v_item->>'reformed_target_content', '')), '') IS NOT NULL THEN

      SELECT id INTO v_target_norm_id
      FROM public.norms
      WHERE upper(code) = upper(v_target_norm_code_text)
      LIMIT 1;

      IF v_target_norm_id IS NOT NULL THEN
        v_reformed_struct_id := public.apply_official_registry_reform(
          v_target_norm_code_text,
          v_target_art_id_text,
          v_item->>'reformed_target_title',
          v_item->>'reformed_target_content',
          v_pub_date,
          v_art_valid_until,
          COALESCE(NULLIF(v_item->>'reform_change_type', ''), 'modified'),
          COALESCE(NULLIF(v_item->>'reform_source_cite', ''), p_version_title),
          COALESCE(NULLIF(v_item->>'official_registry', ''), p_version_title),
          COALESCE(NULLIF(v_item->>'summary_change', ''), v_item->>'observations', 'Reforma publicada en Registro Oficial'),
          v_art_id,
          v_doc_id,
          CASE WHEN COALESCE(v_item->>'reform_change_type', 'modified') = 'repealed' THEN 'derogado' ELSE 'vigente_reformado' END,
          v_item->'normative_tables'
        );
        v_applied_reforms := v_applied_reforms + 1;
        v_did_apply_reform := true;

        IF jsonb_typeof(v_item->'normative_tables') = 'array' THEN
          v_inserted_tables := v_inserted_tables + jsonb_array_length(v_item->'normative_tables');
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
            COALESCE(NULLIF(v_item->>'reforms_target_norm_name', ''), v_target_norm_code_text),
            upper(v_target_norm_code_text),
            COALESCE(NULLIF(v_item->>'reform_source_cite', ''), p_version_title),
            'official_registry_citation',
            p_version_title,
            'pending',
            jsonb_build_object(
              'modifying_norm_code', v_clean_norm_code,
              'modifying_structure_id', v_art_id,
              'target_article_identifier', v_target_art_id_text,
              'ro_published_on', v_pub_date,
              'summary_change', COALESCE(v_item->>'summary_change', v_item->>'observations', '')
            )
          )
          RETURNING id INTO v_discovery_id;
          v_inserted_discoveries := v_inserted_discoveries + 1;
        END IF;

        IF v_discovery_id IS NOT NULL THEN
          INSERT INTO public.structure_relations (
            source_structure_id, target_discovery_id, relation_type, description, extraction_run_id, review_status, metadata
          )
          VALUES (
            v_art_id,
            v_discovery_id,
            CASE WHEN COALESCE(v_item->>'reform_change_type', 'modified') = 'repealed' THEN 'repeals' ELSE 'amends' END,
            COALESCE(NULLIF(v_item->>'summary_change', ''), v_item->>'observations', 'Reforma norma aún no cargada: ' || v_target_norm_code_text),
            v_run_id,
            'approved',
            jsonb_build_object(
              'target_norm_code', v_target_norm_code_text,
              'target_article_identifier', v_target_art_id_text,
              'ro_published_on', v_pub_date
            )
          );
        END IF;
      END IF;
    END IF;

    -- 4b. Aplicar reformas adicionales si un artículo agrega/modifica múltiples artículos objetivo (ej. RISE 97.1 a 97.15)
    IF jsonb_typeof(v_item->'reformas_adicionales') = 'array' THEN
      FOR v_extra_ref IN SELECT * FROM jsonb_array_elements(v_item->'reformas_adicionales')
      LOOP
        v_target_norm_code_text := COALESCE(
          NULLIF(btrim(COALESCE(v_extra_ref->>'reforma_norma_objetivo', v_extra_ref->>'reforms_target_norm_code', '')), ''),
          NULLIF(btrim(COALESCE(v_item->>'reforms_target_norm_code', '')), '')
        );
        v_target_art_id_text := NULLIF(btrim(COALESCE(v_extra_ref->>'reforma_articulo_objetivo', v_extra_ref->>'reforms_target_article_identifier', '')), '');

        IF v_target_norm_code_text IS NOT NULL
           AND v_target_art_id_text IS NOT NULL
           AND NULLIF(btrim(COALESCE(v_extra_ref->>'texto_consolidado_post_reforma', v_extra_ref->>'reformed_target_content', '')), '') IS NOT NULL THEN

          SELECT id INTO v_target_norm_id
          FROM public.norms
          WHERE upper(code) = upper(v_target_norm_code_text)
          LIMIT 1;

          IF v_target_norm_id IS NOT NULL THEN
            v_extra_reformed_id := public.apply_official_registry_reform(
              v_target_norm_code_text,
              v_target_art_id_text,
              COALESCE(v_extra_ref->>'reforma_titulo_consolidado', v_extra_ref->>'reformed_target_title'),
              COALESCE(v_extra_ref->>'texto_consolidado_post_reforma', v_extra_ref->>'reformed_target_content'),
              v_pub_date,
              v_art_valid_until,
              COALESCE(NULLIF(COALESCE(v_extra_ref->>'reforma_tipo_cambio', v_extra_ref->>'reform_change_type'), ''), 'added'),
              COALESCE(NULLIF(v_item->>'reform_source_cite', ''), p_version_title),
              COALESCE(NULLIF(v_item->>'official_registry', ''), p_version_title),
              COALESCE(NULLIF(COALESCE(v_extra_ref->>'resumen_reforma', v_extra_ref->>'summary_change'), ''), v_item->>'summary_change', 'Reforma publicada en Registro Oficial'),
              v_art_id,
              v_doc_id,
              CASE WHEN COALESCE(v_extra_ref->>'reforma_tipo_cambio', v_extra_ref->>'reform_change_type', 'added') = 'repealed' THEN 'derogado' ELSE 'vigente_reformado' END,
              COALESCE(v_extra_ref->'tablas_normativas', v_extra_ref->'normative_tables')
            );
            v_applied_reforms := v_applied_reforms + 1;

            IF v_extra_reformed_id IS NOT NULL THEN
              IF jsonb_typeof(v_item->'vertical_concepts') = 'array' THEN
                FOR v_concept_code IN SELECT jsonb_array_elements_text(v_item->'vertical_concepts')
                LOOP
                  SELECT id INTO v_concept_id FROM public.tax_concepts WHERE code = upper(btrim(v_concept_code)) LIMIT 1;
                  IF v_concept_id IS NOT NULL THEN
                    INSERT INTO public.structure_tax_concepts (structure_id, tax_concept_id, relevance_role, review_status, extraction_run_id)
                    VALUES (v_extra_reformed_id, v_concept_id, 'primary', 'approved', v_run_id)
                    ON CONFLICT (structure_id, tax_concept_id) DO NOTHING;
                  END IF;
                END LOOP;
              END IF;
              IF v_target_art_id_text LIKE '97.%' THEN
                SELECT id INTO v_concept_id FROM public.tax_concepts WHERE code = 'RISE' LIMIT 1;
                IF v_concept_id IS NOT NULL THEN
                  INSERT INTO public.structure_tax_concepts (structure_id, tax_concept_id, relevance_role, review_status, extraction_run_id)
                  VALUES (v_extra_reformed_id, v_concept_id, 'primary', 'approved', v_run_id)
                  ON CONFLICT (structure_id, tax_concept_id) DO NOTHING;
                END IF;
              END IF;
            END IF;
          END IF;
        END IF;
      END LOOP;
    END IF;

    -- 5. Vincular el Artículo (y el artículo reformado en la norma objetivo si existe) con el Eje Vertical
    IF jsonb_typeof(v_item->'vertical_concepts') = 'array' THEN
      FOR v_concept_code IN SELECT jsonb_array_elements_text(v_item->'vertical_concepts')
      LOOP
        SELECT id INTO v_concept_id
        FROM public.tax_concepts
        WHERE code = upper(btrim(v_concept_code))
        LIMIT 1;

        IF v_concept_id IS NOT NULL THEN
          INSERT INTO public.structure_tax_concepts (
            structure_id, tax_concept_id, relevance_role, review_status, extraction_run_id
          )
          VALUES (
            v_art_id, v_concept_id, 'primary', 'approved', v_run_id
          )
          ON CONFLICT (structure_id, tax_concept_id) DO NOTHING;

          IF v_reformed_struct_id IS NOT NULL THEN
            INSERT INTO public.structure_tax_concepts (
              structure_id, tax_concept_id, relevance_role, review_status, extraction_run_id
            )
            VALUES (
              v_reformed_struct_id, v_concept_id, 'primary', 'approved', v_run_id
            )
            ON CONFLICT (structure_id, tax_concept_id) DO NOTHING;
          END IF;
        END IF;
      END LOOP;
    END IF;

    -- 6. Insertar Tablas Normativas propias del artículo (solo si no fueron ya vinculadas por apply_official_registry_reform)
    IF NOT v_did_apply_reform AND jsonb_typeof(v_item->'normative_tables') = 'array' THEN
      FOR v_tbl IN SELECT * FROM jsonb_array_elements(v_item->'normative_tables')
      LOOP
        v_tbl_valid_from := COALESCE(
          NULLIF(btrim(COALESCE(v_tbl->>'valid_from', '')), '')::date,
          v_art_valid_from,
          v_pub_date
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
          extraction_run_id,
          review_status
        )
        VALUES (
          COALESCE(
            NULLIF(btrim(COALESCE(v_tbl->>'code', '')), ''),
            'TBL_' || v_clean_norm_code || '_' || regexp_replace(v_ident, '[^A-Za-z0-9_]', '_', 'g') || '_' || EXTRACT(YEAR FROM v_tbl_valid_from)::text
          ),
          COALESCE(NULLIF(v_tbl->>'titulo_tabla', ''), v_tbl->>'title', 'Tabla Art. ' || v_ident),
          COALESCE(NULLIF(v_tbl->>'descripcion', ''), v_tbl->>'description', 'Extraída del Art. ' || v_ident || ' (' || v_clean_norm_code || ')'),
          v_norm_id,
          v_version_id,
          v_art_id,
          v_tarifas_concept_id,
          CASE
            WHEN COALESCE(v_tbl->>'categoria_tabla', v_tbl->>'table_category', 'other') IN ('progressive_rates','withholding_rates','specific_rates','rimpe','dividends','inheritance','ice','depreciation','deadlines','other')
            THEN COALESCE(v_tbl->>'categoria_tabla', v_tbl->>'table_category', 'other')
            ELSE 'other'
          END,
          COALESCE(NULLIF(btrim(COALESCE(v_tbl->>'fiscal_year', '')), '')::int4, EXTRACT(YEAR FROM v_tbl_valid_from)::int4),
          daterange(v_tbl_valid_from, v_tbl_valid_until, '[)'),
          COALESCE(v_tbl->'columns_schema', '[]'::jsonb),
          COALESCE(v_tbl->'rows_data', '[]'::jsonb),
          COALESCE(v_tbl->>'markdown_tabla', v_tbl->>'markdown_content'),
          v_run_id,
          'approved'
        )
        ON CONFLICT (code) DO UPDATE
        SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          fiscal_year = EXCLUDED.fiscal_year,
          effective_during = EXCLUDED.effective_during,
          rows_data = EXCLUDED.rows_data,
          columns_schema = EXCLUDED.columns_schema,
          markdown_content = EXCLUDED.markdown_content,
          review_status = 'approved',
          updated_at = now();

        v_inserted_tables := v_inserted_tables + 1;
      END LOOP;
    END IF;

    -- 7. Detectar relaciones normativas
    IF jsonb_typeof(v_item->'detected_relations') = 'array' THEN
      FOR v_rel IN SELECT * FROM jsonb_array_elements(v_item->'detected_relations')
      LOOP
        IF NULLIF(btrim(COALESCE(v_rel->>'norma_citada', '')), '') IS NOT NULL THEN
          SELECT id INTO v_target_norm_id
          FROM public.norms
          WHERE lower(name) = lower(btrim(v_rel->>'norma_citada'))
             OR lower(short_name) = lower(btrim(v_rel->>'norma_citada'))
             OR lower(code) = lower(btrim(v_rel->>'norma_citada'))
          LIMIT 1;

          v_target_struct_id := NULL;
          IF v_target_norm_id IS NOT NULL AND NULLIF(btrim(COALESCE(v_rel->>'articulo_citado', '')), '') IS NOT NULL THEN
            SELECT ns.id INTO v_target_struct_id
            FROM public.normative_structures ns
            JOIN public.norm_versions nv ON nv.id = ns.norm_version_id
            WHERE nv.norm_id = v_target_norm_id
              AND ns.identifier = regexp_replace(btrim(v_rel->>'articulo_citado'), '[^0-9A-Za-z.-]', '', 'g')
              AND ns.is_current = true
            LIMIT 1;
          END IF;

          IF v_target_struct_id IS NOT NULL AND v_target_struct_id <> v_art_id THEN
            INSERT INTO public.structure_relations (
              source_structure_id,
              target_structure_id,
              relation_type,
              description,
              extraction_run_id,
              review_status,
              metadata
            )
            VALUES (
              v_target_struct_id,
              v_art_id,
              CASE
                WHEN COALESCE(v_rel->>'tipo_relacion', 'cites') IN ('regulates','regulated_by','amends','repeals','replaces','complements','cites','clarifies','implements','concordance','other')
                THEN COALESCE(v_rel->>'tipo_relacion', 'cites')
                ELSE 'cites'
              END,
              COALESCE(v_rel->>'descripcion', 'Concordancia con ' || v_clean_norm_code),
              v_run_id,
              'approved',
              jsonb_build_object('cited_article', v_rel->>'articulo_citado')
            );
          END IF;
        END IF;
      END LOOP;
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
