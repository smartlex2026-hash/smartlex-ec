-- ============================================================================
-- FASE 8: TABLAS EMBEBIDAS EN RESOLUCIONES/DECRETOS, TRAZABILIDAD DE EMISOR
-- Y ENLACE UNIVERSAL ENTRE LEYES, CÓDIGOS, REGLAMENTOS, DECRETOS Y RESOLUCIONES
-- ============================================================================

-- 1. Corregir clasificación normativa de resoluciones SRI guardadas con normative_type = 'law'
UPDATE public.norms
SET normative_type = 'resolution', updated_at = now()
WHERE normative_type = 'law'
  AND (
    code LIKE 'NAC-DGER%'
    OR code LIKE 'RESOLUCION-SRI-%'
    OR code LIKE 'RESOLUCION-NAC-%'
    OR code = 'RESOLUCION-2014-00034'
  );

-- 2. Corregir punteros emitter_* erróneos heredados en normative_tables
UPDATE public.normative_tables
SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
  'emitter_norm_id', '0e0f1da7-084a-4218-9f97-4509d863d34d',
  'emitter_norm_code', 'LEY-2008-392',
  'emitter_norm_title', (SELECT name FROM public.norms WHERE id = '0e0f1da7-084a-4218-9f97-4509d863d34d'),
  'emitter_structure_id', CASE
    WHEN code LIKE 'TBL_ICE_%' THEN 'daa89949-1c8c-4a0b-99fe-3b9067155a21'
    ELSE '8cc4f777-37ed-4a63-94f9-b2d07016f333'
  END
),
updated_at = now()
WHERE code IN (
  'TBL_ICE_GRUPO1_2008','TBL_ICE_GRUPO2_AERONAVES_2008','TBL_ICE_GRUPO2_VEHICULOS_2008',
  'TBL_RISE_COMERCIO_2008','TBL_RISE_MANUFACTURA_2008','TBL_RIMPE_COMERCIO_2008',
  'TBL_RIMPE_MANUFACTURA_2008','TBL_REGIMEN_SIMPLIFICADO_COMERCIO_2008',
  'TBL_REGIMEN_SIMPLIFICADO_MANUFACTURA_2008','TBL_SR_COMERCIO_2008','TBL_SR_MANUFACTURA_2008'
);

UPDATE public.normative_tables
SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
  'emitter_structure_id', '7b08c39f-a918-4cd5-bea3-8456eac65b3f'
),
updated_at = now()
WHERE code = 'TBL_IR_PN_2007';

UPDATE public.normative_tables
SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
  'emitter_structure_id', CASE
    WHEN code LIKE 'TBL_ICE_%' THEN 'eb3fc4fe-ecb6-460c-8c46-5d47d3d427ad'
    WHEN code LIKE 'TBL_RISE_%' THEN '78d6b58d-872c-413a-9e5c-8e101e90e834'
    ELSE NULL
  END
),
updated_at = now()
WHERE metadata->>'emitter_structure_id' = '0a8cd405-004e-4ff5-9f8c-b303c3315de9';

UPDATE public.normative_tables
SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
  'emitter_structure_id', '5403f469-9ab1-4868-9eeb-a787fbe9e6f0'
),
updated_at = now()
WHERE code IN ('TBL_IR_ACCIONES_PROGRESIVA', 'TBL_IR_ENAJENACION_ACCIONES', 'TBL_IR_ENAJENACION_ACCIONES_2018')
  AND metadata->>'emitter_structure_id' = '7fd1c2d5-79f0-41bd-bc67-96b66c841d14';

UPDATE public.normative_tables
SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
  'emitter_structure_id', '4ea4af80-3f19-45da-afae-2f623082ab68'
),
updated_at = now()
WHERE code = 'TBL_DEDUCCION_ADICIONAL_MUJERES'
  AND metadata->>'emitter_structure_id' = 'cdcb200a-9e25-4ec4-8f17-23d875ec40c9';

UPDATE public.normative_tables
SET metadata = (COALESCE(metadata, '{}'::jsonb) - 'emitter_structure_id')
WHERE code = 'TBL_PAGO_CUENTA_UTILIDADES_NO_DISTRIBUIDAS'
  AND metadata->>'emitter_structure_id' = '9ae3f256-3084-4f6b-be9d-8a180f8fdc81';

UPDATE public.normative_tables nt
SET metadata = COALESCE(nt.metadata, '{}'::jsonb) || jsonb_build_object(
  'emitter_norm_id', nt.norm_id::text,
  'emitter_norm_code', n.code,
  'emitter_norm_title', n.name,
  'emitter_structure_id', nt.structure_id::text
),
updated_at = now()
FROM public.norms n
WHERE n.id = nt.norm_id
  AND n.code <> 'LRTI'
  AND (nt.metadata->>'emitter_norm_id') IS NULL
  AND nt.norm_id IS NOT NULL;

-- 3. Función auxiliar para embeber tablas Markdown en el texto del artículo si aún no están presentes
CREATE OR REPLACE FUNCTION public.ensure_tables_in_article_content(
  p_content text,
  p_tables jsonb
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $function$
DECLARE
  v_base text := rtrim(COALESCE(p_content, ''));
  v_tbl jsonb;
  v_md text;
  v_caption text;
  v_blocks text[] := ARRAY[]::text[];
BEGIN
  IF v_base LIKE '%|%|%' THEN
    RETURN COALESCE(p_content, '');
  END IF;

  IF p_tables IS NULL OR jsonb_typeof(p_tables) <> 'array' OR jsonb_array_length(p_tables) = 0 THEN
    RETURN COALESCE(p_content, '');
  END IF;

  FOR v_tbl IN SELECT * FROM jsonb_array_elements(p_tables) LOOP
    v_md := public.render_normative_table_markdown(v_tbl);
    IF NULLIF(btrim(COALESCE(v_md, '')), '') IS NOT NULL AND v_md LIKE '%|%|%' THEN
      v_caption := NULLIF(btrim(COALESCE(v_tbl->>'titulo_tabla', v_tbl->>'title', '')), '');
      IF v_caption IS NOT NULL THEN
        v_blocks := array_append(v_blocks, '**' || v_caption || '**' || E'\n' || btrim(v_md));
      ELSE
        v_blocks := array_append(v_blocks, btrim(v_md));
      END IF;
    END IF;
  END LOOP;

  IF COALESCE(array_length(v_blocks, 1), 0) = 0 THEN
    RETURN COALESCE(p_content, '');
  END IF;

  IF v_base = '' THEN
    RETURN array_to_string(v_blocks, E'\n\n');
  END IF;

  RETURN v_base || E'\n\n' || array_to_string(v_blocks, E'\n\n');
END;
$function$;

-- 4. Asegurar markdown_content en todas las normative_tables y volcar tablas en artículos sin tablas (protegiendo LRTI vigente)
UPDATE public.normative_tables
SET markdown_content = public.render_normative_table_markdown(
  jsonb_build_object(
    'columns_schema', columns_schema,
    'rows_data', rows_data,
    'markdown_content', markdown_content
  )
),
updated_at = now()
WHERE markdown_content IS NULL OR markdown_content NOT LIKE '%|%|%';

WITH candidate_structs AS (
  SELECT
    ns.id AS struct_id,
    jsonb_agg(
      jsonb_build_object(
        'title', nt.title,
        'markdown_content', nt.markdown_content,
        'columns_schema', nt.columns_schema,
        'rows_data', nt.rows_data
      )
      ORDER BY nt.code, nt.fiscal_year NULLS LAST, nt.title
    ) AS tables_json
  FROM public.normative_structures ns
  JOIN public.norm_versions nv ON nv.id = ns.norm_version_id
  JOIN public.norms n ON n.id = nv.norm_id
  JOIN public.normative_tables nt ON (
    nt.structure_id = ns.id
    OR (nt.norm_id <> nv.norm_id AND (nt.metadata->>'emitter_structure_id') = ns.id::text)
  )
  WHERE ns.structure_type IN ('article','transitory','final','reform','other')
    AND (ns.content IS NULL OR ns.content NOT LIKE '%|%|%')
    AND NOT (n.code = 'LRTI' AND ns.is_current = true)
    AND NOT EXISTS (
      SELECT 1 FROM public.normative_structures ns2
      WHERE ns2.norm_version_id = ns.norm_version_id
        AND ns2.id <> ns.id
        AND ns2.content LIKE '%|%|%'
        AND nt.norm_id <> nv.norm_id
    )
  GROUP BY ns.id
)
UPDATE public.normative_structures ns
SET
  content = public.ensure_tables_in_article_content(ns.content, cs.tables_json),
  metadata = COALESCE(ns.metadata, '{}'::jsonb) || jsonb_build_object('has_normative_table', true),
  updated_at = now()
FROM candidate_structs cs
WHERE ns.id = cs.struct_id
  AND public.ensure_tables_in_article_content(ns.content, cs.tables_json) IS DISTINCT FROM ns.content;

-- 5. Enlace masivo idempotente en public.structure_relations
INSERT INTO public.structure_relations (source_structure_id, target_structure_id, relation_type, description, review_status)
SELECT
  lrti_97_6.id,
  res_art.id,
  'regulated_by',
  'Tablas de cuotas RISE del Art. 97.6 LRTI emitidas por ' || res_norm.code,
  'approved'
FROM public.norms res_norm
JOIN public.norm_versions res_nv ON res_nv.norm_id = res_norm.id
JOIN public.normative_structures res_art ON res_art.norm_version_id = res_nv.id
CROSS JOIN (
  SELECT ns.id
  FROM public.normative_structures ns
  JOIN public.norm_versions nv ON nv.id = ns.norm_version_id
  JOIN public.norms n ON n.id = nv.norm_id
  WHERE n.code = 'LRTI'
    AND ns.identifier = '97.6'
    AND ns.structure_type = 'article'
    AND (ns.is_current = true OR ns.content ILIKE '%Simplificado%' OR ns.content ILIKE '%RISE%')
) lrti_97_6
WHERE res_norm.code IN ('NAC-DGERCGC3-00862', 'NAC-DGERCG16-00000509', 'RESOLUCION-SRI-2019-00000064')
  AND res_art.structure_type = 'article'
  AND lower(res_art.identifier) IN ('1', 'único', 'unico')
  AND lrti_97_6.id <> res_art.id
  AND NOT EXISTS (
    SELECT 1 FROM public.structure_relations sr
    WHERE (sr.source_structure_id = lrti_97_6.id AND sr.target_structure_id = res_art.id)
       OR (sr.source_structure_id = res_art.id AND sr.target_structure_id = lrti_97_6.id)
  );

INSERT INTO public.structure_relations (source_structure_id, target_structure_id, relation_type, description, review_status)
SELECT
  '600444ed-4bd2-42e5-a8d9-0bf63e9c2864'::uuid,
  'ec79ca7e-f381-4e5c-af12-2429bf10fea2'::uuid,
  'cites',
  'La Resolución NAC-DGERCGC19-00000064 mantiene vigentes para 2020-2022 las tablas de cuotas RISE de la Resolución NAC-DGERCG16-00000509.',
  'approved'
WHERE NOT EXISTS (
  SELECT 1 FROM public.structure_relations sr
  WHERE (sr.source_structure_id = '600444ed-4bd2-42e5-a8d9-0bf63e9c2864'::uuid AND sr.target_structure_id = 'ec79ca7e-f381-4e5c-af12-2429bf10fea2'::uuid)
     OR (sr.source_structure_id = 'ec79ca7e-f381-4e5c-af12-2429bf10fea2'::uuid AND sr.target_structure_id = '600444ed-4bd2-42e5-a8d9-0bf63e9c2864'::uuid)
);

INSERT INTO public.structure_relations (source_structure_id, target_structure_id, relation_type, description, review_status)
SELECT DISTINCT
  COALESCE(parent_ns.id, dest_ns.id) AS src_id,
  em_ns.id AS tgt_id,
  'regulated_by',
  'Tabla normativa ' || nt.code || ' (' || COALESCE(nt.metadata->>'emitter_norm_code', 'Emisor') || ')',
  'approved'
FROM public.normative_tables nt
JOIN public.normative_structures dest_ns ON dest_ns.id = nt.structure_id
LEFT JOIN public.normative_structures parent_ns ON parent_ns.id = dest_ns.parent_id AND parent_ns.structure_type IN ('article','transitory','final','reform','other')
JOIN public.normative_structures em_ns ON em_ns.id::text = (nt.metadata->>'emitter_structure_id')
WHERE nt.structure_id IS NOT NULL
  AND (nt.metadata->>'emitter_structure_id') IS NOT NULL
  AND COALESCE(parent_ns.id, dest_ns.id) <> em_ns.id
  AND NOT EXISTS (
    SELECT 1 FROM public.structure_relations sr
    WHERE (sr.source_structure_id = COALESCE(parent_ns.id, dest_ns.id) AND sr.target_structure_id = em_ns.id)
       OR (sr.source_structure_id = em_ns.id AND sr.target_structure_id = COALESCE(parent_ns.id, dest_ns.id))
  );

INSERT INTO public.structure_relations (source_structure_id, target_structure_id, relation_type, description, review_status)
SELECT DISTINCT ON (lrti_ns.id, ral_ns.id)
  lrti_ns.id,
  ral_ns.id,
  'regulated_by',
  'Reglamento RALRTI Art. ' || COALESCE(ral_ns.identifier, '?') || ' desarrolla Art. ' || lrti_ns.identifier || ' LRTI',
  'approved'
FROM public.normative_structures ral_ns
JOIN public.norm_versions ral_nv ON ral_nv.id = ral_ns.norm_version_id
JOIN public.norms ral_n ON ral_n.id = ral_nv.norm_id
CROSS JOIN LATERAL regexp_matches(COALESCE(ral_ns.content, ''), 'art[íi]culo\s+(\d+(?:\.\d+)?)\s+de\s+la\s+ley\b', 'gi') m
JOIN public.normative_structures lrti_ns ON lower(btrim(lrti_ns.identifier)) = lower(m[1]) AND lrti_ns.is_current = true AND lrti_ns.structure_type = 'article'
JOIN public.norm_versions lrti_nv ON lrti_nv.id = lrti_ns.norm_version_id
JOIN public.norms lrti_n ON lrti_n.id = lrti_nv.norm_id AND lrti_n.code = 'LRTI'
WHERE ral_n.code = 'RALRTI'
  AND ral_ns.is_current = true
  AND ral_ns.structure_type = 'article'
  AND NOT EXISTS (
    SELECT 1 FROM public.structure_relations sr
    WHERE (sr.source_structure_id = lrti_ns.id AND sr.target_structure_id = ral_ns.id)
       OR (sr.source_structure_id = ral_ns.id AND sr.target_structure_id = lrti_ns.id)
  );

INSERT INTO public.structure_relations (source_structure_id, target_structure_id, relation_type, description, review_status)
SELECT DISTINCT ON (tgt_ns.id, src_ns.id)
  tgt_ns.id,
  src_ns.id,
  'regulated_by',
  'Concordancia detectada desde ' || src_n.code || ' hacia ' || tgt_n.code || ' Art. ' || tgt_ns.identifier,
  'approved'
FROM public.normative_structures src_ns
JOIN public.norm_versions src_nv ON src_nv.id = src_ns.norm_version_id
JOIN public.norms src_n ON src_n.id = src_nv.norm_id
CROSS JOIN LATERAL regexp_matches(
  COALESCE(src_ns.content, '') || ' ' || COALESCE(src_ns.title, '') || ' ' || COALESCE(src_n.name, ''),
  'art[íi]culo\s+(\d+(?:\.\d+)?)\s+de\s+la\s+ley(?:\s+org[áa]nica)?\s+de\s+r[ée]gimen\s+tributario\s+interno',
  'gi'
) m
JOIN public.normative_structures tgt_ns ON lower(btrim(tgt_ns.identifier)) = lower(m[1]) AND tgt_ns.is_current = true AND tgt_ns.structure_type = 'article'
JOIN public.norm_versions tgt_nv ON tgt_nv.id = tgt_ns.norm_version_id
JOIN public.norms tgt_n ON tgt_n.id = tgt_nv.norm_id AND tgt_n.code = 'LRTI'
WHERE src_n.code <> 'LRTI'
  AND COALESCE((src_n.metadata->>'archived_hidden')::boolean, false) = false
  AND src_ns.structure_type IN ('article','transitory','final','reform','other')
  AND src_ns.is_current = true
  AND NOT EXISTS (
    SELECT 1 FROM public.structure_relations sr
    WHERE (sr.source_structure_id = tgt_ns.id AND sr.target_structure_id = src_ns.id)
       OR (sr.source_structure_id = src_ns.id AND sr.target_structure_id = tgt_ns.id)
  );

INSERT INTO public.structure_relations (source_structure_id, target_structure_id, relation_type, description, review_status)
SELECT DISTINCT ON (tgt_ns.id, src_ns.id)
  tgt_ns.id,
  src_ns.id,
  'regulated_by',
  'Concordancia detectada desde ' || src_n.code || ' hacia CT Art. ' || tgt_ns.identifier,
  'approved'
FROM public.normative_structures src_ns
JOIN public.norm_versions src_nv ON src_nv.id = src_ns.norm_version_id
JOIN public.norms src_n ON src_n.id = src_nv.norm_id
CROSS JOIN LATERAL regexp_matches(
  COALESCE(src_ns.content, '') || ' ' || COALESCE(src_ns.title, '') || ' ' || COALESCE(src_n.name, ''),
  'art[íi]culo\s+(\d+(?:\.\d+)?)\s+del\s+c[óo]digo(?:\s+org[áa]nico)?\s+tributario',
  'gi'
) m
JOIN public.normative_structures tgt_ns ON lower(btrim(tgt_ns.identifier)) = lower(m[1]) AND tgt_ns.is_current = true AND tgt_ns.structure_type = 'article'
JOIN public.norm_versions tgt_nv ON tgt_nv.id = tgt_ns.norm_version_id
JOIN public.norms tgt_n ON tgt_n.id = tgt_nv.norm_id AND tgt_n.code = 'CT'
WHERE src_n.code <> 'CT'
  AND COALESCE((src_n.metadata->>'archived_hidden')::boolean, false) = false
  AND src_ns.structure_type IN ('article','transitory','final','reform','other')
  AND src_ns.is_current = true
  AND NOT EXISTS (
    SELECT 1 FROM public.structure_relations sr
    WHERE (sr.source_structure_id = tgt_ns.id AND sr.target_structure_id = src_ns.id)
       OR (sr.source_structure_id = src_ns.id AND sr.target_structure_id = tgt_ns.id)
  );

INSERT INTO public.structure_relations (source_structure_id, target_structure_id, relation_type, description, review_status)
SELECT DISTINCT ON (tgt_ns.id, src_ns.id)
  tgt_ns.id,
  src_ns.id,
  'regulated_by',
  'Concordancia detectada desde ' || src_n.code || ' hacia RALRTI Art. ' || tgt_ns.identifier,
  'approved'
FROM public.normative_structures src_ns
JOIN public.norm_versions src_nv ON src_nv.id = src_ns.norm_version_id
JOIN public.norms src_n ON src_n.id = src_nv.norm_id
CROSS JOIN LATERAL regexp_matches(
  COALESCE(src_ns.content, '') || ' ' || COALESCE(src_ns.title, '') || ' ' || COALESCE(src_n.name, ''),
  'art[íi]culo\s+(\d+(?:\.\d+)?)\s+del\s+reglamento\s+para\s+la\s+aplicaci[óo]n\s+de\s+la\s+ley\s+de\s+r[ée]gimen\s+tributario\s+interno',
  'gi'
) m
JOIN public.normative_structures tgt_ns ON lower(btrim(tgt_ns.identifier)) = lower(m[1]) AND tgt_ns.is_current = true AND tgt_ns.structure_type = 'article'
JOIN public.norm_versions tgt_nv ON tgt_nv.id = tgt_ns.norm_version_id
JOIN public.norms tgt_n ON tgt_n.id = tgt_nv.norm_id AND tgt_n.code = 'RALRTI'
WHERE src_n.code <> 'RALRTI'
  AND COALESCE((src_n.metadata->>'archived_hidden')::boolean, false) = false
  AND src_ns.structure_type IN ('article','transitory','final','reform','other')
  AND src_ns.is_current = true
  AND NOT EXISTS (
    SELECT 1 FROM public.structure_relations sr
    WHERE (sr.source_structure_id = tgt_ns.id AND sr.target_structure_id = src_ns.id)
       OR (sr.source_structure_id = src_ns.id AND sr.target_structure_id = tgt_ns.id)
  );

INSERT INTO public.structure_relations (source_structure_id, target_structure_id, relation_type, description, review_status)
SELECT DISTINCT ON (tgt_ns.id, src_ns.id)
  tgt_ns.id,
  src_ns.id,
  'regulated_by',
  'Reducción / regulación de tarifa del Impuesto a la Salida de Divisas (ISD)',
  'approved'
FROM public.normative_structures src_ns
JOIN public.norm_versions src_nv ON src_nv.id = src_ns.norm_version_id
JOIN public.norms src_n ON src_n.id = src_nv.norm_id
JOIN public.normative_structures tgt_ns ON tgt_ns.id = 'ebcf212c-932e-4091-86d3-1c688948d046'::uuid
WHERE src_n.code IN ('DECRETO-EJECUTIVO-298', 'DECRETO-EJECUTIVO-643')
  AND src_ns.structure_type = 'article'
  AND src_ns.ordinal = (SELECT MIN(ordinal) FROM public.normative_structures WHERE norm_version_id = src_nv.id AND structure_type = 'article')
  AND NOT EXISTS (
    SELECT 1 FROM public.structure_relations sr
    WHERE (sr.source_structure_id = tgt_ns.id AND sr.target_structure_id = src_ns.id)
       OR (sr.source_structure_id = src_ns.id AND sr.target_structure_id = tgt_ns.id)
  );

INSERT INTO public.structure_relations (source_structure_id, target_structure_id, relation_type, description, review_status)
SELECT DISTINCT ON (tgt_ns.id, src_ns.id)
  tgt_ns.id,
  src_ns.id,
  'regulated_by',
  'Metodología de indexación del monto exento del Impuesto a la Salida de Divisas (ISD)',
  'approved'
FROM public.normative_structures src_ns
JOIN public.norm_versions src_nv ON src_nv.id = src_ns.norm_version_id
JOIN public.norms src_n ON src_n.id = src_nv.norm_id
JOIN public.normative_structures tgt_ns ON tgt_ns.id = '2e632e94-5c45-4291-95b9-7b958bb576a2'::uuid
WHERE src_n.normative_type = 'resolution'
  AND (src_n.name ILIKE '%salida de divisas%' OR src_n.name ILIKE '%exento de pago del impuesto a la salida%')
  AND src_ns.structure_type = 'article'
  AND src_ns.ordinal = (SELECT MIN(ordinal) FROM public.normative_structures WHERE norm_version_id = src_nv.id AND structure_type = 'article')
  AND NOT EXISTS (
    SELECT 1 FROM public.structure_relations sr
    WHERE (sr.source_structure_id = tgt_ns.id AND sr.target_structure_id = src_ns.id)
       OR (sr.source_structure_id = src_ns.id AND sr.target_structure_id = tgt_ns.id)
  );

INSERT INTO public.structure_relations (source_structure_id, target_structure_id, relation_type, description, review_status)
SELECT DISTINCT ON (tgt_ns.id, src_ns.id)
  tgt_ns.id,
  src_ns.id,
  'regulated_by',
  'Listado de bienes agropecuarios con tarifa 0% de IVA (Art. 55 LRTI)',
  'approved'
FROM public.normative_structures src_ns
JOIN public.norm_versions src_nv ON src_nv.id = src_ns.norm_version_id
JOIN public.norms src_n ON src_n.id = src_nv.norm_id
JOIN public.normative_structures tgt_ns ON lower(btrim(tgt_ns.identifier)) = '55' AND tgt_ns.is_current = true AND tgt_ns.structure_type = 'article'
JOIN public.norm_versions tgt_nv ON tgt_nv.id = tgt_ns.norm_version_id
JOIN public.norms tgt_n ON tgt_n.id = tgt_nv.norm_id AND tgt_n.code = 'LRTI'
WHERE src_n.code IN ('DE-1232', 'DECRETO-EJECUTIVO-427')
  AND src_ns.structure_type = 'article'
  AND NOT EXISTS (
    SELECT 1 FROM public.structure_relations sr
    WHERE (sr.source_structure_id = tgt_ns.id AND sr.target_structure_id = src_ns.id)
       OR (sr.source_structure_id = src_ns.id AND sr.target_structure_id = tgt_ns.id)
  );

INSERT INTO public.structure_relations (source_structure_id, target_structure_id, relation_type, description, review_status)
SELECT DISTINCT ON (tgt_ns.id, src_ns.id)
  tgt_ns.id,
  src_ns.id,
  'regulated_by',
  'Reducción temporal de tarifa de IVA para servicios turísticos (Art. 65 LRTI)',
  'approved'
FROM public.normative_structures src_ns
JOIN public.norm_versions src_nv ON src_nv.id = src_ns.norm_version_id
JOIN public.norms src_n ON src_n.id = src_nv.norm_id
JOIN public.normative_structures tgt_ns ON lower(btrim(tgt_ns.identifier)) = '65' AND tgt_ns.is_current = true AND tgt_ns.structure_type = 'article'
JOIN public.norm_versions tgt_nv ON tgt_nv.id = tgt_ns.norm_version_id
JOIN public.norms tgt_n ON tgt_n.id = tgt_nv.norm_id AND tgt_n.code = 'LRTI'
WHERE src_n.code = 'DECRETO-EJECUTIVO-644'
  AND src_ns.structure_type = 'article'
  AND src_ns.ordinal = (SELECT MIN(ordinal) FROM public.normative_structures WHERE norm_version_id = src_nv.id AND structure_type = 'article')
  AND NOT EXISTS (
    SELECT 1 FROM public.structure_relations sr
    WHERE (sr.source_structure_id = tgt_ns.id AND sr.target_structure_id = src_ns.id)
       OR (sr.source_structure_id = src_ns.id AND sr.target_structure_id = tgt_ns.id)
  );

INSERT INTO public.structure_relations (source_structure_id, target_structure_id, relation_type, description, review_status)
SELECT DISTINCT ON (tgt_ns.id, src_ns.id)
  tgt_ns.id,
  src_ns.id,
  'regulated_by',
  'Regulación anual del ICE emitida por ' || src_n.code,
  'approved'
FROM public.normative_structures src_ns
JOIN public.norm_versions src_nv ON src_nv.id = src_ns.norm_version_id
JOIN public.norms src_n ON src_n.id = src_nv.norm_id
JOIN public.normative_structures tgt_ns ON tgt_ns.is_current = true AND tgt_ns.structure_type = 'article'
JOIN public.norm_versions tgt_nv ON tgt_nv.id = tgt_ns.norm_version_id
JOIN public.norms tgt_n ON tgt_n.id = tgt_nv.norm_id AND tgt_n.code = 'LRTI'
WHERE src_n.normative_type = 'resolution'
  AND src_ns.structure_type = 'article'
  AND src_ns.ordinal = (SELECT MIN(ordinal) FROM public.normative_structures WHERE norm_version_id = src_nv.id AND structure_type = 'article')
  AND (
    (src_n.name ~* '(tarifas?\s+espec[íi]ficas.*consumos\s+especiales|tarifa\s+espec[íi]fica.*ice)' AND tgt_ns.identifier = '82')
    OR (src_n.name ~* '(precios?\s+referenciales.*perfumes|perfumes\s+y\s+aguas\s+de\s+tocador)' AND tgt_ns.identifier = '76')
    OR (src_n.name ~* '(cupo\s+(anual\s+de\s+)?exenci[óo]n|valor\s+anual\s+de\s+exoneraci[óo]n).*bebidas\s+alcoh[óo]licas' AND tgt_ns.identifier = '77')
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.structure_relations sr
    WHERE (sr.source_structure_id = tgt_ns.id AND sr.target_structure_id = src_ns.id)
       OR (sr.source_structure_id = src_ns.id AND sr.target_structure_id = tgt_ns.id)
  );
