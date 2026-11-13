import React, { useState } from 'react';
import {
  Layers,
  History,
  Calculator,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  BookMarked
} from 'lucide-react';

interface ShowcaseExample {
  id: string;
  code: string;
  law: string;
  title: string;
  status: 'vigente' | 'vigente_reformado';
  excerpt: string;
  reglamento: string;
  reformas: Array<{ anio: string; norma: string }>;
  calculadora: string;
}

const EXAMPLES: ShowcaseExample[] = [
  {
    id: 'lrti-36',
    code: 'Art. 36',
    law: 'Ley de Régimen Tributario Interno (LRTI)',
    title: 'Tarifa de Impuesto a la Renta de Personas Naturales y Sucesiones Indivisas',
    status: 'vigente_reformado',
    excerpt:
      'Los ingresos gravados de las personas naturales se sujetarán a la tabla progresiva por tramos de renta computable, aplicándose la tarifa marginal y la rebaja por gastos personales calculada sobre la canasta básica familiar...',
    reglamento: 'Art. 89 RLRTI: Procedimiento para la liquidación del anticipo y cómputo de rebaja',
    reformas: [
      { anio: '2024', norma: 'Ley Orgánica para Enfrentar el Conflicto Armado Interno (R.O. 518)' },
      { anio: '2023', norma: 'Ley de Eficiencia Económica y Generación de Empleo (R.O. 461)' },
      { anio: '2021', norma: 'Ley de Desarrollo Económico y Sostenibilidad Fiscal (R.O. 588)' }
    ],
    calculadora: 'Calculadora Progresiva IR 2026 con ajuste automático de Canasta Básica'
  },
  {
    id: 'lrti-97-1',
    code: 'Art. 97.1',
    law: 'Ley de Régimen Tributario Interno (LRTI)',
    title: 'Régimen Simplificado para Emprendedores y Negocios Populares (RIMPE)',
    status: 'vigente_reformado',
    excerpt:
      'Se establece el régimen simplificado para emprendedores y negocios populares (RIMPE) que comprende a las personas naturales y jurídicas con ingresos brutos anuales de hasta trescientos mil dólares de los Estados Unidos de América...',
    reglamento: 'Art. 217.1 RLRTI: Exclusiones expresas y deberes formales del contribuyente RIMPE',
    reformas: [
      { anio: '2023', norma: 'Ley Orgánica para el Fortalecimiento de la Economía Familiar (R.O. 335)' },
      { anio: '2021', norma: 'Creación del Régimen RIMPE mediante Ley R.O. 588' }
    ],
    calculadora: 'Simulador RIMPE Negocio Popular ($60 cuota) vs RIMPE Emprendedor (Tabla)'
  },
  {
    id: 'ct-15',
    code: 'Art. 15',
    law: 'Código Tributario del Ecuador',
    title: 'Concepto de Tributo y Clasificación',
    status: 'vigente',
    excerpt:
      'Tributos son los impuestos, las tasas y las contribuciones especiales de mejoras que el Estado o las entidades de derecho público con potestad tributaria imponen en virtud de su poder de imperio...',
    reglamento: 'Norma jerárquica superior: Constitución de la República del Ecuador (Art. 300 y 301)',
    reformas: [{ anio: 'Vigente', norma: 'Codificación oficial sin reformas derogatorias directas' }],
    calculadora: 'Matriz Conceptual de Principios de Legalidad y Capacidad Contributiva'
  }
];

export const InteractiveShowcase: React.FC = () => {
  const [selectedExample, setSelectedExample] = useState<ShowcaseExample>(EXAMPLES[0]);

  return (
    <section id="integracion" className="py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Título de la sección */}
      <div className="text-center max-w-3xl mx-auto mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#3ECF8E]/10 border border-[#3ECF8E]/30 text-[#3ECF8E] text-xs font-semibold uppercase tracking-wider mb-3">
          <Layers className="w-3.5 h-3.5" />
          Demostración de Integración Normativa
        </div>
        <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight font-heading">
          Así funciona la{' '}
          <span className="bg-gradient-to-r from-[#3ECF8E] via-teal-200 to-purple-400 bg-clip-text text-transparent">
            integración legal en SmartLex
          </span>
        </h2>
        <p className="mt-4 text-base sm:text-lg text-slate-300 font-normal">
          Selecciona un artículo y observa cómo el sistema enlaza al instante la ley con sus reglamentos, el historial de
          reformas del Registro Oficial y las calculadoras correspondientes.
        </p>
      </div>

      {/* Selector de artículos de muestra */}
      <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
        {EXAMPLES.map(ex => {
          const isSelected = selectedExample.id === ex.id;
          return (
            <button
              key={ex.id}
              onClick={() => setSelectedExample(ex)}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                isSelected
                  ? 'bg-[#3ECF8E] text-[#0C0D14] shadow-[0_0_20px_rgba(62,207,142,0.4)] border border-[#3ECF8E]'
                  : 'bg-white/[0.04] text-slate-300 border border-white/10 hover:border-white/20 hover:text-white'
              }`}
            >
              <span>{ex.code}</span>
              <span className="text-xs opacity-75 font-normal">({ex.law.split('(')[1]?.replace(')', '') || 'Cód.'})</span>
            </button>
          );
        })}
      </div>

      {/* Ventana de simulación estilo Supabase / Consola moderna */}
      <div className="rounded-3xl border border-white/10 bg-[#10121A]/90 backdrop-blur-2xl p-6 sm:p-8 lg:p-10 shadow-2xl relative overflow-hidden">
        {/* Luces sutiles de fondo */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#3ECF8E]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative z-10">
          {/* Panel Izquierdo: El Artículo Legal Activo (6 cols) */}
          <div className="lg:col-span-6 rounded-2xl border border-white/10 bg-[#0C0D14]/80 p-6 space-y-4">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div>
                <span className="text-xs font-bold text-[#3ECF8E] uppercase tracking-wider">{selectedExample.law}</span>
                <h3 className="text-xl font-bold text-white mt-0.5">{selectedExample.code}</h3>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                  selectedExample.status === 'vigente_reformado'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-emerald-500/20 text-[#3ECF8E] border border-[#3ECF8E]/40'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {selectedExample.status === 'vigente_reformado' ? 'Vigente Reformado' : 'Vigente'}
              </span>
            </div>

            <h4 className="text-sm font-semibold text-slate-200">{selectedExample.title}</h4>

            <p className="text-sm text-slate-300 leading-relaxed bg-white/[0.03] p-4 rounded-xl border border-white/5 italic font-serif">
              «{selectedExample.excerpt}»
            </p>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-white/5">
              <span className="flex items-center gap-1 text-slate-400">
                <Sparkles className="w-3.5 h-3.5 text-[#3ECF8E]" />
                Integrado en la matriz normativa
              </span>
              <span className="text-[#3ECF8E] font-semibold cursor-pointer hover:underline flex items-center gap-0.5">
                Leer artículo completo <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          </div>

          {/* Panel Derecho: Bloques de Integración Normativa (6 cols) */}
          <div className="lg:col-span-6 space-y-4">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#3ECF8E]" />
              Ecosistema Normativo Vinculado
            </div>

            {/* Nodo 1: Reglamento Aplicable */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 hover:border-[#3ECF8E]/40 transition-all">
              <div className="flex items-center gap-2 text-xs font-bold text-[#3ECF8E] mb-1">
                <span className="w-2 h-2 rounded-full bg-[#3ECF8E]" />
                📘 Reglamento Aplicable (Norma Secundaria)
              </div>
              <p className="text-sm font-medium text-slate-200">{selectedExample.reglamento}</p>
            </div>

            {/* Nodo 2: Historial de Reformas */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 hover:border-amber-500/40 transition-all">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-300 mb-1">
                <History className="w-3.5 h-3.5 text-amber-400" />
                ⏳ Trazabilidad de Reformas en el Registro Oficial
              </div>
              <div className="space-y-1.5 mt-2">
                {selectedExample.reformas.map((ref, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-xs text-slate-300 bg-[#0C0D14]/80 px-3 py-1.5 rounded-lg border border-white/5"
                  >
                    <span className="font-semibold text-amber-200">{ref.anio}</span>
                    <span className="truncate max-w-[280px] sm:max-w-none text-right text-slate-300">{ref.norma}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Nodo 3: Calculadora Vinculada */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 hover:border-purple-500/40 transition-all">
              <div className="flex items-center gap-2 text-xs font-bold text-purple-300 mb-1">
                <Calculator className="w-3.5 h-3.5 text-purple-400" />
                🧮 Calculadora Fiscal Automatizada
              </div>
              <p className="text-sm font-medium text-slate-200">{selectedExample.calculadora}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
