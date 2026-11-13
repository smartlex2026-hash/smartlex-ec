-- =============================================================================
-- SmartLex Ecuador — Fase 3: Motor Evolutivo de Registro Oficial (Publicación
-- Instantánea, Línea del Tiempo de Reformas y Vigencia por Rango de Fechas)
-- =============================================================================

BEGIN;

-- 1. Índices adicionales para búsqueda rápida por rango de fechas de vigencia (Opción B)
CREATE INDEX IF NOT EXISTS normative_structures_validity_range_idx
  ON public.normative_structures (valid_from, valid_until);

CREATE INDEX IF NOT EXISTS normative_structures_identifier_type_idx
  ON public.normative_structures (structure_type, identifier);

-- Asegurar políticas de lectura pública para documentos y cambios normativos en el lector
DROP POLICY IF EXISTS "Public can view documents" ON public.documents;
CREATE POLICY "Public can view documents"
  ON public.documents FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Public can view normative changes" ON public.normative_changes;
CREATE POLICY "Public can view normative changes"
  ON public.normative_changes FOR SELECT TO anon, authenticated
  USING (true);

-- 2. Función auxiliar para aplicar reformas cronológicas sobre un artículo o ley existente
CREATE OR REPLACE FUNCTION public.apply_official_registry_reform(
  p_target_norm_code text,
  p_target_article_identifier text,
  p_new_title text,
  p_new_content text,
  p_effective_date date,
  p_valid_until date DEFAULT NULL,
  p_change_type text DEFAULT 'modified',
  p_reform_source_cite text DEFAULT NULL,
  p_official_registry_cite text DEFAULT NULL,
  p_summary_change text DEFAULT NULL,
  p_modifying_structure_id uuid DEFAULT NULL,
  p_source_document_id uuid DEFAULT NULL,
  p_legal_status text DEFAULT 'vigente_reformado'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_target_norm_id uuid;
  v_prev_struct record;
  v_new_version_id uuid;
  v_next_ver_num int4;
  v_new_struct_id uuid;
  v_concept_rec record;
BEGIN
  SELECT id INTO v_target_norm_id
  FROM public.norms
  WHERE code = p_target_norm_code
  LIMIT 1;

  IF v_target_norm_id IS NULL THEN
    RAISE EXCEPTION 'Target norm % not found', p_target_norm_code;
  END IF;

  -- Localizar la versión vigente actual del artículo objetivo
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

  -- Crear o reutilizar la versión de la norma correspondiente a esta fecha de reforma
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
      daterange(p_effective_date, p_valid_until, '[)'),
      true,
      'active',
      jsonb_build_object(
        'reform_source_cite', p_reform_source_cite,
        'official_registry', p_official_registry_cite,
        'summary_change', p_summary_change
      )
    )
    RETURNING id INTO v_new_version_id;
  END IF;

  -- Cerrar vigencia de la versión previa del artículo si existía
  IF v_prev_struct.id IS NOT NULL THEN
    UPDATE public.normative_structures
    SET
      is_current = false,
      valid_until = COALESCE(valid_until, (p_effective_date - INTERVAL '1 day')::date),
      updated_at = now()
    WHERE id = v_prev_struct.id;
  END IF;

  -- Insertar la nueva versión del artículo reformado (aprobada instantáneamente)
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
    COALESCE(v_prev_struct.ordinal, NULLIF(regexp_replace(p_target_article_identifier, '\D', '', 'g'), '')::int4, 1),
    'approved',
    true,
    p_legal_status,
    p_effective_date,
    p_valid_until,
    COALESCE(v_prev_struct.metadata, '{}'::jsonb) || jsonb_build_object(
      'reform_source_cite', p_reform_source_cite,
      'official_registry', p_official_registry_cite,
      'summary_change', p_summary_change,
      'version_year', EXTRACT(YEAR FROM p_effective_date)::int4,
      'previous_structure_id', v_prev_struct.id
    )
  )
  RETURNING id INTO v_new_struct_id;

  -- Copiar vinculaciones de conceptos tributarios del artículo anterior al nuevo
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

  -- Registrar trazabilidad en normative_changes
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
    p_effective_date,
    v_prev_struct.content,
    p_new_content,
    COALESCE(p_summary_change, p_reform_source_cite),
    'approved',
    jsonb_build_object(
      'reform_source_cite', p_reform_source_cite,
      'official_registry', p_official_registry_cite
    )
  );

  -- Si existe una estructura modificadora (ej. Art. de Ley Reformatoria o Resolución SRI), enlazarla
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
        'effective_date', p_effective_date
      )
    );
  END IF;

  RETURN v_new_struct_id;
END;
$$;

-- 3. Actualizar RPC Transaccional ingest_extracted_norm_draft para PUBLICACIÓN INSTANTÁNEA ('approved' / 'active')
--    y soporte directo de fechas de vigencia y reformas desde el Registro Oficial
CREATE OR REPLACE FUNCTION public.ingest_extracted_norm_draft(
  p_document_id uuid DEFAULT NULL,
  p_norm_code text DEFAULT 'LRTI',
  p_version_title text DEFAULT 'Versión Extraída por IA',
  p_published_on date DEFAULT NULL,
  p_model text DEFAULT 'gemini-2.5-flash',
  p_articles jsonb DEFAULT '[]'::jsonb,
  p_google_drive_file_id text DEFAULT NULL,
  p_google_drive_path text DEFAULT NULL,
  p_storage_bucket text DEFAULT 'legal-documents',
  p_storage_path text DEFAULT NULL,
  p_folder_category text DEFAULT '02_leyes',
  p_file_name text DEFAULT NULL,
  p_sha256 text DEFAULT NULL,
  p_file_size int8 DEFAULT NULL,
  p_source_url text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_doc_id uuid;
  v_norm_id uuid;
  v_version_id uuid;
  v_run_id uuid;
  v_next_version int4;
  v_tarifas_concept_id uuid;
  v_feature_code text;
  v_feature_id uuid;
  v_norm_type text;
  v_item jsonb;
  v_art_id uuid;
  v_title_id uuid;
  v_chapter_id uuid;
  v_title_text text;
  v_chapter_text text;
  v_concept_code text;
  v_concept_id uuid;
  v_tbl jsonb;
  v_rel jsonb;
  v_target_norm_id uuid;
  v_target_struct_id uuid;
  v_discovery_id uuid;
  v_inserted_articles int4 := 0;
  v_inserted_tables int4 := 0;
  v_inserted_discoveries int4 := 0;
  v_applied_reforms int4 := 0;
  v_ordinal int4 := 0;
  v_pub_date date := COALESCE(p_published_on, CURRENT_DATE);
BEGIN
  CASE COALESCE(p_folder_category, '02_leyes')
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

  IF v_doc_id IS NULL AND p_google_drive_file_id IS NOT NULL THEN
    SELECT id INTO v_doc_id
    FROM public.documents
    WHERE google_drive_file_id = p_google_drive_file_id
    LIMIT 1;
  END IF;

  IF v_doc_id IS NULL AND p_sha256 IS NOT NULL THEN
    SELECT id INTO v_doc_id
    FROM public.documents
    WHERE sha256 = p_sha256
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
      COALESCE(p_file_name, p_norm_code || '.pdf'),
      'application/pdf',
      p_file_size,
      p_sha256,
      COALESCE(p_storage_bucket, 'legal-documents'),
      COALESCE(p_storage_path, COALESCE(p_folder_category, '02_leyes') || '/' || COALESCE(p_file_name, p_norm_code || '.pdf')),
      p_google_drive_file_id,
      COALESCE(p_google_drive_path, '01_PDF_Original/' || COALESCE(p_folder_category, '02_leyes') || '/' || COALESCE(p_file_name, p_norm_code || '.pdf')),
      p_source_url,
      'processed',
      now(),
      now(),
      p_model,
      'v3.0-official-registry-evolution',
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
      storage_bucket = COALESCE(p_storage_bucket, storage_bucket),
      storage_path = COALESCE(p_storage_path, storage_path),
      google_drive_file_id = COALESCE(p_google_drive_file_id, google_drive_file_id),
      google_drive_path = COALESCE(p_google_drive_path, google_drive_path),
      sha256 = COALESCE(p_sha256, sha256),
      file_size = COALESCE(p_file_size, file_size),
      source_url = COALESCE(p_source_url, source_url),
      status = 'processed',
      processed_at = now(),
      updated_at = now()
    WHERE id = v_doc_id;
  END IF;

  -- 1. Obtener o crear automáticamente la norma en public.norms (publicada de inmediato)
  SELECT id INTO v_norm_id
  FROM public.norms
  WHERE code = p_norm_code
  LIMIT 1;

  IF v_norm_id IS NULL THEN
    INSERT INTO public.norms (
      code,
      name,
      short_name,
      normative_type,
      publication_date,
      access_feature_id,
      repository_status,
      metadata
    )
    VALUES (
      p_norm_code,
      COALESCE(p_version_title, p_norm_code),
      p_norm_code,
      v_norm_type,
      v_pub_date,
      v_feature_id,
      'loaded',
      jsonb_build_object(
        'folder_category', p_folder_category,
        'storage_path', COALESCE(p_storage_path, COALESCE(p_folder_category, '02_leyes') || '/' || COALESCE(p_file_name, p_norm_code || '.pdf'))
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
  WHERE code = 'TARIFAS'
  LIMIT 1;

  -- 2. Registrar la ejecución en extraction_runs
  INSERT INTO public.extraction_runs (
    document_id, model, extraction_version, status, prompt_version, started_at, finished_at, result_metadata
  )
  VALUES (
    v_doc_id,
    p_model,
    'v3.0-official-registry-evolution',
    'completed',
    'smartlex-ec-juridico-v3.0',
    now(),
    now(),
    jsonb_build_object(
      'articles_received', jsonb_array_length(p_articles),
      'folder_category', p_folder_category,
      'instant_publish', true
    )
  )
  RETURNING id INTO v_run_id;

  -- 3. Crear versión ACTIVA (publicación instantánea conforme regla SmartLex)
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
      'storage_path', p_storage_path
    )
  )
  RETURNING id INTO v_version_id;

  -- 4. Recorrer los artículos extraídos e insertar jerarquía (Título -> Capítulo -> Artículo) con review_status = 'approved'
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_articles)
  LOOP
    v_ordinal := v_ordinal + 1;
    v_title_id := NULL;
    v_chapter_id := NULL;

    v_title_text := NULLIF(btrim(COALESCE(v_item->>'parent_title', '')), '');
    v_chapter_text := NULLIF(btrim(COALESCE(v_item->>'parent_chapter', '')), '');

    IF v_title_text IS NOT NULL AND upper(v_title_text) <> 'SIN TÍTULO' THEN
      SELECT id INTO v_title_id
      FROM public.normative_structures
      WHERE norm_version_id = v_version_id
        AND structure_type = 'title'
        AND title = v_title_text
      LIMIT 1;

      IF v_title_id IS NULL THEN
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

    -- Si el artículo indica que reforma otro cuerpo normativo (ej. LRTI) y la norma actual es distinta, o si es nueva versión de un artículo existente
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
      CASE
        WHEN COALESCE(v_item->>'structure_type', 'article') IN ('book','title','chapter','section','article','paragraph','numeral','literal','item','transitory','final','reform','annex','other')
        THEN COALESCE(v_item->>'structure_type', 'article')
        ELSE 'article'
      END,
      COALESCE(v_item->>'identifier', v_ordinal::text),
      COALESCE(v_item->>'title', 'Art. ' || COALESCE(v_item->>'identifier', v_ordinal::text)),
      COALESCE(v_item->>'content', ''),
      COALESCE((v_item->>'ordinal')::int4, v_ordinal),
      'approved',
      COALESCE((v_item->>'is_current')::boolean, true),
      CASE
        WHEN COALESCE(v_item->>'legal_status', 'vigente') IN ('vigente', 'vigente_reformado', 'derogado')
        THEN COALESCE(v_item->>'legal_status', 'vigente')
        ELSE 'vigente'
      END,
      COALESCE((v_item->>'valid_from')::date, v_pub_date),
      (v_item->>'valid_until')::date,
      v_run_id,
      jsonb_build_object(
        'observations', COALESCE(v_item->>'observations', ''),
        'reform_source_cite', COALESCE(v_item->>'reform_source_cite', p_version_title),
        'official_registry', COALESCE(v_item->>'official_registry', ''),
        'summary_change', COALESCE(v_item->>'summary_change', v_item->>'observations', ''),
        'has_normative_table', COALESCE((v_item->>'has_normative_table')::boolean, false)
      )
    )
    RETURNING id INTO v_art_id;

    v_inserted_articles := v_inserted_articles + 1;

    -- Si este artículo reforma directamente un artículo de otra ley (ej. Ley 20 reforma Art. 9 de LRTI)
    IF NULLIF(btrim(COALESCE(v_item->>'reforms_target_norm_code', '')), '') IS NOT NULL
       AND NULLIF(btrim(COALESCE(v_item->>'reforms_target_article_identifier', '')), '') IS NOT NULL
       AND NULLIF(btrim(COALESCE(v_item->>'reformed_target_content', '')), '') IS NOT NULL THEN
      PERFORM public.apply_official_registry_reform(
        btrim(v_item->>'reforms_target_norm_code'),
        btrim(v_item->>'reforms_target_article_identifier'),
        v_item->>'reformed_target_title',
        v_item->>'reformed_target_content',
        COALESCE((v_item->>'valid_from')::date, v_pub_date),
        (v_item->>'valid_until')::date,
        COALESCE(v_item->>'reform_change_type', 'modified'),
        COALESCE(v_item->>'reform_source_cite', p_version_title),
        COALESCE(v_item->>'official_registry', p_version_title),
        COALESCE(v_item->>'summary_change', v_item->>'observations', 'Reforma publicada en Registro Oficial'),
        v_art_id,
        v_doc_id,
        'vigente_reformado'
      );
      v_applied_reforms := v_applied_reforms + 1;
    END IF;

    -- 5. Vincular el Artículo con el Eje Vertical (structure_tax_concepts) aprobado de inmediato
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
        END IF;
      END LOOP;
    END IF;

    -- 6. Insertar Tablas Normativas contenidas en el artículo (aprobadas de inmediato)
    IF jsonb_typeof(v_item->'normative_tables') = 'array' THEN
      FOR v_tbl IN SELECT * FROM jsonb_array_elements(v_item->'normative_tables')
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
          extraction_run_id,
          review_status
        )
        VALUES (
          COALESCE(v_tbl->>'code', 'TBL_' || p_norm_code || '_' || COALESCE(v_item->>'identifier', '1') || '_' || EXTRACT(YEAR FROM v_pub_date)::text),
          COALESCE(v_tbl->>'titulo_tabla', 'Tabla Art. ' || COALESCE(v_item->>'identifier', '')),
          COALESCE(v_tbl->>'descripcion', 'Extraída del Art. ' || COALESCE(v_item->>'identifier', '') || ' (' || p_norm_code || ')'),
          v_norm_id,
          v_version_id,
          v_art_id,
          v_tarifas_concept_id,
          CASE
            WHEN COALESCE(v_tbl->>'categoria_tabla', 'other') IN ('progressive_rates','withholding_rates','specific_rates','rimpe','dividends','inheritance','ice','depreciation','deadlines','other')
            THEN COALESCE(v_tbl->>'categoria_tabla', 'other')
            ELSE 'other'
          END,
          COALESCE((v_tbl->>'fiscal_year')::int4, EXTRACT(YEAR FROM v_pub_date)::int4),
          daterange(
            COALESCE((v_tbl->>'valid_from')::date, v_pub_date),
            (v_tbl->>'valid_until')::date,
            '[)'
          ),
          COALESCE(v_tbl->'columns_schema', '[]'::jsonb),
          COALESCE(v_tbl->'rows_data', '[]'::jsonb),
          v_tbl->>'markdown_tabla',
          v_run_id,
          'approved'
        )
        ON CONFLICT (code) DO UPDATE
        SET
          rows_data = EXCLUDED.rows_data,
          columns_schema = EXCLUDED.columns_schema,
          markdown_content = EXCLUDED.markdown_content,
          review_status = 'approved',
          updated_at = now();

        v_inserted_tables := v_inserted_tables + 1;
      END LOOP;
    END IF;

    -- 7. Detectar relaciones normativas (con normas ya cargadas o por descubrir)
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
              COALESCE(v_rel->>'descripcion', 'Concordancia con ' || p_norm_code),
              v_run_id,
              'approved',
              jsonb_build_object('cited_article', v_rel->>'articulo_citado')
            );
          ELSIF v_target_norm_id IS NULL THEN
            SELECT id INTO v_discovery_id
            FROM public.norm_discovery
            WHERE lower(searched_name) = lower(btrim(v_rel->>'norma_citada'))
            LIMIT 1;

            IF v_discovery_id IS NULL THEN
              INSERT INTO public.norm_discovery (
                searched_name,
                reference_text,
                source_type,
                source_name,
                found,
                document_found,
                discovery_status,
                searched_at,
                result_metadata
              )
              VALUES (
                btrim(v_rel->>'norma_citada'),
                COALESCE(v_rel->>'descripcion', 'Mencionada en ' || p_norm_code || ' Art. ' || COALESCE(v_item->>'identifier', '')),
                'norm_extraction',
                p_norm_code || ' - Art. ' || COALESCE(v_item->>'identifier', ''),
                false,
                false,
                'pending',
                now(),
                jsonb_build_object(
                  'detected_in_document_id', v_doc_id,
                  'detected_in_structure_id', v_art_id,
                  'cited_article', v_rel->>'articulo_citado',
                  'relation_type', v_rel->>'tipo_relacion'
                )
              )
              RETURNING id INTO v_discovery_id;

              v_inserted_discoveries := v_inserted_discoveries + 1;
            END IF;

            INSERT INTO public.structure_relations (
              source_structure_id,
              target_structure_id,
              target_discovery_id,
              relation_type,
              description,
              extraction_run_id,
              review_status,
              metadata
            )
            VALUES (
              v_art_id,
              NULL,
              v_discovery_id,
              CASE
                WHEN COALESCE(v_rel->>'tipo_relacion', 'cites') IN ('regulates','regulated_by','amends','repeals','replaces','complements','cites','clarifies','implements','concordance','other')
                THEN COALESCE(v_rel->>'tipo_relacion', 'cites')
                ELSE 'cites'
              END,
              COALESCE(v_rel->>'descripcion', 'Referencia a ' || (v_rel->>'norma_citada')),
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
    'norm_version_id', v_version_id,
    'extraction_run_id', v_run_id,
    'articles_published', v_inserted_articles,
    'reforms_applied', v_applied_reforms,
    'normative_tables_saved', v_inserted_tables,
    'missing_norms_discovered', v_inserted_discoveries
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.ingest_extracted_norm_draft(uuid, text, text, date, text, jsonb, text, text, text, text, text, text, text, int8, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.apply_official_registry_reform(text, text, text, text, date, date, text, text, text, text, uuid, uuid, text) TO anon, authenticated, service_role;

COMMIT;


-- =============================================================================
-- 4. RPC: apply_norm_unconstitutionality
-- Declara la inconstitucionalidad o derogatoria total de una ley (ej. Ley 2006-34
-- de Huaquillas mediante Resolución No. 0003-06-TC en R.O.S. 288 de 2006-06-09)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.apply_norm_unconstitutionality(
  p_target_norm_code text,
  p_resolution_norm_code text,
  p_effective_date date,
  p_official_registry text DEFAULT NULL,
  p_reform_source_cite text DEFAULT NULL,
  p_summary text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_norm_id uuid;
  v_res_norm_id uuid;
  v_res_struct_id uuid;
  v_affected_count int := 0;
BEGIN
  SELECT id INTO v_target_norm_id FROM public.norms WHERE code = p_target_norm_code LIMIT 1;
  IF v_target_norm_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', format('No existe la norma %s', p_target_norm_code));
  END IF;

  SELECT id INTO v_res_norm_id FROM public.norms WHERE code = p_resolution_norm_code LIMIT 1;
  IF v_res_norm_id IS NOT NULL THEN
    SELECT ns.id INTO v_res_struct_id
    FROM public.normative_structures ns
    JOIN public.norm_versions nv ON nv.id = ns.norm_version_id
    WHERE nv.norm_id = v_res_norm_id
    ORDER BY ns.ordinal ASC
    LIMIT 1;
  END IF;

  UPDATE public.norms
  SET
    repository_status = 'historica',
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'unconstitutional_by', p_resolution_norm_code,
      'valid_until', p_effective_date,
      'official_registry_derogation', p_official_registry,
      'unconstitutionality_summary', p_summary
    ),
    updated_at = now()
  WHERE id = v_target_norm_id;

  UPDATE public.norm_versions
  SET
    status = 'repealed',
    valid_until = p_effective_date
  WHERE norm_id = v_target_norm_id AND valid_until IS NULL;

  UPDATE public.normative_structures ns
  SET
    legal_status = 'derogado',
    valid_until = p_effective_date,
    summary_change = COALESCE(ns.summary_change, '') || ' | ' || COALESCE(p_summary, 'Declarada inconstitucional por el Tribunal Constitucional.')
  FROM public.norm_versions nv
  WHERE ns.norm_version_id = nv.id
    AND nv.norm_id = v_target_norm_id;

  GET DIAGNOSTICS v_affected_count = ROW_COUNT;

  IF v_res_struct_id IS NOT NULL THEN
    INSERT INTO public.structure_relations (
      source_structure_id, target_structure_id, relation_type,
      review_status, confidence_score, notes
    )
    SELECT
      v_res_struct_id, ns.id, 'derogates',
      'approved', 1.0,
      COALESCE(p_summary, 'Inconstitucionalidad declarada por ' || p_reform_source_cite)
    FROM public.normative_structures ns
    JOIN public.norm_versions nv ON nv.id = ns.norm_version_id
    WHERE nv.norm_id = v_target_norm_id
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'target_norm_code', p_target_norm_code,
    'resolution_norm_code', p_resolution_norm_code,
    'effective_date', p_effective_date,
    'structures_repealed', v_affected_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_norm_unconstitutionality(text, text, date, text, text, text) TO anon, authenticated, service_role;

-- =============================================================================
-- 4. REGLA DE VIGENCIA TRIBUTARIA SEGÚN ART. 11 DEL CÓDIGO TRIBUTARIO
--    - Impuestos anuales (ej. Renta): 1 de enero del año siguiente (YYYY+1-01-01)
--    - Impuestos mensuales (ej. IVA, ICE): 1 del mes siguiente (YYYY-MM-01)
--    - Fe de Erratas: no altera la fecha de vigencia de la norma original que corrige
-- =============================================================================
CREATE OR REPLACE FUNCTION public.calculate_tax_effective_date(
  p_ro_date date,
  p_tax_periodicity text DEFAULT 'annual',
  p_is_fe_erratas boolean DEFAULT false,
  p_prev_valid_from date DEFAULT NULL
)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_ro_date IS NULL THEN
    RETURN CURRENT_DATE;
  END IF;

  -- Las Fes de Erratas corrigen el valor o el texto, no la fecha de vigencia
  IF COALESCE(p_is_fe_erratas, false) THEN
    RETURN COALESCE(p_prev_valid_from, p_ro_date);
  END IF;

  IF lower(COALESCE(p_tax_periodicity, 'annual')) IN ('annual', 'anual', 'renta') THEN
    RETURN make_date(EXTRACT(YEAR FROM p_ro_date)::int + 1, 1, 1);
  ELSIF lower(COALESCE(p_tax_periodicity, '')) IN ('monthly', 'mensual', 'iva', 'ice') THEN
    RETURN (date_trunc('month', p_ro_date) + INTERVAL '1 month')::date;
  ELSE
    RETURN (date_trunc('month', p_ro_date) + INTERVAL '1 month')::date;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.calculate_tax_effective_date(date, text, boolean, date) TO anon, authenticated, service_role;

-- =============================================================================
-- 5. RPC PARA QUE EL ADMINISTRADOR MODIFIQUE MANUALMENTE LAS FECHAS DE VIGENCIA
--    DE CUALQUIER ESTRUCTURA NORMATIVA (valid_from / valid_until)
-- =============================================================================
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
SET search_path = public
AS $$
DECLARE
  v_updated record;
BEGIN
  UPDATE public.normative_structures
  SET
    valid_from = COALESCE(p_valid_from, valid_from),
    valid_until = CASE
      WHEN p_clear_valid_until THEN NULL
      ELSE COALESCE(p_valid_until, valid_until)
    END,
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'manual_validity_override', true,
      'admin_validity_updated_at', now(),
      'validity_override_note', COALESCE(p_validity_note, metadata->>'validity_override_note')
    ),
    updated_at = now()
  WHERE id = p_structure_id
  RETURNING id, identifier, valid_from, valid_until, metadata INTO v_updated;

  IF v_updated.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Estructura no encontrada');
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'structure_id', v_updated.id,
    'identifier', v_updated.identifier,
    'valid_from', v_updated.valid_from,
    'valid_until', v_updated.valid_until
  );
END;
$$;

-- Permisos y control de administrador: ver 20261112230000_phase4_art11_ct_validity_admin.sql
REVOKE ALL ON FUNCTION public.admin_update_structure_validity(uuid, date, date, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_structure_validity(uuid, date, date, boolean, text) TO authenticated;

