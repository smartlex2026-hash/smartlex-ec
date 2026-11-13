-- ============================================================================
-- SMARTLEX ECUADOR: MIGRATION - SEED REALISTIC ECUADORIAN NORMATIVE DATA
-- ============================================================================

DO $$
DECLARE
  v_ct_version_id uuid := '9166a244-9014-41b4-a716-a3b2f1c0ea65';
  v_lrti_version_id uuid := 'c1bbed0e-3341-46f7-849d-994ff0f10890';
  v_rlrti_version_id uuid := '846c1a1a-ba68-458e-93d6-20e8fd8561f1';
  
  v_id_ct_15 uuid;
  v_id_ct_16 uuid;
  v_id_ct_24 uuid;
  v_id_ct_88 uuid;
  v_id_lrti_8 uuid;
  v_id_lrti_13 uuid;
  v_id_lrti_15 uuid;
  v_id_lrti_52 uuid;
  v_id_lrti_65 uuid;
  v_id_rlrti_158 uuid;

  v_concept_deducciones uuid;
  v_concept_base uuid;
  v_concept_credito uuid;
  v_concept_tarifas uuid;

  v_form_101 uuid;
  v_form_104 uuid;
  v_annex_ats uuid;
  v_annex_aps uuid;
BEGIN
  -- Clean up previous duplicates if any
  DELETE FROM public.normative_structures WHERE norm_version_id = v_ct_version_id AND identifier IN ('15', '16', '24', '88');
  DELETE FROM public.normative_structures WHERE norm_version_id = v_lrti_version_id AND identifier IN ('8', '13', '15', '52', '65');
  DELETE FROM public.normative_structures WHERE norm_version_id = v_rlrti_version_id AND identifier = '158';

  -- Insert Código Tributario articles
  INSERT INTO public.normative_structures (
    norm_version_id, structure_type, identifier, title, content, ordinal, is_current, legal_status, review_status
  ) VALUES (
    v_ct_version_id, 'article', '15', 'Art. 15.- Concepto de la Obligación Tributaria',
    'Obligación tributaria es el vínculo jurídico personal, existente entre el Estado o las entidades acreedoras de tributos y los contribuyentes o responsables de aquellos, en virtud del cual debe satisfacerse una prestación en dinero, especies o servicios apreciables en dinero, al verificarse el hecho generador previsto por la ley.',
    15, true, 'vigente', 'approved'
  ) RETURNING id INTO v_id_ct_15;

  INSERT INTO public.normative_structures (
    norm_version_id, structure_type, identifier, title, content, ordinal, is_current, legal_status, review_status
  ) VALUES (
    v_ct_version_id, 'article', '16', 'Art. 16.- Hecho Generador',
    'Se entiende por hecho generador al presupuesto establecido por la ley para configurar cada tributo. El hecho generador se considera ocurrido y produce sus efectos desde el momento en que se hayan realizado las circunstancias materiales o jurídicas necesarias para que surta los efectos que ordinariamente le corresponden.',
    16, true, 'vigente', 'approved'
  ) RETURNING id INTO v_id_ct_16;

  INSERT INTO public.normative_structures (
    norm_version_id, structure_type, identifier, title, content, ordinal, is_current, legal_status, review_status
  ) VALUES (
    v_ct_version_id, 'article', '24', 'Art. 24.- Sujeto Pasivo y Agentes de Retención',
    'Es sujeto pasivo la persona natural o jurídica que, según la ley, está obligada al cumplimiento de la prestación tributaria, sea como contribuyente o como responsable. Son agentes de retención las personas naturales o jurídicas que, en razón de su actividad, función o empleo, se hallen en posibilidad de retener tributos y entregarlos al sujeto activo.',
    24, true, 'vigente', 'approved'
  ) RETURNING id INTO v_id_ct_24;

  INSERT INTO public.normative_structures (
    norm_version_id, structure_type, identifier, title, content, ordinal, is_current, legal_status, review_status
  ) VALUES (
    v_ct_version_id, 'article', '88', 'Art. 88.- Facultades de la Administración Tributaria',
    'La administración tributaria ejercerá las facultades determinadora, resolutiva, sancionadora y recaudadora, en la forma y condiciones que prescriban las leyes respectivas.',
    88, true, 'vigente_reformado', 'approved'
  ) RETURNING id INTO v_id_ct_88;

  -- Insert LRTI articles
  INSERT INTO public.normative_structures (
    norm_version_id, structure_type, identifier, title, content, ordinal, is_current, legal_status, review_status
  ) VALUES (
    v_lrti_version_id, 'article', '8', 'Art. 8.- Ingresos de Fuente Ecuatoriana',
    'Se considerarán de fuente ecuatoriana los siguientes ingresos: 1. Los que perciban los ecuatorianos y extranjeros por actividades laborales, profesionales, comerciales, industriales, agropecuarias, mineras, de servicios y otras de carácter económico realizadas en territorio ecuatoriano; 2. Las utilidades y dividendos distribuidos por sociedades constituidas o establecidas en el país; 3. Los beneficios o regalías provenientes de bienes muebles o inmuebles situados en el Ecuador.',
    8, true, 'vigente', 'approved'
  ) RETURNING id INTO v_id_lrti_8;

  INSERT INTO public.normative_structures (
    norm_version_id, structure_type, identifier, title, content, ordinal, is_current, legal_status, review_status
  ) VALUES (
    v_lrti_version_id, 'article', '13', 'Art. 13.- Pagos y Gastos en el Exterior',
    'Son deducibles los pagos efectuados al exterior que sean necesarios para generar ingresos gravados, siempre que se haya practicado la retención en la fuente del Impuesto a la Renta de conformidad con los convenios para evitar la doble imposición y la normativa interna.',
    13, true, 'vigente', 'approved'
  ) RETURNING id INTO v_id_lrti_13;

  INSERT INTO public.normative_structures (
    norm_version_id, structure_type, identifier, title, content, ordinal, is_current, legal_status, review_status
  ) VALUES (
    v_lrti_version_id, 'article', '15', 'Art. 15.- Precios de Transferencia y Partes Relacionadas',
    'Los sujetos pasivos del Impuesto a la Renta que celebren operaciones con partes relacionadas están obligados a determinar sus ingresos, costos y deducciones considerando para esas operaciones los precios o montos de contraprestaciones que hubieran utilizado partes independientes en operaciones comparables (principio de plena competencia). Deberán presentar el Anexo de Operaciones con Partes Relacionadas e Informe Integral.',
    15, true, 'vigente', 'approved'
  ) RETURNING id INTO v_id_lrti_15;

  INSERT INTO public.normative_structures (
    norm_version_id, structure_type, identifier, title, content, ordinal, is_current, legal_status, review_status
  ) VALUES (
    v_lrti_version_id, 'article', '52', 'Art. 52.- Objeto del Impuesto al Valor Agregado (IVA)',
    'Establécese el Impuesto al Valor Agregado (IVA), que grava al valor de la transferencia de dominio o a la importación de bienes muebles de naturaleza corporal, en todas sus etapas de comercialización, así como a los derechos de autor, propiedad industrial y derechos conexos; y al valor de los servicios prestados.',
    52, true, 'vigente', 'approved'
  ) RETURNING id INTO v_id_lrti_52;

  INSERT INTO public.normative_structures (
    norm_version_id, structure_type, identifier, title, content, ordinal, is_current, legal_status, review_status
  ) VALUES (
    v_lrti_version_id, 'article', '65', 'Art. 65.- Crédito Tributario por Adquisiciones de Bienes y Servicios (IVA)',
    'El uso del crédito tributario se sujetará a las siguientes normas: Los sujetos pasivos del IVA que se dediquen a la producción o comercialización de bienes o a la prestación de servicios gravados con la tarifa general del IVA, tendrán derecho a crédito tributario por la totalidad del IVA pagado en adquisiciones locales o importaciones vinculadas con su actividad económica gravada.',
    65, true, 'vigente_reformado', 'approved'
  ) RETURNING id INTO v_id_lrti_65;

  -- Insert RLRTI article 158
  INSERT INTO public.normative_structures (
    norm_version_id, structure_type, identifier, title, content, ordinal, is_current, legal_status, review_status
  ) VALUES (
    v_rlrti_version_id, 'article', '158', 'Art. 158 RLRTI.- Agentes de Retención del Impuesto al Valor Agregado',
    'Son agentes de retención del IVA los calificados como tales por el Servicio de Rentas Internas, las entidades del sector público, las empresas emisoras de tarjetas de crédito y débito, y los designados como Grandes Contribuyentes. La retención se efectuará en los porcentajes del 30% en bienes, 70% en servicios y 100% en honorarios profesionales o liquidaciones de compras.',
    158, true, 'vigente', 'approved'
  ) RETURNING id INTO v_id_rlrti_158;

  -- Concepts
  SELECT id INTO v_concept_deducciones FROM public.tax_concepts WHERE code = 'DEDUCCIONES';
  SELECT id INTO v_concept_base FROM public.tax_concepts WHERE code = 'BASE_IMPONIBLE';
  SELECT id INTO v_concept_credito FROM public.tax_concepts WHERE code = 'CREDITO_TRIBUTARIO';

  -- Link to concepts
  IF v_concept_base IS NOT NULL AND v_id_lrti_8 IS NOT NULL THEN
    INSERT INTO public.structure_tax_concepts (structure_id, tax_concept_id) VALUES (v_id_lrti_8, v_concept_base) ON CONFLICT DO NOTHING;
  END IF;
  IF v_concept_deducciones IS NOT NULL AND v_id_lrti_13 IS NOT NULL THEN
    INSERT INTO public.structure_tax_concepts (structure_id, tax_concept_id) VALUES (v_id_lrti_13, v_concept_deducciones) ON CONFLICT DO NOTHING;
  END IF;
  IF v_concept_base IS NOT NULL AND v_id_lrti_15 IS NOT NULL THEN
    INSERT INTO public.structure_tax_concepts (structure_id, tax_concept_id) VALUES (v_id_lrti_15, v_concept_base) ON CONFLICT DO NOTHING;
  END IF;
  IF v_concept_base IS NOT NULL AND v_id_lrti_52 IS NOT NULL THEN
    INSERT INTO public.structure_tax_concepts (structure_id, tax_concept_id) VALUES (v_id_lrti_52, v_concept_base) ON CONFLICT DO NOTHING;
  END IF;
  IF v_concept_credito IS NOT NULL AND v_id_lrti_65 IS NOT NULL THEN
    INSERT INTO public.structure_tax_concepts (structure_id, tax_concept_id) VALUES (v_id_lrti_65, v_concept_credito) ON CONFLICT DO NOTHING;
  END IF;

  -- Forms & Annexes
  SELECT id INTO v_form_101 FROM public.forms WHERE code = 'F-101';
  SELECT id INTO v_form_104 FROM public.forms WHERE code = 'F-104';
  SELECT id INTO v_annex_ats FROM public.annexes WHERE code = 'ATS';
  SELECT id INTO v_annex_aps FROM public.annexes WHERE code = 'APS';

  -- Link to forms
  IF v_form_101 IS NOT NULL AND v_id_lrti_8 IS NOT NULL THEN
    INSERT INTO public.structure_forms (structure_id, form_id, casillero_code, notes)
    VALUES (v_id_lrti_8, v_form_101, '601', 'Ingresos Ordinarios Gravados') ON CONFLICT DO NOTHING;
  END IF;
  IF v_form_104 IS NOT NULL AND v_id_lrti_52 IS NOT NULL THEN
    INSERT INTO public.structure_forms (structure_id, form_id, casillero_code, notes)
    VALUES (v_id_lrti_52, v_form_104, '401', 'Ventas Locales Tarifa General') ON CONFLICT DO NOTHING;
  END IF;
  IF v_form_104 IS NOT NULL AND v_id_lrti_65 IS NOT NULL THEN
    INSERT INTO public.structure_forms (structure_id, form_id, casillero_code, notes)
    VALUES (v_id_lrti_65, v_form_104, '520', 'Total Crédito Tributario del Mes') ON CONFLICT DO NOTHING;
  END IF;

  -- Link to annexes
  IF v_annex_ats IS NOT NULL AND v_id_lrti_52 IS NOT NULL THEN
    INSERT INTO public.structure_annexes (structure_id, annex_id, notes)
    VALUES (v_id_lrti_52, v_annex_ats, 'Reporte obligatorio mensual en módulo de Ventas') ON CONFLICT DO NOTHING;
  END IF;
  IF v_annex_ats IS NOT NULL AND v_id_lrti_65 IS NOT NULL THEN
    INSERT INTO public.structure_annexes (structure_id, annex_id, notes)
    VALUES (v_id_lrti_65, v_annex_ats, 'Sustento de compras con derecho a crédito tributario') ON CONFLICT DO NOTHING;
  END IF;
  IF v_annex_aps IS NOT NULL AND v_id_lrti_15 IS NOT NULL THEN
    INSERT INTO public.structure_annexes (structure_id, annex_id, notes)
    VALUES (v_id_lrti_15, v_annex_aps, 'Declaración obligatoria de socios y partes vinculadas') ON CONFLICT DO NOTHING;
  END IF;

END $$;
