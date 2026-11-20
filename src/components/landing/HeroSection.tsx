import React from 'react';
import { MessageCircle, ArrowRight, ShieldCheck, BookOpen, Layers } from 'lucide-react';

interface HeroSectionProps {
  onOpenRegister: () => void;
  onExploreDemo: () => void;
  isDark: boolean;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onOpenRegister,
  onExploreDemo,
  isDark
}) => {
  return (
    <section
      id="hero"
      className="relative pt-12 pb-20 md:pt-20 md:pb-28 text-center px-4 sm:px-6 lg:px-8"
    >
      {/* Insignia minimalista monocromática */}
      <div
        className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border backdrop-blur-md mb-8 ${
          isDark
            ? 'border-[#26262b] bg-[#151518] text-[#d4d4d8]'
            : 'border-[#d4d4d8] bg-white text-[#3f3f46] shadow-xs'
        }`}
      >
        <span
          className={`inline-flex rounded-full h-2 w-2 ${
            isDark ? 'bg-[#f4f4f5]' : 'bg-[#18181b]'
          }`}
        />
        <span className="text-xs font-semibold tracking-wide">
          Diseñado para asistentes, contadores y juristas del Ecuador
        </span>
      </div>

      {/* Titular Principal Minimalista Monocromático */}
      <h1
        className={`text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight max-w-5xl mx-auto leading-[1.12] font-heading ${
          isDark ? 'text-[#f4f4f5]' : 'text-[#09090b]'
        }`}
      >
        La legislación tributaria del Ecuador{' '}
        <span
          className={`block bg-clip-text text-transparent ${
            isDark
              ? 'bg-gradient-to-r from-[#ffffff] via-[#d4d4d8] to-[#71717a]'
              : 'bg-gradient-to-r from-[#09090b] via-[#3f3f46] to-[#71717a]'
          }`}
        >
          en una sola integración legal
        </span>
      </h1>

      {/* Párrafo Descriptivo */}
      <p
        className={`mt-6 text-lg sm:text-xl max-w-3xl mx-auto font-normal leading-relaxed ${
          isDark ? 'text-[#a1a1aa]' : 'text-[#52525b]'
        }`}
      >
        Deja atrás los PDFs obsoletos del Registro Oficial y las reformas dispersas. SmartLex conecta
        cada artículo de la ley con sus{' '}
        <span className={isDark ? 'text-[#f4f4f5] font-semibold' : 'text-[#09090b] font-semibold'}>
          reformas históricas
        </span>
        ,{' '}
        <span className={isDark ? 'text-[#f4f4f5] font-semibold' : 'text-[#09090b] font-semibold'}>
          reglamentos aplicables
        </span>{' '}
        y{' '}
        <span className={isDark ? 'text-[#f4f4f5] font-semibold' : 'text-[#09090b] font-semibold'}>
          calculadoras automáticas
        </span>{' '}
        en un ecosistema unificado.
      </p>

      {/* Llamadas a la acción (Dual CTAs minimalistas) */}
      <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
        <button
          onClick={onOpenRegister}
          className={`w-full sm:w-auto px-8 py-4 rounded-xl font-bold text-base transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-md ${
            isDark
              ? 'text-[#0d0d0f] bg-[#f4f4f5] hover:bg-white'
              : 'text-white bg-[#18181b] hover:bg-[#27272a]'
          }`}
        >
          <span>Comenzar Gratis</span>
          <ArrowRight className="w-4 h-4 ml-1" />
        </button>

        <button
          onClick={onExploreDemo}
          className={`w-full sm:w-auto px-7 py-4 rounded-xl font-semibold text-base border transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 ${
            isDark
              ? 'text-[#e4e4e7] border-[#26262b] bg-[#151518] hover:bg-[#1c1c21] hover:border-[#3f3f46]'
              : 'text-[#18181b] border-[#d4d4d8] bg-white hover:bg-[#f4f4f5]'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Ver Integración Normativa</span>
        </button>
      </div>

      {/* Micro-garantías */}
      <div
        className={`mt-8 flex flex-wrap items-center justify-center gap-6 text-xs font-medium ${
          isDark ? 'text-[#a1a1aa]' : 'text-[#52525b]'
        }`}
      >
        <div className="flex items-center gap-1.5">
          <BookOpen className="w-4 h-4" />
          <span>Código Tributario, LRTI y RLRTI vigentes</span>
        </div>
        <div className="flex items-center gap-1.5">
          <MessageCircle className="w-4 h-4" />
          <span>Alertas tributarias directo a tu WhatsApp</span>
        </div>
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4" />
          <span>Sin tarjeta de crédito requerida</span>
        </div>
      </div>
    </section>
  );
};
