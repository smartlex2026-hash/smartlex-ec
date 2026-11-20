import React from 'react';
import { Layers, History, FileSpreadsheet, Bot, ArrowRight } from 'lucide-react';

interface PillarsGridProps {
  onOpenRegister: () => void;
  isDark: boolean;
}

export const PillarsGrid: React.FC<PillarsGridProps> = ({ isDark }) => {
  const pillars = [
    {
      icon: Layers,
      title: 'Biblioteca Jerárquica por Normas y Tributos',
      badge: 'Estructura Unificada',
      description:
        'Explora por cuerpos legales (LRTI, Ley de Equidad Tributaria, Código Tributario) o directamente por tributo (Impuesto a la Renta, IVA, ISD, ICE, RISE) con lectura por hojas desplegables.'
    },
    {
      icon: History,
      title: 'Máquina del Tiempo con Comparador Horizontal',
      badge: 'Trazabilidad Exacta',
      description:
        'Cada artículo cuenta con su propio reloj de arena (⏳) para comparar la versión vigente con todas sus reformas pasadas mediante una barra de desplazamiento horizontal y resaltado diferencial.'
    },
    {
      icon: FileSpreadsheet,
      title: 'Normativa Conexa Desplegable con Histórico Propio',
      badge: 'Cascada Jerárquica',
      description:
        'Debajo de cada artículo consultado se despliegan en orden jerárquico los artículos del Reglamento y las Resoluciones del SRI vinculadas, cada uno con su propia línea del tiempo histórica.'
    },
    {
      icon: Bot,
      title: 'Tablas Oficiales, Calculadoras & Asistente IA',
      badge: 'Automatización Inteligente',
      description:
        'Tablas progresivas del Art. 36 LRTI y Herencias actualizadas por ejercicio fiscal, simuladores tributarios y asistente de Inteligencia Artificial enfocado en normativa ecuatoriana.'
    }
  ];

  return (
    <section id="pilares" className="py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Título de la sección */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <h2
          className={`text-xs font-bold uppercase tracking-widest mb-3 ${
            isDark ? 'text-[#a1a1aa]' : 'text-[#52525b]'
          }`}
        >
          Ecosistema SmartLex
        </h2>
        <p
          className={`text-3xl sm:text-5xl font-extrabold tracking-tight font-heading ${
            isDark ? 'text-[#f4f4f5]' : 'text-[#09090b]'
          }`}
        >
          Diseñado para asistentes, contadores y juristas
        </p>
        <p className={`mt-4 text-base sm:text-lg ${isDark ? 'text-[#a1a1aa]' : 'text-[#52525b]'}`}>
          Una plataforma minimalista integrada para el rigor técnico, la rapidez en la consulta y la seguridad jurídica en cada cálculo.
        </p>
      </div>

      {/* Rejilla de 4 tarjetas minimalistas monocromáticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {pillars.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className={`group relative rounded-3xl border p-8 sm:p-10 transition-all duration-300 hover:-translate-y-1 ${
                isDark
                  ? 'border-[#26262b] bg-[#121215] hover:border-[#3f3f46]'
                  : 'border-[#e4e4e7] bg-white hover:border-[#a1a1aa] shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between gap-4 mb-6">
                <div
                  className={`w-12 h-12 rounded-2xl border flex items-center justify-center ${
                    isDark
                      ? 'bg-[#18181c] border-[#2e2e36] text-[#f4f4f5]'
                      : 'bg-[#f4f4f5] border-[#d4d4d8] text-[#18181b]'
                  }`}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <span
                  className={`text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${
                    isDark
                      ? 'bg-[#18181c] border-[#26262b] text-[#a1a1aa]'
                      : 'bg-[#fafafa] border-[#e4e4e7] text-[#52525b]'
                  }`}
                >
                  {item.badge}
                </span>
              </div>

              <h3
                className={`text-2xl font-bold mb-3 font-heading ${
                  isDark ? 'text-[#f4f4f5]' : 'text-[#09090b]'
                }`}
              >
                {item.title}
              </h3>
              <p
                className={`text-sm sm:text-base leading-relaxed mb-6 font-normal ${
                  isDark ? 'text-[#a1a1aa]' : 'text-[#52525b]'
                }`}
              >
                {item.description}
              </p>

              <div
                className={`pt-4 border-t flex items-center justify-between text-xs font-semibold transition-colors ${
                  isDark
                    ? 'border-[#26262b] text-[#a1a1aa] group-hover:text-[#f4f4f5]'
                    : 'border-[#e4e4e7] text-[#52525b] group-hover:text-[#09090b]'
                }`}
              >
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
