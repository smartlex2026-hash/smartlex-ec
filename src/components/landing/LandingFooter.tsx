import React from 'react';
import { RubikCubeLogo } from '../common/RubikCubeLogo';
import { MessageCircle, ShieldCheck } from 'lucide-react';

interface LandingFooterProps {
  isDark: boolean;
}

export const LandingFooter: React.FC<LandingFooterProps> = ({ isDark }) => {
  return (
    <footer
      className={`border-t py-14 px-4 sm:px-6 lg:px-8 transition-colors ${
        isDark
          ? 'border-[#26262b] bg-[#0d0d0f] text-[#a1a1aa]'
          : 'border-[#e4e4e7] bg-[#f4f4f5] text-[#52525b]'
      }`}
    >
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
        {/* Columna 1: Marca y Propuesta */}
        <div className="space-y-4 md:col-span-1">
          <div className="flex items-center gap-2.5">
            <div
              className={`flex items-center justify-center p-1 rounded-lg border ${
                isDark ? 'bg-[#151518] border-[#26262b]' : 'bg-white border-[#d4d4d8]'
              }`}
            >
              <RubikCubeLogo size={28} />
            </div>
            <span
              className={`font-extrabold text-lg font-heading ${
                isDark ? 'text-[#f4f4f5]' : 'text-[#09090b]'
              }`}
            >
              SmartLex<span className={isDark ? 'text-[#a1a1aa]' : 'text-[#52525b]'}>EC</span>
            </span>
          </div>
          <p className="text-xs leading-relaxed">
            Ecosistema de integración normativa para asistentes, contadores y juristas en Ecuador. Estructura unificada con trazabilidad histórica de reformas.
          </p>
          <div
            className={`flex items-center gap-2 text-xs font-semibold ${
              isDark ? 'text-[#e4e4e7]' : 'text-[#18181b]'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Datos oficiales del Registro Oficial</span>
          </div>
        </div>

        {/* Columna 2: Normas Troncales */}
        <div>
          <h4
            className={`text-xs font-bold uppercase tracking-wider mb-4 ${
              isDark ? 'text-[#f4f4f5]' : 'text-[#09090b]'
            }`}
          >
            Leyes Troncales
          </h4>
          <ul className="space-y-2.5 text-xs">
            <li>
              <a
                href="#integracion"
                className={isDark ? 'hover:text-white transition-colors' : 'hover:text-black transition-colors'}
              >
                Código Tributario
              </a>
            </li>
            <li>
              <a
                href="#integracion"
                className={isDark ? 'hover:text-white transition-colors' : 'hover:text-black transition-colors'}
              >
                Ley de Régimen Tributario Interno (LRTI)
              </a>
            </li>
            <li>
              <a
                href="#integracion"
                className={isDark ? 'hover:text-white transition-colors' : 'hover:text-black transition-colors'}
              >
                Reglamento a la LRTI (RLRTI)
              </a>
            </li>
            <li>
              <a
                href="#integracion"
                className={isDark ? 'hover:text-white transition-colors' : 'hover:text-black transition-colors'}
              >
                Resoluciones Generales del SRI
              </a>
            </li>
          </ul>
        </div>

        {/* Columna 3: Herramientas */}
        <div>
          <h4
            className={`text-xs font-bold uppercase tracking-wider mb-4 ${
              isDark ? 'text-[#f4f4f5]' : 'text-[#09090b]'
            }`}
          >
            Herramientas
          </h4>
          <ul className="space-y-2.5 text-xs">
            <li>
              <a
                href="#integracion"
                className={isDark ? 'hover:text-white transition-colors' : 'hover:text-black transition-colors'}
              >
                Biblioteca Jerárquica
              </a>
            </li>
            <li>
              <a
                href="#pilares"
                className={isDark ? 'hover:text-white transition-colors' : 'hover:text-black transition-colors'}
              >
                Máquina del Tiempo de Reformas
              </a>
            </li>
            <li>
              <a
                href="#pilares"
                className={isDark ? 'hover:text-white transition-colors' : 'hover:text-black transition-colors'}
              >
                Calculadora Progresiva Art. 36
              </a>
            </li>
            <li>
              <a
                href="#pilares"
                className={isDark ? 'hover:text-white transition-colors' : 'hover:text-black transition-colors'}
              >
                Simulador de Regímenes Fiscales
              </a>
            </li>
          </ul>
        </div>

        {/* Columna 4: Comunidad & Alertas WhatsApp */}
        <div className="space-y-3">
          <h4
            className={`text-xs font-bold uppercase tracking-wider mb-4 ${
              isDark ? 'text-[#f4f4f5]' : 'text-[#09090b]'
            }`}
          >
            Canal Oficial
          </h4>
          <p className="text-xs">
            Únete al canal oficial de WhatsApp para recibir boletines de reformas fiscales y alertas de vencimientos según tu noveno dígito.
          </p>
          <a
            href="https://chat.whatsapp.com"
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
              isDark
                ? 'text-[#0d0d0f] bg-[#f4f4f5] hover:bg-white'
                : 'text-white bg-[#18181b] hover:bg-[#27272a]'
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            <span>Unirme al Canal de WhatsApp</span>
          </a>
        </div>
      </div>

      <div
        className={`max-w-7xl mx-auto border-t pt-8 flex flex-col sm:flex-row items-center justify-between text-xs gap-4 ${
          isDark ? 'border-[#26262b]' : 'border-[#d4d4d8]'
        }`}
      >
        <p>© 2026 SmartLex Ecuador. Todos los derechos reservados.</p>
        <p>Hecho con rigor tributario para los profesionales del Ecuador</p>
      </div>
    </footer>
  );
};
