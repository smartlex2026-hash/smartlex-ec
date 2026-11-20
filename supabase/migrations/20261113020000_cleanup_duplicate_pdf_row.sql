BEGIN;
-- 1. Eliminar tablas y estructuras generadas exclusivamente por la fila duplicada e87691de-f5a6-4fdd-bb69-278073aaee56 (NAC-DGER2006-0843)
DELETE FROM public.normative_tables WHERE norm_version_id IN (SELECT id FROM public.norm_versions WHERE source_document_id = 'e87691de-f5a6-4fdd-bb69-278073aaee56');
DELETE FROM public.normative_structures WHERE norm_version_id IN (SELECT id FROM public.norm_versions WHERE source_document_id = 'e87691de-f5a6-4fdd-bb69-278073aaee56');
DELETE FROM public.norm_versions WHERE source_document_id = 'e87691de-f5a6-4fdd-bb69-278073aaee56';
DELETE FROM public.norms WHERE code = 'NAC-DGER2006-0843' AND NOT EXISTS (SELECT 1 FROM public.norm_versions nv WHERE nv.norm_id = public.norms.id);

-- 2. Eliminar corrida de extracción del documento duplicado
DELETE FROM public.extraction_runs WHERE document_id = 'e87691de-f5a6-4fdd-bb69-278073aaee56';

-- 3. Eliminar la fila duplicada en public.documents
DELETE FROM public.documents WHERE id = 'e87691de-f5a6-4fdd-bb69-278073aaee56';

-- 4. Corregir código estético de DE-2167 (anteriormente NO.-2167)
UPDATE public.norms SET code = 'DE-2167' WHERE code = 'NO.-2167';

-- 5. Limpiar cita redundante de Registro Oficial en nota de Art. 36 LRTI
UPDATE public.normative_structures 
SET content = replace(content, ' (Segundo Suplemento del Registro Oficial No. 427 de 29 de diciembre de 2006) (Segundo Suplemento del Registro Oficial No. 427 de 29 de diciembre de 2006).', ' (Segundo Suplemento del Registro Oficial No. 427 de 29 de diciembre de 2006).') 
WHERE id = '18117346-af9f-473f-b661-76f25046d44e';
COMMIT;

