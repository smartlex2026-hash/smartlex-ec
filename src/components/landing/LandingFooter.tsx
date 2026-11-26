import React from 'react';
import { RubikCubeLogo } from '../common/RubikCubeLogo';
import { MessageCircle, ShieldCheck, ArrowRight } from 'lucide-react';

interface LandingFooterProps {
  isDark: boolean;
  onEnterLibrary?: () => void;
}

export const LandingFooter: React.FC<LandingFooterProps> = ({ onEnterLibrary }) => {
  return (
    <footer className="border-t border-[var(--color-borde)] bg-[var(--color-superficie-secundaria)] text-[var(--color-texto-secundario)] py-12 px-4 sm:px-6 lg:px-8 transition-colors text-left">
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8 mb-10">
        {/* Marca y Propuesta */}
        <div className="space-y-4 lg:col-span-4">
          <button
            type="button"
            onClick={() => onEnterLibrary && onEnterLibrary()}
            title="Ir al inicio de la Biblioteca Normativa"
            className="flex items-center gap-2.5 cursor-pointer text-left group"
          >
            <div className="flex items-center justify-center p-1.5 rounded-lg border border-[var(--color-borde)] bg-[var(--color-superficie)] group-hover:border-[var(--color-secundario)] transition-colors">
              <RubikCubeLogo size={26} />
            </div>
            <span className="font-extrabold text-lg font-heading text-[var(--color-texto)]">
              SmartLex<span className="text-[var(--color-secundario)]">EC</span>
            </span>
          </button>
          <p className="text-xs leading-relaxed max-w-sm">
            Ecosistema de integración normativa para asistentes, contadores y juristas en Ecuador. Estructura unificada con trazabilidad histórica de reformas.
          </p>
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-texto)]">
            <ShieldCheck className="w-4 h-4 text-[var(--color-secundario)] shrink-0" />
            <span>Basado en publicaciones del Registro Oficial</span>
          </div>
        </div>

        {/* Normas Troncales */}
        <div className="lg:col-span-3">
          <h4 className="text-xs font-bold uppercase tracking-wider mb-3.5 text-[var(--color-texto)]">
            Leyes troncales
          </h4>
          <ul className="space-y-2 text-xs">
            <li>
              <a href="#integracion" className="hover:text-[var(--color-texto)] transition-colors">
                Código Tributario
              </a>
            </li>
            <li>
              <a href="#integracion" className="hover:text-[var(--color-texto)] transition-colors">
                Ley de Régimen Tributario Interno (LRTI)
              </a>
            </li>
            <li>
              <a href="#integracion" className="hover:text-[var(--color-texto)] transition-colors">
                Reglamento a la LRTI (RLRTI)
              </a>
            </li>
            <li>
              <a href="#integracion" className="hover:text-[var(--color-texto)] transition-colors">
                Resoluciones Generales del SRI
              </a>
            </li>
          </ul>
        </div>

        {/* Herramientas */}
        <div className="lg:col-span-2">
          <h4 className="text-xs font-bold uppercase tracking-wider mb-3.5 text-[var(--color-texto)]">
            Herramientas
          </h4>
          <ul className="space-y-2 text-xs">
            <li>
              <a href="#pilares" className="hover:text-[var(--color-texto)] transition-colors">
                Biblioteca en árbol
              </a>
            </li>
            <li>
              <a href="#pilares" className="hover:text-[var(--color-texto)] transition-colors">
                Lector de normas
              </a>
            </li>
            <li>
              <a href="#integracion" className="hover:text-[var(--color-texto)] transition-colors">
                Evolución histórica
              </a>
            </li>
            <li>
              <a href="#pilares" className="hover:text-[var(--color-texto)] transition-colors">
                Tablas y calculadoras del SRI
              </a>
            </li>
          </ul>
        </div>

        {/* Canal Oficial */}
        <div className="space-y-3 lg:col-span-3">
          <h4 className="text-xs font-bold uppercase tracking-wider mb-3.5 text-[var(--color-texto)]">
            Canal oficial
          </h4>
          <p className="text-xs leading-relaxed">
            Recibe boletines de reformas fiscales y recordatorios de vencimientos según tu noveno dígito.
          </p>
          <a
            href="https://chat.whatsapp.com"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-cta-smartlex group inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold"
          >
            <MessageCircle className="w-4 h-4 shrink-0" />
            <span>Unirme al canal de WhatsApp</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
          </a>
        </div>
      </div>

      <div className="max-w-7xl mx-auto border-t border-[var(--color-borde)] pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs gap-3">
        <p>© 2026 SmartLex Ecuador. Todos los derechos reservados.</p>
        <p className="text-[11px] text-[var(--color-texto-secundario)]">
          Información de carácter referencial. No sustituye la asesoría profesional ni el texto oficial del Registro Oficial.
        </p>
      </div>
    </footer>
  );
};
