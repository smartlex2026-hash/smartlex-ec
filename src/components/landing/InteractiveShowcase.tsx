import React, { useState } from 'react';
import {
  Layers,
  History,
  Calculator,
  CheckCircle2,
  Sparkles,
  ChevronRight
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
    reglamento: 'Art. 73 RALRTI: Procedimiento para la liquidación de la base imponible y actualización anual INEC',
    reformas: [
      { anio: '2009', norma: 'Ley Orgánica Reformatoria R.O. 392 + Resolución NAC-DGER2008-1467' },
      { anio: '2008', norma: 'Ley Reformatoria para la Equidad Tributaria del Ecuador (R.O. 242)' },
      { anio: '2004', norma: 'Codificación 2004-026 de la Ley de Régimen Tributario Interno (R.O. 463)' }
    ],
    calculadora: 'Calculadora Progresiva IR y Herencias con serie histórica de tablas oficiales'
  },
  {
    id: 'lrti-97-1',
    code: 'Art. 97.6',
    law: 'Ley de Régimen Tributario Interno (LRTI)',
    title: 'Categorías y Tablas del Régimen Impositivo Simplificado (RISE)',
    status: 'vigente_reformado',
    excerpt:
      'Se establece el régimen simplificado de inscripción voluntaria que reemplaza el pago del IVA y del Impuesto a la Renta a través de cuotas mensuales determinadas por actividad económica e ingresos anuales...',
    reglamento: 'Reglamento de Aplicación LRTI: Deberes formales y tablas de cuotas por categoría',
    reformas: [
      { anio: '2008', norma: 'Fe de Erratas R.O. 308 y Ley de Equidad Tributaria R.O. 242' }
    ],
    calculadora: 'Simulador de Cuotas por Actividad Económica y Tramos de Ingresos'
  },
  {
    id: 'ct-11',
    code: 'Art. 11',
    law: 'Código Tributario del Ecuador',
    title: 'Vigencia de la Ley Tributaria en el Tiempo',
    status: 'vigente',
    excerpt:
      'Las leyes tributarias, sus reglamentos y las circulares de carácter general regirán en todo el territorio nacional, y cuando se refieran a tributos cuya determinación o liquidación deba realizarse por períodos anuales, se aplicarán desde el primer día del siguiente año calendario...',
    reglamento: 'Norma rectora de vigencia automática aplicada al motor temporal de SmartLex',
    reformas: [{ anio: 'Vigente', norma: 'Codificación 2005-09 del Código Tributario (R.O. Suplemento 38)' }],
    calculadora: 'Motor de Vigencia Cronológica (Impuestos Anuales vs. Impuestos Mensuales)'
  }
];

interface InteractiveShowcaseProps {
  isDark: boolean;
}

export const InteractiveShowcase: React.FC<InteractiveShowcaseProps> = ({ isDark }) => {
  const [selectedExample, setSelectedExample] = useState<ShowcaseExample>(EXAMPLES[0]);

  return (
    <section id="integracion" className="py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Título de la sección */}
      <div className="text-center max-w-3xl mx-auto mb-12">
        <div
          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold uppercase tracking-wider mb-3 ${
            isDark
              ? 'bg-[#151518] border-[#26262b] text-[#d4d4d8]'
              : 'bg-white border-[#d4d4d8] text-[#3f3f46]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Demostración de Integración Normativa
        </div>
        <h2
          className={`text-3xl sm:text-5xl font-extrabold tracking-tight font-heading ${
            isDark ? 'text-[#f4f4f5]' : 'text-[#09090b]'
          }`}
        >
          Así funciona la integración legal en SmartLex
        </h2>
        <p className={`mt-4 text-base sm:text-lg font-normal ${isDark ? 'text-[#a1a1aa]' : 'text-[#52525b]'}`}>
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
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 border ${
                isSelected
                  ? isDark
                    ? 'bg-[#f4f4f5] text-[#0d0d0f] border-[#f4f4f5] shadow-md'
                    : 'bg-[#18181b] text-white border-[#18181b] shadow-md'
                  : isDark
                    ? 'bg-[#151518] text-[#a1a1aa] border-[#26262b] hover:border-[#3f3f46] hover:text-[#f4f4f5]'
                    : 'bg-white text-[#52525b] border-[#d4d4d8] hover:border-[#a1a1aa] hover:text-[#09090b]'
              }`}
            >
              <span>{ex.code}</span>
              <span className="text-xs opacity-75 font-normal">
                ({ex.law.split('(')[1]?.replace(')', '') || 'CT'})
              </span>
            </button>
          );
        })}
      </div>

      {/* Ventana de simulación minimalista */}
      <div
        className={`rounded-3xl border p-6 sm:p-8 lg:p-10 shadow-xl relative overflow-hidden transition-colors ${
          isDark ? 'border-[#26262b] bg-[#121215]' : 'border-[#e4e4e7] bg-white'
        }`}
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative z-10">
          {/* Panel Izquierdo: El Artículo Legal Activo (6 cols) */}
          <div
            className={`lg:col-span-6 rounded-2xl border p-6 space-y-4 ${
              isDark ? 'border-[#26262b] bg-[#151518]' : 'border-[#e4e4e7] bg-[#fafafa]'
            }`}
          >
            <div
              className={`flex items-center justify-between gap-3 border-b pb-3 ${
                isDark ? 'border-[#26262b]' : 'border-[#e4e4e7]'
              }`}
            >
              <div>
                <span
                  className={`text-xs font-bold uppercase tracking-wider ${
                    isDark ? 'text-[#a1a1aa]' : 'text-[#52525b]'
                  }`}
                >
                  {selectedExample.law}
                </span>
                <h3
                  className={`text-xl font-bold mt-0.5 ${
                    isDark ? 'text-[#f4f4f5]' : 'text-[#09090b]'
                  }`}
                >
                  {selectedExample.code}
                </h3>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border ${
                  isDark
                    ? 'bg-[#1c1c21] text-[#e4e4e7] border-[#2e2e36]'
                    : 'bg-white text-[#18181b] border-[#d4d4d8]'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {selectedExample.status === 'vigente_reformado' ? 'Vigente · Reformado' : 'Vigente'}
              </span>
            </div>

            <h4 className={`text-sm font-semibold ${isDark ? 'text-[#e4e4e7]' : 'text-[#18181b]'}`}>
              {selectedExample.title}
            </h4>

            <p
              className={`text-sm leading-relaxed p-4 rounded-xl border italic font-serif ${
                isDark
                  ? 'text-[#d4d4d8] bg-[#0d0d0f] border-[#26262b]'
                  : 'text-[#3f3f46] bg-white border-[#e4e4e7]'
              }`}
            >
              «{selectedExample.excerpt}»
            </p>

            <div
              className={`flex items-center justify-between text-xs pt-2 border-t ${
                isDark ? 'text-[#a1a1aa] border-[#26262b]' : 'text-[#52525b] border-[#e4e4e7]'
              }`}
            >
              <span className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                Integrado en la biblioteca jerárquica
              </span>
              <span
                className={`font-semibold flex items-center gap-0.5 ${
                  isDark ? 'text-[#f4f4f5]' : 'text-[#09090b]'
                }`}
              >
                Desplegable por hojas <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          </div>

          {/* Panel Derecho: Bloques de Integración Normativa (6 cols) */}
          <div className="lg:col-span-6 space-y-4">
            <div
              className={`text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${
                isDark ? 'text-[#a1a1aa]' : 'text-[#52525b]'
              }`}
            >
              <Layers className="w-4 h-4" />
              Ecosistema Normativo Vinculado
            </div>

            {/* Nodo 1: Reglamento Aplicable */}
            <div
              className={`rounded-2xl border p-4 transition-all ${
                isDark
                  ? 'border-[#26262b] bg-[#151518] hover:border-[#3f3f46]'
                  : 'border-[#e4e4e7] bg-[#fafafa] hover:border-[#a1a1aa]'
              }`}
            >
              <div
                className={`flex items-center gap-2 text-xs font-bold mb-1 ${
                  isDark ? 'text-[#e4e4e7]' : 'text-[#18181b]'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${isDark ? 'bg-[#f4f4f5]' : 'bg-[#18181b]'}`} />
                Jerarquía 1 · Reglamento Aplicable (Con su propio histórico ⏳)
              </div>
              <p className={`text-sm font-medium ${isDark ? 'text-[#a1a1aa]' : 'text-[#52525b]'}`}>
                {selectedExample.reglamento}
              </p>
            </div>

            {/* Nodo 2: Historial de Reformas */}
            <div
              className={`rounded-2xl border p-4 transition-all ${
                isDark
                  ? 'border-[#26262b] bg-[#151518] hover:border-[#3f3f46]'
                  : 'border-[#e4e4e7] bg-[#fafafa] hover:border-[#a1a1aa]'
              }`}
            >
              <div
                className={`flex items-center gap-2 text-xs font-bold mb-1 ${
                  isDark ? 'text-[#e4e4e7]' : 'text-[#18181b]'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                Línea del Tiempo con Barra de Desplazamiento Horizontal
              </div>
              <div className="space-y-1.5 mt-2">
                {selectedExample.reformas.map((ref, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between text-xs px-3 py-1.5 rounded-lg border ${
                      isDark
                        ? 'text-[#d4d4d8] bg-[#0d0d0f] border-[#26262b]'
                        : 'text-[#3f3f46] bg-white border-[#e4e4e7]'
                    }`}
                  >
                    <span className="font-bold">{ref.anio}</span>
                    <span className="truncate max-w-[280px] sm:max-w-none text-right">
                      {ref.norma}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Nodo 3: Calculadora Vinculada */}
            <div
              className={`rounded-2xl border p-4 transition-all ${
                isDark
                  ? 'border-[#26262b] bg-[#151518] hover:border-[#3f3f46]'
                  : 'border-[#e4e4e7] bg-[#fafafa] hover:border-[#a1a1aa]'
              }`}
            >
              <div
                className={`flex items-center gap-2 text-xs font-bold mb-1 ${
                  isDark ? 'text-[#e4e4e7]' : 'text-[#18181b]'
                }`}
              >
                <Calculator className="w-3.5 h-3.5" />
                Calculadora Fiscal y Tablas Oficiales
              </div>
              <p className={`text-sm font-medium ${isDark ? 'text-[#a1a1aa]' : 'text-[#52525b]'}`}>
                {selectedExample.calculadora}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
