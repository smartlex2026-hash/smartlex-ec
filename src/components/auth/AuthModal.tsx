import React, { useState } from 'react';
import { RegisterWhatsAppForm } from './RegisterWhatsAppForm';
import { LoginForm } from './LoginForm';
import { RubikCubeLogo } from '../common/RubikCubeLogo';
import { X, MessageCircle } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: 'register' | 'login';
  onClose: () => void;
  onAuthSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode = 'register',
  onClose,
  onAuthSuccess
}) => {
  const [mode, setMode] = useState<'register' | 'login'>(initialMode);

  // Sincronizar modo si cambia initialMode
  React.useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Fondo oscuro con desenfoque */}
      <div
        className="fixed inset-0 bg-[#06070B]/85 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Contenedor del Modal */}
      <div className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-[#10121A]/95 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl z-10 text-white my-8">
        {/* Botón cerrar */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Encabezado del Modal con el Cubo de Rubik */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center p-1.5 rounded-xl bg-white/[0.04] border border-white/10 shadow-sm">
            <RubikCubeLogo size={36} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg text-white font-heading">
                SmartLex<span className="text-[#3ECF8E]">EC</span>
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-[#3ECF8E]/15 text-[#3ECF8E] border border-[#3ECF8E]/30 uppercase tracking-wider">
                Plan Free
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {mode === 'register'
                ? 'Activa tu acceso gratuito inmediato al portal web'
                : 'Inicia sesión para continuar en tu portal tributario'}
            </p>
          </div>
        </div>

        {/* Selector de pestañas */}
        <div className="flex rounded-xl bg-slate-900/90 p-1 border border-slate-800 mb-6">
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              mode === 'register'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5 text-emerald-300" />
            <span>Crear Cuenta Gratis</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              mode === 'login'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Iniciar Sesión
          </button>
        </div>

        {/* Formulario según pestaña activa */}
        {mode === 'register' ? (
          <RegisterWhatsAppForm
            onSuccess={onAuthSuccess}
            onSwitchToLogin={() => setMode('login')}
          />
        ) : (
          <LoginForm
            onSuccess={onAuthSuccess}
            onSwitchToRegister={() => setMode('register')}
          />
        )}
      </div>
    </div>
  );
};

