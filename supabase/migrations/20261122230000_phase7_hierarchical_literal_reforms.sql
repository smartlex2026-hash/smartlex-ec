-- ============================================================================
-- FASE 7: REESTRUCTURACIÓN JERÁRQUICA Y LITERAL DE REFORMAS E HISTÓRICO
-- SmartLex Ecuador — Modelo article -> literal / numeral / paragraph
-- ============================================================================

-- 1. Índices de apoyo para consultas jerárquicas rápidas y tablas activas por categoría
CREATE INDEX IF NOT EXISTS normative_structures_parent_ordinal_idx
  ON public.normative_structures (parent_id, ordinal)
  WHERE parent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS normative_structures_version_identifier_idx
  ON public.normative_structures (norm_version_id, identifier);

CREATE INDEX IF NOT EXISTS normative_tables_norm_cat_active_idx
  ON public.normative_tables (norm_id, table_category, is_active);

-- 2. Redirigir la firma previa de 14 parámetros hacia la nueva firma canónica de 15 parámetros (retrocompatibilidad sin DROP)
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
SET search_path = ''
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

-- 3. Limpiar prefijo repetido "Art. X.-" dentro del cuerpo de un artículo
CREATE OR REPLACE FUNCTION public.clean_article_body_prefix(
  p_identifier text,
  p_content text
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $function$
DECLARE
  v_clean text;
  v_esc_id text;
  v_first_line text;
BEGIN
  v_clean := btrim(COALESCE(p_content, ''));
  IF v_clean = '' THEN
    RETURN '';
  END IF;

  -- Normalizar saltos de línea CRLF -> LF
  v_clean := replace(v_clean, E'\r\n', E'\n');
  v_clean := replace(v_clean, E'\r', E'\n');

  IF NULLIF(btrim(COALESCE(p_identifier, '')), '') IS NOT NULL THEN
    -- Escapar caracteres especiales de regex en el identificador (ej. 97.1, 107-A)
    v_esc_id := regexp_replace(btrim(p_identifier), '([.*+?^${}()|\[\]\\])', '\\\1', 'g');
    -- Quitar prefijo repetido "Art. 36.- " o "Artículo 36: " al inicio del cuerpo
    v_clean := regexp_replace(
      v_clean,
      '^\s*Art(?:[íi]culo|\.)?\s*' || v_esc_id || '\s*(?:[.\-:]+\s*)+',
      '',
      'i'
    );
  END IF;

  -- Quitar comillas envolventes de transcripción legislativa si envuelven todo el texto
  IF left(v_clean, 1) IN ('"', '“', '«') AND right(v_clean, 1) IN ('"', '”', '»') THEN
    v_clean := btrim(substring(v_clean FROM 2 FOR length(v_clean) - 2));
  END IF;

  RETURN btrim(v_clean);
END;
$function$;

-- 4. Parseador determinista de primer nivel estructural (intro + literales o numerales o párrafos)
CREATE OR REPLACE FUNCTION public.parse_article_subelements(
  p_article_identifier text,
  p_content text
)
RETURNS TABLE (
  sub_identifier text,
  structure_type text,
  sub_kind text,
  sub_code text,
  display_marker text,
  ordinal int4,
  content text
)
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $function$
DECLARE
  v_art_id text := btrim(COALESCE(p_article_identifier, '0'));
  v_text text := public.clean_article_body_prefix(v_art_id, p_content);
  v_lines text[];
  v_line text;
  v_trimmed text;
  v_i int4;
  v_len int4;
  v_mode text := 'paragraph'; -- 'literal' | 'numeral' | 'paragraph'
  v_lit_count int4 := 0;
  v_num_count int4 := 0;
  v_first_lit_idx int4 := NULL;
  v_first_num_idx int4 := NULL;
  v_match text[];
  v_code text;
  v_marker text;
  v_curr_sub_id text := NULL;
  v_curr_type text := NULL;
  v_curr_kind text := NULL;
  v_curr_code text := NULL;
  v_curr_marker text := NULL;
  v_curr_ord int4 := 0;
  v_curr_buf text := '';
  v_seq int4 := 0;
  v_in_table boolean := false;
BEGIN
  IF v_text = '' THEN
    RETURN;
  END IF;

  v_lines := string_to_array(v_text, E'\n');
  v_len := COALESCE(array_length(v_lines, 1), 0);

  -- Detectar el primer nivel estructural dominante (literales a), b), c)... vs numerales 1.-, 2.-...)
  FOR v_i IN 1..v_len LOOP
    v_trimmed := btrim(v_lines[v_i]);
    IF v_trimmed ~ '^[a-zñ]\)\s*' AND (v_trimmed ~ '^a\)\s*' OR v_lit_count > 0) THEN
      v_lit_count := v_lit_count + 1;
      IF v_first_lit_idx IS NULL THEN
        v_first_lit_idx := v_i;
      END IF;
    ELSIF v_trimmed ~ '^\d{1,3}(?:\.\d{1,2})?\s*(?:\.-|\.(?!\d)|\))\s+\S' AND (v_trimmed ~ '^1\s*(?:\.-|\.(?!\d)|\))\s+' OR v_num_count > 0) THEN
      v_num_count := v_num_count + 1;
      IF v_first_num_idx IS NULL THEN
        v_first_num_idx := v_i;
      END IF;
    END IF;
  END LOOP;

  IF v_lit_count >= 2 AND (v_num_count < 2 OR v_first_lit_idx < v_first_num_idx) THEN
    v_mode := 'literal';
  ELSIF v_num_count >= 2 THEN
    v_mode := 'numeral';
  ELSIF v_lit_count = 1 AND v_first_lit_idx IS NOT NULL THEN
    v_mode := 'literal';
  ELSIF v_num_count = 1 AND v_first_num_idx IS NOT NULL THEN
    v_mode := 'numeral';
  ELSE
    v_mode := 'paragraph';
  END IF;

  IF v_mode IN ('literal', 'numeral') THEN
    FOR v_i IN 1..v_len LOOP
      v_line := v_lines[v_i];
      v_trimmed := btrim(v_line);

      v_match := NULL;
      IF v_mode = 'literal' THEN
        v_match := regexp_match(v_trimmed, '^([a-zñ])\)\s*');
      ELSE
        v_match := regexp_match(v_trimmed, '^(\d{1,3}(?:\.\d{1,2})?)\s*(?:\.-|\.(?!\d)|\))\s+');
      END IF;

      IF v_match IS NOT NULL THEN
        -- Emitir bloque acumulado anterior si tiene texto
        IF btrim(v_curr_buf) <> '' THEN
          sub_identifier := v_curr_sub_id;
          structure_type := v_curr_type;
          sub_kind := v_curr_kind;
          sub_code := v_curr_code;
          display_marker := v_curr_marker;
          ordinal := v_curr_ord;
          content := btrim(v_curr_buf);
          RETURN NEXT;
        END IF;

        v_seq := v_seq + 1;
        v_code := lower(v_match[1]);
        IF v_mode = 'literal' THEN
          v_curr_sub_id := v_art_id || '::lit:' || v_code;
          v_curr_type := 'literal';
          v_curr_kind := 'literal';
          v_curr_code := v_code;
          v_curr_marker := v_code || ')';
        ELSE
          v_curr_sub_id := v_art_id || '::num:' || v_code;
          v_curr_type := 'numeral';
          v_curr_kind := 'numeral';
          v_curr_code := v_code;
          v_curr_marker := v_code || '.-';
        END IF;
        v_curr_ord := v_seq * 10;
        v_curr_buf := v_line;
      ELSE
        IF v_curr_sub_id IS NULL THEN
          -- Encabezado introductorio previo al primer literal o numeral
          IF v_trimmed <> '' THEN
            v_curr_sub_id := v_art_id || '::intro';
            v_curr_type := 'paragraph';
            v_curr_kind := 'intro';
            v_curr_code := 'intro';
            v_curr_marker := 'Encabezado';
            v_curr_ord := 0;
            v_curr_buf := v_line;
          END IF;
        ELSE
          v_curr_buf := v_curr_buf || E'\n' || v_line;
        END IF;
      END IF;
    END LOOP;

    IF btrim(v_curr_buf) <> '' THEN
      sub_identifier := v_curr_sub_id;
      structure_type := v_curr_type;
      sub_kind := v_curr_kind;
      sub_code := v_curr_code;
      display_marker := v_curr_marker;
      ordinal := v_curr_ord;
      content := btrim(v_curr_buf);
      RETURN NEXT;
    END IF;
  ELSE
    -- Modo párrafos: agrupar bloques separados por línea en blanco (manteniendo tablas Markdown intactas)
    FOR v_i IN 1..v_len LOOP
      v_line := v_lines[v_i];
      v_trimmed := btrim(v_line);

      IF v_trimmed = '' THEN
        IF NOT v_in_table AND btrim(v_curr_buf) <> '' THEN
          v_seq := v_seq + 1;
          sub_identifier := v_art_id || '::p:' || v_seq::text;
          structure_type := 'paragraph';
          sub_kind := 'paragraph';
          sub_code := v_seq::text;
          display_marker := 'Inciso ' || v_seq::text;
          ordinal := v_seq * 10;
          content := btrim(v_curr_buf);
          RETURN NEXT;
          v_curr_buf := '';
        END IF;
      ELSE
        v_in_table := (v_trimmed LIKE '|%|');
        IF v_curr_buf = '' THEN
          v_curr_buf := v_line;
        ELSE
          v_curr_buf := v_curr_buf || E'\n' || v_line;
        END IF;
      END IF;
    END LOOP;

    IF btrim(v_curr_buf) <> '' THEN
      v_seq := v_seq + 1;
      sub_identifier := v_art_id || '::p:' || v_seq::text;
      structure_type := 'paragraph';
      sub_kind := 'paragraph';
      sub_code := v_seq::text;
      display_marker := 'Inciso ' || v_seq::text;
      ordinal := v_seq * 10;
      content := btrim(v_curr_buf);
      RETURN NEXT;
    END IF;
  END IF;
END;
$function$;

-- 5. Detector automático de tablas de PDF escaneado desordenadas o incompletas
CREATE OR REPLACE FUNCTION public.validate_normative_table_structure(
  p_table jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $function$
DECLARE
  v_warnings text[] := ARRAY[]::text[];
  v_rows jsonb := COALESCE(p_table->'rows_data', '[]'::jsonb);
  v_cols jsonb := COALESCE(p_table->'columns_schema', '[]'::jsonb);
  v_cat text := lower(COALESCE(p_table->>'categoria_tabla', p_table->>'table_category', 'other'));
  v_row_count int4;
  v_col_count int4;
  v_idx int4;
  v_row jsonb;
  v_prev_fb numeric := NULL;
  v_prev_eh numeric := NULL;
  v_fb numeric;
  v_eh numeric;
  v_pct numeric;
  v_is_progressive boolean;
BEGIN
  IF jsonb_typeof(v_rows) <> 'array' OR jsonb_array_length(v_rows) = 0 THEN
    v_warnings := array_append(v_warnings, 'La tabla no contiene filas estructuradas (rows_data vacío).');
    RETURN jsonb_build_object('valid', false, 'warnings', to_jsonb(v_warnings));
  END IF;

  v_row_count := jsonb_array_length(v_rows);
  v_col_count := CASE WHEN jsonb_typeof(v_cols) = 'array' THEN jsonb_array_length(v_cols) ELSE 0 END;

  v_is_progressive := (
    v_cat IN ('progressive_rates', 'inheritance')
    OR ((v_rows->0) ? 'fraccion_basica' AND (v_rows->0) ? 'exceso_hasta')
  );

  FOR v_idx IN 0..(v_row_count - 1) LOOP
    v_row := v_rows->v_idx;

    IF jsonb_typeof(v_row) = 'object' THEN
      IF v_col_count >= 3 AND (SELECT count(*) FROM jsonb_object_keys(v_row)) < v_col_count - 1 THEN
        v_warnings := array_append(
          v_warnings,
          format('Fila %s tiene menos columnas de las esperadas (posible PDF escaneado desalineado).', v_idx + 1)
        );
      END IF;

      IF v_is_progressive THEN
        BEGIN
          v_fb := NULLIF(regexp_replace(COALESCE(v_row->>'fraccion_basica', ''), '[^0-9.\-]', '', 'g'), '')::numeric;
        EXCEPTION WHEN others THEN
          v_fb := NULL;
        END;

        BEGIN
          IF lower(COALESCE(v_row->>'exceso_hasta', '')) ~ '(adelante|infinito)' OR NULLIF(btrim(COALESCE(v_row->>'exceso_hasta', '')), '') IS NULL THEN
            v_eh := NULL;
          ELSE
            v_eh := NULLIF(regexp_replace(v_row->>'exceso_hasta', '[^0-9.\-]', '', 'g'), '')::numeric;
          END IF;
        EXCEPTION WHEN others THEN
          v_eh := NULL;
        END;

        IF v_fb IS NULL THEN
          v_warnings := array_append(v_warnings, format('Fila %s sin valor numérico en fraccion_basica.', v_idx + 1));
        ELSE
          IF v_prev_fb IS NOT NULL AND v_fb < v_prev_fb THEN
            v_warnings := array_append(
              v_warnings,
              format('Filas desordenadas en tramo %s: fraccion_basica (%s) menor que fila anterior (%s).', v_idx + 1, v_fb, v_prev_fb)
            );
          END IF;
          IF v_prev_eh IS NOT NULL AND abs(v_fb - v_prev_eh) > 2 THEN
            v_warnings := array_append(
              v_warnings,
              format('Salto discontinuo en tramo %s: fraccion_basica (%s) no continúa el exceso_hasta previo (%s).', v_idx + 1, v_fb, v_prev_eh)
            );
          END IF;
          IF v_eh IS NOT NULL AND v_eh < v_fb THEN
            v_warnings := array_append(
              v_warnings,
              format('Tramo invertido en fila %s: exceso_hasta (%s) menor que fraccion_basica (%s).', v_idx + 1, v_eh, v_fb)
            );
          END IF;
        END IF;

        IF v_idx < v_row_count - 1 AND v_eh IS NULL THEN
          v_warnings := array_append(v_warnings, format('Fila intermedia %s sin límite exceso_hasta.', v_idx + 1));
        END IF;

        v_prev_fb := v_fb;
        v_prev_eh := v_eh;
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'valid', COALESCE(array_length(v_warnings, 1), 0) = 0,
    'warnings', to_jsonb(v_warnings)
  );
END;
$function$;

-- 6. Renderizador determinista de tabla Markdown desde JSON estructurado
CREATE OR REPLACE FUNCTION public.render_normative_table_markdown(
  p_table jsonb
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $function$
DECLARE
  v_raw_md text;
  v_cols jsonb;
  v_rows jsonb;
  v_col jsonb;
  v_row jsonb;
  v_headers text[] := ARRAY[]::text[];
  v_seps text[] := ARRAY[]::text[];
  v_cells text[];
  v_lines text[] := ARRAY[]::text[];
  v_val text;
  v_num numeric;
  v_col_key text;
  v_col_type text;
BEGIN
  v_raw_md := NULLIF(btrim(COALESCE(p_table->>'markdown_tabla', p_table->>'markdown_content', '')), '');
  IF v_raw_md IS NOT NULL AND v_raw_md LIKE '%|%|%' AND v_raw_md ~ '\|[\s\-:]+\|' THEN
    RETURN v_raw_md;
  END IF;

  v_cols := COALESCE(p_table->'columns_schema', '[]'::jsonb);
  v_rows := COALESCE(p_table->'rows_data', '[]'::jsonb);

  IF jsonb_typeof(v_cols) <> 'array' OR jsonb_array_length(v_cols) = 0 OR jsonb_typeof(v_rows) <> 'array' OR jsonb_array_length(v_rows) = 0 THEN
    RETURN COALESCE(v_raw_md, '');
  END IF;

  FOR v_col IN SELECT * FROM jsonb_array_elements(v_cols) LOOP
    v_headers := array_append(v_headers, COALESCE(v_col->>'label', v_col->>'key', 'Columna'));
    v_seps := array_append(v_seps, '---');
  END LOOP;

  v_lines := array_append(v_lines, '| ' || array_to_string(v_headers, ' | ') || ' |');
  v_lines := array_append(v_lines, '| ' || array_to_string(v_seps, ' | ') || ' |');

  FOR v_row IN SELECT * FROM jsonb_array_elements(v_rows) LOOP
    v_cells := ARRAY[]::text[];
    FOR v_col IN SELECT * FROM jsonb_array_elements(v_cols) LOOP
      v_col_key := v_col->>'key';
      v_col_type := lower(COALESCE(v_col->>'type', 'text'));
      v_val := v_row->>v_col_key;

      IF v_val IS NULL OR btrim(v_val) = '' THEN
        IF v_col_key = 'exceso_hasta' THEN
          v_val := 'En adelante';
        ELSE
          v_val := '-';
        END IF;
      ELSIF v_col_type = 'percentage' AND v_val !~ '%$' THEN
        v_val := v_val || '%';
      ELSIF v_col_type = 'currency' AND v_val ~ '^\d+(?:\.\d+)?$' THEN
        v_num := v_val::numeric;
        IF v_num = trunc(v_num) THEN
          v_val := btrim(to_char(v_num, 'FM999,999,999,990'));
        ELSE
          v_val := btrim(to_char(v_num, 'FM999,999,999,990.00'));
        END IF;
      END IF;

      v_cells := array_append(v_cells, v_val);
    END LOOP;
    v_lines := array_append(v_lines, '| ' || array_to_string(v_cells, ' | ') || ' |');
  END LOOP;

  RETURN array_to_string(v_lines, E'\n');
END;
$function$;

-- 7. Sustitución quirúrgica de ÚNICAMENTE la tabla Markdown dentro de un texto preservando 100% la prosa
CREATE OR REPLACE FUNCTION public.replace_markdown_table_in_text(
  p_text text,
  p_new_table_md text,
  p_table_caption text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $function$
DECLARE
  v_lines text[];
  v_len int4;
  v_i int4;
  v_start int4 := NULL;
  v_end int4 := NULL;
  v_caption_idx int4 := NULL;
  v_trimmed text;
  v_before text[] := ARRAY[]::text[];
  v_after text[] := ARRAY[]::text[];
  v_mid text;
BEGIN
  IF NULLIF(btrim(COALESCE(p_new_table_md, '')), '') IS NULL THEN
    RETURN COALESCE(p_text, '');
  END IF;

  v_lines := string_to_array(replace(replace(COALESCE(p_text, ''), E'\r\n', E'\n'), E'\r', E'\n'), E'\n');
  v_len := COALESCE(array_length(v_lines, 1), 0);

  FOR v_i IN 1..v_len LOOP
    v_trimmed := btrim(v_lines[v_i]);
    IF v_trimmed LIKE '|%|' THEN
      IF v_start IS NULL THEN
        v_start := v_i;
      END IF;
      v_end := v_i;
    ELSIF v_start IS NOT NULL THEN
      EXIT;
    END IF;
  END LOOP;

  IF v_start IS NULL THEN
    -- Si el texto no tenía tabla previa, añadirla al final sin alterar la prosa
    IF NULLIF(btrim(COALESCE(p_table_caption, '')), '') IS NOT NULL THEN
      RETURN rtrim(COALESCE(p_text, '')) || E'\n\n' || btrim(p_table_caption) || E'\n' || btrim(p_new_table_md);
    END IF;
    RETURN rtrim(COALESCE(p_text, '')) || E'\n\n' || btrim(p_new_table_md);
  END IF;

  -- Detectar si la línea inmediata anterior a la tabla es una cabecera de año/título de tabla (ej. **AÑO 2006** o IMPUESTO A LA RENTA ... AÑO 2026)
  IF v_start > 1 THEN
    v_trimmed := btrim(v_lines[v_start - 1]);
    IF v_trimmed ~* '^(?:\*\*)?(?:A[ÑN]O\s+\d{4}|IMPUESTO\s+(?:A\s+LA\s+RENTA|HERENCIAS)|HERENCIAS,\s+LEGADOS|TABLA\b)' THEN
      v_caption_idx := v_start - 1;
    END IF;
  END IF;

  IF v_caption_idx IS NOT NULL THEN
    IF v_caption_idx > 1 THEN
      v_before := v_lines[1:(v_caption_idx - 1)];
    END IF;
  ELSIF v_start > 1 THEN
    v_before := v_lines[1:(v_start - 1)];
  END IF;

  IF v_end < v_len THEN
    v_after := v_lines[(v_end + 1):v_len];
  END IF;

  IF NULLIF(btrim(COALESCE(p_table_caption, '')), '') IS NOT NULL THEN
    v_mid := btrim(p_table_caption) || E'\n' || btrim(p_new_table_md);
  ELSIF v_caption_idx IS NOT NULL THEN
    v_mid := btrim(v_lines[v_caption_idx]) || E'\n' || btrim(p_new_table_md);
  ELSE
    v_mid := btrim(p_new_table_md);
  END IF;

  RETURN btrim(
    CASE WHEN array_length(v_before, 1) > 0 THEN rtrim(array_to_string(v_before, E'\n'), E'\n') || E'\n\n' ELSE '' END
    || v_mid
    || CASE WHEN array_length(v_after, 1) > 0 THEN E'\n\n' || ltrim(array_to_string(v_after, E'\n'), E'\n') ELSE '' END
  );
END;
$function$;

-- 8. Aplicación determinista de parches exactos de palabras/frases (cero parafraseo, warnings si no coincide)
CREATE OR REPLACE FUNCTION public.apply_exact_text_patches(
  p_text text,
  p_patches jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $function$
DECLARE
  v_result text := COALESCE(p_text, '');
  v_warnings text[] := ARRAY[]::text[];
  v_patch jsonb;
  v_action text;
  v_anchor text;
  v_find text;
  v_replace text;
  v_anchor_pos int4;
  v_search_start int4;
  v_find_pos int4;
  v_tail text;
  v_head text;
  v_mid text;
BEGIN
  IF p_patches IS NULL OR jsonb_typeof(p_patches) <> 'array' THEN
    RETURN jsonb_build_object('ok', true, 'content', v_result, 'warnings', '[]'::jsonb);
  END IF;

  FOR v_patch IN SELECT * FROM jsonb_array_elements(p_patches) LOOP
    v_action := lower(COALESCE(v_patch->>'accion', v_patch->>'action', 'replace'));
    v_anchor := NULLIF(COALESCE(v_patch->>'ancla', v_patch->>'anchor', v_patch->>'contexto_previo', ''), '');
    v_find := COALESCE(v_patch->>'buscar', v_patch->>'find_text', '');
    v_replace := COALESCE(v_patch->>'reemplazar', v_patch->>'replace_text', '');

    v_search_start := 1;
    IF v_anchor IS NOT NULL THEN
      v_anchor_pos := strpos(lower(v_result), lower(v_anchor));
      IF v_anchor_pos = 0 THEN
        v_warnings := array_append(
          v_warnings,
          format('No se encontró el contexto ancla "%s" para la acción %s.', left(v_anchor, 80), v_action)
        );
        CONTINUE;
      END IF;
      v_search_start := v_anchor_pos + length(v_anchor);
    END IF;

    IF v_action = 'insert_after' THEN
      IF v_anchor IS NULL AND v_find <> '' THEN
        v_anchor_pos := strpos(lower(v_result), lower(v_find));
        IF v_anchor_pos = 0 THEN
          v_warnings := array_append(v_warnings, format('No se encontró "%s" para insertar después.', left(v_find, 80)));
          CONTINUE;
        END IF;
        v_search_start := v_anchor_pos + length(v_find);
      END IF;
      v_result := left(v_result, v_search_start - 1) || v_replace || substring(v_result FROM v_search_start);
    ELSIF v_action IN ('replace', 'delete') THEN
      IF v_find = '' THEN
        v_warnings := array_append(v_warnings, format('Parche %s sin texto a buscar.', v_action));
        CONTINUE;
      END IF;
      v_tail := substring(v_result FROM v_search_start);
      v_find_pos := strpos(lower(v_tail), lower(v_find));
      IF v_find_pos = 0 THEN
        v_warnings := array_append(
          v_warnings,
          format('No se encontró el texto exacto "%s" (ancla: %s).', left(v_find, 80), COALESCE(left(v_anchor, 50), 'ninguna'))
        );
        CONTINUE;
      END IF;

      v_head := left(v_result, v_search_start - 1) || left(v_tail, v_find_pos - 1);
      v_mid := substring(v_tail FROM (v_find_pos + length(v_find)));
      IF v_action = 'delete' THEN
        -- Limpiar doble espacio al eliminar una palabra
        v_result := v_head || v_mid;
        v_result := regexp_replace(v_result, '  +', ' ', 'g');
        v_result := regexp_replace(v_result, ' ([.,;:])', '\1', 'g');
      ELSE
        v_result := v_head || v_replace || v_mid;
      END IF;
    ELSE
      v_warnings := array_append(v_warnings, format('Acción de parche desconocida: %s', v_action));
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', COALESCE(array_length(v_warnings, 1), 0) = 0,
    'content', v_result,
    'warnings', to_jsonb(v_warnings)
  );
END;
$function$;

-- 9. Sincronizador de sub-elementos de un artículo ya almacenado
CREATE OR REPLACE FUNCTION public.sync_article_subelements(
  p_article_structure_id uuid,
  p_changed_sub_identifiers text[] DEFAULT NULL
)
RETURNS int4
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_parent record;
  v_sub record;
  v_count int4 := 0;
  v_is_changed boolean;
  v_existing_id uuid;
  v_kept_ids uuid[] := ARRAY[]::uuid[];
BEGIN
  SELECT * INTO v_parent
  FROM public.normative_structures
  WHERE id = p_article_structure_id;

  IF v_parent.id IS NULL THEN
    RETURN 0;
  END IF;

  FOR v_sub IN
    SELECT *
    FROM public.parse_article_subelements(v_parent.identifier, v_parent.content)
    ORDER BY ordinal
  LOOP
    v_is_changed := CASE
      WHEN p_changed_sub_identifiers IS NULL THEN true
      ELSE (v_sub.sub_identifier = ANY(p_changed_sub_identifiers))
    END;

    SELECT id INTO v_existing_id
    FROM public.normative_structures
    WHERE parent_id = v_parent.id
      AND identifier = v_sub.sub_identifier
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
      UPDATE public.normative_structures
      SET
        structure_type = v_sub.structure_type,
        title = CASE
          WHEN v_sub.sub_kind = 'literal' THEN 'Literal ' || v_sub.display_marker
          WHEN v_sub.sub_kind = 'numeral' THEN 'Numeral ' || v_sub.sub_code
          WHEN v_sub.sub_kind = 'intro' THEN 'Encabezado'
          ELSE v_sub.display_marker
        END,
        content = v_sub.content,
        ordinal = v_sub.ordinal,
        is_current = v_parent.is_current,
        legal_status = v_parent.legal_status,
        valid_from = v_parent.valid_from,
        valid_until = v_parent.valid_until,
        review_status = v_parent.review_status,
        metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
          'article_identifier', v_parent.identifier,
          'sub_kind', v_sub.sub_kind,
          'sub_code', v_sub.sub_code,
          'display_marker', v_sub.display_marker,
          'changed_in_this_version', v_is_changed,
          'reform_source_cite', v_parent.metadata->>'reform_source_cite',
          'official_registry', v_parent.metadata->>'official_registry',
          'ro_published_on', v_parent.metadata->>'ro_published_on',
          'tax_periodicity', v_parent.metadata->>'tax_periodicity',
          'summary_change', v_parent.metadata->>'summary_change'
        ),
        updated_at = now()
      WHERE id = v_existing_id;
      v_kept_ids := array_append(v_kept_ids, v_existing_id);
    ELSE
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
        v_parent.norm_version_id,
        v_parent.id,
        v_sub.structure_type,
        v_sub.sub_identifier,
        CASE
          WHEN v_sub.sub_kind = 'literal' THEN 'Literal ' || v_sub.display_marker
          WHEN v_sub.sub_kind = 'numeral' THEN 'Numeral ' || v_sub.sub_code
          WHEN v_sub.sub_kind = 'intro' THEN 'Encabezado'
          ELSE v_sub.display_marker
        END,
        v_sub.content,
        v_sub.ordinal,
        v_parent.review_status,
        v_parent.is_current,
        v_parent.legal_status,
        v_parent.valid_from,
        v_parent.valid_until,
        v_parent.extraction_run_id,
        jsonb_build_object(
          'article_identifier', v_parent.identifier,
          'sub_kind', v_sub.sub_kind,
          'sub_code', v_sub.sub_code,
          'display_marker', v_sub.display_marker,
          'changed_in_this_version', v_is_changed,
          'reform_source_cite', v_parent.metadata->>'reform_source_cite',
          'official_registry', v_parent.metadata->>'official_registry',
          'ro_published_on', v_parent.metadata->>'ro_published_on',
          'tax_periodicity', v_parent.metadata->>'tax_periodicity',
          'summary_change', v_parent.metadata->>'summary_change'
        )
      )
      RETURNING id INTO v_existing_id;
      v_kept_ids := array_append(v_kept_ids, v_existing_id);
    END IF;

    v_count := v_count + 1;
  END LOOP;

  -- Marcar como obsoletos los hijos sobrantes que ya no existen en esta versión (sin borrado físico)
  IF array_length(v_kept_ids, 1) > 0 THEN
    UPDATE public.normative_structures
    SET is_current = false, legal_status = 'derogado', metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('obsolete_subelement', true), updated_at = now()
    WHERE parent_id = v_parent.id
      AND structure_type IN ('literal', 'numeral', 'paragraph', 'item')
      AND NOT (id = ANY(v_kept_ids));
  END IF;

  RETURN v_count;
END;
$function$;

-- 10. Recálculo íntegro de línea de tiempo (valid_until + is_current) del artículo y sus hijos
CREATE OR REPLACE FUNCTION public.recompute_article_timeline(
  p_norm_id uuid,
  p_identifier text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_rec record;
  v_ids uuid[] := ARRAY[]::uuid[];
  v_valid_froms date[] := ARRAY[]::date[];
  v_manual_flags boolean[] := ARRAY[]::boolean[];
  v_total int4;
  v_i int4;
  v_next_vf date;
  v_calc_until date;
  v_calc_current boolean;
BEGIN
  FOR v_rec IN
    SELECT
      ns.id,
      COALESCE(ns.valid_from, nv.published_on, '0001-01-01'::date) AS eff_vf,
      COALESCE((ns.metadata->>'manual_validity_override')::boolean, false) AS is_manual
    FROM public.normative_structures ns
    JOIN public.norm_versions nv ON nv.id = ns.norm_version_id
    WHERE nv.norm_id = p_norm_id
      AND ns.structure_type IN ('article', 'transitory', 'final', 'reform', 'other')
      AND lower(btrim(ns.identifier)) = lower(btrim(p_identifier))
      AND NOT COALESCE((ns.metadata->>'is_fe_erratas_replaced')::boolean, false)
    ORDER BY
      COALESCE(ns.valid_from, nv.published_on, '0001-01-01'::date) ASC,
      COALESCE(NULLIF(ns.metadata->>'ro_published_on', '')::date, nv.published_on, '0001-01-01'::date) ASC,
      nv.version_number ASC,
      ns.created_at ASC
  LOOP
    v_ids := array_append(v_ids, v_rec.id);
    v_valid_froms := array_append(v_valid_froms, v_rec.eff_vf);
    v_manual_flags := array_append(v_manual_flags, v_rec.is_manual);
  END LOOP;

  v_total := COALESCE(array_length(v_ids, 1), 0);
  IF v_total = 0 THEN
    RETURN;
  END IF;

  -- Asegurar que versiones reemplazadas por Fe de Erratas nunca sean is_current = true
  UPDATE public.normative_structures ns
  SET is_current = false, updated_at = now()
  FROM public.norm_versions nv
  WHERE ns.norm_version_id = nv.id
    AND nv.norm_id = p_norm_id
    AND ns.structure_type IN ('article', 'transitory', 'final', 'reform', 'other')
    AND lower(btrim(ns.identifier)) = lower(btrim(p_identifier))
    AND COALESCE((ns.metadata->>'is_fe_erratas_replaced')::boolean, false)
    AND ns.is_current = true;

  FOR v_i IN 1..v_total LOOP
    v_calc_current := (v_i = v_total);
    IF v_calc_current THEN
      v_calc_until := NULL;
    ELSE
      v_next_vf := v_valid_froms[v_i + 1];
      IF v_next_vf > v_valid_froms[v_i] THEN
        v_calc_until := (v_next_vf - INTERVAL '1 day')::date;
      ELSE
        v_calc_until := v_valid_froms[v_i];
      END IF;
    END IF;

    UPDATE public.normative_structures
    SET
      is_current = v_calc_current,
      valid_until = CASE
        WHEN v_manual_flags[v_i] THEN valid_until
        ELSE v_calc_until
      END,
      updated_at = now()
    WHERE id = v_ids[v_i];

    -- Propagar is_current, valid_from y valid_until a los sub-elementos hijos
    UPDATE public.normative_structures c
    SET
      is_current = p.is_current,
      valid_from = p.valid_from,
      valid_until = p.valid_until,
      updated_at = now()
    FROM public.normative_structures p
    WHERE c.parent_id = p.id
      AND p.id = v_ids[v_i]
      AND c.structure_type IN ('literal', 'numeral', 'paragraph', 'item');
  END LOOP;
END;
$function$;

-- 11. Nueva versión canónica y consolidada de apply_official_registry_reform
CREATE OR REPLACE FUNCTION public.apply_official_registry_reform(
  p_target_norm_code text,
  p_target_article_identifier text,
  p_new_title text DEFAULT NULL,
  p_new_content text DEFAULT NULL,
  p_effective_date date DEFAULT CURRENT_DATE,
  p_valid_until date DEFAULT NULL,
  p_change_type text DEFAULT 'modified',
  p_reform_source_cite text DEFAULT NULL,
  p_official_registry_cite text DEFAULT NULL,
  p_summary_change text DEFAULT NULL,
  p_modifying_structure_id uuid DEFAULT NULL,
  p_source_document_id uuid DEFAULT NULL,
  p_legal_status text DEFAULT 'vigente_reformado',
  p_normative_tables jsonb DEFAULT NULL,
  p_operations jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_target_norm_id uuid;
  v_target_norm_code text;
  v_clean_target_id text;
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
  v_inferred_parent_id uuid;
  v_inferred_parent_title text;
  v_inferred_parent_chapter text;
  v_target_struct_id uuid;
  v_is_updating_existing boolean := false;

  -- Trabajo jerárquico en memoria (jsonb array de sub-elementos)
  v_subs jsonb := '[]'::jsonb;
  v_new_subs jsonb;
  v_sub_item jsonb;
  v_sub_rec record;
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
  -- 1. Resolver norma objetivo
  SELECT id, code INTO v_target_norm_id, v_target_norm_code
  FROM public.norms
  WHERE upper(code) = upper(btrim(p_target_norm_code))
  LIMIT 1;

  IF v_target_norm_id IS NULL THEN
    RAISE EXCEPTION 'Target norm % not found', p_target_norm_code;
  END IF;

  -- 2. Normalizar identificador de artículo objetivo (nunca listas ni "varios")
  v_clean_target_id := btrim(COALESCE(p_target_article_identifier, ''));
  IF v_clean_target_id = '' OR v_clean_target_id ~* '^(varios|varias|disposici[oó]n\y)' OR v_clean_target_id LIKE '%,%' THEN
    RETURN NULL;
  END IF;

  v_clean_target_id := regexp_replace(v_clean_target_id, '^(?:art(?:[íi]culo|\.)?\s*)+', '', 'i');
  v_clean_target_id := regexp_replace(v_clean_target_id, '(?:\.[a-zA-Z]+|\s+(?:literal|inciso|numeral|ordinal|p[aá]rrafo)\y.*)$', '', 'i');
  v_clean_target_id := btrim(v_clean_target_id, ' :.-');

  IF v_clean_target_id = '' THEN
    RETURN NULL;
  END IF;

  -- Rechazar textos comodín vacíos si no hay operaciones estructuradas
  IF (p_operations IS NULL OR jsonb_typeof(p_operations) <> 'array' OR jsonb_array_length(p_operations) = 0)
     AND length(btrim(COALESCE(p_new_content, ''))) < 140
     AND btrim(COALESCE(p_new_content, '')) ~* '^(texto\s+consolidado\s+(resultante\s+)?del\s+art[íi]culo|el\s+texto\s+consolidado\s+de\s+este\s+art[íi]culo\s+no\s+est[áa]\s+disponible)' THEN
    RETURN NULL;
  END IF;

  -- 3. Clasificar vigencia tributaria (Art. 11 Código Tributario)
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

  v_art_num := NULLIF((regexp_match(v_clean_target_id, '^\D*(\d{1,6})'))[1], '')::int4;

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

  -- 4. Resolver o crear UNA ÚNICA norm_version para este Registro Oficial
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

  -- 5. Consolidación única por Registro Oficial: comprobar si ya existe la fila de este artículo en v_new_version_id
  SELECT id INTO v_existing_same_ro_id
  FROM public.normative_structures
  WHERE norm_version_id = v_new_version_id
    AND structure_type IN ('article', 'transitory', 'final', 'reform', 'other')
    AND lower(btrim(identifier)) = lower(v_clean_target_id)
  ORDER BY created_at DESC
  LIMIT 1;

  -- Buscar la versión cronológica inmediatamente anterior (distinta de v_new_version_id)
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
      NULLIF(ns.metadata->>'parent_chapter', '')
    INTO v_base_parent_id, v_base_parent_title, v_base_parent_chapter
    FROM public.normative_structures ns
    JOIN public.norm_versions nv ON nv.id = ns.norm_version_id
    WHERE nv.norm_id = v_target_norm_id
      AND ns.structure_type = 'article'
      AND lower(btrim(ns.identifier)) = lower(v_art_num::text)
      AND ns.metadata->>'parent_chapter' IS NOT NULL
    ORDER BY ns.is_current DESC, nv.version_number DESC
    LIMIT 1;
  END IF;

  -- 6. Cargar los sub-elementos base en memoria (desde la versión ya abierta del mismo R.O. o desde v_prev_struct)
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
      AND structure_type IN ('literal', 'numeral', 'paragraph', 'item');

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
    -- Leer hijos ya guardados de v_prev_struct o parsearlos al vuelo sin alterar nada
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
      AND structure_type IN ('literal', 'numeral', 'paragraph', 'item');

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

  -- Recolectar modifying_structure_id y resumen principal
  IF p_modifying_structure_id IS NOT NULL THEN
    v_mod_ids := array_append(v_mod_ids, p_modifying_structure_id);
  END IF;
  IF NULLIF(btrim(COALESCE(p_summary_change, '')), '') IS NOT NULL THEN
    v_summaries := array_append(v_summaries, btrim(p_summary_change));
  END IF;

  -- 7. Ejecutar operaciones literales estructuradas (si p_operations viene poblado)
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

      -- Construir sub_identifier esperado si apunta a un sub-nivel
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

      -- A) MODO SOLO TABLA: clona 100% la prosa y cambia ÚNICAMENTE la tabla Markdown
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
                '_validation', v_tbl_val
              )
            );
          END LOOP;
        END IF;

      -- B) MODO REEMPLAZAR SUB-ELEMENTO COMPLETO (literal / numeral / párrafo)
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
          -- Si no existía aún ese literal/numeral en la versión anterior, añadirlo al final
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
                '_validation', v_tbl_val
              )
            );
          END LOOP;
        END IF;

      -- C) MODO AÑADIR SUB-ELEMENTO
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

      -- D) MODO DEROGAR SUB-ELEMENTO
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

      -- E) MODO PARCHE EXACTO DE PALABRAS / FRASES (cero parafraseo)
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
                -- Aplicar los parches que sí coincidieron aunque quede en pending_review
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

      -- F) MODO REEMPLAZO / CREACIÓN / DEROGACIÓN COMPLETA DEL ARTÍCULO
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
                '_validation', v_tbl_val
              )
            );
          END LOOP;
        END IF;
      END IF;
    END LOOP;

  -- 8. Modo legado compatible (sin p_operations, solo p_new_content completo limpio)
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

  -- Añadir también tablas pasadas directamente en p_normative_tables (si no vinieron en p_operations)
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
          '_validation', v_tbl_val
        )
      );
    END LOOP;
  END IF;

  -- 9. Reconstruir el texto completo del artículo padre desde sus sub-elementos ordenados
  SELECT string_agg(elem->>'content', E'\n\n' ORDER BY (elem->>'ordinal')::int4)
  INTO v_final_content
  FROM jsonb_array_elements(v_subs) elem
  WHERE NULLIF(btrim(COALESCE(elem->>'content', '')), '') IS NOT NULL;

  v_final_content := COALESCE(v_final_content, public.clean_article_body_prefix(v_clean_target_id, p_new_content));

  -- Si hubo cualquier warning (parche sin coincidencia exacta o tabla escaneada desordenada) -> pending_review
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

  -- 10. Insertar o actualizar (consolidando) la fila única del artículo para este R.O.
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
      COALESCE(v_prev_struct.structure_type, 'article'),
      v_clean_target_id,
      COALESCE(NULLIF(p_new_title, ''), v_prev_struct.title, 'Art. ' || v_clean_target_id),
      v_final_content,
      COALESCE(v_prev_struct.ordinal, v_art_num, 1),
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

    -- Marcar versión previa reemplazada si es Fe de Erratas
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

    -- Heredar conceptos tributarios del artículo previo
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

  -- 11. Upsert limpio de todos los sub-elementos hijos (sin borrado físico)
  FOR v_sub_item IN
    SELECT value FROM jsonb_array_elements(v_subs) ORDER BY (value->>'ordinal')::int4
  LOOP
    INSERT INTO public.normative_structures (
      norm_version_id, parent_id, structure_type, identifier, title, content,
      ordinal, review_status, is_current, legal_status, valid_from, valid_until, metadata
    )
    SELECT
      v_new_version_id,
      v_target_struct_id,
      CASE
        WHEN (v_sub_item->>'structure_type') IN ('literal', 'numeral', 'paragraph', 'item')
          THEN v_sub_item->>'structure_type'
        ELSE 'paragraph'
      END,
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
      CASE
        WHEN (v_sub_item->>'legal_status') IN ('vigente', 'vigente_reformado', 'derogado')
          THEN v_sub_item->>'legal_status'
        ELSE v_effective_legal_status
      END,
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
    WHERE NOT EXISTS (
      SELECT 1 FROM public.normative_structures existing_sub
      WHERE existing_sub.parent_id = v_target_struct_id
        AND existing_sub.identifier = v_sub_item->>'sub_identifier'
    );
  END LOOP;

  -- 12. Recalcular línea de tiempo completa (is_current + valid_until en padre e hijos)
  PERFORM public.recompute_article_timeline(v_target_norm_id, v_clean_target_id);

  SELECT is_current INTO v_final_is_current
  FROM public.normative_structures
  WHERE id = v_target_struct_id;

  -- 13. Guardar tablas vinculadas al sub-elemento exacto y desactivar tablas previas de la misma categoría
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
        LIMIT 1;
        v_tbl_target_struct_id := COALESCE(v_tbl_target_struct_id, v_target_struct_id);
      END IF;

      -- Si esta versión es la vigente actual, desactivar tablas previas de la misma categoría para este artículo
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
        jsonb_build_object(
          'article_structure_id', v_target_struct_id,
          'article_identifier', v_clean_target_id,
          'sub_identifier', v_tbl_sub_id,
          'table_diff_mode', COALESCE(v_tbl->>'_table_diff_mode', v_table_diff_mode),
          'scan_validation', COALESCE(v_tbl->'_validation', jsonb_build_object('valid', true, 'warnings', '[]'::jsonb))
        )
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

  -- 14. Registrar o actualizar 1 solo registro consolidado en normative_changes
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

  -- 15. Vincular cada artículo reformatorio en structure_relations sin duplicados
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

-- 12. Actualizar ingest_extracted_norm_draft para agrupar reformas por (norma, artículo) antes de aplicarlas
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
SET search_path = ''
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
  -- Cola agrupada por (norma_objetivo || '::' || articulo_objetivo)
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
    WHEN '01_codigos' THEN v_norm_type := 'organic_law'; v_feature_code := 'norms_laws';
    WHEN '02_leyes' THEN v_norm_type := 'law'; v_feature_code := 'norms_laws';
    WHEN '03_reglamentos' THEN v_norm_type := 'regulation'; v_feature_code := 'norms_regulations';
    WHEN '04_leyes_reformas' THEN v_norm_type := 'law'; v_feature_code := 'norms_historical';
    WHEN '05_resoluciones_sri' THEN v_norm_type := 'resolution'; v_feature_code := 'norms_resolutions';
    WHEN '06_circulares_sri' THEN v_norm_type := 'circular'; v_feature_code := 'norms_resolutions';
    WHEN '07_formularios_anexos' THEN v_norm_type := 'other'; v_feature_code := 'forms';
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
      'v5.0-hierarchical-literal',
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
        'storage_path', COALESCE(p_storage_path, COALESCE(p_folder_category, '00_registros_oficiales') || '/' || COALESCE(p_file_name, v_clean_norm_code || '.pdf'))
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
    'v5.0-hierarchical-literal',
    'completed',
    'smartlex-ec-juridico-v5.0-literal',
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

  -- Fase A: guardar los artículos de la norma publicada y recolectar sus operaciones de reforma agrupadas
  FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(p_articles, '[]'::jsonb)) LOOP
    v_title_id := NULL;
    v_chapter_id := NULL;
    v_did_queue_reform := false;

    v_title_text := NULLIF(btrim(COALESCE(v_item->>'parent_title', '')), '');
    v_chapter_text := NULLIF(btrim(COALESCE(v_item->>'parent_chapter', '')), '');
    v_art_valid_from := COALESCE(NULLIF(btrim(COALESCE(v_item->>'valid_from', '')), '')::date, v_pub_date);
    v_art_valid_until := NULLIF(btrim(COALESCE(v_item->>'valid_until', '')), '')::date;
    v_tax_periodicity := COALESCE(NULLIF(btrim(COALESCE(v_item->>'tax_periodicity', '')), ''), 'monthly');

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

    -- Encolar operaciones estructuradas nuevas (operaciones_reforma)
    IF jsonb_typeof(v_item->'operaciones_reforma') = 'array' AND jsonb_array_length(v_item->'operaciones_reforma') > 0 THEN
      FOR v_op IN SELECT * FROM jsonb_array_elements(v_item->'operaciones_reforma') LOOP
        v_target_norm_code_text := upper(NULLIF(btrim(COALESCE(v_op->>'norma_objetivo', v_item->>'reforms_target_norm_code', '')), ''));
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
                'tablas_normativas', COALESCE(v_op->'tablas_normativas', v_item->'normative_tables', '[]'::jsonb)
              )
            )
          );
          v_reform_groups := jsonb_set(v_reform_groups, ARRAY[v_grp_key], v_grp);
        END IF;
      END LOOP;
    ELSE
      -- Compatibilidad con formato clásico (reforms_target_* + reformas_adicionales)
      v_target_norm_code_text := upper(NULLIF(btrim(COALESCE(v_item->>'reforms_target_norm_code', '')), ''));
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
                'tablas_normativas', COALESCE(v_extra_ref->'tablas_normativas', v_extra_ref->'normative_tables', '[]'::jsonb)
              ))
            );
            v_reform_groups := jsonb_set(v_reform_groups, ARRAY[v_grp_key], v_grp);
          END IF;
        END LOOP;
      END IF;
    END IF;

    -- Conceptos verticales del artículo propio
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

    -- Tablas propias si no era una reforma hacia otra norma
    IF NOT v_did_queue_reform AND jsonb_typeof(v_item->'normative_tables') = 'array' THEN
      FOR v_tbl IN SELECT * FROM jsonb_array_elements(v_item->'normative_tables') LOOP
        v_tbl_valid_from := COALESCE(NULLIF(btrim(COALESCE(v_tbl->>'valid_from', '')), '')::date, v_art_valid_from, v_pub_date);
        v_tbl_valid_until := NULLIF(btrim(COALESCE(v_tbl->>'valid_until', '')), '')::date;
        INSERT INTO public.normative_tables (
          code, title, description, norm_id, norm_version_id, structure_id,
          tax_concept_id, table_category, fiscal_year, effective_during,
          columns_schema, rows_data, markdown_content, extraction_run_id, review_status
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
          'approved'
        )
        ON CONFLICT (code) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          fiscal_year = EXCLUDED.fiscal_year,
          effective_during = EXCLUDED.effective_during,
          rows_data = EXCLUDED.rows_data,
          columns_schema = EXCLUDED.columns_schema,
          markdown_content = EXCLUDED.markdown_content,
          updated_at = now();
        v_inserted_tables := v_inserted_tables + 1;
      END LOOP;
    END IF;

    -- Relaciones detectadas (concordancias)
    IF jsonb_typeof(v_item->'detected_relations') = 'array' THEN
      FOR v_rel IN SELECT * FROM jsonb_array_elements(v_item->'detected_relations') LOOP
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
              source_structure_id, target_structure_id, relation_type, description, extraction_run_id, review_status, metadata
            )
            VALUES (
              v_target_struct_id, v_art_id,
              CASE WHEN COALESCE(v_rel->>'tipo_relacion', 'cites') IN ('regulates','regulated_by','amends','repeals','replaces','complements','cites','clarifies','implements','concordance','other') THEN COALESCE(v_rel->>'tipo_relacion', 'cites') ELSE 'cites' END,
              COALESCE(v_rel->>'descripcion', 'Concordancia con ' || v_clean_norm_code),
              v_run_id, 'approved',
              jsonb_build_object('cited_article', v_rel->>'articulo_citado')
            );
          END IF;
        END IF;
      END LOOP;
    END IF;
  END LOOP;

  -- Fase B: aplicar cada grupo consolidado (1 sola llamada por artículo objetivo y Registro Oficial)
  FOR v_grp_rec IN SELECT key, value FROM jsonb_each(v_reform_groups) LOOP
    v_grp := v_grp_rec.value;
    v_target_norm_code_text := v_grp->>'target_norm_code';
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
