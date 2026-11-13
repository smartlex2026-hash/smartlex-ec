const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Cargar variables de entorno desde .env.local
const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
for (const line of envContent.split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) envVars[m[1]] = m[2].trim();
}

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const payloadPath =
  process.env.RO_PAYLOAD_PATH ||
  path.resolve(__dirname, 'ro_2004_2006_payload.json');
const roPayload = JSON.parse(fs.readFileSync(payloadPath, 'utf8'));

async function getStructureIdByCodeAndIdentifier(normCode, identifier) {
  const { data: norm } = await supabase.from('norms').select('id').eq('code', normCode).single();
  if (!norm) return null;
  const { data: versions } = await supabase.from('norm_versions').select('id').eq('norm_id', norm.id);
  if (!versions || !versions.length) return null;
  const vIds = versions.map(v => v.id);
  const { data: structs } = await supabase
    .from('normative_structures')
    .select('id')
    .in('norm_version_id', vIds)
    .eq('identifier', identifier)
    .order('created_at', { ascending: false })
    .limit(1);
  return structs && structs[0] ? structs[0].id : null;
}

async function main() {
  console.log('=== INICIANDO CARGA CRONOLÓGICA DEL REGISTRO OFICIAL (2004 - 2006) ===');

  // ---------------------------------------------------------------------------
  // EVENTO 1: 17/nov/2004 — Suplemento R.O. 463 (Codificación 2004-026 LRTI)
  // ---------------------------------------------------------------------------
  console.log('\n[1/7] 2004-11-17 | Suplemento R.O. 463 -> Creando Ley Base LRTI (Codificación 2004-026, 132 estructuras)...');
  const { data: res1, error: err1 } = await supabase.rpc('ingest_extracted_norm_draft', {
    p_norm_code: 'LRTI',
    p_version_title: 'Ley de Régimen Tributario Interno (Codificación No. 2004-026 - Suplemento R.O. 463)',
    p_published_on: '2004-11-17',
    p_model: 'gemini-2.5-flash',
    p_articles: roPayload.lrti_2004_items,
    p_folder_category: '02_leyes',
    p_file_name: 'RS1_20041117_463.pdf',
    p_storage_path: 'RO Historico/RS1_20041117_463.pdf'
  });
  if (err1) throw err1;
  console.log(' -> Resultado Evento 1:', JSON.stringify(res1));

  // ---------------------------------------------------------------------------
  // EVENTO 2: 09/dic/2004 — R.O. 478 (Fe de Erratas Oficio No. 1426-CLC-CN-04)
  // ---------------------------------------------------------------------------
  console.log('\n[2/7] 2004-12-09 | R.O. 478 -> Ingestando Fe de Erratas y reformando Arts. 2, 19, 36, 72, 82 y 111 de la LRTI...');
  const feItems = [
    {
      structure_type: 'article',
      identifier: 'FE-1',
      title: 'Rectificación al Artículo 2 (Concepto de renta)',
      parent_title: 'FE DE ERRATAS OFICIO No. 1426-CLC-CN-04',
      parent_chapter: 'RECTIFICACIONES A LA CODIFICACIÓN 2004-026 DE LA LRTI',
      content: 'En el artículo 2, numeral 1, al final del inciso primero, en lugar de: "...artículo 94 de esta Ley.", debe decir: "...artículo 98 de esta Ley."',
      ordinal: 1,
      valid_from: '2004-12-09',
      legal_status: 'vigente',
      official_registry: 'Registro Oficial No. 478 de 9 de diciembre de 2004',
      reform_source_cite: 'Oficio No. 1426-CLC-CN-04 (Fe de Erratas R.O. 478)',
      vertical_concepts: ['HECHO_GENERADOR']
    },
    {
      structure_type: 'article',
      identifier: 'FE-2',
      title: 'Rectificación al Artículo 19 (Obligación de llevar contabilidad)',
      parent_title: 'FE DE ERRATAS OFICIO No. 1426-CLC-CN-04',
      parent_chapter: 'RECTIFICACIONES A LA CODIFICACIÓN 2004-026 DE LA LRTI',
      content: 'En el artículo 19, inciso primero, en lugar de: "...veinte y seis mil dólares (26.000 USD)...", debe decir: "...veinte y cuatro mil dólares (24.000 USD)...".',
      ordinal: 2,
      valid_from: '2004-12-09',
      legal_status: 'vigente',
      official_registry: 'Registro Oficial No. 478 de 9 de diciembre de 2004',
      reform_source_cite: 'Oficio No. 1426-CLC-CN-04 (Fe de Erratas R.O. 478)',
      vertical_concepts: ['SUJETO_PASIVO']
    },
    {
      structure_type: 'article',
      identifier: 'FE-3',
      title: 'Rectificación al Artículo 36 literal c) (Premios de loterías, rifas y apuestas)',
      parent_title: 'FE DE ERRATAS OFICIO No. 1426-CLC-CN-04',
      parent_chapter: 'RECTIFICACIONES A LA CODIFICACIÓN 2004-026 DE LA LRTI',
      content: 'En el artículo 36, literal c), en lugar de: "...dos mil seiscientos dólares (2.600 USD)...", debe decir: "...ochenta dólares (80 USD)...".',
      ordinal: 3,
      valid_from: '2004-12-09',
      legal_status: 'vigente',
      official_registry: 'Registro Oficial No. 478 de 9 de diciembre de 2004',
      reform_source_cite: 'Oficio No. 1426-CLC-CN-04 (Fe de Erratas R.O. 478)',
      vertical_concepts: ['TARIFAS', 'TARIFA_IMPUESTO_RENTA']
    },
    {
      structure_type: 'article',
      identifier: 'FE-4',
      title: 'Rectificación al Artículo 72 (IVA pagado en actividades de exportación)',
      parent_title: 'FE DE ERRATAS OFICIO No. 1426-CLC-CN-04',
      parent_chapter: 'RECTIFICACIONES A LA CODIFICACIÓN 2004-026 DE LA LRTI',
      content: 'En el artículo 72, agréguese como inciso final el siguiente: "El reintegro del impuesto al valor agregado, IVA, no es aplicable a la actividad petrolera en lo referente a la extracción, transporte y comercialización de petróleo crudo, puesto que el petróleo no se fabrica, sino que se lo extrae de los respectivos yacimientos."',
      ordinal: 4,
      valid_from: '2004-12-09',
      legal_status: 'vigente',
      official_registry: 'Registro Oficial No. 478 de 9 de diciembre de 2004',
      reform_source_cite: 'Oficio No. 1426-CLC-CN-04 (Fe de Erratas R.O. 478)',
      vertical_concepts: ['CREDITO_TRIBUTARIO']
    },
    {
      structure_type: 'article',
      identifier: 'FE-5',
      title: 'Rectificación al Artículo 82 (Tarifas del Impuesto a los Consumos Especiales ICE)',
      parent_title: 'FE DE ERRATAS OFICIO No. 1426-CLC-CN-04',
      parent_chapter: 'RECTIFICACIONES A LA CODIFICACIÓN 2004-026 DE LA LRTI',
      content: 'En el artículo 82, Grupo I, en Cigarrillos Rubios sustitúyase "77,25%" por "98%", en Alcohol y productos alcohólicos distintos a la cerveza sustitúyase "26,78%" por "32%", e incorpórese el inciso relativo a la unificación de tarifas de cigarrillos rubios.',
      ordinal: 5,
      valid_from: '2004-12-09',
      legal_status: 'vigente',
      official_registry: 'Registro Oficial No. 478 de 9 de diciembre de 2004',
      reform_source_cite: 'Oficio No. 1426-CLC-CN-04 (Fe de Erratas R.O. 478)',
      vertical_concepts: ['TARIFAS']
    },
    {
      structure_type: 'article',
      identifier: 'FE-6',
      title: 'Rectificación al Artículo 111 (Sanciones a funcionarios y empleados públicos)',
      parent_title: 'FE DE ERRATAS OFICIO No. 1426-CLC-CN-04',
      parent_chapter: 'RECTIFICACIONES A LA CODIFICACIÓN 2004-026 DE LA LRTI',
      content: 'En el artículo 111, inciso cuarto, en lugar de: "...26,68 USD...", debe decir: "...23,68 USD...".',
      ordinal: 6,
      valid_from: '2004-12-09',
      legal_status: 'vigente',
      official_registry: 'Registro Oficial No. 478 de 9 de diciembre de 2004',
      reform_source_cite: 'Oficio No. 1426-CLC-CN-04 (Fe de Erratas R.O. 478)',
      vertical_concepts: []
    }
  ];

  const { data: res2, error: err2 } = await supabase.rpc('ingest_extracted_norm_draft', {
    p_norm_code: 'FE-ERRATAS-LRTI-2004-478',
    p_version_title: 'Fe de Erratas a la Codificación de la LRTI (Oficio No. 1426-CLC-CN-04 - R.O. 478)',
    p_published_on: '2004-12-09',
    p_model: 'gemini-2.5-flash',
    p_articles: feItems,
    p_folder_category: '04_leyes_reformas',
    p_file_name: 'RO_20041209_478.pdf',
    p_storage_path: 'RO Historico/RO_20041209_478.pdf'
  });
  if (err2) throw err2;
  console.log(' -> Fe de Erratas ingresada:', JSON.stringify(res2));

  const feReforms = [
    { feId: 'FE-1', art: '2', content: roPayload.reforms_data.art2_v2, summary: 'Fe de erratas (R.O. 478 de 09/dic/2004): se corrige la remisión del numeral 1 sustituyendo "artículo 94" por "artículo 98 de esta Ley".' },
    { feId: 'FE-2', art: '19', content: roPayload.reforms_data.art19_v2, summary: 'Fe de erratas (R.O. 478 de 09/dic/2004): se rectifica el monto de ingresos brutos para llevar contabilidad de $26.000 USD a $24.000 USD.' },
    { feId: 'FE-3', art: '36', content: roPayload.reforms_data.art36_v2, summary: 'Fe de erratas (R.O. 478 de 09/dic/2004): en el literal c) se rectifica el monto exento sobre premios de loterías, rifas y apuestas de $2.600 USD a $80 USD.' },
    { feId: 'FE-4', art: '72', content: roPayload.reforms_data.art72_v2, summary: 'Fe de erratas (R.O. 478 de 09/dic/2004): se reincorpora el inciso final que excluye del reintegro de IVA a la extracción, transporte y comercialización de petróleo crudo.' },
    { feId: 'FE-5', art: '82', content: roPayload.reforms_data.art82_v2, summary: 'Fe de erratas (R.O. 478 de 09/dic/2004): se rectifican las tarifas del ICE para cigarrillos rubios (98%) y alcohol y productos alcohólicos distintos a la cerveza (32%).' },
    { feId: 'FE-6', art: '111', content: roPayload.reforms_data.art111_v2, summary: 'Fe de erratas (R.O. 478 de 09/dic/2004): en el inciso cuarto se corrige el valor de la multa mínima de 26,68 USD a 23,68 USD.' }
  ];

  for (const r of feReforms) {
    const srcId = await getStructureIdByCodeAndIdentifier('FE-ERRATAS-LRTI-2004-478', r.feId);
    const { error: refErr } = await supabase.rpc('apply_official_registry_reform', {
      p_target_norm_code: 'LRTI',
      p_target_article_identifier: r.art,
      p_new_title: null,
      p_new_content: r.content,
      p_effective_date: '2004-12-09',
      p_valid_until: null,
      p_change_type: 'modified',
      p_reform_source_cite: 'Fe de Erratas H. Congreso Nacional (Oficio No. 1426-CLC-CN-04)',
      p_official_registry_cite: 'Registro Oficial No. 478 de 9 de diciembre de 2004',
      p_summary_change: r.summary,
      p_modifying_structure_id: srcId,
      p_source_document_id: res2.document_id,
      p_legal_status: 'vigente_reformado',
      p_normative_tables: null
    });
    if (refErr) throw refErr;
  }
  console.log(' -> 6 artículos de la LRTI actualizados con la Fe de Erratas (R.O. 478).');

  // ---------------------------------------------------------------------------
  // EVENTO 3: 31/dic/2004 — Suplemento R.O. 494 + Resolución SRI 9170104DGER-0773
  // ---------------------------------------------------------------------------
  console.log('\n[3/7] 2004-12-31 | Suplemento R.O. 494 -> Ingestando Resolución SRI No. 9170104DGER-0773 y actualizando Tabla Art. 36 (2005)...');
  const tbl2005 = {
    code: 'TBL_IR_PN_2005',
    titulo_tabla: 'Tabla Impuesto a la Renta Personas Naturales y Sucesiones Indivisas (Ejercicio Fiscal 2005)',
    descripcion: 'Art. 36 lit. a) LRTI — Resolución SRI No. 9170104DGER-0773 (Suplemento R.O. 494 de 31 de diciembre de 2004)',
    categoria_tabla: 'progressive_rates',
    fiscal_year: 2005,
    valid_from: '2005-01-01',
    valid_until: '2005-12-31',
    columns_schema: [
      { key: 'fraccion_basica', label: 'Fracción Básica (USD)', type: 'currency' },
      { key: 'exceso_hasta', label: 'Exceso Hasta (USD)', type: 'currency' },
      { key: 'impuesto_fraccion_basica', label: 'Impuesto Fracción Básica (USD)', type: 'currency' },
      { key: 'porcentaje_excedente', label: '% Impuesto Fracción Excedente', type: 'percentage' }
    ],
    rows_data: [
      { fraccion_basica: 0, exceso_hasta: 7400, impuesto_fraccion_basica: 0, porcentaje_excedente: 0 },
      { fraccion_basica: 7400, exceso_hasta: 14800, impuesto_fraccion_basica: 0, porcentaje_excedente: 5 },
      { fraccion_basica: 14800, exceso_hasta: 29600, impuesto_fraccion_basica: 370, porcentaje_excedente: 10 },
      { fraccion_basica: 29600, exceso_hasta: 44100, impuesto_fraccion_basica: 1850, porcentaje_excedente: 15 },
      { fraccion_basica: 44100, exceso_hasta: 58800, impuesto_fraccion_basica: 4025, porcentaje_excedente: 20 },
      { fraccion_basica: 58800, exceso_hasta: null, impuesto_fraccion_basica: 6965, porcentaje_excedente: 25 }
    ]
  };

  const res773Items = [
    {
      structure_type: 'article',
      identifier: 'CONSIDERANDOS',
      title: 'Considerandos de la Resolución No. 9170104DGER-0773',
      parent_title: 'PARTE CONSIDERATIVA',
      parent_chapter: 'FUNDAMENTOS CONSTITUCIONALES Y LEGALES',
      content: `EL DIRECTOR GENERAL DEL SERVICIO DE RENTAS INTERNAS

Considerando:

Que en el Suplemento del Registro Oficial No. 463 de 17 de noviembre de 2004 se publicó la Codificación de la Ley de Régimen Tributario Interno;

Que el último inciso de la letra a) del Art. 36 de la Ley de Régimen Tributario Interno establece que los valores de la tabla constante en dicha letra serán corregidos anualmente por el Índice de Precios al Consumidor en el Área Urbana, dictado por el INEC en el mes de noviembre de cada año, con vigencia para el año siguiente;

Que el Art. 50 del Reglamento para la Aplicación de la Ley de Régimen Tributario Interno señala que el Director General del Servicio de Rentas Internas, mediante resolución, publicará antes del 31 de diciembre de cada año los nuevos valores que regirán para el cálculo del impuesto a la renta de las personas naturales y de las sucesiones indivisas en el ejercicio impositivo siguiente;

Que de acuerdo con la información proporcionada por el Instituto Nacional de Estadística y Censos -INEC-, la variación anual del Índice de Precios al Consumidor del Área Urbana a noviembre de 2004 fue del 2,00%; y,

En uso de las facultades que le otorga la ley,

Resuelve:`,
      ordinal: 1,
      valid_from: '2004-12-31',
      legal_status: 'vigente',
      official_registry: 'Suplemento del Registro Oficial No. 494 de 31 de diciembre de 2004',
      reform_source_cite: 'Resolución SRI No. 9170104DGER-0773 (29/dic/2004)',
      vertical_concepts: ['TARIFAS', 'TARIFA_IMPUESTO_RENTA']
    },
    {
      structure_type: 'article',
      identifier: '1',
      title: 'Art. 1.- Tabla para liquidar el impuesto a la renta de personas naturales y sucesiones indivisas (Ejercicio Económico 2005)',
      parent_title: 'PARTE RESOLUTIVA',
      parent_chapter: 'TABLA PROGRESIVA EJERCICIO ECONÓMICO 2005',
      content: `Los valores de la tabla vigente en el literal a) del artículo 36 de la Ley de Régimen Tributario Interno se actualizan para el ejercicio económico del año 2005 de acuerdo a la siguiente tabla:

| Fracción Básica (USD) | Exceso Hasta (USD) | Impuesto Fracción Básica (USD) | % Impuesto Fracción Excedente |
| --- | --- | --- | --- |
| $ 0 | $ 7.400 | $ 0 | 0% |
| $ 7.400 | $ 14.800 | $ 0 | 5% |
| $ 14.800 | $ 29.600 | $ 370 | 10% |
| $ 29.600 | $ 44.100 | $ 1.850 | 15% |
| $ 44.100 | $ 58.800 | $ 4.025 | 20% |
| $ 58.800 | En adelante | $ 6.965 | 25% |`,
      ordinal: 2,
      valid_from: '2005-01-01',
      valid_until: '2005-12-31',
      legal_status: 'vigente',
      official_registry: 'Suplemento del Registro Oficial No. 494 de 31 de diciembre de 2004',
      reform_source_cite: 'Resolución SRI No. 9170104DGER-0773 (9170104DGER-0773.pdf)',
      vertical_concepts: ['TARIFAS', 'TARIFA_IMPUESTO_RENTA', 'BASE_IMPONIBLE']
    },
    {
      structure_type: 'article',
      identifier: '2',
      title: 'Art. 2.- Vigencia a partir del 1 de enero de 2005',
      parent_title: 'PARTE RESOLUTIVA',
      parent_chapter: 'DISPOSICIÓN DE VIGENCIA',
      content: 'La presente resolución entrará en vigencia a partir del 1 de enero de 2005, sin perjuicio de su publicación en el Registro Oficial.\n\nComuníquese y publíquese.- Dado en San Francisco de Quito, D.M., a 29 de diciembre de 2004.\n\nEcon. Vicente Saavedra Alberca, Director General del Servicio de Rentas Internas.',
      ordinal: 3,
      valid_from: '2004-12-31',
      legal_status: 'vigente',
      official_registry: 'Suplemento del Registro Oficial No. 494 de 31 de diciembre de 2004',
      reform_source_cite: 'Resolución SRI No. 9170104DGER-0773 (29/dic/2004)',
      vertical_concepts: []
    }
  ];

  const { data: res3, error: err3 } = await supabase.rpc('ingest_extracted_norm_draft', {
    p_norm_code: 'RES-SRI-2004-0773',
    p_version_title: 'Resolución del SRI No. 9170104DGER-0773 (Tabla Impuesto a la Renta 2005 - Suplemento R.O. 494)',
    p_published_on: '2004-12-31',
    p_model: 'gemini-2.5-flash',
    p_articles: res773Items,
    p_folder_category: '05_resoluciones_sri',
    p_file_name: '9170104DGER-0773.pdf',
    p_storage_path: '9170104DGER-0773.pdf'
  });
  if (err3) throw err3;
  console.log(' -> Resolución SRI 9170104DGER-0773 ingresada:', JSON.stringify(res3));

  const res773Art1Id = await getStructureIdByCodeAndIdentifier('RES-SRI-2004-0773', '1');
  const { error: err3Ref } = await supabase.rpc('apply_official_registry_reform', {
    p_target_norm_code: 'LRTI',
    p_target_article_identifier: '36',
    p_new_title: null,
    p_new_content: roPayload.reforms_data.art36_v3,
    p_effective_date: '2004-12-31',
    p_valid_until: null,
    p_change_type: 'modified',
    p_reform_source_cite: 'Resolución del SRI No. 9170104DGER-0773 (9170104DGER-0773.pdf)',
    p_official_registry_cite: 'Suplemento del Registro Oficial No. 494 de 31 de diciembre de 2004',
    p_summary_change: 'Reforma mediante Resolución del SRI No. 9170104DGER-0773 (Suplemento R.O. 494 de 31/dic/2004): se actualiza la tabla del literal a) del Art. 36 para el ejercicio económico 2005 ($0 a $7.400 exento; exceso hasta $58.800 en adelante con $6.965 de impuesto básico y 25% sobre el excedente).',
    p_modifying_structure_id: res773Art1Id,
    p_source_document_id: res3.document_id,
    p_legal_status: 'vigente_reformado',
    p_normative_tables: [tbl2005]
  });
  if (err3Ref) throw err3Ref;
  console.log(' -> Art. 36 de la LRTI reformado con la tabla 2005 y enlazado a la Resolución 9170104DGER-0773.');

  // ---------------------------------------------------------------------------
  // EVENTO 4: 18/nov/2005 — R.O. 148 (Ley No. 2005-20 de Beneficios Tributarios)
  // ---------------------------------------------------------------------------
  console.log('\n[4/7] 2005-11-18 | R.O. 148 -> Ingestando Ley No. 2005-20 y reformando el Art. 9 de la LRTI...');
  const ley20Items = [
    {
      structure_type: 'article',
      identifier: '1',
      title: 'Art. 1.- Ámbito y objeto de las nuevas inversiones productivas',
      parent_title: 'LEY No. 2005-20',
      parent_chapter: 'BENEFICIOS E INCENTIVOS TRIBUTARIOS A NUEVAS INVERSIONES',
      content: 'Las empresas que se constituyan a partir de la vigencia de la presente Ley, en la República del Ecuador, cuyo objeto sea la realización de nuevas inversiones productivas iniciales por los montos mínimos señalados en el artículo 2, en sectores tales como: hidroeléctrico, generación de energía no convencional, hidrocarburos, minería, petroquímica, celulosa, turismo, químico, metalmecánico, biotecnología, bioenergía, agroindustria de exportación, forestación, piscícola y maricultura, gozarán de los beneficios tributarios previstos en esta Ley.',
      ordinal: 1,
      valid_from: '2005-11-18',
      legal_status: 'vigente',
      official_registry: 'Registro Oficial No. 148 de 18 de noviembre de 2005',
      reform_source_cite: 'Ley No. 2005-20 (R.O. 148)',
      vertical_concepts: ['EXONERACIONES', 'SUJETO_PASIVO']
    },
    {
      structure_type: 'article',
      identifier: '2',
      title: 'Art. 2.- Montos mínimos de inversión inicial y plazos de exoneración del Impuesto a la Renta',
      parent_title: 'LEY No. 2005-20',
      parent_chapter: 'BENEFICIOS E INCENTIVOS TRIBUTARIOS A NUEVAS INVERSIONES',
      content: 'Los montos mínimos de inversión inicial para acceder a los beneficios establecidos en esta Ley van desde USD 70.000.000 en generación hidroeléctrica e hidrocarburos hasta USD 1.500.000 en agroindustria, biotecnología y turismo, otorgando deducción de la totalidad de las utilidades para efectos del impuesto a la renta por el período de diez (10) años a partir del inicio de la producción o venta, y de doce (12) años cuando la inversión se realice en zonas fronterizas o de menor desarrollo relativo.',
      ordinal: 2,
      valid_from: '2005-11-18',
      legal_status: 'vigente',
      official_registry: 'Registro Oficial No. 148 de 18 de noviembre de 2005',
      reform_source_cite: 'Ley No. 2005-20 (R.O. 148)',
      vertical_concepts: ['EXONERACIONES', 'DEDUCCIONES']
    },
    {
      structure_type: 'article',
      identifier: '3',
      title: 'Art. 3.- Beneficios para empresas existentes que realicen ampliaciones con contabilidad separada',
      parent_title: 'LEY No. 2005-20',
      parent_chapter: 'BENEFICIOS E INCENTIVOS TRIBUTARIOS A NUEVAS INVERSIONES',
      content: 'Las empresas existentes que realicen nuevas inversiones destinadas a la ampliación o modernización de sus instalaciones por los montos mínimos previstos en el artículo 2, podrán acogerse a los beneficios de esta Ley respecto de la nueva inversión, siempre que lleven contabilidad separada.',
      ordinal: 3,
      valid_from: '2005-11-18',
      legal_status: 'vigente',
      official_registry: 'Registro Oficial No. 148 de 18 de noviembre de 2005',
      reform_source_cite: 'Ley No. 2005-20 (R.O. 148)',
      vertical_concepts: ['EXONERACIONES']
    },
    {
      structure_type: 'article',
      identifier: '4',
      title: 'Art. 4.- Exoneración de derechos arancelarios e impuestos municipales y provinciales',
      parent_title: 'LEY No. 2005-20',
      parent_chapter: 'BENEFICIOS E INCENTIVOS TRIBUTARIOS A NUEVAS INVERSIONES',
      content: 'Gozarán asimismo de exoneración total de derechos arancelarios en la importación de maquinaria, equipos nuevos y repuestos requeridos para la instalación y puesta en marcha del proyecto, así como de los impuestos de alcabala, registro e inscripción en la constitución de la compañía y adquisición de inmuebles.',
      ordinal: 4,
      valid_from: '2005-11-18',
      legal_status: 'vigente',
      official_registry: 'Registro Oficial No. 148 de 18 de noviembre de 2005',
      reform_source_cite: 'Ley No. 2005-20 (R.O. 148)',
      vertical_concepts: ['EXONERACIONES']
    },
    {
      structure_type: 'article',
      identifier: '5',
      title: 'Art. 5.- Requisitos de generación de empleo directo y contratación nacional',
      parent_title: 'LEY No. 2005-20',
      parent_chapter: 'OBLIGACIONES Y CONTROL DE LAS INVERSIONES',
      content: 'Para acceder y mantener los beneficios de la presente Ley, las empresas beneficiarias deberán generar empleo directo permanente e incorporar al menos el ochenta y cinco por ciento (85%) de trabajadores ecuatorianos.',
      ordinal: 5,
      valid_from: '2005-11-18',
      legal_status: 'vigente',
      official_registry: 'Registro Oficial No. 148 de 18 de noviembre de 2005',
      reform_source_cite: 'Ley No. 2005-20 (R.O. 148)',
      vertical_concepts: []
    },
    {
      structure_type: 'article',
      identifier: '6',
      title: 'Art. 6.- Estabilidad tributaria sobre las inversiones calificadas',
      parent_title: 'LEY No. 2005-20',
      parent_chapter: 'OBLIGACIONES Y CONTROL DE LAS INVERSIONES',
      content: 'El Estado garantiza la estabilidad de los beneficios tributarios reconocidos al amparo de esta Ley durante todo el plazo de vigencia para el cual fueron calificados.',
      ordinal: 6,
      valid_from: '2005-11-18',
      legal_status: 'vigente',
      official_registry: 'Registro Oficial No. 148 de 18 de noviembre de 2005',
      reform_source_cite: 'Ley No. 2005-20 (R.O. 148)',
      vertical_concepts: ['EXONERACIONES']
    },
    {
      structure_type: 'article',
      identifier: '7',
      title: 'Art. 7.- Comisión Interinstitucional de Calificación y Control',
      parent_title: 'LEY No. 2005-20',
      parent_chapter: 'OBLIGACIONES Y CONTROL DE LAS INVERSIONES',
      content: 'Créase la Comisión encargada de calificar los proyectos de inversión y verificar el cumplimiento de los cronogramas de inversión y generación de empleo, con participación del Ministerio de Economía y Finanzas, el Ministerio de Comercio Exterior y el Servicio de Rentas Internas.',
      ordinal: 7,
      valid_from: '2005-11-18',
      legal_status: 'vigente',
      official_registry: 'Registro Oficial No. 148 de 18 de noviembre de 2005',
      reform_source_cite: 'Ley No. 2005-20 (R.O. 148)',
      vertical_concepts: []
    },
    {
      structure_type: 'article',
      identifier: '8',
      title: 'Art. 8.- Causales de revocatoria y reliquidación de tributos con recargos',
      parent_title: 'LEY No. 2005-20',
      parent_chapter: 'OBLIGACIONES Y CONTROL DE LAS INVERSIONES',
      content: 'El incumplimiento de los montos mínimos de inversión o de generación de empleo dará lugar a la revocatoria inmediata de los beneficios y al cobro de los tributos exonerados más los intereses y multas establecidos en el Código Tributario.',
      ordinal: 8,
      valid_from: '2005-11-18',
      legal_status: 'vigente',
      official_registry: 'Registro Oficial No. 148 de 18 de noviembre de 2005',
      reform_source_cite: 'Ley No. 2005-20 (R.O. 148)',
      vertical_concepts: []
    },
    {
      structure_type: 'article',
      identifier: '9',
      title: 'Art. 9.- Obligaciones formales ante el Servicio de Rentas Internas y la CAE',
      parent_title: 'LEY No. 2005-20',
      parent_chapter: 'OBLIGACIONES Y CONTROL DE LAS INVERSIONES',
      content: 'Los beneficiarios de esta Ley están obligados a presentar sus declaraciones tributarias anuales y mensuales ante el Servicio de Rentas Internas y la Corporación Aduanera Ecuatoriana, consignando en los casilleros informativos los montos exonerados.',
      ordinal: 9,
      valid_from: '2005-11-18',
      legal_status: 'vigente',
      official_registry: 'Registro Oficial No. 148 de 18 de noviembre de 2005',
      reform_source_cite: 'Ley No. 2005-20 (R.O. 148)',
      vertical_concepts: ['SUJETO_PASIVO']
    },
    {
      structure_type: 'article',
      identifier: '10',
      title: 'Art. 10.- Reforma al inciso final del artículo 9 de la Ley de Régimen Tributario Interno',
      parent_title: 'LEY No. 2005-20',
      parent_chapter: 'REFORMAS A LA LEY DE RÉGIMEN TRIBUTARIO INTERNO',
      content: 'En el inciso final del artículo 9 de la Ley de Régimen Tributario Interno, sustitúyase el punto final por una coma y agréguese la frase: ", con excepción de lo previsto en la Ley de Beneficios Tributarios para nuevas Inversiones Productivas, Generación de Empleo y de Prestación de Servicios."',
      ordinal: 10,
      valid_from: '2005-11-18',
      legal_status: 'vigente',
      official_registry: 'Registro Oficial No. 148 de 18 de noviembre de 2005',
      reform_source_cite: 'Art. 10 de la Ley No. 2005-20 (R.O. 148)',
      vertical_concepts: ['EXONERACIONES']
    },
    {
      structure_type: 'article',
      identifier: 'DF-UNICA',
      title: 'Artículo Final.- Vigencia desde su publicación en el Registro Oficial',
      parent_title: 'LEY No. 2005-20',
      parent_chapter: 'DISPOSICIÓN FINAL',
      content: 'La presente Ley entrará en vigencia a partir de su publicación en el Registro Oficial.\n\nDada en el Distrito Metropolitano de Quito, en la Sala de Sesiones del Congreso Nacional del Ecuador, a los ocho días del mes de noviembre del año dos mil cinco.',
      ordinal: 11,
      valid_from: '2005-11-18',
      legal_status: 'vigente',
      official_registry: 'Registro Oficial No. 148 de 18 de noviembre de 2005',
      reform_source_cite: 'Ley No. 2005-20 (R.O. 148)',
      vertical_concepts: []
    }
  ];

  const { data: res4, error: err4 } = await supabase.rpc('ingest_extracted_norm_draft', {
    p_norm_code: 'LEY-2005-20',
    p_version_title: 'Ley No. 2005-20: Ley de Beneficios Tributarios para Nuevas Inversiones Productivas (R.O. 148)',
    p_published_on: '2005-11-18',
    p_model: 'gemini-2.5-flash',
    p_articles: ley20Items,
    p_folder_category: '02_leyes',
    p_file_name: 'RO_20051118_148.pdf',
    p_storage_path: 'RO Historico/RO_20051118_148.pdf'
  });
  if (err4) throw err4;
  console.log(' -> Ley No. 2005-20 ingresada:', JSON.stringify(res4));

  const ley20Art10Id = await getStructureIdByCodeAndIdentifier('LEY-2005-20', '10');
  const { error: err4Ref } = await supabase.rpc('apply_official_registry_reform', {
    p_target_norm_code: 'LRTI',
    p_target_article_identifier: '9',
    p_new_title: null,
    p_new_content: roPayload.reforms_data.art9_v2,
    p_effective_date: '2005-11-18',
    p_valid_until: null,
    p_change_type: 'modified',
    p_reform_source_cite: 'Art. 10 de la Ley No. 2005-20 (R.O. 148 de 18/nov/2005)',
    p_official_registry_cite: 'Registro Oficial No. 148 de 18 de noviembre de 2005',
    p_summary_change: 'Reforma expresa al inciso final del Art. 9 (Exenciones) por el Art. 10 de la Ley No. 2005-20 (R.O. 148 de 18/nov/2005): se agrega la excepción expresa a favor de los beneficios previstos en la Ley de Beneficios Tributarios para nuevas Inversiones Productivas, Generación de Empleo y de Prestación de Servicios.',
    p_modifying_structure_id: ley20Art10Id,
    p_source_document_id: res4.document_id,
    p_legal_status: 'vigente_reformado',
    p_normative_tables: null
  });
  if (err4Ref) throw err4Ref;
  console.log(' -> Art. 9 de la LRTI reformado por el Art. 10 de la Ley No. 2005-20.');

  // ---------------------------------------------------------------------------
  // EVENTO 5: 29/dic/2005 — R.O. 176 + Resolución SRI NAC-DGER2005-0628
  // ---------------------------------------------------------------------------
  console.log('\n[5/7] 2005-12-29 | R.O. 176 -> Ingestando Resolución SRI No. NAC-DGER2005-0628 y actualizando Tabla Art. 36 (2006)...');
  const tbl2006 = {
    code: 'TBL_IR_PN_2006',
    titulo_tabla: 'Tabla Impuesto a la Renta Personas Naturales y Sucesiones Indivisas (Ejercicio Fiscal 2006)',
    descripcion: 'Art. 36 lit. a) LRTI — Resolución SRI No. NAC-DGER2005-0628 (R.O. 176 de 29 de diciembre de 2005)',
    categoria_tabla: 'progressive_rates',
    fiscal_year: 2006,
    valid_from: '2006-01-01',
    valid_until: '2006-12-31',
    columns_schema: [
      { key: 'fraccion_basica', label: 'Fracción Básica (USD)', type: 'currency' },
      { key: 'exceso_hasta', label: 'Exceso Hasta (USD)', type: 'currency' },
      { key: 'impuesto_fraccion_basica', label: 'Impuesto Fracción Básica (USD)', type: 'currency' },
      { key: 'porcentaje_excedente', label: '% Impuesto Fracción Excedente', type: 'percentage' }
    ],
    rows_data: [
      { fraccion_basica: 0, exceso_hasta: 7680, impuesto_fraccion_basica: 0, porcentaje_excedente: 0 },
      { fraccion_basica: 7680, exceso_hasta: 15360, impuesto_fraccion_basica: 0, porcentaje_excedente: 5 },
      { fraccion_basica: 15360, exceso_hasta: 30720, impuesto_fraccion_basica: 384, porcentaje_excedente: 10 },
      { fraccion_basica: 30720, exceso_hasta: 46080, impuesto_fraccion_basica: 1920, porcentaje_excedente: 15 },
      { fraccion_basica: 46080, exceso_hasta: 61440, impuesto_fraccion_basica: 4224, porcentaje_excedente: 20 },
      { fraccion_basica: 61440, exceso_hasta: null, impuesto_fraccion_basica: 7296, porcentaje_excedente: 25 }
    ]
  };

  const res628Items = [
    {
      structure_type: 'article',
      identifier: 'CONSIDERANDOS',
      title: 'Considerandos de la Resolución No. NAC-DGER2005-0628',
      parent_title: 'PARTE CONSIDERATIVA',
      parent_chapter: 'FUNDAMENTOS CONSTITUCIONALES Y LEGALES',
      content: `EL DIRECTOR GENERAL DEL SERVICIO DE RENTAS INTERNAS

Considerando:

Que en el Suplemento del Registro Oficial No. 463 de 17 de noviembre de 2004 se publicó la Codificación de la Ley de Régimen Tributario Interno;

Que el último inciso de la letra a) del Art. 36 de la Ley de Régimen Tributario Interno establece que los valores de la tabla constante en dicha letra serán corregidos anualmente por el Índice de Precios al Consumidor en el Área Urbana, dictado por el INEC en el mes de noviembre de cada año, con vigencia para el año siguiente;

Que el Art. 50 del Reglamento para la Aplicación de la Ley de Régimen Tributario Interno señala que el Director General del Servicio de Rentas Internas, mediante resolución, publicará antes del 31 de diciembre de cada año los nuevos valores que regirán para el cálculo del impuesto a la renta de las personas naturales y de las sucesiones indivisas en el ejercicio impositivo siguiente;

Que de acuerdo con la información proporcionada por el Instituto Nacional de Estadística y Censos -INEC-, la variación anual del Índice de Precios al Consumidor del Área Urbana a noviembre de 2005 fue del 3,80%; y,

En uso de las facultades que le otorga la ley,

Resuelve:`,
      ordinal: 1,
      valid_from: '2005-12-29',
      legal_status: 'vigente',
      official_registry: 'Registro Oficial No. 176 de 29 de diciembre de 2005',
      reform_source_cite: 'Resolución SRI No. NAC-DGER2005-0628 (21/dic/2005)',
      vertical_concepts: ['TARIFAS', 'TARIFA_IMPUESTO_RENTA']
    },
    {
      structure_type: 'article',
      identifier: '1',
      title: 'Art. 1.- Tabla para liquidar el impuesto a la renta de personas naturales y sucesiones indivisas (Ejercicio Económico 2006)',
      parent_title: 'PARTE RESOLUTIVA',
      parent_chapter: 'TABLA PROGRESIVA EJERCICIO ECONÓMICO 2006',
      content: `Los valores de la tabla vigente en el literal a) del artículo 36 de la Ley de Régimen Tributario Interno se actualizan para el ejercicio económico del año 2006 de acuerdo a la siguiente tabla:

| Fracción Básica (USD) | Exceso Hasta (USD) | Impuesto Fracción Básica (USD) | % Impuesto Fracción Excedente |
| --- | --- | --- | --- |
| $ 0 | $ 7.680 | $ 0 | 0% |
| $ 7.680 | $ 15.360 | $ 0 | 5% |
| $ 15.360 | $ 30.720 | $ 384 | 10% |
| $ 30.720 | $ 46.080 | $ 1.920 | 15% |
| $ 46.080 | $ 61.440 | $ 4.224 | 20% |
| $ 61.440 | En adelante | $ 7.296 | 25% |`,
      ordinal: 2,
      valid_from: '2006-01-01',
      legal_status: 'vigente',
      official_registry: 'Registro Oficial No. 176 de 29 de diciembre de 2005',
      reform_source_cite: 'Resolución SRI No. NAC-DGER2005-0628 (NAC-DGER2005-0628.pdf)',
      vertical_concepts: ['TARIFAS', 'TARIFA_IMPUESTO_RENTA', 'BASE_IMPONIBLE']
    },
    {
      structure_type: 'article',
      identifier: '2',
      title: 'Art. 2.- Vigencia a partir del 1 de enero de 2006',
      parent_title: 'PARTE RESOLUTIVA',
      parent_chapter: 'DISPOSICIÓN DE VIGENCIA',
      content: 'La presente resolución entrará en vigencia a partir del 1 de enero de 2006, sin perjuicio de su publicación en el Registro Oficial.\n\nComuníquese y publíquese.- Dado en San Francisco de Quito, D.M., a 21 de diciembre de 2005.\n\nEcon. Vicente Saavedra Alberca, Director General del Servicio de Rentas Internas.',
      ordinal: 3,
      valid_from: '2005-12-29',
      legal_status: 'vigente',
      official_registry: 'Registro Oficial No. 176 de 29 de diciembre de 2005',
      reform_source_cite: 'Resolución SRI No. NAC-DGER2005-0628 (21/dic/2005)',
      vertical_concepts: []
    }
  ];

  const { data: res5, error: err5 } = await supabase.rpc('ingest_extracted_norm_draft', {
    p_norm_code: 'NAC-DGER2005-0628',
    p_version_title: 'Resolución del SRI No. NAC-DGER2005-0628 (Tabla Impuesto a la Renta 2006 - R.O. 176)',
    p_published_on: '2005-12-29',
    p_model: 'gemini-2.5-flash',
    p_articles: res628Items,
    p_folder_category: '05_resoluciones_sri',
    p_file_name: 'NAC-DGER2005-0628.pdf',
    p_storage_path: 'NAC-DGER2005-0628.pdf'
  });
  if (err5) throw err5;
  console.log(' -> Resolución SRI NAC-DGER2005-0628 ingresada:', JSON.stringify(res5));

  const res628Art1Id = await getStructureIdByCodeAndIdentifier('NAC-DGER2005-0628', '1');
  const { error: err5Ref } = await supabase.rpc('apply_official_registry_reform', {
    p_target_norm_code: 'LRTI',
    p_target_article_identifier: '36',
    p_new_title: null,
    p_new_content: roPayload.reforms_data.art36_v4,
    p_effective_date: '2005-12-29',
    p_valid_until: null,
    p_change_type: 'modified',
    p_reform_source_cite: 'Resolución del SRI No. NAC-DGER2005-0628 (NAC-DGER2005-0628.pdf)',
    p_official_registry_cite: 'Registro Oficial No. 176 de 29 de diciembre de 2005',
    p_summary_change: 'Reforma mediante Resolución del SRI No. NAC-DGER2005-0628 (R.O. 176 de 29/dic/2005): se actualiza la tabla del literal a) del Art. 36 para el ejercicio económico 2006 ($0 a $7.680 exento; exceso hasta $61.440 en adelante con $7.296 de impuesto básico y 25% sobre el excedente).',
    p_modifying_structure_id: res628Art1Id,
    p_source_document_id: res5.document_id,
    p_legal_status: 'vigente_reformado',
    p_normative_tables: [tbl2006]
  });
  if (err5Ref) throw err5Ref;
  console.log(' -> Art. 36 de la LRTI reformado con la tabla 2006 y enlazado a la Resolución NAC-DGER2005-0628.');

  // ---------------------------------------------------------------------------
  // EVENTO 6: 28/mar/2006 — R.O. 238 (Ley No. 2006-34 Especial del Cantón Huaquillas)
  // ---------------------------------------------------------------------------
  console.log('\n[6/7] 2006-03-28 | R.O. 238 -> Ingestando Ley No. 2006-34 (Zona Especial de Huaquillas - Tarifa 0% IVA) y reformando el Art. 55 de la LRTI...');
  const ley34Items = [
    {
      structure_type: 'article',
      identifier: '1',
      title: 'Art. 1.- Creación de la Zona de Tratamiento Especial, Comercial e Industrial para el Cantón Huaquillas',
      parent_title: 'CAPÍTULO I: CREACIÓN Y OBJETIVOS',
      parent_chapter: 'ZONA DE TRATAMIENTO ESPECIAL PARA EL CANTÓN HUAQUILLAS',
      content: 'Créase la Zona de Tratamiento Especial, Comercial e Industrial para el Cantón Huaquillas, en la provincia de El Oro, con el objeto de impulsar la reactivación económica, comercial, productiva y de generación de empleo en la frontera sur del país.',
      ordinal: 1,
      valid_from: '2006-03-28',
      legal_status: 'vigente',
      official_registry: 'Registro Oficial No. 238 de 28 de marzo de 2006',
      reform_source_cite: 'Ley No. 2006-34 (R.O. 238)',
      vertical_concepts: ['EXONERACIONES']
    },
    {
      structure_type: 'article',
      identifier: '5',
      title: 'Art. 5.- Tarifa 0% del Impuesto al Valor Agregado (IVA) y exoneración arancelaria en Huaquillas',
      parent_title: 'CAPÍTULO II: DEL RÉGIMEN TRIBUTARIO Y ADUANERO ESPECIAL',
      parent_chapter: 'TARIFA CERO DE IVA Y BENEFICIOS TRIBUTARIOS',
      content: 'Las importaciones de bienes y mercaderías que realicen los comerciantes e industriales domiciliados en el cantón Huaquillas y registrados en la Cámara de Comercio e Industrias de Huaquillas, destinadas exclusivamente al uso, consumo o comercialización dentro de la jurisdicción del cantón Huaquillas, estarán gravadas con tarifa cero por ciento (0%) del Impuesto al Valor Agregado (IVA) y exoneradas del pago de derechos arancelarios hasta por los cupos anuales establecidos en esta Ley.',
      ordinal: 2,
      valid_from: '2006-03-28',
      legal_status: 'vigente',
      official_registry: 'Registro Oficial No. 238 de 28 de marzo de 2006',
      reform_source_cite: 'Art. 5 de la Ley No. 2006-34 (R.O. 238)',
      vertical_concepts: ['EXONERACIONES', 'TARIFA_CERO_IVA', 'TARIFAS']
    },
    {
      structure_type: 'article',
      identifier: '6',
      title: 'Art. 6.- Exoneración del Impuesto a la Renta por diez años para nuevas inversiones en Huaquillas',
      parent_title: 'CAPÍTULO II: DEL RÉGIMEN TRIBUTARIO Y ADUANERO ESPECIAL',
      parent_chapter: 'TARIFA CERO DE IVA Y BENEFICIOS TRIBUTARIOS',
      content: 'Las nuevas inversiones comerciales, industriales y turísticas que se establezcan en la Zona de Tratamiento Especial del cantón Huaquillas gozarán de la exoneración del pago del Impuesto a la Renta durante los diez (10) primeros años contados desde el inicio de sus actividades productivas.',
      ordinal: 3,
      valid_from: '2006-03-28',
      legal_status: 'vigente',
      official_registry: 'Registro Oficial No. 238 de 28 de marzo de 2006',
      reform_source_cite: 'Ley No. 2006-34 (R.O. 238)',
      vertical_concepts: ['EXONERACIONES']
    },
    {
      structure_type: 'article',
      identifier: '16',
      title: 'Art. 16.- Reformatoria a la Ley Orgánica de Aduanas y a la Ley de Régimen Tributario Interno (Régimen IVA 0% Huaquillas)',
      parent_title: 'CAPÍTULO III: DISPOSICIONES REFORMATORIAS Y VIGENCIA',
      parent_chapter: 'REFORMA A LA LEY DE RÉGIMEN TRIBUTARIO INTERNO',
      content: 'Las disposiciones de la presente Ley Orgánica reforman en lo pertinente a la Ley Orgánica de Aduanas y a la Ley de Régimen Tributario Interno en lo relativo a las transferencias e importaciones gravadas con tarifa cero por ciento (0%) del Impuesto al Valor Agregado (IVA) dentro de la Zona de Tratamiento Especial del cantón Huaquillas, y entrarán en vigencia a partir de su publicación en el Registro Oficial.',
      ordinal: 4,
      valid_from: '2006-03-28',
      legal_status: 'vigente',
      official_registry: 'Registro Oficial No. 238 de 28 de marzo de 2006',
      reform_source_cite: 'Art. 16 de la Ley No. 2006-34 (R.O. 238)',
      vertical_concepts: ['EXONERACIONES', 'TARIFA_CERO_IVA']
    }
  ];

  const { data: res6, error: err6 } = await supabase.rpc('ingest_extracted_norm_draft', {
    p_norm_code: 'LEY-2006-34',
    p_version_title: 'Ley No. 2006-34: Ley que Crea la Zona de Tratamiento Especial para el Cantón Huaquillas (R.O. 238)',
    p_published_on: '2006-03-28',
    p_model: 'gemini-2.5-flash',
    p_articles: ley34Items,
    p_folder_category: '01_codigos',
    p_file_name: 'RO_20060328_238.pdf',
    p_storage_path: 'RO Historico/RO_20060328_238.pdf'
  });
  if (err6) throw err6;
  console.log(' -> Ley No. 2006-34 (Huaquillas) ingresada:', JSON.stringify(res6));

  const ley34Art5Id = await getStructureIdByCodeAndIdentifier('LEY-2006-34', '5');
  const art55Huaquillas = roPayload.reforms_data.art55_base + `\n\nRÉGIMEN ESPECIAL TRANSITORIO CANTÓN HUAQUILLAS (Ley No. 2006-34, R.O. 238 de 28 de marzo de 2006): De conformidad con los artículos 5 y 16 de la Ley Orgánica Reformatoria a la Ley Orgánica de Aduanas y a la Ley de Régimen Tributario Interno que Crea la Zona de Tratamiento Especial, Comercial e Industrial para el Cantón Huaquillas, las importaciones y transferencias de bienes y mercaderías destinadas al uso y comercialización dentro de la jurisdicción del cantón Huaquillas se encuentran gravadas con tarifa cero por ciento (0%) del Impuesto al Valor Agregado (IVA).`;

  const { error: err6Ref } = await supabase.rpc('apply_official_registry_reform', {
    p_target_norm_code: 'LRTI',
    p_target_article_identifier: '55',
    p_new_title: null,
    p_new_content: art55Huaquillas,
    p_effective_date: '2006-03-28',
    p_valid_until: null,
    p_change_type: 'modified',
    p_reform_source_cite: 'Arts. 5 y 16 de la Ley No. 2006-34 (Ley Especial de Huaquillas - R.O. 238)',
    p_official_registry_cite: 'Registro Oficial No. 238 de 28 de marzo de 2006',
    p_summary_change: 'Reforma por la Ley No. 2006-34 (R.O. 238 de 28/mar/2006): se incorpora el régimen de tarifa 0% de IVA para la importación y comercialización de bienes y mercaderías en la Zona de Tratamiento Especial del cantón Huaquillas.',
    p_modifying_structure_id: ley34Art5Id,
    p_source_document_id: res6.document_id,
    p_legal_status: 'vigente_reformado',
    p_normative_tables: null
  });
  if (err6Ref) throw err6Ref;
  console.log(' -> Art. 55 de la LRTI reformado temporalmente por la Ley No. 2006-34 (Huaquillas).');

  // ---------------------------------------------------------------------------
  // EVENTO 7: 09/jun/2006 — Suplemento R.O. 288 (Resolución No. 0003-06-TC)
  // ---------------------------------------------------------------------------
  console.log('\n[7/7] 2006-06-09 | Suplemento R.O. 288 -> Ingestando Resolución No. 0003-06-TC del Tribunal Constitucional y declarando inconstitucional la Ley 2006-34 de Huaquillas...');
  const resTcItems = [
    {
      structure_type: 'article',
      identifier: 'CONSIDERANDOS',
      title: 'Considerandos Constitucionales del Caso No. 0003-06-TC (Iniciativa Privativa Presidencial en Materia Tributaria)',
      parent_title: 'TRIBUNAL CONSTITUCIONAL DEL ECUADOR',
      parent_chapter: 'ANÁLISIS DE CONSTITUCIONALIDAD FORMAL Y MATERIAL',
      content: `EL TRIBUNAL CONSTITUCIONAL

En el caso signado con el Nro. 0003-06-TC

Considerando:

Que el Dr. Alfredo Palacio González, Presidente Constitucional de la República, al amparo de lo dispuesto en el artículo 276 numeral 1 de la Constitución Política de la República, presenta demanda de inconstitucionalidad por la forma y por el fondo en contra de la Ley Nro. 2006-34 denominada "Ley Orgánica Reformatoria a la Ley Orgánica de Aduanas y a la Ley de Régimen Tributario Interno, que Crea la Zona de Tratamiento Especial, Comercial e Industrial para el Cantón Huaquillas", publicada en el Registro Oficial Nro. 238 de 28 de marzo de 2006;

Que de conformidad con el segundo inciso del artículo 147 de la Constitución Política de la República, solamente el Presidente de la República podrá presentar proyectos de ley mediante los cuales se creen, modifiquen o supriman impuestos, aumenten el gasto público o modifiquen la división político-administrativa del país;

Que la Ley Nro. 2006-34 fue tramitada por iniciativa parlamentaria sin contar con la iniciativa privativa del Presidente de la República, estableciendo exoneraciones de Impuesto a la Renta, aranceles y tarifa cero por ciento (0%) de IVA para el cantón Huaquillas, vulnerando además los principios constitucionales de generalidad, igualdad y equidad tributaria consagrados en el artículo 256 de la Constitución Política de la República;`,
      ordinal: 1,
      valid_from: '2006-06-09',
      legal_status: 'vigente',
      official_registry: 'Suplemento del Registro Oficial No. 288 de 9 de junio de 2006',
      reform_source_cite: 'Resolución No. 0003-06-TC (Suplemento R.O. 288)',
      vertical_concepts: ['EXONERACIONES', 'TARIFA_CERO_IVA']
    },
    {
      structure_type: 'article',
      identifier: 'RESUELVE-1',
      title: 'Resolución Numeral 1.- Declaratoria de inconstitucionalidad total por la forma y por el fondo de la Ley No. 2006-34',
      parent_title: 'TRIBUNAL CONSTITUCIONAL DEL ECUADOR',
      parent_chapter: 'PARTE RESOLUTIVA',
      content: `RESUELVE:

1.- Aceptar la demanda formulada por el señor Presidente Constitucional de la República y, en consecuencia, declarar la inconstitucionalidad total, por la forma y por el fondo, de la Ley Nro. 2006-34 denominada "Ley Orgánica Reformatoria a la Ley Orgánica de Aduanas y a la Ley de Régimen Tributario Interno, que Crea la Zona de Tratamiento Especial, Comercial e Industrial para el Cantón Huaquillas", publicada en el Registro Oficial Nro. 238 de 28 de marzo de 2006.

2.- Publicar la presente Resolución en el Registro Oficial.- Notifíquese.`,
      ordinal: 2,
      valid_from: '2006-06-09',
      legal_status: 'vigente',
      official_registry: 'Suplemento del Registro Oficial No. 288 de 9 de junio de 2006',
      reform_source_cite: 'Resolución No. 0003-06-TC (Suplemento R.O. 288)',
      vertical_concepts: ['EXONERACIONES', 'TARIFA_CERO_IVA']
    }
  ];

  const { data: res7, error: err7 } = await supabase.rpc('ingest_extracted_norm_draft', {
    p_norm_code: 'RES-TC-0003-06-TC',
    p_version_title: 'Resolución del Tribunal Constitucional No. 0003-06-TC (Inconstitucionalidad de la Ley 2006-34 de Huaquillas - Suplemento R.O. 288)',
    p_published_on: '2006-06-09',
    p_model: 'gemini-2.5-flash',
    p_articles: resTcItems,
    p_folder_category: '05_resoluciones_sri',
    p_file_name: 'RS1_20060609_288.pdf',
    p_storage_path: 'RO Historico/RS1_20060609_288.pdf'
  });
  if (err7) throw err7;
  console.log(' -> Resolución TC 0003-06-TC ingresada:', JSON.stringify(res7));

  const { data: unconstRes, error: unconstErr } = await supabase.rpc('apply_norm_unconstitutionality', {
    p_target_norm_code: 'LEY-2006-34',
    p_resolution_norm_code: 'RES-TC-0003-06-TC',
    p_effective_date: '2006-06-09',
    p_official_registry: 'Suplemento del Registro Oficial No. 288 de 9 de junio de 2006',
    p_reform_source_cite: 'Resolución No. 0003-06-TC del Tribunal Constitucional',
    p_summary: 'Declarada inconstitucional en su totalidad por la forma y por el fondo mediante Resolución No. 0003-06-TC del Tribunal Constitucional, publicada en el Suplemento del Registro Oficial No. 288 de 9 de junio de 2006 (vigencia efectiva: 28/mar/2006 al 09/jun/2006).'
  });
  if (unconstErr) throw unconstErr;
  console.log(' -> Ley No. 2006-34 marcada como derogada/inconstitucional:', JSON.stringify(unconstRes));

  const resTcId = await getStructureIdByCodeAndIdentifier('RES-TC-0003-06-TC', 'RESUELVE-1');
  const art55Restored = roPayload.reforms_data.art55_base + `\n\nNota Histórica (Cantón Huaquillas): La Ley No. 2006-34 (R.O. 238 de 28 de marzo de 2006), que estableció temporalmente tarifa 0% de IVA para el cantón Huaquillas, fue declarada inconstitucional por la forma y por el fondo mediante Resolución No. 0003-06-TC del Tribunal Constitucional, publicada en el Suplemento del Registro Oficial No. 288 de 9 de junio de 2006, restableciéndose el régimen general del Art. 55 de la LRTI.`;

  const { error: err7Ref } = await supabase.rpc('apply_official_registry_reform', {
    p_target_norm_code: 'LRTI',
    p_target_article_identifier: '55',
    p_new_title: null,
    p_new_content: art55Restored,
    p_effective_date: '2006-06-09',
    p_valid_until: null,
    p_change_type: 'repealed',
    p_reform_source_cite: 'Resolución No. 0003-06-TC del Tribunal Constitucional (Suplemento R.O. 288)',
    p_official_registry_cite: 'Suplemento del Registro Oficial No. 288 de 9 de junio de 2006',
    p_summary_change: 'Expulsión del ordenamiento jurídico del régimen especial de tarifa 0% de IVA para el cantón Huaquillas al declararse la inconstitucionalidad total por la forma y por el fondo de la Ley No. 2006-34 mediante Resolución No. 0003-06-TC del Tribunal Constitucional (Suplemento R.O. 288 de 09/jun/2006).',
    p_modifying_structure_id: resTcId,
    p_source_document_id: res7.document_id,
    p_legal_status: 'vigente_reformado',
    p_normative_tables: null
  });
  if (err7Ref) throw err7Ref;
  console.log(' -> Art. 55 de la LRTI restituido tras la declaratoria de inconstitucionalidad de la Ley 2006-34.');

  console.log('\n=== CARGA CRONOLÓGICA 2004-2006 COMPLETADA CON ÉXITO ===');
}

main().catch(err => {
  console.error('Error durante la carga cronológica:', err);
  process.exit(1);
});
