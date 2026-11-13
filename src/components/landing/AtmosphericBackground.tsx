import React from 'react';

export const AtmosphericBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none -z-20 overflow-hidden bg-[#0C0D14]">
      {/* 1. Malla Geométrica sutil estilo Supabase (Grid Matrix) con máscara radial */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:36px_36px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,#000_65%,transparent_100%)] opacity-80" />

      {/* 2. Resplandor Esmeralda Supabase (#3ECF8E) en el centro superior */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -z-10 w-[1100px] max-w-[130vw] h-[520px] pointer-events-none">
        {/* Degradado dual: Esmeralda Supabase + Púrpura Neón vivo */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#3ECF8E]/20 via-purple-600/15 to-transparent blur-[120px] rounded-full transform -translate-y-1/3" />
        
        {/* Línea horizontal luminosa superior de acento */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/5 h-[1px] bg-gradient-to-r from-transparent via-[#3ECF8E]/60 to-transparent" />
      </div>

      {/* 3. Resplandor secundario inferior para dar calidez y balance */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-gradient-to-t from-indigo-950/25 via-emerald-950/15 to-transparent blur-[100px] rounded-full pointer-events-none" />
    </div>
  );
};
