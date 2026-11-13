-- =============================================================================
-- SmartLex Ecuador — Fase 2: RPC Transaccional con Estructura Espejo
-- (Google Drive 01_PDF_Original/<carpeta> <-> Supabase Storage legal-documents/<carpeta>)
-- =============================================================================

BEGIN;

DROP FUNCTION IF EXISTS public.ingest_extracted_norm_draft(uuid, text, text, date, text, jsonb);
DROP FUNCTION IF EXISTS public.ingest_extracted_norm_draft(uuid, text, text, date, text, jsonb, text, text, text, text, int8, text);

CREATE OR REPLACE FUNCTION public.ingest_extracted_norm_draft(
  p_document_id uuid DEFAULT NULL,
  p_norm_code text DEFAULT 'LRTI',
  p_version_title text DEFAULT 'Versión Extraída por IA (Borrador)',
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
  v_discovery_id uuid;
  v_inserted_articles int4 := 0;
  v_inserted_tables int4 := 0;
  v_inserted_discoveries int4 := 0;
  v_ordinal int4 := 0;
BEGIN
  -- Determinar tipo de norma y nivel de acceso (Plan Free vs Plan Pro/Plus) según la carpeta espejo
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

  -- 0. Resolver o registrar el documento con doble referencia (Google Drive + Supabase Storage Espejo)
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
      'processing',
      now(),
      now(),
      p_model,
      'v2.2-mirror-gdrive-supabase',
      jsonb_build_object(
        'source_kind', 'mirror_google_drive_and_supabase_storage',
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
      updated_at = now()
    WHERE id = v_doc_id;
  END IF;

  -- 1. Obtener o crear automáticamente la norma en public.norms según su código y carpeta
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
      COALESCE(p_published_on, CURRENT_DATE),
      v_feature_id,
      'partially_loaded',
      jsonb_build_object('folder_category', p_folder_category)
    )
    RETURNING id INTO v_norm_id;
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
    'v2.2-mirror-gdrive-supabase',
    'completed',
    'smartlex-ec-juridico-v2.2',
    now(),
    now(),
    jsonb_build_object(
      'articles_received', jsonb_array_length(p_articles),
      'folder_category', p_folder_category,
      'google_drive_file_id', p_google_drive_file_id,
      'storage_path', p_storage_path
    )
  )
  RETURNING id INTO v_run_id;

  -- 3. Crear o reutilizar la versión en borrador (draft) para este documento
  SELECT id INTO v_version_id
  FROM public.norm_versions
  WHERE norm_id = v_norm_id
    AND source_document_id = v_doc_id
    AND status = 'draft'
  LIMIT 1;

  IF v_version_id IS NULL THEN
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
      COALESCE(p_published_on, CURRENT_DATE),
      daterange(COALESCE(p_published_on, CURRENT_DATE), NULL, '[)'),
      false,
      'draft',
      jsonb_build_object(
        'extraction_run_id', v_run_id,
        'folder_category', p_folder_category,
        'google_drive_file_id', p_google_drive_file_id,
        'storage_path', p_storage_path
      )
    )
    RETURNING id INTO v_version_id;
  ELSE
    DELETE FROM public.normative_structures
    WHERE norm_version_id = v_version_id
      AND review_status = 'pending_review';
  END IF;

  -- 4. Recorrer los artículos extraídos e insertar jerarquía (Título -> Capítulo -> Artículo)
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
          ordinal, review_status, extraction_run_id
        )
        VALUES (
          v_version_id, NULL, 'title', v_title_text, v_title_text, NULL,
          v_ordinal, 'pending_review', v_run_id
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
          ordinal, review_status, extraction_run_id
        )
        VALUES (
          v_version_id, v_title_id, 'chapter', v_chapter_text, v_chapter_text, NULL,
          v_ordinal, 'pending_review', v_run_id
        )
        RETURNING id INTO v_chapter_id;
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
      'pending_review',
      v_run_id,
      jsonb_build_object(
        'observations', COALESCE(v_item->>'observations', ''),
        'has_normative_table', COALESCE((v_item->>'has_normative_table')::boolean, false)
      )
    )
    RETURNING id INTO v_art_id;

    v_inserted_articles := v_inserted_articles + 1;

    -- 5. Vincular el Artículo con el Eje Vertical (structure_tax_concepts)
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
            v_art_id, v_concept_id, 'primary', 'pending_review', v_run_id
          )
          ON CONFLICT (structure_id, tax_concept_id) DO NOTHING;
        END IF;
      END LOOP;
    END IF;

    -- 6. Insertar Tablas Normativas contenidas en el artículo (ej. Art. 36 LRTI)
    IF jsonb_typeof(v_item->'normative_tables') = 'array' THEN
      FOR v_tbl IN SELECT * FROM jsonb_array_elements(v_item->'normative_tables')
      LOOP
        INSERT INTO public.normative_tables (
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
          COALESCE(v_tbl->>'titulo_tabla', 'Tabla Art. ' || COALESCE(v_item->>'identifier', '')),
          'Extraída del Art. ' || COALESCE(v_item->>'identifier', '') || ' (' || p_norm_code || ')',
          v_norm_id,
          v_version_id,
          v_art_id,
          v_tarifas_concept_id,
          CASE
            WHEN COALESCE(v_tbl->>'categoria_tabla', 'other') IN ('progressive_rates','withholding_rates','specific_rates','rimpe','dividends','inheritance','ice','depreciation','deadlines','other')
            THEN COALESCE(v_tbl->>'categoria_tabla', 'other')
            ELSE 'other'
          END,
          EXTRACT(YEAR FROM COALESCE(p_published_on, CURRENT_DATE))::int4,
          daterange(COALESCE(p_published_on, CURRENT_DATE), NULL, '[)'),
          COALESCE(v_tbl->'columns_schema', '[]'::jsonb),
          COALESCE(v_tbl->'rows_data', '[]'::jsonb),
          v_tbl->>'markdown_tabla',
          v_run_id,
          'pending_review'
        );
        v_inserted_tables := v_inserted_tables + 1;
      END LOOP;
    END IF;

    -- 7. Detectar normas citadas/reformadas que aún NO han sido cargadas (norm_discovery)
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

          IF v_target_norm_id IS NULL THEN
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
              'pending_review',
              jsonb_build_object('cited_article', v_rel->>'articulo_citado')
            );
          END IF;
        END IF;
      END LOOP;
    END IF;
  END LOOP;

  -- 8. Actualizar estado del documento en public.documents
  UPDATE public.documents
  SET
    status = 'processed',
    processed_at = now(),
    extraction_model = p_model,
    extraction_version = 'v2.2-mirror-gdrive-supabase',
    updated_at = now()
  WHERE id = v_doc_id;

  RETURN jsonb_build_object(
    'status', 'ok',
    'document_id', v_doc_id,
    'google_drive_file_id', p_google_drive_file_id,
    'storage_path', p_storage_path,
    'folder_category', p_folder_category,
    'norm_id', v_norm_id,
    'norm_version_id', v_version_id,
    'extraction_run_id', v_run_id,
    'articles_saved_pending_review', v_inserted_articles,
    'normative_tables_saved', v_inserted_tables,
    'missing_norms_discovered', v_inserted_discoveries
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.ingest_extracted_norm_draft(uuid, text, text, date, text, jsonb, text, text, text, text, text, text, text, int8, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ingest_extracted_norm_draft(uuid, text, text, date, text, jsonb, text, text, text, text, text, text, text, int8, text) TO authenticated, service_role;

COMMIT;
