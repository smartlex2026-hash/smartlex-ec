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
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onOpenRegister,
  onOpenLogin,
  onSelectPlan
}) => {
  const scrollToShowcase = () => {
    const el = document.getElementById('telarana');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="relative min-h-screen bg-[#060714] text-white overflow-x-hidden selection:bg-purple-500 selection:text-white">
      {/* 1. Fondo atmosférico espacial con micro-estrellas y gran arco de luz */}
      <AtmosphericBackground />

      {/* 2. Barra de Navegación superior */}
      <Navbar onOpenRegister={onOpenRegister} onOpenLogin={onOpenLogin} />

      {/* 3. Área Hero principal */}
      <main>
        <HeroSection onOpenRegister={onOpenRegister} onExploreDemo={scrollToShowcase} />

        {/* 4. Demostración Interactiva de la Telaraña Normativa */}
        <InteractiveShowcase />

        {/* 5. Pilares Funcionales del Sistema */}
        <PillarsGrid onOpenRegister={onOpenRegister} />

        {/* 6. Tabla Comparativa de Planes (Free con WhatsApp, Pro, Plus) */}
        <PricingTable onSelectPlan={onSelectPlan} />
      </main>

      {/* 7. Pie de Página */}
      <LandingFooter />
    </div>
  );
};

