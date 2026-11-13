import React, { useState } from 'react';
import { RubikCubeLogo } from '../common/RubikCubeLogo';
import { ArrowRight, Menu, X, MessageCircle } from 'lucide-react';

interface NavbarProps {
  onOpenRegister: () => void;
  onOpenLogin: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenRegister, onOpenLogin }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#0C0D14]/85 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Logotipo con el Cubo de Rubik 2x2 integrado */}
        <div
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <div className="relative flex items-center justify-center p-1.5 rounded-xl bg-white/[0.04] border border-white/10 shadow-sm group-hover:border-[#3ECF8E]/40 transition-all duration-300">
            <RubikCubeLogo size={34} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-xl tracking-tight text-white font-heading">
                SmartLex<span className="text-[#3ECF8E]">EC</span>
              </span>
              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-[#3ECF8E]/15 text-[#3ECF8E] border border-[#3ECF8E]/30 uppercase tracking-wider">
                Ecuador
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Ecosistema de Integración Legal</p>
          </div>
        </div>

        {/* Enlaces de escritorio */}
        <nav className="hidden md:flex items-center gap-8">
          <a href="#hero" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
            Inicio
          </a>
          <a href="#integracion" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
            Integración Legal
          </a>
          <a href="#pilares" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
            Ecosistema
          </a>
          <a href="#planes" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
            Planes
          </a>
          <a
            href="https://chat.whatsapp.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm font-medium text-[#3ECF8E] hover:text-emerald-300 transition-colors"
          >
            <span className="inline-block w-2 h-2 rounded-full bg-[#3ECF8E] animate-pulse" />
            Canal WhatsApp
          </a>
        </nav>

        {/* Acciones de escritorio (Estilo Supabase) */}
        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={onOpenLogin}
            className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            Iniciar Sesión
          </button>
          <button
            onClick={onOpenRegister}
            className="group relative inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-[#0C0D14] bg-[#3ECF8E] hover:bg-[#34D399] transition-all duration-200 shadow-[0_0_20px_rgba(62,207,142,0.35)] hover:shadow-[0_0_28px_rgba(62,207,142,0.55)] cursor-pointer"
          >
            <span>Crear Cuenta Gratis</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 text-[#0C0D14]" />
          </button>
        </div>

        {/* Botón menú móvil */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Menú desplegable móvil */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-white/10 bg-[#0C0D14]/95 px-4 pt-2 pb-6 space-y-4">
          <div className="flex flex-col space-y-3 pt-2">
            <a
              href="#hero"
              onClick={() => setMobileMenuOpen(false)}
              className="text-base font-medium text-slate-200 py-2 border-b border-white/5"
            >
              Inicio
            </a>
            <a
              href="#integracion"
              onClick={() => setMobileMenuOpen(false)}
              className="text-base font-medium text-slate-200 py-2 border-b border-white/5"
            >
              Integración Legal
            </a>
            <a
              href="#pilares"
              onClick={() => setMobileMenuOpen(false)}
              className="text-base font-medium text-slate-200 py-2 border-b border-white/5"
            >
              Ecosistema
            </a>
            <a
              href="#planes"
              onClick={() => setMobileMenuOpen(false)}
              className="text-base font-medium text-slate-200 py-2 border-b border-white/5"
            >
              Planes
            </a>
          </div>
          <div className="flex flex-col gap-3 pt-2">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenLogin();
              }}
              className="w-full py-2.5 text-center text-sm font-medium text-slate-300 border border-slate-700 rounded-xl"
            >
              Iniciar Sesión
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenRegister();
              }}
              className="w-full py-2.5 text-center text-sm font-bold text-[#0C0D14] bg-[#3ECF8E] rounded-xl shadow-[0_0_20px_rgba(62,207,142,0.4)]"
            >
              Crear Cuenta Gratis (Plan Free)
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
