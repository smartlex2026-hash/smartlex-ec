-- Phase 7B: Soporte dual (objetos y arrays posicionales) en render_normative_table_markdown
-- y detección multi-línea de encabezados de tabla (singular/plural) en replace_markdown_table_in_text

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
  v_col_idx int4;
  v_col_count int4;
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

  v_col_count := jsonb_array_length(v_cols);
  FOR v_col_idx IN 0..(v_col_count - 1) LOOP
    v_col := v_cols->v_col_idx;
    IF jsonb_typeof(v_col) = 'string' THEN
      v_headers := array_append(v_headers, COALESCE(NULLIF(btrim(v_col #>> '{}'), ''), 'Columna'));
    ELSE
      v_headers := array_append(v_headers, COALESCE(v_col->>'label', v_col->>'key', 'Columna'));
    END IF;
    v_seps := array_append(v_seps, '---');
  END LOOP;

  v_lines := array_append(v_lines, '| ' || array_to_string(v_headers, ' | ') || ' |');
  v_lines := array_append(v_lines, '| ' || array_to_string(v_seps, ' | ') || ' |');

  FOR v_row IN SELECT * FROM jsonb_array_elements(v_rows) LOOP
    v_cells := ARRAY[]::text[];
    FOR v_col_idx IN 0..(v_col_count - 1) LOOP
      v_col := v_cols->v_col_idx;
      IF jsonb_typeof(v_col) = 'string' THEN
        v_col_key := v_col #>> '{}';
        v_col_type := 'text';
      ELSE
        v_col_key := v_col->>'key';
        v_col_type := lower(COALESCE(v_col->>'type', 'text'));
      END IF;

      IF jsonb_typeof(v_row) = 'array' THEN
        v_val := v_row->>v_col_idx;
      ELSE
        v_val := v_row->>v_col_key;
      END IF;

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
  v_probe int4;
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
    IF NULLIF(btrim(COALESCE(p_table_caption, '')), '') IS NOT NULL THEN
      RETURN rtrim(COALESCE(p_text, '')) || E'\n\n' || btrim(p_table_caption) || E'\n' || btrim(p_new_table_md);
    END IF;
    RETURN rtrim(COALESCE(p_text, '')) || E'\n\n' || btrim(p_new_table_md);
  END IF;

  -- Detectar hasta 3 líneas previas de cabecera de tabla (ej. IMPUESTO HERENCIA..., AÑO 2020, En dólares)
  v_probe := v_start - 1;
  WHILE v_probe >= GREATEST(1, v_start - 4) LOOP
    v_trimmed := btrim(v_lines[v_probe]);
    IF v_trimmed = '' THEN
      v_probe := v_probe - 1;
      CONTINUE;
    END IF;
    IF v_trimmed ~* '^(?:\*\*)?(?:A[ÑN]O\s+\d{4}|IMPUESTO\s+(?:A\s+LA\s+RENTA|HERENCIAS?)|HERENCIAS?,\s+LEGADOS|TABLA\b|EN\s+D[ÓO]LARES)' THEN
      v_caption_idx := v_probe;
      v_probe := v_probe - 1;
    ELSE
      EXIT;
    END IF;
  END LOOP;

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
