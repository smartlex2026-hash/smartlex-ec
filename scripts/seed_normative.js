const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
let url = '', key = '';
env.split('\n').forEach(l => {
  if (l.startsWith('VITE_SUPABASE_URL=')) url = l.replace('VITE_SUPABASE_URL=', '').trim();
  if (l.startsWith('VITE_SUPABASE_ANON_KEY=')) key = l.replace('VITE_SUPABASE_ANON_KEY=', '').trim();
});

const supabase = createClient(url, key);

async function seed() {
  console.log('Seeding realistic Ecuadorian normative articles...');

  const ctVersionId = '9166a244-9014-41b4-a716-a3b2f1c0ea65';
  const lrtiVersionId = 'c1bbed0e-3341-46f7-849d-994ff0f10890';
  const rlrtiVersionId = '846c1a1a-ba68-458e-93d6-20e8fd8561f1';

  // Articles to insert
  const articles = [
    {
      norm_version_id: ctVersionId,
      structure_type: 'article',
      identifier: '15',
      title: 'Art. 15.- Concepto de la Obligación Tributaria',
      content: 'Obligación tributaria es el vínculo jurídico personal, existente entre el Estado o las entidades acreedoras de tributos y los contribuyentes o responsables de aquellos, en virtud del cual debe satisfacerse una prestación en dinero, especies o servicios apreciables en dinero, al verificarse el hecho generador previsto por la ley.',
      ordinal: 15,
      is_current: true,
      legal_status: 'vigente',
      review_status: 'approved'
    },
    {
      norm_version_id: ctVersionId,
      structure_type: 'article',
      identifier: '16',
      title: 'Art. 16.- Hecho Generador',
      content: 'Se entiende por hecho generador al presupuesto establecido por la ley para configurar cada tributo. El hecho generador se considera ocurrido y produce sus efectos desde el momento en que se hayan realizado las circunstancias materiales o jurídicas necesarias para que surta los efectos que ordinariamente le corresponden.',
      ordinal: 16,
      is_current: true,
      legal_status: 'vigente',
      review_status: 'approved'
    },
    {
      norm_version_id: ctVersionId,
      structure_type: 'article',
      identifier: '24',
      title: 'Art. 24.- Sujeto Pasivo y Agentes de Retención',
      content: 'Es sujeto pasivo la persona natural o jurídica que, según la ley, está obligada al cumplimiento de la prestación tributaria, sea como contribuyente o como responsable. Son agentes de retención las personas naturales o jurídicas que, en razón de su actividad o empleo, se hallen en posibilidad de retener tributos y entregarlos al sujeto activo.',
      ordinal: 24,
      is_current: true,
      legal_status: 'vigente',
      review_status: 'approved'
    },
    {
      norm_version_id: ctVersionId,
      structure_type: 'article',
      identifier: '88',
      title: 'Art. 88.- Facultades de la Administración Tributaria',
      content: 'La administración tributaria ejercerá las facultades determinadora, resolutiva, sancionadora y recaudadora, en la forma y condiciones que prescriban las leyes respectivas.',
      ordinal: 88,
      is_current: true,
      legal_status: 'vigente_reformado',
      review_status: 'approved'
    },
    {
      norm_version_id: lrtiVersionId,
      structure_type: 'article',
      identifier: '8',
      title: 'Art. 8.- Ingresos de Fuente Ecuatoriana',
      content: 'Se considerarán de fuente ecuatoriana los siguientes ingresos: 1. Los que perciban los ecuatorianos y extranjeros por actividades laborales, profesionales, comerciales, industriales, agropecuarias, mineras, de servicios y otras de carácter económico realizadas en territorio ecuatoriano; 2. Las utilidades y dividendos distribuidos por sociedades constituidas o establecidas en el país; 3. Los beneficios o regalías provenientes de bienes muebles o inmuebles situados en el Ecuador.',
      ordinal: 8,
      is_current: true,
      legal_status: 'vigente',
      review_status: 'approved'
    },
    {
      norm_version_id: lrtiVersionId,
      structure_type: 'article',
      identifier: '13',
      title: 'Art. 13.- Pagos y Gastos en el Exterior',
      content: 'Son deducibles los pagos efectuados al exterior que sean necesarios para generar ingresos gravados, siempre que se haya practicado la retención en la fuente del Impuesto a la Renta de conformidad con los convenios para evitar la doble imposición y la normativa interna.',
      ordinal: 13,
      is_current: true,
      legal_status: 'vigente',
      review_status: 'approved'
    },
    {
      norm_version_id: lrtiVersionId,
      structure_type: 'article',
      identifier: '15',
      title: 'Art. 15.- Precios de Transferencia y Partes Relacionadas',
      content: 'Los sujetos pasivos del Impuesto a la Renta que celebren operaciones con partes relacionadas están obligados a determinar sus ingresos, costos y deducciones considerando para esas operaciones los precios o montos de contraprestaciones que hubieran utilizado partes independientes en operaciones comparables (principio de plena competencia). Deberán presentar el Anexo de Operaciones con Partes Relacionadas e Informe Integral según los montos acumulados establecidos por el SRI.',
      ordinal: 15,
      is_current: true,
      legal_status: 'vigente',
      review_status: 'approved'
    },
    {
      norm_version_id: lrtiVersionId,
      structure_type: 'article',
      identifier: '52',
      title: 'Art. 52.- Objeto del Impuesto al Valor Agregado (IVA)',
      content: 'Establécese el Impuesto al Valor Agregado (IVA), que grava al valor de la transferencia de dominio o a la importación de bienes muebles de naturaleza corporal, en todas sus etapas de comercialización, así como a los derechos de autor, de propiedad industrial y derechos conexos; y al valor de los servicios prestados, en la forma y en las condiciones que prevé esta Ley.',
      ordinal: 52,
      is_current: true,
      legal_status: 'vigente',
      review_status: 'approved'
    },
    {
      norm_version_id: lrtiVersionId,
      structure_type: 'article',
      identifier: '65',
      title: 'Art. 65.- Crédito Tributario por Adquisiciones de Bienes y Servicios (IVA)',
      content: 'El uso del crédito tributario se sujetará a las siguientes normas: 1. Los sujetos pasivos del impuesto al valor agregado que se dediquen a la producción o comercialización de bienes o a la prestación de servicios gravados con la tarifa general del IVA, tendrán derecho a crédito tributario por la totalidad del IVA pagado en las adquisiciones locales o importaciones de bienes y servicios vinculados con su actividad económica gravada.',
      ordinal: 65,
      is_current: true,
      legal_status: 'vigente_reformado',
      review_status: 'approved'
    },
    {
      norm_version_id: rlrtiVersionId,
      structure_type: 'article',
      identifier: '158',
      title: 'Art. 158 RLRTI.- Agentes de Retención del Impuesto al Valor Agregado',
      content: 'Son agentes de retención del IVA los calificados como tales por el Servicio de Rentas Internas, las entidades del sector público, las empresas emisoras de tarjetas de crédito y débito, y los designados como Grandes Contribuyentes. La retención se efectuará en los porcentajes del 30% en bienes, 70% en servicios y 100% en honorarios profesionales o liquidaciones de compras.',
      ordinal: 158,
      is_current: true,
      legal_status: 'vigente',
      review_status: 'approved'
    }
  ];

  for (const art of articles) {
    const { data: existing } = await supabase
      .from('normative_structures')
      .select('id')
      .eq('norm_version_id', art.norm_version_id)
      .eq('identifier', art.identifier)
      .limit(1);

    if (existing && existing.length > 0) {
      await supabase.from('normative_structures').update(art).eq('id', existing[0].id);
      console.log('Updated:', art.title);
    } else {
      await supabase.from('normative_structures').insert(art);
      console.log('Inserted:', art.title);
    }
  }

  // Also link concepts, forms, annexes
  console.log('Done seeding articles.');
}

seed().catch(console.error);
