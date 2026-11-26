import React, { useState } from 'react';
import { RubikCubeLogo } from '../common/RubikCubeLogo';
import { ArrowRight, Menu, X, Sun, Moon, BookOpen } from 'lucide-react';

interface NavbarProps {
  onOpenRegister: () => void;
  onOpenLogin: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onEnterLibrary?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenRegister,
  onOpenLogin,
  isDark,
  onToggleTheme,
  onEnterLibrary
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full h-16 border-b border-[var(--color-borde)] bg-[var(--color-header-fondo)] text-[var(--color-texto)] backdrop-blur-md transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between gap-4">
        {/* Marca */}
        <button
          type="button"
          title="Ir al inicio de la Biblioteca Normativa"
          className="flex items-center gap-2.5 cursor-pointer group text-left shrink-0"
          onClick={() => {
            if (onEnterLibrary) {
              onEnterLibrary();
            } else {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}
        >
          <div className="flex items-center justify-center p-1.5 rounded-lg border border-[var(--color-borde)] bg-[var(--color-superficie)] group-hover:border-[var(--color-secundario)] transition-colors duration-200">
            <RubikCubeLogo size={28} />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-lg tracking-tight font-heading text-[var(--color-texto)]">
              SmartLex<span className="text-[var(--color-secundario)]">EC</span>
            </span>
            <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold rounded border uppercase tracking-wider bg-[var(--color-superficie-secundaria)] text-[var(--color-texto-secundario)] border-[var(--color-borde)]">
              Ecuador
            </span>
          </div>
        </button>

        {/* Navegación principal centrada (escritorio) */}
        <nav aria-label="Navegación principal" className="hidden lg:flex items-center gap-7">
          <a
            href="#hero"
            className="text-sm font-medium transition-all duration-200 text-[var(--color-texto-secundario)] hover:text-[var(--color-texto)] hover:-translate-y-px"
          >
            Inicio
          </a>
          <a
            href="#integracion"
            className="text-sm font-medium transition-all duration-200 text-[var(--color-texto-secundario)] hover:text-[var(--color-texto)] hover:-translate-y-px"
          >
            Integración
          </a>
          <a
            href="#pilares"
            className="text-sm font-medium transition-all duration-200 text-[var(--color-texto-secundario)] hover:text-[var(--color-texto)] hover:-translate-y-px"
          >
            Módulos
          </a>
          <a
            href="#planes"
            className="text-sm font-medium transition-all duration-200 text-[var(--color-texto-secundario)] hover:text-[var(--color-texto)] hover:-translate-y-px"
          >
            Planes
          </a>
          {onEnterLibrary && (
            <button
              type="button"
              onClick={onEnterLibrary}
              className="text-sm font-medium transition-all duration-200 text-[var(--color-texto-secundario)] hover:text-[var(--color-secundario)] hover:-translate-y-px inline-flex items-center gap-1.5 cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Biblioteca</span>
            </button>
          )}
        </nav>

        {/* Acciones de escritorio y tablet */}
        <div className="hidden md:flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onToggleTheme}
            title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo noche'}
            aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo noche'}
            className="w-9 h-9 rounded-lg border border-[var(--color-borde)] bg-[var(--color-superficie)] text-[var(--color-texto)] hover:bg-[var(--color-superficie-secundaria)] hover:border-[var(--color-borde-fuerte)] transition-colors duration-200 cursor-pointer flex items-center justify-center"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={onOpenLogin}
            className="btn-cta-secondary px-3.5 h-9 rounded-lg text-sm font-semibold cursor-pointer text-[var(--color-texto)] border border-transparent"
          >
            Iniciar sesión
          </button>

          <button
            type="button"
            onClick={onOpenRegister}
            className="btn-cta-smartlex group px-4 h-9 rounded-lg font-bold text-sm cursor-pointer inline-flex items-center gap-1.5"
          >
            <span>Crear cuenta gratis</span>
            <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
          </button>
        </div>

        {/* Controles móviles */}
        <div className="flex md:hidden items-center gap-2">
          <button
            type="button"
            onClick={onToggleTheme}
            title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo noche'}
            aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo noche'}
            className="w-9 h-9 rounded-lg border border-[var(--color-borde)] bg-[var(--color-superficie)] text-[var(--color-texto)] flex items-center justify-center cursor-pointer"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
            className="w-9 h-9 rounded-lg border border-[var(--color-borde)] bg-[var(--color-superficie)] text-[var(--color-texto)] flex items-center justify-center cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Menú desplegable móvil */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[var(--color-borde)] bg-[var(--color-superficie)] px-4 py-4 space-y-4 shadow-lg sl-tab-fade">
          <nav className="flex flex-col divide-y divide-[var(--color-borde)]">
            <a
              href="#hero"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-medium py-2.5 text-[var(--color-texto)]"
            >
              Inicio
            </a>
            <a
              href="#integracion"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-medium py-2.5 text-[var(--color-texto)]"
            >
              Integración
            </a>
            <a
              href="#pilares"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-medium py-2.5 text-[var(--color-texto)]"
            >
              Módulos
            </a>
            <a
              href="#planes"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-medium py-2.5 text-[var(--color-texto)]"
            >
              Planes
            </a>
            {onEnterLibrary && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onEnterLibrary();
                }}
                className="text-sm font-semibold py-2.5 text-left text-[var(--color-secundario)] flex items-center gap-2 cursor-pointer"
              >
                <BookOpen className="w-4 h-4" />
                <span>Entrar a la Biblioteca</span>
              </button>
            )}
          </nav>

          <div className="grid grid-cols-1 gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenLogin();
              }}
              className="btn-cta-secondary w-full py-2.5 text-center text-sm font-semibold border border-[var(--color-borde)] bg-[var(--color-superficie-secundaria)] text-[var(--color-texto)] rounded-lg cursor-pointer"
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenRegister();
              }}
              className="btn-cta-smartlex group w-full py-2.5 text-center text-sm font-bold rounded-lg cursor-pointer inline-flex items-center justify-center gap-1.5"
            >
              <span>Crear cuenta gratis</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
