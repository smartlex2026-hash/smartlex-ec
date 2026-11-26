import React from 'react';
import { Check, MessageCircle, Zap, Crown, HelpCircle, ArrowRight } from 'lucide-react';
import { RevealOnScroll } from './RevealOnScroll';

interface PricingTableProps {
  onSelectPlan: (planCode: 'free' | 'premium' | 'professional') => void;
  isDark: boolean;
}

export const PricingTable: React.FC<PricingTableProps> = ({ onSelectPlan }) => {
  return (
    <section
      id="planes"
      className="scroll-mt-20 py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
    >
      {/* Cabecera de la sección */}
      <RevealOnScroll>
        <div className="max-w-2xl mb-12 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--color-secundario-borde)] bg-[var(--color-secundario-suave)] text-[var(--color-exito-texto)] text-xs font-semibold mb-3">
            <span>Oferta promocional por lanzamiento</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight font-heading text-[var(--color-texto)]">
            Planes adaptados a tu ejercicio profesional
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[var(--color-texto-secundario)]">
            Empieza gratis con las normas troncales vigentes o elige un plan superior para acceder a reformas históricas, tablas oficiales, calculadoras del SRI y asistente IA.
          </p>
        </div>
      </RevealOnScroll>

      {/* Rejilla de 3 columnas de igual altura */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch text-left">
        {/* 1. PLAN FREE */}
        <RevealOnScroll delayMs={0} className="h-full">
          <div className="sl-card-interactive h-full rounded-2xl border border-[var(--color-borde)] bg-[var(--color-superficie)] p-6 sm:p-8 flex flex-col justify-between overflow-hidden shadow-xs">
            <div>
              <div className="flex items-center justify-between gap-3 mb-4">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full border border-[var(--color-borde)] bg-[var(--color-fondo)] text-[var(--color-texto-secundario)]">
                  Asistentes y Aprendices
                </span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full border border-[var(--color-secundario-borde)] bg-[var(--color-secundario-suave)] text-[var(--color-exito-texto)]">
                  Gratis
                </span>
              </div>

              <h3 className="text-xl font-bold mb-2 font-heading text-[var(--color-texto)]">
                Plan Free
              </h3>
              <p className="text-sm mb-5 text-[var(--color-texto-secundario)] min-h-[42px]">
                Acceso a las 3 normas troncales vigentes del Ecuador con buscador rápido y alertas esenciales.
              </p>

              <div className="mb-6">
                <div className="flex items-baseline gap-2 tabular-nums">
                  <span className="text-4xl font-extrabold text-[var(--color-texto)]">$0</span>
                  <span className="text-sm text-[var(--color-texto-secundario)]">/ siempre</span>
                </div>
                <p className="text-xs text-[var(--color-texto-secundario)] mt-1">
                  Sin tarjeta ni compromiso
                </p>
              </div>

              <div className="space-y-3 border-t border-[var(--color-borde)] pt-5">
                {[
                  'Código Tributario vigente',
                  'Ley de Régimen Tributario Interno (LRTI) vigente',
                  'Reglamento a la LRTI (RLRTI) vigente',
                  'Búsqueda por artículo y por impuesto'
                ].map((feat, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-sm text-[var(--color-texto)]">
                    <Check className="w-4 h-4 shrink-0 mt-0.5 text-[var(--color-secundario)]" />
                    <span>{feat}</span>
                  </div>
                ))}
                <div className="flex items-start gap-2.5 text-xs font-medium p-3 rounded-lg border border-[var(--color-borde)] bg-[var(--color-fondo)] text-[var(--color-texto)]">
                  <MessageCircle className="w-4 h-4 shrink-0 mt-0.5 text-[var(--color-secundario)]" />
                  <span>Alertas esenciales por WhatsApp según tu tipo de contribuyente</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-[var(--color-borde)]">
              <button
                type="button"
                onClick={() => onSelectPlan('free')}
                className="btn-smartlex-secondary btn-cta-secondary group w-full py-3 rounded-lg font-bold text-sm cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Comenzar gratis</span>
                <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
              </button>
              <p className="text-[11px] text-center text-[var(--color-texto-secundario)] mt-2.5">
                Acceso completo e inmediato al portal web
              </p>
            </div>
          </div>
        </RevealOnScroll>

        {/* 2. PLAN PRO (DESTACADO) */}
        <RevealOnScroll delayMs={90} className="h-full">
          <div className="sl-card-interactive h-full rounded-2xl border-2 border-[var(--color-secundario)] bg-[var(--color-superficie)] flex flex-col justify-between overflow-hidden shadow-md">
            <div>
              {/* Franja superior en plomo metalizado oficial */}
              <div
                style={{ background: 'var(--degradado-plomo)' }}
                className="px-6 py-2.5 text-xs font-bold text-[var(--color-texto-sobre-principal)] flex items-center justify-between gap-2"
              >
                <span className="inline-flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" />
                  <span>Recomendado para profesionales</span>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-[var(--color-secundario-suave)] text-[var(--color-exito-texto)] border border-[var(--color-secundario-borde)] text-[11px] font-extrabold">
                  50 % Dto.
                </span>
              </div>

              <div className="p-6 sm:p-8">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full border border-[var(--color-borde)] bg-[var(--color-superficie-secundaria)] text-[var(--color-texto)]">
                    Contadores y Juristas
                  </span>
                </div>

                <h3 className="text-xl font-bold mb-2 font-heading text-[var(--color-texto)]">
                  Plan Pro
                </h3>
                <p className="text-sm mb-5 text-[var(--color-texto-secundario)] min-h-[42px]">
                  Para despachos contables y juristas que necesitan trazabilidad histórica, tablas oficiales y calculadoras del SRI.
                </p>

                <div className="mb-6">
                  <div className="flex items-baseline gap-2.5 tabular-nums">
                    <span className="text-lg font-bold text-[var(--color-icono-sutil)] line-through decoration-2">
                      $9.99
                    </span>
                    <span className="text-4xl font-extrabold text-[var(--color-texto)]">$4.99</span>
                    <span className="text-sm text-[var(--color-texto-secundario)]">/ mes</span>
                  </div>
                  <p className="text-xs font-semibold text-[var(--color-secundario)] mt-1">
                    o $49.99 / año — ahorra 2 meses
                  </p>
                </div>

                <div className="space-y-3 border-t border-[var(--color-borde)] pt-5">
                  {[
                    'Todo lo del Plan Free',
                    'Resoluciones NAC del SRI y Circulares',
                    'Evolución histórica de reformas por año fiscal',
                    'Tablas Tributarias y Calculadoras del SRI (IR PN, RIMPE y Dividendos)'
                  ].map((feat, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-sm text-[var(--color-texto)]">
                      <Check className="w-4 h-4 shrink-0 mt-0.5 text-[var(--color-secundario)]" />
                      <span>{feat}</span>
                    </div>
                  ))}
                  <div className="flex items-start gap-2.5 text-xs p-3 rounded-lg border border-[var(--color-borde)] bg-[var(--color-fondo)] text-[var(--color-texto-secundario)]">
                    <HelpCircle className="w-4 h-4 shrink-0 mt-0.5 text-[var(--color-icono-sutil)]" />
                    <span>
                      <strong className="text-[var(--color-texto)]">Soporte técnico de la plataforma</strong> (no incluye asesoría tributaria personalizada).
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 sm:px-8 pb-6 sm:pb-8">
              <div className="pt-4 border-t border-[var(--color-borde)]">
                <button
                  type="button"
                  onClick={() => onSelectPlan('premium')}
                  className="btn-cta-smartlex group w-full py-3 rounded-lg font-bold text-sm cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Comenzar Plan Pro ($4.99)</span>
                  <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
                </button>
                <p className="text-[11px] text-center text-[var(--color-texto-secundario)] mt-2.5">
                  Precio promocional por tiempo limitado
                </p>
              </div>
            </div>
          </div>
        </RevealOnScroll>

        {/* 3. PLAN PLUS */}
        <RevealOnScroll delayMs={180} className="h-full">
          <div className="sl-card-interactive h-full rounded-2xl border border-[var(--color-borde-fuerte)] bg-[var(--color-superficie)] p-6 sm:p-8 flex flex-col justify-between overflow-hidden shadow-xs">
            <div>
              <div className="flex items-center justify-between gap-3 mb-4">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full border border-[var(--color-borde)] bg-[var(--color-fondo)] text-[var(--color-texto-secundario)]">
                  Inteligencia Artificial 24/7
                </span>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-[var(--color-secundario-borde)] bg-[var(--color-secundario-suave)] text-[var(--color-exito-texto)]">
                  50 % Dto.
                </span>
              </div>

              <h3 className="text-xl font-bold mb-2 font-heading text-[var(--color-texto)]">
                Plan Plus
              </h3>
              <p className="text-sm mb-5 text-[var(--color-texto-secundario)] min-h-[42px]">
                La suite completa con asistente IA para consultas normativas avanzadas e informes certificados.
              </p>

              <div className="mb-6">
                <div className="flex items-baseline gap-2.5 tabular-nums">
                  <span className="text-lg font-bold text-[var(--color-icono-sutil)] line-through decoration-2">
                    $19.99
                  </span>
                  <span className="text-4xl font-extrabold text-[var(--color-texto)]">$9.99</span>
                  <span className="text-sm text-[var(--color-texto-secundario)]">/ mes</span>
                </div>
                <p className="text-xs font-semibold text-[var(--color-secundario)] mt-1">
                  o $99.99 / año — ahorra 2 meses
                </p>
              </div>

              <div className="space-y-3 border-t border-[var(--color-borde)] pt-5">
                {[
                  'Todo lo del Plan Pro',
                  'Asistente IA Tributario: 100 consultas mensuales de base normativa',
                  'Exportación de informes normativos certificados'
                ].map((feat, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-sm text-[var(--color-texto)]">
                    <Check className="w-4 h-4 shrink-0 mt-0.5 text-[var(--color-secundario)]" />
                    <span>{feat}</span>
                  </div>
                ))}
                <div className="flex items-start gap-2.5 text-xs p-3 rounded-lg border border-[var(--color-borde)] bg-[var(--color-fondo)] text-[var(--color-texto-secundario)]">
                  <HelpCircle className="w-4 h-4 shrink-0 mt-0.5 text-[var(--color-icono-sutil)]" />
                  <span>
                    <strong className="text-[var(--color-texto)]">Soporte de plataforma preferente</strong> (asesorías tributarias de caso específico se cotizan por separado).
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-[var(--color-borde)]">
              <button
                type="button"
                onClick={() => onSelectPlan('professional')}
                className="btn-smartlex-lead group w-full py-3 rounded-lg font-bold text-sm cursor-pointer flex items-center justify-center gap-2"
              >
                <Crown className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
                <span>Elegir Plan Plus ($9.99)</span>
              </button>
              <p className="text-[11px] text-center text-[var(--color-texto-secundario)] mt-2.5">
                Precio promocional de lanzamiento
              </p>
            </div>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
};
