import React from 'react';
import { Check, MessageCircle, Zap, Crown, HelpCircle, ArrowRight } from 'lucide-react';

interface PricingTableProps {
  onSelectPlan: (planCode: 'free' | 'premium' | 'professional') => void;
  isDark: boolean;
}

export const PricingTable: React.FC<PricingTableProps> = ({ onSelectPlan, isDark }) => {
  return (
    <section id="planes" className="py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Título de la sección */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <div
          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold uppercase tracking-wider mb-3 ${
            isDark
              ? 'bg-[#151518] border-[#26262b] text-[#d4d4d8]'
              : 'bg-white border-[#d4d4d8] text-[#3f3f46]'
          }`}
        >
          Oferta Promocional por Lanzamiento
        </div>
        <h2
          className={`text-3xl sm:text-5xl font-extrabold tracking-tight font-heading ${
            isDark ? 'text-[#f4f4f5]' : 'text-[#09090b]'
          }`}
        >
          Planes adaptados a tu ejercicio profesional
        </h2>
        <p className={`mt-4 text-base sm:text-lg ${isDark ? 'text-[#a1a1aa]' : 'text-[#52525b]'}`}>
          Comienza 100% gratis con los cuerpos fundamentales de la legislación tributaria ecuatoriana o aprovecha los precios promocionales de lanzamiento.
        </p>
      </div>

      {/* Grid de 3 columnas de precios minimalista monocromático */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
        {/* 1. PLAN FREE */}
        <div
          className={`rounded-3xl border p-8 sm:p-10 flex flex-col justify-between transition-all ${
            isDark
              ? 'border-[#26262b] bg-[#121215] hover:border-[#3f3f46]'
              : 'border-[#e4e4e7] bg-white hover:border-[#a1a1aa] shadow-sm'
          }`}
        >
          <div>
            <div className="flex items-center justify-between gap-4 mb-4">
              <span
                className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${
                  isDark
                    ? 'text-[#a1a1aa] bg-[#18181c] border-[#26262b]'
                    : 'text-[#52525b] bg-[#fafafa] border-[#e4e4e7]'
                }`}
              >
                Para Asistentes & Aprendices
              </span>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                  isDark
                    ? 'text-[#e4e4e7] bg-[#18181c] border-[#2e2e36]'
                    : 'text-[#18181b] bg-[#f4f4f5] border-[#d4d4d8]'
                }`}
              >
                Gratis
              </span>
            </div>

            <h3
              className={`text-2xl font-bold mb-2 font-heading ${
                isDark ? 'text-[#f4f4f5]' : 'text-[#09090b]'
              }`}
            >
              Plan Free
            </h3>
            <p className={`text-sm mb-6 ${isDark ? 'text-[#a1a1aa]' : 'text-[#52525b]'}`}>
              Acceso a las 3 normas troncales vigentes del Ecuador con buscador rápido y alertas esenciales.
            </p>

            <div className="flex items-baseline gap-2 mb-8">
              <span
                className={`text-4xl sm:text-5xl font-extrabold ${
                  isDark ? 'text-[#f4f4f5]' : 'text-[#09090b]'
                }`}
              >
                $0
              </span>
              <span className={`text-sm ${isDark ? 'text-[#71717a]' : 'text-[#71717a]'}`}>
                / de por vida
              </span>
            </div>

            <div
              className={`space-y-3.5 border-t pt-6 ${
                isDark ? 'border-[#26262b]' : 'border-[#e4e4e7]'
              }`}
            >
              {[
                'Código Tributario vigente',
                'Ley de Régimen Tributario Interno (LRTI) vigente',
                'Reglamento a la LRTI (RLRTI) vigente',
                'Búsqueda por artículo y por impuesto'
              ].map((feat, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 text-sm ${
                    isDark ? 'text-[#d4d4d8]' : 'text-[#3f3f46]'
                  }`}
                >
                  <Check className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{feat}</span>
                </div>
              ))}
              <div
                className={`flex items-start gap-3 text-sm font-medium p-3 rounded-xl border ${
                  isDark
                    ? 'text-[#e4e4e7] bg-[#18181c] border-[#26262b]'
                    : 'text-[#18181b] bg-[#fafafa] border-[#e4e4e7]'
                }`}
              >
                <MessageCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Alertas y vencimientos por WhatsApp según tu tipo de contribuyente</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4">
            <button
              onClick={() => onSelectPlan('free')}
              className={`w-full py-3.5 rounded-xl font-bold text-sm border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                isDark
                  ? 'text-[#f4f4f5] bg-[#18181c] hover:bg-[#1c1c21] border-[#2e2e36]'
                  : 'text-[#18181b] bg-[#f4f4f5] hover:bg-[#e4e4e7] border-[#d4d4d8]'
              }`}
            >
              <span>Comenzar Gratis</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <p className="text-[11px] text-center text-[#71717a] mt-2">
              Acceso completo e inmediato al portal web
            </p>
          </div>
        </div>

        {/* 2. PLAN PRO (DESTACADO MONOCROMÁTICO) */}
        <div
          className={`relative rounded-3xl border-2 p-8 sm:p-10 flex flex-col justify-between transition-all shadow-xl ${
            isDark
              ? 'border-[#f4f4f5] bg-[#151518]'
              : 'border-[#18181b] bg-white'
          }`}
        >
          <div
            className={`absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-md flex items-center gap-1.5 ${
              isDark ? 'bg-[#f4f4f5] text-[#0d0d0f]' : 'bg-[#18181b] text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Promoción Especial
          </div>

          <div>
            <div className="flex items-center justify-between gap-4 mb-4">
              <span
                className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${
                  isDark
                    ? 'text-[#f4f4f5] bg-[#1c1c21] border-[#3f3f46]'
                    : 'text-[#18181b] bg-[#f4f4f5] border-[#d4d4d8]'
                }`}
              >
                Para Contadores & Juristas
              </span>
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                  isDark
                    ? 'text-[#e4e4e7] bg-[#1c1c21] border-[#3f3f46]'
                    : 'text-[#18181b] bg-[#f4f4f5] border-[#d4d4d8]'
                }`}
              >
                50% OFF
              </span>
            </div>

            <h3
              className={`text-2xl font-bold mb-2 font-heading ${
                isDark ? 'text-[#f4f4f5]' : 'text-[#09090b]'
              }`}
            >
              Plan Pro
            </h3>
            <p className={`text-sm mb-6 ${isDark ? 'text-[#a1a1aa]' : 'text-[#52525b]'}`}>
              Para despachos contables y juristas que necesitan trazabilidad histórica y calculadoras automáticas.
            </p>

            <div className="flex items-baseline gap-3 mb-8">
              <span className="text-2xl font-bold text-[#71717a] line-through decoration-2">
                $19.00
              </span>
              <span
                className={`text-4xl sm:text-5xl font-extrabold ${
                  isDark ? 'text-[#f4f4f5]' : 'text-[#09090b]'
                }`}
              >
                $9.99
              </span>
              <span className="text-sm text-[#71717a]">/ mes</span>
            </div>

            <div
              className={`space-y-3.5 border-t pt-6 ${
                isDark ? 'border-[#26262b]' : 'border-[#e4e4e7]'
              }`}
            >
              {[
                'Todo lo del Plan Free',
                'Normas Secundarias: Resoluciones NAC del SRI y Circulares',
                'Máquina del Tiempo: Historial de reformas por año fiscal',
                'Calculadoras Tributarias: IR Personas Naturales, Herencias y Dividendos'
              ].map((feat, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 text-sm ${
                    isDark ? 'text-[#e4e4e7]' : 'text-[#18181b]'
                  }`}
                >
                  <Check className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{feat}</span>
                </div>
              ))}
              <div
                className={`flex items-start gap-3 text-xs p-3 rounded-xl border ${
                  isDark
                    ? 'text-[#a1a1aa] bg-[#121215] border-[#26262b]'
                    : 'text-[#52525b] bg-[#fafafa] border-[#e4e4e7]'
                }`}
              >
                <HelpCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  <strong>Soporte técnico de la plataforma</strong> (no incluye asesoría tributaria personalizada).
                </span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4">
            <button
              onClick={() => onSelectPlan('premium')}
              className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md ${
                isDark
                  ? 'text-[#0d0d0f] bg-[#f4f4f5] hover:bg-white'
                  : 'text-white bg-[#18181b] hover:bg-[#27272a]'
              }`}
            >
              <span>Comenzar Plan Pro ($9.99)</span>
            </button>
            <p className="text-[11px] text-center text-[#71717a] mt-2">
              Precio promocional por tiempo limitado
            </p>
          </div>
        </div>

        {/* 3. PLAN PLUS */}
        <div
          className={`rounded-3xl border p-8 sm:p-10 flex flex-col justify-between transition-all ${
            isDark
              ? 'border-[#26262b] bg-[#121215] hover:border-[#3f3f46]'
              : 'border-[#e4e4e7] bg-white hover:border-[#a1a1aa] shadow-sm'
          }`}
        >
          <div>
            <div className="flex items-center justify-between gap-4 mb-4">
              <span
                className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${
                  isDark
                    ? 'text-[#d4d4d8] bg-[#18181c] border-[#26262b]'
                    : 'text-[#3f3f46] bg-[#fafafa] border-[#e4e4e7]'
                }`}
              >
                Inteligencia Artificial 24/7
              </span>
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                  isDark
                    ? 'text-[#d4d4d8] bg-[#18181c] border-[#2e2e36]'
                    : 'text-[#18181b] bg-[#f4f4f5] border-[#d4d4d8]'
                }`}
              >
                50% OFF
              </span>
            </div>

            <h3
              className={`text-2xl font-bold mb-2 font-heading ${
                isDark ? 'text-[#f4f4f5]' : 'text-[#09090b]'
              }`}
            >
              Plan Plus
            </h3>
            <p className={`text-sm mb-6 ${isDark ? 'text-[#a1a1aa]' : 'text-[#52525b]'}`}>
              La suite completa con asistente IA para consultas normativas avanzadas de alta frecuencia.
            </p>

            <div className="flex items-baseline gap-3 mb-8">
              <span className="text-2xl font-bold text-[#71717a] line-through decoration-2">
                $39.00
              </span>
              <span
                className={`text-4xl sm:text-5xl font-extrabold ${
                  isDark ? 'text-[#f4f4f5]' : 'text-[#09090b]'
                }`}
              >
                $19.99
              </span>
              <span className="text-sm text-[#71717a]">/ mes</span>
            </div>

            <div
              className={`space-y-3.5 border-t pt-6 ${
                isDark ? 'border-[#26262b]' : 'border-[#e4e4e7]'
              }`}
            >
              {[
                'Todo lo del Plan Pro',
                'Asistente IA Tributario: 100 consultas mensuales de base normativa',
                'Exportación de informes normativos certificados'
              ].map((feat, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 text-sm ${
                    isDark ? 'text-[#d4d4d8]' : 'text-[#3f3f46]'
                  }`}
                >
                  <Check className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{feat}</span>
                </div>
              ))}
              <div
                className={`flex items-start gap-3 text-xs p-3 rounded-xl border ${
                  isDark
                    ? 'text-[#a1a1aa] bg-[#18181c] border-[#26262b]'
                    : 'text-[#52525b] bg-[#fafafa] border-[#e4e4e7]'
                }`}
              >
                <HelpCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  <strong>Soporte de plataforma preferente</strong> (asesorías tributarias de caso específico se cotizan por separado).
                </span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4">
            <button
              onClick={() => onSelectPlan('professional')}
              className={`w-full py-3.5 rounded-xl font-bold text-sm border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                isDark
                  ? 'text-[#f4f4f5] bg-[#18181c] hover:bg-[#1c1c21] border-[#3f3f46]'
                  : 'text-[#18181b] bg-[#f4f4f5] hover:bg-[#e4e4e7] border-[#d4d4d8]'
              }`}
            >
              <Crown className="w-4 h-4" />
              <span>Elegir Plan Plus ($19.99)</span>
            </button>
            <p className="text-[11px] text-center text-[#71717a] mt-2">
              Precio promocional de lanzamiento
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
