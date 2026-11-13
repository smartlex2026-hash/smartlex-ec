import React from 'react';
import { Layers, History, FileSpreadsheet, Bot, ArrowRight, ShieldCheck } from 'lucide-react';

interface PillarsGridProps {
  onOpenRegister: () => void;
}

export const PillarsGrid: React.FC<PillarsGridProps> = ({ onOpenRegister }) => {
  const pillars = [
    {
      icon: Layers,
      title: 'Integración Normativa Viva',
      badge: 'Estructura Unificada',
      description:
        'Conectamos de forma bidireccional el Código Tributario, la Ley de Régimen Tributario Interno, reglamentos y resoluciones del SRI. Si una ley cambia, su impacto se refleja de inmediato en toda la cadena normativa.',
      color: 'from-[#3ECF8E] to-teal-600',
      borderGlow: 'hover:border-[#3ECF8E]/50'
    },
    {
      icon: History,
      title: 'Máquina del Tiempo Legal',
      badge: 'Trazabilidad Exacta',
      description:
        '¿Tienes una auditoría o revisión tributaria de años anteriores? SmartLex te permite viajar en el tiempo para consultar la redacción exacta que tenía cualquier artículo en la fecha de los hechos con su respectivo Registro Oficial.',
      color: 'from-amber-500 to-orange-500',
      borderGlow: 'hover:border-amber-500/50'
    },
    {
      icon: FileSpreadsheet,
      title: 'Formularios y Casilleros SRI',
      badge: 'Puente Operativo',
      description:
        'Facilita el trabajo diario de asistentes, contadores y juristas con la referencia legal clara que fundamenta cada obligación, deducibilidad, exención y retención tributaria.',
      color: 'from-purple-500 to-indigo-500',
      borderGlow: 'hover:border-purple-500/50'
    },
    {
      icon: Bot,
      title: 'Calculadoras & Asistente IA',
      badge: 'Automatización Inteligente',
      description:
        'Tablas progresivas del Art. 36 LRTI, simuladores de RIMPE y retenciones automatizadas, complementados con un asistente de Inteligencia Artificial enfocado en normativa tributaria ecuatoriana.',
      color: 'from-cyan-500 to-blue-500',
      borderGlow: 'hover:border-cyan-500/50'
    }
  ];

  return (
    <section id="pilares" className="py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Título de la sección */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <h2 className="text-xs font-bold text-[#3ECF8E] uppercase tracking-widest mb-3">
          Ecosistema SmartLex
        </h2>
        <p className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight font-heading">
          Diseñado para asistentes, contadores y juristas
        </p>
        <p className="mt-4 text-base sm:text-lg text-slate-300">
          Una plataforma integrada para el rigor técnico, la rapidez en la consulta y la seguridad jurídica en cada
          cálculo.
        </p>
      </div>

      {/* Rejilla de 4 tarjetas estilo Supabase */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {pillars.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className={`group relative rounded-3xl border border-white/10 bg-[#10121A]/80 p-8 sm:p-10 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 ${item.borderGlow}`}
            >
              <div className="flex items-center justify-between gap-4 mb-6">
                <div
                  className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${item.color} flex items-center justify-center shadow-lg`}
                >
                  <Icon className="w-7 h-7 text-[#0C0D14]" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-slate-300">
                  {item.badge}
                </span>
              </div>

              <h3 className="text-2xl font-bold text-white mb-3 font-heading">{item.title}</h3>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6 font-normal">
                {item.description}
              </p>

              <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs font-semibold text-slate-400 group-hover:text-[#3ECF8E] transition-colors">
                <span>Disponible en SmartLex Ecuador</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
