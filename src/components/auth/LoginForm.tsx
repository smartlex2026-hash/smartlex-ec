import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight, LogIn, KeyRound, CheckCircle2 } from 'lucide-react';

interface LoginFormProps {
  onSuccess: () => void;
  onSwitchToRegister: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess, onSwitchToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Estados para recuperación de contraseña
  const [isForgotView, setIsForgotView] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email.trim() || !password) {
      setErrorMsg('Por favor, ingresa tu correo y contraseña.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password
      });

      if (error) throw error;

      onSuccess();
    } catch (err: any) {
      console.error('Error al iniciar sesión:', err);
      setErrorMsg(err.message || 'Credenciales incorrectas. Verifica tu correo y contraseña.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email.trim()) {
      setErrorMsg('Por favor, introduce tu correo para enviarte el enlace de recuperación.');
      return;
    }

    setResetLoading(true);

    try {
      const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/` : undefined;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: redirectUrl
      });

      if (error) throw error;

      setResetSuccess(true);
    } catch (err: any) {
      console.error('Error al recuperar contraseña:', err);
      setErrorMsg(err.message || 'No se pudo enviar el correo de recuperación. Verifica la dirección ingresada.');
    } finally {
      setResetLoading(false);
    }
  };

  if (isForgotView) {
    return (
      <div className="space-y-4 text-left">
        <div className="p-3.5 bg-[var(--color-info-fondo)] border border-[var(--color-info-borde)] rounded-xl">
          <div className="flex items-center gap-2 text-[var(--color-info)] font-bold text-xs mb-1">
            <KeyRound className="w-4 h-4 shrink-0" />
            <span>Recuperación de contraseña</span>
          </div>
          <p className="text-xs text-[var(--color-texto-secundario)] leading-relaxed">
            Escribe tu correo registrado y te enviaremos un enlace seguro para restablecer tu contraseña.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-[var(--color-error-fondo)] border border-[var(--color-error-borde)] text-[var(--color-error)] text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {resetSuccess ? (
          <div className="p-4 rounded-xl bg-[var(--color-exito-fondo)] border border-[var(--color-exito-borde)] text-[var(--color-exito-texto)] text-xs space-y-3">
            <div className="flex items-center gap-2 font-bold">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>¡Correo de recuperación enviado!</span>
            </div>
            <p className="text-xs text-[var(--color-texto-secundario)] leading-relaxed">
              Hemos enviado las instrucciones a <strong className="text-[var(--color-texto)]">{email.trim().toLowerCase()}</strong>. Revisa tu bandeja de entrada o spam.
            </p>
            <button
              type="button"
              onClick={() => {
                setIsForgotView(false);
                setResetSuccess(false);
                setErrorMsg(null);
              }}
              className="w-full h-10 rounded-lg text-xs font-bold btn-smartlex-secondary cursor-pointer"
            >
              Volver al inicio de sesión
            </button>
          </div>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--color-texto)] mb-1.5">
                Correo electrónico registrado
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[var(--color-icono-sutil)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="tu-correo@ejemplo.com"
                  className="w-full h-10 pl-9 pr-3 rounded-lg bg-[var(--color-fondo)] border border-[var(--color-borde)] text-[var(--color-texto)] placeholder:text-[var(--color-icono-sutil)] text-sm focus:outline-none focus:border-[var(--color-secundario)] focus:ring-1 focus:ring-[var(--color-secundario)]"
                />
              </div>
            </div>

            <div className="pt-1 flex flex-col gap-2">
              <button
                type="submit"
                disabled={resetLoading}
                className="w-full h-10 rounded-lg font-bold text-sm bg-[var(--color-secundario)] hover:bg-[var(--color-secundario-hover)] text-[var(--color-texto-sobre-secundario)] disabled:opacity-50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {resetLoading ? (
                  <span>Enviando enlace...</span>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Enviar enlace de recuperación</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsForgotView(false);
                  setErrorMsg(null);
                }}
                className="w-full h-9 rounded-lg text-xs font-medium text-[var(--color-texto-secundario)] hover:text-[var(--color-texto)] hover:bg-[var(--color-superficie-secundaria)] transition-colors cursor-pointer"
              >
                Cancelar y regresar
              </button>
            </div>
          </form>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-left">
      {errorMsg && (
        <div className="p-3 rounded-lg bg-[var(--color-error-fondo)] border border-[var(--color-error-borde)] text-[var(--color-error)] text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Correo electrónico */}
      <div>
        <label className="block text-xs font-semibold text-[var(--color-texto)] mb-1.5">
          Correo electrónico
        </label>
        <div className="relative">
          <Mail className="w-4 h-4 text-[var(--color-icono-sutil)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="tu-correo@ejemplo.com"
            className="w-full h-10 pl-9 pr-3 rounded-lg bg-[var(--color-fondo)] border border-[var(--color-borde)] text-[var(--color-texto)] placeholder:text-[var(--color-icono-sutil)] text-sm focus:outline-none focus:border-[var(--color-secundario)] focus:ring-1 focus:ring-[var(--color-secundario)]"
          />
        </div>
      </div>

      {/* Contraseña */}
      <div>
        <div className="flex items-center justify-between mb-1.5 gap-2">
          <label className="block text-xs font-semibold text-[var(--color-texto)]">
            Contraseña
          </label>
          <button
            type="button"
            onClick={() => {
              setIsForgotView(true);
              setErrorMsg(null);
              setResetSuccess(false);
            }}
            className="text-xs text-[var(--color-secundario)] hover:text-[var(--color-secundario-hover)] font-medium cursor-pointer"
          >
            ¿Olvidaste tu contraseña?
          </button>
        </div>
        <div className="relative">
          <Lock className="w-4 h-4 text-[var(--color-icono-sutil)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type={showPassword ? 'text' : 'password'}
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full h-10 pl-9 pr-10 rounded-lg bg-[var(--color-fondo)] border border-[var(--color-borde)] text-[var(--color-texto)] placeholder:text-[var(--color-icono-sutil)] text-sm focus:outline-none focus:border-[var(--color-secundario)] focus:ring-1 focus:ring-[var(--color-secundario)]"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-icono-sutil)] hover:text-[var(--color-texto)] cursor-pointer"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Botón de Iniciar Sesión */}
      <div className="pt-1">
        <button
          type="submit"
          disabled={loading}
          className="w-full h-10 rounded-lg font-bold text-sm bg-[var(--color-secundario)] hover:bg-[var(--color-secundario-hover)] text-[var(--color-texto-sobre-secundario)] disabled:opacity-50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          {loading ? (
            <span>Comprobando credenciales...</span>
          ) : (
            <>
              <LogIn className="w-4 h-4" />
              <span>Ingresar a SmartLex</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      {/* Cambiar a Registro */}
      <div className="text-center pt-2 border-t border-[var(--color-borde)]">
        <p className="text-xs text-[var(--color-texto-secundario)]">
          ¿Aún no tienes cuenta?{' '}
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="text-[var(--color-secundario)] hover:text-[var(--color-secundario-hover)] font-semibold cursor-pointer"
          >
            Regístrate gratis
          </button>
        </p>
      </div>
    </form>
  );
};
