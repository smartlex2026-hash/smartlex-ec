import React from 'react';
import {
  ArrowRight,
  FolderTree,
  History,
  Calculator,
  Layers,
  CheckCircle2
} from 'lucide-react';

interface HeroSectionProps {
  onOpenRegister: () => void;
  onExploreDemo: () => void;
  isDark: boolean;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onOpenRegister,
  onExploreDemo
}) => {
  return (
    <section
      id="hero"
      className="scroll-mt-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-16 lg:pt-16 lg:pb-24"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
        {/* Columna izquierda: mensaje principal y llamadas a la acción */}
        <div className="lg:col-span-6 text-left">
          <div className="sl-hero-enter inline-flex items-center gap-2 text-xs font-semibold text-[var(--color-texto-secundario)] mb-5">
            <span className="inline-block w-2 h-2 rounded-full bg-[var(--color-secundario)]" />
            <span>Normativa tributaria del Ecuador · Registro Oficial y SRI</span>
          </div>

          <h1 className="sl-hero-enter sl-delay-1 text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.12] font-heading text-[var(--color-texto)]">
            Toda la legislación tributaria del Ecuador conectada en un solo lugar
          </h1>

          <p className="sl-hero-enter sl-delay-2 mt-5 text-base sm:text-lg text-[var(--color-texto-secundario)] leading-relaxed max-w-xl">
            Explora la biblioteca en árbol por normativa y tributos, lee cada artículo en formato desplegable con su índice, compara la evolución histórica de reformas y consulta tablas oficiales y calculadoras del SRI desde la misma plataforma.
          </p>

          <div className="sl-hero-enter sl-delay-3 mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              type="button"
              onClick={onOpenRegister}
              className="btn-cta-smartlex group px-6 py-3.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Comenzar gratis</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
            </button>

            <button
              type="button"
              onClick={onExploreDemo}
              className="btn-cta-secondary group px-5 py-3.5 rounded-lg font-semibold text-sm border border-[var(--color-borde)] bg-[var(--color-superficie)] text-[var(--color-texto)] cursor-pointer flex items-center justify-center gap-2"
            >
              <Layers className="w-4 h-4 text-[var(--color-secundario)] transition-transform duration-200 group-hover:scale-110" />
              <span>Ver cómo funciona</span>
            </button>
          </div>

          <div className="sl-hero-enter sl-delay-4 mt-8 pt-6 border-t border-[var(--color-borde)] grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-medium text-[var(--color-texto-secundario)]">
            <div className="flex items-center gap-2">
              <FolderTree className="w-4 h-4 text-[var(--color-secundario)] shrink-0" />
              <span>Biblioteca Normativa y Tributos</span>
            </div>
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-[var(--color-secundario)] shrink-0" />
              <span>Evolución histórica por artículo</span>
            </div>
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-[var(--color-secundario)] shrink-0" />
              <span>Tablas y calculadoras del SRI</span>
            </div>
          </div>
        </div>

        {/* Columna derecha: vista previa realista de ficha normativa */}
        <div className="lg:col-span-6 sl-hero-enter sl-delay-2">
          <div className="sl-card-interactive rounded-2xl border border-[var(--color-borde)] bg-[var(--color-superficie)] shadow-lg overflow-hidden text-left">
            {/* Cabecera de ficha */}
            <div className="px-4 sm:px-5 py-3 bg-[var(--color-superficie-secundaria)] border-b border-[var(--color-borde)] flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-mono font-semibold text-[var(--color-texto-secundario)]">
                LRTI › Título I › Art. 36
              </span>
              <span className="inline-flex items-center gap-1.5 bg-[var(--color-exito-fondo)] text-[var(--color-exito-texto)] border border-[var(--color-exito-borde)] px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
                <CheckCircle2 className="w-3 h-3" />
                <span>Vigente · Reformado</span>
              </span>
            </div>

            {/* Cuerpo de ficha */}
            <div className="p-5 sm:p-6 space-y-5">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-[var(--color-texto)] font-heading">
                  Tarifa de Impuesto a la Renta de Personas Naturales
                </h2>
                <p className="mt-3 border-l-2 border-[var(--color-secundario)] pl-3.5 text-xs sm:text-sm text-[var(--color-texto-secundario)] leading-relaxed">
                  Los ingresos gravados de las personas naturales se sujetarán a la tabla progresiva por tramos de renta computable y a la rebaja por gastos personales vigente en cada ejercicio fiscal.
                </p>
              </div>

              {/* Conexiones activas dentro del portal */}
              <div className="space-y-2.5">
                <div className="rounded-lg border border-[var(--color-borde)] bg-[var(--color-fondo)] px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs transition-colors duration-200 hover:border-[var(--color-borde-fuerte)] hover:bg-[var(--color-superficie-secundaria)]">
                  <span className="flex items-center gap-2 font-medium text-[var(--color-texto-secundario)]">
                    <Layers className="w-3.5 h-3.5 text-[var(--color-secundario)] shrink-0" />
                    <span>Reglamento vinculado</span>
                  </span>
                  <span className="font-mono font-semibold text-[var(--color-texto)]">
                    Art. 73 RLRTI
                  </span>
                </div>

                <div className="rounded-lg border border-[var(--color-borde)] bg-[var(--color-fondo)] px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs transition-colors duration-200 hover:border-[var(--color-borde-fuerte)] hover:bg-[var(--color-superficie-secundaria)]">
                  <span className="flex items-center gap-2 font-medium text-[var(--color-texto-secundario)]">
                    <History className="w-3.5 h-3.5 text-[var(--color-secundario)] shrink-0" />
                    <span>Evolución histórica</span>
                  </span>
                  <span className="font-semibold text-[var(--color-texto)]">
                    Comparador horizontal R.O.
                  </span>
                </div>

                <div className="rounded-lg border border-[var(--color-borde)] bg-[var(--color-fondo)] px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs transition-colors duration-200 hover:border-[var(--color-borde-fuerte)] hover:bg-[var(--color-superficie-secundaria)]">
                  <span className="flex items-center gap-2 font-medium text-[var(--color-texto-secundario)]">
                    <Calculator className="w-3.5 h-3.5 text-[var(--color-secundario)] shrink-0" />
                    <span>Calculadora activa</span>
                  </span>
                  <span className="font-semibold text-[var(--color-secundario)]">
                    IR PN + Gastos Personales
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
