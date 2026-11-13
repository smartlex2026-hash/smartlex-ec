import React from 'react';
import { Check, MessageCircle, Sparkles, Zap, Crown, HelpCircle, ArrowRight } from 'lucide-react';

interface PricingTableProps {
  onSelectPlan: (planCode: 'free' | 'premium' | 'professional') => void;
}

export const PricingTable: React.FC<PricingTableProps> = ({ onSelectPlan }) => {
  return (
    <section id="planes" className="py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Título de la sección */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#3ECF8E]/10 border border-[#3ECF8E]/30 text-[#3ECF8E] text-xs font-semibold uppercase tracking-wider mb-3">
          Oferta Promocional por Lanzamiento
        </div>
        <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight font-heading">
          Planes adaptados a tu ejercicio profesional
        </h2>
        <p className="mt-4 text-base sm:text-lg text-slate-300">
          Comienza 100% gratis con los libros fundamentales de la legislación tributaria ecuatoriana o aprovecha los
          precios promocionales con descuento activo.
        </p>
      </div>

      {/* Grid de 3 columnas de precios estilo Supabase */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
        {/* 1. PLAN FREE */}
        <div className="rounded-3xl border border-white/10 bg-[#10121A]/80 p-8 sm:p-10 flex flex-col justify-between backdrop-blur-xl hover:border-white/20 transition-all">
          <div>
            <div className="flex items-center justify-between gap-4 mb-4">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider px-3 py-1 rounded-full bg-white/[0.04] border border-white/10">
                Para Asistentes & Aprendices
              </span>
              <span className="text-xs font-bold text-[#3ECF8E] bg-[#3ECF8E]/10 border border-[#3ECF8E]/30 px-2.5 py-0.5 rounded-full">
                Gratis
              </span>
            </div>

            <h3 className="text-2xl font-bold text-white mb-2 font-heading">Plan Free</h3>
            <p className="text-sm text-slate-300 mb-6">
              Acceso a las 3 normas troncales vigentes del Ecuador con buscador rápido y alertas esenciales.
            </p>

            <div className="flex items-baseline gap-2 mb-8">
              <span className="text-4xl sm:text-5xl font-extrabold text-white">$0</span>
              <span className="text-sm text-slate-400">/ de por vida</span>
            </div>

            <div className="space-y-3.5 border-t border-white/5 pt-6">
              <div className="flex items-start gap-3 text-sm text-slate-200">
                <Check className="w-4 h-4 text-[#3ECF8E] shrink-0 mt-0.5" />
                <span>
                  <strong>Código Tributario</strong> vigente
                </span>
              </div>
              <div className="flex items-start gap-3 text-sm text-slate-200">
                <Check className="w-4 h-4 text-[#3ECF8E] shrink-0 mt-0.5" />
                <span>
                  <strong>Ley de Régimen Tributario Interno (LRTI)</strong> vigente
                </span>
              </div>
              <div className="flex items-start gap-3 text-sm text-slate-200">
                <Check className="w-4 h-4 text-[#3ECF8E] shrink-0 mt-0.5" />
                <span>
                  <strong>Reglamento a la LRTI (RLRTI)</strong> vigente
                </span>
              </div>
              <div className="flex items-start gap-3 text-sm text-slate-200">
                <Check className="w-4 h-4 text-[#3ECF8E] shrink-0 mt-0.5" />
                <span>Búsqueda semántica por texto</span>
              </div>
              <div className="flex items-start gap-3 text-sm text-emerald-300 font-medium bg-[#3ECF8E]/10 p-2.5 rounded-xl border border-[#3ECF8E]/20">
                <MessageCircle className="w-4 h-4 text-[#3ECF8E] shrink-0 mt-0.5" />
                <span>Alertas y vencimientos por WhatsApp según tu tipo de contribuyente</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4">
            <button
              onClick={() => onSelectPlan('free')}
              className="w-full py-3.5 rounded-xl font-bold text-sm text-white bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Comenzar Gratis</span>
              <ArrowRight className="w-4 h-4 text-[#3ECF8E]" />
            </button>
            <p className="text-[11px] text-center text-slate-400 mt-2">Acceso completo e inmediato al portal web</p>
          </div>
        </div>

        {/* 2. PLAN PRO (CON DESCUENTO: TACHADO $19 -> $9.99) */}
        <div className="relative rounded-3xl border-2 border-[#3ECF8E] bg-[#121622]/95 p-8 sm:p-10 flex flex-col justify-between backdrop-blur-2xl shadow-[0_0_40px_rgba(62,207,142,0.15)] hover:shadow-[0_0_50px_rgba(62,207,142,0.3)] transition-all">
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-[#3ECF8E] to-teal-500 text-[#0C0D14] text-xs font-black uppercase tracking-wider shadow-lg flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 fill-[#0C0D14]" />
            Promoción Especial
          </div>

          <div>
            <div className="flex items-center justify-between gap-4 mb-4">
              <span className="text-xs font-bold text-[#3ECF8E] uppercase tracking-wider px-3 py-1 rounded-full bg-[#3ECF8E]/10 border border-[#3ECF8E]/30">
                Para Contadores & Juristas
              </span>
              <span className="text-[11px] font-bold text-emerald-300 bg-emerald-950/70 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                50% OFF
              </span>
            </div>

            <h3 className="text-2xl font-bold text-white mb-2 font-heading">Plan Pro</h3>
            <p className="text-sm text-slate-300 mb-6">
              Para despachos contables y juristas que necesitan trazabilidad histórica y calculadoras automáticas.
            </p>

            {/* Precio con descuento tachado */}
            <div className="flex items-baseline gap-3 mb-8">
              <span className="text-2xl font-bold text-slate-400 line-through decoration-red-400/80 decoration-2">
                $19.00
              </span>
              <span className="text-4xl sm:text-5xl font-extrabold text-[#3ECF8E]">$9.99</span>
              <span className="text-sm text-slate-400">/ mes</span>
            </div>

            <div className="space-y-3.5 border-t border-white/10 pt-6">
              <div className="flex items-start gap-3 text-sm text-slate-200">
                <Check className="w-4 h-4 text-[#3ECF8E] shrink-0 mt-0.5" />
                <span>
                  <strong>Todo lo del Plan Free</strong>
                </span>
              </div>
              <div className="flex items-start gap-3 text-sm text-slate-200">
                <Check className="w-4 h-4 text-[#3ECF8E] shrink-0 mt-0.5" />
                <span>
                  <strong>Normas Secundarias:</strong> Resoluciones NAC del SRI y Circulares
                </span>
              </div>
              <div className="flex items-start gap-3 text-sm text-slate-200">
                <Check className="w-4 h-4 text-[#3ECF8E] shrink-0 mt-0.5" />
                <span>
                  <strong>Máquina del Tiempo:</strong> Historial de reformas por año fiscal
                </span>
              </div>
              <div className="flex items-start gap-3 text-sm text-slate-200">
                <Check className="w-4 h-4 text-[#3ECF8E] shrink-0 mt-0.5" />
                <span>
                  <strong>Calculadoras Tributarias:</strong> IR Personas Naturales, RIMPE y Dividendos
                </span>
              </div>
              {/* Soporte técnico del portal aclarado */}
              <div className="flex items-start gap-3 text-xs text-slate-300 bg-white/[0.03] p-2.5 rounded-xl border border-white/5">
                <HelpCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Soporte técnico de la plataforma</strong> (no incluye asesoría tributaria personalizada).
                </span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4">
            <button
              onClick={() => onSelectPlan('premium')}
              className="w-full py-3.5 rounded-xl font-bold text-sm text-[#0C0D14] bg-[#3ECF8E] hover:bg-[#34D399] shadow-[0_0_20px_rgba(62,207,142,0.4)] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Comenzar Plan Pro ($9.99)</span>
            </button>
            <p className="text-[11px] text-center text-slate-400 mt-2">Precio promocional por tiempo limitado</p>
          </div>
        </div>

        {/* 3. PLAN PLUS (CON DESCUENTO: TACHADO $39 -> $19.99) */}
        <div className="rounded-3xl border border-white/10 bg-[#10121A]/80 p-8 sm:p-10 flex flex-col justify-between backdrop-blur-xl hover:border-purple-500/40 transition-all">
          <div>
            <div className="flex items-center justify-between gap-4 mb-4">
              <span className="text-xs font-bold text-purple-300 uppercase tracking-wider px-3 py-1 rounded-full bg-purple-950/60 border border-purple-500/30">
                Inteligencia Artificial 24/7
              </span>
              <span className="text-[11px] font-bold text-purple-300 bg-purple-950/70 border border-purple-500/40 px-2 py-0.5 rounded-full">
                50% OFF
              </span>
            </div>

            <h3 className="text-2xl font-bold text-white mb-2 font-heading">Plan Plus</h3>
            <p className="text-sm text-slate-300 mb-6">
              La suite con asistente IA para consultas normativas avanzadas de alta frecuencia.
            </p>

            {/* Precio con descuento tachado */}
            <div className="flex items-baseline gap-3 mb-8">
              <span className="text-2xl font-bold text-slate-400 line-through decoration-red-400/80 decoration-2">
                $39.00
              </span>
              <span className="text-4xl sm:text-5xl font-extrabold text-purple-400">$19.99</span>
              <span className="text-sm text-slate-400">/ mes</span>
            </div>

            <div className="space-y-3.5 border-t border-white/5 pt-6">
              <div className="flex items-start gap-3 text-sm text-slate-200">
                <Check className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Todo lo del Plan Pro</strong>
                </span>
              </div>
              <div className="flex items-start gap-3 text-sm text-slate-200">
                <Check className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Asistente IA Tributario:</strong> 100 consultas mensuales de base normativa
                </span>
              </div>
              <div className="flex items-start gap-3 text-sm text-slate-200">
                <Check className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <span>Exportación de informes normativos certificados</span>
              </div>
              <div className="flex items-start gap-3 text-xs text-slate-300 bg-white/[0.03] p-2.5 rounded-xl border border-white/5">
                <HelpCircle className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Soporte de plataforma preferente</strong> (asesorías tributarias de caso específico se cotizan por separado).
                </span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4">
            <button
              onClick={() => onSelectPlan('professional')}
              className="w-full py-3.5 rounded-xl font-bold text-sm text-white bg-purple-600 hover:bg-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Crown className="w-4 h-4 text-yellow-300" />
              <span>Elegir Plan Plus ($19.99)</span>
            </button>
            <p className="text-[11px] text-center text-slate-400 mt-2">Precio promocional de lanzamiento</p>
          </div>
        </div>
      </div>
    </section>
  );
};
