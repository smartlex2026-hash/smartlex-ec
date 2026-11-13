import React from 'react';

interface RubikCubeLogoProps {
  className?: string;
  size?: number;
}

export const RubikCubeLogo: React.FC<RubikCubeLogoProps> = ({ className = 'w-9 h-9', size = 36 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        {/* ================================================================= */}
        {/* COLORES MODERNOS METALIZADOS (CUBO TOTALMENTE ARMADO)             */}
        {/* ================================================================= */}
        
        {/* CARA SUPERIOR: Menta Esmeralda Pastel Metalizado (Iluminación cenital) */}
        <linearGradient id="faceTopMint" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E6FFFA" />
          <stop offset="40%" stopColor="#A7F3D0" />
          <stop offset="80%" stopColor="#6EE7B7" />
          <stop offset="100%" stopColor="#34D399" />
        </linearGradient>

        {/* CARA IZQUIERDA: Lavanda / Lila Pastel Metalizado (Sombra lateral suave) */}
        <linearGradient id="faceLeftLavender" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F5F3FF" />
          <stop offset="40%" stopColor="#DDD6FE" />
          <stop offset="80%" stopColor="#C4B5FD" />
          <stop offset="100%" stopColor="#A78BFA" />
        </linearGradient>

        {/* CARA DERECHA: Gris Ratón Metalizado Oscuro (Acabado mecánico plomo / gunmetal) */}
        <linearGradient id="faceRightMouseGrey" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#767B85" />
          <stop offset="35%" stopColor="#585D66" />
          <stop offset="75%" stopColor="#3E4249" />
          <stop offset="100%" stopColor="#2A2D33" />
        </linearGradient>

        {/* Sombra suave de base */}
        <filter id="rubikSolvedGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#000000" floodOpacity="0.35" />
        </filter>
      </defs>

      <g filter="url(#rubikSolvedGlow)">
        {/* ================================================================= */}
        {/* CARA SUPERIOR: 4 bloques Menta Pastel Metalizado (Cubo Armado)   */}
        {/* Líneas negras finas (stroke="#000000" strokeWidth="0.8")         */}
        {/* ================================================================= */}
        {/* Bloque 1: Superior-Trasero */}
        <path
          d="M32 6 L42.5 12 L32 18 L21.5 12 Z"
          fill="url(#faceTopMint)"
          stroke="#000000"
          strokeWidth="0.8"
          strokeLinejoin="round"
        />

        {/* Bloque 2: Superior-Derecho */}
        <path
          d="M43.5 12.6 L54 18.6 L43.5 24.6 L33 18.6 Z"
          fill="url(#faceTopMint)"
          stroke="#000000"
          strokeWidth="0.8"
          strokeLinejoin="round"
        />

        {/* Bloque 3: Superior-Izquierdo */}
        <path
          d="M20.5 12.6 L31 18.6 L20.5 24.6 L10 18.6 Z"
          fill="url(#faceTopMint)"
          stroke="#000000"
          strokeWidth="0.8"
          strokeLinejoin="round"
        />

        {/* Bloque 4: Superior-Frontal */}
        <path
          d="M32 19.2 L42.5 25.2 L32 31.2 L21.5 25.2 Z"
          fill="url(#faceTopMint)"
          stroke="#000000"
          strokeWidth="0.8"
          strokeLinejoin="round"
        />

        {/* ================================================================= */}
        {/* CARA IZQUIERDA: 4 bloques Lavanda Pastel Metalizado (Cubo Armado) */}
        {/* Líneas negras finas (stroke="#000000" strokeWidth="0.8")         */}
        {/* ================================================================= */}
        {/* Bloque 1: Izquierdo Superior-Fondo */}
        <path
          d="M9.5 19.5 L20 25.5 V37.5 L9.5 31.5 Z"
          fill="url(#faceLeftLavender)"
          stroke="#000000"
          strokeWidth="0.8"
          strokeLinejoin="round"
        />

        {/* Bloque 2: Izquierdo Superior-Centro */}
        <path
          d="M21 26.1 L31.5 32.1 V44.1 L21 38.1 Z"
          fill="url(#faceLeftLavender)"
          stroke="#000000"
          strokeWidth="0.8"
          strokeLinejoin="round"
        />

        {/* Bloque 3: Izquierdo Inferior-Fondo */}
        <path
          d="M9.5 32.5 L20 38.5 V50.5 L9.5 44.5 Z"
          fill="url(#faceLeftLavender)"
          stroke="#000000"
          strokeWidth="0.8"
          strokeLinejoin="round"
        />

        {/* Bloque 4: Izquierdo Inferior-Centro */}
        <path
          d="M21 39.1 L31.5 45.1 V57.1 L21 51.1 Z"
          fill="url(#faceLeftLavender)"
          stroke="#000000"
          strokeWidth="0.8"
          strokeLinejoin="round"
        />

        {/* ================================================================= */}
        {/* CARA DERECHA: 4 bloques Gris Ratón Metalizado Oscuro (Cubo Armado)*/}
        {/* Líneas negras finas (stroke="#000000" strokeWidth="0.8")         */}
        {/* ================================================================= */}
        {/* Bloque 1: Derecho Superior-Centro */}
        <path
          d="M32.5 32.1 L43 26.1 V38.1 L32.5 44.1 Z"
          fill="url(#faceRightMouseGrey)"
          stroke="#000000"
          strokeWidth="0.8"
          strokeLinejoin="round"
        />

        {/* Bloque 2: Derecho Superior-Fondo */}
        <path
          d="M44 25.5 L54.5 19.5 V31.5 L44 37.5 Z"
          fill="url(#faceRightMouseGrey)"
          stroke="#000000"
          strokeWidth="0.8"
          strokeLinejoin="round"
        />

        {/* Bloque 3: Derecho Inferior-Centro */}
        <path
          d="M32.5 45.1 L43 39.1 V51.1 L32.5 57.1 Z"
          fill="url(#faceRightMouseGrey)"
          stroke="#000000"
          strokeWidth="0.8"
          strokeLinejoin="round"
        />

        {/* Bloque 4: Derecho Inferior-Fondo */}
        <path
          d="M44 38.5 L54.5 32.5 V44.5 L44 50.5 Z"
          fill="url(#faceRightMouseGrey)"
          stroke="#000000"
          strokeWidth="0.8"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
};
