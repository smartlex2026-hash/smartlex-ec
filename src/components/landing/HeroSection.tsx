import React from 'react';
import { MessageCircle, ArrowRight, ShieldCheck, BookOpen, Layers, CheckCircle2 } from 'lucide-react';

interface HeroSectionProps {
  onOpenRegister: () => void;
  onExploreDemo: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onOpenRegister, onExploreDemo }) => {
  return (
    <section id="hero" className="relative pt-12 pb-20 md:pt-20 md:pb-28 text-center px-4 sm:px-6 lg:px-8">
      {/* Insignia / Badge estilo Supabase */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#3ECF8E]/30 bg-[#3ECF8E]/10 backdrop-blur-md mb-8">
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3ECF8E] opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#3ECF8E]" />
        </span>
        <span className="text-xs font-semibold tracking-wide text-emerald-200">
          Diseñado para asistentes, contadores y juristas del Ecuador
        </span>
      </div>

      {/* Titular Principal: Estilo Supabase con degradado vivo esmeralda / púrpura */}
      <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white max-w-5xl mx-auto leading-[1.12] font-heading">
        La legislación tributaria del Ecuador{' '}
        <span className="block bg-gradient-to-r from-[#3ECF8E] via-teal-200 to-purple-400 bg-clip-text text-transparent">
          en una sola integración legal
        </span>
      </h1>

      {/* Párrafo Descriptivo con la nueva terminología */}
      <p className="mt-6 text-lg sm:text-xl text-slate-300 max-w-3xl mx-auto font-normal leading-relaxed">
        Deja atrás los PDFs obsoletos del Registro Oficial y las reformas dispersas. SmartLex conecta cada artículo de la
        ley con sus <span className="text-white font-medium">reformas históricas</span>,{' '}
        <span className="text-white font-medium">reglamentos aplicables</span> y{' '}
        <span className="text-white font-medium">calculadoras automáticas</span> en un ecosistema unificado.
      </p>

      {/* Llamadas a la acción (Dual CTAs estilo Supabase) */}
      <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
        <button
          onClick={onOpenRegister}
          className="w-full sm:w-auto px-8 py-4 rounded-xl font-bold text-base text-[#0C0D14] bg-[#3ECF8E] hover:bg-[#34D399] transition-all duration-200 shadow-[0_0_25px_rgba(62,207,142,0.35)] hover:shadow-[0_0_35px_rgba(62,207,142,0.55)] flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Comenzar Gratis</span>
          <ArrowRight className="w-4 h-4 ml-1 text-[#0C0D14]" />
        </button>

        <button
          onClick={onExploreDemo}
          className="w-full sm:w-auto px-7 py-4 rounded-xl font-medium text-base text-slate-200 border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/20 transition-all duration-200 backdrop-blur-sm cursor-pointer flex items-center justify-center gap-2"
        >
          <Layers className="w-4 h-4 text-[#3ECF8E]" />
          <span>Ver Integración Normativa</span>
        </button>
      </div>

      {/* Micro-garantías */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 font-medium">
        <div className="flex items-center gap-1.5">
          <BookOpen className="w-4 h-4 text-[#3ECF8E]" />
          <span>Código Tributario, LRTI y RLRTI vigentes</span>
        </div>
        <div className="flex items-center gap-1.5">
          <MessageCircle className="w-4 h-4 text-purple-400" />
          <span>Alertas tributarias directo a tu WhatsApp</span>
        </div>
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-indigo-400" />
          <span>Sin tarjeta de crédito requerida</span>
        </div>
      </div>
    </section>
  );
};
