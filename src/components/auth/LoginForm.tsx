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
      const { data, error } = await supabase.auth.signInWithPassword({
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
        <div className="p-3 bg-purple-950/40 border border-purple-500/30 rounded-xl">
          <div className="flex items-center gap-2 text-purple-300 font-bold text-xs mb-1">
            <KeyRound className="w-4 h-4 text-purple-400" />
            <span>Recuperación de Contraseña</span>
          </div>
          <p className="text-[11px] text-slate-300">
            Escribe tu correo registrado y te enviaremos al instante un enlace seguro para restablecer tu contraseña.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {resetSuccess ? (
          <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs space-y-3">
            <div className="flex items-center gap-2 text-emerald-300 font-bold">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>¡Correo de recuperación enviado!</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Hemos enviado las instrucciones a <strong className="text-white">{email.trim().toLowerCase()}</strong>. Revisa tu bandeja de entrada o carpeta de spam.
            </p>
            <button
              type="button"
              onClick={() => {
                setIsForgotView(false);
                setResetSuccess(false);
                setErrorMsg(null);
              }}
              className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
            >
              Volver al Inicio de Sesión
            </button>
          </div>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Correo Electrónico Registrado</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="tu-correo@ejemplo.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="submit"
                disabled={resetLoading}
                className="w-full py-3.5 rounded-xl font-bold text-sm text-white bg-purple-600 hover:bg-purple-500 disabled:opacity-50 transition-all shadow-[0_0_20px_rgba(168,85,247,0.4)] flex items-center justify-center gap-2 cursor-pointer"
              >
                {resetLoading ? (
                  <span>Enviando enlace...</span>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Enviar Enlace de Recuperación</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsForgotView(false);
                  setErrorMsg(null);
                }}
                className="w-full py-2.5 text-xs text-slate-400 hover:text-white transition cursor-pointer"
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
        <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Correo electrónico */}
      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1.5">Correo Electrónico</label>
        <div className="relative">
          <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="tu-correo@ejemplo.com"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Contraseña */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs font-semibold text-slate-300">Contraseña</label>
          <button
            type="button"
            onClick={() => {
              setIsForgotView(true);
              setErrorMsg(null);
              setResetSuccess(false);
            }}
            className="text-[11px] text-purple-400 hover:text-purple-300 underline font-medium cursor-pointer"
          >
            ¿Olvidaste tu contraseña?
          </button>
        </div>
        <div className="relative">
          <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type={showPassword ? 'text' : 'password'}
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Botón de Iniciar Sesión */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 rounded-xl font-bold text-sm text-white bg-purple-600 hover:bg-purple-500 disabled:opacity-50 transition-all shadow-[0_0_20px_rgba(168,85,247,0.4)] flex items-center justify-center gap-2 cursor-pointer"
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
      <div className="text-center pt-2">
        <p className="text-xs text-slate-400">
          ¿Aún no tienes cuenta?{' '}
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="text-purple-400 hover:text-purple-300 font-semibold underline cursor-pointer"
          >
            Regístrate gratis
          </button>
        </p>
      </div>
    </form>
  );
};


