import React from 'react';
import {
  FolderTree,
  BookOpen,
  History,
  Table2,
  Calculator,
  ArrowRight
} from 'lucide-react';
import { RevealOnScroll } from './RevealOnScroll';

interface PillarsGridProps {
  onOpenRegister: () => void;
  isDark: boolean;
}

export const PillarsGrid: React.FC<PillarsGridProps> = ({ onOpenRegister }) => {
  const coreModules = [
    {
      icon: BookOpen,
      title: 'Lector de normas con índice y artículos desplegables',
      badge: 'Lectura ágil',
      description:
        'Navega por un índice lateral independiente para ir directo a cualquier libro, título o artículo y despliega cada hoja legal con encabezado fijo y cita lista para copiar.'
    },
    {
      icon: History,
      title: 'Evolución histórica de reformas y normativa conexa',
      badge: 'Comparador temporal',
      description:
        'Compara la redacción vigente con sus versiones anteriores en una línea del tiempo horizontal con cambios resaltados, junto al reglamento y resoluciones relacionadas.'
    },
    {
      icon: Table2,
      title: 'Tablas tributarias clasificadas por impuesto',
      badge: 'Series oficiales',
      description:
        'Consulta tablas de Impuesto a la Renta y Herencias, RIMPE, RISE histórico, ICE, IVA, impuestos ambientales y contribuciones temporales organizadas por año fiscal.'
    },
    {
      icon: Calculator,
      title: 'Calculadoras del SRI conectadas a tablas reales',
      badge: 'Cálculo inmediato',
      description:
        'Simula Impuesto a la Renta de Personas Naturales con rebaja de gastos personales, cálculo RIMPE Emprendedor / Negocio Popular y retención en distribución de dividendos.'
    }
  ];

  return (
    <section
      id="pilares"
      className="scroll-mt-20 py-14 md:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-left"
    >
      {/* Cabecera */}
      <RevealOnScroll>
        <div className="max-w-2xl mb-10">
          <p className="text-xs font-bold uppercase tracking-wider mb-2 text-[var(--color-secundario)]">
            Estructura real de SmartLex
          </p>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight font-heading text-[var(--color-texto)]">
            Todo lo que encuentras al entrar al portal
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[var(--color-texto-secundario)]">
            Cinco piezas pensadas para trabajar la normativa tributaria del Ecuador sin perder tiempo buscando en archivos sueltos.
          </p>
        </div>
      </RevealOnScroll>

      {/* Bloque protagonista superior: Biblioteca en árbol (Normativa y Tributos) */}
      <RevealOnScroll delayMs={60}>
        <div className="sl-card-interactive rounded-2xl border border-[var(--color-borde)] bg-[var(--color-superficie)] hover:border-[var(--color-borde-fuerte)] p-6 sm:p-8 shadow-sm mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="flex flex-wrap items-center gap-3">
                <div className="w-10 h-10 rounded-lg border border-[var(--color-borde)] bg-[var(--color-superficie-secundaria)] text-[var(--color-secundario)] flex items-center justify-center shrink-0">
                  <FolderTree className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full border border-[var(--color-secundario-borde)] bg-[var(--color-secundario-suave)] text-[var(--color-exito-texto)]">
                  Explorador principal en árbol
                </span>
              </div>

              <h3 className="text-xl sm:text-2xl font-bold font-heading text-[var(--color-texto)]">
                Biblioteca en árbol: Normativa y Tributos
              </h3>
              <p className="text-sm sm:text-base text-[var(--color-texto-secundario)] leading-relaxed">
                Organiza toda la legislación ecuatoriana en dos rutas paralelas para encontrar cualquier artículo por el cuerpo legal que lo contiene o directamente por el impuesto que regula.
              </p>
            </div>

            <div className="lg:w-[46%] grid grid-cols-1 sm:grid-cols-2 gap-3 shrink-0">
              <div className="rounded-xl border border-[var(--color-borde)] bg-[var(--color-fondo)] p-4 space-y-2">
                <div className="text-xs font-bold text-[var(--color-texto)]">
                  Grupo 1 · Normativa
                </div>
                <p className="text-xs text-[var(--color-texto-secundario)] leading-relaxed">
                  Códigos, leyes, reglamentos, decretos, resoluciones del SRI, circulares y convenios internacionales.
                </p>
              </div>
              <div className="rounded-xl border border-[var(--color-borde)] bg-[var(--color-fondo)] p-4 space-y-2">
                <div className="text-xs font-bold text-[var(--color-texto)]">
                  Grupo 2 · Tributos
                </div>
                <p className="text-xs text-[var(--color-texto-secundario)] leading-relaxed">
                  Acceso directo por impuesto: Impuesto a la Renta, IVA, ICE, ISD, RIMPE y tributos conexos.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[var(--color-borde)] flex items-center justify-between">
            <button
              type="button"
              onClick={onOpenRegister}
              className="group inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-secundario)] hover:text-[var(--color-secundario-hover)] transition-colors cursor-pointer"
            >
              <span>Explorar en tu cuenta</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      </RevealOnScroll>

      {/* Rejilla 2x2 con los 4 módulos restantes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {coreModules.map((item, idx) => {
          const Icon = item.icon;
          return (
            <RevealOnScroll key={idx} delayMs={90 * (idx % 2) + 80} className="h-full">
              <div className="sl-card-interactive group h-full rounded-2xl border border-[var(--color-borde)] bg-[var(--color-superficie)] hover:border-[var(--color-borde-fuerte)] p-6 sm:p-8 flex flex-col justify-between gap-6 shadow-xs">
                <div>
                  <div className="flex items-center justify-between gap-3 mb-5">
                    <div className="w-10 h-10 rounded-lg border border-[var(--color-borde)] bg-[var(--color-superficie-secundaria)] text-[var(--color-secundario)] flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full border border-[var(--color-borde)] bg-[var(--color-fondo)] text-[var(--color-texto-secundario)]">
                      {item.badge}
                    </span>
                  </div>

                  <h3 className="text-lg sm:text-xl font-bold mb-2.5 font-heading text-[var(--color-texto)]">
                    {item.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-[var(--color-texto-secundario)]">
                    {item.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-[var(--color-borde)] flex items-center justify-between">
                  <button
                    type="button"
                    onClick={onOpenRegister}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-texto-secundario)] group-hover:text-[var(--color-secundario)] transition-colors cursor-pointer"
                  >
                    <span>Explorar en tu cuenta</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
                  </button>
                </div>
              </div>
            </RevealOnScroll>
          );
        })}
      </div>
    </section>
  );
};
