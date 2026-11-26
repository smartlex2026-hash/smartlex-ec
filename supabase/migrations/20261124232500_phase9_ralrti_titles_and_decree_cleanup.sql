-- Fase 9: Limpieza de títulos/epígrafes extensos en artículos (RALRTI y normas distintas de LRTI)
-- Conserva epígrafes reales cortos y limpia párrafos completos incrustados en `title`.
-- Restricción absoluta: jamás modifica registros de LRTI.

CREATE OR REPLACE FUNCTION public.extract_clean_article_epigraph(
  p_raw_title text,
  p_raw_content text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $function$
DECLARE
  v_title text;
  v_content text;
  v_epigraph text;
  v_body_prefix_regex text := '^(?:Cuando\s+|Para\s+(?:la\s+(?:aplicaci[oó]n|determinaci[oó]n)|efectos)\y|En\s+el\s+caso\y|Las\s+(?:personas\s+naturales|adquisiciones\s+de\s+bienes)\y|No\s+se\s+reducir[aá]\y|Est[aá]n\s+exentos\y|Constituyen\s+pagos\y|Real[ií]cense\s+las\s+siguientes\y|De\s+la\s+tramitaci[oó]n\y|La\s+emisi[oó]n\s+de\s+oficios\y|Hasta\s+tanto\s+el\s+Comit[eé]\y|Si\s+el\s+contribuyente\y|Los\s+sujetos\s+pasivos\y|Trat[aá]ndose\s+de\y|El\s+(?:presente|impuesto|Servicio)\s+)';
  v_content_head text;
  v_epigraph_match text[];
BEGIN
  v_title := regexp_replace(btrim(COALESCE(p_raw_title, '')), '\s+', ' ', 'g');
  v_content := regexp_replace(btrim(COALESCE(p_raw_content, '')), '\s+', ' ', 'g');

  -- Quitar comillas iniciales y prefijos redundantes tipo "Art. 15.-", "Art. (...).-", "Artículo 1.-"
  v_title := regexp_replace(
    v_title,
    '^\s*[“"«'']?\s*(?:Art(?:[íi]culo|\.)?\s*(?:\(\.\.\.\)|[\d.]+|[A-Za-z0-9.-]+)\s*[:.-]*\s*)+',
    '',
    'i'
  );
  v_title := btrim(v_title, ' :-–—');

  -- Descartar marcadores de literales o disposiciones largas metidas como título
  IF v_title ~* '^[a-zñ]\)\s+' THEN
    v_title := '';
  ELSIF v_title ~* '^(?:DISPOSICI[ÓO]N\s+\w+|PRIMERA|SEGUNDA|TERCERA|CUARTA|QUINTA|SEXTA|S[ÉE]PTIMA|OCTAVA|NOVENA|D[ÉE]CIMA(?:\s+\w+)?|VIG[ÉE]SIMA(?:\s+\w+)?)\s*[:.-]+\s*' THEN
    IF length(v_title) > 80 OR v_title !~ '^[^.]{3,80}\.\-\s+.+' THEN
      v_title := '';
    END IF;
  END IF;

  IF v_title <> '' THEN
    -- Caso 1: separador explícito de epígrafe ".- " dentro de los primeros 180 caracteres
    v_epigraph_match := regexp_match(v_title, '^(.{3,180}?)\.\-\s+(.+)$');
    IF v_epigraph_match IS NOT NULL THEN
      v_epigraph := btrim(v_epigraph_match[1], ' .:-–—');
      IF v_epigraph ~* v_body_prefix_regex THEN
        v_epigraph := '';
      END IF;
      v_title := v_epigraph;
    ELSE
      -- Caso 2: sin ".- " interno; conservar epígrafes reales terminados en ".-" (<=220 chars) o textos cortos (<=185 chars) que no sean frases de cuerpo
      IF v_title ~ '\.\-\s*$' AND length(v_title) <= 220 THEN
        v_title := btrim(regexp_replace(v_title, '\.\-\s*$', ''), ' .:-–—');
        IF v_title ~* v_body_prefix_regex THEN
          v_title := '';
        END IF;
      ELSIF length(v_title) > 185 THEN
        v_title := '';
      ELSE
        v_title := btrim(regexp_replace(v_title, '\.\-?\s*$', ''), ' .:-–—');
        IF v_title ~* v_body_prefix_regex THEN
          v_title := '';
        END IF;
      END IF;
    END IF;
  END IF;

  -- Rescate de epígrafe corto desde el arranque de content cuando el título quedó vacío
  IF (v_title IS NULL OR v_title = '') AND v_content <> '' THEN
    v_content_head := regexp_replace(
      v_content,
      '^\s*[“"«'']?\s*(?:Art(?:[íi]culo|\.)?\s*(?:\(\.\.\.\)|[\d.]+|[A-Za-z0-9.-]+)\s*[:.-]*\s*)+',
      '',
      'i'
    );
    v_epigraph_match := regexp_match(v_content_head, '^([^.\n]{4,140}?)\.\-\s+.+$');
    IF v_epigraph_match IS NOT NULL THEN
      v_epigraph := btrim(v_epigraph_match[1], ' .:-–—');
      IF v_epigraph !~* v_body_prefix_regex AND v_epigraph !~* '^[a-zñ]\)\s+' THEN
        v_title := v_epigraph;
      END IF;
    END IF;
  END IF;

  RETURN NULLIF(btrim(COALESCE(v_title, '')), '');
END;
$function$;

-- Aplicar limpieza únicamente fuera de LRTI y únicamente en nodos tipo artículo/disposición (no títulos/capítulos)
UPDATE public.normative_structures s
SET title = public.extract_clean_article_epigraph(s.title, s.content)
FROM public.norm_versions nv
JOIN public.norms n ON n.id = nv.norm_id
WHERE s.norm_version_id = nv.id
  AND n.code <> 'LRTI'
  AND s.structure_type NOT IN ('title', 'chapter', 'literal', 'numeral', 'paragraph', 'item')
  AND s.title IS DISTINCT FROM public.extract_clean_article_epigraph(s.title, s.content);
