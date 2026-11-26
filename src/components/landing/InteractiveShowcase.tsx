import React, { useState } from 'react';
import {
  Layers,
  History,
  Calculator,
  CheckCircle2,
  BookOpen,
  ChevronRight
} from 'lucide-react';
import { RevealOnScroll } from './RevealOnScroll';

interface ShowcaseExample {
  id: string;
  code: string;
  shortLaw: string;
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
    shortLaw: 'LRTI',
    law: 'Ley de Régimen Tributario Interno (LRTI)',
    title: 'Tarifa de Impuesto a la Renta de Personas Naturales y Sucesiones Indivisas',
    status: 'vigente_reformado',
    excerpt:
      'Los ingresos gravados de las personas naturales se sujetarán a la tabla progresiva por tramos de renta computable, aplicándose la tarifa marginal y la rebaja por gastos personales según las cargas familiares...',
    reglamento: 'Art. 73 RLRTI: Liquidación de base imponible, tramos progresivos y rebaja de gastos personales',
    reformas: [
      { anio: 'R.O. 392', norma: 'Ley Orgánica Reformatoria + Resolución NAC-DGER2008-1467' },
      { anio: 'R.O. 242', norma: 'Ley Reformatoria para la Equidad Tributaria del Ecuador' },
      { anio: 'R.O. 463', norma: 'Codificación 2004-026 de la Ley de Régimen Tributario Interno' }
    ],
    calculadora: 'Calculadora IR PN + Rebaja Gastos Personales y Tabla Art. 36'
  },
  {
    id: 'lrti-97-6',
    code: 'Art. 97.6',
    shortLaw: 'LRTI',
    law: 'Ley de Régimen Tributario Interno (LRTI)',
    title: 'Régimen Simplificado para Emprendedores y Negocios Populares (RIMPE)',
    status: 'vigente_reformado',
    excerpt:
      'Establece los tramos de ingresos brutos anuales para calificar como Negocio Popular (hasta USD 20.000) o Emprendedor (hasta USD 300.000) y el impuesto marginal aplicable sobre el excedente...',
    reglamento: 'Reglamento de Aplicación LRTI: Deberes formales y parámetros del régimen RIMPE',
    reformas: [
      { anio: 'R.O. 308', norma: 'Fe de Erratas y ajustes sobre la base del régimen simplificado' },
      { anio: 'R.O. 242', norma: 'Ley Reformatoria para la Equidad Tributaria del Ecuador' }
    ],
    calculadora: 'Calculadora RIMPE Emprendedor y Negocio Popular + Tabla RIMPE'
  },
  {
    id: 'ct-11',
    code: 'Art. 11',
    shortLaw: 'CT',
    law: 'Código Tributario del Ecuador',
    title: 'Vigencia de la Ley Tributaria en el Tiempo',
    status: 'vigente',
    excerpt:
      'Las leyes tributarias, sus reglamentos y las circulares de carácter general regirán en todo el territorio nacional; cuando se refieran a tributos de determinación anual se aplicarán desde el primer día del siguiente año calendario...',
    reglamento: 'Regla general de vigencia temporal en el lector cronológico de SmartLex',
    reformas: [
      { anio: 'Vigente', norma: 'Codificación 2005-09 del Código Tributario (R.O. Suplemento 38)' }
    ],
    calculadora: 'Motor de vigencia cronológica por período anual y mensual'
  }
];

interface InteractiveShowcaseProps {
  isDark: boolean;
}

export const InteractiveShowcase: React.FC<InteractiveShowcaseProps> = () => {
  const [selectedExample, setSelectedExample] = useState<ShowcaseExample>(EXAMPLES[0]);

  return (
    <section
      id="integracion"
      className="scroll-mt-20 py-14 md:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
    >
      <RevealOnScroll>
        {/* Cabecera alineada a la izquierda + selector segmentado */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-8">
          <div className="max-w-2xl text-left">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-secundario)] mb-2">
              Demostración de integración normativa
            </p>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight font-heading text-[var(--color-texto)]">
              Así se consulta un artículo en SmartLex
            </h2>
            <p className="mt-3 text-sm sm:text-base text-[var(--color-texto-secundario)]">
              Selecciona uno de estos artículos reales para ver cómo conectamos la ley vigente con su reglamento, sus reformas históricas y las calculadoras del SRI.
            </p>
          </div>

          {/* Control segmentado */}
          <div
            role="tablist"
            aria-label="Artículos de ejemplo"
            className="inline-flex flex-wrap sm:flex-nowrap items-center gap-1 p-1 rounded-lg border border-[var(--color-borde)] bg-[var(--color-superficie-secundaria)] self-start lg:self-auto"
          >
            {EXAMPLES.map(ex => {
              const isSelected = selectedExample.id === ex.id;
              return (
                <button
                  key={ex.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setSelectedExample(ex)}
                  className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? 'bg-[var(--color-secundario)] text-[var(--color-texto-sobre-secundario)] shadow-xs'
                      : 'text-[var(--color-texto-secundario)] hover:text-[var(--color-texto)] hover:bg-[var(--color-superficie)]'
                  }`}
                >
                  {ex.code} {ex.shortLaw}
                </button>
              );
            })}
          </div>
        </div>

        {/* Contenedor maestro-detalle */}
        <div className="rounded-2xl border border-[var(--color-borde)] bg-[var(--color-superficie)] overflow-hidden grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[var(--color-borde)] shadow-sm text-left">
          {/* Panel Izquierdo: Artículo Legal Activo */}
          <div
            key={`left-${selectedExample.id}`}
            className="sl-tab-fade lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between gap-6"
          >
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--color-borde)] pb-4">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-texto-secundario)]">
                    {selectedExample.law}
                  </span>
                  <h3 className="text-xl sm:text-2xl font-bold mt-1 text-[var(--color-texto)] font-heading font-mono">
                    {selectedExample.code}
                  </h3>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 border bg-[var(--color-exito-fondo)] text-[var(--color-exito-texto)] border-[var(--color-exito-borde)]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{selectedExample.status === 'vigente_reformado' ? 'Vigente · Reformado' : 'Vigente'}</span>
                </span>
              </div>

              <h4 className="text-base sm:text-lg font-bold text-[var(--color-texto)]">
                {selectedExample.title}
              </h4>

              <blockquote className="border-l-2 border-[var(--color-secundario)] pl-4 py-1 text-sm sm:text-base leading-relaxed text-[var(--color-texto)]">
                «{selectedExample.excerpt}»
              </blockquote>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-4 border-t border-[var(--color-borde)] text-[var(--color-texto-secundario)]">
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-[var(--color-secundario)]" />
                <span>Lector con índice y hojas desplegables</span>
              </span>
              <span className="font-semibold flex items-center gap-1 text-[var(--color-secundario)]">
                <span>Evolución temporal y normativa conexa</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>

          {/* Panel Derecho: Normativa y herramientas enlazadas */}
          <div
            key={`right-${selectedExample.id}`}
            className="sl-tab-fade lg:col-span-5 p-6 sm:p-8 bg-[var(--color-fondo)] space-y-4"
          >
            <div className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-[var(--color-texto-secundario)]">
              <Layers className="w-4 h-4 text-[var(--color-secundario)]" />
              <span>Normativa y herramientas enlazadas</span>
            </div>

            {/* Nodo 1: Reglamento aplicable */}
            <div className="rounded-xl bg-[var(--color-superficie)] border border-[var(--color-borde)] p-4 space-y-1.5 transition-colors duration-200 hover:border-[var(--color-borde-fuerte)]">
              <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-texto)]">
                <span className="w-2 h-2 rounded-full bg-[var(--color-secundario)] shrink-0" />
                <span>Normativa conexa en cascada</span>
              </div>
              <p className="text-xs sm:text-sm text-[var(--color-texto-secundario)] leading-relaxed">
                {selectedExample.reglamento}
              </p>
            </div>

            {/* Nodo 2: Historial de reformas en R.O. */}
            <div className="rounded-xl bg-[var(--color-superficie)] border border-[var(--color-borde)] p-4 space-y-2.5 transition-colors duration-200 hover:border-[var(--color-borde-fuerte)]">
              <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-texto)]">
                <History className="w-3.5 h-3.5 text-[var(--color-secundario)] shrink-0" />
                <span>Evolución histórica en Registro Oficial</span>
              </div>
              <div className="space-y-1.5">
                {selectedExample.reformas.map((ref, idx) => (
                  <div
                    key={idx}
                    className="flex items-start justify-between gap-3 text-xs px-3 py-2 rounded-lg border border-[var(--color-borde)] bg-[var(--color-fondo)]"
                  >
                    <span className="font-mono font-bold text-[var(--color-secundario)] shrink-0">
                      {ref.anio}
                    </span>
                    <span className="text-right text-[var(--color-texto-secundario)] leading-snug">
                      {ref.norma}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Nodo 3: Calculadora vinculada */}
            <div className="rounded-xl bg-[var(--color-superficie)] border border-[var(--color-borde)] p-4 space-y-1.5 transition-colors duration-200 hover:border-[var(--color-borde-fuerte)]">
              <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-texto)]">
                <Calculator className="w-3.5 h-3.5 text-[var(--color-secundario)] shrink-0" />
                <span>Tabla y calculadora vinculada</span>
              </div>
              <p className="text-xs sm:text-sm text-[var(--color-texto-secundario)] leading-relaxed">
                {selectedExample.calculadora}
              </p>
            </div>
          </div>
        </div>
      </RevealOnScroll>
    </section>
  );
};
