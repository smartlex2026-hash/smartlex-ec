import React from 'react';
import { RubikCubeLogo } from '../common/RubikCubeLogo';
import { MessageCircle, ShieldCheck } from 'lucide-react';

export const LandingFooter: React.FC = () => {
  return (
    <footer className="border-t border-white/10 bg-[#08090E] text-slate-400 py-14 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
        {/* Columna 1: Marca y Propuesta */}
        <div className="space-y-4 md:col-span-1">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center p-1 rounded-lg bg-white/[0.04] border border-white/10">
              <RubikCubeLogo size={28} />
            </div>
            <span className="font-extrabold text-lg text-white font-heading">
              SmartLex<span className="text-[#3ECF8E]">EC</span>
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Ecosistema de integración normativa para asistentes, contadores y juristas en Ecuador. Estructura unificada
            con trazabilidad histórica de reformas.
          </p>
          <div className="flex items-center gap-2 text-xs text-[#3ECF8E]">
            <ShieldCheck className="w-4 h-4" />
            <span>Datos oficiales del Registro Oficial</span>
          </div>
        </div>

        {/* Columna 2: Normas Troncales */}
        <div>
          <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Leyes Troncales</h4>
          <ul className="space-y-2.5 text-xs text-slate-300">
            <li>
              <a href="#integracion" className="hover:text-[#3ECF8E] transition-colors">
                Código Tributario
              </a>
            </li>
            <li>
              <a href="#integracion" className="hover:text-[#3ECF8E] transition-colors">
                Ley de Régimen Tributario Interno (LRTI)
              </a>
            </li>
            <li>
              <a href="#integracion" className="hover:text-[#3ECF8E] transition-colors">
                Reglamento a la LRTI (RLRTI)
              </a>
            </li>
            <li>
              <a href="#integracion" className="hover:text-[#3ECF8E] transition-colors">
                Resoluciones Generales del SRI
              </a>
            </li>
          </ul>
        </div>

        {/* Columna 3: Herramientas */}
        <div>
          <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Herramientas</h4>
          <ul className="space-y-2.5 text-xs text-slate-300">
            <li>
              <a href="#integracion" className="hover:text-[#3ECF8E] transition-colors">
                Integración Normativa Viva
              </a>
            </li>
            <li>
              <a href="#pilares" className="hover:text-[#3ECF8E] transition-colors">
                Máquina del Tiempo de Reformas
              </a>
            </li>
            <li>
              <a href="#pilares" className="hover:text-[#3ECF8E] transition-colors">
                Calculadora Progresiva Art. 36
              </a>
            </li>
            <li>
              <a href="#pilares" className="hover:text-[#3ECF8E] transition-colors">
                Simulador de Regímenes Fiscales
              </a>
            </li>
          </ul>
        </div>

        {/* Columna 4: Comunidad & Alertas WhatsApp */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Canal Oficial</h4>
          <p className="text-xs text-slate-400">
            Únete al canal oficial de WhatsApp para recibir boletines de reformas fiscales y alertas de vencimientos según tu noveno dígito.
          </p>
          <a
            href="https://chat.whatsapp.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-[#0C0D14] bg-[#3ECF8E] hover:bg-[#34D399] transition-all shadow-md"
          >
            <MessageCircle className="w-4 h-4 text-[#0C0D14]" />
            <span>Unirme al Canal de WhatsApp</span>
          </a>
        </div>
      </div>

      <div className="max-w-7xl mx-auto border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
        <p>© 2026 SmartLex Ecuador. Todos los derechos reservados.</p>
        <p className="flex items-center gap-1">
          Hecho con rigor tributario para los profesionales del Ecuador
        </p>
      </div>
    </footer>
  );
};
