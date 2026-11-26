import React from 'react';

interface AtmosphericBackgroundProps {
  isDark: boolean;
}

export const AtmosphericBackground: React.FC<AtmosphericBackgroundProps> = ({ isDark }) => {
  return (
    <div className="fixed inset-0 pointer-events-none -z-20 overflow-hidden transition-colors duration-300 bg-[var(--color-fondo)]">
      {/* Cuadrícula arquitectónica muy tenue en la franja superior */}
      <div
        className={`absolute inset-0 bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_75%_55%_at_50%_0%,#000_60%,transparent_100%)] ${
          isDark
            ? 'bg-[linear-gradient(to_right,rgba(243,244,246,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(243,244,246,0.035)_1px,transparent_1px)]'
            : 'bg-[linear-gradient(to_right,rgba(42,45,51,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(42,45,51,0.04)_1px,transparent_1px)]'
        }`}
      />

      {/* Matiz cenital discreto acorde a la paleta plomo y esmeralda */}
      <div className="absolute top-0 inset-x-0 h-[380px] pointer-events-none">
        <div
          className={`mx-auto max-w-5xl h-full blur-[110px] transform -translate-y-1/2 rounded-full ${
            isDark
              ? 'bg-[radial-gradient(ellipse_at_top,rgba(52,211,153,0.08),rgba(42,45,51,0.18)_55%,transparent_80%)]'
              : 'bg-[radial-gradient(ellipse_at_top,rgba(4,120,87,0.05),rgba(220,224,230,0.35)_55%,transparent_80%)]'
          }`}
        />
      </div>
    </div>
  );
};
