import React, { useState } from 'react';
import { RubikCubeLogo } from '../common/RubikCubeLogo';
import { ArrowRight, Menu, X, Sun, Moon } from 'lucide-react';

interface NavbarProps {
  onOpenRegister: () => void;
  onOpenLogin: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenRegister,
  onOpenLogin,
  isDark,
  onToggleTheme
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header
      className={`sticky top-0 z-50 w-full border-b backdrop-blur-xl transition-colors duration-300 ${
        isDark
          ? 'border-[#26262b] bg-[#0d0d0f]/90 text-[#f4f4f5]'
          : 'border-[#e4e4e7] bg-white/90 text-[#09090b]'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Logotipo */}
        <div
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <div
            className={`relative flex items-center justify-center p-1.5 rounded-xl border transition-all duration-200 ${
              isDark
                ? 'bg-[#151518] border-[#26262b] group-hover:border-[#3f3f46]'
                : 'bg-[#f4f4f5] border-[#e4e4e7] group-hover:border-[#a1a1aa]'
            }`}
          >
            <RubikCubeLogo size={32} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span
                className={`font-extrabold text-xl tracking-tight font-heading ${
                  isDark ? 'text-[#f4f4f5]' : 'text-[#09090b]'
                }`}
              >
                SmartLex<span className="text-[#3ECF8E]">EC</span>
              </span>
              <span
                className={`px-1.5 py-0.5 text-[10px] font-bold rounded border uppercase tracking-wider ${
                  isDark
                    ? 'bg-[#151518] text-[#d4d4d8] border-[#26262b]'
                    : 'bg-[#f4f4f5] text-[#3f3f46] border-[#d4d4d8]'
                }`}
              >
                Ecuador
              </span>
            </div>
            <p className={`text-[11px] font-medium ${isDark ? 'text-[#a1a1aa]' : 'text-[#52525b]'}`}>
              Ecosistema de Integración Legal
            </p>
          </div>
        </div>

        {/* Enlaces de escritorio */}
        <nav className="hidden md:flex items-center gap-8">
          <a
            href="#hero"
            className={`text-sm font-medium transition-colors ${
              isDark ? 'text-[#a1a1aa] hover:text-[#f4f4f5]' : 'text-[#52525b] hover:text-[#09090b]'
            }`}
          >
            Inicio
          </a>
          <a
            href="#integracion"
            className={`text-sm font-medium transition-colors ${
              isDark ? 'text-[#a1a1aa] hover:text-[#f4f4f5]' : 'text-[#52525b] hover:text-[#09090b]'
            }`}
          >
            Integración Legal
          </a>
          <a
            href="#pilares"
            className={`text-sm font-medium transition-colors ${
              isDark ? 'text-[#a1a1aa] hover:text-[#f4f4f5]' : 'text-[#52525b] hover:text-[#09090b]'
            }`}
          >
            Ecosistema
          </a>
          <a
            href="#planes"
            className={`text-sm font-medium transition-colors ${
              isDark ? 'text-[#a1a1aa] hover:text-[#f4f4f5]' : 'text-[#52525b] hover:text-[#09090b]'
            }`}
          >
            Planes
          </a>
          <a
            href="https://chat.whatsapp.com"
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-1.5 text-sm font-semibold transition-colors ${
              isDark ? 'text-[#e4e4e7] hover:text-white' : 'text-[#18181b] hover:text-black'
            }`}
          >
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                isDark ? 'bg-[#e4e4e7]' : 'bg-[#18181b]'
              }`}
            />
            Canal WhatsApp
          </a>
        </nav>

        {/* Acciones de escritorio + Botón de Modo Noche / Modo Claro */}
        <div className="hidden md:flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleTheme}
            title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo noche'}
            aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo noche'}
            className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold ${
              isDark
                ? 'bg-[#151518] border-[#26262b] text-[#e4e4e7] hover:bg-[#1c1c21] hover:border-[#3f3f46]'
                : 'bg-[#f4f4f5] border-[#e4e4e7] text-[#18181b] hover:bg-[#e4e4e7]'
            }`}
          >
            {isDark ? (
              <>
                <Sun className="w-4 h-4 text-[#f4f4f5]" />
                <span className="hidden lg:inline">Modo Claro</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-[#18181b]" />
                <span className="hidden lg:inline">Modo Noche</span>
              </>
            )}
          </button>

          <button
            onClick={onOpenLogin}
            className={`px-4 py-2 text-sm font-semibold transition-colors cursor-pointer ${
              isDark ? 'text-[#d4d4d8] hover:text-white' : 'text-[#3f3f46] hover:text-[#09090b]'
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            onClick={onOpenRegister}
            className={`group relative inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer shadow-sm ${
              isDark
                ? 'text-[#06140d] bg-[#3ECF8E] hover:bg-[#5ddba5]'
                : 'text-white bg-[#18181b] hover:bg-[#27272a]'
            }`}
          >
            <span>Crear Cuenta Gratis</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>

        {/* Controles móviles: Icono de Modo Noche + Menú */}
        <div className="flex md:hidden items-center gap-2">
          <button
            type="button"
            onClick={onToggleTheme}
            title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo noche'}
            className={`p-2 rounded-lg border ${
              isDark
                ? 'bg-[#151518] border-[#26262b] text-[#f4f4f5]'
                : 'bg-[#f4f4f5] border-[#e4e4e7] text-[#18181b]'
            }`}
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`p-2 rounded-lg ${
              isDark ? 'text-[#a1a1aa] hover:text-white' : 'text-[#52525b] hover:text-black'
            }`}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Menú desplegable móvil */}
      {mobileMenuOpen && (
        <div
          className={`md:hidden border-b px-4 pt-2 pb-6 space-y-4 ${
            isDark ? 'border-[#26262b] bg-[#0d0d0f]/95' : 'border-[#e4e4e7] bg-white/95'
          }`}
        >
          <div className="flex flex-col space-y-3 pt-2">
            <a
              href="#hero"
              onClick={() => setMobileMenuOpen(false)}
              className={`text-base font-medium py-2 border-b ${
                isDark ? 'text-[#e4e4e7] border-[#26262b]' : 'text-[#18181b] border-[#e4e4e7]'
              }`}
            >
              Inicio
            </a>
            <a
              href="#integracion"
              onClick={() => setMobileMenuOpen(false)}
              className={`text-base font-medium py-2 border-b ${
                isDark ? 'text-[#e4e4e7] border-[#26262b]' : 'text-[#18181b] border-[#e4e4e7]'
              }`}
            >
              Integración Legal
            </a>
            <a
              href="#pilares"
              onClick={() => setMobileMenuOpen(false)}
              className={`text-base font-medium py-2 border-b ${
                isDark ? 'text-[#e4e4e7] border-[#26262b]' : 'text-[#18181b] border-[#e4e4e7]'
              }`}
            >
              Ecosistema
            </a>
            <a
              href="#planes"
              onClick={() => setMobileMenuOpen(false)}
              className={`text-base font-medium py-2 border-b ${
                isDark ? 'text-[#e4e4e7] border-[#26262b]' : 'text-[#18181b] border-[#e4e4e7]'
              }`}
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
              className={`w-full py-2.5 text-center text-sm font-semibold border rounded-xl ${
                isDark
                  ? 'text-[#e4e4e7] border-[#26262b] bg-[#151518]'
                  : 'text-[#18181b] border-[#d4d4d8] bg-[#f4f4f5]'
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenRegister();
              }}
              className={`w-full py-2.5 text-center text-sm font-bold rounded-xl ${
                isDark ? 'text-[#0d0d0f] bg-[#f4f4f5]' : 'text-white bg-[#18181b]'
              }`}
            >
              Crear Cuenta Gratis (Plan Free)
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
