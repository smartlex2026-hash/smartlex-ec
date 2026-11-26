import React, { useState, useEffect } from 'react';
import { RegisterWhatsAppForm } from './RegisterWhatsAppForm';
import { LoginForm } from './LoginForm';
import { RubikCubeLogo } from '../common/RubikCubeLogo';
import { X, MessageCircle, LogIn } from 'lucide-react';

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
  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  // Cerrar al pulsar Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      {/* Fondo oscuro con desenfoque */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Contenedor del Modal adaptado al modo */}
      <div
        className={`relative w-full ${
          mode === 'register' ? 'max-w-xl' : 'max-w-md'
        } rounded-2xl border border-[var(--color-borde)] bg-[var(--color-superficie)] shadow-2xl z-10 text-[var(--color-texto)] my-auto max-h-[92vh] flex flex-col overflow-hidden transition-all duration-200`}
      >
        {/* Cabecera compacta */}
        <div className="px-5 sm:px-6 py-4 border-b border-[var(--color-borde)] bg-[var(--color-fondo)] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center justify-center p-1.5 rounded-lg bg-[var(--color-superficie)] border border-[var(--color-borde)] shrink-0">
              <RubikCubeLogo size={30} />
            </div>
            <div className="min-w-0 text-left">
              <div className="flex items-center gap-2">
                <h2
                  id="auth-modal-title"
                  className="font-extrabold text-base sm:text-lg text-[var(--color-texto)] font-heading truncate"
                >
                  SmartLex<span className="text-[var(--color-secundario)]">EC</span>
                </h2>
                {mode === 'register' && (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-[var(--color-secundario-suave)] text-[var(--color-exito-texto)] border border-[var(--color-secundario-borde)] uppercase tracking-wider shrink-0">
                    Plan Free
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--color-texto-secundario)] truncate">
                {mode === 'register'
                  ? 'Activa tu acceso gratuito al portal tributario'
                  : 'Accede a tu biblioteca normativa y calculadoras'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ventana"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-texto-secundario)] hover:text-[var(--color-texto)] hover:bg-[var(--color-superficie-secundaria)] transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selector de pestañas */}
        <div className="px-5 sm:px-6 pt-4 shrink-0">
          <div className="grid grid-cols-2 rounded-lg bg-[var(--color-superficie-secundaria)] p-1 border border-[var(--color-borde)]">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`py-2 px-3 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                mode === 'login'
                  ? 'bg-[var(--color-secundario)] text-[var(--color-texto-sobre-secundario)] shadow-xs'
                  : 'text-[var(--color-texto-secundario)] hover:text-[var(--color-texto)]'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Iniciar sesión</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`py-2 px-3 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                mode === 'register'
                  ? 'bg-[var(--color-secundario)] text-[var(--color-texto-sobre-secundario)] shadow-xs'
                  : 'text-[var(--color-texto-secundario)] hover:text-[var(--color-texto)]'
              }`}
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Crear cuenta gratis</span>
            </button>
          </div>
        </div>

        {/* Cuerpo con desplazamiento interno limpio */}
        <div className="px-5 sm:px-6 py-5 overflow-y-auto">
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
    </div>
  );
};
