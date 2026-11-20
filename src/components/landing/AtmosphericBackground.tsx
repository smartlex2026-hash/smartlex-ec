import React from 'react';

interface AtmosphericBackgroundProps {
  isDark: boolean;
}

export const AtmosphericBackground: React.FC<AtmosphericBackgroundProps> = ({ isDark }) => {
  return (
    <div
      className={`fixed inset-0 pointer-events-none -z-20 overflow-hidden transition-colors duration-300 ${
        isDark ? 'bg-[#0d0d0f]' : 'bg-[#fafafa]'
      }`}
    >
      {/* Malla geométrica minimalista monocromática */}
      <div
        className={`absolute inset-0 bg-[size:36px_36px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,#000_65%,transparent_100%)] ${
          isDark
            ? 'bg-[linear-gradient(to_right,#ffffff06_1px,transparent_1px),linear-gradient(to_bottom,#ffffff06_1px,transparent_1px)] opacity-80'
            : 'bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] opacity-70'
        }`}
      />

      {/* Luz cenital monocromática sutil */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -z-10 w-[1000px] max-w-[120vw] h-[460px] pointer-events-none">
        <div
          className={`absolute inset-0 blur-[120px] rounded-full transform -translate-y-1/3 ${
            isDark
              ? 'bg-gradient-to-b from-white/[0.05] via-zinc-500/[0.03] to-transparent'
              : 'bg-gradient-to-b from-zinc-300/40 via-zinc-200/20 to-transparent'
          }`}
        />
        <div
          className={`absolute top-0 left-1/2 -translate-x-1/2 w-3/5 h-[1px] bg-gradient-to-r from-transparent ${
            isDark ? 'via-white/20' : 'via-zinc-400/40'
          } to-transparent`}
        />
      </div>
    </div>
  );
};
