import React from 'react';
import { AtmosphericBackground } from './AtmosphericBackground';
import { Navbar } from './Navbar';
import { HeroSection } from './HeroSection';
import { InteractiveShowcase } from './InteractiveShowcase';
import { PillarsGrid } from './PillarsGrid';
import { PricingTable } from './PricingTable';
import { LandingFooter } from './LandingFooter';

interface LandingPageProps {
  onOpenRegister: () => void;
  onOpenLogin: () => void;
  onSelectPlan: (planCode: 'free' | 'premium' | 'professional') => void;
  isDark?: boolean;
  onToggleTheme?: () => void;
  onEnterLibrary?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onOpenRegister,
  onOpenLogin,
  onSelectPlan,
  isDark = false,
  onToggleTheme = () => {},
  onEnterLibrary
}) => {
  const scrollToShowcase = () => {
    const el = document.getElementById('integracion');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden transition-colors duration-300 bg-[var(--color-fondo)] text-[var(--color-texto)]">
      {/* 1. Fondo sobrio gris plomo + acento esmeralda */}
      <AtmosphericBackground isDark={isDark} />

      {/* 2. Barra de Navegación superior con botón de Modo Noche / Modo Claro */}
      <Navbar
        onOpenRegister={onOpenRegister}
        onOpenLogin={onOpenLogin}
        isDark={isDark}
        onToggleTheme={onToggleTheme}
        onEnterLibrary={onEnterLibrary}
      />

      {/* 3. Área Hero principal */}
      <main>
        <HeroSection
          onOpenRegister={onOpenRegister}
          onExploreDemo={scrollToShowcase}
          isDark={isDark}
        />

        {/* 4. Demostración Interactiva de la Integración Normativa */}
        <InteractiveShowcase isDark={isDark} />

        {/* 5. Pilares Funcionales del Sistema */}
        <PillarsGrid onOpenRegister={onOpenRegister} isDark={isDark} />

        {/* 6. Tabla Comparativa de Planes */}
        <PricingTable onSelectPlan={onSelectPlan} isDark={isDark} />
      </main>

      {/* 7. Pie de Página */}
      <LandingFooter isDark={isDark} onEnterLibrary={onEnterLibrary} />
    </div>
  );
};
